// @career-intelligence/fixtures — realistic, non-private fixtures for local/demo
// mode, mock-server responses, and contract tests. Statically typed against
// @career-intelligence/types so the compiler guarantees they stay contract-valid.

import {
  type CareerEvaluationResult,
  type FitScoreResult,
  type IntelligenceResultMetadata,
  type JobDescriptionInput,
  type NormalizedJobProfile,
  type ParsedResume,
  type ResumeAtsReportResult,
  type ResumeInput,
} from "@career-intelligence/types";

export const metadataFixture: IntelligenceResultMetadata = {
  provider: "local-career-intelligence",
  mode: "local",
  degraded: false,
  engineVersion: "local-ri@0.4.0",
  configVersion: "cfg-fixture",
  scoringMode: "lightweight_local",
  generatedAt: "2026-01-01T00:00:00.000Z",
  warnings: [],
};

export const resumeInputFixture: ResumeInput = {
  filename: "jane-doe-resume.txt",
  text: `Jane Doe
Senior Software Engineer

Summary
Senior backend engineer with 6 years building TypeScript and Node.js services.

Skills
TypeScript, Node.js, PostgreSQL, AWS, Docker

Experience
Senior Software Engineer, Acme (2020-2026)
- Built and scaled Node.js and TypeScript microservices on AWS.
- Designed PostgreSQL schemas and optimized slow queries by 40%.
`,
};

export const jobDescriptionInputFixture: JobDescriptionInput = {
  title: "Senior Backend Engineer",
  company: "Globex",
  text: `Senior Backend Engineer

About the role
You will build and operate scalable backend services.

Requirements
- 5+ years of experience with TypeScript and Node.js
- Strong experience with PostgreSQL
- Experience deploying to AWS

Preferred qualifications
- Experience with Kubernetes
`,
};

export const parsedResumeFixture: ParsedResume = {
  sections: [],
  skills: [
    { id: "typescript", label: "typescript", confidence: 0.9 },
    { id: "nodejs", label: "nodejs", confidence: 0.9 },
    { id: "postgresql", label: "postgresql", confidence: 0.7 },
    { id: "aws", label: "aws", confidence: 0.7 },
    { id: "docker", label: "docker", confidence: 0.5 },
  ],
  experience: [
    {
      title: "Senior Software Engineer",
      normalizedTitle: "senior software engineer",
      roleFamily: "engineering",
      seniority: "senior",
      organization: "Acme",
      startDate: "2020",
      endDate: "2026",
      highlights: [
        "Built and scaled Node.js and TypeScript microservices on AWS.",
        "Designed PostgreSQL schemas and optimized slow queries by 40%.",
      ],
    },
  ],
  evidence: [
    {
      claim: "Built and scaled Node.js and TypeScript microservices on AWS.",
      supports: ["nodejs", "typescript", "aws"],
      strength: 0.8,
      source: "experience",
    },
  ],
  inferredSeniority: "senior",
  inferredRoleFamily: "engineering",
  parserVersion: "local-ri@0.4.0",
};

export const normalizedJobProfileFixture: NormalizedJobProfile = {
  title: "Senior Backend Engineer",
  normalizedTitle: "senior backend engineer",
  roleFamily: "engineering",
  seniority: "senior",
  requiredSkills: [
    { id: "typescript", label: "typescript", importance: "required", weight: 1 },
    { id: "nodejs", label: "nodejs", importance: "required", weight: 1 },
    { id: "postgresql", label: "postgresql", importance: "required", weight: 1 },
    { id: "aws", label: "aws", importance: "required", weight: 1 },
    { id: "kubernetes", label: "kubernetes", importance: "preferred", weight: 0.6 },
  ],
  responsibilities: [
    { text: "Build and operate scalable backend services.", signals: ["nodejs"], weight: 0.5 },
  ],
  senioritySignals: [{ level: "senior", evidence: "5+ years of experience", weight: 0.5 }],
  roleFamilySignals: [{ family: "engineering", evidence: "backend engineer title", weight: 0.5 }],
  gates: ["Minimum years of experience"],
  normalizerVersion: "jd-normalize@1",
};

export const fitScoreResultFixture: FitScoreResult = {
  score: 78,
  atsScore: 72,
  matchLevel: "strong",
  verdict: "78/100 fit; matched 4/4 required (typescript, nodejs, postgresql, aws); senior meets senior.",
  dimensions: [
    { id: "technicalStack", label: "Technical stack", score: 82, weight: 0.25 },
    { id: "seniorityScope", label: "Seniority & scope", score: 76, weight: 0.2 },
  ],
  signals: [
    {
      kind: "strength",
      ref: "typescript",
      label: "typescript",
      detail: "Built TypeScript microservices on AWS.",
      impact: 0.5,
    },
    {
      kind: "gap",
      ref: "kubernetes",
      label: "kubernetes",
      detail: "Preferred skill not evidenced in the resume.",
      impact: 0.4,
    },
  ],
  calibration: [],
  metadata: metadataFixture,
};

export const careerEvaluationResultFixture: CareerEvaluationResult = {
  parsedResume: parsedResumeFixture,
  jobProfile: normalizedJobProfileFixture,
  fit: fitScoreResultFixture,
  strengths: [
    { title: "typescript", summary: "Strong, well-evidenced TypeScript experience.", confidence: 0.7 },
  ],
  gaps: [
    {
      title: "kubernetes",
      summary: "Preferred skill not present in the resume.",
      tip: "Add Kubernetes experience only if genuinely true.",
      impact: "medium",
    },
  ],
  metadata: metadataFixture,
};

export const resumeAtsReportResultFixture: ResumeAtsReportResult = {
  fitScore: 78,
  atsScore: 72,
  readinessScore: 75,
  verdict: "Strong match for a senior backend role.",
  headline: "strong match",
  narrative: "Your resume covers the core required stack; close the Kubernetes gap to strengthen the application.",
  strengths: [
    { title: "typescript", summary: "Strong, well-evidenced TypeScript experience.", confidence: 0.7 },
  ],
  gaps: [
    {
      title: "kubernetes",
      summary: "Preferred skill not present in the resume.",
      tip: "Add Kubernetes experience only if genuinely true.",
      impact: "medium",
    },
  ],
  skillsCoverage: {
    matchedSkills: ["typescript", "nodejs", "postgresql", "aws"],
    missingSkills: ["kubernetes"],
    resumeOnlySkills: ["docker"],
    matchedCount: 4,
    requiredCount: 5,
  },
  roadmap: ["Add a project demonstrating container orchestration with Kubernetes."],
  interviewPrep: ["Be ready to discuss scaling Node.js services on AWS."],
  limitations: ["Deterministic local engine: no LLM enrichment or company/domain context."],
  metadata: metadataFixture,
};
