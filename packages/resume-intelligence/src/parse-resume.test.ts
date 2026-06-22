import { describe, expect, it } from "vitest";

import { JUNIOR_FRONTEND_RESUME, LOCATED_RESUME, SENIOR_ENGINEER_RESUME } from "./fixtures";
import { isCandidateProfile, parseResume } from "./parse-resume";
import { LOCAL_ENGINE_VERSION } from "./version";

const NOW = new Date("2024-01-01T00:00:00Z");

describe("parseResume — tech tiers", () => {
  const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });

  it("puts the most-frequent skills in Tier 1", () => {
    // typescript appears in summary, skills, and the current role; postgresql 3×.
    expect(profile.techTiers.tier1).toContain("typescript");
    expect(profile.techTiers.tier1).toContain("postgresql");
  });

  it("puts highlighted-but-infrequent skills in Tier 2", () => {
    // redis appears in the skills block + current role but only ~twice.
    const t2 = profile.techTiers.tier2;
    expect([...t2, ...profile.techTiers.tier1]).toContain("redis");
    expect(profile.techTiers.tier1).not.toContain("redis");
  });

  it("classifies every matched skill into exactly one tier", () => {
    const { tier1, tier2, tier3 } = profile.techTiers;
    const all = [...tier1, ...tier2, ...tier3];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("parseResume — titles", () => {
  it("reads the current title from the latest-ending position", () => {
    const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    expect(profile.titles.current?.toLowerCase()).toContain("senior backend engineer");
  });

  it("reads the target/headline from the top block", () => {
    const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    expect(profile.titles.target?.toLowerCase()).toContain("engineer");
  });
});

describe("parseResume — years of experience (display-only)", () => {
  it("sums tenure across positions, merging overlaps", () => {
    const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    // Jun 2016–Dec 2019 (~3.5y) + Jan 2020–Jan 2024 (4y) ≈ 7.5y.
    expect(profile.totalYearsExperience).toBeGreaterThan(6.5);
    expect(profile.totalYearsExperience).toBeLessThan(8.5);
  });

  it("buckets experience by role family + seniority", () => {
    const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    const senior = profile.roleBuckets.find((b) => b.seniority === "senior");
    expect(senior?.roleFamily).toBe("engineering");
  });
});

describe("parseResume — education (display-only)", () => {
  it("extracts degree level and field", () => {
    const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
    expect(profile.education[0]?.degreeLevel).toBe("bachelor");
    expect(profile.education[0]?.field?.toLowerCase()).toContain("computer science");
  });
});

describe("parseResume — location (Hot Jobs country filter)", () => {
  it("extracts an ISO country code from the resume header", () => {
    expect(parseResume(LOCATED_RESUME, { now: NOW }).location.country).toBe("DE");
  });

  it("is null when no location is present", () => {
    expect(parseResume(JUNIOR_FRONTEND_RESUME, { now: NOW }).location.country).toBeNull();
  });
});

describe("parseResume — robustness", () => {
  it("handles a sparse resume without throwing and lowers confidence", () => {
    const profile = parseResume(JUNIOR_FRONTEND_RESUME, { now: NOW });
    expect(isCandidateProfile(profile)).toBe(true);
    expect(profile.titles.current?.toLowerCase()).toContain("frontend developer");
    expect(profile.version).toBe(LOCAL_ENGINE_VERSION);
  });

  it("returns an empty-but-valid profile for empty input", () => {
    const profile = parseResume("", { now: NOW });
    expect(isCandidateProfile(profile)).toBe(true);
    expect(profile.totalYearsExperience).toBeNull();
    expect(profile.techTiers.tier1).toHaveLength(0);
  });
});
