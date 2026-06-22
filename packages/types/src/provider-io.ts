// Input/result envelopes for the CareerIntelligenceProvider methods. Each result
// carries `IntelligenceResultMetadata` so provenance flows through every call.

import { type JobDescriptionInput, type NormalizedJobProfile } from "./job";
import { type IntelligenceResultMetadata } from "./metadata";
import { type ParsedResume, type ResumeInput } from "./resume";

export interface ParseResumeInput {
  resume: ResumeInput;
  requestId?: string;
}

export interface ParseResumeResult {
  resume: ParsedResume;
  metadata: IntelligenceResultMetadata;
}

export interface NormalizeJobDescriptionInput {
  job: JobDescriptionInput;
  requestId?: string;
}

export interface NormalizeJobDescriptionResult {
  job: NormalizedJobProfile;
  metadata: IntelligenceResultMetadata;
}

export interface ScoreFitInput {
  resume: ResumeInput;
  job: JobDescriptionInput;
  requestId?: string;
}
