// Deterministic tailoring recommendations. Template-based, never
// LLM-generated and never fabricated: the engine maps each typed gap to a concrete,
// honest suggestion. The cardinal rule — never tell the candidate to
// claim a skill as if they have it; skill-adding advice is always "add only if true".

import type { FitGap, FitRecommendation, RecommendationType } from "@career-intelligence/fit-scoring";

const GAP_TO_REC: Record<FitGap["type"], { type: RecommendationType; priority: FitRecommendation["priority"] }> = {
  missing_mandatory_skill: { type: "add_keyword_if_true", priority: "high" },
  keyword_not_explicit: { type: "add_keyword_if_true", priority: "medium" },
  weak_evidence: { type: "strengthen_evidence", priority: "medium" },
  recency_gap: { type: "strengthen_evidence", priority: "low" },
  domain_gap: { type: "clarify_domain", priority: "medium" },
  context_gap: { type: "clarify_domain", priority: "low" },
  seniority_gap: { type: "rewrite_bullet", priority: "medium" },
  resume_positioning_gap: { type: "reorder_resume", priority: "low" },
};

const SEVERITY_PRIORITY: Record<FitGap["severity"], FitRecommendation["priority"]> = {
  critical: "high",
  major: "high",
  moderate: "medium",
  minor: "low",
};

const PRIORITY_RANK: Record<FitRecommendation["priority"], number> = { high: 0, medium: 1, low: 2 };

/**
 * Turn typed gaps into deterministic tailoring recommendations. One per gap,
 * sorted by priority (severity-adjusted). Every skill-adding recommendation keeps
 * the "only if true" framing — the engine never asserts the candidate has a skill.
 */
export function buildTailoringHints(gaps: FitGap[]): FitRecommendation[] {
  const recs = gaps.map((gap): FitRecommendation => {
    const mapping = GAP_TO_REC[gap.type];
    // Escalate priority for the most severe gaps.
    const priority =
      PRIORITY_RANK[SEVERITY_PRIORITY[gap.severity]] < PRIORITY_RANK[mapping.priority]
        ? SEVERITY_PRIORITY[gap.severity]
        : mapping.priority;
    return {
      type: mapping.type,
      priority,
      recommendation: gap.recommendation,
      rationale: gap.explanation,
    };
  });
  return recs.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
