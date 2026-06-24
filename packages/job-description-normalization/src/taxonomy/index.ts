// Structured taxonomy — the deterministic-rubric metadata layered over
// the flat skill dictionary: skill adjacency, business domains, action verbs,
// seniority signals, and requirement-phrase classification.

export {
  SKILL_META,
  type SkillMeta,
  skillMeta,
  adjacentSkillWeight,
  aliasConfidence,
  enrichedSkill,
} from "./skill-graph";

export {
  DOMAINS,
  type DomainDefinition,
  type RelatedDomain,
  domainById,
  matchDomains,
  adjacentDomainWeight,
} from "./domains";

export { ACTION_VERB_BOOST, extractActionVerbs, actionVerbBoost } from "./action-verbs";

export {
  SENIORITY_TITLE_PATTERNS,
  SENIORITY_SIGNAL_PATTERNS,
  type SeniorityTitlePattern,
  type SenioritySignalPattern,
  extractSenioritySignals,
} from "./seniority-signals";

export {
  type RequirementImportance,
  classifyRequirementImportance,
  requirementImportanceWeight,
} from "./requirement-phrases";
