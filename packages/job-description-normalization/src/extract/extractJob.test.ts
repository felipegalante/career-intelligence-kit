import { describe, expect, it } from "vitest";

import { extractJobProfile, splitJobSections } from "./extractJob";

// A realistic cleaned JD (shape: headings on their own line, "- " bullets).
const BACKEND_JD = `Senior Backend Engineer

About the role
We are building a billing platform for B2B SaaS companies.

What you'll do
- Own the subscription lifecycle and entitlements end-to-end
- Partner with product to design new payment workflows

Requirements
- Must have 5+ years of backend experience with Node.js
- Strong experience with PostgreSQL and API design
- Authorized to work in the United States

Preferred
- Familiarity with Kafka or event-driven architecture is a plus
- Exposure to Stripe or Chargebee

What we offer
- Competitive salary and equity
`;

describe("splitJobSections", () => {
  it("labels sections by heading", () => {
    const sections = splitJobSections(BACKEND_JD);
    const names = sections.map((s) => s.name);
    expect(names).toContain("responsibilities");
    expect(names).toContain("requirements");
    expect(names).toContain("preferred");
    // "What we offer" is a compensation/benefits header, not a requirement.
    expect(names).toContain("compensation");
  });
});

describe("extractJobProfile", () => {
  const profile = extractJobProfile(BACKEND_JD, { title: "Senior Backend Engineer" });

  it("infers title-derived seniority and role family", () => {
    expect(profile.seniority).toBe("senior");
    expect(profile.roleFamily).toBe("engineering");
  });

  it("classifies requirement importance by section + phrasing", () => {
    const node = profile.requirements.find((r) => r.skills.includes("nodejs"));
    expect(node?.importance).toBe("mandatory"); // "Must have" in Requirements
    const kafka = profile.requirements.find((r) => r.skills.includes("kafka"));
    expect(kafka?.importance).toBe("preferred"); // Preferred section + "is a plus"
  });

  it("aggregates skills at their strongest importance", () => {
    const byId = new Map(profile.skills.map((s) => [s.skillId, s.importance]));
    // A Requirements-section line is mandatory even when phrased "strong experience"
    // (the section floor and the phrasing both point at a hard requirement).
    expect(byId.get("nodejs")).toBe("mandatory");
    expect(byId.get("postgresql")).toBe("mandatory");
    // Preferred-section skill stays preferred.
    expect(byId.get("kafka")).toBe("preferred");
  });

  it("captures domains even without the literal domain phrase", () => {
    expect(profile.domains).toContain("billing_payments");
    expect(profile.domains).toContain("b2b_saas");
  });

  it("surfaces responsibility-based seniority signals", () => {
    const owns = profile.responsibilities.find((r) => r.senioritySignals.includes("ownership"));
    expect(owns).toBeDefined();
  });

  it("extracts explicit gates only (years + work authorization)", () => {
    const ids = profile.gates.map((g) => g.id);
    expect(ids).toContain("required_years");
    expect(ids).toContain("work_authorization");
    expect(profile.requiredYears).toBe(5);
    // No protected-attribute inference.
    expect(profile.gates.every((g) => g.id !== ("gender" as never))).toBe(true);
  });

  it("is deterministic — identical input yields a deep-equal profile", () => {
    const again = extractJobProfile(BACKEND_JD, { title: "Senior Backend Engineer" });
    expect(again).toEqual(profile);
  });

  it("degrades gracefully on empty input", () => {
    const empty = extractJobProfile("", { title: "" });
    expect(empty.requirements).toEqual([]);
    expect(empty.skills).toEqual([]);
    expect(empty.gates).toEqual([]);
  });
});
