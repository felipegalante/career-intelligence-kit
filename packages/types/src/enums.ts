// Canonical seniority + role-family enums shared across the career-intelligence
// packages. Extracted from Intelligent Job Board's `@ijb/shared-types`; kept here
// as the provider-neutral source of truth so the deterministic packages do not
// depend on any product repo.

export const SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "lead",
  "exec",
] as const;
export type Seniority = (typeof SENIORITY_LEVELS)[number];

export const ROLE_FAMILIES = [
  "engineering",
  "data",
  "design",
  "product",
  "sales",
  "marketing",
  "operations",
  "finance",
  "hr",
  "legal",
  "support",
] as const;
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
