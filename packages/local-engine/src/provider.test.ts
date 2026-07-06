import { describe, expect, it } from "vitest";

import { createLocalCareerIntelligenceProvider } from "./provider";

const RESUME = `Jane Doe
Senior Software Engineer

Summary
Senior backend engineer with 6 years building TypeScript and Node.js services.

Skills
TypeScript, Node.js, PostgreSQL, AWS, Docker

Experience
Senior Software Engineer, Acme (2020-2026)
- Built and scaled Node.js and TypeScript microservices on AWS.
- Designed PostgreSQL schemas and optimized slow queries by 40%.
`;

const JOB = `Senior Backend Engineer

About the role
You will build and operate scalable backend services.

Requirements
- 5+ years of experience with TypeScript and Node.js
- Strong experience with PostgreSQL
- Experience deploying to AWS

Preferred qualifications
- Experience with React
`;

describe("local career intelligence provider", () => {
  const provider = createLocalCareerIntelligenceProvider({
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  it("evaluates a resume against a job using deterministic logic only", async () => {
    const result = await provider.evaluate({
      resume: { text: RESUME },
      job: { text: JOB, title: "Senior Backend Engineer" },
      requestId: "req-123",
    });

    expect(result.fit.score).toBeGreaterThanOrEqual(0);
    expect(result.fit.score).toBeLessThanOrEqual(100);
    expect(result.parsedResume.skills.length).toBeGreaterThan(0);
    expect(result.jobProfile.requiredSkills.length).toBeGreaterThan(0);

    // Provenance flows through every result.
    expect(result.metadata.provider).toBe("local-career-intelligence");
    expect(result.metadata.mode).toBe("local");
    expect(result.metadata.degraded).toBe(false);
    expect(result.metadata.requestId).toBe("req-123");
    expect(result.metadata.generatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("produces a Resume ATS report with bounded scores and structured insights", async () => {
    const report = await provider.generateResumeAtsReport({
      resume: { text: RESUME },
      job: { text: JOB, title: "Senior Backend Engineer", company: "Globex" },
    });

    for (const score of [report.fitScore, report.atsScore, report.readinessScore]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(["strong", "good", "fair", "weak"]).toContain(report.matchLevel);
    expect(report.fitInsights.evidenceReview.limitations.length).toBeGreaterThan(0);
    expect(report.fitInsights.fitSummary.headline).toBeTruthy();
    expect(report.fitInsights.skillsAnalysis.matchedSkills.length).toBeGreaterThan(0);
    expect(report.fitInsights.roadmap).toHaveLength(3);
    expect(report.metadata.mode).toBe("local");
  });

  it("discloses missing company intelligence honestly on the report", async () => {
    const report = await provider.generateResumeAtsReport({
      resume: { text: RESUME },
      job: { text: JOB, title: "Senior Backend Engineer" },
    });

    expect(report.companyIntel).toBeNull();
    expect(report.marketIntel).toBeNull();
    expect(report.companyContext.provider).toBe("none");
    expect(report.companyContext.degraded).toBe(true);
    expect(report.companyContext.warnings.length).toBeGreaterThan(0);
    expect(report.calibration.applied).toBe(false);
    expect(report.calibration.calibratedScore).toBe(report.calibration.baseScore);
    expect(report.calibration.netAdjustment).toBe(0);
  });

  it("describes capabilities and reports healthy", async () => {
    expect(provider.describe().mode).toBe("local");
    expect(provider.describe().capabilities.evaluate).toBe(true);
    expect((await provider.health()).status).toBe("ok");
  });
});
