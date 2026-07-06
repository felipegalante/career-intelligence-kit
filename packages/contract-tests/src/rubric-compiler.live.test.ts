// Runs the contract suite against a real, running Rubric Compiler service —
// the gated integration check that keeps the private implementation and this
// public contract from drifting apart.
//
//   RUN_RC_CONTRACT_TESTS=1 RUBRIC_COMPILER_BASE_URL=http://localhost:8088 pnpm test
//
// Skipped (not failed) when the env vars are absent, so regular CI stays infra-free
// — same pattern as the ecosystem's RUN_DB_TESTS/RUN_SEARCH_TESTS gates.

import { createRubricCompilerProvider } from "@career-intelligence/rubric-compiler-client";
import { describe, it } from "vitest";

import { runCareerIntelligenceContract } from "./contract";

const enabled = process.env.RUN_RC_CONTRACT_TESTS === "1";
const baseUrl = process.env.RUBRIC_COMPILER_BASE_URL;

if (enabled && baseUrl) {
  runCareerIntelligenceContract("rubric-compiler (live)", () =>
    createRubricCompilerProvider({
      baseUrl,
      apiKey: process.env.RUBRIC_COMPILER_API_KEY,
      timeoutMs: 30000,
    }),
  );
} else {
  describe("career-intelligence contract: rubric-compiler (live)", () => {
    it.skip("skipped — set RUN_RC_CONTRACT_TESTS=1 and RUBRIC_COMPILER_BASE_URL to run", () => {});
  });
}
