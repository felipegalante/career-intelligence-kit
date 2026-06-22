# ADR-0001 — The career-intelligence public boundary

**Status:** Accepted

## Context

Across the PathMerit ecosystem, several products need the same career-intelligence
capability — parse a résumé, normalize a job description, score fit, produce a report. The
high-quality implementation is private (Rubric Compiler), but the public products
(Intelligent Job Board, Resume ATS Intelligence) must remain runnable and useful without it.

## Decision

`career-intelligence-kit` is the **public boundary**: stable DTOs
(`@career-intelligence/types`), a provider interface (`@career-intelligence/provider`), an
OpenAPI contract (`openapi/career-intelligence.v1.yaml`), HTTP clients, fixtures, a mock
server, contract tests, and a **deterministic local fallback engine**. It owns no proprietary
scoring weights/calibration, no product/user persistence, no job ingestion/ATS code, and no
company/domain intelligence.

Every result crosses the boundary with `IntelligenceResultMetadata` (provider, mode,
degraded, engineVersion, warnings), so consumers always know what produced a result and
whether it is degraded.

## Consequences

- Products depend on a small, stable contract — not on a specific engine.
- Remote (Rubric Compiler) and local (deterministic) providers are interchangeable behind
  `CareerIntelligenceProvider`.
- The private engine implements the same contract and is guarded by the same
  `@career-intelligence/contract-tests`.
