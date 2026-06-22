// @career-intelligence/local-engine — deterministic CareerIntelligenceProvider.

export {
  createLocalCareerIntelligenceProvider,
  LOCAL_PROVIDER_ID,
  type LocalCareerIntelligenceOptions,
} from "./provider";

export {
  buildScoreableJob,
  mapFitScore,
  mapGaps,
  mapNormalizedJobProfile,
  mapParsedResume,
  mapStrengths,
  severityToImpact,
} from "./mappers";
