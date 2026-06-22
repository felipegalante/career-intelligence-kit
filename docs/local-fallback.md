# Local fallback

`@career-intelligence/local-engine` is a complete, deterministic
`CareerIntelligenceProvider`. No network, no LLM, no private calibration — always available.

```ts
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";

const provider = createLocalCareerIntelligenceProvider();

const result = await provider.evaluate({
  resume: { text: resumeText },
  job: { text: jobText, title: "Senior Backend Engineer" },
  requestId: "abc-123",
});

result.fit.score;            // 0–100
result.fit.matchLevel;       // "strong" | "good" | "fair" | "weak"
result.metadata.provider;    // "local-career-intelligence"
result.metadata.mode;        // "local"
result.metadata.degraded;    // false
```

## When to use it

- **Local/demo mode** for the public products (no private services running).
- **Fallback** when the primary remote provider is unavailable — see
  [`rubric-compiler-integration.md`](./rubric-compiler-integration.md).
- **Tests/fixtures** — it backs `@career-intelligence/mock-server` so the mock returns valid,
  consistent responses for arbitrary input.

## Determinism

Given the same input (and an injected clock, `options.now`, for `generatedAt`), the engine
produces identical output. This makes results cache-keyable by `engineVersion` +
`configVersion` (see [`versioning.md`](./versioning.md)).

## Limitations

The local engine is intentionally simpler than Rubric Compiler: no LLM enrichment, no
company/domain/market context, no proprietary calibration. Reports carry an explicit
`limitations` note saying so.
