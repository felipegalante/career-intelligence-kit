# ADR-0003 — Deterministic local fallback

**Status:** Accepted

## Context

Public products (Intelligent Job Board, Resume ATS Intelligence) must work in local/demo mode
and must degrade gracefully when the private services are down. They cannot ship proprietary
calibration, and they must be reproducible.

## Decision

`@career-intelligence/local-engine` composes three deterministic packages —
`resume-intelligence`, `job-description-normalization`, `fit-scoring` — into a complete
`CareerIntelligenceProvider`. It is **pure and deterministic**: no network, no LLM, no private
calibration. `createLocalCareerIntelligenceProvider()` is always available and always returns
contract-valid results tagged `mode: "local"`.

## Consequences

- Every public product is runnable with zero private dependencies.
- The fallback is honest: results carry `degraded`/`provider` metadata and a `limitations`
  note on reports.
- Determinism makes the engine testable and its versions cache-keyable (see
  [`docs/versioning.md`](../versioning.md)).
