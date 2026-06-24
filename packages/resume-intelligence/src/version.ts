import { SKILL_DICTIONARY, SKILL_META } from "@career-intelligence/job-description-normalization";

import { DEFAULT_SOFTWARE_ENGINEERING_RUBRIC } from "./score/scoreRubric";
import {
  COMPONENT_WEIGHTS,
  JOB_TIER_WEIGHTS,
  RESUME_TIER_WEIGHTS,
  ROLE_ADJACENCY,
  ROLE_RELEVANCE,
  SENIORITY_FIT,
  SENIORITY_RANK,
} from "./weights";

// Versioning for the scoring cache. The cache key includes
// `rubric_engine_version`, `rubric_config_version`, and `scoring_mode`; bumping
// any of them invalidates cached scores. The local engine derives its config
// version from the inputs that actually change a score — the skill dictionary
// and the tier weights — so a curated dictionary expansion or a weight tweak
// transparently forces a recompute.

// Bumped to 0.4.0 for the canonical 6-dimension Job Match rubric: the
// rubric now aggregates the evidence signals into the six report dimensions
// (technical stack, seniority & scope, architecture, stakeholder fit, business
// orientation, communication & multiplier) and adds an ATS-style score. The bump
// invalidates cached scores so every job re-scores under the new model.
export const LOCAL_ENGINE_VERSION = "local-ri@0.4.0";
export const LOCAL_SCORING_MODE = "lightweight_local";

// Small, stable, dependency-free hash (djb2 → base36). Deterministic across
// processes; we don't need cryptographic strength, just change-detection.
function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export const LOCAL_CONFIG_VERSION = `cfg-${stableHash(
  JSON.stringify({
    skills: SKILL_DICTIONARY.map((s) => s.normalizedName).sort(),
    // the structured taxonomy (adjacency) and the rubric dimension weights now
    // affect every score, so they belong in the config-version hash too.
    skillMeta: Object.keys(SKILL_META).sort(),
    rubric: DEFAULT_SOFTWARE_ENGINEERING_RUBRIC.map((d) => [d.id, d.weight]),
    jobWeights: JOB_TIER_WEIGHTS,
    resumeWeights: RESUME_TIER_WEIGHTS,
    componentWeights: COMPONENT_WEIGHTS,
    seniorityRank: SENIORITY_RANK,
    seniorityFit: SENIORITY_FIT,
    roleAdjacency: ROLE_ADJACENCY,
    roleRelevance: ROLE_RELEVANCE,
  }),
)}`;
