import type { RoleFamily } from "@career-intelligence/types";

// Role-family inference (M5-S2, §19.2). Deterministic keyword patterns over the
// (normalized) title, falling back to the department. Checked in an order that
// resolves common cross-family ambiguity (e.g. "Data Engineer" → data, "Product
// Engineer" → engineering, "Product Manager" → product). Unknown → `null`.
//
const PATTERNS: Array<[RoleFamily, RegExp]> = [
  [
    "data",
    /\b(data\s+(scientist|engineer|analyst)|data\s+science|machine\s+learning|\bml\b|ml\s+engineer|analytics|\bnlp\b|ai\s+engineer)\b/i,
  ],
  ["design", /\b(designer|design|ux|ui|user\s+experience|user\s+interface)\b/i],
  [
    "engineering",
    /\b(software\s+engineer|engineer|engineering|developer|programmer|\bswe\b|\bsde\b|devops|\bsre\b|site\s+reliability|back-?end|front-?end|full[\s-]?stack|\bqa\b|architect)\b/i,
  ],
  ["product", /\b(product\s+manager|product\s+owner|product\s+management|\bpm\b)\b/i],
  [
    "sales",
    /\b(sales|account\s+executive|account\s+manager|business\s+development|\bbdr\b|\bsdr\b|partnerships|revenue)\b/i,
  ],
  ["marketing", /\b(marketing|growth|\bseo\b|content|brand|demand\s+gen|communications|social\s+media)\b/i],
  ["finance", /\b(finance|financial|account(ant|ing)|controller|fp&a|treasury|audit(or)?|bookkeep)\b/i],
  [
    "hr",
    /\b(recruit(er|ing|ment)?|talent|people\s+(ops|operations)|human\s+resources|\bhr\b|hrbp|sourcer)\b/i,
  ],
  ["legal", /\b(legal|counsel|attorney|paralegal|compliance)\b/i],
  [
    "support",
    /\b(customer\s+(support|success|service|experience)|technical\s+support|support\s+(engineer|specialist|agent)|help\s*desk)\b/i,
  ],
  [
    "operations",
    /\b(operations|\bops\b|logistics|supply\s+chain|program\s+manager|project\s+manager|chief\s+of\s+staff|office\s+manager)\b/i,
  ],
];

function matchFamily(text: string | null | undefined): RoleFamily | null {
  if (!text) return null;
  for (const [family, re] of PATTERNS) {
    if (re.test(text)) return family;
  }
  return null;
}

export function inferRoleFamily(
  title: string | null | undefined,
  department?: string | null,
): RoleFamily | null {
  return matchFamily(title) ?? matchFamily(department);
}
