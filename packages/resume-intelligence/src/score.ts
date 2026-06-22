import type {
  FitGap,
  FitGateResult,
  FitRecommendation,
  FitStrength,
  JobFitResult,
  ScoreableJob,
} from "@career-intelligence/fit-scoring";
import {
  extractJobProfile,
  inferRoleFamily,
  inferSeniority,
  requirementImportanceWeight,
  type GateId,
  type JobProfile,
  type RequiredSkill,
  type RequirementImportance,
} from "@career-intelligence/job-description-normalization";

import type { EvidenceMatchResult } from "./match/matchEvidence";
import { matchEvidence } from "./match/matchEvidence";
import type { CandidateProfile } from "./parse-resume";
import { buildGapAnalysis } from "./report/buildGapAnalysis";
import { buildTailoringHints } from "./report/buildTailoringHints";
import { scoreConfidence, scoreRubric } from "./score/scoreRubric";
import { ROLE_ADJACENCY, ROLE_RELEVANCE, SENIORITY_RANK } from "./weights";

// The in-house rubric scorer (M9-S5). The fit now comes from a deterministic
// 10-dimension weighted rubric (spec §17/§18) over the matching engine's output
// (exact / adjacent / missing skills, domain overlap, seniority, gates), then
// scaled by a role-relevance multiplier so an off-domain résumé lands near zero.
// The legacy `JobFitResult` fields (matched/missing required+preferred,
// missingHardGates, explanationSummary) stay populated for the M8 worker, the
// hotness gate, search ranking, and the existing UI.

function partition(jobSkills: string[], resumeSkills: Set<string>): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of jobSkills) (resumeSkills.has(s) ? matched : missing).push(s);
  return { matched, missing };
}

const rank = (s: string | null | undefined): number => (s ? (SENIORITY_RANK[s] ?? 0) : 0);

// Deterministic ATS-style score (0–100): how explicitly the résumé names the job's
// required skills (exact keyword coverage) blended with résumé parseability. Falls
// back to the preferred tier when a job lists no required skills. Distinct from the
// rubric's match-quality score (M14-S1).
function atsScore(
  required: { matched: string[]; missing: string[] },
  preferred: { matched: string[]; missing: string[] },
  parseConfidence: number,
): number {
  const reqTotal = required.matched.length + required.missing.length;
  const prefTotal = preferred.matched.length + preferred.missing.length;
  const coverage =
    reqTotal > 0
      ? required.matched.length / reqTotal
      : prefTotal > 0
        ? preferred.matched.length / prefTotal
        : parseConfidence;
  return Math.round(100 * (0.8 * coverage + 0.2 * parseConfidence));
}

// The candidate's highest attained seniority (a brief stint at staff still counts
// toward meeting a senior bar), falling back to the current title.
function candidateSeniority(profile: CandidateProfile): string | null {
  let best: string | null = null;
  let bestRank = 0;
  for (const b of profile.roleBuckets) {
    const r = rank(b.seniority);
    if (r > bestRank) {
      bestRank = r;
      best = b.seniority;
    }
  }
  return best ?? inferSeniority(profile.titles.current ?? "") ?? null;
}

function candidateRoleFamilies(profile: CandidateProfile): Set<string> {
  const fams = new Set<string>();
  for (const b of profile.roleBuckets) if (b.roleFamily) fams.add(b.roleFamily);
  if (fams.size === 0) {
    const f = inferRoleFamily(profile.titles.current ?? profile.titles.target ?? "");
    if (f) fams.add(f);
  }
  return fams;
}

// Role-relevance multiplier. Unknown → neutral 1.0 (never penalize missing data);
// off-domain (e.g. sales résumé vs engineering role) → 0.1.
function roleRelevance(candidateFamilies: Set<string>, jobFamily: string | null): number {
  if (!jobFamily || candidateFamilies.size === 0) return ROLE_RELEVANCE.unknown;
  if (candidateFamilies.has(jobFamily)) return ROLE_RELEVANCE.same;
  const adjacent = ROLE_ADJACENCY[jobFamily] ?? [];
  for (const cf of candidateFamilies) if (adjacent.includes(cf)) return ROLE_RELEVANCE.adjacent;
  return ROLE_RELEVANCE.off;
}

// Collapse a job's tiered skills (required > preferred > inferred) to one
// importance each, keeping the strongest.
function jobRequiredSkills(job: ScoreableJob): RequiredSkill[] {
  const map = new Map<string, RequirementImportance>();
  const put = (id: string, imp: RequirementImportance) => {
    const prev = map.get(id);
    if (!prev || requirementImportanceWeight(imp) > requirementImportanceWeight(prev)) map.set(id, imp);
  };
  for (const s of job.inferredSkills ?? []) put(s, "inferred");
  for (const s of job.preferredSkills) put(s, "preferred");
  for (const s of job.requiredSkills) put(s, "mandatory");
  return [...map.entries()].map(([skillId, importance]) => ({ skillId, importance }));
}

const GATE_LABELS: Record<GateId, string> = {
  required_years: "Minimum years of experience",
  work_authorization: "Work authorization",
  clearance: "Security clearance",
  certification: "Certification / license",
  language: "Language requirement",
  employment_type: "Employment type",
  location: "Location / on-site requirement",
};

function summarize(
  score: number,
  req: { matched: string[]; missing: string[] },
  prefMatched: string[],
  signals: { seniority: string; role: string | null },
): string {
  const total = req.matched.length + req.missing.length;
  const parts: string[] = [`${score}/100 fit`];
  if (total > 0) {
    parts.push(
      `matched ${req.matched.length}/${total} required` +
        (req.matched.length > 0 ? ` (${req.matched.slice(0, 4).join(", ")})` : ""),
    );
    if (req.missing.length > 0) parts.push(`missing ${req.missing.slice(0, 4).join(", ")}`);
  }
  if (prefMatched.length > 0) parts.push(`${prefMatched.length} preferred matched`);
  parts.push(signals.seniority);
  if (signals.role) parts.push(signals.role);
  return `${parts.join("; ")}.`;
}

export interface ScoreJobOptions {
  /** 0–1, from the resume parse — caps how confident a match can be. */
  parseConfidence: number;
}

/**
 * The full deterministic analysis behind a fit result: the compact `result` plus
 * the matching engine output, the job requirement graph, and the *complete* gap +
 * recommendation lists (the result carries only a compact subset). The Job Match
 * Report builder (M14-S2) consumes this; `scoreJob` projects just the `result`.
 */
export interface JobAnalysis {
  result: JobFitResult;
  matches: EvidenceMatchResult;
  jobProfile: JobProfile | null;
  gaps: FitGap[];
  recommendations: FitRecommendation[];
}

const EMPTY_MATCHES: EvidenceMatchResult = {
  skills: [],
  domains: [],
  seniority: { candidateLevel: null, requiredLevel: null, candidateScore: 0, fit: null, signalBoosted: false },
  gates: [],
  resumeDomains: [],
};

/** Compact projection used everywhere fit is persisted/displayed (M8/M9). */
export function scoreJob(profile: CandidateProfile, job: ScoreableJob, opts: ScoreJobOptions): JobFitResult {
  return analyzeJob(profile, job, opts).result;
}

export function analyzeJob(
  profile: CandidateProfile,
  job: ScoreableJob,
  opts: ScoreJobOptions,
): JobAnalysis {
  const resumeSkills = new Set<string>([
    ...profile.techTiers.tier1,
    ...profile.techTiers.tier2,
    ...profile.techTiers.tier3,
  ]);
  const evidence = profile.evidence ?? [];

  // Legacy fields stay aligned with the stored enriched tiers (M5-S3) and the
  // hotness gate: matched/missing are *exact* presence, not adjacency.
  const required = partition(job.requiredSkills, resumeSkills);
  const preferred = partition(job.preferredSkills, resumeSkills);

  const jobReqSkills = jobRequiredSkills(job);

  // A job with no enriched skills can't be scored meaningfully → 0 + low confidence
  // (don't fabricate a number from role/seniority alone).
  if (jobReqSkills.length === 0) {
    return {
      result: {
        jobId: job.id,
        overallScore: 0,
        atsScore: 0,
        confidence: 0.2,
        matchedRequiredSkills: required.matched,
        missingRequiredSkills: required.missing,
        matchedPreferredSkills: preferred.matched,
        missingPreferredSkills: preferred.missing,
        missingHardGates: required.missing.length,
        explanationSummary: `0/100 fit; job has no extracted skills to match.`,
      },
      matches: EMPTY_MATCHES,
      jobProfile: null,
      gaps: [],
      recommendations: [],
    };
  }

  // Job requirement graph from the description text when available (domains,
  // gates, required years, seniority); skill demand stays the canonical tiers.
  const jp = job.descriptionText ? extractJobProfile(job.descriptionText, { title: job.title }) : null;
  const jobSeniority = job.metadata?.seniority ?? inferSeniority(job.title) ?? jp?.seniority ?? null;

  const matches = matchEvidence(
    {
      skills: [...resumeSkills],
      evidence,
      seniorityLevel: candidateSeniority(profile),
      totalYears: profile.totalYearsExperience ?? null,
    },
    {
      skills: jobReqSkills,
      domains: jp?.domains ?? [],
      seniorityLevel: jobSeniority,
      requiredYears: jp?.requiredYears ?? null,
      gates: jp?.gates ?? [],
    },
  );

  const candFamilies = candidateRoleFamilies(profile);
  const jobFamily = inferRoleFamily(job.title);
  const relevance = roleRelevance(candFamilies, jobFamily);

  const breakdown = scoreRubric(
    {
      matches,
      resume: { evidence, skills: resumeSkills, seniorityLevel: candidateSeniority(profile), parseConfidence: opts.parseConfidence },
      job: { responsibilities: (jp?.responsibilities ?? []).map((r) => r.text), hasSkills: jobReqSkills.length > 0 },
    },
    relevance,
  );

  const overallScore = Math.round(breakdown.baseScore * relevance);
  const confidence = scoreConfidence({
    matches,
    resume: { evidence, skills: resumeSkills, seniorityLevel: jobSeniority, parseConfidence: opts.parseConfidence },
    job: { responsibilities: [], hasSkills: true },
  });

  // Strengths: exact skill matches with the strongest backing evidence.
  const strengths: FitStrength[] = matches.skills
    .filter((m) => m.matchType === "exact")
    .sort((a, b) => b.evidenceStrength - a.evidenceStrength)
    .slice(0, 5)
    .map((m) => {
      const snippet = evidence.find((e) => e.skills.includes(m.skillId))?.text;
      return { label: m.skillId, evidence: snippet ? [snippet] : [] };
    });

  const gates: FitGateResult[] = matches.gates.map((g) => ({
    id: g.id,
    label: GATE_LABELS[g.id],
    status: g.status,
    reason: g.reason,
  }));

  // Typed gaps + deterministic tailoring recommendations (M9-S6). The batch result
  // carries a compact subset; the full set is produced by `generateReport`.
  const gaps = buildGapAnalysis({ matches });
  const recommendations = buildTailoringHints(gaps);

  const sen = matches.seniority;
  const seniorityNote =
    sen.fit === null
      ? "seniority n/a"
      : sen.fit >= 1
        ? `${sen.candidateLevel ?? "?"} meets ${sen.requiredLevel ?? "?"}`
        : `${sen.candidateLevel ?? "?"} below ${sen.requiredLevel ?? "?"}`;
  const roleNote =
    jobFamily && candFamilies.size > 0
      ? relevance >= ROLE_RELEVANCE.same
        ? `${jobFamily} role match`
        : relevance <= ROLE_RELEVANCE.off
          ? `off-domain for ${jobFamily}`
          : `${jobFamily}-adjacent`
      : null;

  const result: JobFitResult = {
    jobId: job.id,
    overallScore,
    atsScore: atsScore(required, preferred, opts.parseConfidence),
    confidence,
    matchedRequiredSkills: required.matched,
    missingRequiredSkills: required.missing,
    matchedPreferredSkills: preferred.matched,
    missingPreferredSkills: preferred.missing,
    missingHardGates: required.missing.length,
    explanationSummary: summarize(overallScore, required, preferred.matched, {
      seniority: seniorityNote,
      role: roleNote,
    }),
    classification: breakdown.classification,
    breakdown,
    strengths,
    gates,
    gaps: gaps.slice(0, 6),
    recommendations: recommendations.slice(0, 6),
  };

  return { result, matches, jobProfile: jp, gaps, recommendations };
}
