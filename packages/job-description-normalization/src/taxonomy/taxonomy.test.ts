import { describe, expect, it } from "vitest";

import { SKILL_DICTIONARY } from "../enrich/skills-dictionary";

import { actionVerbBoost, extractActionVerbs } from "./action-verbs";
import { adjacentDomainWeight, DOMAINS, matchDomains } from "./domains";
import { classifyRequirementImportance, requirementImportanceWeight } from "./requirement-phrases";
import { extractSenioritySignals } from "./seniority-signals";
import { adjacentSkillWeight, aliasConfidence, enrichedSkill, SKILL_META } from "./skill-graph";

const DICT_IDS = new Set(SKILL_DICTIONARY.map((e) => e.normalizedName));

describe("skill-graph integrity", () => {
  it("every SKILL_META key is a real dictionary skill", () => {
    for (const id of Object.keys(SKILL_META)) {
      expect(DICT_IDS.has(id), `SKILL_META key '${id}' not in SKILL_DICTIONARY`).toBe(true);
    }
  });

  it("every related.skillId resolves to a real dictionary skill, with no self-loops", () => {
    for (const [id, meta] of Object.entries(SKILL_META)) {
      for (const edge of meta.related) {
        expect(DICT_IDS.has(edge.skillId), `'${id}' → unknown related '${edge.skillId}'`).toBe(true);
        expect(edge.skillId, `'${id}' has a self-loop`).not.toBe(id);
        expect(edge.weight).toBeGreaterThan(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("adjacentSkillWeight", () => {
  it("returns 1 for identical skills and 0 for unrelated", () => {
    expect(adjacentSkillWeight("nodejs", "nodejs")).toBe(1);
    expect(adjacentSkillWeight("nodejs", "matlab")).toBe(0);
  });

  it("is symmetric over one-directionally authored edges", () => {
    // typescript declares the nodejs edge; nodejs declares the typescript edge —
    // either direction should resolve.
    expect(adjacentSkillWeight("nodejs", "typescript")).toBeGreaterThan(0);
    expect(adjacentSkillWeight("typescript", "nodejs")).toBeGreaterThan(0);
  });

  it("gives Kafka adjacent credit to event-driven / async evidence", () => {
    // The canonical example: Kafka absent, but event-driven present → partial.
    const w = adjacentSkillWeight("kafka", "event-driven");
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(1);
  });
});

describe("aliasConfidence", () => {
  it("scores short/ambiguous aliases lower than long distinctive ones", () => {
    expect(aliasConfidence("R")).toBe(0.3);
    expect(aliasConfidence("AI")).toBe(0.55); // 2-char all-caps
    expect(aliasConfidence("ts")).toBe(0.45); // 2-char lowercase
    expect(aliasConfidence("rust")).toBe(0.75); // <=4
    expect(aliasConfidence("postgresql")).toBe(0.95);
  });
});

describe("enrichedSkill", () => {
  it("merges metadata onto a dictionary entry", () => {
    const node = enrichedSkill("nodejs");
    expect(node?.category).toBe("runtime");
    expect(node?.related?.length).toBeGreaterThan(0);
    expect(node?.aliases).toContain("nodejs");
  });

  it("returns the bare entry for a long-tail skill and undefined for unknown", () => {
    const cobol = enrichedSkill("cobol");
    expect(cobol).toBeDefined();
    expect(cobol?.related).toBeUndefined();
    expect(enrichedSkill("not-a-real-skill")).toBeUndefined();
  });
});

describe("domains integrity + matching", () => {
  it("has unique ids and every related.domainId resolves", () => {
    const ids = new Set<string>();
    for (const d of DOMAINS) {
      expect(ids.has(d.id), `duplicate domain id '${d.id}'`).toBe(false);
      ids.add(d.id);
    }
    for (const d of DOMAINS) {
      for (const edge of d.related) {
        expect(ids.has(edge.domainId), `'${d.id}' → unknown domain '${edge.domainId}'`).toBe(true);
        expect(edge.weight).toBeGreaterThan(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
      }
    }
  });

  it("matches billing/payments evidence even without the literal phrase", () => {
    const found = matchDomains("Built subscription tiers on Stripe with entitlements and invoicing.");
    expect(found).toContain("billing_payments");
  });

  it("adjacentDomainWeight is symmetric and bounded", () => {
    expect(adjacentDomainWeight("billing_payments", "billing_payments")).toBe(1);
    expect(adjacentDomainWeight("billing_payments", "compliance")).toBeGreaterThan(0);
    expect(adjacentDomainWeight("compliance", "billing_payments")).toBeGreaterThan(0);
    expect(adjacentDomainWeight("billing_payments", "search_relevance")).toBe(0);
  });
});

describe("action verbs", () => {
  it("extracts lemmas across inflections and ignores prose", () => {
    const verbs = extractActionVerbs("Architected and scaled the platform; was designing the API.");
    expect(verbs).toContain("architected");
    expect(verbs).toContain("scaled");
    expect(verbs).toContain("designed");
  });

  it("sums evidence boosts (architected+scaled > built alone)", () => {
    expect(actionVerbBoost("architected and scaled")).toBeGreaterThan(actionVerbBoost("built"));
    expect(actionVerbBoost("no verbs here")).toBe(0);
  });
});

describe("seniority signals", () => {
  it("surfaces staff-level responsibility signals from bullet text", () => {
    const sigs = extractSenioritySignals(
      "Architected the billing system end-to-end and set engineering standards; mentored engineers.",
    );
    const ids = sigs.map((s) => s.id);
    expect(ids).toContain("architecture");
    expect(ids).toContain("ownership");
    expect(ids).toContain("technical_direction");
    expect(ids).toContain("mentorship");
  });

  it("returns nothing for plain text", () => {
    expect(extractSenioritySignals("Wrote some code.")).toEqual([]);
  });
});

describe("requirement importance", () => {
  it("classifies by demand strength", () => {
    expect(classifyRequirementImportance("Must have 5+ years of Node.js")).toBe("mandatory");
    expect(classifyRequirementImportance("Strong experience with PostgreSQL")).toBe("strong_preferred");
    expect(classifyRequirementImportance("Familiarity with Kafka is a plus")).toBe("preferred");
    expect(classifyRequirementImportance("You will own the payments platform")).toBe("responsibility");
    expect(classifyRequirementImportance("Comfortable working remotely")).toBe("inferred");
  });

  it("weights mandatory above preferred above bonus", () => {
    expect(requirementImportanceWeight("mandatory")).toBeGreaterThan(requirementImportanceWeight("preferred"));
    expect(requirementImportanceWeight("preferred")).toBeGreaterThan(requirementImportanceWeight("bonus"));
  });
});
