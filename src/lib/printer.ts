import { ORDER_LABELS, PAYMENT_LABELS, pkr, prettyDate, prettyLicenseDate } from "@/lib/format";
import { hasNativeBluetooth, listBondedPrinters, pickTmPrinter, printSppJobs } from "@/lib/native-bt";
import { trimCanvas } from "@/lib/print-capture";
import type { Invoice, Tenant } from "@/lib/store";

export type PrinterConfig = {
  mode: "thermal";
  paperMm: 58 | 80;
  bluetoothName: string;
  bluetoothAddress: string;
};

const KEY = "fanoos.printer.v1";

const DEFAULT_PRINTER: PrinterConfig = {
  mode: "thermal",
  paperMm: 80,
  bluetoothName: "",
  bluetoothAddress: "",
};

export const FANOOS_APP_APK =
  "https://github.com/shaheerahmad101zafar-bot/fanoos/releases/download/v1.5/fanoos.apk";

export function loadPrinter(): PrinterConfig {
  if (typeof window === "undefined") return { ...DEFAULT_PRINTER };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PRINTER };
    const parsed = JSON.parse(raw) as Partial<PrinterConfig>;
    return {
      mode: "thermal",
      paperMm: parsed.paperMm === 58 ? 58 : 80,
      bluetoothName: String(parsed.bluetoothName || ""),
      bluetoothAddress: String(parsed.bluetoothAddress || ""),
    };
  } catch {
    return { ...DEFAULT_PRINTER };
  }
}

export function savePrinter(next: PrinterConfig) {
  window.localStorage.setItem(KEY, JSON.stringify({ ...next, mode: "thermal", host: "" }));
  window.dispatchEvent(new Event("fanoos-printer"));
}

export function printerConnected(cfg = loadPrinter()) {
  return Boolean(cfg.bluetoothAddress || cfg.bluetoothName);
}

function paperDots(paperMm: 58 | 80) {
  return paperMm === 58 ? 384 : 576;
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function rasterStrip(canvas: HTMLCanvasElement, startY: number, height: number) {
  const width = canvas.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Print image nahi bani");
  const pixels = ctx.getImageData(0, startY, width, height).data;
  const widthBytes = Math.ceil(width / 8);
  const raster = new Uint8Array(widthBytes * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      if (lum < 168 && pixels[i + 3] > 20) {
        raster[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return concatBytes([
    Uint8Array.from([
      0x1d, 0x76, 0x30, 0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
    ]),
    raster,
  ]);
}

function canvasToEscPos(canvas: HTMLCanvasElement) {
  const chunks: Uint8Array[] = [Uint8Array.from([0x1b, 0x40, 0x1b, 0x61, 0x01])];
  const band = 200;
  for (let y = 0; y < canvas.height; y += band) {
    chunks.push(rasterStrip(canvas, y, Math.min(band, canvas.height - y)));
  }
  chunks.push(Uint8Array.from([0x0a, 0x0a]));
  return concatBytes(chunks);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const raw = text.trim();
  if (!raw) return [];
  if (ctx.measureText(raw).width <= maxWidth) return [raw];
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  const pushWord = (word: string) => {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
      return;
    }
    if (cur) lines.push(cur);
    if (ctx.measureText(word).width <= maxWidth) {
      cur = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (ctx.measureText(trial).width <= maxWidth) chunk = trial;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    cur = chunk;
  };
  for (const word of words) pushWord(word);
  if (cur) lines.push(cur);
  return lines;
}

async function loadPrintImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function paintInvoiceCanvas(invoice: Invoice, tenant: Tenant, width: number) {
  width = Math.floor(width / 8) * 8;
  const s = (width / 576) * 1.5;
  const pad = Math.round(20 * s);
  const inner = width - pad * 2;
  const title = Math.round(28 * s);
  const body = Math.round(20 * s);
  const small = Math.round(16 * s);
  const totalSize = Math.round(26 * s);
  const logoSize = Math.round(88 * s);
  const qrSize = Math.round(148 * s);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 4200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Print image nahi bani");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, Math.round(2 * s));
  ctx.textBaseline = "top";

  const orderType = invoice.orderType || "TAKEAWAY";
  const logoSrc = tenant.invoiceLogoData || tenant.logoData;
  const logo = logoSrc ? await loadPrintImage(logoSrc) : null;
  const qr = document.querySelector(".invoice-slip canvas");
  const showLicense = Boolean(document.querySelector(".invoice-slip")?.textContent?.includes("FBR license date"));
  let y = pad;

  const center = (text: string, size: number, bold = false, extra = 4) => {
    ctx.font = `${bold ? "700" : "400"} ${size}px sans-serif`;
    ctx.textAlign = "center";
    for (const line of wrapText(ctx, text, inner)) {
      ctx.fillText(line, width / 2, y);
      y += size + extra;
    }
  };
  const left = (text: string, size: number) => {
    ctx.font = `400 ${size}px sans-serif`;
    ctx.textAlign = "left";
    for (const line of wrapText(ctx, text, inner)) {
      ctx.fillText(line, pad, y);
      y += size + 3;
    }
  };
  const kv = (key: string, value: string, size = small, bold = false) => {
    ctx.font = `${bold ? "700" : "400"} ${size}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(key, pad, y);
    ctx.textAlign = "right";
    ctx.fillText(value, width - pad, y);
    y += size + Math.round(6 * s);
  };
  const sep = () => {
    y += Math.round(6 * s);
    ctx.beginPath();
    ctx.setLineDash([Math.round(5 * s), Math.round(4 * s)]);
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += Math.round(10 * s);
  };

  if (logo) {
    ctx.drawImage(logo, (width - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + Math.round(8 * s);
  }
  center(tenant.companyName, title, true, 4);
  center("CUSTOMER COPY", small, true, 4);
  if (tenant.tradeName) center(tenant.tradeName, small, false, 3);
  center(`${(ORDER_LABELS[orderType] || orderType).toUpperCase()} INVOICE`, small, true, 6);
  const addr = [tenant.address, tenant.city].filter(Boolean).join(", ");
  if (addr) center(addr, small, false, 3);
  if (tenant.phone) center(tenant.phone, small, false, 2);
  sep();
  kv("Invoice No", invoice.number);
  kv("Type", ORDER_LABELS[orderType] || orderType);
  kv("Date", prettyDate(invoice.createdAt));
  kv("Payment", PAYMENT_LABELS[invoice.paymentMethod] || invoice.paymentMethod);
  const customer = [invoice.customerName, invoice.customerPhone].filter(Boolean).join(" ");
  if (customer) kv("Customer", customer);
  sep();

  ctx.font = `700 ${small}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("Item", pad, y);
  ctx.textAlign = "center";
  ctx.fillText("Qty", pad + inner * 0.62, y);
  ctx.textAlign = "right";
  ctx.fillText("Amount", width - pad, y);
  y += small + Math.round(8 * s);

  for (const item of invoice.items) {
    ctx.font = `700 ${body}px sans-serif`;
    ctx.textAlign = "left";
    const nameWidth = inner * 0.55;
    const nameLines = wrapText(ctx, item.name, nameWidth);
    const rowTop = y;
    nameLines.forEach((line, i) => ctx.fillText(line, pad, rowTop + i * (body + 2)));
    ctx.font = `400 ${body}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(item.qty), pad + inner * 0.62, rowTop);
    ctx.textAlign = "right";
    ctx.fillText(pkr(item.price * item.qty), width - pad, rowTop);
    y = rowTop + Math.max(body, nameLines.length * (body + 2)) + Math.round(4 * s);
    ctx.font = `400 ${small}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${item.qty} x ${pkr(item.price)}`, pad, y);
    y += small + Math.round(8 * s);
  }

  sep();
  kv("Subtotal", pkr(invoice.subtotal));
  kv(`Discount${invoice.discountName ? ` (${invoice.discountName})` : ""}`, `- ${pkr(invoice.discountAmt)}`);
  kv("Tax", pkr(invoice.taxAmt));
  if (orderType === "TAKEAWAY") {
    kv(`Service tax${invoice.serviceTaxPercent ? ` (${invoice.serviceTaxPercent}%)` : ""}`, pkr(invoice.serviceTaxAmt || 0));
  } else {
    kv("Delivery charges", pkr(invoice.deliveryCharge || 0));
  }
  y += Math.round(4 * s);
  kv("TOTAL", pkr(invoice.total), totalSize, true);
  if (invoice.received) kv("Received / change", `${pkr(invoice.received)} / ${pkr(invoice.changeDue)}`);
  if (tenant.ntn || tenant.strn || tenant.fbrPosId) {
    y += Math.round(6 * s);
    if (tenant.ntn) left(`NTN ${tenant.ntn}`, small);
    if (tenant.strn) left(`STRN ${tenant.strn}`, small);
    if (tenant.fbrPosId) left(`FBR POS ID ${tenant.fbrPosId}`, small);
  }
  if (showLicense && tenant.fbrLicenseDate) left(`FBR license ${prettyLicenseDate(tenant.fbrLicenseDate)}`, small);
  if (showLicense && tenant.fbrRegisterId) left(`FBR register ID ${tenant.fbrRegisterId}`, small);
  if (qr instanceof HTMLCanvasElement) {
    y += Math.round(10 * s);
    ctx.drawImage(qr, (width - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + Math.round(8 * s);
  }
  center("Thank you for your visit", body, true, 4);
  y += Math.round(16 * s);
  const height = Math.max(120, Math.ceil(y));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const octx = out.getContext("2d");
  if (!octx) return trimCanvas(canvas);
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, width, height);
  octx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
  return trimCanvas(out, 8);
}

function finishPrintCanvas(canvas: HTMLCanvasElement, y: number, width: number) {
  const height = Math.max(80, Math.ceil(y));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const octx = out.getContext("2d");
  if (!octx) return trimCanvas(canvas);
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, width, height);
  octx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
  return trimCanvas(out, 8);
}

async function paintKitchenCanvas(invoice: Invoice, tenant: Tenant, width: number) {
  width = Math.floor(width / 8) * 8;
  const s = (width / 576) * 1.5;
  const pad = Math.round(20 * s);
  const inner = width - pad * 2;
  const title = Math.round(32 * s);
  const body = Math.round(26 * s);
  const small = Math.round(18 * s);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 2400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Print image nahi bani");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(2, Math.round(3 * s));
  ctx.textBaseline = "top";
  const orderType = invoice.orderType || "TAKEAWAY";
  let y = pad;
  const center = (text: string, size: number, bold = false, extra = 6) => {
    ctx.font = `${bold ? "700" : "400"} ${size}px sans-serif`;
    ctx.textAlign = "center";
    for (const line of wrapText(ctx, text, inner)) {
      ctx.fillText(line, width / 2, y);
      y += size + extra;
    }
  };
  ctx.fillRect(pad, y, inner, Math.round(44 * s));
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${title}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("KITCHEN", width / 2, y + Math.round(8 * s));
  ctx.fillStyle = "#000000";
  y += Math.round(56 * s);
  center((ORDER_LABELS[orderType] || orderType).toUpperCase(), small, true, 6);
  center(invoice.number, body, true, 4);
  center(prettyDate(invoice.createdAt), small, false, 8);
  const customer = [invoice.customerName, invoice.customerPhone].filter(Boolean).join("  ");
  if (customer) center(customer, small, true, 8);
  y += Math.round(4 * s);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  y += Math.round(12 * s);
  for (const item of invoice.items) {
    ctx.font = `700 ${body}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${item.qty}x`, pad, y);
    const nameLines = wrapText(ctx, item.name, inner - Math.round(70 * s));
    nameLines.forEach((line, i) => ctx.fillText(line, pad + Math.round(64 * s), y + i * (body + 4)));
    y += Math.max(body, nameLines.length * (body + 4)) + Math.round(12 * s);
  }
  y += Math.round(10 * s);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  y += Math.round(14 * s);
  center(tenant.companyName, small, false, 8);
  y += Math.round(12 * s);
  return finishPrintCanvas(canvas, y, width);
}

function testTicketBytes() {
  const body = "Fanoos POS\nTM-m30 connected\n";
  const chars = Array.from(body, (ch) => ch.charCodeAt(0) & 0xff);
  return Uint8Array.from([0x1b, 0x40, 0x1b, 0x61, 0x01, ...chars, 0x0a, 0x0a]);
}

export function chromeCannotUseClassicBluetooth() {
  return (
    "Phone Bluetooth mein TM-m30 already connected hai. Chrome usay search nahi karta kyunke yeh Classic Bluetooth printer hai, BLE nahi. Fanoos Android app kholo — wahan phone ki paired list se TM-m30 aata hai, Chrome ki scanning nahi."
  );
}

async function resolvePrinter() {
  if (!hasNativeBluetooth()) {
    throw new Error(chromeCannotUseClassicBluetooth());
  }
  const printers = await listBondedPrinters();
  if (!printers.length) {
    throw new Error(
      "Fanoos app ko Bluetooth permission do, aur phone Settings mein TM-m30 Connected rakho. Phir app band karke dubara kholo.",
    );
  }
  const cfg = loadPrinter();
  const picked =
    printers.find((item) => item.address && item.address === cfg.bluetoothAddress) ||
    printers.find((item) => item.name && item.name === cfg.bluetoothName) ||
    pickTmPrinter(printers);
  if (!picked) {
    throw new Error("Paired printers ki list se TM-m30 choose karo.");
  }
  return picked;
}

let printLock = false;

async function writeBluetooth(jobs: Uint8Array[], saveName: boolean) {
  if (printLock) return "TM-m30";
  printLock = true;
  try {
    const picked = await resolvePrinter();
    await printSppJobs(picked.address, jobs);
    if (saveName) {
      savePrinter({
        ...loadPrinter(),
        bluetoothName: picked.name || "TM-m30",
        bluetoothAddress: picked.address,
        paperMm: loadPrinter().paperMm || 80,
      });
    }
    return picked.name || "TM-m30";
  } finally {
    printLock = false;
  }
}

export async function connectBluetoothPrinter() {
  await writeBluetooth([testTicketBytes()], true);
}

export async function printBluetoothBill(invoice?: Invoice, tenant?: Tenant) {
  if (!invoice || !tenant) {
    throw new Error("Bill screen pe invoice nahi mili. Print bill dobara try karo.");
  }
  const cfg = loadPrinter();
  const width = paperDots(cfg.paperMm);
  const kitchen = await paintKitchenCanvas(invoice, tenant, width);
  const customer = await paintInvoiceCanvas(invoice, tenant, width);
  await writeBluetooth([canvasToEscPos(kitchen), canvasToEscPos(customer)], true);
}

export function printerHint() {
  if (hasNativeBluetooth()) {
    return "Phone ki paired Bluetooth list se TM-m30 choose karo. WiFi / IP / Add printer mat use karo.";
  }
  return chromeCannotUseClassicBluetooth();
}
