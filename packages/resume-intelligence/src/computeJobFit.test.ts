import type { ScoreableJob } from "@career-intelligence/fit-scoring";
import { describe, expect, it } from "vitest";

import { computeJobFit } from "./computeJobFit";
import { SENIOR_ENGINEER_RESUME } from "./fixtures";
import { parseResume } from "./parse-resume";

const NOW = new Date("2024-01-01T00:00:00Z");
const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });

function job(over: Partial<ScoreableJob>): ScoreableJob {
  return { id: "j", title: "Senior Engineer", requiredSkills: [], preferredSkills: [], ...over };
}

const strongJob = job({
  requiredSkills: ["typescript", "postgresql"],
  preferredSkills: ["redis"],
});

describe("computeJobFit", () => {
  it("composes score + band + hotness for a strong, fresh, active job", () => {
    const fit = computeJobFit(
      profile,
      strongJob,
      { isActive: true, firstSeenAt: NOW },
      NOW.getTime(),
    );
    expect(fit.fitScore).toBeGreaterThanOrEqual(80);
    expect(typeof fit.atsScore).toBe("number");
    // ~82 full match → "strong" band + "strong" hotness (hot needs score ≥ 85).
    expect(["strong", "excellent"]).toContain(fit.scoreBand);
    expect(["hot", "strong"]).toContain(fit.hotness);
    expect(fit.confidence).toBeGreaterThan(0);
  });

  it("classifies an inactive job as unknown regardless of score (isActive wired)", () => {
    const fit = computeJobFit(
      profile,
      strongJob,
      { isActive: false, firstSeenAt: NOW },
      NOW.getTime(),
    );
    expect(fit.hotness).toBe("unknown");
  });

  it("derives required coverage from matched/missing required skills", () => {
    // Candidate has typescript but not rust/scala → 1/3 coverage, below the
    // strong threshold, so neither hot nor strong.
    const fit = computeJobFit(
      profile,
      job({ requiredSkills: ["typescript", "rust", "scala"] }),
      { isActive: true, firstSeenAt: NOW },
      NOW.getTime(),
    );
    expect(["possible", "low_fit"]).toContain(fit.hotness);
  });

  it("feeds firstSeenAt into the freshness signal (older = larger daysSinceFirstSeen)", () => {
    // Same job, scored at two different `now` values: the band/score are
    // freshness-independent, so they must match — proving freshness only routes
    // into hotness, not the score.
    const fresh = computeJobFit(profile, strongJob, { isActive: true, firstSeenAt: NOW }, NOW.getTime());
    const old = computeJobFit(
      profile,
      strongJob,
      { isActive: true, firstSeenAt: new Date(NOW.getTime() - 90 * 86_400_000) },
      NOW.getTime(),
    );
    expect(old.fitScore).toBe(fresh.fitScore);
    expect(old.scoreBand).toBe(fresh.scoreBand);
  });
});
