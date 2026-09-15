export type QrInput = {
  companyName: string;
  ntn?: string | null;
  strn?: string | null;
  fbrPosId?: string | null;
  customQr?: string | null;
  invoiceNo?: string;
  dateIso?: string;
  total?: number;
  tax?: number;
};

export function buildQrPayload(input: QrInput) {
  if (input.customQr?.trim()) {
    return input.customQr
      .replaceAll("{company}", input.companyName)
      .replaceAll("{ntn}", input.ntn || "")
      .replaceAll("{strn}", input.strn || "")
      .replaceAll("{pos}", input.fbrPosId || "")
      .replaceAll("{invoice}", input.invoiceNo || "")
      .replaceAll("{date}", input.dateIso || "")
      .replaceAll("{total}", input.total != null ? String(input.total) : "")
      .replaceAll("{tax}", input.tax != null ? String(input.tax) : "");
  }

  const lines = [
    `Seller: ${input.companyName}`,
    input.ntn ? `NTN: ${input.ntn}` : null,
    input.strn ? `STRN: ${input.strn}` : null,
    input.fbrPosId ? `FBR POS ID: ${input.fbrPosId}` : null,
    input.invoiceNo ? `Invoice: ${input.invoiceNo}` : null,
    input.dateIso ? `Date: ${input.dateIso}` : null,
    input.total != null ? `Total: ${input.total.toFixed(2)}` : null,
    input.tax != null ? `Tax: ${input.tax.toFixed(2)}` : null,
    "Issued via Fanoos POS",
  ].filter(Boolean);

  return lines.join("\n");
}
