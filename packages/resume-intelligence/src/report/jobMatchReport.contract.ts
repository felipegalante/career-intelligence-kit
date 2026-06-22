import { z } from "zod";

// Job Match Report contract. A structured, deterministic report evaluating the fit
// between a resume and a job posting, built entirely from the in-house engine's
// output + job metadata (no LLM, no external services). `fitInsights` is the primary
// UI contract; the top-level fields are source/headline data. Extracted verbatim from
// Intelligent Job Board's `@ijb/contracts` report module (the report-generation part
// only — the product-side report-archive/persistence schemas are intentionally omitted,
// as persistence belongs to products, not to this public package).

// ---- shared ---------------------------------------------------------------

export const reportImpactSchema = z.enum(["high", "medium", "low"]);
export type ReportImpact = z.infer<typeof reportImpactSchema>;

export const workplaceTypeSchema = z.enum(["onsite", "hybrid", "remote", "unknown"]);

// The six canonical rubric dimensions, normalized to 0–100 for display.
export const reportBreakdownSchema = z.object({
  technicalStack: z.number(),
  seniorityScope: z.number(),
  architecture: z.number(),
  stakeholderFit: z.number(),
  businessOrientation: z.number(),
  multiplierCommunication: z.number(),
});
export type ReportBreakdown = z.infer<typeof reportBreakdownSchema>;

// ---- role context ---------------------------------------------------------

export const reportCompensationSchema = z.object({
  currency: z.string().nullable().optional(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  period: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const reportRoleContextSchema = z.object({
  companyName: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  locations: z.array(z.string()),
  workplaceType: workplaceTypeSchema.optional(),
  employmentType: z.string().nullable().optional(),
  compensation: reportCompensationSchema.nullable().optional(),
  sourcePlatform: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
});
export type ReportRoleContext = z.infer<typeof reportRoleContextSchema>;

// ---- intelligence (report-local, derived from resume/job/rubric) -----------

export const reportIntelligenceSectionSchema = z.object({
  available: z.boolean(),
  summary: z.string(),
  facts: z.array(z.string()),
});

export const reportSkillCoverageSchema = z.object({
  summary: z.string(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  resumeOnlySkills: z.array(z.string()),
  matchedCount: z.number(),
  requiredCount: z.number(),
});

export const reportApplicationQuestionSignalsSchema = z.object({
  available: z.boolean(),
  signals: z.array(z.object({ category: z.string(), count: z.number() })),
  note: z.string().optional(),
});

export const reportIntelligenceSchema = z.object({
  companyOverview: reportIntelligenceSectionSchema,
  roleAnalysis: reportIntelligenceSectionSchema,
  skillsCoverage: reportSkillCoverageSchema,
  compensationLogistics: reportIntelligenceSectionSchema,
  applicationQuestionSignals: reportApplicationQuestionSignalsSchema,
  limitations: z.array(z.string()),
});

// ---- fitInsights (primary UI contract) ------------------------------------

export const reportScoreCardSchema = z.object({
  value: z.number(),
  label: z.string(),
  detail: z.string(),
});

export const reportFitInsightsSchema = z.object({
  fitSummary: z.object({
    headline: z.string(),
    narrative: z.string(),
    generatedAt: z.string(),
    roleTitle: z.string().nullable().optional(),
    workplaceType: z.string().nullable().optional(),
    locations: z.array(z.string()),
    bestNextMove: z.string(),
  }),
  snapshot: z.object({
    skillsMatched: z.string(),
    topStrengths: z.string(),
    missingEvidence: z.string(),
    focusNext: z.string(),
    roleContext: z.string(),
    confidence: z.string(),
  }),
  scoreCards: z.object({
    fitScore: reportScoreCardSchema,
    atsScore: reportScoreCardSchema,
    matchLevel: z.object({ label: z.string(), detail: z.string() }),
    primaryGap: z.object({ label: z.string(), detail: z.string() }),
    estimatedReadiness: reportScoreCardSchema,
  }),
  strengths: z.array(
    z.object({ title: z.string(), summary: z.string(), confidence: z.number(), level: z.string() }),
  ),
  gaps: z.array(
    z.object({ title: z.string(), summary: z.string(), tip: z.string(), impact: reportImpactSchema }),
  ),
  roadmap: z.array(
    z.object({
      title: z.string(),
      impact: z.string(),
      tone: z.enum(["danger", "warn", "good"]),
      items: z.array(z.string()),
      focus: z.string(),
    }),
  ),
  resumeEdits: z.array(z.object({ title: z.string(), example: z.string(), priority: z.number() })),
  interviewPrep: z.array(z.object({ topic: z.string(), prompt: z.string() })),
  skillsAnalysis: z.object({
    categoryCoverage: z.array(z.object({ label: z.string(), percent: z.number() })),
    coveragePercent: z.number(),
    matchedCount: z.number(),
    requiredCount: z.number(),
  }),
  applicationChecklist: z.array(
    z.object({ title: z.string(), detail: z.string(), done: z.boolean() }),
  ),
  targetRoleContext: z.object({
    title: z.string(),
    meta: z.array(z.string()),
    keyExpectations: z.array(z.string()),
  }),
  evidenceReview: z.object({
    validatedSignals: z.array(z.string()),
    detectedGaps: z.array(z.string()),
    limitations: z.array(z.string()),
  }),
});
export type ReportFitInsights = z.infer<typeof reportFitInsightsSchema>;

// ---- top-level report ------------------------------------------------------

export const jobMatchReportSchema = z.object({
  score: z.number(),
  atsScore: z.number(),
  verdict: z.string(),
  breakdown: reportBreakdownSchema,
  generatedAt: z.string(),
  scoringVersion: z.string(),
  parserVersion: z.string(),
  reportSource: z.literal("deterministic"),
  roleContext: reportRoleContextSchema,
  intelligence: reportIntelligenceSchema,
  fitInsights: reportFitInsightsSchema,
});
export type JobMatchReport = z.infer<typeof jobMatchReportSchema>;
