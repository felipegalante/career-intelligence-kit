// Deterministic Job Match Report builder (M14-S2). Transforms the in-house engine's
// analysis (scores, 6-dim rubric, matches, typed gaps, recommendations, gates) plus
// job role-context into the structured `JobMatchReport` the UI renders. No LLM, no
// external services, no fabrication: data that isn't available is reported as
// "unavailable" rather than invented (the cardinal rule of the spec). The `fitInsights`
// object is the primary UI contract; the top-level fields are headline/source data.

import type {
  FitGap,
  FitRecommendation,
  GapSeverity,
  MatchClassification,
  ScoreableJob,
} from "@career-intelligence/fit-scoring";
import { inferRoleFamily, SKILL_DICTIONARY } from "@career-intelligence/job-description-normalization";

import type { CandidateProfile } from "../parse-resume";
import { analyzeJob } from "../score";
import { LOCAL_ENGINE_VERSION } from "../version";

import type { JobMatchReport, ReportImpact, ReportRoleContext } from "./jobMatchReport.contract";

const SKILL_LABEL = new Map(SKILL_DICTIONARY.map((s) => [s.normalizedName, s.name]));
const skillLabel = (id: string): string => SKILL_LABEL.get(id) ?? id;

const VERDICT: Record<MatchClassification, string> = {
  excellent_match: "Excellent match",
  strong_match: "Strong match",
  good_match: "Good match",
  moderate_match: "Moderate match",
  weak_match: "Weak match",
  poor_match: "Poor match",
};

const REC_TITLE: Record<FitRecommendation["type"], string> = {
  add_keyword_if_true: "Add a missing keyword (only if true)",
  strengthen_evidence: "Strengthen your evidence",
  reorder_resume: "Reorder your résumé",
  rewrite_bullet: "Rewrite a bullet for impact",
  clarify_domain: "Clarify your domain experience",
};

function impactFromSeverity(s: GapSeverity): ReportImpact {
  if (s === "critical" || s === "major") return "high";
  if (s === "moderate") return "medium";
  return "low";
}

const IMPACT_RANK: Record<ReportImpact, number> = { high: 0, medium: 1, low: 2 };

/** Role/company context the report can't derive from the engine — the caller (API) supplies it. */
export interface ReportJobContextInput {
  title: string;
  companyName?: string | null;
  department?: string | null;
  team?: string | null;
  locations?: string[];
  workplaceType?: ReportRoleContext["workplaceType"];
  employmentType?: string | null;
  compensation?: ReportRoleContext["compensation"];
  sourcePlatform?: string | null;
  seniority?: string | null;
}

export interface BuildJobMatchReportInput {
  profile: CandidateProfile;
  job: ScoreableJob;
  roleContext: ReportJobContextInput;
  now?: Date;
}

const LIMITATIONS = [
  "This report uses only your résumé, the job posting, and the in-house scoring rubric — no live external research was performed.",
  "Missing company or compensation details are shown as unavailable, not estimated.",
  "This is decision-support guidance, not a hiring prediction or guarantee.",
];

export function buildJobMatchReport(input: BuildJobMatchReportInput): JobMatchReport {
  const { profile, job, roleContext } = input;
  const now = input.now ?? new Date();
  const analysis = analyzeJob(profile, job, { parseConfidence: profile.parseConfidence });
  const fit = analysis.result;

  const score = fit.overallScore;
  const ats = fit.atsScore ?? 0;
  const classification = fit.classification ?? "poor_match";
  const verdict = VERDICT[classification];
  const confidencePct = Math.round(fit.confidence * 100);

  // ---- breakdown (6 dims, normalized 0–100) -------------------------------
  const dimPercent = new Map(
    (fit.breakdown?.dimensions ?? []).map((d) => [d.id, Math.round(d.rawScore * 100)]),
  );
  const pct = (id: string): number => dimPercent.get(id) ?? 0;
  const breakdown = {
    technicalStack: pct("technicalStack"),
    seniorityScope: pct("seniorityScope"),
    architecture: pct("architecture"),
    stakeholderFit: pct("stakeholderFit"),
    businessOrientation: pct("businessOrientation"),
    multiplierCommunication: pct("multiplierCommunication"),
  };

  // ---- skills coverage ----------------------------------------------------
  const matchedReq = fit.matchedRequiredSkills;
  const missingReq = fit.missingRequiredSkills;
  const requiredCount = matchedReq.length + missingReq.length;
  const coveragePercent = requiredCount > 0 ? Math.round((matchedReq.length / requiredCount) * 100) : 100;
  const jobSkillSet = new Set([...job.requiredSkills, ...job.preferredSkills, ...(job.inferredSkills ?? [])]);
  const resumeSkills = [...profile.techTiers.tier1, ...profile.techTiers.tier2, ...profile.techTiers.tier3];
  const resumeOnlySkills = [...new Set(resumeSkills)].filter((s) => !jobSkillSet.has(s)).slice(0, 12);

  // ---- gaps + roadmap -----------------------------------------------------
  const gaps = analysis.gaps
    .map((g: FitGap) => ({
      title: g.requirement,
      summary: g.explanation,
      tip: g.recommendation,
      impact: impactFromSeverity(g.severity),
    }))
    .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact]);

  const lane = (impact: ReportImpact) => gaps.filter((g) => g.impact === impact);
  const roadmap = [
    {
      title: "Fix now",
      impact: "high",
      tone: "danger" as const,
      items: lane("high").map((g) => g.tip),
      focus: "Close the highest-impact gaps before applying.",
    },
    {
      title: "Improve next",
      impact: "medium",
      tone: "warn" as const,
      items: lane("medium").map((g) => g.tip),
      focus: "Strengthen these to stand out.",
    },
    {
      title: "Optional polish",
      impact: "low",
      tone: "good" as const,
      items: lane("low").map((g) => g.tip),
      focus: "Nice-to-have refinements.",
    },
  ];

  // ---- strengths + recommendations + prep ---------------------------------
  const strengths = (fit.strengths ?? []).slice(0, 5).map((s) => ({
    title: skillLabel(s.label),
    summary: s.evidence[0] ?? `${skillLabel(s.label)} is a direct match for this role.`,
    confidence: s.evidence.length > 0 ? 0.9 : 0.7,
    level: s.evidence.length > 0 ? "Strong evidence" : "Listed skill",
  }));

  const resumeEdits = analysis.recommendations.slice(0, 6).map((r, i) => ({
    title: REC_TITLE[r.type],
    example: r.recommendation,
    priority: i + 1,
  }));

  const interviewPrep = [
    ...strengths.slice(0, 3).map((s) => ({
      topic: s.title,
      prompt: `Be ready to walk through a concrete example where you used ${s.title}, including the impact.`,
    })),
    ...(analysis.jobProfile?.responsibilities ?? []).slice(0, 2).map((r) => ({
      topic: "Role focus",
      prompt: `Prepare to discuss how your experience maps to: "${r.text}".`,
    })),
  ].slice(0, 4);

  // ---- checklist ----------------------------------------------------------
  const highGaps = lane("high");
  const hasMetrics = (profile.evidence ?? []).some((e) => e.metrics.length > 0);
  const applicationChecklist = [
    {
      title: "Cover the required skills",
      detail: `${matchedReq.length}/${requiredCount} required skills are explicitly covered.`,
      done: missingReq.length === 0 && requiredCount > 0,
    },
    {
      title: "Address critical gaps",
      detail: highGaps.length > 0 ? `${highGaps.length} high-impact gap(s) to close.` : "No high-impact gaps detected.",
      done: highGaps.length === 0,
    },
    { title: "Tailor your summary", detail: "Lead with the strengths most relevant to this role.", done: false },
    {
      title: "Quantify your impact",
      detail: "Tie your key bullets to measurable outcomes.",
      done: hasMetrics,
    },
  ];

  // ---- role context -------------------------------------------------------
  const locations = roleContext.locations ?? [];
  const workplaceType = roleContext.workplaceType ?? "unknown";
  const roleContextOut: ReportRoleContext = {
    companyName: roleContext.companyName ?? null,
    title: roleContext.title,
    department: roleContext.department ?? null,
    team: roleContext.team ?? null,
    locations,
    workplaceType,
    employmentType: roleContext.employmentType ?? null,
    compensation: roleContext.compensation ?? null,
    sourcePlatform: roleContext.sourcePlatform ?? null,
    seniority: roleContext.seniority ?? null,
  };
  const locationLabel = locations.length > 0 ? locations.join(", ") : "Location not specified";
  const roleMeta = [
    roleContext.companyName ?? undefined,
    locations.length > 0 ? locationLabel : undefined,
    workplaceType !== "unknown" ? workplaceType : undefined,
    roleContext.employmentType ?? undefined,
    roleContext.seniority ?? undefined,
  ].filter((x): x is string => Boolean(x));
  const responsibilityTexts = (analysis.jobProfile?.responsibilities ?? []).slice(0, 5).map((r) => r.text);
  const keyExpectations =
    responsibilityTexts.length > 0
      ? responsibilityTexts
      : matchedReq.concat(missingReq).slice(0, 5).map(skillLabel);

  // ---- intelligence -------------------------------------------------------
  const roleFamily = inferRoleFamily(roleContext.title);
  const jp = analysis.jobProfile;
  const compFacts: string[] = [];
  if (locations.length > 0) compFacts.push(`Locations: ${locationLabel}`);
  if (workplaceType !== "unknown") compFacts.push(`Workplace: ${workplaceType}`);
  if (roleContext.employmentType) compFacts.push(`Employment: ${roleContext.employmentType}`);
  if (roleContext.compensation?.min || roleContext.compensation?.max) {
    const c = roleContext.compensation;
    compFacts.push(
      `Compensation: ${[c.min, c.max].filter(Boolean).join("–")} ${c.currency ?? ""} ${c.period ?? ""}`.trim(),
    );
  }

  const GATE_CATEGORY: Record<string, string> = {
    required_years: "experience_requirement",
    work_authorization: "hard_gate",
    clearance: "compliance",
    certification: "compliance",
    language: "logistics_requirement",
    employment_type: "logistics_requirement",
    location: "logistics_requirement",
  };
  const signalCounts = new Map<string, number>();
  for (const g of jp?.gates ?? []) {
    const cat = GATE_CATEGORY[g.id] ?? "unknown";
    signalCounts.set(cat, (signalCounts.get(cat) ?? 0) + 1);
  }
  const intelligence = {
    companyOverview: {
      available: Boolean(roleContext.companyName),
      summary: roleContext.companyName
        ? `Posted by ${roleContext.companyName}.`
        : "Company details aren't available from this posting.",
      facts: [
        roleContext.companyName ? `Company: ${roleContext.companyName}` : undefined,
        roleContext.department ? `Department: ${roleContext.department}` : undefined,
        roleContext.team ? `Team: ${roleContext.team}` : undefined,
        roleContext.sourcePlatform ? `Source: ${roleContext.sourcePlatform}` : undefined,
      ].filter((x): x is string => Boolean(x)),
    },
    roleAnalysis: {
      available: true,
      summary: `${roleContext.title}${roleFamily ? ` — ${roleFamily}` : ""}${roleContext.seniority ? ` (${roleContext.seniority})` : ""}.`,
      facts: [
        roleFamily ? `Role family: ${roleFamily}` : undefined,
        roleContext.seniority ? `Seniority: ${roleContext.seniority}` : undefined,
        `Rubric confidence: ${confidencePct}%`,
        jp ? `${jp.responsibilities.length} responsibilities, ${jp.requirements.length} requirements extracted` : undefined,
      ].filter((x): x is string => Boolean(x)),
    },
    skillsCoverage: {
      summary: `${matchedReq.length} of ${requiredCount} required skills are explicitly covered (${coveragePercent}%).`,
      matchedSkills: matchedReq.map(skillLabel),
      missingSkills: missingReq.map(skillLabel),
      resumeOnlySkills: resumeOnlySkills.map(skillLabel),
      matchedCount: matchedReq.length,
      requiredCount,
    },
    compensationLogistics: {
      available: compFacts.length > 0,
      summary: compFacts.length > 0 ? "Logistics extracted from the posting." : "Compensation and logistics aren't disclosed in this posting.",
      facts: compFacts,
    },
    applicationQuestionSignals: {
      available: signalCounts.size > 0,
      signals: [...signalCounts.entries()].map(([category, count]) => ({ category, count })),
      note: "Compliance and demographic questions are never used in scoring.",
    },
    limitations: LIMITATIONS,
  };

  // ---- fitInsights --------------------------------------------------------
  const generatedAt = now.toISOString();
  const estimatedReadiness = Math.round(score * 0.72 + ats * 0.28);
  const topGap = gaps[0];
  const bestNextMove = resumeEdits[0]?.example ?? topGap?.tip ?? "You're well-aligned — tailor your summary and apply.";

  const fitInsights: JobMatchReport["fitInsights"] = {
    fitSummary: {
      headline: `${verdict} — ${score}/100`,
      narrative: fit.explanationSummary,
      generatedAt,
      roleTitle: roleContext.title,
      workplaceType: workplaceType !== "unknown" ? workplaceType : null,
      locations,
      bestNextMove,
    },
    snapshot: {
      skillsMatched: `${matchedReq.length} of ${requiredCount} required skills matched`,
      topStrengths: strengths.length > 0 ? strengths.map((s) => s.title).join(", ") : "No standout strengths detected",
      missingEvidence: missingReq.length > 0 ? missingReq.map(skillLabel).slice(0, 3).join(", ") : "None",
      focusNext: topGap?.title ?? "Tailor and apply",
      roleContext: `${roleContext.title}${roleContext.companyName ? ` at ${roleContext.companyName}` : ""}`,
      confidence: `${confidencePct}% confidence`,
    },
    scoreCards: {
      fitScore: { value: score, label: "Fit score", detail: verdict },
      atsScore: { value: ats, label: "ATS score", detail: "Explicit keyword & parse alignment" },
      matchLevel: { label: verdict, detail: `${matchedReq.length}/${requiredCount} required skills matched` },
      primaryGap: topGap
        ? { label: topGap.title, detail: topGap.summary }
        : { label: "No critical gaps", detail: "Your résumé covers the role's core requirements." },
      estimatedReadiness: {
        value: estimatedReadiness,
        label: "Estimated readiness",
        detail: "Weighted blend of fit (72%) and ATS alignment (28%).",
      },
    },
    strengths,
    gaps,
    roadmap,
    resumeEdits,
    interviewPrep,
    skillsAnalysis: {
      categoryCoverage: (fit.breakdown?.dimensions ?? []).map((d) => ({
        label: d.label,
        percent: Math.round(d.rawScore * 100),
      })),
      coveragePercent,
      matchedCount: matchedReq.length,
      requiredCount,
    },
    applicationChecklist,
    targetRoleContext: {
      title: roleContext.title,
      meta: roleMeta,
      keyExpectations,
    },
    evidenceReview: {
      validatedSignals: matchedReq.map(skillLabel),
      detectedGaps: gaps.slice(0, 8).map((g) => g.title),
      limitations: LIMITATIONS,
    },
  };

  return {
    score,
    atsScore: ats,
    verdict,
    breakdown,
    generatedAt,
    scoringVersion: LOCAL_ENGINE_VERSION,
    parserVersion: profile.version,
    reportSource: "deterministic",
    roleContext: roleContextOut,
    intelligence,
    fitInsights,
  };
}
