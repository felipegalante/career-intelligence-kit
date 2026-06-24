import { SKILL_DICTIONARY, type SkillEntry } from "./skills-dictionary";

// Deterministic skill extraction (–17.7).
// Splits the cleaned posting text (from, which puts headings on their own
// line and list items as `"- "` bullets) into required / preferred / body
// sections, then alias-matches the seed dictionary against each. A skill is
// assigned a single `requirementType` — the strongest section it appears in:
//   required (0.9) > preferred (0.75) > inferred (body, 0.5).

export type RequirementType = "required" | "preferred" | "inferred";

export interface ExtractedSkill {
  skill: SkillEntry;
  requirementType: RequirementType;
  confidence: number;
}

const CONFIDENCE: Record<RequirementType, number> = {
  required: 0.9,
  preferred: 0.75,
  inferred: 0.5,
};

// Section-header keywords. Preferred is checked first so "Preferred Qualifications"
// is not captured as a required section by the "qualifications" keyword.
const PREFERRED_HEADER =
  /\b(preferred|nice[\s-]?to[\s-]?have|bonus|good[\s-]?to[\s-]?have|desired|a plus|pluses)\b/i;
// "Neutral" sections close a requirements block — responsibilities, company
// culture, benefits, perks, and legal/EEO boilerplate are NOT required skills.
// Without these, a "Requirements" header would bleed into everything after it
// (e.g. a "How we work with AI" culture blurb tagged as a required skill).
// Checked before REQUIRED so "What you'll do" / "What we offer" don't match the
// broad `what you` / `what we` required rules.
const NEUTRAL_HEADER =
  /\b(responsibilities|the role|day[\s-]?to[\s-]?day|what you(?:'|’|\s)?ll (?:do|be doing|own|get|enjoy|love)|what you can expect|what to expect|what we offer|benefits?|perks?|compensation|pay (?:range|and benefits)|about (?:us|the (?:company|team|role)|our)|who we are|our (?:culture|values|team|approach|mission|story|benefits|process)|culture|how we work|why (?:you|join|work|our)|life at|equal[\s-]?opportunity|diversity|inclusion|accommodations?)\b/i;
const REQUIRED_HEADER =
  /\b(requirements?|required|qualifications?|must[\s-]?haves?|what you|what we|skills|who you are|about you)\b/i;

// Classify a line as a section header (short, non-bullet label), else null.
function classifyHeader(line: string): "required" | "preferred" | "neutral" | null {
  const raw = line.trim();
  if (raw === "" || raw.startsWith("- ")) return null; // bullets are content, not headers
  const label = raw.replace(/[:•\s-]+$/, "");
  if (label.length > 60 || label.split(/\s+/).length > 6) return null;
  if (PREFERRED_HEADER.test(label)) return "preferred";
  if (NEUTRAL_HEADER.test(label)) return "neutral";
  if (REQUIRED_HEADER.test(label)) return "required";
  return null;
}

// Build a token-boundary, case-insensitive matcher for one alias. Boundaries are
// alphanumeric only, so punctuated aliases ("c++", "c#", "node.js") match while
// trailing punctuation ("Kafka.") doesn't block, and embedded matches don't fire
// ("reactive" ≠ react, "postgresql" ≠ sql).
const aliasRegexCache = new Map<string, RegExp>();
function aliasRegex(alias: string): RegExp {
  let re = aliasRegexCache.get(alias);
  if (!re) {
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(?<![a-zA-Z0-9])${esc}(?![a-zA-Z0-9])`, "i");
    aliasRegexCache.set(alias, re);
  }
  return re;
}

// Normalized names of every dictionary skill that appears in `text`.
function matchSkills(text: string, dictionary: readonly SkillEntry[]): Set<string> {
  const found = new Set<string>();
  if (text.trim() === "") return found;
  for (const entry of dictionary) {
    if (entry.aliases.some((alias) => aliasRegex(alias).test(text))) {
      found.add(entry.normalizedName);
    }
  }
  return found;
}

/**
 * Normalized names of every dictionary skill present in `text` (presence only,
 * no section logic). Used by the job requirement graph to tag individual
 * requirement lines, where section bucketing has already happened upstream.
 */
export function matchSkillIds(
  text: string | null | undefined,
  dictionary: readonly SkillEntry[] = SKILL_DICTIONARY,
): string[] {
  return [...matchSkills(text ?? "", dictionary)];
}

export function extractSkills(
  text: string | null | undefined,
  dictionary: readonly SkillEntry[] = SKILL_DICTIONARY,
): ExtractedSkill[] {
  const byName = new Map<string, SkillEntry>(dictionary.map((e) => [e.normalizedName, e]));

  const buckets: Record<"required" | "preferred" | "body", string[]> = {
    required: [],
    preferred: [],
    body: [],
  };
  let mode: "required" | "preferred" | "body" = "body";
  for (const line of (text ?? "").split("\n")) {
    const header = classifyHeader(line);
    if (header) {
      // A neutral/closing header (responsibilities, culture, benefits, …) ends a
      // requirements block — fall back to body so its skills read as inferred.
      mode = header === "neutral" ? "body" : header;
      continue;
    }
    buckets[mode].push(line);
  }

  const sections: Array<[Set<string>, RequirementType]> = [
    [matchSkills(buckets.required.join("\n"), dictionary), "required"],
    [matchSkills(buckets.preferred.join("\n"), dictionary), "preferred"],
    [matchSkills(buckets.body.join("\n"), dictionary), "inferred"],
  ];

  const result = new Map<string, ExtractedSkill>();
  for (const [names, requirementType] of sections) {
    for (const normalizedName of names) {
      if (result.has(normalizedName)) continue; // stronger section already won
      const skill = byName.get(normalizedName);
      if (skill) {
        result.set(normalizedName, { skill, requirementType, confidence: CONFIDENCE[requirementType] });
      }
    }
  }
  return [...result.values()];
}
