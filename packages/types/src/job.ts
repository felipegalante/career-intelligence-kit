// Public job-description DTOs. The deterministic `job-description-normalization`
// package turns a job description into a normalized scoring profile; these are the
// provider-neutral shapes exposed across the contract.

import { type RoleFamily, type Seniority } from "./enums";

export interface JobDescriptionInput {
  /** Raw job-description text. */
  text: string;
  /** Optional job title, if known separately from the body. */
  title?: string;
  /** Optional company name (context only). */
  company?: string;
  /** Optional locale hint. */
  locale?: string;
}

export type RequirementImportanceLevel = "required" | "preferred" | "implied";

export interface RequiredSkill {
  /** Canonical skill id. */
  id: string;
  label: string;
  importance: RequirementImportanceLevel;
  /** Relative weight used during scoring (0–1). */
  weight: number;
}

export interface ResponsibilitySignal {
  text: string;
  /** Action verbs / domains the responsibility implies. */
  signals: string[];
  weight: number;
}

export interface SenioritySignal {
  level: Seniority;
  /** Phrase that produced the signal. */
  evidence: string;
  weight: number;
}

export interface RoleFamilySignal {
  family: RoleFamily;
  evidence: string;
  weight: number;
}

export interface NormalizedJobProfile {
  title?: string | null;
  normalizedTitle?: string | null;
  roleFamily?: RoleFamily | null;
  seniority?: Seniority | null;
  requiredSkills: RequiredSkill[];
  responsibilities: ResponsibilitySignal[];
  senioritySignals: SenioritySignal[];
  roleFamilySignals: RoleFamilySignal[];
  /** Explicit eligibility gates (years, work authorization, etc.). */
  gates: string[];
  normalizerVersion: string;
}
