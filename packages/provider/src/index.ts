// @career-intelligence/provider — the stable provider abstraction every career-
// intelligence implementation satisfies: the deterministic local engine
// (`@career-intelligence/local-engine`) and the remote Rubric Compiler client
// (`@career-intelligence/rubric-compiler-client`). Carries no I/O of its own.

import {
  type CareerEvaluationInput,
  type CareerEvaluationResult,
  type CareerIntelligenceHealth,
  type CareerIntelligenceProviderDescriptor,
  type FitScoreResult,
  type NormalizeJobDescriptionInput,
  type NormalizeJobDescriptionResult,
  type ParseResumeInput,
  type ParseResumeResult,
  type ResumeAtsReportResult,
  type ScoreFitInput,
} from "@career-intelligence/types";

export interface CareerIntelligenceProvider {
  /** Parse raw résumé text into a structured, provider-neutral profile. */
  parseResume(input: ParseResumeInput): Promise<ParseResumeResult>;
  /** Normalize a job description into a scoring profile. */
  normalizeJobDescription(
    input: NormalizeJobDescriptionInput,
  ): Promise<NormalizeJobDescriptionResult>;
  /** Score résumé↔job fit. */
  scoreFit(input: ScoreFitInput): Promise<FitScoreResult>;
  /** Full evaluation: parsed résumé + job profile + fit + strengths/gaps. */
  evaluate(input: CareerEvaluationInput): Promise<CareerEvaluationResult>;
  /** Resume ATS report: the user-facing report shape. */
  generateResumeAtsReport(input: CareerEvaluationInput): Promise<ResumeAtsReportResult>;
  /** Liveness/health for the provider. */
  health(): Promise<CareerIntelligenceHealth>;
  /** Synchronous self-description (id, mode, versions, capabilities). */
  describe(): CareerIntelligenceProviderDescriptor;
}
