// `pnpm --filter @career-intelligence/mock-server dev` — start the mock API.

import { startMockServer } from "./server";

const port = Number(process.env.PORT ?? 4500);

startMockServer({ port })
  .then((server) => {
    process.stdout.write(`Career Intelligence mock server listening on ${server.url}\n`);
    process.stdout.write(
      "Routes: GET /v1/health, POST /v1/resumes/parse, /v1/jobs/normalize, /v1/fit-score, /v1/evaluations, /v1/reports/resume-ats\n",
    );
  })
  .catch((error: unknown) => {
    process.stderr.write(`Failed to start mock server: ${String(error)}\n`);
    process.exitCode = 1;
  });
