import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
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
import { ensureColumns } from "@/lib/db/migrate";
import { buildQrPayload } from "@/lib/fbr";
import { writeSession } from "@/lib/auth";
import { id, invoiceNumber, licenseKey } from "@/lib/ids";
import { billTotals } from "@/lib/price";
import { ensureSampleCatalog } from "@/lib/server/sample-catalog";
import type { InvoiceItem, SessionUser } from "@/lib/types";

export function assertTenant(session: SessionUser): string {
  if (!session.tenantId || session.role === "SUPER_ADMIN") {
    const err = new Error("FORBIDDEN");
    err.name = "FORBIDDEN";
    throw err;
  }
  return session.tenantId;
}

async function first<T>(rows: T[]) {
  return rows[0];
}

export async function getTenantOrThrow(tenantId: string) {
  const shop = await first(await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1));
  if (!shop) throw new Error("Shop not found");
  if (shop.status === "SUSPENDED") throw new Error("This shop license is suspended");
  if (shop.expiresAt && shop.expiresAt < Date.now()) throw new Error("This shop license has expired");
  return shop;
}

export async function bootstrap(tenantId: string, session: SessionUser) {
  await ensureColumns();
  const shop = await getTenantOrThrow(tenantId);
  await ensureSampleCatalog(tenantId, shop.businessType);
  const since = Date.now() - 1000 * 60 * 60 * 24 * 120;

  const [cats, prods, discs, custs, invs, staffRows, sessionRows, moves] = await Promise.all([
    db.select().from(categories).where(eq(categories.tenantId, tenantId)),
    db.select().from(products).where(eq(products.tenantId, tenantId)),
    db.select().from(discounts).where(eq(discounts.tenantId, tenantId)),
    db.select().from(customers).where(eq(customers.tenantId, tenantId)),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), gte(invoices.createdAt, since)))
      .orderBy(desc(invoices.createdAt)),
    session.role === "OWNER"
      ? db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            active: users.active,
            lastLoginAt: users.lastLoginAt,
          })
          .from(users)
          .where(eq(users.tenantId, tenantId))
      : Promise.resolve([]),
    db
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.tenantId, tenantId), isNull(cashSessions.closedAt)))
      .limit(1),
    db
      .select()
      .from(cashMoves)
      .where(and(eq(cashMoves.tenantId, tenantId), gte(cashMoves.createdAt, Date.now() - 1000 * 60 * 60 * 24 * 40)))
      .orderBy(desc(cashMoves.createdAt)),
  ]);
  const sessionRow = sessionRows[0];

  return {
    user: session,
    tenant: publicTenant(shop),
    categories: cats,
    products: prods,
    discounts: discs,
    customers: custs,
    invoices: invs.map(mapInvoice),
    staff: staffRows,
    cashSession: sessionRow ?? null,
    cashMoves: moves,
  };
}

export function publicTenant(shop: typeof tenants.$inferSelect) {
  return {
    id: shop.id,
    businessType: shop.businessType,
    status: shop.status,
    companyName: shop.companyName,
    tradeName: shop.tradeName,
    address: shop.address,
    city: shop.city,
    phone: shop.phone,
    email: shop.email,
    ntn: shop.ntn,
    strn: shop.strn,
    fbrPosId: shop.fbrPosId,
    fbrLicenseDate: shop.fbrLicenseDate,
    fbrRegisterId: shop.fbrRegisterId,
    customQr: shop.customQr,
    logoData: shop.logoData,
    invoiceLogoData: shop.invoiceLogoData,
    invoicePrefix: shop.invoicePrefix,
    currency: shop.currency,
    defaultTaxPercent: shop.defaultTaxPercent,
    takeawayServiceTaxPercent: shop.takeawayServiceTaxPercent,
    defaultDeliveryCharge: shop.defaultDeliveryCharge,
    licenseKey: shop.licenseKey,
    expiresAt: shop.expiresAt,
  };
}

function mapInvoice(row: typeof invoices.$inferSelect) {
  return {
    ...row,
    items: JSON.parse(row.itemsJson) as InvoiceItem[],
  };
}

export async function upsertCategory(
  tenantId: string,
  payload: { id?: string; name: string; color?: string; parentId?: string | null },
) {
  await ensureColumns();
  const parentId = payload.parentId || null;
  if (parentId) {
    const parent = await first(
      await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, parentId), eq(categories.tenantId, tenantId)))
        .limit(1),
    );
    if (!parent) throw new Error("Parent category not found");
    if (parent.parentId) throw new Error("A subcategory cannot have its own subcategory");
    if (parentId === payload.id) throw new Error("A category cannot sit under itself");
  }
  const row = {
    id: payload.id || id("cat"),
    tenantId,
    name: payload.name.trim(),
    color: payload.color || "#D4B36A",
    parentId,
  };
  if (!row.name) throw new Error("Category name is required");
  const existing = await first(
    await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, row.id), eq(categories.tenantId, tenantId)))
      .limit(1),
  );
  if (existing) {
    await db
      .update(categories)
      .set({ name: row.name, color: row.color, parentId: row.parentId })
      .where(eq(categories.id, row.id));
  } else {
    await db.insert(categories).values(row);
  }
  return first(await db.select().from(categories).where(eq(categories.id, row.id)).limit(1));
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  await ensureColumns();
  const row = await first(
    await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)))
      .limit(1),
  );
  if (!row) return { ok: true };
  const now = Date.now();

  if (row.parentId) {
    await db
      .update(products)
      .set({ categoryId: row.parentId, updatedAt: now })
      .where(and(eq(products.tenantId, tenantId), eq(products.categoryId, categoryId)));
    await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)));
    return { ok: true };
  }

  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.tenantId, tenantId), eq(categories.parentId, categoryId)));
  const ids = [categoryId, ...children.map((c) => c.id)];
  await db
    .update(products)
    .set({ categoryId: null, updatedAt: now })
    .where(and(eq(products.tenantId, tenantId), inArray(products.categoryId, ids)));
  await db.delete(categories).where(and(eq(categories.tenantId, tenantId), inArray(categories.id, ids)));
  return { ok: true };
}

export async function upsertProduct(tenantId: string, payload: Record<string, unknown>) {
  await ensureColumns();
  const now = Date.now();
  const pid = String(payload.id || id("prd"));
  const existing = await first(
    await db
      .select()
      .from(products)
      .where(and(eq(products.id, pid), eq(products.tenantId, tenantId)))
      .limit(1),
  );
  const row = {
    id: pid,
    tenantId,
    categoryId: (payload.categoryId as string) || null,
    discountId: (payload.discountId as string) || null,
    name: String(payload.name || "").trim(),
    sku: (payload.sku as string) || null,
    barcode: (payload.barcode as string) || null,
    description: (payload.description as string) || null,
    price: Number(payload.price || 0),
    costPrice: Number(payload.costPrice || 0),
    taxPercent: Number(payload.taxPercent ?? 0),
    stock: Number(payload.stock ?? 0),
    lowStock: Number(payload.lowStock ?? 5),
    unit: String(payload.unit || "pcs"),
    imageData: (payload.imageData as string) || existing?.imageData || null,
    expiryDate: payload.expiryDate ? Number(payload.expiryDate) : null,
    batchNo: (payload.batchNo as string) || null,
    active: payload.active === false ? false : true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  if (!row.name) throw new Error("Product name is required");
  if (existing) {
    await db.update(products).set(row).where(and(eq(products.id, pid), eq(products.tenantId, tenantId)));
  } else {
    await db.insert(products).values(row);
  }
  return first(await db.select().from(products).where(eq(products.id, pid)).limit(1));
}

export async function deleteProduct(tenantId: string, productId: string) {
  await db.delete(products).where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
  return { ok: true };
}

export async function upsertDiscount(tenantId: string, payload: Record<string, unknown>) {
  const did = String(payload.id || id("dsc"));
  const existing = await first(
    await db
      .select()
      .from(discounts)
      .where(and(eq(discounts.id, did), eq(discounts.tenantId, tenantId)))
      .limit(1),
  );
  const row = {
    id: did,
    tenantId,
    name: String(payload.name || "").trim(),
    type: String(payload.type || "PERCENT"),
    value: Number(payload.value || 0),
    minAmount: Number(payload.minAmount || 0),
    active: payload.active === false ? false : true,
  };
  if (!row.name) throw new Error("Discount name is required");
  if (existing) {
    await db.update(discounts).set(row).where(eq(discounts.id, did));
  } else {
    await db.insert(discounts).values(row);
  }
  return first(await db.select().from(discounts).where(eq(discounts.id, did)).limit(1));
}

export async function deleteDiscount(tenantId: string, discountId: string) {
  await db.delete(discounts).where(and(eq(discounts.id, discountId), eq(discounts.tenantId, tenantId)));
  return { ok: true };
}

export async function upsertCustomer(tenantId: string, payload: Record<string, unknown>) {
  const cid = String(payload.id || id("cus"));
  const existing = await first(
    await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, cid), eq(customers.tenantId, tenantId)))
      .limit(1),
  );
  const row = {
    id: cid,
    tenantId,
    name: String(payload.name || "").trim(),
    phone: (payload.phone as string) || null,
    address: (payload.address as string) || null,
    createdAt: existing?.createdAt || Date.now(),
  };
  if (!row.name) throw new Error("Customer name is required");
  if (existing) {
    await db.update(customers).set({ name: row.name, phone: row.phone, address: row.address }).where(eq(customers.id, cid));
  } else {
    await db.insert(customers).values(row);
  }
  return first(await db.select().from(customers).where(eq(customers.id, cid)).limit(1));
}

export async function createInvoice(session: SessionUser, payload: Record<string, unknown>) {
  await ensureColumns();
  const tenantId = assertTenant(session);
  const shop = await getTenantOrThrow(tenantId);
  const items = (payload.items as InvoiceItem[]) || [];
  if (!items.length) throw new Error("Add at least one item");

  const subtotal = items.reduce((s, l) => s + Number(l.price) * Number(l.qty), 0);
  const discountAmt = Number(payload.discountAmt || 0);
  const itemTax =
    payload.taxAmt != null
      ? Number(payload.taxAmt)
      : items.reduce((s, l) => s + (Number(l.price) * Number(l.qty) * Number(l.taxPercent || 0)) / 100, 0);
  const orderType = String(payload.orderType || "TAKEAWAY") === "DELIVERY" ? "DELIVERY" : "TAKEAWAY";
  const totals = billTotals({
    subtotal,
    discountAmt,
    taxAmt: itemTax,
    orderType,
    serviceTaxPercent: Number(payload.serviceTaxPercent ?? (orderType === "TAKEAWAY" ? shop.takeawayServiceTaxPercent : 0)),
    deliveryCharge: Number(payload.deliveryCharge ?? (orderType === "DELIVERY" ? shop.defaultDeliveryCharge : 0)),
  });
  const taxAmt = totals.taxAmt;
  const safeTotal = payload.total != null ? Number(payload.total) : totals.total;

  const paymentMethod = String(payload.paymentMethod || "CASH");
  const offlineId = (payload.offlineId as string) || id("off");
  const already = await first(await db.select().from(invoices).where(eq(invoices.offlineId, offlineId)).limit(1));
  if (already && already.tenantId === tenantId) return mapInvoice(already);

  const createdAt = Number(payload.createdAt || Date.now());
  const incomingNo = String(payload.number || "");
  const number =
    incomingNo && !incomingNo.includes("-OFF-")
      ? incomingNo
      : invoiceNumber(shop.invoicePrefix, shop.nextInvoiceNo);

  const qrPayload = buildQrPayload({
    companyName: shop.companyName,
    ntn: shop.ntn,
    strn: shop.strn,
    fbrPosId: shop.fbrPosId,
    customQr: shop.customQr,
    invoiceNo: number,
    dateIso: new Date(createdAt).toISOString(),
    total: safeTotal,
    tax: taxAmt,
  });

  const customerName = String(payload.customerName || "").trim() || null;
  const customerPhone = String(payload.customerPhone || "").trim() || null;
  let customerId = (payload.customerId as string) || null;
  if (!customerId && (customerName || customerPhone)) {
    const savedCustomer = await upsertCustomer(tenantId, {
      name: customerName || "Walk-in",
      phone: customerPhone,
    });
    customerId = savedCustomer?.id ?? null;
  }

  const invId = String(payload.id || id("inv"));
  const openSession = await first(
    await db
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.tenantId, tenantId), isNull(cashSessions.closedAt)))
      .limit(1),
  );

  await db.transaction(async (txDb) => {
    await txDb.insert(invoices).values({
      id: invId,
      tenantId,
      userId: session.id,
      customerId,
      customerName,
      customerPhone,
      number,
      itemsJson: JSON.stringify(items),
      subtotal,
      discountName: (payload.discountName as string) || null,
      discountAmt,
      taxAmt,
      orderType: totals.orderType,
      deliveryCharge: totals.deliveryCharge,
      serviceTaxAmt: totals.serviceTaxAmt,
      serviceTaxPercent: totals.serviceTaxPercent,
      total: safeTotal,
      paymentMethod,
      cashAmount: Number(payload.cashAmount || 0),
      cardAmount: Number(payload.cardAmount || 0),
      walletAmount: Number(payload.walletAmount || 0),
      received: Number(payload.received || safeTotal),
      changeDue: Number(payload.changeDue || 0),
      status: "PAID",
      fbrInvoiceNo: (payload.fbrInvoiceNo as string) || null,
      qrPayload,
      note: (payload.note as string) || null,
      offlineId,
      createdAt,
    });

    await txDb
      .update(tenants)
      .set({ nextInvoiceNo: shop.nextInvoiceNo + 1, updatedAt: Date.now() })
      .where(eq(tenants.id, tenantId));

    for (const line of items) {
      await txDb
        .update(products)
        .set({
          stock: sql`${products.stock} - ${Number(line.qty)}`,
          updatedAt: Date.now(),
        })
        .where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));
    }

    await txDb.insert(cashMoves).values({
      id: id("mov"),
      tenantId,
      sessionId: openSession?.id ?? null,
      invoiceId: invId,
      type: "SALE",
      method: paymentMethod,
      amount: safeTotal,
      note: number,
      createdAt,
    });
  });

  const saved = await first(await db.select().from(invoices).where(eq(invoices.id, invId)).limit(1));
  if (!saved) throw new Error("Could not save invoice");
  return mapInvoice(saved);
}

export async function voidInvoice(tenantId: string, invoiceId: string, role: string) {
  if (role !== "OWNER") throw new Error("Only the shop owner can void an invoice");
  const inv = await first(
    await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1),
  );
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "VOID") return mapInvoice(inv);
  const items = JSON.parse(inv.itemsJson) as InvoiceItem[];
  await db.transaction(async (txDb) => {
    await txDb.update(invoices).set({ status: "VOID" }).where(eq(invoices.id, invoiceId));
    for (const line of items) {
      await txDb
        .update(products)
        .set({ stock: sql`${products.stock} + ${Number(line.qty)}`, updatedAt: Date.now() })
        .where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));
    }
    await txDb.insert(cashMoves).values({
      id: id("mov"),
      tenantId,
      sessionId: null,
      invoiceId,
      type: "REFUND",
      method: inv.paymentMethod,
      amount: -inv.total,
      note: `Void ${inv.number}`,
      createdAt: Date.now(),
    });
  });
  const saved = await first(await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1));
  return mapInvoice(saved!);
}

export async function getInvoice(tenantId: string, invoiceId: string) {
  const inv = await first(
    await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1),
  );
  if (!inv) throw new Error("Invoice not found");
  return mapInvoice(inv);
}

export async function openCash(tenantId: string, payload: Record<string, unknown>) {
  const open = await first(
    await db
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.tenantId, tenantId), isNull(cashSessions.closedAt)))
      .limit(1),
  );
  if (open) return open;
  const row = {
    id: String(payload.id || id("ses")),
    tenantId,
    openedAt: Number(payload.openedAt || Date.now()),
    closedAt: null,
    openingFloat: Number(payload.openingFloat || 0),
    closingCash: null,
    note: (payload.note as string) || null,
  };
  await db.insert(cashSessions).values(row);
  await db.insert(cashMoves).values({
    id: id("mov"),
    tenantId,
    sessionId: row.id,
    invoiceId: null,
    type: "OPENING",
    method: "CASH",
    amount: row.openingFloat,
    note: "Opening float",
    createdAt: row.openedAt,
  });
  return first(await db.select().from(cashSessions).where(eq(cashSessions.id, row.id)).limit(1));
}

export async function closeCash(tenantId: string, payload: Record<string, unknown>) {
  const open = await first(
    await db
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.tenantId, tenantId), isNull(cashSessions.closedAt)))
      .limit(1),
  );
  if (!open) throw new Error("No open register");
  await db
    .update(cashSessions)
    .set({
      closedAt: Number(payload.closedAt || Date.now()),
      closingCash: Number(payload.closingCash || 0),
      note: (payload.note as string) || open.note,
    })
    .where(and(eq(cashSessions.id, open.id), eq(cashSessions.tenantId, tenantId)));
  return first(await db.select().from(cashSessions).where(eq(cashSessions.id, open.id)).limit(1));
}

export async function addCashMove(tenantId: string, payload: Record<string, unknown>) {
  const open = await first(
    await db
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.tenantId, tenantId), isNull(cashSessions.closedAt)))
      .limit(1),
  );
  const row = {
    id: String(payload.id || id("mov")),
    tenantId,
    sessionId: open?.id ?? null,
    invoiceId: null,
    type: String(payload.type || "CASH_IN"),
    method: String(payload.method || "CASH"),
    amount: Number(payload.amount || 0),
    note: (payload.note as string) || null,
    createdAt: Number(payload.createdAt || Date.now()),
  };
  await db.insert(cashMoves).values(row);
  return first(await db.select().from(cashMoves).where(eq(cashMoves.id, row.id)).limit(1));
}

export async function updateSettings(tenantId: string, payload: Record<string, unknown>) {
  await ensureColumns();
  const shop = await getTenantOrThrow(tenantId);
  const next = {
    companyName: String(payload.companyName || shop.companyName).trim(),
    tradeName: (payload.tradeName as string) || null,
    address: (payload.address as string) || null,
    city: (payload.city as string) || null,
    phone: (payload.phone as string) || null,
    email: (payload.email as string) || null,
    ntn: (payload.ntn as string) || null,
    strn: (payload.strn as string) || null,
    fbrPosId: (payload.fbrPosId as string) || null,
    fbrLicenseDate: (payload.fbrLicenseDate as string) || null,
    fbrRegisterId: (payload.fbrRegisterId as string) || null,
    customQr: (payload.customQr as string) || null,
    logoData: payload.logoData === undefined ? shop.logoData : ((payload.logoData as string) || null),
    invoiceLogoData: payload.invoiceLogoData === undefined ? shop.invoiceLogoData : ((payload.invoiceLogoData as string) || null),
    invoicePrefix: String(payload.invoicePrefix || shop.invoicePrefix).trim() || "INV",
    defaultTaxPercent: Number(payload.defaultTaxPercent ?? shop.defaultTaxPercent),
    takeawayServiceTaxPercent: Number(payload.takeawayServiceTaxPercent ?? shop.takeawayServiceTaxPercent),
    defaultDeliveryCharge: Number(payload.defaultDeliveryCharge ?? shop.defaultDeliveryCharge),
    businessType: String(payload.businessType || shop.businessType),
    updatedAt: Date.now(),
  };
  await db.update(tenants).set(next).where(eq(tenants.id, tenantId));
  const saved = await first(await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1));
  return publicTenant(saved!);
}

export async function setupOwnShop(session: SessionUser, payload: Record<string, unknown>) {
  if (session.role !== "OWNER") {
    const err = new Error("FORBIDDEN");
    err.name = "FORBIDDEN";
    throw err;
  }
  const account = await first(await db.select().from(users).where(eq(users.id, session.id)).limit(1));
  if (!account || account.role !== "OWNER") throw new Error("Admin account not found");
  if (account.tenantId || session.tenantId) throw new Error("This admin already has a shop");

  const companyName = String(payload.companyName || "").trim();
  if (!companyName) throw new Error("Shop name is required");

  const now = Date.now();
  const tenantId = id("tnt");
  const days = account.pendingTrialDays || 30;
  const prefix =
    String(payload.invoicePrefix || "").trim() ||
    companyName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() ||
    "INV";

  await db.insert(tenants).values({
    id: tenantId,
    businessType: String(payload.businessType || "GENERAL"),
    status: "TRIAL",
    companyName,
    tradeName: String(payload.tradeName || companyName).trim() || companyName,
    address: (payload.address as string) || null,
    city: (payload.city as string) || null,
    phone: (payload.phone as string) || null,
    email: (payload.email as string) || account.email,
    ntn: (payload.ntn as string) || null,
    strn: (payload.strn as string) || null,
    fbrPosId: (payload.fbrPosId as string) || null,
    fbrLicenseDate: (payload.fbrLicenseDate as string) || null,
    fbrRegisterId: (payload.fbrRegisterId as string) || null,
    logoData: (payload.logoData as string) || null,
    invoiceLogoData: (payload.invoiceLogoData as string) || null,
    invoicePrefix: prefix,
    defaultTaxPercent: Number(payload.defaultTaxPercent ?? 0),
    licenseKey: licenseKey(),
    expiresAt: now + days * 86400000,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(users)
    .set({ tenantId, name: String(payload.ownerName || account.name).trim() || account.name })
    .where(eq(users.id, account.id));

  await ensureSampleCatalog(tenantId, String(payload.businessType || "GENERAL"));

  const user: SessionUser = {
    id: account.id,
    email: account.email,
    name: String(payload.ownerName || account.name).trim() || account.name,
    role: "OWNER",
    tenantId,
  };
  await writeSession(user);
  const shop = await getTenantOrThrow(tenantId);
  return { user, tenant: publicTenant(shop) };
}

export async function applySync(session: SessionUser, ops: { kind: string; payload: Record<string, unknown> }[]) {
  const tenantId = assertTenant(session);
  const results: unknown[] = [];
  for (const op of ops) {
    switch (op.kind) {
      case "invoice.create":
        results.push(await createInvoice(session, op.payload));
        break;
      case "product.upsert":
        results.push(await upsertProduct(tenantId, op.payload));
        break;
      case "product.delete":
        results.push(await deleteProduct(tenantId, String(op.payload.id)));
        break;
      case "discount.upsert":
        results.push(await upsertDiscount(tenantId, op.payload));
        break;
      case "discount.delete":
        results.push(await deleteDiscount(tenantId, String(op.payload.id)));
        break;
      case "customer.upsert":
        results.push(await upsertCustomer(tenantId, op.payload));
        break;
      case "category.upsert":
        results.push(
          await upsertCategory(tenantId, op.payload as { id?: string; name: string; color?: string; parentId?: string | null }),
        );
        break;
      case "category.delete":
        results.push(await deleteCategory(tenantId, String(op.payload.id)));
        break;
      case "cash.move":
        results.push(await addCashMove(tenantId, op.payload));
        break;
      case "cash.open":
        results.push(await openCash(tenantId, op.payload));
        break;
      case "cash.close":
        results.push(await closeCash(tenantId, op.payload));
        break;
      case "settings.update":
        results.push(await updateSettings(tenantId, op.payload));
        break;
      default:
        break;
    }
  }
  return { ok: true, results, snapshot: await bootstrap(tenantId, session) };
}
