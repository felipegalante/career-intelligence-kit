import type { Seniority } from "@career-intelligence/types";

// Seniority inference (M5-S2, §19.2). Deterministic patterns over the title, with
// a conservative years-of-experience fallback from the description. Returns `null`
// for low-confidence cases (never guessed) — left for a later LLM pass.
//

// Checked in priority order: the most specific / most senior token wins.
const TITLE_PATTERNS: Array<[Seniority, RegExp]> = [
  ["intern", /\bintern(ship)?\b/i],
  ["exec", /\b(chief|c[eft]o|coo|cmo|cpo|cxo|svp|evp|vp|vice\s*president|head\s+of|director)\b/i],
  ["principal", /\bprincipal\b/i],
  ["staff", /\bstaff\b/i],
  ["lead", /\blead\b/i],
  ["senior", /\b(senior|sr\.?|snr)\b/i],
  ["junior", /\b(junior|jr\.?|entry[\s-]?level|associate|new\s*grad(uate)?|graduate)\b/i],
  ["mid", /\bmid[\s-]?level\b/i],
];

function yearsOfExperience(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i);
  return m ? Number(m[1]) : null;
}

export function inferSeniority(
  title: string | null | undefined,
  description?: string | null,
): Seniority | null {
  const t = title ?? "";
  for (const [level, re] of TITLE_PATTERNS) {
    if (re.test(t)) return level;
  }
  // Conservative YoE fallback: only the unambiguous junior/mid bands.
  const yoe = yearsOfExperience(description);
  if (yoe !== null) {
    if (yoe <= 1) return "junior";
    if (yoe <= 5) return "mid";
  }
  return null;
}

// Normalize a structured/free-text seniority token (e.g. Breezy's `experience`
// mapping: internship / entry-level / associate / mid-level / senior-level /
// executive) to the canonical union. Unrecognized → `null`.
//
export function normalizeSeniority(value: string | null | undefined): Seniority | null {
  if (!value) return null;
  const k = String(value).toLowerCase();
  if (/intern/.test(k)) return "intern";
  if (/principal/.test(k)) return "principal";
  if (/staff/.test(k)) return "staff";
  if (/\blead\b/.test(k)) return "lead";
  if (/exec|chief|director|\bvp\b|vice\s*president|c-?level/.test(k)) return "exec";
  if (/senior|\bsr\b/.test(k)) return "senior";
  if (/junior|\bjr\b|entry|associate|graduate/.test(k)) return "junior";
  if (/mid|intermediate/.test(k)) return "mid";
  return null;
}
