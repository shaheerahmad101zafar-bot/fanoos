import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureColumns } from "@/lib/db/migrate";
import { tenants, users } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/types";

export async function loginUser(email: string, password: string): Promise<SessionUser> {
  await ensureColumns();
  const user = (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
  if (!user) throw new Error("Wrong email or password");
  if (!user.active) throw new Error("This account is inactive. Contact Fanoos on WhatsApp.");
  if (!bcrypt.compareSync(password.trim(), user.passwordHash)) throw new Error("Wrong email or password");

  if (user.role === "SUPER_ADMIN") {
    // HQ login — no shop book
  } else if (user.role === "OWNER" && !user.tenantId) {
    // New shop admin — they still need to open their own shop
  } else if (!user.tenantId) {
    throw new Error("This account is not linked to a shop");
  } else {
    const shop = (await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1))[0];
    if (!shop) throw new Error("Shop not found");
    if (shop.status === "SUSPENDED") throw new Error("This shop is suspended. Contact Fanoos.");
    if (shop.expiresAt && shop.expiresAt < Date.now()) throw new Error("License expired. Contact Fanoos.");
  }

  await db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, user.id));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    tenantId: user.tenantId,
  };
}
