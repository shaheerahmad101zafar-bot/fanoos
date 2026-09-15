export function pkr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `Rs ${n.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function compactPkr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 10000000) return `Rs ${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `Rs ${(n / 1000).toFixed(1)}k`;
  return pkr(n);
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function monthLabel(ts: number) {
  return new Date(ts).toLocaleDateString("en-PK", {
    month: "short",
    year: "2-digit",
  });
}

export function prettyDate(ts: number) {
  return new Date(ts).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function prettyLicenseDate(value: string | null | undefined) {
  if (!value) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function prettyDay(ts: number) {
  return new Date(ts).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
  });
}

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
  BANK: "Bank",
  MIXED: "Split",
};

export const ORDER_LABELS: Record<string, string> = {
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export const BUSINESS_LABELS: Record<string, string> = {
  RESTAURANT: "Restaurant",
  MEDICAL: "Medical store",
  RETAIL: "Retail / general",
  GENERAL: "General shop",
};
