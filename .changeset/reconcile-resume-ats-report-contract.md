---
"@career-intelligence/types": minor
"@career-intelligence/provider": minor
"@career-intelligence/client": minor
"@career-intelligence/rubric-compiler-client": minor
"@career-intelligence/local-engine": minor
"@career-intelligence/fixtures": minor
"@career-intelligence/mock-server": minor
"@career-intelligence/contract-tests": minor
---

Reconcile `ResumeAtsReportResult` with the shape the Rubric Compiler actually serves.

Breaking (pre-1.0 minor): the flat report fields (`headline`, `narrative`, top-level
`strengths`/`gaps`/`skillsCoverage`/`roadmap`/`interviewPrep`/`limitations`) moved into
the structured `fitInsights` body. The report now carries `matchLevel` and the
company-context blocks (`companyIntel`, `marketIntel`, `calibration`,
`companyContext`) — null/degraded when no company intelligence is available.
`CareerEvaluationResult` and `FitScoreResult` gain optional company-context fields;
`IntelligenceResultMetadata` gains optional engine/contract/normalizer/scoring/rubric
version fields; `EvaluationStrength.confidence` is standardized to the 0-100 scale.

The local engine builds deterministic `fitInsights`; the contract-test suite asserts
the full report shape, rejects unknown top-level keys, and adds a gated live suite
against a running Rubric Compiler (`RUN_RC_CONTRACT_TESTS=1`).
