// Result provenance + provider self-description. Every result returned by a
// CareerIntelligenceProvider (local or remote) carries `IntelligenceResultMetadata`
// so consumers can tell which provider produced it, whether it is degraded, the
// engine version, and any warnings (ecosystem rule: provider/degraded/version/warnings).

export type CareerIntelligenceMode = "local" | "remote";

export interface IntelligenceResultMetadata {
  /** Stable provider identifier, e.g. "local-engine" or "rubric-compiler". */
  provider: string;
  /** Whether the result came from the local fallback or a remote service. */
  mode: CareerIntelligenceMode;
  /** True when the result is degraded (e.g. remote failed and fallback was used). */
  degraded: boolean;
  /** Engine/algorithm version that produced the result. */
  engineVersion: string;
  /** Optional configuration/weights version. */
  configVersion?: string;
  /** Optional scoring-mode label (e.g. "deterministic"). */
  scoringMode?: string;
  /** ISO-8601 timestamp the result was generated. */
  generatedAt: string;
  /** Correlation id, echoed from the request when provided. */
  requestId?: string;
  /** Non-fatal warnings about the result (missing inputs, low confidence, etc.). */
  warnings: string[];
}

export interface CareerIntelligenceError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface CareerIntelligenceHealth {
  status: "ok" | "degraded" | "unavailable";
  provider: string;
  engineVersion: string;
  /** True when only deterministic local logic is available. */
  localFallbackOnly: boolean;
}

export interface CareerIntelligenceProviderDescriptor {
  /** Stable provider identifier. */
  id: string;
  mode: CareerIntelligenceMode;
  engineVersion: string;
  configVersion?: string;
  /** Capabilities this provider supports. */
  capabilities: {
    parseResume: boolean;
    normalizeJobDescription: boolean;
    scoreFit: boolean;
    evaluate: boolean;
    resumeAtsReport: boolean;
  };
}
