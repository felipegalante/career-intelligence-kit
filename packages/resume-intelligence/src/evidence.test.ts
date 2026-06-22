import { describe, expect, it } from "vitest";

import { SENIOR_ENGINEER_RESUME } from "./fixtures";
import { parseResume } from "./parse-resume";
import { extractMetrics, scoreEvidenceStrength } from "./score/scoreEvidence";
import { scoreRecency } from "./score/scoreRecency";

const NOW = new Date("2024-06-01");

describe("scoreEvidenceStrength", () => {
  it("ranks an experience bullet with verbs/metrics/context above a bare skills line", () => {
    const skillsLine = scoreEvidenceStrength({
      source: "skills",
      actionVerbs: [],
      metrics: [],
      domains: [],
      senioritySignals: [],
    });
    const strongBullet = scoreEvidenceStrength({
      source: "experience",
      actionVerbs: ["architected", "scaled"],
      metrics: ["40%"],
      domains: ["billing_payments"],
      senioritySignals: ["architecture"],
    });
    expect(strongBullet).toBeGreaterThan(skillsLine);
    expect(strongBullet).toBeLessThanOrEqual(5);
  });
});

describe("scoreRecency", () => {
  it("rewards recent over old, neutral when undatable", () => {
    expect(scoreRecency(undefined)).toBe(0.5);
    expect(scoreRecency({ start: "2023-01-01", end: null }, NOW)).toBe(1.0); // ongoing
    expect(scoreRecency({ start: "2010-01-01", end: "2012-01-01" }, NOW)).toBe(0.4); // ~12y ago
  });
});

describe("extractMetrics", () => {
  it("captures percentages, money, and multipliers", () => {
    expect(extractMetrics("Reduced latency by 40% and saved $2M, 3x throughput")).toEqual(
      expect.arrayContaining(["40%", "$2M", "3x"]),
    );
    expect(extractMetrics("No numbers here")).toEqual([]);
  });
});

describe("parseResume evidence graph", () => {
  const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
  const evidence = profile.evidence ?? [];

  it("populates a non-empty evidence graph across sources", () => {
    expect(evidence.length).toBeGreaterThan(0);
    const sources = new Set(evidence.map((e) => e.source));
    expect(sources.has("experience")).toBe(true);
    expect(sources.has("skills")).toBe(true);
  });

  it("attaches skills + action verbs to experience bullets", () => {
    const bullet = evidence.find((e) => e.source === "experience" && e.skills.includes("kubernetes"));
    expect(bullet).toBeDefined();
    expect(bullet?.skills).toEqual(expect.arrayContaining(["typescript", "kubernetes", "aws"]));
    expect(bullet?.actionVerbs.length).toBeGreaterThan(0);
  });

  it("experience evidence outscores skills-list evidence in strength", () => {
    const exp = evidence.filter((e) => e.source === "experience");
    const skills = evidence.filter((e) => e.source === "skills");
    const maxExp = Math.max(...exp.map((e) => e.evidenceStrength));
    const maxSkills = Math.max(...skills.map((e) => e.evidenceStrength));
    expect(maxExp).toBeGreaterThan(maxSkills);
  });

  it("scores ongoing roles more recent than ended roles", () => {
    const exp = evidence.filter((e) => e.source === "experience");
    expect(exp.some((e) => e.recencyScore === 1)).toBe(true); // Acme — Present
    expect(exp.some((e) => e.recencyScore <= 0.8)).toBe(true); // Globex — 2016–2019
  });

  it("is deterministic — same input + now yields a deep-equal graph", () => {
    const again = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    expect(again.evidence).toEqual(evidence);
  });
});
