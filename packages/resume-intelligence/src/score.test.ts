import type { ScoreableJob } from "@career-intelligence/fit-scoring";
import { describe, expect, it } from "vitest";

import { SENIOR_ENGINEER_RESUME } from "./fixtures";
import { parseResume } from "./parse-resume";
import { scoreJob } from "./score";

const NOW = new Date("2024-01-01T00:00:00Z");
const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
const opts = { parseConfidence: profile.parseConfidence };

function job(over: Partial<ScoreableJob>): ScoreableJob {
  return { id: "j", title: "t", requiredSkills: [], preferredSkills: [], ...over };
}

describe("scoreJob", () => {
  it("scores a strong match high when required skills are Tier 1/2", () => {
    const r = scoreJob(
      profile,
      job({ requiredSkills: ["typescript", "postgresql"], preferredSkills: ["redis"] }),
      opts,
    );
    expect(r.overallScore).toBeGreaterThanOrEqual(80);
    expect(r.missingHardGates).toBe(0);
    expect(r.matchedRequiredSkills).toEqual(["typescript", "postgresql"]);
  });

  it("penalizes missing required skills and reports them as hard gates", () => {
    const r = scoreJob(
      profile,
      job({ requiredSkills: ["typescript", "rust", "scala"], preferredSkills: [] }),
      opts,
    );
    expect(r.missingRequiredSkills).toContain("rust");
    expect(r.missingRequiredSkills).toContain("scala");
    expect(r.missingHardGates).toBe(2);
    // Missing 2 of 3 required skills lands in the moderate band — clearly below a
    // full-match strong score (~82), even though role/seniority hold it up.
    expect(r.overallScore).toBeLessThan(70);
  });

  it("returns 0 / low confidence when the job has no enriched skills", () => {
    const r = scoreJob(profile, job({ requiredSkills: [], preferredSkills: [] }), opts);
    expect(r.overallScore).toBe(0);
    expect(r.confidence).toBeLessThanOrEqual(0.2);
  });

  it("makes a missing required skill cost more than a missing inferred one", () => {
    // Candidate has typescript (Tier 1) but not rust.
    const missingRequired = scoreJob(
      profile,
      job({ requiredSkills: ["typescript", "rust"] }),
      opts,
    ).overallScore;
    const missingInferred = scoreJob(
      profile,
      job({ requiredSkills: ["typescript"], inferredSkills: ["rust"] }),
      opts,
    ).overallScore;
    expect(missingInferred).toBeGreaterThan(missingRequired);
  });

  it("produces a human-readable explanation", () => {
    const r = scoreJob(profile, job({ requiredSkills: ["typescript", "rust"] }), opts);
    expect(r.explanationSummary).toMatch(/matched 1\/2 required/i);
    expect(r.explanationSummary).toMatch(/missing rust/i);
  });

  it("crushes an off-domain role with the role-relevance multiplier", () => {
    // Even a matched required skill can't rescue an engineering résumé against a
    // sales role — the wrong domain caps the fit near zero.
    const r = scoreJob(
      profile,
      job({ title: "Account Executive, Enterprise Sales", requiredSkills: ["typescript"] }),
      opts,
    );
    expect(r.overallScore).toBeLessThan(15);
    expect(r.explanationSummary).toMatch(/off-domain/i);
  });

  it("keeps a same-family candidate well above zero when a niche required skill is missing", () => {
    // The old pure-overlap scorer returned 0 here; the composite credits role +
    // seniority so a missing tool only lowers, never zeroes, a relevant candidate.
    const r = scoreJob(
      profile,
      job({ title: "Senior Platform Engineer", requiredSkills: ["terraform"], metadata: { seniority: "senior" } }),
      opts,
    );
    expect(r.overallScore).toBeGreaterThan(15);
    expect(r.explanationSummary).toMatch(/role match/i);
  });

  it("rewards meeting/exceeding the role's seniority", () => {
    const meets = scoreJob(
      profile,
      job({ title: "Software Engineer", requiredSkills: ["typescript"], metadata: { seniority: "senior" } }),
      opts,
    ).overallScore;
    const under = scoreJob(
      profile,
      job({ title: "Software Engineer", requiredSkills: ["typescript"], metadata: { seniority: "principal" } }),
      opts,
    ).overallScore;
    expect(meets).toBeGreaterThan(under);
  });
});
