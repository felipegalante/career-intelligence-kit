import { SKILL_DICTIONARY, type SkillEntry } from "@career-intelligence/job-description-normalization";

// Resume skill matcher. The job extractor (`extractSkills`) is
// section-driven (Requirements / Preferred / body) and returns a presence Set —
// that's the wrong shape for resume tiering, which needs **counts** (frequency)
// and **first position** (highlighted at the top vs. buried). So we reuse the
// shared `SKILL_DICTIONARY` and the same token-boundary matching rules, but
// surface occurrence counts + first offset instead.

export interface SkillMatch {
  /** `skills.normalized_name`. */
  normalizedName: string;
  /** Display name. */
  name: string;
  /** Total alias occurrences across the searched text. */
  count: number;
  /** Character offset of the first occurrence (for highlight-zone checks). */
  firstOffset: number;
}

// One combined, global, token-boundary regex per dictionary entry (all aliases
// alternated). Boundaries are alphanumeric-only so "c++"/"node.js" match and
// embedded matches don't fire ("reactive" ≠ react). Built once at module load.
const ENTRY_REGEXES: Array<{ entry: SkillEntry; regex: RegExp }> = SKILL_DICTIONARY.map((entry) => {
  const alternation = entry.aliases
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return {
    entry,
    regex: new RegExp(`(?<![a-zA-Z0-9])(?:${alternation})(?![a-zA-Z0-9])`, "gi"),
  };
});

/** All dictionary skills found in `text`, with occurrence counts + first offset. */
export function matchSkills(text: string | null | undefined): SkillMatch[] {
  const out: SkillMatch[] = [];
  if (!text || text.trim() === "") return out;
  for (const { entry, regex } of ENTRY_REGEXES) {
    regex.lastIndex = 0;
    let count = 0;
    let firstOffset = -1;
    for (const m of text.matchAll(regex)) {
      count += 1;
      if (firstOffset === -1) firstOffset = m.index ?? 0;
    }
    if (count > 0) {
      out.push({ normalizedName: entry.normalizedName, name: entry.name, count, firstOffset });
    }
  }
  return out;
}

/** Normalized names of dictionary skills present in `text` (presence only). */
export function matchSkillNames(text: string | null | undefined): Set<string> {
  return new Set(matchSkills(text).map((m) => m.normalizedName));
}
