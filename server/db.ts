import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, gte, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, catalogCategories, orderAuditEvents, orderItems, orderNotifications, orders, products, staffAccess, staffInvites, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (user.email) {
    const access = await db.select().from(staffAccess).where(eq(staffAccess.email, user.email)).limit(1);
    if (access[0]?.isActive) {
      values.role = access[0].role === "admin" ? "admin" : "user";
      updateSet.role = values.role;
    }
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0];
}
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
    const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  return result[0];
}


export async function listActiveProducts(input: { search?: string; category?: string; page?: number; pageSize?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(6, input.pageSize ?? 12));
  const search = input.search?.trim();
  const filters = [eq(products.isActive, true)];
  if (input.category) filters.push(eq(products.category, input.category));
  const where = and(...filters);
  const allItems = await db.select().from(products).where(where).orderBy(desc(products.isFeatured), desc(products.createdAt));
  if (!search) return { items: allItems.slice((page - 1) * pageSize, page * pageSize), total: allItems.length, page, pageSize };
  const ranked = allItems.map((product) => ({ product, score: fuzzyProductScore(search, product) })).filter(({ score }) => score >= 0.28).sort((a, b) => b.score - a.score).map(({ product }) => product);
  return { items: ranked.slice((page - 1) * pageSize, page * pageSize), total: ranked.length, page, pageSize };
}

const normalizeSearch = (value: string) => value.toLocaleLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0D80-\u0DFF]+/g, " ").trim();
const levenshtein = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
};
const fuzzySimilarity = (term: string, candidate: string) => candidate.includes(term) ? 1 : Math.max(0, 1 - levenshtein(term, candidate) / Math.max(term.length, candidate.length));
export function fuzzyProductScore(search: string, product: typeof products.$inferSelect) {
  const fields = [product.name, product.nameSi, product.category, product.description].map(normalizeSearch);
  const terms = normalizeSearch(search).split(" ").filter(Boolean);
  if (!terms.length) return 1;
  const termScores = terms.map((term) => Math.max(...fields.flatMap((field) => field.split(" ").map((word) => fuzzySimilarity(term, word)).concat(fuzzySimilarity(term, field)))));
  return termScores.reduce((sum, score) => sum + score, 0) / termScores.length;
}

export async function listAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getActiveProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.isActive, true))).limit(1);
  return result[0];
}

export async function listActiveCatalogCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(catalogCategories).where(eq(catalogCategories.isActive, true)).orderBy(catalogCategories.sortOrder, catalogCategories.name);
}

export async function listAllCatalogCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(catalogCategories).orderBy(catalogCategories.sortOrder, catalogCategories.name);
}

export async function insertCatalogCategory(input: typeof catalogCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(catalogCategories).values(input);
}

export async function updateCatalogCategory(id: number, input: Partial<typeof catalogCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(catalogCategories).set(input).where(eq(catalogCategories.id, id));
}

export async function archiveCatalogCategory(id: number) {
  return updateCatalogCategory(id, { isActive: false });
}

export async function getProductsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}

const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^94/, "0");

async function anonymizeExpiredOrders(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.update(orders).set({
    customerName: "Privacy-protected customer",
    phone: "0000000000",
    area: "Anonymized",
    address: "Anonymized after retention period",
    requestedDate: null,
    deliveryTime: null,
    specialNote: null,
    anonymizedAt: new Date(),
  }).where(and(eq(orders.status, "completed"), isNull(orders.anonymizedAt), lt(orders.createdAt, cutoff)));
}

export async function listRecentOrders() {
  const db = await getDb();
  if (!db) return [];
  await anonymizeExpiredOrders(db);
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(40);
}

export async function getOrderForCustomer(orderNo: string, phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNo, orderNo.trim().toUpperCase())).limit(1);
  const order = result[0];
  if (!order || normalizePhone(order.phone) !== normalizePhone(phone)) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}

export async function getOrderForCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!result[0]) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { order: result[0], items };
}

export async function listOrderAuditEvents(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderAuditEvents).where(eq(orderAuditEvents.orderId, orderId)).orderBy(desc(orderAuditEvents.createdAt));
}

export async function listOrderNotifications(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderNotifications).where(eq(orderNotifications.orderId, orderId)).orderBy(desc(orderNotifications.createdAt));
}

const statusLabel: Record<string, string> = { pending: "received and is awaiting confirmation", confirmed: "confirmed by Dewmini Hardware", completed: "completed / delivered", cancelled: "cancelled" };
const buildStatusMessage = (orderNo: string, customerName: string, status: string) => `Dewmini Hardware update\n\nHi ${customerName}, your order ${orderNo} has been ${statusLabel[status] ?? status}.\n\nThank you for choosing Dewmini Hardware.`;

const base32Encode = (value: Buffer) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < value.length; i += 1) bits += value[i].toString(2).padStart(8, "0");
  let encoded = "";
  for (let i = 0; i < bits.length; i += 5) encoded += alphabet[Number.parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return encoded;
};
const base32Decode = (value: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const char of clean) { const index = alphabet.indexOf(char); if (index < 0) throw new Error("Invalid authenticator secret"); bits += index.toString(2).padStart(5, "0"); }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return bytes;
};
export const generateTotpSecret = () => base32Encode(randomBytes(20));
export const verifyTotpCode = (secret: string, code: string, now = Date.now()) => {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(now / 30000);
  for (const offset of [-1, 0, 1]) {
    const buffer = Buffer.alloc(8); buffer.writeBigInt64BE(BigInt(counter + offset));
    const digest = createHmac("sha1", key).update(buffer).digest();
    const position = digest[digest.length - 1] & 0x0f;
    const number = ((digest[position] & 0x7f) << 24) | (digest[position + 1] << 16) | (digest[position + 2] << 8) | digest[position + 3];
    const expected = String(number % 1_000_000).padStart(6, "0");
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
};

export async function setUserTotpSecret(userId: number, secret: string | null, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(users).set({ totpSecret: secret, totpEnabled: enabled }).where(eq(users.id, userId));
}

async function reserveOrderItems(tx: any, items: Array<{ productId: number | null; quantity: number }>) {
  for (const item of items) {
    if (!item.productId) continue;
    const result = await tx.update(products).set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` }).where(and(eq(products.id, item.productId), eq(products.isActive, true), gte(products.stockQuantity, item.quantity)));
    if (Number(result[0]?.affectedRows ?? 0) !== 1) throw new Error("OUT_OF_STOCK");
  }
}

async function restoreOrderItems(tx: any, items: Array<{ productId: number | null; quantity: number }>) {
  for (const item of items) if (item.productId) await tx.update(products).set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` }).where(eq(products.id, item.productId));
}

export async function updateOrderStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled", actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const current = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!current[0]) return false;
    if (current[0].status === status) return true;
    const items = await tx.select({ productId: orderItems.productId, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, id));
    if (current[0].status === "cancelled" && status !== "cancelled") await reserveOrderItems(tx, items);
    if (current[0].status !== "cancelled" && status === "cancelled") await restoreOrderItems(tx, items);
    await tx.update(orders).set({ status, statusUpdatedAt: new Date() }).where(eq(orders.id, id));
    await tx.insert(orderAuditEvents).values({ orderId: id, actorUserId: actorUserId ?? null, action: "status_changed", fromStatus: current[0].status, toStatus: status });
    await tx.insert(orderNotifications).values({ orderId: id, channel: "whatsapp", recipient: current[0].phone, message: buildStatusMessage(current[0].orderNo, current[0].customerName, status) });
    return true;
  });
}

export async function deleteCompletedOrder(id: number, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.id, id), eq(orders.status, "completed"))).limit(1);
    if (!existing.length) return false;
    await tx.insert(orderAuditEvents).values({ orderId: id, actorUserId: actorUserId ?? null, action: "order_deleted", fromStatus: "completed", toStatus: null });
    await tx.delete(orderItems).where(eq(orderItems.orderId, id));
    await tx.delete(orders).where(and(eq(orders.id, id), eq(orders.status, "completed")));
    return true;
  });
}

export async function createOrder(input: {
  orderNo: string;
  customerName: string;
  phone: string;
  area: string;
  address: string;
  requestedDate?: string;
  deliveryTime?: string;
  specialNote?: string;
  fulfilment: "delivery" | "pickup";
  paymentMethod: "cod" | "bank" | "shop";
  subtotalLkr: number;
  deliveryChargeLkr: number;
  totalLkr: number;
  items: Array<{ productId: number; productName: string; quantity: number; unitPriceLkr: number; lineTotalLkr: number }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    await reserveOrderItems(tx, input.items);
    const result = await tx.insert(orders).values({ orderNo: input.orderNo, customerName: input.customerName, phone: input.phone, area: input.area, address: input.address, requestedDate: input.requestedDate || null, deliveryTime: input.deliveryTime || null, specialNote: input.specialNote || null, fulfilment: input.fulfilment, paymentMethod: input.paymentMethod, subtotalLkr: input.subtotalLkr, deliveryChargeLkr: input.deliveryChargeLkr, totalLkr: input.totalLkr });
    const orderId = Number(result[0].insertId);
    await tx.insert(orderItems).values(input.items.map((item) => ({ orderId, ...item })));
    await tx.insert(orderNotifications).values({ orderId, channel: "whatsapp", recipient: input.phone, message: buildStatusMessage(input.orderNo, input.customerName, "pending") });
    return { orderId, orderNo: input.orderNo };
  });
}

export async function markOrderNotificationSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(orderNotifications).set({ status: "sent", sentAt: new Date() }).where(eq(orderNotifications.id, id));
}

export async function insertProduct(input: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(products).values(input);
}

export async function updateProduct(id: number, input: Partial<typeof products.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(products).set(input).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

export async function listStaffAccess() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffAccess).orderBy(desc(staffAccess.createdAt));
}

export async function getStaffAccessByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staffAccess).where(eq(staffAccess.email, email.toLowerCase().trim())).limit(1);
  return result[0];
}

export async function addStaffAccess(email: string, role: "admin" | "manager" | "order_staff") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(staffAccess).values({ email: email.toLowerCase().trim(), role, isActive: true }).onDuplicateKeyUpdate({ set: { role, isActive: true } });
}

export async function setStaffAccessStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.update(staffAccess).set({ isActive }).where(eq(staffAccess.id, id));
}

export async function removeStaffAccess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.delete(staffAccess).where(eq(staffAccess.id, id));
}

export async function createStaffInvite(role: "admin" | "manager" | "order_staff") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(staffInvites).values({ token, role, expiresAt });
  return { token, role, expiresAt };
}

export async function redeemStaffInvite(token: string, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const result = await db.update(staffInvites).set({ usedAt: now }).where(and(eq(staffInvites.token, token), isNull(staffInvites.usedAt), gt(staffInvites.expiresAt, now)));
  if (!result[0] || Number(result[0].affectedRows ?? 0) !== 1) throw new Error("This invite is invalid, expired, or already used");
  const invite = await db.select().from(staffInvites).where(eq(staffInvites.token, token)).limit(1);
  const role = invite[0]?.role;
  if (!role) throw new Error("Invite could not be read");
  await addStaffAccess(email, role);
  return { role };
}
