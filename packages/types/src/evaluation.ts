// Public end-to-end evaluation + Resume ATS report DTOs. These are the high-level
// results returned by `evaluate` and the Resume ATS report endpoint.
//
// The report shape is the reconciled v1 contract: the flat headline/strengths/gaps
// fields moved into the structured `fitInsights` block, and the report carries the
// optional company/domain context the Rubric Compiler resolves (null/degraded when
// no company intelligence is available — "unknown is valid").

import {
  type ReportCalibration,
  type ReportCompanyContext,
  type ReportCompanyIntel,
  type ReportMarketIntel,
} from "./company-context";
import { type JobDescriptionInput, type NormalizedJobProfile } from "./job";
import { type IntelligenceResultMetadata } from "./metadata";
import { type ParsedResume, type ResumeInput } from "./resume";
import { type FitMatchLevel, type FitScoreResult } from "./scoring";

export interface CareerEvaluationInput {
  resume: ResumeInput;
  job: JobDescriptionInput;
  /** Optional company/domain context inputs forwarded to company intelligence. */
  companyContext?: EvaluationCompanyContextInput;
  /** Optional correlation id echoed into result metadata. */
  requestId?: string;
}

/** Company/domain resolution hints for providers that integrate company intelligence. */
export interface EvaluationCompanyContextInput {
  companyName?: string;
  companyWebsite?: string;
  companyDomain?: string;
  countryOrRegion?: string;
  jobTitle?: string;
  jobDescriptionText?: string;
  /** A caller-supplied, pre-resolved application context (short-circuits remote calls). */
  preResolvedCompanyContext?: Record<string, unknown>;
  companyContextMode?: "remote" | "provided" | "disabled";
}

export interface EvaluationGap {
  title: string;
  summary: string;
  tip: string;
  impact: "high" | "medium" | "low";
}

export interface EvaluationStrength {
  title: string;
  summary: string;
  /** Confidence in the strength signal, 0–100. */
  confidence: number;
  /** Optional qualitative label (e.g. "Strong", "Moderate"). */
  level?: string;
}

// ---- fit insights (the structured report body) -----------------------------

export interface ReportFitSummary {
  headline: string;
  narrative: string;
  /** ISO-8601 timestamp the insights were generated. */
  generatedAt: string;
  roleTitle?: string | null;
  workplaceType?: string | null;
  locations: string[];
  bestNextMove: string;
}

export interface ReportSnapshot {
  skillsMatched: string;
  topStrengths: string;
  missingEvidence: string;
  focusNext: string;
  roleContext: string;
  confidence: string;
}

export interface ReportScoreCard {
  /** Numeric value when the card is score-backed. */
  value?: number;
  label: string;
  detail: string;
}

export interface ReportScoreCards {
  fitScore: ReportScoreCard;
  atsScore: ReportScoreCard;
  matchLevel: ReportScoreCard;
  primaryGap: ReportScoreCard;
  estimatedReadiness: ReportScoreCard;
}

export interface ReportRoadmapStage {
  title: string;
  impact: string;
  tone: string;
  items: string[];
  focus: string;
}

export interface ReportResumeEdit {
  title: string;
  example: string;
  priority: number;
}

export interface ReportInterviewPrompt {
  topic: string;
  prompt: string;
}

export interface ReportCategoryCoverage {
  label: string;
  percent: number;
}

export interface ReportSkillsAnalysis {
  categoryCoverage: ReportCategoryCoverage[];
  coveragePercent: number;
  matchedCount: number;
  requiredCount: number;
  matchedSkills: string[];
  missingSkills: string[];
  resumeOnlySkills: string[];
}

export interface ReportChecklistItem {
  title: string;
  detail: string;
  done: boolean;
}

export interface ReportTargetRoleContext {
  title: string;
  meta: string[];
  keyExpectations: string[];
}

export interface ReportEvidenceReview {
  validatedSignals: string[];
  detectedGaps: string[];
  /** Honest limitations of the analysis (parser gaps, missing inputs, no LLM, ...). */
  limitations: string[];
}

/** The structured, render-ready body of a Resume ATS report. */
export interface ResumeAtsFitInsights {
  fitSummary: ReportFitSummary;
  snapshot: ReportSnapshot;
  scoreCards: ReportScoreCards;
  strengths: EvaluationStrength[];
  gaps: EvaluationGap[];
  roadmap: ReportRoadmapStage[];
  resumeEdits: ReportResumeEdit[];
  interviewPrep: ReportInterviewPrompt[];
  skillsAnalysis: ReportSkillsAnalysis;
  applicationChecklist: ReportChecklistItem[];
  targetRoleContext: ReportTargetRoleContext;
  evidenceReview: ReportEvidenceReview;
}

/** Rendered report artifacts (e.g. a Markdown export). */
export interface ReportArtifacts {
  markdown?: string;
  [key: string]: unknown;
}

// ---- top-level results ------------------------------------------------------

export interface CareerEvaluationResult {
  parsedResume: ParsedResume;
  jobProfile: NormalizedJobProfile;
  fit: FitScoreResult;
  strengths: EvaluationStrength[];
  gaps: EvaluationGap[];
  /** Engine-native evidence graph (engine-specific shape). */
  evidenceGraph?: Record<string, unknown>;
  fitInsights?: ResumeAtsFitInsights;
  companyIntel?: ReportCompanyIntel;
  marketIntel?: ReportMarketIntel;
  calibration?: ReportCalibration;
  companyContext?: ReportCompanyContext;
  metadata: IntelligenceResultMetadata;
}

export interface ResumeAtsReportResult {
  fitScore: number;
  atsScore: number;
  readinessScore: number;
  matchLevel: FitMatchLevel;
  verdict: string;
  /**
   * Engine-native summary envelope (engine-specific fields, may duplicate
   * `fitInsights`). Products should render from `fitInsights`.
   */
  summary?: Record<string, unknown>;
  fitInsights: ResumeAtsFitInsights;
  companyIntel: ReportCompanyIntel;
  marketIntel: ReportMarketIntel;
  calibration: ReportCalibration;
  companyContext: ReportCompanyContext;
  artifacts?: ReportArtifacts;
  metadata: IntelligenceResultMetadata;
}
