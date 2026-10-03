import { describe, expect, it } from "vitest";
import { canManageStaffAccess, getPreferredAdminTab } from "../client/src/pages/Admin";

describe("getPreferredAdminTab", () => {
  it("opens catalog for admin and manager roles", () => {
    expect(getPreferredAdminTab("admin")).toBe("catalog");
    expect(getPreferredAdminTab("manager")).toBe("catalog");
  });

  it("opens orders for order staff or an unresolved session", () => {
    expect(getPreferredAdminTab("order_staff")).toBe("orders");
    expect(getPreferredAdminTab(null)).toBe("orders");
  });
});


describe("canManageStaffAccess", () => {
  it("allows delegated Full Admins to add and manage staff", () => {
    expect(canManageStaffAccess("admin", false, "user")).toBe(true);
    expect(canManageStaffAccess(null, false, "admin")).toBe(true);
  });

  it("keeps managers and order staff scoped", () => {
    expect(canManageStaffAccess("manager", false, "user")).toBe(false);
    expect(canManageStaffAccess("order_staff", false, "user")).toBe(false);
  });
});
