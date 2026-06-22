# ADR-0004 — Extracting the deterministic packages from Intelligent Job Board

**Status:** Accepted

## Context

The deterministic engines lived inside Intelligent Job Board as `@ijb/fit-scoring`,
`@ijb/resume-intelligence`, and `@ijb/job-normalization`. They are reusable across the
ecosystem and should not be owned by one product. `@ijb/job-normalization` mixed two concerns:
JD/scoring normalization and ATS/source/canonical-job normalization.

## Decision

Extract into `career-intelligence-kit`, rescoped to `@career-intelligence/*`, with **no
`@ijb` imports**:

- `@ijb/fit-scoring` → `@career-intelligence/fit-scoring` (clean leaf).
- `@ijb/resume-intelligence` → `@career-intelligence/resume-intelligence`. Its dependency on
  `@ijb/contracts` (the Job Match Report schema) is vendored locally as
  `report/jobMatchReport.contract.ts`.
- The **JD/scoring half** of `@ijb/job-normalization` →
  `@career-intelligence/job-description-normalization` (title, seniority, role-family, skills,
  skill dictionary, requirement graph `extractJobProfile`, scoring taxonomy, and the location
  parsing used for scoring eligibility).

**Not** extracted (stays for the private `job-platform`): ATS/source/canonical-job
normalization — HTML cleaning, content hashing, salary parsing, posting quality/freshness,
employment type, work arrangement.

Note: `extract/extractJob.ts` is JD-to-score-profile normalization (it turns a *job
description* into a `JobProfile`), so it belongs here, not in `job-platform` — correcting the
tentative routing in IJB ADR-0021.

## Consequences

- Tests carried over intact (186 extracted-package tests pass).
- IJB will consume these via `@career-intelligence/*` (Step 03); the job-platform split
  happens later (Step 10).
- Shared `Seniority`/`RoleFamily` enums moved from `@ijb/shared-types` into
  `@career-intelligence/types`.
