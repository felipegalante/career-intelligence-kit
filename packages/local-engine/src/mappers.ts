// Maps the internal deterministic engine outputs (CandidateProfile, JobProfile,
// JobFitResult) onto the stable public DTOs from `@career-intelligence/types`.

import {
  type FitGap,
  type FitStrength,
  type GapSeverity,
  type JobFitResult,
  type MatchClassification,
  type ScoreableJob,
} from "@career-intelligence/fit-scoring";
import {
  type JobProfile,
  type RequiredSkill as JdRequiredSkill,
  normalizeTitle,
} from "@career-intelligence/job-description-normalization";
import {
  type CandidateProfile,
  type ResumeEvidence as InternalResumeEvidence,
} from "@career-intelligence/resume-intelligence";
import {
  SENIORITY_LEVELS,
  type EvaluationGap,
  type EvaluationStrength,
  type FitMatchLevel,
  type FitScoreResult,
  type IntelligenceResultMetadata,
  type JobDescriptionInput,
  type NormalizedJobProfile,
  type ParsedResume,
  type RequiredSkill,
  type RequirementImportanceLevel,
  type ResumeEvidence,
  type ResumeExperience,
  type ResumeSectionName,
  type ResumeSkill,
  type RoleFamily,
  type Seniority,
} from "@career-intelligence/types";

// ---- resume ---------------------------------------------------------------

function evidenceSection(source: InternalResumeEvidence["source"]): ResumeSectionName {
  switch (source) {
    case "project":
      return "projects";
    case "unknown":
      return "other";
    default:
      return source;
  }
}

function highestSeniority(values: Array<string | null>): Seniority | null {
  let best: Seniority | null = null;
  let bestRank = -1;
  for (const value of values) {
    const rank = SENIORITY_LEVELS.indexOf(value as Seniority);
    if (rank > bestRank) {
      bestRank = rank;
      best = (value as Seniority) ?? null;
    }
  }
  return best;
}

export function mapParsedResume(profile: CandidateProfile): ParsedResume {
  const skill = (id: string, confidence: number): ResumeSkill => ({ id, label: id, confidence });
  const skills: ResumeSkill[] = [
    ...profile.techTiers.tier1.map((id) => skill(id, 0.9)),
    ...profile.techTiers.tier2.map((id) => skill(id, 0.7)),
    ...profile.techTiers.tier3.map((id) => skill(id, 0.5)),
  ];

  const experience: ResumeExperience[] = profile.roleBuckets.map((bucket) => ({
    title: bucket.label,
    roleFamily: (bucket.roleFamily as RoleFamily | null) ?? null,
    seniority: (bucket.seniority as Seniority | null) ?? null,
    organization: null,
    startDate: null,
    endDate: null,
    highlights: [],
  }));

  const evidence: ResumeEvidence[] = (profile.evidence ?? []).map((item) => ({
    claim: item.text,
    supports: [...item.skills, ...item.domains],
    strength: Math.max(0, Math.min(1, item.evidenceStrength / 5)),
    source: evidenceSection(item.source),
  }));

  const firstRoleFamily =
    profile.roleBuckets.find((bucket) => bucket.roleFamily)?.roleFamily ?? null;

  return {
    sections: [],
    skills,
    experience,
    evidence,
    inferredSeniority: highestSeniority(profile.roleBuckets.map((bucket) => bucket.seniority)),
    inferredRoleFamily: (firstRoleFamily as RoleFamily | null) ?? null,
    parserVersion: profile.version,
  };
}

// ---- job description ------------------------------------------------------

function importanceLevel(importance: JdRequiredSkill["importance"]): RequirementImportanceLevel {
  if (importance === "mandatory") return "required";
  if (importance === "preferred") return "preferred";
  return "implied";
}

function importanceWeight(importance: JdRequiredSkill["importance"]): number {
  if (importance === "mandatory") return 1;
  if (importance === "preferred") return 0.6;
  return 0.3;
}

export function mapNormalizedJobProfile(profile: JobProfile): NormalizedJobProfile {
  const requiredSkills: RequiredSkill[] = profile.skills.map((entry) => ({
    id: entry.skillId,
    label: entry.skillId,
    importance: importanceLevel(entry.importance),
    weight: importanceWeight(entry.importance),
  }));

  return {
    title: profile.title || null,
    normalizedTitle: profile.title ? normalizeTitle(profile.title) : null,
    roleFamily: (profile.roleFamily as RoleFamily | null) ?? null,
    seniority: profile.seniority,
    requiredSkills,
    responsibilities: profile.responsibilities.map((req) => ({
      text: req.text,
      signals: [...req.skills, ...req.domains],
      weight: 0.5,
    })),
    senioritySignals: profile.seniority
      ? [{ level: profile.seniority, evidence: "inferred from posting", weight: 0.5 }]
      : [],
    roleFamilySignals: profile.roleFamily
      ? [
          {
            family: profile.roleFamily as RoleFamily,
            evidence: "inferred from title",
            weight: 0.5,
          },
        ]
      : [],
    gates: profile.gates.map((gate) => gate.label),
    normalizerVersion: PROFILE_NORMALIZER_VERSION,
  };
}

export const PROFILE_NORMALIZER_VERSION = "jd-normalize@1";

/** Build the internal ScoreableJob the rubric scorer needs from JD text + profile. */
export function buildScoreableJob(input: JobDescriptionInput, profile: JobProfile): ScoreableJob {
  const byImportance = (want: JdRequiredSkill["importance"]): string[] =>
    profile.skills.filter((s) => s.importance === want).map((s) => s.skillId);
  return {
    id: "local",
    title: profile.title || input.title || "",
    descriptionText: input.text,
    requiredSkills: byImportance("mandatory"),
    preferredSkills: byImportance("preferred"),
    inferredSkills: profile.skills
      .filter((s) => s.importance !== "mandatory" && s.importance !== "preferred")
      .map((s) => s.skillId),
    metadata: {
      companyName: input.company,
      seniority: profile.seniority ?? undefined,
    },
  };
}

// ---- fit / report ---------------------------------------------------------

function matchLevel(score: number, classification?: MatchClassification): FitMatchLevel {
  switch (classification) {
    case "excellent_match":
    case "strong_match":
      return "strong";
    case "good_match":
      return "good";
    case "moderate_match":
      return "fair";
    case "weak_match":
    case "poor_match":
      return "weak";
    default:
      if (score >= 75) return "strong";
      if (score >= 55) return "good";
      if (score >= 35) return "fair";
      return "weak";
  }
}

export function severityToImpact(severity: GapSeverity): EvaluationGap["impact"] {
  if (severity === "critical" || severity === "major") return "high";
  if (severity === "moderate") return "medium";
  return "low";
}

export function mapStrengths(strengths: FitStrength[]): EvaluationStrength[] {
  return strengths.map((strength) => ({
    title: strength.label,
    summary: strength.evidence[0] ?? "",
    confidence: 0.7,
  }));
}

export function mapGaps(gaps: FitGap[]): EvaluationGap[] {
  return gaps.map((gap) => ({
    title: gap.requirement,
    summary: gap.explanation,
    tip: gap.recommendation,
    impact: severityToImpact(gap.severity),
  }));
}

export function mapFitScore(
  result: JobFitResult,
  metadata: IntelligenceResultMetadata,
): FitScoreResult {
  return {
    score: result.overallScore,
    atsScore: result.atsScore ?? 0,
    matchLevel: matchLevel(result.overallScore, result.classification),
    verdict: result.explanationSummary,
    dimensions: (result.breakdown?.dimensions ?? []).map((dimension) => ({
      id: dimension.id,
      label: dimension.label,
      score: Math.round(dimension.rawScore * 100),
      weight: dimension.weight,
    })),
    signals: [
      ...(result.strengths ?? []).map((strength) => ({
        kind: "strength" as const,
        ref: strength.label,
        label: strength.label,
        detail: strength.evidence[0] ?? "",
        impact: 0.5,
      })),
      ...(result.gaps ?? []).map((gap) => ({
        kind: "gap" as const,
        ref: gap.requirement,
        label: gap.requirement,
        detail: gap.explanation,
        impact: gap.severity === "critical" || gap.severity === "major" ? 0.8 : 0.4,
      })),
    ],
    calibration: [],
    metadata,
  };
}
