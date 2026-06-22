# Rubric Compiler integration

The private Rubric Compiler implements the public Career Intelligence v1 contract, so the
generic client works against it directly. Use `@career-intelligence/rubric-compiler-client`
for a pre-tagged provider.

```ts
import { createRubricCompilerProvider } from "@career-intelligence/rubric-compiler-client";

const remote = createRubricCompilerProvider({
  baseUrl: process.env.RUBRIC_COMPILER_URL!,
  apiKey: process.env.RUBRIC_COMPILER_API_KEY,
  timeoutMs: 8000,
  retries: 2,
});
```

## Primary + fallback pattern

Prefer the remote provider; fall back to the deterministic local engine on
unavailability/error, and surface the degradation through metadata.

```ts
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";
import { type CareerEvaluationInput, type CareerEvaluationResult } from "@career-intelligence/types";

const local = createLocalCareerIntelligenceProvider();

async function evaluate(input: CareerEvaluationInput): Promise<CareerEvaluationResult> {
  try {
    const health = await remote.health();
    if (health.status !== "unavailable") return await remote.evaluate(input);
  } catch {
    // fall through to local
  }
  const result = await local.evaluate(input);
  return {
    ...result,
    metadata: { ...result.metadata, degraded: true, warnings: [...result.metadata.warnings, "remote_unavailable"] },
  };
}
```

`result.metadata.provider` / `result.metadata.degraded` tell the UI whether the report came
from Rubric Compiler or the local fallback.

## Contract guarantee

Rubric Compiler must pass `@career-intelligence/contract-tests`:

```ts
import { runCareerIntelligenceContract } from "@career-intelligence/contract-tests";

runCareerIntelligenceContract("rubric-compiler", () =>
  createRubricCompilerProvider({ baseUrl: process.env.RUBRIC_COMPILER_URL! }),
);
```
