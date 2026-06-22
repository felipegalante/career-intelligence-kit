# ADR-0002 — Rubric Compiler is the primary provider

**Status:** Accepted

## Context

The private Rubric Compiler produces the highest-quality evaluations/reports. Public products
should prefer it when available, but must never hard-depend on it.

## Decision

Treat Rubric Compiler as the **primary** `CareerIntelligenceProvider`, reached through
`@career-intelligence/rubric-compiler-client` (a thin specialization of
`@career-intelligence/client`). Rubric Compiler **implements the public Career Intelligence
v1 contract**, so the generic client and the shared contract tests apply to it unchanged.

Consumers compose: try the remote provider; on unavailability/error, fall back to
`@career-intelligence/local-engine`. The result's `metadata.degraded` + `metadata.provider`
make the fallback observable.

## Consequences

- Rubric Compiler owns proprietary quality; this repo owns the contract it speaks.
- Swapping primary ↔ fallback is a provider swap, not a code change in product logic.
- See [`docs/rubric-compiler-integration.md`](../rubric-compiler-integration.md) for the
  fallback pattern.
