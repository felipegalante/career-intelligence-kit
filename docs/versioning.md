# Versioning

## Three things are versioned

1. **The contract** (`openapi/career-intelligence.v1.yaml`, the `v1` path prefix). Breaking
   changes get a new major version / path prefix; additive changes stay in `v1`.
2. **Packages** (semver, via Changesets). Add a changeset for any change that should bump a
   package: `pnpm changeset`.
3. **The engine** — every result carries `engineVersion` (+ optional `configVersion`,
   `scoringMode`) in `IntelligenceResultMetadata`.

## Why engine/config versions matter

The local engine derives `configVersion` from the inputs that actually change a score (the
skill dictionary + rubric/tier weights). Consumers can use
`engineVersion` + `configVersion` as a cache key: bump either, and cached results are
invalidated transparently. Results are otherwise deterministic for a given input.

## Result provenance (required)

Every provider — local or remote — must return `IntelligenceResultMetadata`:

| field | meaning |
|---|---|
| `provider` | stable provider id (e.g. `local-career-intelligence`, `rubric-compiler`) |
| `mode` | `local` or `remote` |
| `degraded` | true when a fallback/partial path produced the result |
| `engineVersion` | engine/algorithm version |
| `configVersion` | optional weights/dictionary version |
| `warnings` | non-fatal warnings |

This is enforced by `@career-intelligence/contract-tests`.
