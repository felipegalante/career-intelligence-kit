// Shared types for the fit-scoring boundary (M8-S1). This package owns the
// *interface* between the Job Board and any resume-fit provider — the in-house
// local provider (`@ijb/resume-intelligence`, M8-S2) and the external
// rubric-compiler (M12) both implement `FitScoringProvider`. It carries no I/O
// and no provider-specific imports, so it can never form a dependency cycle.
//
// The result shape mirrors §23.5 so the external contract slots in unchanged.
// (It was originally aligned with the retired `job_fit_scores` columns; fit is
// now computed on-read everywhere — M15.)

/** A job, reduced to the fields a provider needs to score it. */
export interface ScoreableJob {
  id: string;
  title: string;
  descriptionText?: string;
  /** Job Tier 1 — enriched `requirement_type = 'required'` skills (M5-S3). */
  requiredSkills: string[];
  /** Job Tier 2 — enriched `requirement_type = 'preferred'` skills. */
  preferredSkills: string[];
  /** Job Tier 3 — enriched `requirement_type = 'inferred'` skills. */
  inferredSkills?: string[];
  metadata?: {
    companyName?: string;
    seniority?: string;
    workArrangement?: string;
    location?: string;
  };
}

/**
 * Input to a batch score. `resumeProfile` is the provider-specific normalized
 * profile (the local provider reads its `CandidateProfile`; the rubric-compiler
 * ignores it and uses `resumeText`). Typed as an opaque record here so the
 * boundary stays provider-agnostic.
 */
export interface ScoreBatchInput {
  resumeProfileId: string;
  resumeText: string;
  resumeProfile?: Record<string, unknown>;
  jobs: ScoreableJob[];
  mode?: string;
}

/** A coarse match label derived from the overall score (M9-S5, spec §20). */
export type MatchClassification =
  | "excellent_match"
  | "strong_match"
  | "good_match"
  | "moderate_match"
  | "weak_match"
  | "poor_match";

/** One rubric dimension's contribution (M9-S5, spec §17/§18). */
export interface RubricDimensionScore {
  id: string;
  label: string;
  weight: number;
  /** 0–1 raw dimension score. */
  rawScore: number;
  /** `rawScore * weight`. */
  weightedScore: number;
}

/** The weighted-rubric breakdown behind an overall score (M9-S5). */
export interface ScoreBreakdown {
  dimensions: RubricDimensionScore[];
  /** 0–100 before any role-relevance multiplier. */
  baseScore: number;
  classification: MatchClassification;
  /** Role-relevance multiplier applied to reach the final overall score. */
  roleRelevance: number;
}

/** A surfaced strength: a requirement well-supported by résumé evidence (M9-S5). */
export interface FitStrength {
  label: string;
  /** Short evidence snippets / matched skills supporting it. */
  evidence: string[];
}

/** An eligibility-gate outcome surfaced on a fit result (M9-S5, spec §16). */
export interface FitGateResult {
  id: string;
  label: string;
  status: "pass" | "soft_fail" | "fail" | "unknown";
  reason: string;
}

/** Typed gap categories (M9-S6, spec §21). */
export type GapType =
  | "missing_mandatory_skill"
  | "weak_evidence"
  | "keyword_not_explicit"
  | "domain_gap"
  | "seniority_gap"
  | "recency_gap"
  | "context_gap"
  | "resume_positioning_gap";

export type GapSeverity = "critical" | "major" | "moderate" | "minor";

/** An explainable gap between the job and the résumé (M9-S6, spec §21). */
export interface FitGap {
  type: GapType;
  severity: GapSeverity;
  /** The requirement (skill/domain/label) the gap is about. */
  requirement: string;
  explanation: string;
  recommendation: string;
  /** Keywords to add ONLY if genuinely true — never asserted on the candidate. */
  addOnlyIfTrue: string[];
}

/** Deterministic tailoring recommendation types (M9-S6, spec §22). */
export type RecommendationType =
  | "add_keyword_if_true"
  | "strengthen_evidence"
  | "reorder_resume"
  | "rewrite_bullet"
  | "clarify_domain";

export interface FitRecommendation {
  type: RecommendationType;
  priority: "high" | "medium" | "low";
  recommendation: string;
  rationale: string;
}

/** Per-job fit result — the engine's compact output, computed on-read (M15). */
export interface JobFitResult {
  jobId: string;
  /** 0–100. */
  overallScore: number;
  /**
   * 0–100 ATS-style alignment: how explicitly the résumé names the job's required
   * skills (keyword coverage) blended with parseability. Distinct from
   * `overallScore` (match quality). Filled by the in-house rubric engine (M14-S1).
   */
  atsScore?: number;
  /** 0–1. */
  confidence: number;
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  /** Count of required skills absent from the resume — feeds `classifyHotness`. */
  missingHardGates: number;
  explanationSummary: string;
  // ---- Deterministic rubric output (M9-S5+), all optional ------------------
  // The lightweight providers may omit these; the in-house rubric engine fills
  // them in. Surfaced in the report/detail UI (computed on-read, M15).
  classification?: MatchClassification;
  breakdown?: ScoreBreakdown;
  strengths?: FitStrength[];
  gates?: FitGateResult[];
  /** A compact subset of typed gaps (M9-S6) — the full set is in the report. */
  gaps?: FitGap[];
  /** A compact subset of tailoring recommendations (M9-S6). */
  recommendations?: FitRecommendation[];
}

export interface ScoreBatchResult {
  results: JobFitResult[];
  /** Provider/engine version — part of the §23.8 cache key. */
  rubricEngineVersion: string;
  /** Provider config version (e.g. dictionary+weights hash) — part of the cache key. */
  rubricConfigVersion: string;
  /** e.g. `lightweight_local` (local) or `lightweight_score` (rubric). */
  scoringMode: string;
}

export interface GenerateReportInput {
  resumeProfileId: string;
  jobPostingId: string;
  resumeText: string;
  resumeProfile?: Record<string, unknown>;
  job: ScoreableJob;
  mode?: string;
}

export interface FitReportResult {
  available: boolean;
  summary?: string;
  sections?: Array<{ heading: string; body: string }>;
  rubricEngineVersion?: string;
  rubricConfigVersion?: string;
  scoringMode?: string;
}

export interface FitScoringHealth {
  available: boolean;
  /** Stable provider id, e.g. `local-resume-intelligence`, `rubric-compiler`, `null`. */
  provider: string;
  scoringMode: string;
  detail?: string;
}

/**
 * The cache-key identity of a provider (§23.8). Returned synchronously so the
 * worker can decide whether a job already has an up-to-date score *before*
 * calling `scoreBatch` (which, for the external provider, is an expensive
 * network call). Bumping any field invalidates cached scores.
 */
export interface FitProviderDescriptor {
  engineVersion: string;
  configVersion: string;
  scoringMode: string;
}

/**
 * The single boundary every fit provider implements. Callers MUST gate on
 * `health().available` before `scoreBatch`/`generateReport`; an unavailable
 * provider throws {@link FitScoringUnavailableError} rather than returning
 * partial data, so a disabled integration can never silently corrupt the cache.
 */
export interface FitScoringProvider {
  /** The provider's cache-key identity (§23.8); cheap + synchronous. */
  describe(): FitProviderDescriptor;
  health(): Promise<FitScoringHealth>;
  scoreBatch(input: ScoreBatchInput): Promise<ScoreBatchResult>;
  generateReport(input: GenerateReportInput): Promise<FitReportResult>;
}

export class FitScoringUnavailableError extends Error {
  readonly provider: string;
  constructor(provider: string, detail?: string) {
    super(detail ?? `Fit-scoring provider "${provider}" is unavailable`);
    this.name = "FitScoringUnavailableError";
    this.provider = provider;
  }
}
