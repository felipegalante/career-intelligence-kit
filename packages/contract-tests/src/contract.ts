// @career-intelligence/contract-tests — a reusable vitest suite that asserts any
// CareerIntelligenceProvider satisfies the Career Intelligence v1 contract. Run it
// against the mock server (via the client) and against the private Rubric Compiler
// service. The private service implements the same contract, so the same suite
// guards both.

import { jobDescriptionInputFixture, resumeInputFixture } from "@career-intelligence/fixtures";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";
import { type IntelligenceResultMetadata } from "@career-intelligence/types";
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
  expect(Array.isArray(metadata.warnings)).toBe(true);
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

    it("generates a Resume ATS report", async () => {
      const provider = await make();
      const report = await provider.generateResumeAtsReport({ resume, job, requestId: "ct-report" });
      assertScore(report.fitScore);
      assertScore(report.atsScore);
      assertScore(report.readinessScore);
      expect(Array.isArray(report.limitations)).toBe(true);
      assertMetadata(report.metadata);
    });
  });
}
