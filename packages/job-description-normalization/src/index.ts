// @career-intelligence/job-description-normalization — deterministic JD-to-score-
// profile normalization extracted from Intelligent Job Board's `@ijb/job-normalization`.
//
// This package owns ONLY the job-description/scoring-oriented pieces: title/seniority/
// role-family inference, skill extraction + dictionary, the requirement graph
// (`extractJobProfile`), the scoring taxonomy, and location parsing used for scoring
// eligibility. ATS/source/canonical-job normalization (html, hashing, salary, posting
// quality/freshness, employment type, work arrangement) is intentionally NOT here — it
// belongs to the private `job-platform` service.

export { normalizeTitle } from "./enrich/title";
export { inferSeniority, normalizeSeniority } from "./enrich/seniority";
export { inferRoleFamily } from "./enrich/role-family";
export {
  extractSkills,
  matchSkillIds,
  type ExtractedSkill,
  type RequirementType,
} from "./enrich/skills";

// Job requirement graph (M9-S2): turns a cleaned JD into a structured JobProfile.
export {
  extractJobProfile,
  splitJobSections,
  type JobProfile,
  type JobSection,
  type JobSectionName,
  type JobRequirement,
  type RequiredSkill,
  type JobGate,
  type GateId,
  type ExtractJobOptions,
} from "./extract/extractJob";
export {
  SKILL_DICTIONARY,
  type SkillEntry,
  type SkillCategory,
  type SkillRelationship,
  type RelatedSkill,
} from "./enrich/skills-dictionary";

// Structured taxonomy (M9-S1): skill adjacency, domains, action verbs, seniority
// signals, requirement-phrase classification.
export {
  SKILL_META,
  type SkillMeta,
  skillMeta,
  adjacentSkillWeight,
  aliasConfidence,
  enrichedSkill,
  DOMAINS,
  type DomainDefinition,
  type RelatedDomain,
  domainById,
  matchDomains,
  adjacentDomainWeight,
  ACTION_VERB_BOOST,
  extractActionVerbs,
  actionVerbBoost,
  SENIORITY_TITLE_PATTERNS,
  SENIORITY_SIGNAL_PATTERNS,
  type SeniorityTitlePattern,
  type SenioritySignalPattern,
  extractSenioritySignals,
  type RequirementImportance,
  classifyRequirementImportance,
  requirementImportanceWeight,
} from "./taxonomy";

// Location parsing — included because it is used for scoring eligibility (resume
// intelligence imports `parseLocation`). General canonical location normalization for
// the catalog remains a job-platform concern.
export { COUNTRIES, parseLocation, type ParsedLocation } from "./enrich/location";
