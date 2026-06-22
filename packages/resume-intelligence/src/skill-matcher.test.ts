import { describe, expect, it } from "vitest";

import { matchSkills } from "./skill-matcher";

describe("matchSkills", () => {
  it("counts occurrences and records the first offset", () => {
    // Go's only alias is "golang" (bare "go" collides with prose), by design.
    const text = "TypeScript. We love TypeScript and more TypeScript. Also Golang.";
    const matches = matchSkills(text);
    const ts = matches.find((m) => m.normalizedName === "typescript");
    expect(ts?.count).toBe(3);
    expect(ts?.firstOffset).toBe(0);
    expect(matches.find((m) => m.normalizedName === "go")).toBeTruthy();
  });

  it("matches punctuated aliases without firing on embedded substrings", () => {
    const matches = matchSkills("Built in C++ and C#. Not reactive, not postgresql-as-sql.");
    const names = matches.map((m) => m.normalizedName);
    expect(names).toContain("cpp");
    expect(names).toContain("csharp");
    expect(names).not.toContain("react"); // "reactive" must not match react
  });

  it("returns nothing for empty input", () => {
    expect(matchSkills("")).toEqual([]);
    expect(matchSkills(null)).toEqual([]);
  });
});
