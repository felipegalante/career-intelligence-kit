// Typed gap analysis (M9-S6, spec §21). Instead of a flat "missing keywords" list,
// classify each shortfall: a truly absent mandatory skill is a different problem
// from a skill the résumé *demonstrates through adjacent work* but never names, or
// a skill that's listed but never tied to real experience. Each gap carries a
// severity, a plain explanation, a safe recommendation, and `addOnlyIfTrue` — the
// keywords to add only if genuinely accurate (never asserted on the candidate).

import type { FitGap, GapSeverity, GapType } from "@career-intelligence/fit-scoring";
import { domainById, SKILL_DICTIONARY } from "@career-intelligence/job-description-normalization";

import type { EvidenceMatchResult } from "../match/matchEvidence";

const SKILL_LABEL = new Map(SKILL_DICTIONARY.map((s) => [s.normalizedName, s.name]));
const skillLabel = (id: string): string => SKILL_LABEL.get(id) ?? id;
const domainLabel = (id: string): string => domainById(id)?.label ?? id;

// Importance → severity for a missing/weak requirement.
function severityFor(importance: string, base: GapSeverity = "moderate"): GapSeverity {
  if (importance === "mandatory") return "critical";
  if (importance === "strong_preferred") return "major";
  if (importance === "preferred") return "moderate";
  return base === "moderate" ? "minor" : base;
}

const WEAK_EVIDENCE_THRESHOLD = 1.75; // ≈ skills-list-only, no experience backing
const RECENCY_THRESHOLD = 0.6;

export interface GapAnalysisInput {
  matches: EvidenceMatchResult;
}

/** Build the typed gap list from a match result. Deterministic ordering. */
export function buildGapAnalysis(input: GapAnalysisInput): FitGap[] {
  const gaps: FitGap[] = [];

  for (const m of input.matches.skills) {
    const label = skillLabel(m.skillId);
    if (m.matchType === "missing") {
      const type: GapType = "missing_mandatory_skill";
      gaps.push({
        type,
        severity: severityFor(m.importance),
        requirement: label,
        explanation: `The job asks for ${label}, which the résumé does not show.`,
        recommendation: `Add ${label} only if you genuinely have it; otherwise consider whether the role is a fit.`,
        addOnlyIfTrue: [label],
      });
    } else if (m.matchType === "adjacent") {
      // The résumé demonstrates related work but never names the requirement.
      gaps.push({
        type: "keyword_not_explicit",
        severity: severityFor(m.importance, "minor"),
        requirement: label,
        explanation:
          `The résumé shows adjacent experience (${m.via ? skillLabel(m.via) : "related skills"}) ` +
          `but does not explicitly state "${label}".`,
        recommendation: `Add "${label}" only if accurate — your ${m.via ? skillLabel(m.via) : "related"} work may already qualify.`,
        addOnlyIfTrue: [label],
      });
    } else if (m.evidenceStrength > 0 && m.evidenceStrength < WEAK_EVIDENCE_THRESHOLD) {
      gaps.push({
        type: "weak_evidence",
        severity: "minor",
        requirement: label,
        explanation: `${label} appears in the résumé but mostly in a skills list, not tied to an accomplishment.`,
        recommendation: `Strengthen ${label} by tying it to an experience bullet with ownership, system context, or a measurable outcome.`,
        addOnlyIfTrue: [],
      });
    } else if (m.matchType === "exact" && m.recency > 0 && m.recency < RECENCY_THRESHOLD) {
      gaps.push({
        type: "recency_gap",
        severity: "minor",
        requirement: label,
        explanation: `Your ${label} experience looks dated; recent usage carries more weight.`,
        recommendation: `Surface any recent ${label} work (a recent role or project) if you have it.`,
        addOnlyIfTrue: [],
      });
    }
  }

  for (const d of input.matches.domains) {
    if (d.matchType === "missing") {
      gaps.push({
        type: "domain_gap",
        severity: "moderate",
        requirement: domainLabel(d.domainId),
        explanation: `The role centers on ${domainLabel(d.domainId)}, which the résumé does not evidence.`,
        recommendation: `Highlight any ${domainLabel(d.domainId)} experience only if you have it.`,
        addOnlyIfTrue: [domainLabel(d.domainId)],
      });
    } else if (d.matchType === "adjacent") {
      gaps.push({
        type: "context_gap",
        severity: "minor",
        requirement: domainLabel(d.domainId),
        explanation: `The résumé shows adjacent business context (${d.via ? domainLabel(d.via) : "related domain"}) rather than ${domainLabel(d.domainId)} directly.`,
        recommendation: `Clarify your ${domainLabel(d.domainId)} exposure if it applies.`,
        addOnlyIfTrue: [domainLabel(d.domainId)],
      });
    }
  }

  const sen = input.matches.seniority;
  if (sen.fit !== null && sen.fit < 1 && sen.requiredLevel) {
    gaps.push({
      type: "seniority_gap",
      severity: sen.fit <= 0.3 ? "major" : "moderate",
      requirement: `${sen.requiredLevel} level`,
      explanation: `The role targets ${sen.requiredLevel}; the résumé reads as ${sen.candidateLevel ?? "below that"}.`,
      recommendation: `Emphasize scope, ownership, and impact that demonstrate ${sen.requiredLevel}-level work, if accurate.`,
      addOnlyIfTrue: [],
    });
  }

  return gaps;
}
