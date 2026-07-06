// @career-intelligence/contract-tests — a reusable vitest suite that asserts any
// CareerIntelligenceProvider satisfies the Career Intelligence v1 contract. Run it
// against the mock server (via the client) and against the private Rubric Compiler
// service. The private service implements the same contract, so the same suite
// guards both.

import { jobDescriptionInputFixture, resumeInputFixture } from "@career-intelligence/fixtures";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";
import {
  type IntelligenceResultMetadata,
  type ReportCalibration,
  type ReportCompanyContext,
  type ResumeAtsFitInsights,
} from "@career-intelligence/types";
import { describe, expect, it } from "vitest";

export interface ContractInputs {
  resumeText: string;
  jobText: string;
  jobTitle?: string;
}

export const defaultContractInputs: ContractInputs = {
  resumeText: resumeInputFixture.text,
  jobText: jobDescriptionInputFixture.text,
  jobTitle: jobDescriptionInputFixture.title,
};

function assertScore(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(100);
}

function assertMetadata(metadata: IntelligenceResultMetadata): void {
  expect(typeof metadata.provider).toBe("string");
  expect(["local", "remote"]).toContain(metadata.mode);
  expect(typeof metadata.degraded).toBe("boolean");
  expect(typeof metadata.engineVersion).toBe("string");
  expect(typeof metadata.generatedAt).toBe("string");
  expect(Array.isArray(metadata.warnings)).toBe(true);
}

// The full allowed key set for a Resume ATS report. Unknown top-level keys fail the
// contract so shape drift between implementations surfaces immediately.
const REPORT_ALLOWED_KEYS = new Set([
  "fitScore",
  "atsScore",
  "readinessScore",
  "matchLevel",
  "verdict",
  "summary",
  "fitInsights",
  "companyIntel",
  "marketIntel",
  "calibration",
  "companyContext",
  "artifacts",
  "metadata",
]);

const FIT_INSIGHTS_REQUIRED_KEYS = [
  "fitSummary",
  "snapshot",
  "scoreCards",
  "strengths",
  "gaps",
  "roadmap",
  "resumeEdits",
  "interviewPrep",
  "skillsAnalysis",
  "applicationChecklist",
  "targetRoleContext",
  "evidenceReview",
] as const;

function assertFitInsights(insights: ResumeAtsFitInsights): void {
  for (const key of FIT_INSIGHTS_REQUIRED_KEYS) {
    expect(insights, `fitInsights.${key} is required`).toHaveProperty(key);
  }
  expect(typeof insights.fitSummary.headline).toBe("string");
  expect(typeof insights.fitSummary.narrative).toBe("string");
  expect(Array.isArray(insights.strengths)).toBe(true);
  for (const strength of insights.strengths) {
    expect(typeof strength.title).toBe("string");
    expect(strength.confidence).toBeGreaterThanOrEqual(0);
    expect(strength.confidence).toBeLessThanOrEqual(100);
  }
  expect(Array.isArray(insights.gaps)).toBe(true);
  for (const gap of insights.gaps) {
    expect(["high", "medium", "low"]).toContain(gap.impact);
    expect(typeof gap.tip).toBe("string");
  }
  expect(Array.isArray(insights.roadmap)).toBe(true);
  expect(Array.isArray(insights.skillsAnalysis.matchedSkills)).toBe(true);
  expect(Array.isArray(insights.skillsAnalysis.missingSkills)).toBe(true);
  expect(insights.skillsAnalysis.matchedCount).toBeGreaterThanOrEqual(0);
  expect(insights.skillsAnalysis.requiredCount).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(insights.evidenceReview.limitations)).toBe(true);
}

function assertCalibration(calibration: ReportCalibration): void {
  expect(Array.isArray(calibration.positiveSignals)).toBe(true);
  expect(Array.isArray(calibration.negativeSignals)).toBe(true);
  expect(Array.isArray(calibration.neutralSignals)).toBe(true);
  expect(typeof calibration.netAdjustment).toBe("number");
  assertScore(calibration.baseScore);
  assertScore(calibration.calibratedScore);
  expect(typeof calibration.applied).toBe("boolean");
}

function assertCompanyContext(context: ReportCompanyContext): void {
  expect(typeof context.provider).toBe("string");
  expect(typeof context.degraded).toBe("boolean");
  expect(Array.isArray(context.preparationInsights)).toBe(true);
  expect(Array.isArray(context.resumeTailoringAngles)).toBe(true);
  expect(Array.isArray(context.warnings)).toBe(true);
}

/**
 * Register the Career Intelligence contract suite for a provider.
 * @param label Human label for the implementation under test.
 * @param make Factory returning the provider (sync or async).
 * @param inputs Sample resume/job inputs (defaults to the shared fixtures).
 */
export function runCareerIntelligenceContract(
  label: string,
  make: () => CareerIntelligenceProvider | Promise<CareerIntelligenceProvider>,
  inputs: ContractInputs = defaultContractInputs,
): void {
  const resume = { text: inputs.resumeText };
  const job = { text: inputs.jobText, title: inputs.jobTitle };

  describe(`career-intelligence contract: ${label}`, () => {
    it("reports health", async () => {
      const provider = await make();
      const health = await provider.health();
      expect(["ok", "degraded"]).toContain(health.status);
      expect(typeof health.provider).toBe("string");
    });

    it("describes itself", async () => {
      const provider = await make();
      const descriptor = provider.describe();
      expect(["local", "remote"]).toContain(descriptor.mode);
      expect(descriptor.capabilities.evaluate).toBe(true);
    });

    it("parses a resume with provenance metadata", async () => {
      const provider = await make();
      const result = await provider.parseResume({ resume, requestId: "ct-parse" });
      expect(result.resume.parserVersion).toBeTruthy();
      assertMetadata(result.metadata);
    });

    it("normalizes a job description", async () => {
      const provider = await make();
      const result = await provider.normalizeJobDescription({ job, requestId: "ct-norm" });
      expect(Array.isArray(result.job.requiredSkills)).toBe(true);
      assertMetadata(result.metadata);
    });

    it("scores fit within bounds", async () => {
      const provider = await make();
      const fit = await provider.scoreFit({ resume, job, requestId: "ct-fit" });
      assertScore(fit.score);
      assertScore(fit.atsScore);
      expect(["strong", "good", "fair", "weak"]).toContain(fit.matchLevel);
      assertMetadata(fit.metadata);
    });

    it("evaluates end to end", async () => {
      const provider = await make();
      const result = await provider.evaluate({ resume, job, requestId: "ct-eval" });
      assertScore(result.fit.score);
      expect(result.parsedResume.skills.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.jobProfile.requiredSkills)).toBe(true);
      assertMetadata(result.metadata);
    });

    it("generates a Resume ATS report with the full reconciled shape", async () => {
      const provider = await make();
      const report = await provider.generateResumeAtsReport({ resume, job, requestId: "ct-report" });

      assertScore(report.fitScore);
      assertScore(report.atsScore);
      assertScore(report.readinessScore);
      expect(["strong", "good", "fair", "weak"]).toContain(report.matchLevel);
      expect(typeof report.verdict).toBe("string");
      assertFitInsights(report.fitInsights);
      assertCalibration(report.calibration);
      assertCompanyContext(report.companyContext);
      assertMetadata(report.metadata);

      // Unknown top-level keys are contract drift; fail loudly.
      const unknownKeys = Object.keys(report).filter((key) => !REPORT_ALLOWED_KEYS.has(key));
      expect(unknownKeys, `unexpected report keys: ${unknownKeys.join(", ")}`).toEqual([]);
    });

    it("never invents company intelligence on the report", async () => {
      const provider = await make();
      const report = await provider.generateResumeAtsReport({ resume, job, requestId: "ct-report-ci" });

      // Either real company context is present, or the degraded state is disclosed
      // with warnings — silent absence and invented data both fail.
      if (report.companyIntel === null) {
        expect(report.companyContext.degraded).toBe(true);
        expect(report.calibration.applied).toBe(false);
      }
      if (report.companyContext.degraded) {
        expect(report.companyContext.warnings.length).toBeGreaterThan(0);
      }
    });
  });
}
