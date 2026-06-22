# Scoring model (local engine)

The deterministic engine scores résumé↔job fit without any LLM. This documents the public
shape; the internal algorithm lives in `@career-intelligence/resume-intelligence` and
`@career-intelligence/fit-scoring`.

## Pipeline

1. **Parse résumé** (`parseResume`) → skills (tiered), experience, evidence, inferred
   seniority/role-family.
2. **Normalize job** (`extractJobProfile`) → tiered required/preferred/inferred skills,
   responsibilities, seniority/role-family signals, eligibility gates.
3. **Match + score** (`analyzeJob`) → a weighted rubric over the matching engine's output
   (exact/adjacent/missing skills, domain overlap, seniority, gates), scaled by a
   role-relevance multiplier.

## Public result shape (`FitScoreResult`)

- `score` (0–100) — overall match quality.
- `atsScore` (0–100) — keyword coverage of required skills blended with parseability.
- `matchLevel` — `strong` | `good` | `fair` | `weak`.
- `dimensions` — per-dimension breakdown (technical stack, seniority & scope, architecture,
  stakeholder fit, business orientation, communication).
- `signals` — strengths + gaps.
- `calibration` — empty for the local engine; populated by remote providers that consume
  Company Intelligence calibration hints.

## Role relevance

An off-domain résumé (e.g. a sales résumé against an engineering role) is scaled toward zero;
unknown role data is treated neutrally (never penalized). This keeps the score honest without
inventing signal.

## Gates

Eligibility gates (years, work authorization, clearance, certification, language, employment
type, location) are derived only from **explicit** job requirements. Protected attributes are
never inferred.
