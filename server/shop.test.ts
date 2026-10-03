import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 1, openId: `${role}-open-id`, name: role, email: `${role}@example.com`, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("shop access rules", () => {
  it("allows Full Admin accounts to open staff access management", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.admin.staff.list()).resolves.toBeDefined();
  });

  it("blocks regular users from the admin product list", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows Full Admin accounts to list catalog categories", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.admin.categories.list()).resolves.toBeDefined();
  });

  it("blocks regular users from managing catalog categories", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.categories.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks regular users from uploading catalog images", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.products.uploadImage({ fileName: "tool.png", contentType: "image/png", data: "data:image/png;base64,AA==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns an active product detail record", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const result = await caller.catalog.product({ id: 90001 });
    expect(result).toHaveProperty("imageUrl");
    expect(result).toHaveProperty("galleryImages");
  });

  it("blocks regular users from the admin order inbox", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.orders.recent()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks regular users from changing an order status", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.orders.updateStatus({ id: 1, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks regular users from deleting completed orders", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.orders.deleteCompleted({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires at least one cart line on checkout", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.orders.create({ customerName: "Test Customer", phone: "0771234567", area: "Kesbewa", address: "Test address", fulfilment: "delivery", paymentMethod: "cod", items: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a delivery address that is too short", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.orders.create({ customerName: "Test Customer", phone: "0771234567", area: "Kesbewa", address: "123", fulfilment: "delivery", paymentMethod: "cod", items: [{ productId: 1, quantity: 1 }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires explicit privacy consent before checkout", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.orders.create({ customerName: "Test Customer", phone: "0771234567", area: "Kesbewa", address: "Test address", fulfilment: "delivery", paymentMethod: "cod", items: [{ productId: 1, quantity: 1 }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects honeypot checkout submissions", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.orders.create({ customerName: "Test Customer", phone: "0771234567", area: "Kesbewa", address: "Test address", fulfilment: "delivery", paymentMethod: "cod", privacyConsent: true, website: "bot", items: [{ productId: 1, quantity: 1 }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates the customer order lookup format", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.orders.lookup({ orderNo: "not-an-order", phone: "0771234567" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
