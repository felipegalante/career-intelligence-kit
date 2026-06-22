import { describe, expect, it } from "vitest";

import {
  NullFitScoringProvider,
  RubricCompilerStub,
  selectFitScoringProvider,
} from "./provider";
import { FitScoringUnavailableError, type FitScoringProvider } from "./types";

const fakeLocal: FitScoringProvider = {
  describe: () => ({ engineVersion: "local@0", configVersion: "cfg", scoringMode: "lightweight_local" }),
  health: () =>
    Promise.resolve({ available: true, provider: "local", scoringMode: "lightweight_local" }),
  scoreBatch: () =>
    Promise.resolve({
      results: [],
      rubricEngineVersion: "local@0",
      rubricConfigVersion: "cfg",
      scoringMode: "lightweight_local",
    }),
  generateReport: () => Promise.resolve({ available: true }),
};

const fakeRubric: FitScoringProvider = {
  ...fakeLocal,
  health: () =>
    Promise.resolve({ available: true, provider: "rubric", scoringMode: "lightweight_score" }),
};

describe("selectFitScoringProvider (§23.11)", () => {
  it("prefers the rubric provider when enabled + healthy", async () => {
    const p = selectFitScoringProvider({
      rubricEnabled: true,
      rubricHealthy: true,
      rubricProvider: fakeRubric,
      localProvider: fakeLocal,
    });
    expect((await p.health()).provider).toBe("rubric");
  });

  it("falls back to the local provider when rubric is disabled", async () => {
    const p = selectFitScoringProvider({ rubricEnabled: false, localProvider: fakeLocal });
    expect((await p.health()).provider).toBe("local");
  });

  it("falls back to the local provider when rubric is enabled but unhealthy", async () => {
    const p = selectFitScoringProvider({
      rubricEnabled: true,
      rubricHealthy: false,
      rubricProvider: fakeRubric,
      localProvider: fakeLocal,
    });
    expect((await p.health()).provider).toBe("local");
  });

  it("returns a null provider when nothing is configured", async () => {
    const p = selectFitScoringProvider({ rubricEnabled: false });
    expect((await p.health()).available).toBe(false);
  });
});

describe("unavailable providers never throw on health()", () => {
  it("RubricCompilerStub reports unavailable without throwing", async () => {
    const h = await new RubricCompilerStub().health();
    expect(h.available).toBe(false);
    expect(h.provider).toBe("rubric-compiler");
  });

  it("NullFitScoringProvider reports unavailable and rejects scoreBatch with a typed error", async () => {
    const p = new NullFitScoringProvider();
    expect((await p.health()).available).toBe(false);
    await expect(
      p.scoreBatch({ resumeProfileId: "r", resumeText: "", jobs: [] }),
    ).rejects.toBeInstanceOf(FitScoringUnavailableError);
  });

  it("generateReport degrades to an unavailable result rather than throwing", async () => {
    const r = await new RubricCompilerStub().generateReport({
      resumeProfileId: "r",
      jobPostingId: "j",
      resumeText: "",
      job: { id: "j", title: "x", requiredSkills: [], preferredSkills: [] },
    });
    expect(r.available).toBe(false);
  });
});
