import { describe, expect, it } from "vitest";

import { inferSeniority, normalizeSeniority } from "./seniority";

describe("inferSeniority", () => {
  it("infers from clear title tokens", () => {
    expect(inferSeniority("Software Engineering Intern")).toBe("intern");
    expect(inferSeniority("VP of Engineering")).toBe("exec");
    expect(inferSeniority("Head of Product")).toBe("exec");
    expect(inferSeniority("Principal Engineer")).toBe("principal");
    expect(inferSeniority("Staff Software Engineer")).toBe("staff");
    expect(inferSeniority("Engineering Lead")).toBe("lead");
    expect(inferSeniority("Senior Backend Engineer")).toBe("senior");
    expect(inferSeniority("Junior Developer")).toBe("junior");
    expect(inferSeniority("Associate Product Manager")).toBe("junior");
    expect(inferSeniority("Mid-Level Engineer")).toBe("mid");
  });

  it("prefers the more specific level token", () => {
    expect(inferSeniority("Senior Staff Engineer")).toBe("staff");
  });

  it("leaves low-confidence titles null (not guessed)", () => {
    expect(inferSeniority("Software Engineer")).toBeNull();
    expect(inferSeniority(null)).toBeNull();
  });

  it("uses a conservative years-of-experience fallback from the description", () => {
    expect(inferSeniority("Software Engineer", "Requires 3 years of experience")).toBe("mid");
    expect(inferSeniority("Software Engineer", "1 year of experience")).toBe("junior");
    expect(inferSeniority("Software Engineer", "8+ years of experience")).toBeNull();
  });
});

describe("normalizeSeniority", () => {
  it("maps structured/free-text tokens to the canonical union", () => {
    expect(normalizeSeniority("internship")).toBe("intern");
    expect(normalizeSeniority("entry-level")).toBe("junior");
    expect(normalizeSeniority("associate")).toBe("junior");
    expect(normalizeSeniority("mid-level")).toBe("mid");
    expect(normalizeSeniority("senior-level")).toBe("senior");
    expect(normalizeSeniority("executive")).toBe("exec");
  });

  it("returns null for unknown/absent", () => {
    expect(normalizeSeniority(null)).toBeNull();
    expect(normalizeSeniority("rockstar")).toBeNull();
  });
});
