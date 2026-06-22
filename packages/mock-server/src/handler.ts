// Framework-agnostic mock Career Intelligence API. Backed by the deterministic
// local engine so it returns valid, contract-shaped responses for arbitrary inputs
// (not just static fixtures), which makes it useful for contract tests and demos.

import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";
import {
  type CareerEvaluationInput,
  type NormalizeJobDescriptionInput,
  type ParseResumeInput,
  type ScoreFitInput,
} from "@career-intelligence/types";

export interface MockResponse {
  status: number;
  json: unknown;
}

export interface MockHandlerOptions {
  /** Override the backing provider (defaults to the deterministic local engine). */
  provider?: CareerIntelligenceProvider;
}

export interface MockHandler {
  handle(method: string, path: string, body?: unknown): Promise<MockResponse>;
}

export function createMockHandler(options: MockHandlerOptions = {}): MockHandler {
  const provider = options.provider ?? createLocalCareerIntelligenceProvider();

  async function handle(method: string, path: string, body?: unknown): Promise<MockResponse> {
    const route = `${method.toUpperCase()} ${path.split("?")[0]}`;
    try {
      switch (route) {
        case "GET /v1/health":
          return { status: 200, json: await provider.health() };
        case "POST /v1/resumes/parse":
          return { status: 200, json: await provider.parseResume(body as ParseResumeInput) };
        case "POST /v1/jobs/normalize":
          return {
            status: 200,
            json: await provider.normalizeJobDescription(body as NormalizeJobDescriptionInput),
          };
        case "POST /v1/fit-score":
          return { status: 200, json: await provider.scoreFit(body as ScoreFitInput) };
        case "POST /v1/evaluations":
          return { status: 200, json: await provider.evaluate(body as CareerEvaluationInput) };
        case "POST /v1/reports/resume-ats":
          return {
            status: 200,
            json: await provider.generateResumeAtsReport(body as CareerEvaluationInput),
          };
        default:
          return { status: 404, json: { error: "not_found", route } };
      }
    } catch (error) {
      return { status: 400, json: { error: "bad_request", message: (error as Error).message } };
    }
  }

  return { handle };
}
