// Matching engine (M9-S4, spec §11/§14/§25). Walks a job's requirements against a
// résumé's evidence graph and produces explainable matches:
//   - skills: exact, alias (already collapsed to `normalizedName`), or *adjacent*
//     (Kafka absent but event-driven present → partial credit), each backed by the
//     strongest, most recent evidence available;
//   - domains: exact or adjacent business-context overlap;
//   - seniority: title level combined with responsibility signals (a "Senior" who
//     architected and owned end-to-end reads higher than the title alone);
//   - gates: explicit eligibility checks (years now; others reported `unknown`
//     because they aren't determinable from résumé text — spec §16).

import {
  adjacentDomainWeight,
  adjacentSkillWeight,
  type GateId,
  type JobGate,
  type RequiredSkill,
  type RequirementImportance,
} from "@career-intelligence/job-description-normalization";

import type { ResumeEvidence } from "../evidence";
import { SENIORITY_FIT, SENIORITY_RANK } from "../weights";

export type SkillMatchType = "exact" | "adjacent" | "missing";

export interface SkillMatch {
  skillId: string;
  importance: RequirementImportance;
  matchType: SkillMatchType;
  /** Credit in [0,1]: 1 exact, adjacency weight for adjacent, 0 missing. */
  credit: number;
  /** The résumé skill that supplied adjacent credit. */
  via?: string;
  /** Strength (0–5) of the best evidence backing this match. */
  evidenceStrength: number;
  /** Recency (0–1) of that best evidence. */
  recency: number;
}

export interface DomainMatch {
  domainId: string;
  matchType: SkillMatchType;
  credit: number;
  via?: string;
}

export interface SeniorityMatch {
  candidateLevel: string | null;
  requiredLevel: string | null;
  /** Effective candidate rank after folding in responsibility signals. */
  candidateScore: number;
  /** Fit in [0,1], or null when either side is unknown. */
  fit: number | null;
  /** True when responsibility signals lifted the candidate above their title. */
  signalBoosted: boolean;
}

export type GateStatus = "pass" | "soft_fail" | "fail" | "unknown";

export interface GateMatch {
  id: GateId;
  status: GateStatus;
  reason: string;
}

export interface EvidenceMatchResult {
  skills: SkillMatch[];
  domains: DomainMatch[];
  seniority: SeniorityMatch;
  gates: GateMatch[];
  /** Domain ids present in the résumé (union of evidence). */
  resumeDomains: string[];
}

export interface MatchResumeInput {
  /** All résumé skill ids (tier1 ∪ tier2 ∪ tier3). */
  skills: string[];
  evidence: ResumeEvidence[];
  /** Highest attained candidate seniority level, or null. */
  seniorityLevel: string | null;
  totalYears: number | null;
}

export interface MatchJobInput {
  skills: RequiredSkill[];
  domains: string[];
  seniorityLevel: string | null;
  requiredYears: number | null;
  gates: JobGate[];
}

const rank = (level: string | null | undefined): number => (level ? (SENIORITY_RANK[level] ?? 0) : 0);

/** Best evidence (strength, recency) backing a given skill id in the résumé. */
function bestEvidenceFor(skillId: string, evidence: ResumeEvidence[]): { strength: number; recency: number } {
  let strength = 0;
  let recency = 0;
  for (const e of evidence) {
    if (e.skills.includes(skillId) && e.evidenceStrength >= strength) {
      strength = e.evidenceStrength;
      recency = e.recencyScore;
    }
  }
  return { strength, recency };
}

function matchOneSkill(required: RequiredSkill, resumeSkills: Set<string>, evidence: ResumeEvidence[]): SkillMatch {
  if (resumeSkills.has(required.skillId)) {
    const best = bestEvidenceFor(required.skillId, evidence);
    return {
      skillId: required.skillId,
      importance: required.importance,
      matchType: "exact",
      credit: 1,
      evidenceStrength: best.strength,
      recency: best.recency,
    };
  }
  // Adjacent: the résumé skill with the strongest relationship to the requirement.
  let bestVia: string | undefined;
  let bestWeight = 0;
  for (const rs of resumeSkills) {
    const w = adjacentSkillWeight(required.skillId, rs);
    if (w > bestWeight) {
      bestWeight = w;
      bestVia = rs;
    }
  }
  if (bestVia && bestWeight > 0) {
    const best = bestEvidenceFor(bestVia, evidence);
    return {
      skillId: required.skillId,
      importance: required.importance,
      matchType: "adjacent",
      credit: bestWeight,
      via: bestVia,
      evidenceStrength: best.strength,
      recency: best.recency,
    };
  }
  return {
    skillId: required.skillId,
    importance: required.importance,
    matchType: "missing",
    credit: 0,
    evidenceStrength: 0,
    recency: 0,
  };
}

function matchOneDomain(domainId: string, resumeDomains: Set<string>): DomainMatch {
  if (resumeDomains.has(domainId)) {
    return { domainId, matchType: "exact", credit: 1 };
  }
  let bestVia: string | undefined;
  let bestWeight = 0;
  for (const rd of resumeDomains) {
    const w = adjacentDomainWeight(domainId, rd);
    if (w > bestWeight) {
      bestWeight = w;
      bestVia = rd;
    }
  }
  if (bestVia && bestWeight > 0) {
    return { domainId, matchType: "adjacent", credit: bestWeight, via: bestVia };
  }
  return { domainId, matchType: "missing", credit: 0 };
}

// Staff-level scope signals: when ≥2 are present, lift a non-staff candidate one
// rung (captures a "Senior" title doing Staff work). Conservative — never lowers.
const STAFF_SIGNALS = ["architecture", "ownership", "technical_direction"];

function matchSeniority(resume: MatchResumeInput, job: MatchJobInput): SeniorityMatch {
  const titleRank = rank(resume.seniorityLevel);
  const sigIds = new Set(resume.evidence.flatMap((e) => e.senioritySignals));
  const staffCount = STAFF_SIGNALS.filter((s) => sigIds.has(s)).length;
  let candidateScore = titleRank;
  let signalBoosted = false;
  if (staffCount >= 2 && titleRank > 0 && titleRank < SENIORITY_RANK.staff!) {
    candidateScore = titleRank + 1;
    signalBoosted = true;
  }

  const requiredRank = rank(job.seniorityLevel);
  let fit: number | null = null;
  if (candidateScore > 0 && requiredRank > 0) {
    const d = candidateScore - requiredRank;
    fit = d >= 0 ? SENIORITY_FIT.meets : d === -1 ? SENIORITY_FIT.oneBelow : d === -2 ? SENIORITY_FIT.twoBelow : SENIORITY_FIT.farBelow;
  }

  return {
    candidateLevel: resume.seniorityLevel,
    requiredLevel: job.seniorityLevel,
    candidateScore,
    fit,
    signalBoosted,
  };
}

function matchGates(resume: MatchResumeInput, job: MatchJobInput): GateMatch[] {
  return job.gates.map((gate): GateMatch => {
    if (gate.id === "required_years") {
      const need = typeof gate.value === "number" ? gate.value : job.requiredYears;
      if (need == null || resume.totalYears == null) {
        return { id: gate.id, status: "unknown", reason: "Years of experience not determinable." };
      }
      if (resume.totalYears >= need) {
        return { id: gate.id, status: "pass", reason: `${resume.totalYears.toFixed(0)}y ≥ ${need}y required.` };
      }
      if (need - resume.totalYears <= 2) {
        return { id: gate.id, status: "soft_fail", reason: `${resume.totalYears.toFixed(0)}y vs ${need}y required (close).` };
      }
      return { id: gate.id, status: "fail", reason: `${resume.totalYears.toFixed(0)}y below ${need}y required.` };
    }
    // Location, work auth, clearance, certification, language, employment type are
    // not reliably determinable from résumé text — report honestly as unknown
    // rather than inferring (spec §16).
    return { id: gate.id, status: "unknown", reason: `${gate.label} not determinable from résumé.` };
  });
}

/** Match a résumé evidence graph against a job requirement graph. Deterministic. */
export function matchEvidence(resume: MatchResumeInput, job: MatchJobInput): EvidenceMatchResult {
  const resumeSkills = new Set(resume.skills);
  const resumeDomains = new Set(resume.evidence.flatMap((e) => e.domains));

  const skills = job.skills.map((req) => matchOneSkill(req, resumeSkills, resume.evidence));
  const domains = job.domains.map((d) => matchOneDomain(d, resumeDomains));
  const seniority = matchSeniority(resume, job);
  const gates = matchGates(resume, job);

  return { skills, domains, seniority, gates, resumeDomains: [...resumeDomains] };
}
