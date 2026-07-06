// Company/domain context blocks carried on scoring and report results. Providers
// that integrate company intelligence populate these; providers without it return
// null/degraded values — never invented data ("unknown is valid").

/**
 * Company/domain intelligence payloads originate from the company-intelligence
 * contract (`@company-intelligence/types`); they are carried opaquely here so the
 * career-intelligence scope stays dependency-free. `null` when unresolved.
 */
export type ReportCompanyIntel = Record<string, unknown> | null;
export type ReportMarketIntel = Record<string, unknown> | null;

/** A single calibration hint contributed by company intelligence. */
export interface ReportCalibrationHint {
  dimension?: string | null;
  adjustment?: number | null;
  rationale?: string;
  confidence?: unknown;
  [key: string]: unknown;
}

/**
 * How company-intelligence signals would adjust the deterministic score. The base
 * rubric score stays authoritative; the calibrated score is disclosed alongside it
 * (never silently substituted).
 */
export interface ReportCalibration {
  positiveSignals: ReportCalibrationHint[];
  negativeSignals: ReportCalibrationHint[];
  neutralSignals: ReportCalibrationHint[];
  /** Bounded net adjustment, in score points. */
  netAdjustment: number;
  baseScore: number;
  calibratedScore: number;
  /** True when real (non-degraded) company context contributed hints. */
  applied: boolean;
}

/** Honest company/domain report section: insights when available, degraded disclosure otherwise. */
export interface ReportCompanyContext {
  provider: string;
  degraded: boolean;
  preparationInsights: unknown[];
  resumeTailoringAngles: unknown[];
  warnings: string[];
}
