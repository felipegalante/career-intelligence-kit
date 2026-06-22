# Example — remote primary with local fallback

Prefer the private Rubric Compiler; fall back to the deterministic local engine when it is
unavailable, and surface the degradation through metadata.

```ts
import { createRubricCompilerProvider } from "@career-intelligence/rubric-compiler-client";
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";
import { type CareerEvaluationInput } from "@career-intelligence/types";

const remote = createRubricCompilerProvider({ baseUrl: process.env.RUBRIC_COMPILER_URL! });
const local = createLocalCareerIntelligenceProvider();

export async function evaluate(input: CareerEvaluationInput) {
  try {
    const health = await remote.health();
    if (health.status !== "unavailable") return await remote.evaluate(input);
  } catch {
    /* fall through */
  }
  const result = await local.evaluate(input);
  return { ...result, metadata: { ...result.metadata, degraded: true } };
}
```

Check `result.metadata.provider` / `result.metadata.degraded` in the UI to show whether a
report came from Rubric Compiler or the local fallback. See
[`docs/rubric-compiler-integration.md`](../../docs/rubric-compiler-integration.md).
