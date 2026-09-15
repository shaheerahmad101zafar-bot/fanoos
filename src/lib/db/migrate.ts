import { neon } from "@neondatabase/serverless";

const ALTERS = [
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fbr_license_date TEXT",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fbr_register_id TEXT",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name TEXT",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_trial_days INTEGER",
  "ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id TEXT",
  "ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_id TEXT",
  "CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id)",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_logo_data TEXT",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS takeaway_service_tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'TAKEAWAY'",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_tax_amt DOUBLE PRECISION NOT NULL DEFAULT 0",
  "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0",
  "UPDATE tenants SET fbr_license_date = '2023-04-12', fbr_register_id = 'REG-LHR-44821' WHERE company_name = 'Spice House' AND (fbr_license_date IS NULL OR fbr_license_date = '')",
  "UPDATE tenants SET fbr_license_date = '2022-11-03', fbr_register_id = 'REG-KHI-11904' WHERE company_name = 'Hayat Pharmacy' AND (fbr_license_date IS NULL OR fbr_license_date = '')",
];

let ran = false;

export async function ensureColumns() {
  if (ran) return;
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);
  for (const statement of ALTERS) {
    await sql.query(statement);
  }
  ran = true;
}
