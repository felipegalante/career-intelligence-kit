// Tier weights for the in-house scorer. Job tiers come from enrichment
// (required / preferred / inferred); resume tiers come from the parser. The
// match score is a weighted overlap — a required job skill the candidate leads
// with (Tier 1) contributes most; a merely-inferred job skill they barely
// mention contributes least. These constants feed the config-version hash.

export type ResumeTier = "tier1" | "tier2" | "tier3";
export type JobTier = "required" | "preferred" | "inferred";

export const RESUME_TIER_WEIGHTS: Record<ResumeTier, number> = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.4,
};

export const JOB_TIER_WEIGHTS: Record<JobTier, number> = {
  required: 1.0,
  preferred: 0.6,
  inferred: 0.3,
};

// ---- Composite rubric ----------------------------------------------
// The match is no longer pure skill overlap. A fit blends three additive
// components (skill overlap, how many *required* skills are met, and seniority
// fit) and is then scaled by a role-relevance multiplier so an off-domain resume
// (e.g. a sales CV against an engineering role) lands near zero while a missing
// skill only *lowers* — never zeroes — an otherwise-relevant candidate.
//   fit = roleRelevance × Σ(wᵢ·componentᵢ) / Σwᵢ (weights renormalize when
//                                                       a component is unknown)
// Tunable — these constants feed the config-version hash, so changing them
// transparently invalidates cached scores.
export const COMPONENT_WEIGHTS = {
  /** Weighted tier overlap of job skills with the resume. */
  skill: 0.45,
  /** Fraction of the job's required skills the candidate has. */
  required: 0.35,
  /** Candidate seniority vs the role's level (only when both are known). */
  seniority: 0.2,
};

// Seniority ladder for distance math. Higher = more senior.
export const SENIORITY_RANK: Record<string, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 5,
  principal: 6,
  exec: 7,
};

// Seniority-fit value by ladder distance (candidate − role). Meeting or exceeding
// the level is full credit; being under it costs progressively more.
export const SENIORITY_FIT = {
  meets: 1.0, // candidate ≥ role
  oneBelow: 0.6,
  twoBelow: 0.3,
  farBelow: 0.1,
  unknown: 0.7, // can't tell — neutral (this component is dropped from the avg)
};

// Cross-family work that still transfers (SWE ↔ ML). Everything not same/adjacent
// is treated as off-domain.
export const ROLE_ADJACENCY: Record<string, string[]> = {
  engineering: ["data"],
  data: ["engineering"],
};

// Role-relevance multiplier applied to the whole score.
export const ROLE_RELEVANCE = {
  same: 1.0,
  adjacent: 0.6,
  off: 0.1, // wrong domain — caps the fit near zero
  unknown: 1.0, // missing role data must not penalize (neutral)
};
