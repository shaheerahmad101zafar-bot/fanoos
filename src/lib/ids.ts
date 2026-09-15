import { randomBytes } from "crypto";

export function id(prefix = "") {
  const raw = randomBytes(9).toString("base64url");
  return prefix ? `${prefix}_${raw}` : raw;
}

export function licenseKey() {
  const chunk = () => randomBytes(2).toString("hex").toUpperCase();
  return `FAN-${chunk()}-${chunk()}-${chunk()}`;
}

export function invoiceNumber(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(5, "0")}`;
}
