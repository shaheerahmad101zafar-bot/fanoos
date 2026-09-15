import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { tileArt } from "../art";
import { buildQrPayload } from "../fbr";
import { id, invoiceNumber, licenseKey } from "../ids";
import { db } from "./client";
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
} from "./schema";

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedIfEmpty() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length) return;

  const now = Date.now();
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  await db.insert(users)
    .values({
      id: id("usr"),
      email: "super@fanoos.app",
      name: "Fanoos Super Admin",
      passwordHash: hash("Fanoos@Admin1"),
      role: "SUPER_ADMIN",
      tenantId: null,
      active: true,
      createdAt: now,
    })
    ;

  await seedRestaurant(now, hash);
  await seedPharmacy(now, hash);
}

async function seedRestaurant(now: number, hash: (pw: string) => string) {
  const tenantId = id("tnt");
  const ownerId = id("usr");
  const cashierId = id("usr");

  await db.insert(tenants)
    .values({
      id: tenantId,
      businessType: "RESTAURANT",
      status: "ACTIVE",
      companyName: "Spice House",
      tradeName: "Spice House Kitchen",
      address: "Shop 12, Food Street, Lahore",
      city: "Lahore",
      phone: "042-111-774423",
      email: "amir@spicehouse.pk",
      ntn: "1234567-8",
      strn: "03-12-3456-789-12",
      fbrPosId: "POS-LHR-8812",
      fbrLicenseDate: "2023-04-12",
      fbrRegisterId: "REG-LHR-44821",
      customQr: null,
      invoicePrefix: "SH",
      nextInvoiceNo: 1,
      defaultTaxPercent: 16,
      licenseKey: licenseKey(),
      expiresAt: now + 1000 * 60 * 60 * 24 * 365,
      createdAt: now - 1000 * 60 * 60 * 24 * 40,
      updatedAt: now,
    })
    ;

  await db.insert(users)
    .values([
      {
        id: ownerId,
        email: "amir@spicehouse.pk",
        name: "Amir Raza",
        passwordHash: hash("Shop@123"),
        role: "OWNER",
        tenantId,
        active: true,
        createdAt: now,
      },
      {
        id: cashierId,
        email: "counter@spicehouse.pk",
        name: "Hassan Counter",
        passwordHash: hash("Cash@123"),
        role: "CASHIER",
        tenantId,
        active: true,
        createdAt: now,
      },
    ])
    ;

  const cats = [
    { id: id("cat"), name: "Mains", color: "#E24A16" },
    { id: id("cat"), name: "Grill", color: "#C23B3B" },
    { id: id("cat"), name: "Breads", color: "#D4B36A" },
    { id: id("cat"), name: "Drinks", color: "#3F6F52" },
    { id: id("cat"), name: "Sweets", color: "#F4A261" },
  ];
  await db.insert(categories)
    .values(cats.map((c) => ({ ...c, tenantId })))
    ;

  const items = [
    ["Chicken Biryani", cats[0].id, 450, 220, 40, "plate", "#8B1E1E", "#E24A16"],
    ["Beef Biryani", cats[0].id, 520, 260, 35, "plate", "#5C1A1A", "#C23B3B"],
    ["Chicken Karahi", cats[0].id, 1400, 700, 18, "karahi", "#9B2C2C", "#E85D04"],
    ["Mutton Karahi", cats[0].id, 2200, 1200, 12, "karahi", "#4A0E0E", "#9B2226"],
    ["Daal Mash", cats[0].id, 380, 140, 28, "bowl", "#9A6B2F", "#C9A227"],
    ["Chapli Kebab", cats[1].id, 280, 120, 50, "pcs", "#6B2D12", "#E25A1C"],
    ["Seekh Kebab", cats[1].id, 320, 140, 40, "skewer", "#7A2E12", "#F4A261"],
    ["Chicken Tikka", cats[1].id, 380, 160, 36, "plate", "#B85C38", "#E07A3D"],
    ["Zinger Burger", cats[1].id, 450, 180, 30, "pcs", "#8B4513", "#D4A373"],
    ["Naan", cats[2].id, 40, 12, 120, "pcs", "#C4A574", "#E9C46A"],
    ["Garlic Naan", cats[2].id, 80, 25, 80, "pcs", "#B08968", "#E6CCB2"],
    ["Roghni Naan", cats[2].id, 90, 28, 70, "pcs", "#DDB892", "#F5E6C8"],
    ["Soft Drink", cats[3].id, 80, 40, 90, "can", "#1D3557", "#457B9D"],
    ["Lassi", cats[3].id, 150, 50, 40, "glass", "#F4D35E", "#EE964B"],
    ["Mineral Water", cats[3].id, 70, 25, 100, "bottle", "#2A9D8F", "#57CC99"],
    ["Kashmiri Chai", cats[3].id, 160, 45, 35, "cup", "#C9184A", "#FF758F"],
    ["Gulab Jamun", cats[4].id, 120, 40, 45, "bowl", "#6A040F", "#DC2F02"],
    ["Kheer", cats[4].id, 160, 55, 30, "bowl", "#F2E8CF", "#E9C46A"],
    ["Fries", cats[1].id, 180, 50, 40, "plate", "#E9C46A", "#F4A261"],
  ] as const;

  const productRows = items.map(([name, categoryId, price, cost, stock, unit, from, to], i) => ({
    id: id("prd"),
    tenantId,
    categoryId,
    name,
    sku: `SH-${100 + i}`,
    barcode: `890${100000 + i}`,
    description: null,
    price,
    costPrice: cost,
    taxPercent: 16,
    stock,
    lowStock: 8,
    unit,
    imageData: tileArt(name, from, to),
    expiryDate: null,
    batchNo: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(products).values(productRows);

  await db.insert(discounts)
    .values([
      { id: id("dsc"), tenantId, name: "Ramadan 10%", type: "PERCENT", value: 10, minAmount: 800, active: true },
      { id: id("dsc"), tenantId, name: "Staff meal", type: "FIXED", value: 150, minAmount: 0, active: true },
    ])
    ;

  await db.insert(customers)
    .values([
      { id: id("cus"), tenantId, name: "Walk-in", phone: null, address: null, createdAt: now },
      { id: id("cus"), tenantId, name: "Office Park Corp", phone: "0300-5551212", address: "Gulberg III", createdAt: now },
    ])
    ;

  await fillHistory({
    tenantId,
    userId: ownerId,
    prefix: "SH",
    productRows,
    now,
    seed: 42,
    tax: 16,
    company: "Spice House",
    ntn: "1234567-8",
    strn: "03-12-3456-789-12",
    pos: "POS-LHR-8812",
  });
}

async function seedPharmacy(now: number, hash: (pw: string) => string) {
  const tenantId = id("tnt");
  const ownerId = id("usr");

  await db.insert(tenants)
    .values({
      id: tenantId,
      businessType: "MEDICAL",
      status: "ACTIVE",
      companyName: "Hayat Pharmacy",
      tradeName: "Hayat Medical Store",
      address: "Plot 4, Saddar, Karachi",
      city: "Karachi",
      phone: "021-35678901",
      email: "sara@hayatpharmacy.pk",
      ntn: "7654321-0",
      strn: "12-01-9988-221-08",
      fbrPosId: "POS-KHI-2201",
      fbrLicenseDate: "2022-11-03",
      fbrRegisterId: "REG-KHI-11904",
      customQr: null,
      invoicePrefix: "HP",
      nextInvoiceNo: 1,
      defaultTaxPercent: 0,
      licenseKey: licenseKey(),
      expiresAt: now + 1000 * 60 * 60 * 24 * 365,
      createdAt: now - 1000 * 60 * 60 * 24 * 40,
      updatedAt: now,
    })
    ;

  await db.insert(users)
    .values({
      id: ownerId,
      email: "sara@hayatpharmacy.pk",
      name: "Sara Hayat",
      passwordHash: hash("Shop@123"),
      role: "OWNER",
      tenantId,
      active: true,
      createdAt: now,
    })
    ;

  const cats = [
    { id: id("cat"), name: "Tablets", color: "#457B9D" },
    { id: id("cat"), name: "Syrups", color: "#2A9D8F" },
    { id: id("cat"), name: "Devices", color: "#6D597A" },
    { id: id("cat"), name: "OTC", color: "#E9C46A" },
  ];
  await db.insert(categories)
    .values(cats.map((c) => ({ ...c, tenantId })))
    ;

  const in90 = now + 1000 * 60 * 60 * 24 * 90;
  const in20 = now + 1000 * 60 * 60 * 24 * 20;
  const items = [
    ["Panadol Extra", cats[0].id, 35, 18, 180, "pack", "PX-11", in90, "#1D3557", "#457B9D"],
    ["Augmentin 625", cats[0].id, 280, 190, 40, "pack", "AG-9", in90, "#1B4332", "#2D6A4F"],
    ["Brufen 400", cats[0].id, 45, 22, 90, "pack", "BR-4", in90, "#3D348B", "#7678ED"],
    ["Risek 20mg", cats[0].id, 180, 110, 55, "pack", "RK-20", in90, "#6A040F", "#9B2226"],
    ["Flagyl 400", cats[0].id, 90, 48, 70, "pack", "FL-2", in90, "#240046", "#7B2CBF"],
    ["Cetirizine", cats[0].id, 30, 12, 140, "pack", "CT-1", in90, "#0077B6", "#90E0EF"],
    ["Cough Syrup", cats[1].id, 220, 90, 36, "bottle", "CS-8", in90, "#BC4749", "#F2E8CF"],
    ["ORS", cats[1].id, 40, 16, 8, "sachet", "OR-3", in20, "#2A9D8F", "#8AE1C0"],
    ["Vitamin D3", cats[1].id, 450, 240, 22, "bottle", "VD-5", in90, "#E9C46A", "#F4A261"],
    ["Multivitamin", cats[3].id, 350, 180, 28, "bottle", "MV-7", in90, "#606C38", "#A7C957"],
    ["Disprin", cats[3].id, 25, 10, 200, "pack", "DS-1", in90, "#E63946", "#F1FAEE"],
    ["Face Mask Box", cats[3].id, 150, 70, 15, "box", "FM-2", null, "#495057", "#ADB5BD"],
    ["Digital Thermometer", cats[2].id, 850, 420, 12, "pcs", "TH-1", null, "#212529", "#6C757D"],
    ["BP Monitor", cats[2].id, 3200, 1900, 6, "pcs", "BP-4", null, "#22223B", "#4A4E69"],
    ["Insulin Syringe", cats[2].id, 15, 6, 300, "pcs", "IS-9", in90, "#48CAE4", "#023E8A"],
  ] as const;

  const productRows = items.map(([name, categoryId, price, cost, stock, unit, batch, expiry, from, to], i) => ({
    id: id("prd"),
    tenantId,
    categoryId,
    name,
    sku: `HP-${200 + i}`,
    barcode: `628${200000 + i}`,
    description: null,
    price,
    costPrice: cost,
    taxPercent: 0,
    stock,
    lowStock: 10,
    unit,
    imageData: tileArt(name, from, to),
    expiryDate: expiry,
    batchNo: batch,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(products).values(productRows);

  await db.insert(discounts)
    .values([
      { id: id("dsc"), tenantId, name: "Senior 5%", type: "PERCENT", value: 5, minAmount: 0, active: true },
      { id: id("dsc"), tenantId, name: "Bulk Rs 50", type: "FIXED", value: 50, minAmount: 1000, active: true },
    ])
    ;

  await db.insert(customers)
    .values([
      { id: id("cus"), tenantId, name: "Walk-in", phone: null, address: null, createdAt: now },
      { id: id("cus"), tenantId, name: "Mrs. Khalid", phone: "0321-7788990", address: "Clifton Block 5", createdAt: now },
    ])
    ;

  await fillHistory({
    tenantId,
    userId: ownerId,
    prefix: "HP",
    productRows,
    now,
    seed: 91,
    tax: 0,
    company: "Hayat Pharmacy",
    ntn: "7654321-0",
    strn: "12-01-9988-221-08",
    pos: "POS-KHI-2201",
  });
}

async function fillHistory(opts: {
  tenantId: string;
  userId: string;
  prefix: string;
  productRows: { id: string; name: string; price: number; taxPercent: number; unit: string }[];
  now: number;
  seed: number;
  tax: number;
  company: string;
  ntn: string;
  strn: string;
  pos: string;
}) {
  const rand = mulberry32(opts.seed);
  const methods = ["CASH", "CARD", "JAZZCASH", "EASYPAISA", "CASH", "CASH", "CARD"] as const;
  let invoiceSeq = 1;
  const sessionId = id("ses");

  await db.insert(cashSessions)
    .values({
      id: sessionId,
      tenantId: opts.tenantId,
      openedAt: opts.now - 1000 * 60 * 60 * 8,
      closedAt: null,
      openingFloat: 5000,
      closingCash: null,
      note: "Morning float",
    })
    ;

  for (let day = 13; day >= 0; day--) {
    const dayStart = opts.now - day * 86400000;
    const bills = 6 + Math.floor(rand() * 9);
    for (let b = 0; b < bills; b++) {
      const count = 1 + Math.floor(rand() * 4);
      const lines = Array.from({ length: count }, () => {
        const p = opts.productRows[Math.floor(rand() * opts.productRows.length)];
        const qty = 1 + Math.floor(rand() * 3);
        return {
          productId: p.id,
          name: p.name,
          qty,
          price: p.price,
          taxPercent: p.taxPercent,
          unit: p.unit,
        };
      });
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const taxAmt = lines.reduce((s, l) => s + (l.price * l.qty * l.taxPercent) / 100, 0);
      const total = Math.round((subtotal + taxAmt) * 100) / 100;
      const method = methods[Math.floor(rand() * methods.length)];
      const cashAmount = method === "CASH" ? total : 0;
      const cardAmount = method === "CARD" ? total : 0;
      const walletAmount = method === "JAZZCASH" || method === "EASYPAISA" ? total : 0;
      const createdAt = dayStart - Math.floor(rand() * 10 * 3600000) + 12 * 3600000;
      const number = invoiceNumber(opts.prefix, invoiceSeq++);
      const invId = id("inv");
      const qrPayload = buildQrPayload({
        companyName: opts.company,
        ntn: opts.ntn,
        strn: opts.strn,
        fbrPosId: opts.pos,
        invoiceNo: number,
        dateIso: new Date(createdAt).toISOString(),
        total,
        tax: taxAmt,
      });

      await db.insert(invoices)
        .values({
          id: invId,
          tenantId: opts.tenantId,
          userId: opts.userId,
          customerId: null,
          number,
          itemsJson: JSON.stringify(lines),
          subtotal,
          discountName: null,
          discountAmt: 0,
          taxAmt,
          total,
          paymentMethod: method,
          cashAmount,
          cardAmount,
          walletAmount,
          received: total,
          changeDue: 0,
          status: "PAID",
          qrPayload,
          note: null,
          offlineId: null,
          createdAt,
        })
        ;

      await db.insert(cashMoves)
        .values({
          id: id("mov"),
          tenantId: opts.tenantId,
          sessionId: day === 0 ? sessionId : null,
          invoiceId: invId,
          type: "SALE",
          method,
          amount: total,
          note: number,
          createdAt,
        })
        ;
    }
  }

  await db.update(tenants)
    .set({ nextInvoiceNo: invoiceSeq, updatedAt: opts.now })
    .where(eq(tenants.id, opts.tenantId))
    ;
}
