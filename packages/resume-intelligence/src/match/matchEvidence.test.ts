import type { JobGate, RequiredSkill } from "@career-intelligence/job-description-normalization";
import { describe, expect, it } from "vitest";

import type { ResumeEvidence } from "../evidence";

import { matchEvidence, type MatchJobInput, type MatchResumeInput } from "./matchEvidence";

const evidence: ResumeEvidence[] = [
  {
    id: "ev-1",
    text: "Architected and owned the billing platform on Node.js with event-driven workflows.",
    source: "experience",
    skills: ["nodejs", "event-driven", "typescript"],
    domains: ["billing_payments"],
    actionVerbs: ["architected", "owned"],
    metrics: [],
    senioritySignals: ["architecture", "ownership"],
    evidenceStrength: 3.8,
    recencyScore: 1,
  },
];

const resume: MatchResumeInput = {
  skills: ["nodejs", "event-driven", "typescript", "postgresql"],
  evidence,
  seniorityLevel: "senior",
  totalYears: 8,
};

const job: MatchJobInput = {
  skills: [
    { skillId: "nodejs", importance: "mandatory" },
    { skillId: "kafka", importance: "preferred" },
    { skillId: "cobol", importance: "preferred" },
  ] satisfies RequiredSkill[],
  domains: ["billing_payments", "compliance"],
  seniorityLevel: "staff",
  requiredYears: 5,
  gates: [
    { id: "required_years", label: "Minimum years", text: "5+ years", value: 5 },
    { id: "work_authorization", label: "Work authorization", text: "Authorized to work" },
  ] satisfies JobGate[],
};

describe("matchEvidence — skills", () => {
  const result = matchEvidence(resume, job);

  it("gives an exact match full credit, backed by its strongest evidence", () => {
    const node = result.skills.find((s) => s.skillId === "nodejs")!;
    expect(node.matchType).toBe("exact");
    expect(node.credit).toBe(1);
    expect(node.evidenceStrength).toBe(3.8);
    expect(node.recency).toBe(1);
  });

  it("gives adjacent (partial) credit when a related skill is present (Kafka → event-driven)", () => {
    const kafka = result.skills.find((s) => s.skillId === "kafka")!;
    expect(kafka.matchType).toBe("adjacent");
    expect(kafka.credit).toBeGreaterThan(0);
    expect(kafka.credit).toBeLessThan(1);
    expect(kafka.via).toBe("event-driven");
  });

  it("marks a truly absent skill as missing", () => {
    const cobol = result.skills.find((s) => s.skillId === "cobol")!;
    expect(cobol.matchType).toBe("missing");
    expect(cobol.credit).toBe(0);
  });
});

describe("matchEvidence — domains", () => {
  const result = matchEvidence(resume, job);

  it("matches an exact domain and gives adjacent credit to a related one", () => {
    const billing = result.domains.find((d) => d.domainId === "billing_payments")!;
    expect(billing.matchType).toBe("exact");
    const compliance = result.domains.find((d) => d.domainId === "compliance")!;
    expect(compliance.matchType).toBe("adjacent");
    expect(compliance.credit).toBeGreaterThan(0);
    expect(compliance.via).toBe("billing_payments");
  });
});

describe("matchEvidence — seniority", () => {
  it("lifts a Senior with staff-level responsibility signals", () => {
    const { seniority } = matchEvidence(resume, job);
    expect(seniority.signalBoosted).toBe(true);
    expect(seniority.candidateScore).toBe(4); // senior(3) + 1
    expect(seniority.fit).not.toBeNull();
  });

  it("does not boost without enough staff signals", () => {
    const plain: MatchResumeInput = {
      ...resume,
      evidence: [{ ...evidence[0]!, senioritySignals: ["mentorship"] }],
    };
    const { seniority } = matchEvidence(plain, job);
    expect(seniority.signalBoosted).toBe(false);
    expect(seniority.candidateScore).toBe(3);
  });
});

describe("matchEvidence — gates", () => {
  it("passes a met years gate and reports unverifiable gates as unknown", () => {
    const { gates } = matchEvidence(resume, job);
    expect(gates.find((g) => g.id === "required_years")?.status).toBe("pass");
    expect(gates.find((g) => g.id === "work_authorization")?.status).toBe("unknown");
  });

  it("soft-fails when just short and fails when far below", () => {
    const close = matchEvidence({ ...resume, totalYears: 4 }, job);
    expect(close.gates.find((g) => g.id === "required_years")?.status).toBe("soft_fail");
    const farBelow = matchEvidence({ ...resume, totalYears: 1 }, job);
    expect(farBelow.gates.find((g) => g.id === "required_years")?.status).toBe("fail");
  });

  it("reports unknown years gate when candidate tenure is unknown", () => {
    const unknown = matchEvidence({ ...resume, totalYears: null }, job);
    expect(unknown.gates.find((g) => g.id === "required_years")?.status).toBe("unknown");
  });
});

describe("matchEvidence — determinism", () => {
  it("returns a deep-equal result for identical input", () => {
    expect(matchEvidence(resume, job)).toEqual(matchEvidence(resume, job));
  });
});
