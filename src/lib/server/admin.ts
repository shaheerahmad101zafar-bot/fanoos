import bcrypt from "bcryptjs";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cashMoves,
  cashSessions,
  categories,
  customers,
  discounts,
  invoices,
  products,
  tenants,
  users,
} from "@/lib/db/schema";
import { id, licenseKey } from "@/lib/ids";

export async function listShops() {
  const shops = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  return Promise.all(
    shops.map(async (shop) => {
      const owners = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          active: users.active,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.tenantId, shop.id));
      const owner = owners.find((u) => u.role === "OWNER") || owners[0] || null;
      return {
        id: shop.id,
        companyName: shop.companyName,
        businessType: shop.businessType,
        status: shop.status,
        city: shop.city,
        phone: shop.phone,
        email: shop.email,
        licenseKey: shop.licenseKey,
        expiresAt: shop.expiresAt,
        createdAt: shop.createdAt,
        staffCount: owners.length,
        lastLoginAt: owners.reduce((max, u) => Math.max(max, u.lastLoginAt || 0), 0) || null,
        owner: owner
          ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role, active: owner.active }
          : null,
      };
    }),
  );
}

export async function listPendingAdmins() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      active: users.active,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      pendingTrialDays: users.pendingTrialDays,
    })
    .from(users)
    .where(and(eq(users.role, "OWNER"), isNull(users.tenantId)));
}

export async function adminStats() {
  const shops = await db.select().from(tenants);
  const pending = await listPendingAdmins();
  const now = Date.now();
  return {
    shops: shops.length,
    pendingAdmins: pending.length,
    active: shops.filter((s) => s.status === "ACTIVE").length,
    trial: shops.filter((s) => s.status === "TRIAL").length,
    suspended: shops.filter((s) => s.status === "SUSPENDED").length,
    expiring: shops.filter((s) => s.expiresAt && s.expiresAt < now + 1000 * 60 * 60 * 24 * 14).length,
  };
}

export async function createShopAdmin(payload: {
  name: string;
  email: string;
  password: string;
  trialDays?: number;
}) {
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const password = String(payload.password || "").trim();
  if (!name) throw new Error("Admin name is required");
  if (!email) throw new Error("Email is required");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");
  if ((await db.select().from(users).where(eq(users.email, email)).limit(1))[0]) {
    throw new Error("This email is already used");
  }
  const now = Date.now();
  const row = {
    id: id("usr"),
    email,
    name,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "OWNER" as const,
    tenantId: null,
    pendingTrialDays: payload.trialDays ?? 30,
    active: true,
    lastLoginAt: null,
    createdAt: now,
  };
  await db.insert(users).values(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: true,
    createdAt: now,
    lastLoginAt: null,
    pendingTrialDays: row.pendingTrialDays,
  };
}

function assertShopAdmin(row: typeof users.$inferSelect | undefined) {
  if (!row || row.role === "SUPER_ADMIN") throw new Error("This control is Super Admin only");
  if (row.role !== "OWNER") throw new Error("Admin not found");
  return row;
}

export async function setAdminActive(userId: string, active: boolean) {
  const row = assertShopAdmin((await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]);
  await db.update(users).set({ active }).where(eq(users.id, userId));
  return { id: row.id, active };
}

export async function resetAdminPassword(userId: string, password: string) {
  const next = String(password || "").trim();
  if (!next || next.length < 6) throw new Error("Password must be at least 6 characters");
  const row = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!row || row.role === "SUPER_ADMIN") throw new Error("This control is Super Admin only");
  if (row.role !== "OWNER" && row.role !== "CASHIER") throw new Error("Admin not found");
  await db.update(users).set({ passwordHash: bcrypt.hashSync(next, 10) }).where(eq(users.id, userId));
  return { id: row.id, email: row.email, ok: true };
}

export async function deleteShopById(tenantId: string) {
  await db.delete(cashMoves).where(eq(cashMoves.tenantId, tenantId));
  await db.delete(cashSessions).where(eq(cashSessions.tenantId, tenantId));
  await db.delete(invoices).where(eq(invoices.tenantId, tenantId));
  await db.delete(products).where(eq(products.tenantId, tenantId));
  await db.delete(discounts).where(eq(discounts.tenantId, tenantId));
  await db.delete(customers).where(eq(customers.tenantId, tenantId));
  await db.delete(categories).where(eq(categories.tenantId, tenantId));
  await db.delete(users).where(eq(users.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  return { ok: true };
}

export async function deleteShopAdmin(userId: string) {
  const row = assertShopAdmin((await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]);
  if (row.tenantId) {
    await deleteShopById(row.tenantId);
  } else {
    await db.delete(users).where(eq(users.id, userId));
  }
  return { ok: true };
}

export async function createShop(payload: {
  companyName: string;
  businessType: string;
  city?: string;
  phone?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ntn?: string;
  defaultTaxPercent?: number;
  trialDays?: number;
}) {
  const email = payload.ownerEmail.trim().toLowerCase();
  const taken = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (taken) throw new Error("This email is already used");
  const now = Date.now();
  const tenantId = id("tnt");
  const days = payload.trialDays ?? 30;
  await db.insert(tenants).values({
    id: tenantId,
    businessType: payload.businessType || "GENERAL",
    status: "TRIAL",
    companyName: payload.companyName.trim(),
    tradeName: payload.companyName.trim(),
    city: payload.city || null,
    phone: payload.phone || null,
    email,
    ntn: payload.ntn || null,
    invoicePrefix: payload.companyName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "INV",
    defaultTaxPercent: payload.defaultTaxPercent ?? 0,
    licenseKey: licenseKey(),
    expiresAt: now + days * 86400000,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(users).values({
    id: id("usr"),
    email,
    name: payload.ownerName.trim(),
    passwordHash: bcrypt.hashSync(payload.ownerPassword, 10),
    role: "OWNER",
    tenantId,
    active: true,
    createdAt: now,
  });
  return (await listShops()).find((s) => s.id === tenantId);
}

export async function patchShop(idValue: string, payload: { status?: string; expiresAt?: number | null; notes?: string }) {
  const shop = (await db.select().from(tenants).where(eq(tenants.id, idValue)).limit(1))[0];
  if (!shop) throw new Error("Shop not found");
  await db
    .update(tenants)
    .set({
      status: payload.status || shop.status,
      expiresAt: payload.expiresAt === undefined ? shop.expiresAt : payload.expiresAt,
      notes: payload.notes ?? shop.notes,
      updatedAt: Date.now(),
    })
    .where(eq(tenants.id, idValue));
  return (await listShops()).find((s) => s.id === idValue);
}

export async function createStaff(tenantId: string, payload: { name: string; email: string; password: string; role?: string }) {
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const password = String(payload.password || "").trim();
  if (!name) throw new Error("Cashier name is required");
  if (!email || !email.includes("@")) throw new Error("Enter a valid email");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const taken = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (taken) throw new Error("This email is already used. Give the cashier a different email.");
  const row = {
    id: id("usr"),
    email,
    name,
    passwordHash: await bcrypt.hash(password, 8),
    role: payload.role === "OWNER" ? "OWNER" : "CASHIER",
    tenantId,
    active: true,
    lastLoginAt: null,
    createdAt: Date.now(),
  };
  try {
    await db.insert(users).values(row);
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(text)) {
      throw new Error("This email is already used. Give the cashier a different email.");
    }
    throw err;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: true,
    lastLoginAt: null,
  };
}

export async function deleteStaff(tenantId: string, userId: string) {
  const row = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!row || row.tenantId !== tenantId) throw new Error("Cashier not found");
  if (row.role !== "CASHIER") throw new Error("Only a cashier can be deleted from the shop");
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true, id: userId };
}
