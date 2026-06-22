// @career-intelligence/client — a generic HTTP client for the Career Intelligence
// API contract (openapi/career-intelligence.v1.yaml). Implements the same
// `CareerIntelligenceProvider` interface as the local engine, so callers can swap
// remote ↔ local transparently.

import { type CareerIntelligenceProvider } from "@career-intelligence/provider";
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

import { HttpTransport, type HttpTransportOptions } from "./transport";

export {
  CareerIntelligenceHttpError,
  HttpTransport,
  type HttpTransportOptions,
} from "./transport";

export interface CareerIntelligenceClientOptions extends HttpTransportOptions {
  /** Stable id reported by `describe()`. */
  providerId?: string;
}

/**
 * Create a `CareerIntelligenceProvider` backed by an HTTP service that implements
 * the Career Intelligence v1 contract.
 */
export function createCareerIntelligenceClient(
  options: CareerIntelligenceClientOptions,
): CareerIntelligenceProvider {
  const transport = new HttpTransport(options);
  const providerId = options.providerId ?? "career-intelligence-client";

  return {
    parseResume(input: ParseResumeInput): Promise<ParseResumeResult> {
      return transport.request("POST", "/v1/resumes/parse", input, input.requestId);
    },
    normalizeJobDescription(
      input: NormalizeJobDescriptionInput,
    ): Promise<NormalizeJobDescriptionResult> {
      return transport.request("POST", "/v1/jobs/normalize", input, input.requestId);
    },
    scoreFit(input: ScoreFitInput): Promise<FitScoreResult> {
      return transport.request("POST", "/v1/fit-score", input, input.requestId);
    },
    evaluate(input: CareerEvaluationInput): Promise<CareerEvaluationResult> {
      return transport.request("POST", "/v1/evaluations", input, input.requestId);
    },
    generateResumeAtsReport(input: CareerEvaluationInput): Promise<ResumeAtsReportResult> {
      return transport.request("POST", "/v1/reports/resume-ats", input, input.requestId);
    },
    health(): Promise<CareerIntelligenceHealth> {
      return transport.request("GET", "/v1/health");
    },
    describe(): CareerIntelligenceProviderDescriptor {
      return {
        id: providerId,
        mode: "remote",
        engineVersion: "remote",
        capabilities: {
          parseResume: true,
          normalizeJobDescription: true,
          scoreFit: true,
          evaluate: true,
          resumeAtsReport: true,
        },
      };
    },
  };
}
