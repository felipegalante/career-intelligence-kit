import type { ScoreableJob } from "@career-intelligence/fit-scoring";
import { describe, expect, it } from "vitest";

import { SENIOR_ENGINEER_RESUME } from "../fixtures";
import { parseResume } from "../parse-resume";

import { buildJobMatchReport, type ReportJobContextInput } from "./buildJobMatchReport";
import { jobMatchReportSchema } from "./jobMatchReport.contract";

const NOW = new Date("2024-06-01T00:00:00Z");
const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: new Date("2024-01-01T00:00:00Z") });

function job(over: Partial<ScoreableJob>): ScoreableJob {
  return { id: "j", title: "Senior Backend Engineer", requiredSkills: [], preferredSkills: [], ...over };
}

function roleContext(over: Partial<ReportJobContextInput> = {}): ReportJobContextInput {
  return { title: "Senior Backend Engineer", ...over };
}

function build(j: ScoreableJob, rc: ReportJobContextInput = roleContext()) {
  return buildJobMatchReport({ profile, job: j, roleContext: rc, now: NOW });
}

describe("buildJobMatchReport", () => {
  it("produces a report that satisfies the contract schema", () => {
    const report = build(job({ requiredSkills: ["typescript", "postgresql"], preferredSkills: ["redis"] }));
    expect(() => jobMatchReportSchema.parse(report)).not.toThrow();
  });

  it("carries deterministic provenance + headline scores", () => {
    const report = build(job({ requiredSkills: ["typescript", "postgresql"] }));
    expect(report.reportSource).toBe("deterministic");
    expect(report.scoringVersion).toBe("local-ri@0.4.0");
    expect(report.parserVersion).toBe(profile.version);
    expect(report.generatedAt).toBe(NOW.toISOString());
    expect(report.score).toBeGreaterThan(0);
    expect(report.atsScore).toBeGreaterThan(0);
    expect(report.verdict).toMatch(/match/i);
  });

  it("exposes the six normalized breakdown dimensions", () => {
    const report = build(job({ requiredSkills: ["typescript"] }));
    expect(Object.keys(report.breakdown)).toEqual([
      "technicalStack",
      "seniorityScope",
      "architecture",
      "stakeholderFit",
      "businessOrientation",
      "multiplierCommunication",
    ]);
    for (const v of Object.values(report.breakdown)) expect(v).toBeGreaterThanOrEqual(0);
    expect(report.fitInsights.skillsAnalysis.categoryCoverage).toHaveLength(6);
  });

  it("computes estimated readiness as a 72/28 blend of fit and ATS", () => {
    const report = build(job({ requiredSkills: ["typescript", "postgresql"] }));
    const expected = Math.round(report.score * 0.72 + report.atsScore * 0.28);
    expect(report.fitInsights.scoreCards.estimatedReadiness.value).toBe(expected);
  });

  it("reports skills coverage honestly (matched / missing / coverage)", () => {
    const report = build(job({ requiredSkills: ["typescript", "rust"] }));
    const cov = report.intelligence.skillsCoverage;
    expect(cov.matchedCount).toBe(1);
    expect(cov.requiredCount).toBe(2);
    expect(cov.missingSkills.map((s) => s.toLowerCase())).toContain("rust");
    expect(report.fitInsights.skillsAnalysis.coveragePercent).toBe(50);
  });

  it("buckets gaps into Fix now / Improve next / Optional polish by impact", () => {
    const report = build(job({ requiredSkills: ["typescript", "rust", "scala"] }));
    const lanes = report.fitInsights.roadmap;
    expect(lanes.map((l) => l.title)).toEqual(["Fix now", "Improve next", "Optional polish"]);
    expect(lanes[0]!.tone).toBe("danger");
    // A missing mandatory skill is a high-impact (critical) gap → lands in "Fix now".
    expect(lanes[0]!.items.length).toBeGreaterThan(0);
    // Gaps are sorted high-impact first.
    const impacts = report.fitInsights.gaps.map((g) => g.impact);
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const sorted = [...impacts].sort((a, b) => rank[a] - rank[b]);
    expect(impacts).toEqual(sorted);
  });

  it("shows company + compensation as unavailable rather than inventing them", () => {
    const report = build(job({ requiredSkills: ["typescript"] }), roleContext({ companyName: null }));
    expect(report.intelligence.companyOverview.available).toBe(false);
    expect(report.intelligence.companyOverview.summary).toMatch(/aren't available/i);
    expect(report.intelligence.compensationLogistics.available).toBe(false);
    expect(report.roleContext.companyName).toBeNull();
    expect(report.roleContext.compensation).toBeNull();
  });

  it("surfaces available role context (company, location, compensation)", () => {
    const report = build(
      job({ requiredSkills: ["typescript"] }),
      roleContext({
        companyName: "Acme",
        locations: ["Berlin"],
        workplaceType: "hybrid",
        employmentType: "full-time",
        compensation: { currency: "EUR", min: 90000, max: 120000, period: "year" },
      }),
    );
    expect(report.intelligence.companyOverview.available).toBe(true);
    expect(report.intelligence.companyOverview.facts.join(" ")).toContain("Acme");
    expect(report.intelligence.compensationLogistics.available).toBe(true);
    expect(report.fitInsights.targetRoleContext.meta).toContain("Berlin");
  });

  it("never asserts experience the candidate lacks (add-only-if-true framing)", () => {
    const report = build(job({ requiredSkills: ["typescript", "rust"] }));
    const rustEdit = report.fitInsights.resumeEdits.find((e) => /rust/i.test(e.example));
    if (rustEdit) expect(rustEdit.example.toLowerCase()).toContain("only if");
  });

  it("is deterministic for identical input", () => {
    const j = job({ requiredSkills: ["typescript", "postgresql"], preferredSkills: ["redis"] });
    expect(build(j)).toEqual(build(j));
  });
});
