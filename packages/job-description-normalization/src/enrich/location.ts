// Location parsing. Deterministic, conservative parsing of a raw
// location string (e.g. ATS `location`) into country / region / city. Unknown
// parts are left null (never guessed). Country is normalized to ISO-3166-1
// alpha-2; US states to their 2-letter code with country "US".
// Ambiguity note: bare 2-letter tokens are treated as US state codes (the
// dominant ATS convention, e.g. "San Francisco, CA"); spell out the country
// ("Berlin, Germany") for non-US locations.
// hardening: strip parenthesized arrangement hints ("United States
// (Remote)"), strip leading "Remote in/from/across" prefixes ("Remote in the
// US"), and accept "the X" country aliases. These are the forms that real
// ATS pages emit and the earlier parser dropped into `country: null`.
export interface ParsedLocation {
  country: string | null;
  region: string | null;
  city: string | null;
}

const EMPTY: ParsedLocation = { country: null, region: null, city: null };

const US_STATES: Record<string, string> = {};
const US_STATE_NAMES: Array<[string, string]> = [
  ["alabama", "AL"], ["alaska", "AK"], ["arizona", "AZ"], ["arkansas", "AR"],
  ["california", "CA"], ["colorado", "CO"], ["connecticut", "CT"], ["delaware", "DE"],
  ["florida", "FL"], ["georgia", "GA"], ["hawaii", "HI"], ["idaho", "ID"],
  ["illinois", "IL"], ["indiana", "IN"], ["iowa", "IA"], ["kansas", "KS"],
  ["kentucky", "KY"], ["louisiana", "LA"], ["maine", "ME"], ["maryland", "MD"],
  ["massachusetts", "MA"], ["michigan", "MI"], ["minnesota", "MN"], ["mississippi", "MS"],
  ["missouri", "MO"], ["montana", "MT"], ["nebraska", "NE"], ["nevada", "NV"],
  ["new hampshire", "NH"], ["new jersey", "NJ"], ["new mexico", "NM"], ["new york", "NY"],
  ["north carolina", "NC"], ["north dakota", "ND"], ["ohio", "OH"], ["oklahoma", "OK"],
  ["oregon", "OR"], ["pennsylvania", "PA"], ["rhode island", "RI"], ["south carolina", "SC"],
  ["south dakota", "SD"], ["tennessee", "TN"], ["texas", "TX"], ["utah", "UT"],
  ["vermont", "VT"], ["virginia", "VA"], ["washington", "WA"], ["west virginia", "WV"],
  ["wisconsin", "WI"], ["wyoming", "WY"], ["district of columbia", "DC"], ["washington dc", "DC"],
];
for (const [name, abbr] of US_STATE_NAMES) {
  US_STATES[name] = abbr;
  US_STATES[abbr.toLowerCase()] = abbr;
}

// Country names / unambiguous codes → ISO-3166-1 alpha-2. Bare colliding 2-letter
// codes (CA, DE, IN, GA, …) are intentionally absent so they read as US states.
// "the X" aliases handle ATS strings like "Remote in the US" / "the United States".
export const COUNTRIES: Record<string, string> = {
  "united states": "US", "united states of america": "US", usa: "US", us: "US", america: "US",
  "the united states": "US", "the united states of america": "US", "the usa": "US", "the us": "US",
  "united kingdom": "GB", uk: "GB", "great britain": "GB", britain: "GB", england: "GB", gb: "GB",
  "the united kingdom": "GB", "the uk": "GB",
  canada: "CA", germany: "DE", deutschland: "DE", france: "FR", spain: "ES", italy: "IT",
  netherlands: "NL", "the netherlands": "NL", ireland: "IE", portugal: "PT", poland: "PL",
  sweden: "SE", switzerland: "CH", austria: "AT", belgium: "BE", denmark: "DK", finland: "FI",
  norway: "NO", india: "IN", australia: "AU", "new zealand": "NZ", singapore: "SG", japan: "JP",
  china: "CN", brazil: "BR", mexico: "MX", israel: "IL", "united arab emirates": "AE", uae: "AE",
  "south africa": "ZA", "hong kong": "HK", "south korea": "KR", argentina: "AR", chile: "CL",
};

const ARRANGEMENT_WORD = /^(remote|hybrid|on-?site|in-?office|in-?person|wfh|anywhere|flexible)$/i;

// Leading prefixes that indicate the arrangement, not the location, and should
// be stripped before tokenization. Each matches at the start (after the paren
// strip) — e.g. "Remote in the US" → "the US"; "Remote, US" → "US".
const LEADING_REMOTE_PREFIX = new RegExp(
  String.raw`^\s*remote(?:\s+(?:in|from|across|across\s+the|within|throughout)(?:\s+the)?)?\s*[\s,:\-–—]\s*`,
  "i",
);

const norm = (s: string): string => s.toLowerCase().replace(/\./g, "").trim();

// Strip ALL parenthesized content. Real ATS strings use parens for
// arrangement hints ("(Remote)"), region lists ("(ON, AB, BC, or NS Only)"),
// or notes ("(US Citizens only)") — none of which belong in the structured
// country/region/city extraction. The text matchers downstream still see the
// original string for keyword detection.
function stripParens(raw: string): string {
  return raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function stripLeadingRemotePrefix(raw: string): string {
  const stripped = raw.replace(LEADING_REMOTE_PREFIX, "");
  // If the strip ate everything, fall back to the original (e.g. raw was
  // exactly "Remote" → we want EMPTY downstream, not "").
  return stripped.length > 0 ? stripped : raw;
}

export function parseLocation(raw: string | null | undefined): ParsedLocation {
  if (!raw) return EMPTY;

  const pre = stripLeadingRemotePrefix(stripParens(raw));

  const tokens = pre
    .split(/[,/|]|\s[-–—]\s/)
    .map((t) => t.trim())
    .filter((t) => t !== "" && !ARRANGEMENT_WORD.test(t));
  if (tokens.length === 0) return EMPTY;

  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;

  const lastCountry = COUNTRIES[norm(tokens[tokens.length - 1] ?? "")];
  if (lastCountry) {
    country = lastCountry;
    tokens.pop();
  }

  // Country-first phrasing: "Canada - Toronto" / "Brazil — Remote".
  // Only fires when the last-token check didn't already find a country.
  if (!country && tokens.length >= 2) {
    const firstCountry = COUNTRIES[norm(tokens[0] ?? "")];
    if (firstCountry) {
      country = firstCountry;
      tokens.shift();
    }
  }

  if (tokens.length > 0) {
    const state = US_STATES[norm(tokens[tokens.length - 1] ?? "")];
    if (state) {
      region = state;
      country = country ?? "US";
      tokens.pop();
    }
  }

  if (tokens.length > 0) {
    city = tokens[0] ?? null;
    if (region === null && tokens.length >= 2) region = tokens[1] ?? null;
  }

  return { country, region, city };
}
