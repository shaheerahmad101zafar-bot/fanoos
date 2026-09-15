export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  business_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  company_name TEXT NOT NULL,
  trade_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  ntn TEXT,
  strn TEXT,
  fbr_pos_id TEXT,
  fbr_license_date TEXT,
  fbr_register_id TEXT,
  custom_qr TEXT,
  logo_data TEXT,
  invoice_logo_data TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  next_invoice_no INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'PKR',
  default_tax_percent DOUBLE PRECISION NOT NULL DEFAULT 18,
  takeaway_service_tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  default_delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
  license_key TEXT NOT NULL UNIQUE,
  expires_at BIGINT,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  tenant_id TEXT,
  pending_trial_days INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#D4B36A',
  parent_id TEXT
);
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category_id TEXT,
  discount_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  cost_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  low_stock DOUBLE PRECISION NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  image_data TEXT,
  expiry_date BIGINT,
  batch_no TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS products_tenant_idx ON products(tenant_id);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  min_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS discounts_tenant_idx ON discounts(tenant_id);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS customers_tenant_idx ON customers(tenant_id);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  number TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  discount_name TEXT,
  discount_amt DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_amt DOUBLE PRECISION NOT NULL DEFAULT 0,
  order_type TEXT NOT NULL DEFAULT 'TAKEAWAY',
  delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
  service_tax_amt DOUBLE PRECISION NOT NULL DEFAULT 0,
  service_tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL,
  payment_method TEXT NOT NULL,
  cash_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  card_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  wallet_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  received DOUBLE PRECISION NOT NULL DEFAULT 0,
  change_due DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PAID',
  fbr_invoice_no TEXT,
  qr_payload TEXT,
  note TEXT,
  offline_id TEXT,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_number ON invoices(tenant_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_offline ON invoices(offline_id);
CREATE INDEX IF NOT EXISTS invoices_tenant_created ON invoices(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  opened_at BIGINT NOT NULL,
  closed_at BIGINT,
  opening_float DOUBLE PRECISION NOT NULL DEFAULT 0,
  closing_cash DOUBLE PRECISION,
  note TEXT
);
CREATE INDEX IF NOT EXISTS cash_sessions_tenant ON cash_sessions(tenant_id);

CREATE TABLE IF NOT EXISTS cash_moves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id TEXT,
  invoice_id TEXT,
  type TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'CASH',
  amount DOUBLE PRECISION NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS cash_moves_tenant_created ON cash_moves(tenant_id, created_at);
`;
