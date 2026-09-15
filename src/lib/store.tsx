"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { id } from "@/lib/client-id";
import { createDefaultShop, LOCAL_SNAP_KEY, nextInvoiceNumber } from "@/lib/local-shop";
import { loadSnap, localDb, saveSnap } from "@/lib/offline/db";
import { billTotals } from "@/lib/price";
import type { InvoiceItem, SessionUser } from "@/lib/types";

export type Product = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  discountId?: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  costPrice: number;
  taxPercent: number;
  stock: number;
  lowStock: number;
  unit: string;
  imageData: string | null;
  expiryDate: number | null;
  batchNo: string | null;
  active: boolean;
};

export type Discount = {
  id: string;
  name: string;
  type: string;
  value: number;
  minAmount: number;
  active: boolean;
};

export type Category = { id: string; name: string; color: string; parentId?: string | null };
export type Customer = { id: string; name: string; phone: string | null; address: string | null };

export type Invoice = {
  id: string;
  number: string;
  items: InvoiceItem[];
  subtotal: number;
  discountName: string | null;
  discountAmt: number;
  taxAmt: number;
  orderType?: string;
  deliveryCharge?: number;
  serviceTaxAmt?: number;
  serviceTaxPercent?: number;
  total: number;
  paymentMethod: string;
  cashAmount: number;
  cardAmount: number;
  walletAmount: number;
  received: number;
  changeDue: number;
  status: string;
  qrPayload: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: number;
  pending?: boolean;
};

export type Tenant = {
  id: string;
  businessType: string;
  companyName: string;
  tradeName: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  ntn: string | null;
  strn: string | null;
  fbrPosId: string | null;
  fbrLicenseDate: string | null;
  fbrRegisterId: string | null;
  customQr: string | null;
  logoData: string | null;
  invoiceLogoData?: string | null;
  invoicePrefix: string;
  currency: string;
  defaultTaxPercent: number;
  takeawayServiceTaxPercent?: number;
  defaultDeliveryCharge?: number;
  licenseKey: string;
  expiresAt: number | null;
  status: string;
};

export type CashSession = {
  id: string;
  openedAt: number;
  closedAt: number | null;
  openingFloat: number;
  closingCash: number | null;
  note: string | null;
};

export type CashMove = {
  id: string;
  type: string;
  method: string;
  amount: number;
  note: string | null;
  createdAt: number;
  invoiceId: string | null;
};

type Snapshot = {
  user: SessionUser;
  tenant: Tenant;
  products: Product[];
  categories: Category[];
  discounts: Discount[];
  customers: Customer[];
  invoices: Invoice[];
  staff: { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt: number | null }[];
  cashSession: CashSession | null;
  cashMoves: CashMove[];
};

type ShopState = Snapshot & {
  online: boolean;
  pending: number;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  flush: () => Promise<void>;
  queue: (kind: string, payload: Record<string, unknown>) => Promise<void>;
  saveProduct: (p: Partial<Product> & { name: string }) => Promise<Product>;
  removeProduct: (productId: string) => Promise<void>;
  saveDiscount: (d: Partial<Discount> & { name: string }) => Promise<Discount>;
  removeDiscount: (discountId: string) => Promise<void>;
  saveCustomer: (c: Partial<Customer> & { name: string }) => Promise<void>;
  saveCategory: (c: Partial<Category> & { name: string }) => Promise<Category>;
  removeCategory: (categoryId: string) => Promise<void>;
  checkout: (input: {
    items: InvoiceItem[];
    discount?: Discount | null;
    paymentMethod: string;
    cashAmount: number;
    cardAmount: number;
    walletAmount: number;
    received: number;
    changeDue: number;
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    note?: string;
    orderType?: string;
    deliveryCharge?: number;
    serviceTaxPercent?: number;
  }) => Promise<Invoice>;
  saveSettings: (patch: Partial<Tenant>) => Promise<void>;
  openRegister: (openingFloat: number) => Promise<void>;
  closeRegister: (closingCash: number, note?: string) => Promise<void>;
  moveCash: (type: "CASH_IN" | "CASH_OUT", amount: number, note: string) => Promise<void>;
  addStaff: (input: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  removeStaff: (userId: string) => Promise<void>;
  voidInvoice: (invoiceId: string) => Promise<void>;
};

const Ctx = createContext<ShopState | null>(null);

function asSnapshot(raw: unknown): Snapshot | null {
  const value = raw as Snapshot | null;
  if (!value?.tenant?.id || !value?.user?.id) return null;
  return {
    ...value,
    invoices: (value.invoices || []).map((inv) => ({ ...inv, pending: false })),
  };
}

async function readLocalShop(): Promise<Snapshot> {
  const current = asSnapshot(await loadSnap<Snapshot>(LOCAL_SNAP_KEY));
  if (current) return current;
  if (localDb) {
    const rows = await localDb.snap.toArray();
    for (const row of rows) {
      const found = asSnapshot(row.value);
      if (found) {
        await saveSnap(LOCAL_SNAP_KEY, found);
        return found;
      }
    }
  }
  const fresh = createDefaultShop() as Snapshot;
  await saveSnap(LOCAL_SNAP_KEY, fresh);
  return fresh;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: Snapshot) {
    setSnap(next);
    await saveSnap(LOCAL_SNAP_KEY, next);
  }

  async function flush() {}
  async function enqueue(_kind: string, _payload: Record<string, unknown>) {}

  async function refresh() {
    try {
      const data = await readLocalShop();
      setSnap(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shop is phone pe nahi khuli");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<ShopState | null>(() => {
    if (!snap) {
      return {
        user: { id: "", email: "", name: "", role: "CASHIER", tenantId: null },
        tenant: {
          id: "",
          businessType: "GENERAL",
          companyName: "Fanoos",
          tradeName: null,
          address: null,
          city: null,
          phone: null,
          email: null,
          ntn: null,
          strn: null,
          fbrPosId: null,
          fbrLicenseDate: null,
          fbrRegisterId: null,
          customQr: null,
          logoData: null,
          invoiceLogoData: null,
          invoicePrefix: "INV",
          currency: "PKR",
          defaultTaxPercent: 0,
          takeawayServiceTaxPercent: 0,
          defaultDeliveryCharge: 0,
          licenseKey: "",
          expiresAt: null,
          status: "ACTIVE",
        },
        products: [],
        categories: [],
        discounts: [],
        customers: [],
        invoices: [],
        staff: [],
        cashSession: null,
        cashMoves: [],
        online: true,
        pending: 0,
        ready,
        error,
        refresh,
        flush,
        queue: enqueue,
        saveProduct: async () => {
          throw new Error("Not ready");
        },
        removeProduct: async () => {},
        saveDiscount: async () => {
          throw new Error("Not ready");
        },
        removeDiscount: async () => {},
        saveCustomer: async () => {},
        saveCategory: async () => {
          throw new Error("Not ready");
        },
        removeCategory: async () => {},
        checkout: async () => {
          throw new Error("Not ready");
        },
        saveSettings: async () => {},
        openRegister: async () => {},
        closeRegister: async () => {},
        moveCash: async () => {},
        addStaff: async () => {
          throw new Error("Not ready");
        },
        removeStaff: async () => {},
        voidInvoice: async () => {},
      };
    }

    return {
      ...snap,
      online: true,
      pending: 0,
      ready,
      error,
      refresh,
      flush,
      queue: enqueue,
      async saveProduct(p) {
        const row: Product = {
          id: p.id || id("prd"),
          tenantId: snap.tenant.id,
          categoryId: p.categoryId ?? null,
          discountId: p.discountId ?? null,
          name: p.name,
          sku: p.sku ?? null,
          barcode: p.barcode ?? null,
          description: p.description ?? null,
          price: Number(p.price || 0),
          costPrice: Number(p.costPrice || 0),
          taxPercent: Number(p.taxPercent ?? snap.tenant.defaultTaxPercent),
          stock: Number(p.stock ?? 0),
          lowStock: Number(p.lowStock ?? 5),
          unit: p.unit || "pcs",
          imageData: p.imageData ?? null,
          expiryDate: p.expiryDate ?? null,
          batchNo: p.batchNo ?? null,
          active: p.active !== false,
        };
        await persist({
          ...snap,
          products: [row, ...snap.products.filter((x) => x.id !== row.id)],
        });
        return row;
      },
      async removeProduct(productId) {
        await persist({ ...snap, products: snap.products.filter((p) => p.id !== productId) });
      },
      async saveDiscount(d) {
        const row: Discount = {
          id: d.id || id("dsc"),
          name: d.name,
          type: d.type || "PERCENT",
          value: Number(d.value || 0),
          minAmount: Number(d.minAmount || 0),
          active: d.active !== false,
        };
        await persist({
          ...snap,
          discounts: [row, ...snap.discounts.filter((x) => x.id !== row.id)],
        });
        return row;
      },
      async removeDiscount(discountId) {
        await persist({ ...snap, discounts: snap.discounts.filter((d) => d.id !== discountId) });
      },
      async saveCustomer(c) {
        const row: Customer = {
          id: c.id || id("cus"),
          name: c.name,
          phone: c.phone ?? null,
          address: c.address ?? null,
        };
        await persist({
          ...snap,
          customers: [row, ...snap.customers.filter((x) => x.id !== row.id)],
        });
      },
      async saveCategory(c) {
        const row: Category = {
          id: c.id || id("cat"),
          name: c.name,
          color: c.color || "#D4B36A",
          parentId: c.parentId ?? null,
        };
        await persist({
          ...snap,
          categories: [row, ...snap.categories.filter((x) => x.id !== row.id)],
        });
        return row;
      },
      async removeCategory(categoryId) {
        const target = snap.categories.find((c) => c.id === categoryId);
        if (!target) return;
        const childIds = snap.categories.filter((c) => c.parentId === categoryId).map((c) => c.id);
        const ids = new Set([categoryId, ...childIds]);
        await persist({
          ...snap,
          categories: snap.categories.filter((c) => !ids.has(c.id)),
          products: snap.products.map((p) => {
            if (!p.categoryId || !ids.has(p.categoryId)) return p;
            if (target.parentId) return { ...p, categoryId: target.parentId };
            return { ...p, categoryId: null };
          }),
        });
      },
      async checkout(input) {
        const subtotal = input.items.reduce((s, l) => s + l.price * l.qty, 0);
        let discountAmt = 0;
        if (input.discount && subtotal >= input.discount.minAmount) {
          discountAmt =
            input.discount.type === "PERCENT"
              ? (subtotal * input.discount.value) / 100
              : input.discount.value;
        }
        const taxAmt = input.items.reduce((s, l) => s + (l.price * l.qty * (l.taxPercent || 0)) / 100, 0);
        const totals = billTotals({
          subtotal,
          discountAmt,
          taxAmt,
          orderType: input.orderType,
          serviceTaxPercent: input.serviceTaxPercent ?? snap.tenant.takeawayServiceTaxPercent,
          deliveryCharge: input.deliveryCharge ?? snap.tenant.defaultDeliveryCharge,
        });
        const billNo = nextInvoiceNumber(snap.tenant.invoicePrefix || "US", snap.invoices);
        const invoice: Invoice = {
          id: id("inv"),
          number: billNo,
          items: input.items,
          subtotal,
          discountName: input.discount?.name ?? null,
          discountAmt,
          taxAmt,
          orderType: totals.orderType,
          deliveryCharge: totals.deliveryCharge,
          serviceTaxAmt: totals.serviceTaxAmt,
          serviceTaxPercent: totals.serviceTaxPercent,
          total: totals.total,
          paymentMethod: input.paymentMethod,
          cashAmount: input.cashAmount,
          cardAmount: input.cardAmount,
          walletAmount: input.walletAmount,
          received: input.received,
          changeDue: input.changeDue,
          status: "PAID",
          customerName: input.customerName?.trim() || null,
          customerPhone: input.customerPhone?.trim() || null,
          qrPayload: [
            `Seller: ${snap.tenant.companyName}`,
            snap.tenant.ntn ? `NTN: ${snap.tenant.ntn}` : "",
            `Invoice: ${billNo}`,
            `Total: ${totals.total}`,
          ]
            .filter(Boolean)
            .join("\n"),
          createdAt: Date.now(),
          pending: false,
        };
        const nextProducts = snap.products.map((p) => {
          const line = input.items.find((l) => l.productId === p.id);
          return line ? { ...p, stock: p.stock - line.qty } : p;
        });
        const move: CashMove = {
          id: id("mov"),
          type: "SALE",
          method: input.paymentMethod,
          amount: totals.total,
          note: invoice.number,
          createdAt: invoice.createdAt,
          invoiceId: invoice.id,
        };
        await persist({
          ...snap,
          products: nextProducts,
          invoices: [invoice, ...snap.invoices],
          cashMoves: [move, ...snap.cashMoves],
        });
        return invoice;
      },
      async saveSettings(patch) {
        const tenant = { ...snap.tenant, ...patch };
        await persist({ ...snap, tenant });
      },
      async openRegister(openingFloat) {
        const row: CashSession = {
          id: id("ses"),
          openedAt: Date.now(),
          closedAt: null,
          openingFloat,
          closingCash: null,
          note: null,
        };
        await persist({ ...snap, cashSession: row });
      },
      async closeRegister(closingCash, note) {
        if (!snap.cashSession) return;
        await persist({
          ...snap,
          cashSession: { ...snap.cashSession, closedAt: Date.now(), closingCash, note: note || null },
        });
      },
      async moveCash(type, amount, note) {
        const row: CashMove = {
          id: id("mov"),
          type,
          method: "CASH",
          amount: type === "CASH_OUT" ? -Math.abs(amount) : Math.abs(amount),
          note,
          createdAt: Date.now(),
          invoiceId: null,
        };
        await persist({ ...snap, cashMoves: [row, ...snap.cashMoves] });
      },
      async addStaff(input) {
        const name = String(input.name || "").trim();
        const email = String(input.email || "").trim().toLowerCase();
        const password = String(input.password || "").trim();
        if (!name) throw new Error("Cashier name is required");
        if (!email || !email.includes("@")) throw new Error("Enter a valid email");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        if (email === snap.user.email.toLowerCase() || snap.staff.some((s) => s.email.toLowerCase() === email)) {
          throw new Error("This email is already used. Give the cashier a different email.");
        }
        const row = {
          id: id("usr"),
          name,
          email,
          role: "CASHIER",
          active: true,
          lastLoginAt: null as number | null,
        };
        await persist({ ...snap, staff: [...snap.staff.filter((s) => s.id !== row.id), row] });
      },
      async removeStaff(userId) {
        const row = snap.staff.find((s) => s.id === userId);
        if (!row) return;
        if (row.role === "OWNER") throw new Error("The shop owner cannot be deleted here");
        if (row.id === snap.user.id) throw new Error("You cannot delete the login you are using");
        await persist({ ...snap, staff: snap.staff.filter((s) => s.id !== userId) });
      },
      async voidInvoice(invoiceId) {
        const inv = snap.invoices.find((item) => item.id === invoiceId);
        if (!inv || inv.status === "VOID") return;
        await persist({
          ...snap,
          products: snap.products.map((p) => {
            const line = inv.items.find((l) => l.productId === p.id);
            return line ? { ...p, stock: p.stock + line.qty } : p;
          }),
          invoices: snap.invoices.map((item) =>
            item.id === invoiceId ? { ...item, status: "VOID", pending: false } : item,
          ),
        });
      },
    };
  }, [snap, ready, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be inside ShopProvider");
  return ctx;
}
