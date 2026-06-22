// Resume evidence graph (M9-S3, spec §6.1). Each bullet/line of a résumé becomes
// a typed evidence object: where it came from, the role/date it belongs to, the
// skills + domains it mentions, the action verbs + metrics + seniority signals it
// carries, and derived evidence-strength + recency scores. The matching engine
// (M9-S4) walks these instead of treating the résumé as one bag of keywords.

import {
  extractActionVerbs,
  extractSenioritySignals,
  matchDomains,
  matchSkillIds,
} from "@career-intelligence/job-description-normalization";

import { extractMetrics, scoreEvidenceStrength } from "./score/scoreEvidence";
import { type EvidenceDateRange, scoreRecency } from "./score/scoreRecency";

export type EvidenceSource = "summary" | "skills" | "experience" | "education" | "project" | "unknown";

export interface ResumeEvidence {
  id: string;
  text: string;
  source: EvidenceSource;
  /** Best-guess role title this evidence belongs to (experience only). */
  roleTitle?: string;
  /** Datable range of the owning role (experience only). */
  dateRange?: EvidenceDateRange;
  /** Skill `normalizedName`s mentioned. */
  skills: string[];
  /** Domain ids mentioned. */
  domains: string[];
  /** Action-verb lemmas present (built, designed, scaled, …). */
  actionVerbs: string[];
  /** Metric-shaped signals ("40%", "$2M", "3x"). */
  metrics: string[];
  /** Responsibility-based seniority signal ids. */
  senioritySignals: string[];
  /** 0–5 — how strong this evidence is (spec §12). */
  evidenceStrength: number;
  /** 0–1 — how recent (spec §13). */
  recencyScore: number;
}

/** A datable role span aligned to a line index in the experience block. */
export interface EvidenceRoleContext {
  lineIndex: number;
  titleGuess: string | null;
  dateRange?: EvidenceDateRange;
}

export interface BuildEvidenceInput {
  summaryLines: string[];
  skillsLines: string[];
  /** Experience block lines (same array role date-ranges were indexed against). */
  experienceLines: string[];
  /** Date-range anchors within `experienceLines`, for role/recency attribution. */
  roleContexts: EvidenceRoleContext[];
  /** Lines to scan when no sections were recognized at all. */
  fallbackLines: string[];
  now: Date;
}

function isContentLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return false;
  return true;
}

function buildOne(
  id: string,
  rawText: string,
  source: EvidenceSource,
  now: Date,
  role?: EvidenceRoleContext,
): ResumeEvidence {
  const text = rawText.replace(/^[-•*]\s*/, "").trim();
  const skills = matchSkillIds(text);
  const domains = matchDomains(text);
  const actionVerbs = extractActionVerbs(text);
  const metrics = extractMetrics(text);
  const senioritySignals = extractSenioritySignals(text).map((s) => s.id);
  const dateRange = role?.dateRange;
  const evidence: ResumeEvidence = {
    id,
    text,
    source,
    ...(role?.titleGuess ? { roleTitle: role.titleGuess } : {}),
    ...(dateRange ? { dateRange } : {}),
    skills,
    domains,
    actionVerbs,
    metrics,
    senioritySignals,
    evidenceStrength: 0,
    recencyScore: scoreRecency(dateRange, now),
  };
  evidence.evidenceStrength = scoreEvidenceStrength(evidence);
  return evidence;
}

/** The role context covering a given experience line (nearest preceding anchor). */
function roleForLine(contexts: EvidenceRoleContext[], lineIndex: number): EvidenceRoleContext | undefined {
  let best: EvidenceRoleContext | undefined;
  for (const c of contexts) {
    if (c.lineIndex <= lineIndex && (!best || c.lineIndex > best.lineIndex)) best = c;
  }
  return best;
}

/**
 * Build the evidence graph. Deterministic: ids are positional (`ev-1`, `ev-2`, …)
 * in a fixed traversal order (summary → skills → experience → fallback).
 */
export function buildEvidence(input: BuildEvidenceInput): ResumeEvidence[] {
  const out: ResumeEvidence[] = [];
  let n = 0;
  const next = () => `ev-${++n}`;

  for (const line of input.summaryLines) {
    if (isContentLine(line)) out.push(buildOne(next(), line, "summary", input.now));
  }
  for (const line of input.skillsLines) {
    if (isContentLine(line)) out.push(buildOne(next(), line, "skills", input.now));
  }

  const hasExperience = input.experienceLines.length > 0;
  if (hasExperience) {
    input.experienceLines.forEach((line, idx) => {
      if (!isContentLine(line)) return;
      // Skip pure date-range anchor lines that carry no other signal — they're
      // captured as role context, not evidence.
      const role = roleForLine(input.roleContexts, idx);
      const ev = buildOne(next(), line, "experience", input.now, role);
      if (ev.skills.length === 0 && ev.domains.length === 0 && ev.senioritySignals.length === 0 && ev.metrics.length === 0) {
        return;
      }
      out.push(ev);
    });
  }

  // Nothing recognized → scan the whole résumé as unknown-source evidence so the
  // engine still has something to match against.
  if (out.length === 0) {
    for (const line of input.fallbackLines) {
      if (!isContentLine(line)) continue;
      const ev = buildOne(next(), line, "unknown", input.now);
      if (ev.skills.length > 0 || ev.domains.length > 0) out.push(ev);
    }
  }

  return out;
}
