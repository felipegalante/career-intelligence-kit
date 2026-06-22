import { describe, expect, it } from "vitest";

import { extractSkills } from "./skills";
import { SKILL_DICTIONARY } from "./skills-dictionary";

// Helper: map extracted skills to `{ normalizedName: requirementType }`.
function byType(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of extractSkills(text)) out[e.skill.normalizedName] = e.requirementType;
  return out;
}

describe("extractSkills", () => {
  it("returns nothing for empty/whitespace text", () => {
    expect(extractSkills("")).toEqual([]);
    expect(extractSkills(null)).toEqual([]);
  });

  it("splits required vs preferred vs inferred by section", () => {
    const text = [
      "We are building payments infrastructure with Kafka.",
      "",
      "Requirements",
      "- Strong Python and PostgreSQL experience",
      "- Experience with Docker",
      "",
      "Nice to have",
      "- Kubernetes and Terraform",
    ].join("\n");

    const map = byType(text);
    expect(map.python).toBe("required");
    expect(map.postgresql).toBe("required");
    expect(map.docker).toBe("required");
    expect(map.kubernetes).toBe("preferred");
    expect(map.terraform).toBe("preferred");
    // Mentioned only in the intro body → inferred.
    expect(map.kafka).toBe("inferred");
  });

  it("closes a requirements block at a culture/benefits/responsibilities header", () => {
    // Skills in trailing boilerplate must not be tagged required (they were before
    // neutral headers existed — e.g. a "How we work with AI" blurb → required AI).
    const text = [
      "What we're looking for:",
      "- Strong Terraform and distributed systems experience",
      "",
      "What you can expect:",
      "- You will collaborate across teams using Kubernetes",
      "",
      "How we work with AI",
      "We lean on AI and machine learning across the company.",
      "",
      "Benefits",
      "- Generous PTO",
    ].join("\n");
    const map = byType(text);
    expect(map.terraform).toBe("required");
    expect(map["distributed-systems"]).toBe("required");
    // Everything after the requirements block is body → inferred, not required.
    expect(map.kubernetes).toBe("inferred");
    expect(map.ai).toBe("inferred");
    expect(map["machine-learning"]).toBe("inferred");
  });

  it("assigns the strongest requirement type when a skill repeats", () => {
    const text = [
      "You will write a lot of TypeScript here.",
      "",
      "Required",
      "- TypeScript and React",
    ].join("\n");
    const map = byType(text);
    expect(map.typescript).toBe("required"); // required beats the body mention
    expect(map.react).toBe("required");
  });

  it("attaches confidence per requirement type", () => {
    const text = "Requirements\n- Go (golang) and AWS";
    const skills = extractSkills(text);
    const go = skills.find((s) => s.skill.normalizedName === "go");
    expect(go).toMatchObject({ requirementType: "required", confidence: 0.9 });
  });

  it("matches punctuated aliases with token boundaries", () => {
    const map = byType("Required\n- C++, C#, and Node.js");
    expect(map.cpp).toBe("required");
    expect(map.csharp).toBe("required");
    expect(map.nodejs).toBe("required");
  });

  it("does not match aliases embedded in larger words", () => {
    // "reactive" must not match React; "javascripting" must not match JavaScript.
    const map = byType("We value a reactive, javascripting-free mindset.");
    expect(map.react).toBeUndefined();
    expect(map.javascript).toBeUndefined();
  });

  it("detects AI and LLM skills", () => {
    const map = byType("Hands-on experience integrating AI/LLM capabilities and generative AI into products.");
    expect(map.ai).toBeDefined();
    expect(map.llm).toBeDefined();
  });

  it("matches the requirements that the Jobgether/Lever role lists", () => {
    const text = [
      "Requirements",
      "- Strong backend expertise, ideally with Kotlin (TypeScript a plus).",
      "- Solid understanding of cloud infrastructure, particularly AWS and Kubernetes.",
    ].join("\n");
    const map = byType(text);
    expect(map.kotlin).toBe("required");
    expect(map.typescript).toBe("required");
    expect(map.aws).toBe("required");
    expect(map.kubernetes).toBe("required");
  });

  it("does not fire 'ai' inside unrelated words", () => {
    const map = byType("Send an email and book travel to Shanghai for the offsite.");
    expect(map.ai).toBeUndefined();
  });

  it("detects a spread of the expanded taxonomy", () => {
    const map = byType(
      "Requirements\n- Flutter, RabbitMQ, scikit-learn, Terraform, LangChain, and Agile experience.",
    );
    expect(map.flutter).toBe("required");
    expect(map.rabbitmq).toBe("required");
    expect(map["scikit-learn"]).toBe("required");
    expect(map.langchain).toBe("required");
    expect(map.agile).toBe("required");
  });

  it("does not flag common prose words as skills (collision guard)", () => {
    // "express" (verb), "remix" (idea), "go" (verb) must not match.
    const map = byType("We value people who express ideas, remix concepts, and go the extra mile.");
    expect(map.express).toBeUndefined();
    expect(map.remix).toBeUndefined();
    expect(map.go).toBeUndefined();
  });
});

describe("SKILL_DICTIONARY integrity", () => {
  it("has unique normalized names", () => {
    const names = SKILL_DICTIONARY.map((s) => s.normalizedName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has no alias shared across entries", () => {
    const aliases = SKILL_DICTIONARY.flatMap((s) => s.aliases.map((a) => a.toLowerCase()));
    expect(new Set(aliases).size).toBe(aliases.length);
  });
});
