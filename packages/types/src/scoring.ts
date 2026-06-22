// Public fit-scoring DTOs.

import { type IntelligenceResultMetadata } from "./metadata";

export type FitMatchLevel = "strong" | "good" | "fair" | "weak";

export interface ScoreDimension {
  /** Dimension id, e.g. "technicalStack", "seniorityScope". */
  id: string;
  label: string;
  /** Normalized 0–100 score for this dimension. */
  score: number;
  /** Relative weight of this dimension in the overall score (0–1). */
  weight: number;
}

export interface FitSignal {
  kind: "strength" | "gap";
  /** Skill/domain/requirement id this signal relates to. */
  ref: string;
  label: string;
  detail: string;
  /** Impact on the overall fit (0–1). */
  impact: number;
}

export interface CalibrationSignal {
  /** Source of the calibration hint (e.g. "company-intelligence"). */
  source: string;
  /** Dimension id the hint adjusts. */
  dimension: string;
  /** Signed adjustment applied during scoring. */
  adjustment: number;
  rationale: string;
}

export interface FitScoreResult {
  /** Overall fit score, 0–100. */
  score: number;
  /** ATS-style keyword/coverage score, 0–100. */
  atsScore: number;
  matchLevel: FitMatchLevel;
  verdict: string;
  dimensions: ScoreDimension[];
  signals: FitSignal[];
  calibration: CalibrationSignal[];
  metadata: IntelligenceResultMetadata;
}
