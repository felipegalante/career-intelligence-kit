// Requirement-phrase taxonomy (M9-S1, spec §9). Classifies a single requirement
// line by how strongly the job demands it — mandatory vs. merely preferred vs. a
// responsibility statement. The job requirement graph (M9-S2) tags each line, and
// the rubric (M9-S5) weights matches by importance (a missing mandatory hurts far
// more than a missing bonus).
//
// This is line-level intent classification, complementary to the section-level
// bucketing already done by `extractSkills` (Requirements / Preferred / body).

export type RequirementImportance =
  | "mandatory"
  | "strong_preferred"
  | "preferred"
  | "bonus"
  | "responsibility"
  | "inferred";

interface ImportanceRule {
  importance: RequirementImportance;
  patterns: RegExp[];
}

// Order matters: more specific / stronger intents are checked first so a line like
// "strong experience required" reads as mandatory, and "nice to have" as preferred
// even though it also contains "have".
const REQUIREMENT_RULES: ImportanceRule[] = [
  {
    importance: "mandatory",
    patterns: [
      /\bmust[\s-]?have\b/i,
      /\brequired\b/i,
      /\bwe require\b/i,
      /\byou (?:must|need to) have\b/i,
      /\bminimum (?:of |requirement)/i,
      /\bneed to have\b/i,
      /\bnon[\s-]?negotiable\b/i,
    ],
  },
  {
    importance: "strong_preferred",
    patterns: [
      /\bstrong (?:experience|background|proficiency)\b/i,
      /\bdeep (?:experience|knowledge|expertise)\b/i,
      /\bproven (?:experience|track record)\b/i,
      /\bextensive experience\b/i,
      /\bexpertise in\b/i,
      /\bhighly proficient\b/i,
    ],
  },
  {
    importance: "preferred",
    patterns: [
      /\bpreferred\b/i,
      /\bnice[\s-]?to[\s-]?have\b/i,
      /\bideally\b/i,
      /\bfamiliarity with\b/i,
      /\bbonus\b/i,
      /\ba plus\b/i,
      /\bgood[\s-]?to[\s-]?have\b/i,
      /\bexposure to\b/i,
    ],
  },
  {
    importance: "responsibility",
    patterns: [
      /\byou will\b/i,
      /\byou'll\b/i,
      /\bresponsibilities\b/i,
      /\b(?:own|build|design|lead|drive|partner with|collaborate|develop|deliver)\b/i,
    ],
  },
];

/** Classify one requirement/responsibility line by demand strength. */
export function classifyRequirementImportance(text: string): RequirementImportance {
  for (const rule of REQUIREMENT_RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.importance;
  }
  return "inferred";
}

/** Relative weight of a requirement's importance (spec §18.2), in (0,1]. */
export function requirementImportanceWeight(importance: RequirementImportance): number {
  switch (importance) {
    case "mandatory":
      return 1.0;
    case "strong_preferred":
      return 0.8;
    case "preferred":
      return 0.55;
    case "responsibility":
      return 0.5;
    case "bonus":
      return 0.25;
    case "inferred":
      return 0.35;
  }
}
