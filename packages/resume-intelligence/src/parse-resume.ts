import { inferRoleFamily, inferSeniority, normalizeTitle, parseLocation } from "@career-intelligence/job-description-normalization";

import { buildEvidence, type EvidenceRoleContext, type ResumeEvidence } from "./evidence";
import { matchSkills, matchSkillNames } from "./skill-matcher";
import { LOCAL_ENGINE_VERSION } from "./version";

// In-house resume parser (M8-S2). Deterministic, heuristic, no LLM — builds a
// `CandidateProfile` from extracted resume text. Tech tiers drive the match
// score; titles, years-of-experience, and education are **display-only** (date
// and degree parsing from free text is too noisy to put in a fit number — see
// the milestone decision), but still useful on the profile page.

export interface CandidateTitles {
  /** Title of the most recent (latest-ending) position. */
  current: string | null;
  /** A headline/objective role near the top, if one is detectable. */
  target: string | null;
  /** All distinct normalized titles seen. */
  all: string[];
}

export interface RoleBucket {
  roleFamily: string | null;
  seniority: string | null;
  /** Human label, e.g. "senior · engineering". */
  label: string;
  yearsOfExperience: number;
}

export type DegreeLevel = "doctorate" | "mba" | "master" | "bachelor" | "associate" | "other";

export interface EducationEntry {
  degreeLevel: DegreeLevel;
  field?: string;
  raw: string;
}

export interface TechTiers {
  /** Highest-frequency technologies. */
  tier1: string[];
  /** Highlighted (summary/skills block or current role) but not Tier 1. */
  tier2: string[];
  /** Everything else mentioned. */
  tier3: string[];
}

export interface CandidateLocation {
  /** ISO alpha-2 country code (matches job_postings.country), or null. */
  country: string | null;
}

export interface CandidateProfile {
  titles: CandidateTitles;
  roleBuckets: RoleBucket[];
  totalYearsExperience: number | null;
  techTiers: TechTiers;
  education: EducationEntry[];
  /** Best-effort location parsed from the résumé header (display + Hot Jobs filter). */
  location: CandidateLocation;
  /**
   * Evidence graph (M9-S3): per-bullet typed evidence the rubric engine matches
   * against. Optional for backward compatibility with profiles persisted before
   * M9 — consumers should read `evidence ?? []`. `parseResume` always populates it.
   */
  evidence?: ResumeEvidence[];
  /** 0–1 — how much signal we could extract; feeds scoring confidence. */
  parseConfidence: number;
  /** Parser version (for provenance / re-parse decisions). */
  version: string;
}

const TIER1_MIN_COUNT = 3;

// ---- Sections -------------------------------------------------------------

type SectionKind = "summary" | "skills" | "experience" | "education" | "other";

const SECTION_HEADERS: Array<[SectionKind, RegExp]> = [
  ["summary", /^(professional\s+)?(summary|profile|objective|about(\s+me)?)\b/i],
  ["skills", /^(technical\s+|core\s+)?(skills|competenc(?:y|ies)|technologies|tech\s+stack)\b/i],
  [
    "experience",
    /^(work\s+|professional\s+|employment\s+)?(experience|employment|work\s+history|history)\b/i,
  ],
  ["education", /^(education|academic(\s+background)?|qualifications)\b/i],
];

function classifySectionHeader(line: string): SectionKind | null {
  const raw = line.trim().replace(/[:•\-\s]+$/, "");
  if (raw === "" || raw.length > 40 || raw.split(/\s+/).length > 4) return null;
  for (const [kind, re] of SECTION_HEADERS) {
    if (re.test(raw)) return kind;
  }
  return null;
}

interface Sections {
  /** Lines before the first recognized header (name + headline live here). */
  top: string[];
  byKind: Record<SectionKind, string[]>;
}

function splitSections(lines: string[]): Sections {
  const byKind: Record<SectionKind, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    other: [],
  };
  const top: string[] = [];
  let current: SectionKind | null = null;
  for (const line of lines) {
    const header = classifySectionHeader(line);
    if (header) {
      current = header;
      continue;
    }
    if (current === null) top.push(line);
    else byKind[current].push(line);
  }
  return { top, byKind };
}

// ---- Dates / years of experience -----------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

interface DateRange {
  start: Date;
  end: Date;
  /** True if the range ends with "Present"/"Current". */
  ongoing: boolean;
  lineIndex: number;
  /** Best-guess title for this entry (same line minus dates, else preceding line). */
  titleGuess: string | null;
}

// Matches "Jan 2020", "January 2020", "03/2019", "2018".
const TOKEN =
  "(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+)?(\\d{1,2}\\s*/\\s*)?(\\d{4})";
const PRESENT = "(present|current|now|today)";
const RANGE_RE = new RegExp(
  `${TOKEN}\\s*(?:-|–|—|to)\\s*(?:${PRESENT}|${TOKEN})`,
  "gi",
);

function toDate(month: string | undefined, slashMonth: string | undefined, year: string): Date {
  let m = 0;
  if (month) m = MONTHS[month.slice(0, 3).toLowerCase()] ?? 0;
  else if (slashMonth) m = Math.min(11, Math.max(0, Number.parseInt(slashMonth, 10) - 1));
  return new Date(Number.parseInt(year, 10), m, 1);
}

function extractDateRanges(lines: string[], now: Date): DateRange[] {
  const ranges: DateRange[] = [];
  lines.forEach((line, lineIndex) => {
    for (const m of line.matchAll(RANGE_RE)) {
      const start = toDate(m[1], m[2], m[3] as string);
      const ongoing = Boolean(m[4]);
      const end = ongoing ? now : toDate(m[5], m[6], m[7] as string);
      if (end < start) continue;
      const titleSameLine = line.replace(RANGE_RE, "").replace(/[|,–—-]+/g, " ").trim();
      const titleGuess =
        titleSameLine.length >= 3
          ? titleSameLine
          : (lineIndex > 0 ? (lines[lineIndex - 1] ?? "").trim() : "") || null;
      ranges.push({ start, end, ongoing, lineIndex, titleGuess });
    }
  });
  return ranges;
}

function yearsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/** Total tenure with overlapping ranges merged (so concurrent roles don't double-count). */
function mergedYears(ranges: DateRange[]): number {
  if (ranges.length === 0) return 0;
  const sorted = [...ranges].sort((x, y) => x.start.getTime() - y.start.getTime());
  let total = 0;
  let curStart = sorted[0]!.start;
  let curEnd = sorted[0]!.end;
  for (const r of sorted.slice(1)) {
    if (r.start <= curEnd) {
      if (r.end > curEnd) curEnd = r.end;
    } else {
      total += yearsBetween(curStart, curEnd);
      curStart = r.start;
      curEnd = r.end;
    }
  }
  total += yearsBetween(curStart, curEnd);
  return total;
}

function roundYears(y: number): number {
  return Math.round(y * 10) / 10;
}

function buildRoleBuckets(ranges: DateRange[]): RoleBucket[] {
  const buckets = new Map<string, RoleBucket>();
  for (const r of ranges) {
    if (!r.titleGuess) continue;
    const roleFamily = inferRoleFamily(r.titleGuess) ?? null;
    const seniority = inferSeniority(r.titleGuess) ?? null;
    const key = `${seniority ?? "?"}|${roleFamily ?? "?"}`;
    const years = yearsBetween(r.start, r.end);
    const existing = buckets.get(key);
    if (existing) {
      existing.yearsOfExperience = roundYears(existing.yearsOfExperience + years);
    } else {
      buckets.set(key, {
        roleFamily,
        seniority,
        label: [seniority, roleFamily].filter(Boolean).join(" · ") || "unclassified",
        yearsOfExperience: roundYears(years),
      });
    }
  }
  return [...buckets.values()].sort((a, b) => b.yearsOfExperience - a.yearsOfExperience);
}

// ---- Titles ---------------------------------------------------------------

function looksLikeRole(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 80) return false;
  return inferRoleFamily(t) !== null || inferSeniority(t) !== null;
}

function buildTitles(top: string[], ranges: DateRange[], now: Date): CandidateTitles {
  // Current = title of the latest-ending position.
  let current: string | null = null;
  if (ranges.length > 0) {
    const latest = [...ranges].sort((a, b) => b.end.getTime() - a.end.getTime())[0]!;
    if (latest.titleGuess) current = normalizeTitle(latest.titleGuess);
  }
  // Target/headline = first role-like line in the top block (under the name).
  const headline = top.map((l) => l.trim()).find((l) => looksLikeRole(l));
  const target = headline ? normalizeTitle(headline) : null;

  const all = new Set<string>();
  if (current) all.add(current);
  if (target) all.add(target);
  for (const r of ranges) if (r.titleGuess && looksLikeRole(r.titleGuess)) all.add(normalizeTitle(r.titleGuess));
  void now;
  return { current, target, all: [...all] };
}

// ---- Education ------------------------------------------------------------

const DEGREE_PATTERNS: Array<[DegreeLevel, RegExp]> = [
  ["doctorate", /\b(ph\.?\s?d|doctorate|doctoral)\b/i],
  ["mba", /\b(mba|master of business administration)\b/i],
  ["master", /\b(master(?:'s)?|m\.?\s?sc?|m\.?\s?eng|m\.?\s?a)\b/i],
  ["bachelor", /\b(bachelor(?:'s)?|b\.?\s?sc?|b\.?\s?eng|b\.?\s?a|undergraduate)\b/i],
  ["associate", /\b(associate(?:'s)?(?:\s+degree)?|a\.?\s?a|a\.?\s?s)\b/i],
];

function extractEducation(lines: string[]): EducationEntry[] {
  const out: EducationEntry[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    for (const [degreeLevel, re] of DEGREE_PATTERNS) {
      if (!re.test(line)) continue;
      const field = /\b(?:in|of)\s+([A-Z][A-Za-z&/ ]{2,40})/.exec(line)?.[1]?.trim();
      const key = `${degreeLevel}|${field?.toLowerCase() ?? ""}`;
      if (seen.has(key)) break;
      seen.add(key);
      out.push({ degreeLevel, ...(field ? { field } : {}), raw: line.trim() });
      break; // strongest degree wins for this line
    }
  }
  return out;
}

// ---- Location -------------------------------------------------------------

// Résumé contact details (incl. location) sit in the header. Scan the first few
// lines through the shared ATS location parser and take the first country it
// recognizes — produced as the same ISO alpha-2 code job_postings.country uses,
// so applicant ↔ job comparison is apples-to-apples.
function extractCountry(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    // Header contact lines are often "Location · email · phone"; split on bullet/
    // pipe separators (but not commas, which parseLocation uses for City, Country).
    for (const segment of line.split(/\s*[·•|]\s*/)) {
      const country = parseLocation(segment).country;
      if (country) return country;
    }
  }
  return null;
}

// ---- Tech tiers -----------------------------------------------------------

function buildTechTiers(fullText: string, highlightText: string, currentRoleText: string): TechTiers {
  const all = matchSkills(fullText);
  const highlighted = matchSkillNames(highlightText);
  const currentRole = matchSkillNames(currentRoleText);

  const byCount = [...all].sort((a, b) => b.count - a.count || a.firstOffset - b.firstOffset);
  const tier1 = new Set(byCount.filter((s) => s.count >= TIER1_MIN_COUNT).map((s) => s.normalizedName));

  const tier2: string[] = [];
  const tier3: string[] = [];
  for (const s of byCount) {
    if (tier1.has(s.normalizedName)) continue;
    if (highlighted.has(s.normalizedName) || currentRole.has(s.normalizedName)) {
      tier2.push(s.normalizedName);
    } else {
      tier3.push(s.normalizedName);
    }
  }
  return { tier1: [...tier1], tier2, tier3 };
}

// ---- Orchestration --------------------------------------------------------

function computeParseConfidence(input: {
  skillCount: number;
  hasDates: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
}): number {
  let c = 0.2;
  if (input.skillCount > 0) c += 0.3;
  if (input.skillCount >= 5) c += 0.1;
  if (input.hasDates) c += 0.2;
  if (input.hasExperience) c += 0.1;
  if (input.hasEducation) c += 0.1;
  return Math.min(1, Math.round(c * 100) / 100);
}

export function parseResume(text: string, opts?: { now?: Date }): CandidateProfile {
  const now = opts?.now ?? new Date();
  const lines = (text ?? "").split(/\r?\n/);
  const sections = splitSections(lines);

  const expLines =
    sections.byKind.experience.length > 0 ? sections.byKind.experience : lines;
  const ranges = extractDateRanges(expLines, now);

  // Highlight zone: top block + summary + skills section, plus the first 15 lines.
  const highlightText = [
    ...sections.top,
    ...sections.byKind.summary,
    ...sections.byKind.skills,
    ...lines.slice(0, 15),
  ].join("\n");

  // Current-role zone: lines of the latest-ending position's entry block.
  let currentRoleText = "";
  if (ranges.length > 0) {
    const latest = [...ranges].sort((a, b) => b.end.getTime() - a.end.getTime())[0]!;
    const start = latest.lineIndex;
    const nextIdx = ranges
      .map((r) => r.lineIndex)
      .filter((i) => i > start)
      .sort((a, b) => a - b)[0];
    const end = nextIdx ?? Math.min(expLines.length, start + 6);
    currentRoleText = expLines.slice(start, end).join("\n");
  }

  const techTiers = buildTechTiers(text, highlightText, currentRoleText);
  const titles = buildTitles(sections.top, ranges, now);
  const roleBuckets = buildRoleBuckets(ranges);
  const totalYears = ranges.length > 0 ? roundYears(mergedYears(ranges)) : null;
  const education = extractEducation(
    sections.byKind.education.length > 0 ? sections.byKind.education : lines,
  );

  const skillCount = techTiers.tier1.length + techTiers.tier2.length + techTiers.tier3.length;
  const parseConfidence = computeParseConfidence({
    skillCount,
    hasDates: ranges.length > 0,
    hasExperience: sections.byKind.experience.length > 0,
    hasEducation: education.length > 0,
  });

  // Evidence graph (M9-S3). Role context (title + date range) is only meaningful
  // when an experience section was recognized, where `ranges`/`expLines` align.
  const hasExpSection = sections.byKind.experience.length > 0;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const roleContexts: EvidenceRoleContext[] = hasExpSection
    ? ranges.map((r) => ({
        lineIndex: r.lineIndex,
        titleGuess: r.titleGuess ? normalizeTitle(r.titleGuess) : null,
        dateRange: { start: iso(r.start), end: r.ongoing ? null : iso(r.end) },
      }))
    : [];
  const evidence = buildEvidence({
    summaryLines: sections.byKind.summary,
    skillsLines: sections.byKind.skills,
    experienceLines: hasExpSection ? expLines : [],
    roleContexts,
    fallbackLines: lines,
    now,
  });

  return {
    titles,
    roleBuckets,
    totalYearsExperience: totalYears,
    techTiers,
    education,
    location: { country: extractCountry(lines) },
    evidence,
    parseConfidence,
    version: LOCAL_ENGINE_VERSION,
  };
}

/** Structural guard: is this a `CandidateProfile` with usable tech tiers? */
export function isCandidateProfile(value: unknown): value is CandidateProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { techTiers?: unknown };
  const t = v.techTiers as { tier1?: unknown; tier2?: unknown; tier3?: unknown } | undefined;
  return (
    !!t && Array.isArray(t.tier1) && Array.isArray(t.tier2) && Array.isArray(t.tier3)
  );
}
