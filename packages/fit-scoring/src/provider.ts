// Provider selection + the two "unavailable" providers. The selector takes the
// candidate providers as *arguments* (never imports them), so this package has
// zero provider dependencies and the local provider / rubric client can depend
// on `@ijb/fit-scoring` freely without a cycle.

import type {
  FitProviderDescriptor,
  FitScoringHealth,
  FitScoringProvider,
  FitReportResult,
  GenerateReportInput,
  ScoreBatchInput,
  ScoreBatchResult,
} from "./types";
import { FitScoringUnavailableError } from "./types";

/** Base for providers that are simply unavailable; throws on score/report. */
abstract class UnavailableProvider implements FitScoringProvider {
  protected abstract readonly providerId: string;
  protected abstract readonly detail: string;

  describe(): FitProviderDescriptor {
    return { engineVersion: "none", configVersion: "none", scoringMode: "disabled" };
  }

  health(): Promise<FitScoringHealth> {
    return Promise.resolve({
      available: false,
      provider: this.providerId,
      scoringMode: "disabled",
      detail: this.detail,
    });
  }

  scoreBatch(_input: ScoreBatchInput): Promise<ScoreBatchResult> {
    return Promise.reject(new FitScoringUnavailableError(this.providerId, this.detail));
  }

  generateReport(_input: GenerateReportInput): Promise<FitReportResult> {
    return Promise.resolve({ available: false, summary: this.detail });
  }
}

/** Returned when nothing is configured at all (no rubric, no local provider). */
export class NullFitScoringProvider extends UnavailableProvider {
  protected readonly providerId = "null";
  protected readonly detail = "No fit-scoring provider configured";
}

/**
 * Placeholder for the external rubric-compiler client. The real HTTP client
 * (API-key auth, timeout/retry/backoff, contract tests) lands in M12 once the
 * owner provides the contract; until then it reports unavailable so the rest of
 * M8 can be built and tested against the local provider.
 */
export class RubricCompilerStub extends UnavailableProvider {
  protected readonly providerId = "rubric-compiler";
  protected readonly detail = "rubric-compiler integration not implemented yet (M12)";
}

export interface SelectFitScoringProviderOptions {
  /** `RUBRIC_COMPILER_ENABLED`. */
  rubricEnabled: boolean;
  /** Result of a recent `rubricProvider.health()` check. */
  rubricHealthy?: boolean;
  rubricProvider?: FitScoringProvider;
  /** The in-house provider (M8-S2). When present, it's the fallback. */
  localProvider?: FitScoringProvider;
}

/**
 * Pick the active provider: the external rubric-compiler when it's enabled and
 * healthy, otherwise the local in-house provider, otherwise a null provider.
 * This is the §23.11 failure behaviour — resume-aware features degrade to the
 * local engine (or off) rather than erroring.
 */
export function selectFitScoringProvider(
  opts: SelectFitScoringProviderOptions,
): FitScoringProvider {
  if (opts.rubricEnabled && opts.rubricHealthy && opts.rubricProvider) {
    return opts.rubricProvider;
  }
  if (opts.localProvider) return opts.localProvider;
  return new NullFitScoringProvider();
}
