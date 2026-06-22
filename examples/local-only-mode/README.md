# Example — local-only mode

Run career intelligence with **zero private dependencies**, using the deterministic engine.

```ts
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";

const provider = createLocalCareerIntelligenceProvider();

const report = await provider.generateResumeAtsReport({
  resume: { text: resumeText },
  job: { text: jobDescriptionText, title: "Senior Backend Engineer" },
});

console.log(report.fitScore, report.atsScore, report.readinessScore);
console.log(report.metadata.provider); // "local-career-intelligence"
```

Good for: public demos, local development, and tests. The same provider backs
`@career-intelligence/mock-server`, so you can also run it over HTTP:

```bash
pnpm --filter @career-intelligence/mock-server dev   # GET /v1/health, POST /v1/...
```
