import { tileArt } from "@/lib/art";
import { id } from "@/lib/client-id";

const TENANT_ID = "tnt_usman";
const OWNER_ID = "usr_usman";

const MENU: [string, string][] = [
  ["Mains", "#E24A16"],
  ["Breads", "#D4B36A"],
  ["Drinks", "#3F6F52"],
  ["Sweets", "#C23B3B"],
];

const ITEMS: [string, number, number, number, number, string, string, string][] = [
  ["Chicken Biryani", 0, 450, 220, 40, "plate", "#8B1E1E", "#E24A16"],
  ["Chicken Karahi", 0, 1400, 700, 18, "karahi", "#9B2C2C", "#E85D04"],
  ["Naan", 1, 40, 12, 80, "pcs", "#C4A574", "#E9C46A"],
  ["Soft Drink", 2, 80, 40, 90, "can", "#1D3557", "#457B9D"],
  ["Kheer", 3, 180, 70, 25, "bowl", "#9C6644", "#E9C46A"],
];

export const LOCAL_SNAP_KEY = "shop:local";

export function createDefaultShop() {
  const cats = MENU.map(([name, color]) => ({
    id: id("cat"),
    name,
    color,
    parentId: null as string | null,
  }));

  const products = ITEMS.map(([name, catIndex, price, cost, stock, unit, from, to], i) => ({
    id: id("prd"),
    tenantId: TENANT_ID,
    categoryId: cats[catIndex]?.id || null,
    discountId: null as string | null,
    name,
    sku: `US-${100 + i}`,
    barcode: `890${300000 + i}`,
    description: null as string | null,
    price,
    costPrice: cost,
    taxPercent: 0,
    stock,
    lowStock: 5,
    unit,
    imageData: tileArt(name, from, to),
    expiryDate: null as number | null,
    batchNo: null as string | null,
    active: true,
  }));

  return {
    user: {
      id: OWNER_ID,
      email: "usman@shop.local",
      name: "Usman",
      role: "OWNER" as const,
      tenantId: TENANT_ID,
    },
    tenant: {
      id: TENANT_ID,
      businessType: "RESTAURANT",
      companyName: "Usman Shop",
      tradeName: "Spice House Kitchen",
      address: null as string | null,
      city: null as string | null,
      phone: null as string | null,
      email: null as string | null,
      ntn: null as string | null,
      strn: null as string | null,
      fbrPosId: null as string | null,
      fbrLicenseDate: null as string | null,
      fbrRegisterId: null as string | null,
      customQr: null as string | null,
      logoData: null as string | null,
      invoiceLogoData: null as string | null,
      invoicePrefix: "US",
      currency: "PKR",
      defaultTaxPercent: 0,
      takeawayServiceTaxPercent: 0,
      defaultDeliveryCharge: 0,
      licenseKey: "LOCAL-SHOP",
      expiresAt: null as number | null,
      status: "ACTIVE",
    },
    products,
    categories: cats,
    discounts: [] as { id: string; name: string; type: string; value: number; minAmount: number; active: boolean }[],
    customers: [] as { id: string; name: string; phone: string | null; address: string | null }[],
    invoices: [] as unknown[],
    staff: [
      {
        id: OWNER_ID,
        name: "Usman",
        email: "usman@shop.local",
        role: "OWNER",
        active: true,
        lastLoginAt: Date.now(),
      },
    ],
    cashSession: null,
    cashMoves: [] as unknown[],
  };
}

export function nextInvoiceNumber(prefix: string, invoices: { number: string }[]) {
  let max = 0;
  for (const inv of invoices) {
    const match = String(inv.number || "").match(/(\d+)\s*$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}
