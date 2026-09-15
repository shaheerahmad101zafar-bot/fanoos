import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { tileArt } from "@/lib/art";
import { id } from "@/lib/ids";

const CATALOGS: Record<
  string,
  { cats: [string, string][]; items: [string, number, number, number, number, string, string, string][] }
> = {
  RESTAURANT: {
    cats: [
      ["Mains", "#E24A16"],
      ["Breads", "#D4B36A"],
      ["Drinks", "#3F6F52"],
      ["Sweets", "#C23B3B"],
    ],
    items: [
      ["Chicken Biryani", 0, 450, 220, 40, "plate", "#8B1E1E", "#E24A16"],
      ["Chicken Karahi", 0, 1400, 700, 18, "karahi", "#9B2C2C", "#E85D04"],
      ["Naan", 1, 40, 12, 80, "pcs", "#C4A574", "#E9C46A"],
      ["Soft Drink", 2, 80, 40, 90, "can", "#1D3557", "#457B9D"],
      ["Kheer", 3, 180, 70, 25, "bowl", "#9C6644", "#E9C46A"],
    ],
  },
  MEDICAL: {
    cats: [
      ["Tablets", "#3F6F52"],
      ["Syrup", "#457B9D"],
      ["Care", "#D4B36A"],
      ["Drops", "#2A9D8F"],
    ],
    items: [
      ["Panadol 500mg", 0, 35, 18, 120, "pack", "#1B4332", "#3F6F52"],
      ["ORS Sachet", 0, 45, 20, 80, "pcs", "#2A9D8F", "#57CC99"],
      ["Cough Syrup", 1, 220, 90, 36, "bottle", "#1D3557", "#457B9D"],
      ["Cotton Roll", 2, 90, 35, 40, "pcs", "#F2E8CF", "#E9C46A"],
      ["Eye Drops", 3, 160, 70, 22, "bottle", "#14746F", "#76C893"],
    ],
  },
  RETAIL: {
    cats: [
      ["Grocery", "#8A6A2A"],
      ["Snacks", "#E24A16"],
      ["Drinks", "#3F6F52"],
      ["Home", "#6D597A"],
    ],
    items: [
      ["Rice 5kg", 0, 1250, 980, 24, "bag", "#9A6B2F", "#C9A227"],
      ["Sugar 1kg", 0, 180, 140, 40, "pack", "#F2E8CF", "#E9C46A"],
      ["Chips", 1, 60, 28, 70, "pcs", "#E85D04", "#F4A261"],
      ["Mineral Water", 2, 70, 25, 90, "bottle", "#2A9D8F", "#57CC99"],
      ["Dishwash", 3, 150, 80, 30, "bottle", "#355070", "#EAAC8B"],
    ],
  },
};

function pickCatalog(businessType: string) {
  return CATALOGS[businessType] || CATALOGS.RETAIL;
}

export async function ensureSampleCatalog(tenantId: string, businessType: string) {
  const existing = (await db.select({ id: products.id }).from(products).where(eq(products.tenantId, tenantId)).limit(1))[0];
  if (existing) return;

  const pack = pickCatalog(businessType);
  const now = Date.now();
  const catRows = pack.cats.map(([name, color]) => ({
    id: id("cat"),
    tenantId,
    name,
    color,
    parentId: null,
  }));
  await db.insert(categories).values(catRows);

  await db.insert(products).values(
    pack.items.map(([name, catIndex, price, cost, stock, unit, from, to], i) => ({
      id: id("prd"),
      tenantId,
      categoryId: catRows[catIndex]?.id || null,
      discountId: null,
      name,
      sku: `SM-${100 + i}`,
      barcode: `890${300000 + i}`,
      description: "Sample item — edit name, photo and price whenever you like.",
      price,
      costPrice: cost,
      taxPercent: 0,
      stock,
      lowStock: 5,
      unit,
      imageData: tileArt(name, from, to),
      expiryDate: null,
      batchNo: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    })),
  );
}
