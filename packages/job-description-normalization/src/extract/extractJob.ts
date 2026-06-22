// Job requirement graph (M9-S2, spec §6.2/§8/§9/§16). Turns a cleaned job
// description into a structured `JobProfile`: sections, per-requirement importance
// + skills + domains + seniority signals, an aggregated skill list, and explicit
// eligibility gates. Deterministic — reuses the M5 enrichers (`inferSeniority`,
// `inferRoleFamily`) and the M9-S1 taxonomy (skills, domains, seniority signals,
// requirement-phrase classification). No LLM.
//
// Compliance (spec §16): gates are derived only from explicit, job-related
// requirements (years, work authorization, clearance, certification, language,
// employment type, location). We never infer protected attributes.

import type { Seniority } from "@career-intelligence/types";

import { inferRoleFamily } from "../enrich/role-family";
import { inferSeniority } from "../enrich/seniority";
import { matchSkillIds } from "../enrich/skills";
import { matchDomains } from "../taxonomy/domains";
import {
  classifyRequirementImportance,
  type RequirementImportance,
} from "../taxonomy/requirement-phrases";
import { extractSenioritySignals } from "../taxonomy/seniority-signals";

export type JobSectionName =
  | "overview"
  | "responsibilities"
  | "requirements"
  | "preferred"
  | "compensation"
  | "location"
  | "benefits"
  | "unknown";

export interface JobSection {
  name: JobSectionName;
  heading: string;
  lines: string[];
}

export interface JobRequirement {
  id: string;
  text: string;
  importance: RequirementImportance;
  /** Skill `normalizedName`s mentioned in this requirement. */
  skills: string[];
  /** Domain ids mentioned in this requirement. */
  domains: string[];
  /** Responsibility-based seniority signal ids in this requirement. */
  senioritySignals: string[];
  sourceSection: JobSectionName;
}

/** Aggregated skill demand: one entry per skill at its strongest importance. */
export interface RequiredSkill {
  skillId: string;
  importance: RequirementImportance;
}

export type GateId =
  | "required_years"
  | "work_authorization"
  | "clearance"
  | "certification"
  | "language"
  | "employment_type"
  | "location";

export interface JobGate {
  id: GateId;
  label: string;
  /** The explicit requirement text that produced the gate. */
  text: string;
  /** Parsed value where applicable (e.g. years for `required_years`). */
  value?: string | number;
}

export interface JobProfile {
  title: string;
  seniority: Seniority | null;
  roleFamily: string | null;
  sections: JobSection[];
  requirements: JobRequirement[];
  /** Requirements classified as responsibilities (importance `responsibility`). */
  responsibilities: JobRequirement[];
  /** Aggregated skill demand across all requirements, strongest importance kept. */
  skills: RequiredSkill[];
  /** Domain ids present anywhere in the posting. */
  domains: string[];
  gates: JobGate[];
  /** Highest "N+ years" requirement found, if any. */
  requiredYears: number | null;
  parseQuality: { sectionConfidence: number };
}

export interface ExtractJobOptions {
  title?: string;
  /** Optional recruiter/company context appended for domain/skill signal. */
  contextText?: string;
}

// Section-header keywords (spec §8.2). Preferred and neutral-ish sections are
// checked before requirements so "Preferred qualifications" / "What we offer"
// aren't captured by the broad requirements keywords.
const SECTION_HEADERS: Array<[JobSectionName, RegExp]> = [
  [
    "preferred",
    /\b(preferred|nice[\s-]?to[\s-]?have|bonus(?:\s+points)?|good[\s-]?to[\s-]?have|it would be great|a plus)\b/i,
  ],
  [
    "compensation",
    /\b(compensation|salary|pay\s+range|benefits?|perks?|what we offer)\b/i,
  ],
  ["location", /\b(location|remote|work location|where you(?:'|’)?ll work)\b/i],
  [
    "responsibilities",
    /\b(responsibilities|what you(?:'|’)?ll do|what you will do|in this role|day[\s-]?to[\s-]?day|the role)\b/i,
  ],
  [
    "requirements",
    /\b(requirements?|qualifications?|what we(?:'|’)?re looking for|what you bring|you have|must[\s-]?haves?|who you are|about you|minimum)\b/i,
  ],
  ["overview", /\b(overview|about (?:the|this) role|about us|who we are)\b/i],
];

function classifyHeading(line: string): JobSectionName | null {
  const raw = line.trim();
  if (raw === "" || raw.startsWith("- ")) return null;
  const label = raw.replace(/[:•\s-]+$/, "");
  if (label.length > 60 || label.split(/\s+/).length > 7) return null;
  for (const [name, re] of SECTION_HEADERS) {
    if (re.test(label)) return name;
  }
  return null;
}

/** Split cleaned text into labelled sections (heading + its lines). */
export function splitJobSections(text: string): JobSection[] {
  const sections: JobSection[] = [];
  let current: JobSection = { name: "unknown", heading: "unknown", lines: [] };
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;
    const heading = classifyHeading(line);
    if (heading) {
      if (current.lines.length > 0) sections.push(current);
      current = { name: heading, heading: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

// A section biases its lines' importance: requirement lines default mandatory,
// preferred lines default preferred, responsibility lines default responsibility —
// unless the line's own phrasing says otherwise (the stronger of the two wins).
const IMPORTANCE_RANK: Record<RequirementImportance, number> = {
  mandatory: 5,
  strong_preferred: 4,
  preferred: 3,
  responsibility: 2,
  bonus: 1,
  inferred: 0,
};

function sectionDefaultImportance(section: JobSectionName): RequirementImportance {
  switch (section) {
    case "requirements":
      return "mandatory";
    case "preferred":
      return "preferred";
    case "responsibilities":
      return "responsibility";
    default:
      return "inferred";
  }
}

function stronger(a: RequirementImportance, b: RequirementImportance): RequirementImportance {
  return IMPORTANCE_RANK[a] >= IMPORTANCE_RANK[b] ? a : b;
}

const YEARS_RE = /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i;

function detectGate(text: string): JobGate | null {
  if (/\b(authorized to work|work authorization|visa sponsorship|sponsorship|us citizen|eligible to work)\b/i.test(text)) {
    return { id: "work_authorization", label: "Work authorization", text };
  }
  if (/\b(security clearance|ts\/sci|top secret|secret clearance|clearance required|active clearance)\b/i.test(text)) {
    return { id: "clearance", label: "Security clearance", text };
  }
  if (/\b(certified|certification|licensed|license required|cpa|pmp|aws certified|cissp)\b/i.test(text)) {
    return { id: "certification", label: "Certification / license", text };
  }
  if (/\b(fluent in|native speaker|professional proficiency|bilingual|fluency in)\b/i.test(text)) {
    return { id: "language", label: "Language requirement", text };
  }
  if (/\b(must be (?:located|based)|on[\s-]?site|onsite|in[\s-]?office|relocat(?:e|ion)|hybrid)\b/i.test(text)) {
    return { id: "location", label: "Location / on-site requirement", text };
  }
  if (/\b(full[\s-]?time|part[\s-]?time|contract(?:\s+role|\s+position)?|w2|c2c|temporary)\b/i.test(text)) {
    return { id: "employment_type", label: "Employment type", text };
  }
  return null;
}

/**
 * Build a structured `JobProfile` from cleaned job description text.
 * `text` is expected to be M5-S1 output (headings on their own line, list items
 * as `"- "` bullets), but the splitter degrades gracefully on raw prose.
 *
 * Deterministic: requirement ids are positional (`req-1`, `req-2`, …) per call,
 * so identical input always yields an identical profile.
 */
export function extractJobProfile(text: string, opts: ExtractJobOptions = {}): JobProfile {
  const title = opts.title ?? "";
  const sections = splitJobSections(text ?? "");
  let requirementCounter = 0;

  const requirements: JobRequirement[] = [];
  const skillStrongest = new Map<string, RequirementImportance>();
  const domainSet = new Set<string>();
  const gates: JobGate[] = [];
  const seenGate = new Set<GateId>();
  let requiredYears: number | null = null;

  for (const section of sections) {
    const sectionDefault = sectionDefaultImportance(section.name);
    for (const line of section.lines) {
      const skills = matchSkillIds(line);
      const domains = matchDomains(line);
      const senioritySignals = extractSenioritySignals(line).map((s) => s.id);

      // Skip lines that carry no signal at all (pure prose) unless they're an
      // explicit gate or a years requirement — keeps the graph focused on real
      // requirements while still capturing "5+ years" lines as gates.
      const gate = detectGate(line);
      const ym = line.match(YEARS_RE);
      const hasSignal =
        skills.length > 0 || domains.length > 0 || senioritySignals.length > 0 || Boolean(ym);
      if (!hasSignal && !gate) continue;

      const importance = stronger(sectionDefault, classifyRequirementImportance(line));
      const requirement: JobRequirement = {
        id: `req-${++requirementCounter}`,
        text: line.replace(/^-\s*/, ""),
        importance,
        skills,
        domains,
        senioritySignals,
        sourceSection: section.name,
      };
      requirements.push(requirement);

      for (const skillId of skills) {
        const prev = skillStrongest.get(skillId);
        skillStrongest.set(skillId, prev ? stronger(prev, importance) : importance);
      }
      for (const d of domains) domainSet.add(d);

      if (ym) {
        const yrs = Number(ym[1]);
        if (requiredYears === null || yrs > requiredYears) requiredYears = yrs;
        if (!seenGate.has("required_years")) {
          seenGate.add("required_years");
          gates.push({ id: "required_years", label: "Minimum years of experience", text: line, value: yrs });
        }
      }
      if (gate && !seenGate.has(gate.id)) {
        seenGate.add(gate.id);
        gates.push(gate);
      }
    }
  }

  // Optional context text contributes domain/skill presence only (not gates).
  if (opts.contextText) {
    for (const d of matchDomains(opts.contextText)) domainSet.add(d);
  }

  const knownSectionLines = sections
    .filter((s) => s.name === "requirements" || s.name === "responsibilities" || s.name === "preferred")
    .reduce((n, s) => n + s.lines.length, 0);
  const totalLines = sections.reduce((n, s) => n + s.lines.length, 0);
  const sectionConfidence = totalLines === 0 ? 0.3 : Math.max(0.4, Math.min(0.95, knownSectionLines / totalLines + 0.4));

  return {
    title,
    seniority: inferSeniority(title, text),
    roleFamily: inferRoleFamily(title) ?? null,
    sections,
    requirements,
    responsibilities: requirements.filter((r) => r.importance === "responsibility"),
    skills: [...skillStrongest.entries()].map(([skillId, importance]) => ({ skillId, importance })),
    domains: [...domainSet],
    gates,
    requiredYears,
    parseQuality: { sectionConfidence: Math.round(sectionConfidence * 100) / 100 },
  };
}
