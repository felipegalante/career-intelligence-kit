// Runs the reusable contract suite against (1) the deterministic local engine and
// (2) the mock server reached through the HTTP client with an in-process fetch shim.
// This proves the local engine, the mock server, and the client all satisfy the
// same contract — the exact suite the private Rubric Compiler must also pass.

import { createCareerIntelligenceClient } from "@career-intelligence/client";
import { createLocalCareerIntelligenceProvider } from "@career-intelligence/local-engine";
import { createMockHandler } from "@career-intelligence/mock-server";

import { runCareerIntelligenceContract } from "./contract";

// (1) Local engine — direct, in-process.
runCareerIntelligenceContract("local-engine", () => createLocalCareerIntelligenceProvider());

// (2) Mock server, reached through the client. The client's fetch is shimmed to the
// mock handler so the full client↔server path is exercised without binding a port.
const handler = createMockHandler();
const mockFetch = (async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.toString());
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const result = await handler.handle(method, url.pathname, body);
  return new Response(JSON.stringify(result.json), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

runCareerIntelligenceContract("mock-server via client", () =>
  createCareerIntelligenceClient({ baseUrl: "http://mock.local", fetch: mockFetch }),
);
