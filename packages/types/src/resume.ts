// Public résumé DTOs. Provider-neutral shapes for résumé input and the parsed
// result. The deterministic `resume-intelligence` package produces richer internal
// structures; the local engine maps those down to these stable public types.

import { type RoleFamily, type Seniority } from "./enums";

export interface ResumeInput {
  /** Raw résumé text. */
  text: string;
  /** Optional source filename (used only for logging/UX, never persisted here). */
  filename?: string;
  /** Optional locale hint. */
  locale?: string;
}

export type ResumeSectionName =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "other";

export interface ResumeSection {
  name: ResumeSectionName;
  heading: string;
  lines: string[];
}

export interface ResumeSkill {
  /** Canonical skill id, when matched against the skill dictionary. */
  id?: string;
  /** As written in the résumé. */
  label: string;
  /** Confidence the skill is genuinely present (0–1). */
  confidence: number;
}

export interface ResumeExperience {
  title: string;
  normalizedTitle?: string;
  roleFamily?: RoleFamily | null;
  seniority?: Seniority | null;
  organization?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  highlights: string[];
}

export interface ResumeEvidence {
  /** Short, human-readable claim/signal extracted from the résumé. */
  claim: string;
  /** Skill/domain ids this evidence supports. */
  supports: string[];
  /** Strength of the evidence (0–1). */
  strength: number;
  /** Where in the résumé this came from. */
  source: ResumeSectionName;
}

export interface ParsedResume {
  sections: ResumeSection[];
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  evidence: ResumeEvidence[];
  inferredSeniority?: Seniority | null;
  inferredRoleFamily?: RoleFamily | null;
  parserVersion: string;
}
