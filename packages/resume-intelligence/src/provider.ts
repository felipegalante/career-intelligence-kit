import type {
  FitProviderDescriptor,
  FitReportResult,
  FitScoringHealth,
  FitScoringProvider,
  GenerateReportInput,
  ScoreBatchInput,
  ScoreBatchResult,
} from "@career-intelligence/fit-scoring";

import { parseResume, isCandidateProfile, type CandidateProfile } from "./parse-resume";
import { scoreJob } from "./score";
import { LOCAL_CONFIG_VERSION, LOCAL_ENGINE_VERSION, LOCAL_SCORING_MODE } from "./version";

// The in-house provider. Always available (no external dependency), so it's the
// permanent fallback when the rubric-compiler (M12) is off or unhealthy (§23.11).
// It reads the stored `CandidateProfile` when present, else parses `resumeText`
// on the fly — so callers that only have raw text still work.

export const LOCAL_PROVIDER_ID = "local-resume-intelligence";

export class LocalResumeIntelligenceProvider implements FitScoringProvider {
  describe(): FitProviderDescriptor {
    return {
      engineVersion: LOCAL_ENGINE_VERSION,
      configVersion: LOCAL_CONFIG_VERSION,
      scoringMode: LOCAL_SCORING_MODE,
    };
  }

  health(): Promise<FitScoringHealth> {
    return Promise.resolve({
      available: true,
      provider: LOCAL_PROVIDER_ID,
      scoringMode: LOCAL_SCORING_MODE,
    });
  }

  private resolveProfile(input: { resumeProfile?: Record<string, unknown>; resumeText: string }): CandidateProfile {
    if (isCandidateProfile(input.resumeProfile)) return input.resumeProfile;
    return parseResume(input.resumeText);
  }

  scoreBatch(input: ScoreBatchInput): Promise<ScoreBatchResult> {
    const profile = this.resolveProfile(input);
    const results = input.jobs.map((job) =>
      scoreJob(profile, job, { parseConfidence: profile.parseConfidence }),
    );
    return Promise.resolve({
      results,
      rubricEngineVersion: LOCAL_ENGINE_VERSION,
      rubricConfigVersion: LOCAL_CONFIG_VERSION,
      scoringMode: LOCAL_SCORING_MODE,
    });
  }

  generateReport(input: GenerateReportInput): Promise<FitReportResult> {
    const profile = this.resolveProfile(input);
    const fit = scoreJob(profile, input.job, { parseConfidence: profile.parseConfidence });
    const list = (skills: string[]) => (skills.length > 0 ? skills.join(", ") : "—");
    const sections: Array<{ heading: string; body: string }> = [
      {
        heading: "Overall fit",
        body: `${fit.overallScore}/100 — ${(fit.classification ?? "").replace(/_/g, " ")} (confidence ${fit.confidence}).`,
      },
      {
        heading: "Required skills",
        body: `Matched: ${list(fit.matchedRequiredSkills)}. Missing: ${list(fit.missingRequiredSkills)}.`,
      },
      {
        heading: "Preferred skills",
        body: `Matched: ${list(fit.matchedPreferredSkills)}. Missing: ${list(fit.missingPreferredSkills)}.`,
      },
    ];

    if (fit.breakdown) {
      sections.push({
        heading: "Score breakdown",
        body: fit.breakdown.dimensions
          .map((d) => `${d.label}: ${Math.round(d.rawScore * 100)}%`)
          .join("\n"),
      });
    }
    if (fit.strengths && fit.strengths.length > 0) {
      sections.push({
        heading: "Strengths",
        body: fit.strengths.map((s) => `${s.label}${s.evidence[0] ? ` — ${s.evidence[0]}` : ""}`).join("\n"),
      });
    }
    if (fit.gaps && fit.gaps.length > 0) {
      sections.push({
        heading: "Gaps",
        body: fit.gaps.map((g) => `[${g.severity}] ${g.requirement}: ${g.explanation}`).join("\n"),
      });
    }
    if (fit.recommendations && fit.recommendations.length > 0) {
      sections.push({
        heading: "Recommendations",
        body: fit.recommendations.map((r) => `(${r.priority}) ${r.recommendation}`).join("\n"),
      });
    }
    const actionableGates = (fit.gates ?? []).filter((g) => g.status !== "unknown");
    if (actionableGates.length > 0) {
      sections.push({
        heading: "Eligibility gates",
        body: actionableGates.map((g) => `${g.label}: ${g.status} — ${g.reason}`).join("\n"),
      });
    }

    return Promise.resolve({
      available: true,
      summary: fit.explanationSummary,
      sections,
      rubricEngineVersion: LOCAL_ENGINE_VERSION,
      rubricConfigVersion: LOCAL_CONFIG_VERSION,
      scoringMode: LOCAL_SCORING_MODE,
    });
  }
}
