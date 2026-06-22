// @career-intelligence/rubric-compiler-client — an HTTP `CareerIntelligenceProvider`
// pointed at the private Rubric Compiler service, which implements the public Career
// Intelligence v1 contract. It is the "remote primary" provider; pair it with
// `@career-intelligence/local-engine` as the deterministic fallback.

import { createCareerIntelligenceClient, type HttpTransportOptions } from "@career-intelligence/client";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";

export const RUBRIC_COMPILER_PROVIDER_ID = "rubric-compiler";

export type RubricCompilerClientOptions = HttpTransportOptions;

/**
 * Create a provider backed by the private Rubric Compiler. Supports `baseUrl`,
 * `apiKey`, `timeoutMs`, and `retries`; `requestId` is passed per call.
 */
export function createRubricCompilerProvider(
  options: RubricCompilerClientOptions,
): CareerIntelligenceProvider {
  return createCareerIntelligenceClient({
    ...options,
    providerId: RUBRIC_COMPILER_PROVIDER_ID,
  });
}
