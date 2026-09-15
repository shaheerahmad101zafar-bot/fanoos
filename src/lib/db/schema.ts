import { bigint, boolean, doublePrecision, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

const ts = (name: string) => bigint(name, { mode: "number" });

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  businessType: text("business_type").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  ntn: text("ntn"),
  strn: text("strn"),
  fbrPosId: text("fbr_pos_id"),
  fbrLicenseDate: text("fbr_license_date"),
  fbrRegisterId: text("fbr_register_id"),
  customQr: text("custom_qr"),
  logoData: text("logo_data"),
  invoiceLogoData: text("invoice_logo_data"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  nextInvoiceNo: integer("next_invoice_no").notNull().default(1),
  currency: text("currency").notNull().default("PKR"),
  defaultTaxPercent: doublePrecision("default_tax_percent").notNull().default(18),
  takeawayServiceTaxPercent: doublePrecision("takeaway_service_tax_percent").notNull().default(0),
  defaultDeliveryCharge: doublePrecision("default_delivery_charge").notNull().default(0),
  licenseKey: text("license_key").notNull().unique(),
  expiresAt: ts("expires_at"),
  notes: text("notes"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    tenantId: text("tenant_id"),
    pendingTrialDays: integer("pending_trial_days"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("users_tenant_idx").on(t.tenantId)],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#D4B36A"),
    parentId: text("parent_id"),
  },
  (t) => [index("categories_tenant_idx").on(t.tenantId), index("categories_parent_idx").on(t.parentId)],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    categoryId: text("category_id"),
    discountId: text("discount_id"),
    name: text("name").notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    description: text("description"),
    price: doublePrecision("price").notNull(),
    costPrice: doublePrecision("cost_price").notNull().default(0),
    taxPercent: doublePrecision("tax_percent").notNull().default(0),
    stock: doublePrecision("stock").notNull().default(0),
    lowStock: doublePrecision("low_stock").notNull().default(5),
    unit: text("unit").notNull().default("pcs"),
    imageData: text("image_data"),
    expiryDate: ts("expiry_date"),
    batchNo: text("batch_no"),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [index("products_tenant_idx").on(t.tenantId)],
);

export const discounts = pgTable(
  "discounts",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    value: doublePrecision("value").notNull(),
    minAmount: doublePrecision("min_amount").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("discounts_tenant_idx").on(t.tenantId)],
);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("customers_tenant_idx").on(t.tenantId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"),
    customerId: text("customer_id"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    number: text("number").notNull(),
    itemsJson: text("items_json").notNull(),
    subtotal: doublePrecision("subtotal").notNull(),
    discountName: text("discount_name"),
    discountAmt: doublePrecision("discount_amt").notNull().default(0),
    taxAmt: doublePrecision("tax_amt").notNull().default(0),
    orderType: text("order_type").notNull().default("TAKEAWAY"),
    deliveryCharge: doublePrecision("delivery_charge").notNull().default(0),
    serviceTaxAmt: doublePrecision("service_tax_amt").notNull().default(0),
    serviceTaxPercent: doublePrecision("service_tax_percent").notNull().default(0),
    total: doublePrecision("total").notNull(),
    paymentMethod: text("payment_method").notNull(),
    cashAmount: doublePrecision("cash_amount").notNull().default(0),
    cardAmount: doublePrecision("card_amount").notNull().default(0),
    walletAmount: doublePrecision("wallet_amount").notNull().default(0),
    received: doublePrecision("received").notNull().default(0),
    changeDue: doublePrecision("change_due").notNull().default(0),
    status: text("status").notNull().default("PAID"),
    fbrInvoiceNo: text("fbr_invoice_no"),
    qrPayload: text("qr_payload"),
    note: text("note"),
    offlineId: text("offline_id"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("invoices_tenant_number").on(t.tenantId, t.number),
    uniqueIndex("invoices_offline").on(t.offlineId),
    index("invoices_tenant_created").on(t.tenantId, t.createdAt),
  ],
);

export const cashSessions = pgTable(
  "cash_sessions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    openedAt: ts("opened_at").notNull(),
    closedAt: ts("closed_at"),
    openingFloat: doublePrecision("opening_float").notNull().default(0),
    closingCash: doublePrecision("closing_cash"),
    note: text("note"),
  },
  (t) => [index("cash_sessions_tenant").on(t.tenantId)],
);

export const cashMoves = pgTable(
  "cash_moves",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sessionId: text("session_id"),
    invoiceId: text("invoice_id"),
    type: text("type").notNull(),
    method: text("method").notNull().default("CASH"),
    amount: doublePrecision("amount").notNull(),
    note: text("note"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("cash_moves_tenant_created").on(t.tenantId, t.createdAt)],
);
