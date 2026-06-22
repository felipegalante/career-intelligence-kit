# Example — PathMerit integration

PathMerit (the private commercial product, built last) uses Rubric Compiler for
scoring/evaluation/reports and keeps the local engine as a fallback. PathMerit owns user
persistence; this kit owns none.

```ts
import { createRubricCompilerProvider } from "@career-intelligence/rubric-compiler-client";
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";

const primary = createRubricCompilerProvider({
  baseUrl: process.env.RUBRIC_COMPILER_URL!,
  apiKey: process.env.RUBRIC_COMPILER_API_KEY,
});
const fallback = createLocalCareerIntelligenceProvider();

const evaluation = await primary.evaluate({ resume, job, requestId });
// Persist the *result* (with its metadata) in PathMerit's own database — never the raw
// engine internals. Store metadata.provider / engineVersion / degraded alongside it.
```

Intended PathMerit imports: `@career-intelligence/client`, `/types`, `/provider`,
`/local-engine`, plus `@company-intelligence/*` and `@job-platform-contracts/*`. Persisted
evaluations, recommendation history, and prep history live in PathMerit, not here.
