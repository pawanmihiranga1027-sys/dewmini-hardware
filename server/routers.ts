import { COOKIE_NAME } from "@shared/const";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addStaffAccess, archiveCatalogCategory, createOrder, createStaffInvite, deleteCompletedOrder, deleteProduct, generateTotpSecret, getActiveProductById, getOrderForCustomer, getOrderForCustomerById, getProductsByIds, getStaffAccessByEmail, getUserByEmail, insertCatalogCategory, insertProduct, listActiveCatalogCategories, listActiveProducts, listAllCatalogCategories, listAllProducts, listOrderAuditEvents, listOrderNotifications, listRecentOrders, listStaffAccess, markOrderNotificationSent, redeemStaffInvite, removeStaffAccess, setStaffAccessStatus, setUserTotpSecret, updateCatalogCategory, updateOrderStatus, updateProduct, verifyTotpCode } from "./db";
import { storagePut } from "./storage";

const productInput = z.object({
  name: z.string().min(2),
  nameSi: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(2),
  priceLkr: z.number().int().positive(),
  stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
  imageUrl: z.string().refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/manus-storage/"), "Use an image URL or WebDev storage path"),
  galleryImages: z.string().refine((value) => {
    try {
      const images = JSON.parse(value) as unknown;
      return Array.isArray(images) && images.length <= 8 && images.every((item) => typeof item === "string" && (item.startsWith("http://") || item.startsWith("https://") || item.startsWith("/manus-storage/")));
    } catch { return false; }
  }, "Gallery images must be a JSON list of valid image URLs").optional().nullable(),
  badge: z.string().max(40).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const categoryImage = z.string().refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/manus-storage/"), "Use an image URL or WebDev storage path");
const categoryInput = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(2).max(120),
  label: z.string().trim().min(2).max(220),
  imageUrl: categoryImage,
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

const checkoutInput = z.object({
  customerName: z.string().trim().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  area: z.string().trim().min(2, "Area must be at least 2 characters"),
  address: z.string().trim().min(5, "Delivery address must be at least 5 characters"),
  requestedDate: z.string().optional(),
  deliveryTime: z.string().optional(),
  specialNote: z.string().optional(),
  fulfilment: z.enum(["delivery", "pickup"]),
  paymentMethod: z.enum(["cod", "bank", "shop"]),
  privacyConsent: z.literal(true, { message: "Privacy consent is required" }),
  website: z.string().max(0).optional(),
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1),
});

const getStaffRole = async (ctx: { user: NonNullable<TrpcContext["user"]> }) => {
  if (ctx.user.openId === ENV.ownerOpenId || ctx.user.role === "admin") return "admin" as const;
  const access = ctx.user.email ? await getStaffAccessByEmail(ctx.user.email) : undefined;
  return access?.isActive ? access.role : null;
};

const ADMIN_2FA_COOKIE = "dewmini_admin_2fa";
const signTwoFactorCookie = (userId: number, expiresAt: number) => {
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", ENV.cookieSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
};
const isTwoFactorVerified = (ctx: Pick<TrpcContext, "req"> & { user: NonNullable<TrpcContext["user"]> }) => {
  if (!ctx.user.totpEnabled) return true;
  const raw = ctx.req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_2FA_COOKIE}=`))?.split("=").slice(1).join("=");
  if (!raw) return false;
  const [userId, expiresAt, signature] = raw.split(".");
  if (Number(userId) !== ctx.user.id || !Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now() || !signature) return false;
  const expected = createHmac("sha256", ENV.cookieSecret).update(`${userId}.${expiresAt}`).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const staffRole = await getStaffRole(ctx);
  if (!staffRole) throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  if (!isTwoFactorVerified(ctx)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Authenticator verification required" });
  return next({ ctx: { ...ctx, staffRole } });
});

const managerProcedure = staffProcedure.use(({ ctx, next }) => {
  if (ctx.staffRole !== "admin" && ctx.staffRole !== "manager") throw new TRPCError({ code: "FORBIDDEN", message: "Manager access required" });
  return next();
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  return next();
});

const staffAdminProcedure = staffProcedure.use(({ ctx, next }) => {
  if (ctx.staffRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Full Admin access required" });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    login: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const user = await getUserByEmail(input.email);

    if (!user || !user.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash
    );

    if (!passwordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const staffRole = await getStaffRole({ user });

    if (!staffRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Staff access required",
      });
    }

    const cookieOptions = getSessionCookieOptions(ctx.req);

    const sessionToken = await (await import("./_core/sdk")).sdk.createSessionToken(
  user.openId,
  { name: user.name ?? "Dewmini Staff" }
);
    ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    return {
      success: true,
      staffRole,
    };
  }),
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      const staffRole = await getStaffRole({ user });
      return { ...user, staffRole, isOwner: user.openId === ENV.ownerOpenId, twoFactorVerified: isTwoFactorVerified({ ...opts.ctx, user }) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(6).max(48).default(12) }).optional()).query(({ input }) => listActiveProducts(input ?? {})),
    categories: publicProcedure.query(() => listActiveCatalogCategories()),
    product: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const product = await getActiveProductById(input.id);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return product;
    }),
  }),
  orders: router({
    create: publicProcedure.input(checkoutInput).mutation(async ({ input }) => {
      if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Order could not be submitted" });
      const products = await getProductsByIds(input.items.map((item) => item.productId));
      const uniqueIds = new Set(input.items.map((item) => item.productId));
      const productMap = new Map(products.map((product) => [product.id, product]));
      if (products.length !== uniqueIds.size || products.some((product) => !product.isActive)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Some selected products are no longer available" });
      }
      const items = input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: product.id,
          productName: product.nameSi,
          quantity: item.quantity,
          unitPriceLkr: product.priceLkr,
          lineTotalLkr: product.priceLkr * item.quantity,
        };
      });
      const subtotalLkr = items.reduce((sum, item) => sum + item.lineTotalLkr, 0);
      const deliveryChargeLkr = 0;
      const totalLkr = subtotalLkr + deliveryChargeLkr;
      const orderNo = `DW-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      let result;
      try { result = await createOrder({ ...input, orderNo, subtotalLkr, deliveryChargeLkr, totalLkr, items }); }
      catch (error) { if (error instanceof Error && error.message === "OUT_OF_STOCK") throw new TRPCError({ code: "BAD_REQUEST", message: "Some selected products are out of stock. Please refresh the catalog and try again." }); throw error; }
      return { ...result, subtotalLkr, deliveryChargeLkr, totalLkr };
    }),
    lookup: publicProcedure.input(z.object({ orderNo: z.string().trim().regex(/^DW-\d{4}-\d{6}$/i), phone: z.string().trim().min(9).max(20) })).query(async ({ input }) => {
      const result = await getOrderForCustomer(input.orderNo, input.phone);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Order number or phone number did not match" });
      return result;
    }),
  }),
  admin: router({
    categories: router({
      list: managerProcedure.query(() => listAllCatalogCategories()),
      create: managerProcedure.input(categoryInput).mutation(({ input }) => insertCatalogCategory(input)),
      update: managerProcedure.input(z.object({ id: z.number().int().positive(), data: categoryInput.partial() })).mutation(({ input }) => updateCatalogCategory(input.id, input.data)),
      archive: managerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => archiveCatalogCategory(input.id)),
    }),
    products: router({
      list: staffProcedure.query(() => listAllProducts()),
      uploadImage: managerProcedure.input(z.object({ fileName: z.string().min(1).max(120), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), data: z.string().min(20).max(7000000) })).mutation(async ({ input, ctx }) => {
        const raw = input.data.includes(",") ? input.data.split(",").pop()! : input.data;
        const bytes = Buffer.from(raw, "base64");
        if (bytes.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be smaller than 5MB" });
        const safeName = input.fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        return storagePut(`catalog/${ctx.user.id}-${Date.now()}-${safeName}`, bytes, input.contentType);
      }),
      create: managerProcedure.input(productInput).mutation(({ input }) => insertProduct(input)),
      update: managerProcedure.input(z.object({ id: z.number().int().positive(), data: productInput.partial() })).mutation(({ input }) => updateProduct(input.id, input.data)),
      archive: managerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteProduct(input.id)),
    }),
    orders: router({
      recent: staffProcedure.query(() => listRecentOrders()),
      detail: staffProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
        const result = await getOrderForCustomerById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        return { ...result, audit: await listOrderAuditEvents(input.id), notifications: await listOrderNotifications(input.id) };
      }),
      updateStatus: staffProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "confirmed", "completed", "cancelled"]) })).mutation(async ({ input, ctx }) => {
        try { return await updateOrderStatus(input.id, input.status, ctx.user.id); }
        catch (error) { if (error instanceof Error && error.message === "OUT_OF_STOCK") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reactivate this order because one or more products do not have enough stock." }); throw error; }
      }),
      deleteCompleted: staffAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const deleted = await deleteCompletedOrder(input.id, ctx.user.id);
        if (!deleted) throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed orders can be deleted" });
        return { success: true } as const;
      }),
    }),
    security: router({
      totp: router({
        status: protectedProcedure.query(({ ctx }) => ({ enabled: Boolean(ctx.user.totpEnabled), verified: isTwoFactorVerified(ctx) })),
        setup: protectedProcedure.mutation(async ({ ctx }) => {
          const role = await getStaffRole(ctx);
          if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
          if (ctx.user.totpEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Authenticator is already enabled" });
          const secret = generateTotpSecret();
          await setUserTotpSecret(ctx.user.id, secret, false);
          return { secret, uri: `otpauth://totp/Dewmini%20Hardware:${encodeURIComponent(ctx.user.email ?? ctx.user.name ?? "staff")}?secret=${secret}&issuer=Dewmini%20Hardware` };
        }),
        enable: protectedProcedure.input(z.object({ code: z.string().regex(/^\d{6}$/) })).mutation(async ({ input, ctx }) => {
          const role = await getStaffRole(ctx);
          if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
          if (!ctx.user.totpSecret || !verifyTotpCode(ctx.user.totpSecret, input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "That authenticator code is not valid" });
          await setUserTotpSecret(ctx.user.id, ctx.user.totpSecret, true);
          const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
          ctx.res.cookie(ADMIN_2FA_COOKIE, signTwoFactorCookie(ctx.user.id, expiresAt), { httpOnly: true, sameSite: "none", secure: true, path: "/", maxAge: 12 * 60 * 60 * 1000 });
          return { enabled: true } as const;
        }),
        verify: protectedProcedure.input(z.object({ code: z.string().regex(/^\d{6}$/) })).mutation(async ({ input, ctx }) => {
          if (!ctx.user.totpEnabled || !ctx.user.totpSecret || !verifyTotpCode(ctx.user.totpSecret, input.code)) throw new TRPCError({ code: "UNAUTHORIZED", message: "That authenticator code is not valid" });
          const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
          ctx.res.cookie(ADMIN_2FA_COOKIE, signTwoFactorCookie(ctx.user.id, expiresAt), { httpOnly: true, sameSite: "none", secure: true, path: "/", maxAge: 12 * 60 * 60 * 1000 });
          return { verified: true } as const;
        }),
        disable: staffAdminProcedure.mutation(async ({ ctx }) => { await setUserTotpSecret(ctx.user.id, null, false); ctx.res.clearCookie(ADMIN_2FA_COOKIE, { httpOnly: true, sameSite: "none", secure: true, path: "/" }); return { enabled: false } as const; }),
      }),
    }),
    staff: router({
      list: staffAdminProcedure.query(() => listStaffAccess()),
      grant: staffAdminProcedure.input(z.object({ email: z.string().email(), role: z.enum(["admin", "manager", "order_staff"]) })).mutation(({ input }) => addStaffAccess(input.email, input.role)),
      createInvite: staffAdminProcedure.input(z.object({ role: z.enum(["admin", "manager", "order_staff"]) })).mutation(({ input }) => createStaffInvite(input.role)),
      redeemInvite: protectedProcedure.input(z.object({ token: z.string().min(20).max(96) })).mutation(async ({ input, ctx }) => {
        if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your account needs an email address to accept this invite" });
        try {
          return await redeemStaffInvite(input.token, ctx.user.email);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invite could not be redeemed" });
        }
      }),
      setStatus: staffAdminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(({ input }) => setStaffAccessStatus(input.id, input.isActive)),
      remove: staffAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => removeStaffAccess(input.id)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
