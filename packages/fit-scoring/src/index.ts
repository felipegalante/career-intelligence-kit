// @ijb/fit-scoring — the provider boundary for resume-aware fit scoring.
export type {
  ScoreableJob,
  ScoreBatchInput,
  ScoreBatchResult,
  JobFitResult,
  GenerateReportInput,
  FitReportResult,
  FitScoringHealth,
  FitProviderDescriptor,
  FitScoringProvider,
  MatchClassification,
  RubricDimensionScore,
  ScoreBreakdown,
  FitStrength,
  FitGateResult,
  GapType,
  GapSeverity,
  FitGap,
  RecommendationType,
  FitRecommendation,
} from "./types";
export { FitScoringUnavailableError } from "./types";

export type { Hotness, HotnessInput, ScoreBand } from "./hotness";
export { classifyHotness, scoreBand } from "./hotness";

export type { SelectFitScoringProviderOptions } from "./provider";
export {
  NullFitScoringProvider,
  RubricCompilerStub,
  selectFitScoringProvider,
} from "./provider";
