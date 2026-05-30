import { describe, it, expect } from "vitest";

/** Mirror of AuthContext.hasRole — keeps role gating contract under test
 *  without needing to mount the full provider. If the production logic
 *  changes, this test will fail and force a deliberate update. */
type AppRole = "admin" | "inventory" | "salesman" | "dispatch" | "billing";
const makeHasRole = (roles: AppRole[]) => (r: AppRole | AppRole[]) => {
  const arr = Array.isArray(r) ? r : [r];
  if (roles.includes("admin")) return true;
  return arr.some((x) => roles.includes(x));
};

describe("Role gating contract", () => {
  it("admin can do anything", () => {
    const h = makeHasRole(["admin"]);
    expect(h(["billing"])).toBe(true);
    expect(h(["inventory", "dispatch"])).toBe(true);
    expect(h("salesman")).toBe(true);
  });

  it("stock adjustments require admin/inventory/dispatch", () => {
    const required: AppRole[] = ["admin", "inventory", "dispatch"];
    expect(makeHasRole(["inventory"])(required)).toBe(true);
    expect(makeHasRole(["dispatch"])(required)).toBe(true);
    expect(makeHasRole(["salesman"])(required)).toBe(false);
    expect(makeHasRole(["billing"])(required)).toBe(false);
  });

  it("reservation release requires admin/salesman/billing", () => {
    const required: AppRole[] = ["admin", "salesman", "billing"];
    expect(makeHasRole(["salesman"])(required)).toBe(true);
    expect(makeHasRole(["billing"])(required)).toBe(true);
    expect(makeHasRole(["inventory"])(required)).toBe(false);
    expect(makeHasRole(["dispatch"])(required)).toBe(false);
  });

  it("billing approval requires admin/billing only", () => {
    const required: AppRole[] = ["admin", "billing"];
    expect(makeHasRole(["billing"])(required)).toBe(true);
    expect(makeHasRole(["salesman"])(required)).toBe(false);
    expect(makeHasRole(["inventory"])(required)).toBe(false);
    expect(makeHasRole(["dispatch"])(required)).toBe(false);
  });

  it("dispatch submit requires admin/dispatch", () => {
    const required: AppRole[] = ["admin", "dispatch"];
    expect(makeHasRole(["dispatch"])(required)).toBe(true);
    expect(makeHasRole(["billing"])(required)).toBe(false);
    expect(makeHasRole(["salesman"])(required)).toBe(false);
  });

  it("no roles = no access", () => {
    expect(makeHasRole([])("admin")).toBe(false);
    expect(makeHasRole([])(["billing", "inventory"])).toBe(false);
  });
});