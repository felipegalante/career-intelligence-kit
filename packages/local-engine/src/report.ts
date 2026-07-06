// Builds the structured Resume ATS report body (`fitInsights` + company-context
// blocks) from the deterministic engine outputs. The local engine has no company
// intelligence and no LLM, so company blocks are honest degraded values and every
// insight is derived from parseable evidence only.

import { type JobProfile } from "@career-intelligence/job-description-normalization";
import { type CandidateProfile, type JobAnalysis } from "@career-intelligence/resume-intelligence";
import {
  type CareerEvaluationInput,
  type EvaluationGap,
  type EvaluationStrength,
  type FitMatchLevel,
  type ReportCalibration,
  type ReportCompanyContext,
  type ReportRoadmapStage,
  type ResumeAtsFitInsights,
} from "@career-intelligence/types";

import { mapGaps, mapStrengths } from "./mappers";

export const LOCAL_REPORT_LIMITATIONS = [
  "Deterministic local engine: no LLM enrichment or company/domain context.",
];

const NO_GAP_DETECTED = "No major deterministic gap detected";

/** Company context is honestly unavailable in the local engine. */
export function localCompanyContext(): ReportCompanyContext {
  return {
    provider: "none",
    degraded: true,
    preparationInsights: [],
    resumeTailoringAngles: [],
    warnings: ["Deterministic local engine: company/domain intelligence is unavailable."],
  };
}

/** No calibration hints exist locally; the base score is disclosed unchanged. */
export function localCalibration(baseScore: number): ReportCalibration {
  return {
    positiveSignals: [],
    negativeSignals: [],
    neutralSignals: [],
    netAdjustment: 0,
    baseScore: Math.round(baseScore),
    calibratedScore: Math.round(baseScore),
    applied: false,
  };
}

function matchLevelLabel(level: FitMatchLevel): string {
  switch (level) {
    case "strong":
      return "Strong";
    case "good":
      return "Good";
    case "fair":
      return "Partial";
    case "weak":
      return "Needs work";
  }
}

function fitScoreDetail(score: number): string {
  if (score >= 85) return "Strong foundation for this role.";
  if (score >= 70) return "Solid foundation with clear improvement opportunities.";
  return "Needs targeted tailoring before applying.";
}

function readinessDetail(readiness: number): string {
  if (readiness >= 85) return "Likely ready with light tailoring.";
  if (readiness >= 70) return "Likely to improve with focused evidence updates.";
  return "Improve core evidence before relying on this resume.";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Review";
}

function shortTitle(value: string): string {
  const text = (value.split(/[:;]/)[0] ?? "").trim();
  return text.split(/\s+/).slice(0, 5).join(" ") || "Evidence update";
}

function roadmap(gaps: EvaluationGap[]): ReportRoadmapStage[] {
  const high = gaps.filter((gap) => gap.impact === "high").map((gap) => gap.tip);
  const rest = gaps.filter((gap) => gap.impact !== "high").map((gap) => gap.tip);
  return [
    {
      title: "Fix now",
      impact: "High impact",
      tone: "danger",
      items: (high.length > 0 ? high : ["Review the report gaps and close the highest-impact one."]).slice(0, 3),
      focus: "Close critical gaps",
    },
    {
      title: "Improve next",
      impact: "Medium impact",
      tone: "warn",
      items: (rest.length > 0 ? rest : ["Quantify impact and clarify scope where the resume is vague."]).slice(0, 3),
      focus: "Strengthen evidence",
    },
    {
      title: "Optional polish",
      impact: "Low impact",
      tone: "good",
      items: [
        "Tighten role-language alignment.",
        "Keep the resume clean, specific, and ATS-readable.",
      ],
      focus: "Differentiate further",
    },
  ];
}

export interface LocalFitInsightsInput {
  input: CareerEvaluationInput;
  profile: CandidateProfile;
  jobProfile: JobProfile;
  analysis: JobAnalysis;
  matchLevel: FitMatchLevel;
  readinessScore: number;
  generatedAt: string;
}

export function buildLocalFitInsights(args: LocalFitInsightsInput): ResumeAtsFitInsights {
  const { input, profile, jobProfile, analysis, readinessScore, generatedAt } = args;
  const result = analysis.result;
  const strengths: EvaluationStrength[] = mapStrengths(result.strengths ?? []);
  const gaps: EvaluationGap[] = mapGaps(analysis.gaps);

  const score = result.overallScore;
  const ats = result.atsScore ?? 0;
  const matched = result.matchedRequiredSkills;
  const missing = result.missingRequiredSkills;
  const matchedCount = matched.length;
  const requiredCount = matchedCount + missing.length;
  const coveragePercent =
    requiredCount > 0 ? Math.round(Math.min(100, (matchedCount * 100) / requiredCount)) : 0;
  const matchedSet = new Set(matched);
  const resumeOnlySkills = [...profile.techTiers.tier1, ...profile.techTiers.tier2].filter(
    (skill) => !matchedSet.has(skill),
  );

  const roleTitle = input.job.title ?? jobProfile.title ?? null;
  const primaryGap = gaps[0]?.summary ?? NO_GAP_DETECTED;
  const bestNextMove = gaps[0]?.tip ?? "Keep evidence specific, truthful, and ATS-readable.";
  const verdict = result.explanationSummary;
  const headline = result.classification?.replace(/_/g, " ") ?? "fit assessed";
  const topStrength = strengths[0]?.title ?? "Parseable evidence found for the role";
  const levelLabel = matchLevelLabel(args.matchLevel);

  return {
    fitSummary: {
      headline,
      narrative: `${verdict} ${topStrength}. Address next: ${primaryGap}`.trim(),
      generatedAt,
      roleTitle,
      workplaceType: null,
      locations: [],
      bestNextMove,
    },
    snapshot: {
      skillsMatched:
        requiredCount > 0
          ? `${matchedCount} of ${requiredCount}`
          : `${matchedCount} matched skills detected`,
      topStrengths:
        strengths.length > 0
          ? strengths
              .slice(0, 2)
              .map((s) => s.title)
              .join("; ")
          : "No strong deterministic signals were found yet.",
      missingEvidence: primaryGap,
      focusNext: bestNextMove,
      roleContext: [roleTitle, input.job.company].filter(Boolean).join(" - ") || "Role context unavailable",
      confidence: confidenceLabel(result.confidence),
    },
    scoreCards: {
      fitScore: { value: score, label: "Fit score", detail: fitScoreDetail(score) },
      atsScore: {
        value: ats,
        label: "ATS score",
        detail:
          requiredCount > 0
            ? `${matchedCount} of ${requiredCount} detected role skills matched.`
            : "Keyword requirements were limited in the job input.",
      },
      matchLevel: {
        label: levelLabel,
        detail:
          score >= 70
            ? "Promising alignment with targeted gaps."
            : "Important evidence gaps should be addressed first.",
      },
      primaryGap: { label: shortTitle(primaryGap), detail: primaryGap },
      estimatedReadiness: {
        value: readinessScore,
        label: `~${readinessScore}%`,
        detail: readinessDetail(readinessScore),
      },
    },
    strengths,
    gaps,
    roadmap: roadmap(gaps),
    resumeEdits: (gaps.length > 0 ? gaps : [{ title: NO_GAP_DETECTED, tip: bestNextMove } as EvaluationGap])
      .slice(0, 3)
      .map((gap, index) => ({
        title: shortTitle(gap.tip ?? gap.title),
        example: "Example: state the concrete system, your role, and a measurable outcome.",
        priority: index + 1,
      })),
    interviewPrep: [
      {
        topic: shortTitle(primaryGap),
        prompt: `Be ready to walk through a specific example that addresses ${primaryGap.toLowerCase()}.`,
      },
      {
        topic: "Evidence depth",
        prompt: `Connect your strongest signal to the expectations for ${roleTitle ?? "this role"}.`,
      },
      {
        topic: "Ownership and impact",
        prompt: "Explain the scope you owned and the measurable user or business result.",
      },
    ],
    skillsAnalysis: {
      categoryCoverage: (result.breakdown?.dimensions ?? []).map((dimension) => ({
        label: dimension.label,
        percent: Math.round(Math.max(0, Math.min(100, dimension.rawScore * 100))),
      })),
      coveragePercent,
      matchedCount,
      requiredCount,
      matchedSkills: matched,
      missingSkills: missing,
      resumeOnlySkills,
    },
    applicationChecklist: [
      {
        title: "Add missing evidence",
        detail: gaps[0]?.summary ?? "Review whether any important evidence is still implicit.",
        done: gaps.length === 0,
      },
      {
        title: "Quantify scope and impact",
        detail: "Add metrics, scope, or measurable outcomes where possible.",
        done: score >= 85,
      },
      {
        title: "Align role language",
        detail: "Use truthful keywords from the posting where the experience exists.",
        done: requiredCount > 0 && matchedCount >= requiredCount,
      },
    ],
    targetRoleContext: {
      title: roleTitle ?? "Target role",
      meta: [input.job.company].filter((item): item is string => Boolean(item)),
      keyExpectations:
        jobProfile.skills.slice(0, 6).map((skill) => skill.skillId).length > 0
          ? jobProfile.skills.slice(0, 6).map((skill) => skill.skillId)
          : ["Role expectations were inferred from the current job input."],
    },
    evidenceReview: {
      validatedSignals: strengths.slice(0, 4).map((s) => s.title),
      detectedGaps: gaps.slice(0, 4).map((gap) => gap.title),
      limitations: LOCAL_REPORT_LIMITATIONS,
    },
  };
}
