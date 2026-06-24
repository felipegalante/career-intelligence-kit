// Hot-job classification + score banding. Pure and provider-independent
// so every provider (local + rubric-compiler) and the worker share one
// definition. `classifyHotness` is an exact transcription of the spec's
// reference implementation — do not "improve" the boundaries without updating
// and the tests.

export type Hotness = "hot" | "strong" | "possible" | "low_fit" | "unknown";

export interface HotnessInput {
  /** 0–100 overall fit score. */
  score: number;
  /** Count of unmet hard-gate (required) skills. */
  missingHardGates: number;
  /**
   * 0–1 fraction of the job's required skills the candidate has. When provided,
   * it softens the hard gate: a near-complete match (≥0.8) can still reach
   * `strong`, since recruiters value candidates who hit almost every box. When
   * omitted, falls back to the legacy veto (any missing gate blocks hot/strong).
   */
  requiredCoverage?: number;
  isActive: boolean;
  daysSinceFirstSeen: number;
  /** 0–1. */
  confidence: number;
}

export function classifyHotness(input: HotnessInput): Hotness {
  if (!input.isActive) return "unknown";
  const coverage = input.requiredCoverage ?? (input.missingHardGates > 0 ? 0 : 1);
  // Full coverage + a fresh, confident, high score is the only path to "hot".
  if (coverage >= 0.999 && input.score >= 85 && input.daysSinceFirstSeen <= 14 && input.confidence >= 0.75) {
    return "hot";
  }
  // A near-complete match (≥80% of required skills) with a good overall score is
  // "strong" — a single missing requirement no longer vetoes an otherwise-great fit.
  if (coverage >= 0.8 && input.score >= 75) return "strong";
  if (input.score >= 60) return "possible";
  return "low_fit";
}

export type ScoreBand = "excellent" | "strong" | "moderate" | "weak";

/** Coarse band used for filter chips + badges; numeric cuts mirror `classifyHotness`. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 60) return "moderate";
  return "weak";
}
