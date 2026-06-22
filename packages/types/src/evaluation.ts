// Public end-to-end evaluation + Resume ATS report DTOs. These are the high-level
// results returned by `evaluate` and the Resume ATS report endpoint.

import { type JobDescriptionInput, type NormalizedJobProfile } from "./job";
import { type IntelligenceResultMetadata } from "./metadata";
import { type ParsedResume, type ResumeInput } from "./resume";
import { type FitScoreResult } from "./scoring";

export interface CareerEvaluationInput {
  resume: ResumeInput;
  job: JobDescriptionInput;
  /** Optional correlation id echoed into result metadata. */
  requestId?: string;
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
  confidence: number;
}

export interface CareerEvaluationResult {
  parsedResume: ParsedResume;
  jobProfile: NormalizedJobProfile;
  fit: FitScoreResult;
  strengths: EvaluationStrength[];
  gaps: EvaluationGap[];
  metadata: IntelligenceResultMetadata;
}

export interface ResumeAtsReportSection {
  available: boolean;
  summary: string;
  facts: string[];
}

export interface ResumeAtsReportResult {
  fitScore: number;
  atsScore: number;
  readinessScore: number;
  verdict: string;
  headline: string;
  narrative: string;
  strengths: EvaluationStrength[];
  gaps: EvaluationGap[];
  skillsCoverage: {
    matchedSkills: string[];
    missingSkills: string[];
    resumeOnlySkills: string[];
    matchedCount: number;
    requiredCount: number;
  };
  roadmap: string[];
  interviewPrep: string[];
  limitations: string[];
  metadata: IntelligenceResultMetadata;
}
