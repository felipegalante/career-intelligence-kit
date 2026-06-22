import { describe, expect, it } from "vitest";

import { normalizeTitle } from "./title";

describe("normalizeTitle", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(normalizeTitle(null)).toBe("");
    expect(normalizeTitle(undefined)).toBe("");
    expect(normalizeTitle("   ")).toBe("");
  });

  it("strips parenthetical/bracketed requisition ids", () => {
    expect(normalizeTitle("Senior Software Engineer (R12345)")).toBe("Senior Software Engineer");
    expect(normalizeTitle("Data Engineer [REQ-2024-1]")).toBe("Data Engineer");
  });

  it("strips standalone hash ids", () => {
    expect(normalizeTitle("Data Scientist #4567")).toBe("Data Scientist");
  });

  it("strips emoji", () => {
    expect(normalizeTitle("🚀 Staff Engineer")).toBe("Staff Engineer");
  });

  it("strips trailing locations after a separator", () => {
    expect(normalizeTitle("Product Manager - New York, NY")).toBe("Product Manager");
    expect(normalizeTitle("Account Executive — San Francisco, CA")).toBe("Account Executive");
    expect(normalizeTitle("Senior Designer | Remote")).toBe("Senior Designer");
  });

  it("strips parenthetical locations", () => {
    expect(normalizeTitle("Marketing Lead (Remote)")).toBe("Marketing Lead");
    expect(normalizeTitle("Engineer (San Francisco, CA)")).toBe("Engineer");
  });

  it("keeps non-location parentheticals (no digits, not a location)", () => {
    expect(normalizeTitle("Backend Engineer (Go)")).toBe("Backend Engineer (Go)");
  });

  it("keeps multiple non-location segments", () => {
    expect(normalizeTitle("Engineer - Backend - NYC, NY")).toBe("Engineer - Backend");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeTitle("  Senior   Engineer  ")).toBe("Senior Engineer");
  });

  it("passes a clean title through unchanged", () => {
    expect(normalizeTitle("Senior Software Engineer")).toBe("Senior Software Engineer");
  });

  it("falls back to the raw title when cleanup would empty it", () => {
    expect(normalizeTitle("(12345)")).toBe("(12345)");
  });
});
