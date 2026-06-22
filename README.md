# career-intelligence-kit

Public **career-intelligence contracts + deterministic local fallback** for the PathMerit
ecosystem.

This repository owns the stable, provider-neutral types, provider interfaces, API clients,
the OpenAPI contract, fixtures, a mock server, contract tests, and **deterministic local
fallback logic** for career intelligence — resume parsing, job-description-to-score-profile
normalization, and deterministic fit scoring.

> It is **not** the private Rubric Compiler. It contains no proprietary scoring weights or
> calibration, no PathMerit product logic, no job ingestion/ATS/source-discovery code, and no
> company/domain/market intelligence. Those live in their own private services. Public
> products consume the private engines through the clients/providers defined here, and fall
> back to the local deterministic engine when those services are unavailable.

## Packages

| Package | Purpose |
|---|---|
| `@career-intelligence/types` | Stable, provider-neutral DTOs and public types |
| `@career-intelligence/fit-scoring` | Deterministic fit scoring + hotness classification |
| `@career-intelligence/job-description-normalization` | JD → score-profile normalization (skills, seniority, role family, requirement graph, taxonomy) |
| `@career-intelligence/resume-intelligence` | Resume parsing, evidence matching, scoring, gap analysis, Job Match Report builder |
| `@career-intelligence/provider` | The `CareerIntelligenceProvider` interface |
| `@career-intelligence/local-engine` | Deterministic provider composing the three engines above |
| `@career-intelligence/client` | Generic Career Intelligence HTTP client |
| `@career-intelligence/rubric-compiler-client` | HTTP provider for the private Rubric Compiler |
| `@career-intelligence/fixtures` | Realistic non-private fixtures |
| `@career-intelligence/mock-server` | Local mock Career Intelligence API |
| `@career-intelligence/contract-tests` | Reusable contract tests (mock + real service) |

## Provenance

These packages were extracted from
[`intelligent-job-board`](https://github.com/felipegalante/intelligent-job-board) (`@ijb/fit-scoring`,
`@ijb/resume-intelligence`, and the JD/scoring parts of `@ijb/job-normalization`). The
ATS/source/canonical-job normalization that lived alongside them stays out of this repo — it
belongs to the private `job-platform` service.

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Uses pnpm workspaces + Turborepo. Each package is consumed as TypeScript source within the
workspace and builds to `dist/` (ESM + CJS + types) via `tsup`.
