// Structured skill metadata. The flat `SKILL_DICTIONARY`
// stays the source of truth for *which* skills exist and how their aliases match;
// this module layers the deterministic-rubric metadata on top — category, the
// work contexts a skill implies, and adjacency edges for partial credit — keyed
// by `normalizedName`. Keeping it separate keeps the dictionary's normalized-name
// set (and the fit-cache config hash) stable.
// Focused software-engineering seed: the most common skills carry full metadata;
// the long tail resolves to `undefined` and simply gets exact-match-only credit.

import {
  SKILL_DICTIONARY,
  type RelatedSkill,
  type SkillCategory,
  type SkillEntry,
} from "../enrich/skills-dictionary";

export interface SkillMeta {
  category: SkillCategory;
  contexts: string[];
  related: RelatedSkill[];
  evidenceBoosts?: string[];
}

// Adjacency is authored one-directional but read symmetrically (see
// `adjacentSkillWeight`), so we only list each edge once on the more "specific"
// side. Weights follow the spec's relationship ladder:
//   same_ecosystem ~0.85 · commonly_used_with ~0.7 · adjacent ~0.6 · weaker_transfer ~0.4
const r = (skillId: string, relationship: RelatedSkill["relationship"], weight: number): RelatedSkill => ({
  skillId,
  relationship,
  weight,
});

export const SKILL_META: Record<string, SkillMeta> = {
  // ---- Languages ----
  javascript: {
    category: "language",
    contexts: ["frontend", "backend", "web_platforms"],
    related: [r("typescript", "same_ecosystem", 0.9), r("nodejs", "commonly_used_with", 0.7)],
  },
  typescript: {
    category: "language",
    contexts: ["frontend", "backend", "web_platforms", "apis"],
    related: [r("javascript", "same_ecosystem", 0.9), r("nodejs", "commonly_used_with", 0.8)],
  },
  python: {
    category: "language",
    contexts: ["backend", "data", "ml", "apis", "automation"],
    related: [r("django", "same_ecosystem", 0.8), r("fastapi", "same_ecosystem", 0.8), r("pandas", "commonly_used_with", 0.6)],
  },
  go: {
    category: "language",
    contexts: ["backend", "apis", "distributed_systems", "infrastructure"],
    related: [r("kubernetes", "commonly_used_with", 0.5), r("grpc", "commonly_used_with", 0.6)],
  },
  rust: {
    category: "language",
    contexts: ["backend", "systems", "distributed_systems"],
    related: [r("go", "adjacent", 0.5), r("cpp", "adjacent", 0.5)],
  },
  java: {
    category: "language",
    contexts: ["backend", "apis", "distributed_systems", "enterprise"],
    related: [r("spring", "same_ecosystem", 0.85), r("kotlin", "same_ecosystem", 0.7)],
  },
  kotlin: {
    category: "language",
    contexts: ["backend", "mobile", "apis"],
    related: [r("java", "same_ecosystem", 0.8), r("spring", "commonly_used_with", 0.6)],
  },
  ruby: {
    category: "language",
    contexts: ["backend", "web_platforms", "apis"],
    related: [r("rails", "same_ecosystem", 0.9)],
  },
  csharp: {
    category: "language",
    contexts: ["backend", "apis", "enterprise"],
    related: [r("aspnet", "same_ecosystem", 0.85)],
  },
  php: {
    category: "language",
    contexts: ["backend", "web_platforms"],
    related: [r("laravel", "same_ecosystem", 0.85)],
  },

  // ---- Frontend ----
  react: {
    category: "frontend",
    contexts: ["frontend", "web_platforms"],
    related: [r("nextjs", "same_ecosystem", 0.85), r("react-native", "same_ecosystem", 0.7), r("redux", "commonly_used_with", 0.6), r("typescript", "commonly_used_with", 0.6)],
    evidenceBoosts: ["built", "shipped", "designed"],
  },
  vue: {
    category: "frontend",
    contexts: ["frontend", "web_platforms"],
    related: [r("nuxt", "same_ecosystem", 0.85), r("react", "adjacent", 0.6)],
  },
  angular: {
    category: "frontend",
    contexts: ["frontend", "web_platforms"],
    related: [r("typescript", "commonly_used_with", 0.7), r("react", "adjacent", 0.55)],
  },
  nextjs: {
    category: "framework",
    contexts: ["frontend", "web_platforms", "ssr"],
    related: [r("react", "same_ecosystem", 0.85), r("vercel", "commonly_used_with", 0.5)],
  },
  "react-native": {
    category: "mobile",
    contexts: ["mobile", "frontend"],
    related: [r("react", "same_ecosystem", 0.7), r("flutter", "adjacent", 0.5)],
  },

  // ---- Backend runtimes / frameworks ----
  nodejs: {
    category: "runtime",
    contexts: ["backend", "apis", "web_platforms", "distributed_systems"],
    related: [r("typescript", "commonly_used_with", 0.8), r("nestjs", "same_ecosystem", 0.85), r("express", "same_ecosystem", 0.8), r("rest", "adjacent", 0.6)],
    evidenceBoosts: ["built", "designed", "architected", "owned", "scaled"],
  },
  express: {
    category: "framework",
    contexts: ["backend", "apis"],
    related: [r("nodejs", "same_ecosystem", 0.85), r("rest", "commonly_used_with", 0.7)],
  },
  nestjs: {
    category: "framework",
    contexts: ["backend", "apis"],
    related: [r("nodejs", "same_ecosystem", 0.85), r("typescript", "commonly_used_with", 0.8)],
  },
  django: {
    category: "framework",
    contexts: ["backend", "apis", "web_platforms"],
    related: [r("python", "same_ecosystem", 0.8), r("postgresql", "commonly_used_with", 0.5), r("fastapi", "adjacent", 0.6)],
  },
  fastapi: {
    category: "framework",
    contexts: ["backend", "apis"],
    related: [r("python", "same_ecosystem", 0.8), r("rest", "commonly_used_with", 0.6)],
  },
  rails: {
    category: "framework",
    contexts: ["backend", "web_platforms", "apis", "monoliths"],
    related: [r("ruby", "same_ecosystem", 0.9), r("postgresql", "commonly_used_with", 0.6)],
  },
  spring: {
    category: "framework",
    contexts: ["backend", "apis", "enterprise", "distributed_systems"],
    related: [r("java", "same_ecosystem", 0.85), r("kotlin", "commonly_used_with", 0.6)],
  },
  graphql: {
    category: "api",
    contexts: ["apis", "backend", "frontend"],
    related: [r("rest", "adjacent", 0.6)],
  },
  grpc: {
    category: "api",
    contexts: ["apis", "backend", "distributed_systems"],
    related: [r("rest", "adjacent", 0.55), r("microservices", "commonly_used_with", 0.6)],
  },
  rest: {
    category: "api",
    contexts: ["apis", "backend"],
    related: [r("graphql", "adjacent", 0.6)],
  },

  // ---- Data stores ----
  postgresql: {
    category: "database",
    contexts: ["backend", "data", "persistence"],
    related: [r("mysql", "adjacent", 0.7), r("sql", "same_ecosystem", 0.8), r("pgvector", "same_ecosystem", 0.6)],
    evidenceBoosts: ["migrated", "designed", "scaled", "architected"],
  },
  mysql: {
    category: "database",
    contexts: ["backend", "data", "persistence"],
    related: [r("postgresql", "adjacent", 0.7), r("sql", "same_ecosystem", 0.8)],
  },
  mongodb: {
    category: "database",
    contexts: ["backend", "data", "persistence"],
    related: [r("postgresql", "weaker_transfer", 0.4), r("dynamodb", "adjacent", 0.6)],
  },
  redis: {
    category: "database",
    contexts: ["backend", "caching", "distributed_systems"],
    related: [r("memcached", "adjacent", 0.7)],
  },
  elasticsearch: {
    category: "database",
    contexts: ["search_relevance", "data", "observability"],
    related: [],
  },
  sql: {
    category: "language",
    contexts: ["data", "backend", "analytics"],
    related: [r("postgresql", "commonly_used_with", 0.7), r("mysql", "commonly_used_with", 0.7)],
  },

  // ---- Messaging / streaming ----
  kafka: {
    category: "messaging",
    contexts: ["distributed_systems", "event_driven", "data", "async_orchestration"],
    related: [r("event-driven", "adjacent", 0.7), r("rabbitmq", "adjacent", 0.6), r("kinesis", "adjacent", 0.6), r("pulsar", "adjacent", 0.6)],
  },
  rabbitmq: {
    category: "messaging",
    contexts: ["distributed_systems", "event_driven", "async_orchestration"],
    related: [r("kafka", "adjacent", 0.6), r("event-driven", "adjacent", 0.6)],
  },

  // ---- Cloud / infra / devops ----
  aws: {
    category: "cloud",
    contexts: ["cloud", "infrastructure", "distributed_systems"],
    related: [r("gcp", "adjacent", 0.6), r("azure", "adjacent", 0.6), r("lambda", "same_ecosystem", 0.6), r("ec2", "same_ecosystem", 0.6)],
  },
  gcp: {
    category: "cloud",
    contexts: ["cloud", "infrastructure"],
    related: [r("aws", "adjacent", 0.6), r("gke", "same_ecosystem", 0.6)],
  },
  azure: {
    category: "cloud",
    contexts: ["cloud", "infrastructure", "enterprise"],
    related: [r("aws", "adjacent", 0.6)],
  },
  docker: {
    category: "devops",
    contexts: ["infrastructure", "ci_cd", "distributed_systems"],
    related: [r("kubernetes", "commonly_used_with", 0.75)],
  },
  kubernetes: {
    category: "devops",
    contexts: ["infrastructure", "distributed_systems", "scalability"],
    related: [r("docker", "commonly_used_with", 0.75), r("helm", "same_ecosystem", 0.6), r("terraform", "commonly_used_with", 0.5)],
    evidenceBoosts: ["scaled", "migrated", "architected", "owned"],
  },
  terraform: {
    category: "devops",
    contexts: ["infrastructure", "iac"],
    related: [r("pulumi", "adjacent", 0.6), r("cloudformation", "adjacent", 0.6), r("aws", "commonly_used_with", 0.5)],
  },
  cicd: {
    category: "devops",
    contexts: ["ci_cd", "infrastructure", "automation"],
    related: [r("github-actions", "same_ecosystem", 0.6), r("jenkins", "same_ecosystem", 0.6)],
  },

  // ---- Data / ML / AI ----
  "machine-learning": {
    category: "ml",
    contexts: ["ml", "data"],
    related: [r("python", "commonly_used_with", 0.6), r("pytorch", "same_ecosystem", 0.7), r("tensorflow", "same_ecosystem", 0.7), r("deep-learning", "adjacent", 0.7)],
  },
  llm: {
    category: "ml",
    contexts: ["ml", "ai_product"],
    related: [r("rag", "commonly_used_with", 0.7), r("langchain", "commonly_used_with", 0.6), r("openai", "commonly_used_with", 0.6), r("machine-learning", "adjacent", 0.6)],
  },
  ai: {
    category: "ml",
    contexts: ["ml", "ai_product"],
    related: [r("machine-learning", "adjacent", 0.7), r("llm", "adjacent", 0.6)],
  },
  spark: {
    category: "data",
    contexts: ["data", "distributed_systems", "analytics"],
    related: [r("hadoop", "adjacent", 0.6), r("databricks", "commonly_used_with", 0.6)],
  },
  airflow: {
    category: "data",
    contexts: ["data", "async_orchestration", "etl"],
    related: [r("etl", "commonly_used_with", 0.7), r("dbt", "commonly_used_with", 0.5)],
  },

  // ---- Security / auth ----
  oauth: {
    category: "security",
    contexts: ["authorization", "authentication", "security", "apis"],
    related: [r("oidc", "same_ecosystem", 0.8), r("jwt", "commonly_used_with", 0.7)],
  },
  oidc: {
    category: "security",
    contexts: ["authentication", "security"],
    related: [r("oauth", "same_ecosystem", 0.8), r("saml", "adjacent", 0.6)],
  },
  jwt: {
    category: "security",
    contexts: ["authentication", "authorization", "apis"],
    related: [r("oauth", "commonly_used_with", 0.7)],
  },

  // ---- Architecture ----
  microservices: {
    category: "architecture",
    contexts: ["distributed_systems", "service_boundaries", "scalability"],
    related: [r("event-driven", "adjacent", 0.6), r("kubernetes", "commonly_used_with", 0.5), r("grpc", "commonly_used_with", 0.5)],
    evidenceBoosts: ["designed", "architected", "owned", "scaled"],
  },
  "event-driven": {
    category: "architecture",
    contexts: ["distributed_systems", "event_driven", "async_orchestration"],
    related: [r("kafka", "commonly_used_with", 0.7), r("microservices", "adjacent", 0.6)],
  },
  "distributed-systems": {
    category: "architecture",
    contexts: ["distributed_systems", "scalability", "system_design"],
    related: [r("microservices", "adjacent", 0.6), r("kafka", "commonly_used_with", 0.5), r("kubernetes", "commonly_used_with", 0.5)],
    evidenceBoosts: ["architected", "designed", "scaled"],
  },
};

/** Structured metadata for a skill, or `undefined` if it's a long-tail entry. */
export function skillMeta(normalizedName: string): SkillMeta | undefined {
  return SKILL_META[normalizedName];
}

/**
 * Adjacent-skill transfer weight in [0,1] between two skills, read symmetrically
 * over the authored (one-directional) edges. Identical skills return 1; an
 * unrelated pair returns 0. Used for the rubric's adjacent-skill partial credit.
 */
export function adjacentSkillWeight(fromId: string, toId: string): number {
  if (fromId === toId) return 1;
  let best = 0;
  for (const [a, b] of [
    [fromId, toId],
    [toId, fromId],
  ] as const) {
    const meta = SKILL_META[a];
    if (!meta) continue;
    for (const edge of meta.related) {
      if (edge.skillId === b && edge.weight > best) best = edge.weight;
    }
  }
  return best;
}

/**
 * Confidence that a matched alias is a real skill mention, not prose noise
 * . Short/ambiguous aliases ("Go", "R", "AI") are riskier than
 * long distinctive ones ("PostgreSQL", "Kubernetes").
 */
export function aliasConfidence(alias: string): number {
  const a = alias.trim();
  if (a.length <= 1) return 0.3;
  if (a.length === 2 && a.toUpperCase() === a) return 0.55;
  if (a.length === 2) return 0.45;
  if (a.length <= 4) return 0.75;
  return 0.95;
}

/** The dictionary entry merged with its structured metadata (if any). */
export function enrichedSkill(normalizedName: string): SkillEntry | undefined {
  const entry = SKILL_DICTIONARY.find((e) => e.normalizedName === normalizedName);
  if (!entry) return undefined;
  const meta = SKILL_META[normalizedName];
  return meta ? { ...entry, ...meta } : entry;
}
