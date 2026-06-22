import { describe, expect, it } from "vitest";

import { classifyHotness, scoreBand } from "./hotness";

const base = {
  score: 90,
  missingHardGates: 0,
  isActive: true,
  daysSinceFirstSeen: 1,
  confidence: 0.9,
};

describe("classifyHotness (§23.9)", () => {
  it("returns unknown when inactive, regardless of score", () => {
    expect(classifyHotness({ ...base, isActive: false })).toBe("unknown");
  });

  it("returns possible when a gate is missing and no coverage is supplied (legacy veto)", () => {
    expect(classifyHotness({ ...base, missingHardGates: 1 })).toBe("possible");
  });

  it("lets a near-complete match (>=80% required) reach strong despite a missing gate", () => {
    expect(
      classifyHotness({ ...base, score: 80, missingHardGates: 1, requiredCoverage: 0.8 }),
    ).toBe("strong");
  });

  it("still blocks strong when required coverage is below 80%", () => {
    expect(
      classifyHotness({ ...base, score: 90, missingHardGates: 2, requiredCoverage: 0.5 }),
    ).toBe("possible");
  });

  it("reserves hot for full coverage; 80% coverage caps at strong", () => {
    expect(classifyHotness({ ...base, requiredCoverage: 0.8 })).toBe("strong");
    expect(classifyHotness({ ...base, requiredCoverage: 1 })).toBe("hot");
  });

  it("returns hot only when score>=85, fresh (<=14d) and confident (>=0.75)", () => {
    expect(classifyHotness(base)).toBe("hot");
    expect(classifyHotness({ ...base, score: 85, daysSinceFirstSeen: 14, confidence: 0.75 })).toBe(
      "hot",
    );
  });

  it("falls to strong when fresh/confidence gates for hot are not met but score>=75", () => {
    expect(classifyHotness({ ...base, daysSinceFirstSeen: 15 })).toBe("strong");
    expect(classifyHotness({ ...base, confidence: 0.74 })).toBe("strong");
    expect(classifyHotness({ ...base, score: 75 })).toBe("strong");
  });

  it("returns possible for 60..74 and low_fit below 60", () => {
    expect(classifyHotness({ ...base, score: 74 })).toBe("possible");
    expect(classifyHotness({ ...base, score: 60 })).toBe("possible");
    expect(classifyHotness({ ...base, score: 59 })).toBe("low_fit");
  });
});

describe("scoreBand", () => {
  it("bands by the same numeric cuts as hotness", () => {
    expect(scoreBand(85)).toBe("excellent");
    expect(scoreBand(75)).toBe("strong");
    expect(scoreBand(60)).toBe("moderate");
    expect(scoreBand(59)).toBe("weak");
  });
});
