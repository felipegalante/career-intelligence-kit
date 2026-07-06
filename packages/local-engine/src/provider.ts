// @career-intelligence/local-engine — a ready-to-use deterministic
// CareerIntelligenceProvider composing resume-intelligence + job-description-
// normalization + fit-scoring. No network, no LLM: the permanent local fallback.

import { extractJobProfile } from "@career-intelligence/job-description-normalization";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";
import {
  analyzeJob,
  LOCAL_CONFIG_VERSION,
  LOCAL_ENGINE_VERSION,
  LOCAL_SCORING_MODE,
  parseResume,
} from "@career-intelligence/resume-intelligence";
import {
  type CareerEvaluationInput,
  type CareerEvaluationResult,
  type CareerIntelligenceHealth,
  type CareerIntelligenceProviderDescriptor,
  type FitScoreResult,
  type IntelligenceResultMetadata,
  type NormalizeJobDescriptionInput,
  type NormalizeJobDescriptionResult,
  type ParseResumeInput,
  type ParseResumeResult,
  type ResumeAtsReportResult,
  type ScoreFitInput,
} from "@career-intelligence/types";

import {
  buildScoreableJob,
  mapFitScore,
  mapGaps,
  mapNormalizedJobProfile,
  mapParsedResume,
  mapStrengths,
  matchLevel,
} from "./mappers";
import { buildLocalFitInsights, localCalibration, localCompanyContext } from "./report";

export const LOCAL_PROVIDER_ID = "local-career-intelligence";

export interface LocalCareerIntelligenceOptions {
  /** Clock injection for deterministic timestamps in tests. */
  now?: () => Date;
}

export function createLocalCareerIntelligenceProvider(
  options: LocalCareerIntelligenceOptions = {},
): CareerIntelligenceProvider {
  const now = options.now ?? (() => new Date());

  const metadata = (requestId?: string, warnings: string[] = []): IntelligenceResultMetadata => ({
    provider: LOCAL_PROVIDER_ID,
    mode: "local",
    degraded: false,
    engineVersion: LOCAL_ENGINE_VERSION,
    configVersion: LOCAL_CONFIG_VERSION,
    scoringMode: LOCAL_SCORING_MODE,
    generatedAt: now().toISOString(),
    requestId,
    warnings,
  });

  const analyze = (input: CareerEvaluationInput | ScoreFitInput) => {
    const profile = parseResume(input.resume.text);
    const jobProfile = extractJobProfile(input.job.text, { title: input.job.title });
    const scoreable = buildScoreableJob(input.job, jobProfile);
    const analysis = analyzeJob(profile, scoreable, { parseConfidence: profile.parseConfidence });
    return { profile, jobProfile, analysis };
  };

  return {
    parseResume(input: ParseResumeInput): Promise<ParseResumeResult> {
      const profile = parseResume(input.resume.text);
      return Promise.resolve({
        resume: mapParsedResume(profile),
        metadata: metadata(input.requestId),
      });
    },

    normalizeJobDescription(
      input: NormalizeJobDescriptionInput,
    ): Promise<NormalizeJobDescriptionResult> {
      const jobProfile = extractJobProfile(input.job.text, { title: input.job.title });
      return Promise.resolve({
        job: mapNormalizedJobProfile(jobProfile),
        metadata: metadata(input.requestId),
      });
    },

    scoreFit(input: ScoreFitInput): Promise<FitScoreResult> {
      const { analysis } = analyze(input);
      return Promise.resolve(mapFitScore(analysis.result, metadata(input.requestId)));
    },

    evaluate(input: CareerEvaluationInput): Promise<CareerEvaluationResult> {
      const { profile, jobProfile, analysis } = analyze(input);
      const md = metadata(input.requestId);
      return Promise.resolve({
        parsedResume: mapParsedResume(profile),
        jobProfile: mapNormalizedJobProfile(jobProfile),
        fit: mapFitScore(analysis.result, md),
        strengths: mapStrengths(analysis.result.strengths ?? []),
        gaps: mapGaps(analysis.gaps),
        metadata: md,
      });
    },

    generateResumeAtsReport(input: CareerEvaluationInput): Promise<ResumeAtsReportResult> {
      const { profile, jobProfile, analysis } = analyze(input);
      const result = analysis.result;
      const md = metadata(input.requestId);
      const ats = result.atsScore ?? 0;
      const readiness = Math.round(0.5 * result.overallScore + 0.5 * ats);
      const level = matchLevel(result.overallScore, result.classification);
      return Promise.resolve({
        fitScore: result.overallScore,
        atsScore: ats,
        readinessScore: readiness,
        matchLevel: level,
        verdict: result.explanationSummary,
        fitInsights: buildLocalFitInsights({
          input,
          profile,
          jobProfile,
          analysis,
          matchLevel: level,
          readinessScore: readiness,
          generatedAt: md.generatedAt,
        }),
        companyIntel: null,
        marketIntel: null,
        calibration: localCalibration(result.overallScore),
        companyContext: localCompanyContext(),
        metadata: md,
      });
    },

    health(): Promise<CareerIntelligenceHealth> {
      return Promise.resolve({
        status: "ok",
        provider: LOCAL_PROVIDER_ID,
        engineVersion: LOCAL_ENGINE_VERSION,
        localFallbackOnly: true,
      });
    },

    describe(): CareerIntelligenceProviderDescriptor {
      return {
        id: LOCAL_PROVIDER_ID,
        mode: "local",
        engineVersion: LOCAL_ENGINE_VERSION,
        configVersion: LOCAL_CONFIG_VERSION,
        capabilities: {
          parseResume: true,
          normalizeJobDescription: true,
          scoreFit: true,
          evaluate: true,
          resumeAtsReport: true,
        },
      };
    },
  };
}
