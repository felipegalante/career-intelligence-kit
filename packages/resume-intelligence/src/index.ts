// @career-intelligence/resume-intelligence — in-house, deterministic resume parsing
// + fit scoring. Implements the `@career-intelligence/fit-scoring` provider boundary;
// the permanent deterministic fallback when the external Rubric Compiler is unavailable.
export type {
  CandidateProfile,
  CandidateTitles,
  RoleBucket,
  TechTiers,
  EducationEntry,
  DegreeLevel,
} from "./parse-resume";
export { parseResume, isCandidateProfile } from "./parse-resume";

// Evidence graph (M9-S3).
export {
  buildEvidence,
  type ResumeEvidence,
  type EvidenceSource,
  type EvidenceRoleContext,
  type BuildEvidenceInput,
} from "./evidence";
export { scoreEvidenceStrength, extractMetrics } from "./score/scoreEvidence";
export { scoreRecency, type EvidenceDateRange } from "./score/scoreRecency";

// Gap analysis + tailoring recommendations (M9-S6).
export { buildGapAnalysis, type GapAnalysisInput } from "./report/buildGapAnalysis";
export { buildTailoringHints } from "./report/buildTailoringHints";

// Matching engine (M9-S4).
export {
  matchEvidence,
  type EvidenceMatchResult,
  type MatchResumeInput,
  type MatchJobInput,
  type SkillMatch as RubricSkillMatch,
  type SkillMatchType,
  type DomainMatch,
  type SeniorityMatch,
  type GateMatch,
  type GateStatus,
} from "./match/matchEvidence";

export { matchSkills, matchSkillNames, type SkillMatch } from "./skill-matcher";

export { scoreJob, analyzeJob, type ScoreJobOptions, type JobAnalysis } from "./score";

// On-read fit composition (M15) — score + hotness + band in one pure call.
export {
  computeJobFit,
  type ComputedJobFit,
  type JobFreshness,
} from "./computeJobFit";

// Job Match Report builder (M14-S2).
export {
  buildJobMatchReport,
  type BuildJobMatchReportInput,
  type ReportJobContextInput,
} from "./report/buildJobMatchReport";
export {
  scoreRubric,
  scoreConfidence,
  classifyScore,
  DEFAULT_SOFTWARE_ENGINEERING_RUBRIC,
  type ScoreRubricInput,
} from "./score/scoreRubric";
export {
  RESUME_TIER_WEIGHTS,
  JOB_TIER_WEIGHTS,
  type ResumeTier,
  type JobTier,
} from "./weights";

export {
  LOCAL_ENGINE_VERSION,
  LOCAL_CONFIG_VERSION,
  LOCAL_SCORING_MODE,
} from "./version";

export { LocalResumeIntelligenceProvider, LOCAL_PROVIDER_ID } from "./provider";
