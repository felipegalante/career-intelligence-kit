import { describe, expect, it } from "vitest";

import { SENIOR_ENGINEER_RESUME } from "./fixtures";
import { parseResume } from "./parse-resume";
import { LocalResumeIntelligenceProvider, LOCAL_PROVIDER_ID } from "./provider";
import { LOCAL_CONFIG_VERSION, LOCAL_ENGINE_VERSION, LOCAL_SCORING_MODE } from "./version";

const provider = new LocalResumeIntelligenceProvider();
const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: new Date("2024-01-01") });

const jobs = [
  { id: "a", title: "Backend Engineer", requiredSkills: ["typescript", "postgresql"], preferredSkills: ["redis"] },
  { id: "b", title: "Rust Engineer", requiredSkills: ["rust"], preferredSkills: [] },
];

describe("LocalResumeIntelligenceProvider", () => {
  it("is always available", async () => {
    const h = await provider.health();
    expect(h.available).toBe(true);
    expect(h.provider).toBe(LOCAL_PROVIDER_ID);
    expect(h.scoringMode).toBe(LOCAL_SCORING_MODE);
  });

  it("scores a batch and stamps stable cache-key versions", async () => {
    const res = await provider.scoreBatch({
      resumeProfileId: "r1",
      resumeText: SENIOR_ENGINEER_RESUME,
      resumeProfile: profile as unknown as Record<string, unknown>,
      jobs,
    });
    expect(res.results).toHaveLength(2);
    expect(res.rubricEngineVersion).toBe(LOCAL_ENGINE_VERSION);
    expect(res.rubricConfigVersion).toBe(LOCAL_CONFIG_VERSION);
    expect(res.scoringMode).toBe(LOCAL_SCORING_MODE);
    expect(res.results[0]!.overallScore).toBeGreaterThan(res.results[1]!.overallScore);
  });

  it("falls back to parsing resumeText when no profile is supplied", async () => {
    const res = await provider.scoreBatch({
      resumeProfileId: "r1",
      resumeText: SENIOR_ENGINEER_RESUME,
      jobs: [jobs[0]!],
    });
    expect(res.results[0]!.overallScore).toBeGreaterThan(0);
  });

  it("generates a lightweight report (M9 fallback)", async () => {
    const r = await provider.generateReport({
      resumeProfileId: "r1",
      jobPostingId: "a",
      resumeText: SENIOR_ENGINEER_RESUME,
      resumeProfile: profile as unknown as Record<string, unknown>,
      job: jobs[0]!,
    });
    expect(r.available).toBe(true);
    expect(r.sections?.length).toBeGreaterThan(0);
  });
});
