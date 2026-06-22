# Example — Intelligent Job Board integration

Intelligent Job Board consumes this kit for its optional résumé-fit / report features
(Step 03 of the migration). Job search itself comes from Job Platform, not from here.

```ts
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";
import { createRubricCompilerProvider } from "@career-intelligence/rubric-compiler-client";
import { type CareerIntelligenceProvider } from "@career-intelligence/provider";

// Choose a provider from config: Rubric Compiler when configured, else local.
export function careerIntelligence(): CareerIntelligenceProvider {
  if (process.env.RUBRIC_COMPILER_URL) {
    return createRubricCompilerProvider({ baseUrl: process.env.RUBRIC_COMPILER_URL });
  }
  return createLocalCareerIntelligenceProvider();
}
```

Intended IJB imports: `@career-intelligence/client`, `/types`, `/provider`, `/local-engine`,
`/fixtures`. In local/public mode IJB uses the local engine + fixtures so it runs with no
private services. Company insights, when needed, come from `@company-intelligence/*`.
