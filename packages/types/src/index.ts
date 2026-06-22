// @career-intelligence/types — stable, provider-neutral DTOs and public types.
// No runtime dependency on any application/product package.

export {
  ROLE_FAMILIES,
  SENIORITY_LEVELS,
  type RoleFamily,
  type Seniority,
} from "./enums";

export type {
  CareerIntelligenceError,
  CareerIntelligenceHealth,
  CareerIntelligenceMode,
  CareerIntelligenceProviderDescriptor,
  IntelligenceResultMetadata,
} from "./metadata";

export type {
  ParsedResume,
  ResumeEvidence,
  ResumeExperience,
  ResumeInput,
  ResumeSection,
  ResumeSectionName,
  ResumeSkill,
} from "./resume";

export type {
  JobDescriptionInput,
  NormalizedJobProfile,
  RequiredSkill,
  RequirementImportanceLevel,
  ResponsibilitySignal,
  RoleFamilySignal,
  SenioritySignal,
} from "./job";

export type {
  CalibrationSignal,
  FitMatchLevel,
  FitScoreResult,
  FitSignal,
  ScoreDimension,
} from "./scoring";

export type {
  CareerEvaluationInput,
  CareerEvaluationResult,
  EvaluationGap,
  EvaluationStrength,
  ResumeAtsReportResult,
  ResumeAtsReportSection,
} from "./evaluation";

export type {
  NormalizeJobDescriptionInput,
  NormalizeJobDescriptionResult,
  ParseResumeInput,
  ParseResumeResult,
  ScoreFitInput,
} from "./provider-io";
