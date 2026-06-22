import type { JobGate, RequiredSkill } from "@career-intelligence/job-description-normalization";
import { describe, expect, it } from "vitest";

import type { ResumeEvidence } from "../evidence";
import { matchEvidence, type MatchJobInput, type MatchResumeInput } from "../match/matchEvidence";

import { buildGapAnalysis } from "./buildGapAnalysis";
import { buildTailoringHints } from "./buildTailoringHints";

const evidence: ResumeEvidence[] = [
  {
    id: "ev-1",
    text: "Architected the billing platform on Node.js with event-driven workflows.",
    source: "experience",
    skills: ["nodejs", "event-driven"],
    domains: ["billing_payments"],
    actionVerbs: ["architected"],
    metrics: [],
    senioritySignals: ["architecture", "ownership"],
    evidenceStrength: 3.5,
    recencyScore: 1,
  },
  {
    // typescript only appears in a skills list → weak evidence.
    id: "ev-2",
    text: "TypeScript, Go, SQL",
    source: "skills",
    skills: ["typescript"],
    domains: [],
    actionVerbs: [],
    metrics: [],
    senioritySignals: [],
    evidenceStrength: 1.0,
    recencyScore: 0.5,
  },
];

const resume: MatchResumeInput = {
  skills: ["nodejs", "event-driven", "typescript"],
  evidence,
  seniorityLevel: "senior",
  totalYears: 8,
};

const job: MatchJobInput = {
  skills: [
    { skillId: "nodejs", importance: "mandatory" }, // exact, strong
    { skillId: "typescript", importance: "mandatory" }, // exact, weak evidence
    { skillId: "kafka", importance: "preferred" }, // adjacent (event-driven)
    { skillId: "cobol", importance: "mandatory" }, // missing
  ] satisfies RequiredSkill[],
  domains: ["billing_payments", "compliance"], // exact, adjacent
  seniorityLevel: "staff", // candidate below
  requiredYears: null,
  gates: [] satisfies JobGate[],
};

const gaps = buildGapAnalysis({ matches: matchEvidence(resume, job) });

describe("buildGapAnalysis", () => {
  const byType = (t: string) => gaps.filter((g) => g.type === t);

  it("classifies a truly missing mandatory skill as critical", () => {
    const g = byType("missing_mandatory_skill").find((x) => x.requirement === "COBOL");
    expect(g?.severity).toBe("critical");
    expect(g?.addOnlyIfTrue).toContain("COBOL");
  });

  it("flags an adjacent-only skill as keyword_not_explicit (not missing)", () => {
    const g = byType("keyword_not_explicit").find((x) => x.requirement === "Kafka");
    expect(g).toBeDefined();
    expect(g?.explanation).toMatch(/adjacent/i);
  });

  it("flags a skills-list-only skill as weak evidence", () => {
    expect(byType("weak_evidence").some((g) => g.requirement === "TypeScript")).toBe(true);
  });

  it("emits a context gap for an adjacent domain and a seniority gap", () => {
    // billing_payments is exact (no gap); compliance is adjacent → context_gap.
    const ctx = byType("context_gap").find((g) => /compliance/i.test(g.requirement));
    expect(ctx).toBeDefined();
    expect(gaps.some((g) => g.type === "seniority_gap")).toBe(true);
  });

  it("never fabricates — every addOnlyIfTrue gap frames it as conditional", () => {
    for (const g of gaps) {
      if (g.addOnlyIfTrue.length > 0) {
        expect(g.recommendation.toLowerCase()).toMatch(/only if|if you have|if accurate|if it applies/);
      }
    }
  });
});

describe("buildTailoringHints", () => {
  const recs = buildTailoringHints(gaps);

  it("maps gaps to recommendation types and sorts by priority", () => {
    expect(recs.length).toBe(gaps.length);
    expect(recs[0]?.priority).toBe("high"); // critical missing-mandatory leads
    const ranks = recs.map((r) => ({ high: 0, medium: 1, low: 2 })[r.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("never tells the candidate to claim a skill they lack", () => {
    const adds = recs.filter((r) => r.type === "add_keyword_if_true");
    expect(adds.length).toBeGreaterThan(0);
    for (const r of adds) {
      expect(r.recommendation.toLowerCase()).toMatch(/only if|if you (genuinely )?have|if accurate/);
    }
  });
});
