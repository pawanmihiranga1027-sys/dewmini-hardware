import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  totpSecret: varchar("totpSecret", { length: 64 }),
  totpEnabled: boolean("totpEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const staffAccess = mysqlTable("staffAccess", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "manager", "order_staff"]).default("order_staff").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const staffInvites = mysqlTable("staffInvites", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 96 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "manager", "order_staff"]).default("order_staff").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  nameSi: varchar("nameSi", { length: 220 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description").notNull(),
  priceLkr: int("priceLkr").notNull(),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  imageUrl: text("imageUrl").notNull(),
  galleryImages: text("galleryImages"),
  badge: varchar("badge", { length: 40 }),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const catalogCategories = mysqlTable("catalogCategories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  label: varchar("label", { length: 220 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  customerName: varchar("customerName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  area: varchar("area", { length: 120 }).notNull(),
  address: text("address").notNull(),
  requestedDate: varchar("requestedDate", { length: 30 }),
  deliveryTime: varchar("deliveryTime", { length: 80 }),
  specialNote: text("specialNote"),
  fulfilment: mysqlEnum("fulfilment", ["delivery", "pickup"]).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cod", "bank", "shop"]).notNull(),
  subtotalLkr: int("subtotalLkr").notNull(),
  deliveryChargeLkr: int("deliveryChargeLkr").default(0).notNull(),
  totalLkr: int("totalLkr").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
  anonymizedAt: timestamp("anonymizedAt"),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 180 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPriceLkr: int("unitPriceLkr").notNull(),
  lineTotalLkr: int("lineTotalLkr").notNull(),
});

export const orderAuditEvents = mysqlTable("orderAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 50 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 30 }),
  toStatus: varchar("toStatus", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orderNotifications = mysqlTable("orderNotifications", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "sms"]).notNull(),
  recipient: varchar("recipient", { length: 30 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["queued", "sent", "failed"]).default("queued").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StaffAccess = typeof staffAccess.$inferSelect;
export type StaffInvite = typeof staffInvites.$inferSelect;
export type Product = typeof products.$inferSelect;
export type CatalogCategory = typeof catalogCategories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderAuditEvent = typeof orderAuditEvents.$inferSelect;
export type OrderNotification = typeof orderNotifications.$inferSelect;
