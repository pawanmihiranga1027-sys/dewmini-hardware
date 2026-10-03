import "dotenv/config";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffAccess, users } from "../drizzle/schema";

const rl = createInterface({ input, output });

try {
  const email = (await rl.question("Admin email: ")).trim().toLowerCase();
  const name = (await rl.question("Admin name: ")).trim();
  const password = await rl.question("Admin password: ");

  if (!email || !name || password.length < 6) {
    throw new Error("Email/name required and password must be at least 6 characters.");
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database connection failed. Check DATABASE_URL in .env");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const openId = `local:${email}`.slice(0, 64);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: number;

  if (existing[0]) {
    await db
      .update(users)
      .set({
        name,
        passwordHash,
        loginMethod: "local",
        role: "admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing[0].id));

    userId = existing[0].id;
    console.log(`Existing user updated. ID: ${userId}`);
  } else {
    const result = await db.insert(users).values({
      openId,
      name,
      email,
      passwordHash,
      loginMethod: "local",
      role: "admin",
    });

    userId = Number(result[0].insertId);
    console.log(`Admin user created. ID: ${userId}`);
  }

  const existingAccess = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.email, email))
    .limit(1);

  if (!existingAccess[0]) {
    await db.insert(staffAccess).values({
      email,
      role: "admin",
      isActive: true,
    });
  } else {
    await db
      .update(staffAccess)
      .set({
        role: "admin",
        isActive: true,
      })
      .where(eq(staffAccess.id, existingAccess[0].id));
  }

  console.log("Staff access: ADMIN");
  console.log("Account is ready.");
} catch (error) {
  console.error("ERROR:", error instanceof Error ? error.message : error);
} finally {
  rl.close();
}