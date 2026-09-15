import { ORDER_LABELS, pkr } from "@/lib/format";
import { printBluetoothBill } from "@/lib/printer";
import type { Invoice, Tenant } from "@/lib/store";

export { printVisibleBill } from "@/lib/print-receipt";

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const legacy = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || legacy;
}

export function printInvoice(invoice?: Invoice, tenant?: Tenant) {
  void printBluetoothBill(invoice, tenant);
}

async function invoicePdfBlob() {
  const { captureSlipJpeg } = await import("@/lib/print-receipt");
  const { jsPDF } = await import("jspdf");
  const img = await captureSlipJpeg(576);
  const image = new Image();
  const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => reject(new Error("Bill image nahi bani"));
    image.src = img;
  });
  const mmW = 80;
  const mmH = Math.max(110, (size.h * mmW) / size.w);
  const pdf = new jsPDF({ unit: "mm", format: [mmW, mmH], orientation: "portrait" });
  pdf.addImage(img, "JPEG", 0, 0, mmW, mmH);
  return pdf.output("blob");
}

function shareTitle(invoice: Invoice) {
  const title = `Invoice ${invoice.number}`;
  const text = `${title} · ${pkr(invoice.total)}${
    invoice.orderType ? ` · ${ORDER_LABELS[invoice.orderType] || invoice.orderType}` : ""
  }`;
  return { title, text };
}

function canShareFiles(file: File) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }))
  );
}

export async function shareInvoiceFile(invoice: Invoice) {
  const { title, text } = shareTitle(invoice);
  try {
    const blob = await invoicePdfBlob();
    const file = new File([blob], `Invoice-${invoice.number}.pdf`, { type: "application/pdf" });
    if (canShareFiles(file)) {
      await navigator.share({ title, text, files: [file] });
      return;
    }
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: window.location.href });
        return;
      } catch {
        // cancelled or unsupported
      }
    }
    throw error;
  }
}

export async function sendBillToPrinter(invoice: Invoice, tenant?: Tenant) {
  await printBluetoothBill(invoice, tenant);
}
