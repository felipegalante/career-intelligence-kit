// Title normalization. Deterministic cleanup that strips ATS noise
// — requisition IDs, trailing locations, emoji — while preserving the core role
// phrase. Always returns a non-empty string (falls back to the trimmed raw title).

// Emoji / pictographs (built via RegExp() to keep the source ASCII-only).
const EMOJI = new RegExp("\\p{Extended_Pictographic}", "gu");

// Bracketed/parenthetical requisition-id tokens, e.g. "(R12345)", "[#1234]",
// "(REQ-2024-1)" — must contain a digit to count as an ID.
const PAREN_ID = /[([{][^)\]}]*\d[^)\]}]*[)\]}]/g;
// Bracketed/parenthetical location qualifiers, e.g. "(Remote)", "(San Francisco, CA)".
const PAREN_LOCATION = /[([{][^)\]}]*(?:,|\bremote\b|\bhybrid\b|on[\s-]?site|\bhq\b)[^)\]}]*[)\]}]/gi;
// Standalone hash ids, e.g. "#4567".
const HASH_ID = /#\s*\d[\w-]*/g;
// Title segment separators (require surrounding spaces so "Front-End" is safe).
const SEPARATOR = /\s+[-–—|·•@/]\s+/;
// Leading/trailing separator/punctuation noise to trim off.
const EDGE_NOISE = /^[\s\-–—|·•@/,]+|[\s\-–—|·•@/,]+$/g;

// True when a trailing title segment looks like a location rather than a role.
function isLocationLike(segment: string): boolean {
  const t = segment.trim();
  if (t === "") return false;
  if (/,/.test(t)) return true;
  if (/\bremote\b|\bhybrid\b|on[\s-]?site|\bonsite\b|work[\s-]?from[\s-]?home|\bwfh\b/i.test(t)) {
    return true;
  }
  return /\b(united states|usa|u\.s\.a?\.?|uk|emea|apac|canada|europe)\b/i.test(t);
}

export function normalizeTitle(raw: string | null | undefined): string {
  if (!raw) return "";

  let t = raw
    .replace(EMOJI, " ")
    .replace(PAREN_LOCATION, " ")
    .replace(PAREN_ID, " ")
    .replace(HASH_ID, " ");

  // Drop trailing location segments after a separator (e.g. "PM - New York, NY").
  const parts = t.split(SEPARATOR);
  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last === undefined || !isLocationLike(last)) break;
    parts.pop();
  }
  t = parts.join(" - ");

  t = t.replace(/\s+/g, " ").replace(EDGE_NOISE, "").trim();

  // Never return empty: fall back to the collapsed raw title.
  return t || raw.replace(/\s+/g, " ").trim();
}
