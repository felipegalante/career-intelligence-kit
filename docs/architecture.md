# Architecture

`career-intelligence-kit` is the public contract + deterministic fallback layer for
career intelligence. It sits between **public products** and the **private Rubric Compiler**.

```
Products (Intelligent Job Board, Resume ATS Intelligence, PathMerit)
        │  depend on the contract, not an engine
        ▼
@career-intelligence/provider  ── CareerIntelligenceProvider interface
        ├── @career-intelligence/rubric-compiler-client → (HTTP) private Rubric Compiler   [primary]
        └── @career-intelligence/local-engine          → deterministic, in-process        [fallback]
```

## Package graph

```
types ──────────────┐ (no deps; stable DTOs + Seniority/RoleFamily enums)
fit-scoring          │ (no deps)
job-description-normalization → types
resume-intelligence → fit-scoring, job-description-normalization (+ vendored report schema)
provider            → types
local-engine        → provider, types, fit-scoring, job-description-normalization, resume-intelligence
client              → provider, types
rubric-compiler-client → client, provider
fixtures            → types
mock-server         → provider, types, local-engine
contract-tests      → provider, types, fixtures (+ client/local-engine/mock-server in its own tests)
```

## What this repo does and does not own

**Owns:** stable public types, the provider interface, the OpenAPI contract, HTTP clients,
fixtures, a mock server, contract tests, and deterministic local logic (résumé parsing,
JD-to-score-profile normalization, deterministic fit scoring).

**Does not own:** proprietary scoring weights/calibration, PathMerit product logic, job
ingestion / ATS / source discovery, canonical job-catalog normalization, company/domain/market
intelligence, or any user persistence.

## Provider interface

```ts
interface CareerIntelligenceProvider {
  parseResume(input): Promise<ParseResumeResult>;
  normalizeJobDescription(input): Promise<NormalizeJobDescriptionResult>;
  scoreFit(input): Promise<FitScoreResult>;
  evaluate(input): Promise<CareerEvaluationResult>;
  generateResumeAtsReport(input): Promise<ResumeAtsReportResult>;
  health(): Promise<CareerIntelligenceHealth>;
  describe(): CareerIntelligenceProviderDescriptor;
}
```

The local engine, the generic HTTP client, and the Rubric Compiler client all implement it, so
consumers swap remote ↔ local without touching product code.

## OpenAPI

`openapi/career-intelligence.v1.yaml` defines the six operations (`/v1/health`,
`/v1/resumes/parse`, `/v1/jobs/normalize`, `/v1/fit-score`, `/v1/evaluations`,
`/v1/reports/resume-ats`). The mock server and the private Rubric Compiler both implement it.
