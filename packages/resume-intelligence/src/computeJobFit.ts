import { classifyHotness, type Hotness, type ScoreableJob, scoreBand } from "@career-intelligence/fit-scoring";

import type { CandidateProfile } from "./parse-resume";
import { scoreJob } from "./score";

// On-read fit composition (M15). The single place that turns a resume profile +
// a scoreable job into the headline fit fields every surface shows — search
// badges, Hot Jobs, the weekly digest. Pure + deterministic: it composes
// `scoreJob` (the rubric) with `classifyHotness` / `scoreBand`, exactly as the
// old M8-S5 batch worker did before its results were materialized. Keeping it in
// one function is the "one fit number" guarantee — the API and the worker derive
// fit/hotness/band identically.

/** The active/recency signals hotness needs that aren't on the scoreable job. */
export interface JobFreshness {
  isActive: boolean;
  firstSeenAt: Date;
}

export interface ComputedJobFit {
  /** Overall fit 0–100 (the canonical fit %). */
  fitScore: number;
  /** ATS-style score 0–100, or null when the engine didn't produce one. */
  atsScore: number | null;
  /** Coarse band (excellent/strong/moderate/weak). */
  scoreBand: string;
  hotness: Hotness;
  /** 0–1 confidence (caps how hot a match can be). */
  confidence: number;
}

/**
 * Compute the headline fit for one job, on-read: score → derive required
 * coverage → classify hotness with freshness → band the score. This is the
 * single composition the API search path and the worker digest both call.
 */
export function computeJobFit(
  profile: CandidateProfile,
  job: ScoreableJob,
  freshness: JobFreshness,
  now: number = Date.now(),
): ComputedJobFit {
  const result = scoreJob(profile, job, { parseConfidence: profile.parseConfidence });
  const requiredTotal = result.matchedRequiredSkills.length + result.missingRequiredSkills.length;
  const daysSinceFirstSeen = (now - freshness.firstSeenAt.getTime()) / 86_400_000;
  const hotness = classifyHotness({
    score: result.overallScore,
    missingHardGates: result.missingHardGates,
    requiredCoverage: requiredTotal > 0 ? result.matchedRequiredSkills.length / requiredTotal : 1,
    isActive: freshness.isActive,
    daysSinceFirstSeen,
    confidence: result.confidence,
  });
  return {
    fitScore: result.overallScore,
    atsScore: result.atsScore ?? null,
    scoreBand: scoreBand(result.overallScore),
    hotness,
    confidence: result.confidence,
  };
}
