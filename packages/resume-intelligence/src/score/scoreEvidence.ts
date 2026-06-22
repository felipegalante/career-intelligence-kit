// Evidence-strength scoring (M9-S3, spec §12). A skill named in a skills list is
// weak evidence; the same skill tied to an experience bullet with an action verb,
// a metric, and business context is strong. The score (0–5) lets the matching
// engine (M9-S4) and rubric (M9-S5) prefer real, owned work over keyword stuffing.

import { ACTION_VERB_BOOST } from "@career-intelligence/job-description-normalization";

import type { EvidenceSource, ResumeEvidence } from "../evidence";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const SOURCE_BASE: Record<EvidenceSource, number> = {
  skills: 1.0,
  summary: 1.5,
  experience: 2.5,
  project: 2.0,
  education: 0.8,
  unknown: 1.0,
};

/** Metric-shaped signals in a bullet ("40%", "$2M", "3x", "500k users"). */
export function extractMetrics(text: string): string[] {
  const out: string[] = [];
  const re =
    /(\$\s?\d[\d,.]*\s?[kmb]?\b|\b\d[\d,.]*\s?%|\b\d+(?:\.\d+)?\s?x\b|\b\d[\d,.]*\s?(?:k|m|bn|million|billion)\b(?:\s+(?:users|customers|requests|records|rows|transactions))?)/gi;
  for (const m of text.matchAll(re)) out.push(m[0].trim());
  return out;
}

/**
 * Evidence strength in [0,5]: base by source section, plus boosts for strong
 * action verbs, measurable outcomes, business-domain context, and seniority
 * signals (spec §12).
 */
export function scoreEvidenceStrength(
  evidence: Pick<
    ResumeEvidence,
    "source" | "actionVerbs" | "metrics" | "domains" | "senioritySignals"
  >,
): number {
  let score = SOURCE_BASE[evidence.source] ?? 1.0;
  for (const verb of evidence.actionVerbs) score += (ACTION_VERB_BOOST[verb] ?? 0) * 0.8;
  if (evidence.metrics.length > 0) score += 0.8;
  if (evidence.domains.length > 0) score += 0.5;
  if (evidence.senioritySignals.length > 0) score += 0.6;
  return Math.round(clamp(score, 0, 5) * 100) / 100;
}
