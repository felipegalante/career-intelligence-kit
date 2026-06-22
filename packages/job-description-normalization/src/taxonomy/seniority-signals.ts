// Seniority signals (M9-S1, spec §15). Seniority is read from two places, not
// just a title: title patterns AND responsibility signals in the bullets. Someone
// with a "Senior" title but staff-level scope ("architected", "set engineering
// standards", "drove technical direction across teams") reads higher than the
// title alone; this module surfaces those responsibility signals so the rubric
// (M9-S5) can combine them with `inferSeniority` (title-based, in enrich/).

import type { Seniority } from "@career-intelligence/types";

/** Title → seniority, with a numeric score for combining (higher = more senior). */
export interface SeniorityTitlePattern {
  level: Seniority;
  pattern: RegExp;
  score: number;
}

// Ordered most-senior → least; the first match wins. Note the explicit grouping in
// each alternation (the spec's illustrative `\bsenior|sr\.\b` is a precedence bug —
// it anchors `\b` only to the last branch; these are written correctly).
export const SENIORITY_TITLE_PATTERNS: SeniorityTitlePattern[] = [
  { level: "exec", pattern: /\b(chief|ceo|cto|cio|vp|vice president|head of)\b/i, score: 6 },
  { level: "principal", pattern: /\bprincipal\b/i, score: 5 },
  { level: "staff", pattern: /\bstaff\b/i, score: 4.5 },
  { level: "lead", pattern: /\b(lead|tech lead|team lead)\b/i, score: 4 },
  { level: "senior", pattern: /\b(senior|sr\.?)\b/i, score: 3.5 },
  { level: "mid", pattern: /\b(software engineer|developer|engineer)\b/i, score: 2.5 },
  { level: "junior", pattern: /\b(junior|jr\.?|entry[\s-]?level|graduate|intern)\b/i, score: 1.5 },
];

/** A responsibility-based seniority signal found in bullet text. */
export interface SenioritySignalPattern {
  id: string;
  pattern: RegExp;
  /** Contribution weight toward responsibility-based seniority. */
  weight: number;
}

export const SENIORITY_SIGNAL_PATTERNS: SenioritySignalPattern[] = [
  { id: "architecture", pattern: /\b(architected|system design|systems design|architecture|technical design)\b/i, weight: 1.0 },
  { id: "ownership", pattern: /\b(owned|ownership|end[\s-]?to[\s-]?end|from zero to (?:one|production)|0 to 1)\b/i, weight: 1.0 },
  { id: "technical_direction", pattern: /\b(technical direction|engineering standards|set the bar|adrs?|rfcs?|design docs?)\b/i, weight: 1.0 },
  { id: "scale", pattern: /\b(scaled|high[\s-]?scale|millions of|distributed systems|throughput|low[\s-]?latency)\b/i, weight: 0.8 },
  { id: "mentorship", pattern: /\b(mentored|coached|mentoring|code reviews?|pairing|onboarded engineers)\b/i, weight: 0.8 },
  { id: "cross_functional", pattern: /\b(partnered with|stakeholders?|cross[\s-]?functional|worked with product|drove alignment)\b/i, weight: 0.7 },
];

/** Responsibility-based seniority signals present in `text` (deduped by id). */
export function extractSenioritySignals(text: string | null | undefined): Array<{ id: string; weight: number }> {
  if (!text) return [];
  const out: Array<{ id: string; weight: number }> = [];
  for (const sig of SENIORITY_SIGNAL_PATTERNS) {
    if (sig.pattern.test(text)) out.push({ id: sig.id, weight: sig.weight });
  }
  return out;
}
