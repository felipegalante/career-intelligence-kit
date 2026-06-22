import { describe, expect, it } from "vitest";

import { inferRoleFamily } from "./role-family";

describe("inferRoleFamily", () => {
  it("maps clear titles to a family", () => {
    expect(inferRoleFamily("Senior Software Engineer")).toBe("engineering");
    expect(inferRoleFamily("Data Scientist")).toBe("data");
    expect(inferRoleFamily("Data Engineer")).toBe("data");
    expect(inferRoleFamily("UX Designer")).toBe("design");
    expect(inferRoleFamily("Product Manager")).toBe("product");
    expect(inferRoleFamily("Account Executive")).toBe("sales");
    expect(inferRoleFamily("Growth Marketing Manager")).toBe("marketing");
    expect(inferRoleFamily("Staff Accountant")).toBe("finance");
    expect(inferRoleFamily("Technical Recruiter")).toBe("hr");
    expect(inferRoleFamily("Corporate Counsel")).toBe("legal");
    expect(inferRoleFamily("Customer Success Manager")).toBe("support");
    expect(inferRoleFamily("Operations Manager")).toBe("operations");
  });

  it("resolves cross-family ambiguity by priority", () => {
    expect(inferRoleFamily("Product Engineer")).toBe("engineering");
    expect(inferRoleFamily("Design Engineer")).toBe("design");
  });

  it("falls back to the department when the title is ambiguous", () => {
    expect(inferRoleFamily("Coordinator", "Marketing")).toBe("marketing");
  });

  it("returns null when nothing matches", () => {
    expect(inferRoleFamily("Zookeeper")).toBeNull();
    expect(inferRoleFamily(null)).toBeNull();
    expect(inferRoleFamily("Coordinator")).toBeNull();
  });
});
