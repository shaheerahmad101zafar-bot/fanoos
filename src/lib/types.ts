export type Role = "SUPER_ADMIN" | "OWNER" | "CASHIER";
export type BusinessType = "RESTAURANT" | "MEDICAL" | "RETAIL" | "GENERAL";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL";
export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "JAZZCASH"
  | "EASYPAISA"
  | "BANK"
  | "MIXED";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
};

export type InvoiceItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  taxPercent: number;
  unit: string;
};

export type SyncOp =
  | { kind: "invoice.create"; payload: Record<string, unknown> }
  | { kind: "product.upsert"; payload: Record<string, unknown> }
  | { kind: "product.delete"; payload: { id: string } }
  | { kind: "discount.upsert"; payload: Record<string, unknown> }
  | { kind: "discount.delete"; payload: { id: string } }
  | { kind: "customer.upsert"; payload: Record<string, unknown> }
  | { kind: "category.upsert"; payload: Record<string, unknown> }
  | { kind: "category.delete"; payload: { id: string } }
  | { kind: "cash.move"; payload: Record<string, unknown> }
  | { kind: "cash.open"; payload: Record<string, unknown> }
  | { kind: "cash.close"; payload: Record<string, unknown> }
  | { kind: "settings.update"; payload: Record<string, unknown> };
