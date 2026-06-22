// Weighted rubric scoring engine. Turns the matching engine's output (M9-S4) into
// a transparent, weighted score. Each dimension scores in [0,1]; dimensions the
// job doesn't exercise get a neutral baseline (the candidate isn't penalized for
// what the role doesn't test). The base score is the weighted sum (weights total
// 100); a role-relevance multiplier is applied by the caller so an off-domain
// résumé lands near zero.
//
// M14-S1: the rubric is the 6-dimension Job Match model (technical stack, seniority
// & scope, architecture, stakeholder fit, business orientation, communication &
// multiplier) that backs the Job Match Report. Each dimension is a composite of the
// underlying signal scorers (kept below as building blocks); the weights mirror the
// report contract's per-dimension maxima (20/15/15/20/15/15).

import {
  type MatchClassification,
  type RubricDimensionScore,
  type ScoreBreakdown,
} from "@career-intelligence/fit-scoring";
import { requirementImportanceWeight, skillMeta } from "@career-intelligence/job-description-normalization";

import type { ResumeEvidence } from "../evidence";
import type { EvidenceMatchResult, SkillMatch as RubricSkillMatch } from "../match/matchEvidence";

export interface RubricResumeInput {
  evidence: ResumeEvidence[];
  /** All résumé skill ids. */
  skills: Set<string>;
  seniorityLevel: string | null;
  parseConfidence: number;
}

export interface RubricJobInput {
  /** Job requirement texts classified as responsibilities (for ownership signal). */
  responsibilities: string[];
  /** Whether the job lists any enriched skills at all. */
  hasSkills: boolean;
}

export interface ScoreRubricInput {
  matches: EvidenceMatchResult;
  resume: RubricResumeInput;
  job: RubricJobInput;
}

interface Dimension {
  id: string;
  label: string;
  weight: number;
  score: (input: ScoreRubricInput) => number;
}

const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

// Neutral baselines for dimensions a job doesn't exercise. A job that never tests
// "security" shouldn't drag an otherwise-strong candidate down — but it shouldn't
// hand out full marks either.
const NEUTRAL = 0.8;
const RESUME_BONUS = 0.85; // job doesn't test it, but the résumé shows it
const ADJ_DISCOUNT = 0.65; // adjacent-skill credit is worth less than exact

// Per-skill match quality in [0,1]: exact vs adjacent, scaled by how strong and
// recent the backing evidence is (skills-list evidence ≈ strength 1).
function skillQuality(m: RubricSkillMatch): number {
  if (m.matchType === "missing") return 0;
  const base = m.matchType === "exact" ? 1 : m.credit * ADJ_DISCOUNT;
  const strength = m.evidenceStrength > 0 ? m.evidenceStrength : 1;
  const evidenceMult = 0.6 + 0.4 * (strength / 5);
  const recencyMult = 0.7 + 0.3 * m.recency;
  return clamp(base * evidenceMult * recencyMult);
}

function isArchSkill(skillId: string): boolean {
  const meta = skillMeta(skillId);
  if (!meta) return false;
  if (meta.category === "architecture" || meta.category === "messaging") return true;
  return meta.contexts.some((c) =>
    ["distributed_systems", "system_design", "scalability", "event_driven", "async_orchestration", "systems"].includes(c),
  );
}

function isOpsSkill(skillId: string): boolean {
  const meta = skillMeta(skillId);
  if (!meta) return false;
  if (meta.category === "devops" || meta.category === "observability") return true;
  return meta.contexts.some((c) => ["infrastructure", "ci_cd", "iac", "automation", "caching"].includes(c));
}

function isSecuritySkill(skillId: string): boolean {
  return skillMeta(skillId)?.category === "security";
}

function isMlSkill(skillId: string): boolean {
  return skillMeta(skillId)?.category === "ml";
}

function resumeHas(skills: Set<string>, pred: (id: string) => boolean): boolean {
  for (const s of skills) if (pred(s)) return true;
  return false;
}

function hasSignal(evidence: ResumeEvidence[], id: string): boolean {
  return evidence.some((e) => e.senioritySignals.includes(id));
}

// ---- Dimension scorers ----------------------------------------------------

function scoreCoreTechnical(input: ScoreRubricInput): number {
  const skills = input.matches.skills;
  if (skills.length === 0) return 1; // job lists no skills → can't penalize
  let tw = 0;
  let mw = 0;
  for (const m of skills) {
    const iw = requirementImportanceWeight(m.importance);
    tw += iw;
    mw += iw * skillQuality(m);
  }
  return tw > 0 ? clamp(mw / tw) : 1;
}

function scoreArchitecture(input: ScoreRubricInput): number {
  const arch = input.matches.skills.filter((m) => isArchSkill(m.skillId));
  if (arch.length > 0) return clamp(avg(arch.map(skillQuality)));
  const resumeArch = hasSignal(input.resume.evidence, "architecture") || resumeHas(input.resume.skills, isArchSkill);
  return resumeArch ? RESUME_BONUS : NEUTRAL;
}

function scoreDomainContext(input: ScoreRubricInput): number {
  const domains = input.matches.domains;
  if (domains.length > 0) return clamp(avg(domains.map((d) => d.credit)));
  return input.matches.resumeDomains.length > 0 ? RESUME_BONUS : NEUTRAL;
}

function scoreSeniority(input: ScoreRubricInput): number {
  return input.matches.seniority.fit ?? NEUTRAL;
}

function scoreProductionReliability(input: ScoreRubricInput): number {
  const ops = input.matches.skills.filter((m) => isOpsSkill(m.skillId));
  if (ops.length > 0) return clamp(avg(ops.map(skillQuality)));
  return resumeHas(input.resume.skills, isOpsSkill) ? RESUME_BONUS : NEUTRAL;
}

function scoreSecurityCompliance(input: ScoreRubricInput): number {
  const sec = input.matches.skills.filter((m) => isSecuritySkill(m.skillId));
  const secDomains = input.matches.domains.filter((d) => ["identity_security", "compliance", "fintech"].includes(d.domainId));
  if (sec.length > 0 || secDomains.length > 0) {
    return clamp(avg([...sec.map(skillQuality), ...secDomains.map((d) => d.credit)]));
  }
  return resumeHas(input.resume.skills, isSecuritySkill) ? RESUME_BONUS : NEUTRAL;
}

const OWNERSHIP_RE = /\b(owned|own|end[\s-]?to[\s-]?end|stakeholder|customer|product outcomes?|operator)\b/i;

function bestOwnershipStrength(evidence: ResumeEvidence[]): number {
  let best = 0;
  for (const e of evidence) {
    const owns =
      e.senioritySignals.includes("ownership") ||
      e.senioritySignals.includes("cross_functional") ||
      OWNERSHIP_RE.test(e.text);
    if (owns && e.evidenceStrength > best) best = e.evidenceStrength;
  }
  return best;
}

function scoreProductOwnership(input: ScoreRubricInput): number {
  const jobNeeds = input.job.responsibilities.some((r) =>
    /\b(own|partner|collaborate|product|customer|stakeholder|ambiguous|cross[\s-]?functional)\b/i.test(r),
  );
  const strength = bestOwnershipStrength(input.resume.evidence);
  // Stakeholder fit is a headline dimension (weight 20). When the role doesn't
  // express ownership/stakeholder needs, follow the rubric's "don't penalize an
  // untested dimension" rule and use the neutral baseline rather than a floor.
  if (!jobNeeds) return strength > 0 ? RESUME_BONUS : NEUTRAL;
  return strength > 0 ? clamp(strength / 5 + 0.3) : 0.3;
}

function scoreLeadership(input: ScoreRubricInput): number {
  const lead = hasSignal(input.resume.evidence, "mentorship") || hasSignal(input.resume.evidence, "cross_functional");
  const required = input.matches.seniority.requiredLevel;
  const needsLeadership = required != null && ["lead", "staff", "principal", "exec"].includes(required);
  if (needsLeadership) return lead ? 0.9 : 0.45;
  return lead ? RESUME_BONUS : NEUTRAL;
}

function scoreAiAdaptability(input: ScoreRubricInput): number {
  const ml = input.matches.skills.filter((m) => isMlSkill(m.skillId));
  if (ml.length > 0) return clamp(avg(ml.map(skillQuality)));
  return resumeHas(input.resume.skills, isMlSkill) ? RESUME_BONUS : NEUTRAL;
}

function scoreEvidenceQuality(input: ScoreRubricInput): number {
  const exp = input.resume.evidence.filter((e) => e.source === "experience");
  const top = exp
    .map((e) => e.evidenceStrength)
    .sort((a, b) => b - a)
    .slice(0, 5);
  const avgStrength = top.length > 0 ? avg(top) / 5 : 0.3;
  return clamp(0.5 * avgStrength + 0.5 * input.resume.parseConfidence);
}

// ---- Composite dimensions (the 6-dimension Job Match model) ----------------
// Each of the six report dimensions is a blend of the signal scorers above, so no
// signal is lost in the move from 10 → 6; the blend weights keep the dominant
// signal in charge (e.g. core technical skills drive Technical Stack).

function scoreTechnicalStack(input: ScoreRubricInput): number {
  return clamp(0.75 * scoreCoreTechnical(input) + 0.25 * scoreProductionReliability(input));
}
function scoreSeniorityScope(input: ScoreRubricInput): number {
  return clamp(scoreSeniority(input));
}
function scoreArchitectureDepth(input: ScoreRubricInput): number {
  return clamp(0.7 * scoreArchitecture(input) + 0.3 * scoreProductionReliability(input));
}
function scoreStakeholderFit(input: ScoreRubricInput): number {
  return clamp(scoreProductOwnership(input));
}
function scoreBusinessOrientation(input: ScoreRubricInput): number {
  return clamp(0.7 * scoreDomainContext(input) + 0.3 * scoreSecurityCompliance(input));
}
function scoreMultiplierCommunication(input: ScoreRubricInput): number {
  return clamp(
    0.5 * scoreLeadership(input) + 0.25 * scoreAiAdaptability(input) + 0.25 * scoreEvidenceQuality(input),
  );
}

// Dimension ids match the report contract's `breakdown` keys; weights are the
// contract's per-dimension maxima and total 100.
export const DEFAULT_SOFTWARE_ENGINEERING_RUBRIC: Dimension[] = [
  { id: "technicalStack", label: "Technical Stack", weight: 20, score: scoreTechnicalStack },
  { id: "seniorityScope", label: "Seniority & Scope", weight: 15, score: scoreSeniorityScope },
  { id: "architecture", label: "Architecture & Systems", weight: 15, score: scoreArchitectureDepth },
  { id: "stakeholderFit", label: "Stakeholder Fit", weight: 20, score: scoreStakeholderFit },
  { id: "businessOrientation", label: "Business Orientation", weight: 15, score: scoreBusinessOrientation },
  { id: "multiplierCommunication", label: "Communication & Multiplier", weight: 15, score: scoreMultiplierCommunication },
];

/** Coarse classification from a 0–100 score (spec §20). */
export function classifyScore(score: number): MatchClassification {
  if (score >= 90) return "excellent_match";
  if (score >= 80) return "strong_match";
  if (score >= 70) return "good_match";
  if (score >= 60) return "moderate_match";
  if (score >= 50) return "weak_match";
  return "poor_match";
}

/**
 * Score the 10-dimension rubric. Returns the dimension breakdown and the base
 * score (0–100, pre role-relevance). `roleRelevance` is recorded on the breakdown
 * but applied to the final overall score by the caller.
 */
export function scoreRubric(input: ScoreRubricInput, roleRelevance = 1): ScoreBreakdown {
  const dimensions: RubricDimensionScore[] = DEFAULT_SOFTWARE_ENGINEERING_RUBRIC.map((dim) => {
    const rawScore = clamp(dim.score(input));
    return { id: dim.id, label: dim.label, weight: dim.weight, rawScore, weightedScore: rawScore * dim.weight };
  });
  const totalWeight = DEFAULT_SOFTWARE_ENGINEERING_RUBRIC.reduce((s, d) => s + d.weight, 0);
  const total = dimensions.reduce((s, d) => s + d.weightedScore, 0);
  const baseScore = Math.round((total / totalWeight) * 100);
  return {
    dimensions,
    baseScore,
    classification: classifyScore(Math.round(baseScore * roleRelevance)),
    roleRelevance,
  };
}

/** Scoring confidence (spec §19): lower when parse quality or signal is thin. */
export function scoreConfidence(input: ScoreRubricInput): number {
  let c = 0.95;
  if (input.resume.parseConfidence < 0.7) c -= 0.15;
  if (input.matches.skills.length < 3) c -= 0.1;
  if (input.resume.evidence.length < 6) c -= 0.1;
  return Math.round(clamp(c, 0.3, 0.98) * 100) / 100;
}
