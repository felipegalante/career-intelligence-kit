import type { ScoreableJob } from "@career-intelligence/fit-scoring";
import { describe, expect, it } from "vitest";

import { SENIOR_ENGINEER_RESUME } from "../fixtures";
import { parseResume } from "../parse-resume";
import { scoreJob } from "../score";

import { DEFAULT_SOFTWARE_ENGINEERING_RUBRIC } from "./scoreRubric";

const NOW = new Date("2024-01-01T00:00:00Z");
const profile = parseResume(SENIOR_ENGINEER_RESUME, { now: NOW });
const opts = { parseConfidence: profile.parseConfidence };

function job(over: Partial<ScoreableJob>): ScoreableJob {
  return {
    id: "j",
    title: "Senior Backend Engineer",
    metadata: { seniority: "senior" },
    requiredSkills: [],
    preferredSkills: [],
    ...over,
  };
}

describe("rubric structure", () => {
  it("has 6 dimensions whose weights total 100", () => {
    const total = DEFAULT_SOFTWARE_ENGINEERING_RUBRIC.reduce((s, d) => s + d.weight, 0);
    expect(DEFAULT_SOFTWARE_ENGINEERING_RUBRIC).toHaveLength(6);
    expect(total).toBe(100);
    // The dimension ids match the Job Match Report contract's breakdown keys.
    expect(DEFAULT_SOFTWARE_ENGINEERING_RUBRIC.map((d) => d.id)).toEqual([
      "technicalStack",
      "seniorityScope",
      "architecture",
      "stakeholderFit",
      "businessOrientation",
      "multiplierCommunication",
    ]);
  });

  it("attaches a dimension breakdown + classification to a scored job", () => {
    const r = scoreJob(profile, job({ requiredSkills: ["typescript", "postgresql"] }), opts);
    expect(r.breakdown?.dimensions).toHaveLength(6);
    expect(r.breakdown?.dimensions.every((d) => d.rawScore >= 0 && d.rawScore <= 1)).toBe(true);
    expect(r.classification).toBeDefined();
    expect(r.classification).toBe(r.breakdown?.classification);
  });

  it("produces an ATS score that rewards explicit required-skill coverage", () => {
    const covered = scoreJob(profile, job({ requiredSkills: ["typescript", "postgresql"] }), opts).atsScore!;
    const uncovered = scoreJob(profile, job({ requiredSkills: ["cobol", "fortran"] }), opts).atsScore!;
    expect(covered).toBeGreaterThan(uncovered);
    expect(covered).toBeLessThanOrEqual(100);
    expect(uncovered).toBeGreaterThanOrEqual(0);
  });
});

describe("rubric sensitivity (spec §27.4)", () => {
  it("gives adjacent-skill credit in core technical skills (Kafka via distributed systems)", () => {
    // The resume never says "Kafka" but does say "distributed systems" (a related
    // skill) → partial credit; COBOL has no resume relation → zero. This is the
    // core spec §25 behavior, measured on the dimension it affects.
    const tech = (j: ScoreableJob) =>
      scoreJob(profile, j, opts).breakdown!.dimensions.find((d) => d.id === "technicalStack")!.rawScore;
    const kafka = tech(job({ requiredSkills: ["kafka"] }));
    const cobol = tech(job({ requiredSkills: ["cobol"] }));
    // Kafka earns adjacency credit (via distributed systems); COBOL has no resume
    // relation, so the Technical Stack dimension scores strictly higher for Kafka.
    expect(kafka).toBeGreaterThan(cobol);
  });

  it("a missing mandatory skill costs more than a missing inferred one", () => {
    const missingMandatory = scoreJob(profile, job({ requiredSkills: ["typescript", "rust"] }), opts).overallScore;
    const missingInferred = scoreJob(
      profile,
      job({ requiredSkills: ["typescript"], inferredSkills: ["rust"] }),
      opts,
    ).overallScore;
    expect(missingInferred).toBeGreaterThan(missingMandatory);
  });

  it("adding a matched bonus skill never lowers the score", () => {
    const base = scoreJob(profile, job({ requiredSkills: ["typescript"] }), opts).overallScore;
    const withBonus = scoreJob(
      profile,
      job({ requiredSkills: ["typescript"], inferredSkills: ["kubernetes"] }),
      opts,
    ).overallScore;
    expect(withBonus).toBeGreaterThanOrEqual(base);
  });
});

describe("rubric gates", () => {
  it("evaluates an explicit years gate from the job description against tenure", () => {
    const r = scoreJob(
      profile,
      job({
        requiredSkills: ["typescript"],
        descriptionText: "Requirements\n- Must have 5+ years of backend experience\n- Authorized to work in the US",
      }),
      opts,
    );
    const years = r.gates?.find((g) => g.id === "required_years");
    expect(years?.status).toBe("pass"); // resume shows ~8y
    expect(r.gates?.some((g) => g.id === "work_authorization")).toBe(true);
  });
});

describe("rubric determinism", () => {
  it("returns a deep-equal result for identical input", () => {
    const j = job({ requiredSkills: ["typescript", "postgresql"], preferredSkills: ["redis"] });
    expect(scoreJob(profile, j, opts)).toEqual(scoreJob(profile, j, opts));
  });
});
