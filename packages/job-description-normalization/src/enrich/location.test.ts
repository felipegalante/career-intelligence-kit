import { describe, expect, it } from "vitest";

import { parseLocation } from "./location";

describe("parseLocation", () => {
  it("returns all null for empty / remote-only", () => {
    expect(parseLocation(null)).toEqual({ country: null, region: null, city: null });
    expect(parseLocation("Remote")).toEqual({ country: null, region: null, city: null });
  });

  it("parses US city + state", () => {
    expect(parseLocation("San Francisco, CA")).toEqual({
      country: "US",
      region: "CA",
      city: "San Francisco",
    });
  });

  it("parses city + state + country", () => {
    expect(parseLocation("New York, NY, USA")).toEqual({
      country: "US",
      region: "NY",
      city: "New York",
    });
  });

  it("normalizes country names/codes to ISO-2", () => {
    expect(parseLocation("London, UK")).toEqual({ country: "GB", region: null, city: "London" });
    expect(parseLocation("Berlin, Germany")).toEqual({ country: "DE", region: null, city: "Berlin" });
    expect(parseLocation("Bengaluru, India")).toEqual({ country: "IN", region: null, city: "Bengaluru" });
  });

  it("handles 'Remote - US' and non-US region", () => {
    expect(parseLocation("Remote - US")).toEqual({ country: "US", region: null, city: null });
    expect(parseLocation("Toronto, ON, Canada")).toEqual({
      country: "CA",
      region: "ON",
      city: "Toronto",
    });
  });

  it("leaves country null for a bare city", () => {
    expect(parseLocation("San Francisco")).toEqual({ country: null, region: null, city: "San Francisco" });
  });

  // M6-S13: real ATS strings the original parser silently dropped to country=null.
  describe("M6-S13 hardening — real-world phrasings", () => {
    it.each([
      ["United States (Remote)", "US"],
      ["United States (remote)", "US"],
      ["Netherlands (remote)", "NL"],
      ["Canada (Remote)", "CA"],
      ["Canada (remote)", "CA"],
      ["Canada - Remote (ON, AB, BC, or NS Only)", "CA"],
      ["Remote in the US", "US"],
      ["Remote in the USA", "US"],
      ["Remote in the United States", "US"],
      ["Remote in the UK", "GB"],
      ["Remote in the United Kingdom", "GB"],
      ["Remote in Canada", "CA"],
      ["Remote from Brazil", "BR"],
      ["Remote across the US", "US"],
      ["Remote, US", "US"],
      ["Remote - Canada", "CA"],
      ["Remote — India", "IN"],
      ["Brazil", "BR"],
      ["India", "IN"],
      ["Mexico", "MX"],
      ["Winnipeg Manitoba, Canada", "CA"],
      ["Canada - Toronto", "CA"],
    ])("extracts country from %p as %p", (input, country) => {
      expect(parseLocation(input).country).toBe(country);
    });

    it.each([
      "Remote",
      "remote",
      "Anywhere",
      "Worldwide",
      "North America",
      // Truly arrangement-only — no country signal.
    ])("leaves country null for arrangement-only %p", (input) => {
      expect(parseLocation(input).country).toBeNull();
    });

    it("does not invent country from parenthesized arrangement on a US state row", () => {
      expect(parseLocation("California (Remote)")).toEqual({
        country: "US",
        region: "CA",
        city: null,
      });
    });

    it("Canada-only US-state-name collision still resolves to Canada when explicit", () => {
      // "Georgia" is also a country but the parser leans state-code; users that
      // mean the country must spell it: "Georgia (Tbilisi)" stays a state. This
      // is intentional, documented in the ambiguity note. Lock the behavior.
      expect(parseLocation("Atlanta, Georgia").country).toBe("US");
      expect(parseLocation("Toronto, Canada").country).toBe("CA");
    });
  });
});
