// Business/product domain taxonomy (M9-S1, spec §14). Domains let the rubric give
// deterministic credit for *context* fit, not just hard skills: a job in
// "billing & payments" should reward a resume that mentions Stripe, subscriptions,
// and entitlements even if it never says "billing platform". Aliases are matched
// as whole tokens (same discipline as the skill dictionary); `related` edges carry
// adjacency weight for partial credit.
//
// Focused software-engineering seed — expandable later.

/** An adjacency edge between two domains, by `id`. */
export interface RelatedDomain {
  domainId: string;
  /** Transfer weight in (0,1]. */
  weight: number;
}

export interface DomainDefinition {
  id: string;
  label: string;
  /** Whole-token aliases matched against text. */
  aliases: string[];
  related: RelatedDomain[];
}

export const DOMAINS: DomainDefinition[] = [
  {
    id: "billing_payments",
    label: "Billing & Payments",
    aliases: [
      "billing",
      "payments",
      "payment workflows",
      "subscriptions",
      "subscription tiers",
      "subscription lifecycle",
      "invoicing",
      "monetization",
      "stripe",
      "chargebee",
      "entitlements",
      "membership lifecycle",
    ],
    related: [
      { domainId: "growth_onboarding", weight: 0.5 },
      { domainId: "compliance", weight: 0.6 },
      { domainId: "b2b_saas", weight: 0.7 },
    ],
  },
  {
    id: "identity_security",
    label: "Identity & Security",
    aliases: [
      "identity",
      "authentication",
      "authorization",
      "rbac",
      "role based access control",
      "roles and permissions",
      "access control",
      "iam",
      "secure admin workflows",
      "trusted devices",
      "sso",
      "single sign-on",
    ],
    related: [
      { domainId: "compliance", weight: 0.7 },
      { domainId: "platform_engineering", weight: 0.5 },
    ],
  },
  {
    id: "platform_engineering",
    label: "Platform & Infrastructure",
    aliases: [
      "platform engineering",
      "internal platform",
      "developer platform",
      "infrastructure",
      "service mesh",
      "internal tooling",
      "ci/cd platform",
      "developer experience",
    ],
    related: [
      { domainId: "observability", weight: 0.6 },
      { domainId: "data_platform", weight: 0.5 },
    ],
  },
  {
    id: "data_platform",
    label: "Data Platform & Analytics",
    aliases: [
      "data platform",
      "data pipeline",
      "data pipelines",
      "data warehouse",
      "analytics",
      "etl",
      "elt",
      "data lake",
      "data engineering",
      "reporting",
    ],
    related: [
      { domainId: "platform_engineering", weight: 0.5 },
      { domainId: "ml_ai_product", weight: 0.6 },
    ],
  },
  {
    id: "ml_ai_product",
    label: "ML / AI Product",
    aliases: [
      "machine learning",
      "ml platform",
      "ai product",
      "recommendations",
      "personalization",
      "ranking",
      "llm",
      "generative ai",
      "model serving",
    ],
    related: [
      { domainId: "data_platform", weight: 0.6 },
      { domainId: "search_relevance", weight: 0.5 },
    ],
  },
  {
    id: "search_relevance",
    label: "Search & Relevance",
    aliases: ["search", "relevance", "ranking", "indexing", "full-text search", "elasticsearch", "opensearch"],
    related: [
      { domainId: "ml_ai_product", weight: 0.5 },
      { domainId: "data_platform", weight: 0.4 },
    ],
  },
  {
    id: "observability",
    label: "Observability & Reliability",
    aliases: [
      "observability",
      "monitoring",
      "alerting",
      "on-call",
      "incident response",
      "reliability",
      "sre",
      "telemetry",
      "tracing",
    ],
    related: [
      { domainId: "platform_engineering", weight: 0.6 },
    ],
  },
  {
    id: "growth_onboarding",
    label: "Growth & Onboarding",
    aliases: [
      "growth",
      "onboarding",
      "activation",
      "experimentation",
      "a/b testing",
      "funnel",
      "conversion",
      "user acquisition",
    ],
    related: [
      { domainId: "billing_payments", weight: 0.5 },
      { domainId: "b2b_saas", weight: 0.5 },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Trust",
    aliases: [
      "compliance",
      "kyc",
      "kyb",
      "aml",
      "audit",
      "soc 2",
      "soc2",
      "gdpr",
      "hipaa",
      "pci",
      "data privacy",
      "governance",
    ],
    related: [
      { domainId: "identity_security", weight: 0.7 },
      { domainId: "billing_payments", weight: 0.5 },
    ],
  },
  {
    id: "b2b_saas",
    label: "B2B SaaS",
    aliases: [
      "b2b",
      "saas",
      "multi-tenant",
      "multitenant",
      "enterprise software",
      "admin workflows",
      "operator workflows",
      "revenue operations",
    ],
    related: [
      { domainId: "billing_payments", weight: 0.7 },
      { domainId: "identity_security", weight: 0.4 },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce & Marketplace",
    aliases: [
      "ecommerce",
      "e-commerce",
      "marketplace",
      "checkout",
      "cart",
      "catalog",
      "fulfillment",
      "inventory",
      "orders",
    ],
    related: [
      { domainId: "billing_payments", weight: 0.6 },
      { domainId: "search_relevance", weight: 0.4 },
    ],
  },
  {
    id: "fintech",
    label: "Fintech",
    aliases: ["fintech", "banking", "lending", "payments infrastructure", "ledger", "trading", "financial services"],
    related: [
      { domainId: "billing_payments", weight: 0.6 },
      { domainId: "compliance", weight: 0.7 },
    ],
  },
];

const DOMAIN_BY_ID = new Map(DOMAINS.map((d) => [d.id, d]));

export function domainById(id: string): DomainDefinition | undefined {
  return DOMAIN_BY_ID.get(id);
}

// One combined, token-boundary, global regex per domain (all aliases alternated).
// Boundaries are alphanumeric-only so "a/b testing" / "soc 2" match and embedded
// matches don't fire. Built once at module load.
const DOMAIN_REGEXES: Array<{ domain: DomainDefinition; regex: RegExp }> = DOMAINS.map((domain) => {
  const alternation = domain.aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return { domain, regex: new RegExp(`(?<![a-zA-Z0-9])(?:${alternation})(?![a-zA-Z0-9])`, "i") };
});

/** Domain ids whose aliases appear in `text` (presence only). */
export function matchDomains(text: string | null | undefined): string[] {
  if (!text || text.trim() === "") return [];
  const found: string[] = [];
  for (const { domain, regex } of DOMAIN_REGEXES) {
    if (regex.test(text)) found.push(domain.id);
  }
  return found;
}

/**
 * Adjacent-domain transfer weight in [0,1], read symmetrically over the authored
 * edges. Identical domains return 1; unrelated return 0.
 */
export function adjacentDomainWeight(fromId: string, toId: string): number {
  if (fromId === toId) return 1;
  let best = 0;
  for (const [a, b] of [
    [fromId, toId],
    [toId, fromId],
  ] as const) {
    const d = DOMAIN_BY_ID.get(a);
    if (!d) continue;
    for (const edge of d.related) {
      if (edge.domainId === b && edge.weight > best) best = edge.weight;
    }
  }
  return best;
}
