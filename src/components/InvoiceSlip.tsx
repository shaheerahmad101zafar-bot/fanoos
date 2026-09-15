"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui";
import { ORDER_LABELS, PAYMENT_LABELS, pkr, prettyDate, prettyLicenseDate } from "@/lib/format";
import { printInvoice, sendBillToPrinter, shareInvoiceFile } from "@/lib/print-bill";
import { useShop, type Invoice, type Tenant } from "@/lib/store";

function billLogo(tenant: Tenant) {
  return tenant.invoiceLogoData || tenant.logoData;
}

export { printInvoice, sendBillToPrinter, shareInvoiceFile };

export async function shareOrPrintInvoice(invoice: Invoice, tenant?: Tenant) {
  try {
    await shareInvoiceFile(invoice);
  } catch {
    await sendBillToPrinter(invoice, tenant);
  }
}

export function PrintActions({ invoice, className }: { invoice: Invoice; className?: string }) {
  const shop = useShop();
  const [busy, setBusy] = useState<"print" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPrint() {
    setError(null);
    setBusy("print");
    try {
      await sendBillToPrinter(invoice, shop.tenant);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "TM-m30 phone Bluetooth pe connected hona chahiye. Fanoos app se print karo — Chrome searching nahi.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    setError(null);
    setBusy("share");
    try {
      await shareOrPrintInvoice(invoice, shop.tenant);
    } catch {
      setError("Share nahi hua. Print bill dobara try karo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`no-print grid gap-2 ${className || ""}`}>
      <div className="grid grid-cols-2 gap-2">
        <Button className="min-h-12" disabled={busy !== null} onClick={() => void onPrint()}>
          <Printer className="h-4 w-4" />
          {busy === "print" ? "TM-m30…" : "Print bill"}
        </Button>
        <Button tone="ink" className="min-h-12" disabled={busy !== null} onClick={() => void onShare()}>
          <Share2 className="h-4 w-4" />
          {busy === "share" ? "Bill PDF…" : "Share / printer"}
        </Button>
      </div>
      {error ? <p className="text-xs text-rose">{error}</p> : null}
    </div>
  );
}

export function InvoiceSlip({
  invoice,
  tenant,
  showFbrLicense,
}: {
  invoice: Invoice;
  tenant: Tenant;
  showFbrLicense?: boolean;
}) {
  const customer = [invoice.customerName, invoice.customerPhone].filter(Boolean).join(" · ");
  const logo = billLogo(tenant);
  const orderType = invoice.orderType || "TAKEAWAY";

  return (
    <article className="invoice-slip mx-auto w-full max-w-[420px] rounded-[28px] border border-black/8 bg-white px-5 py-6 text-ink shadow-[0_16px_40px_rgba(18,14,10,0.08)]">
      <header className="text-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="invoice-logo mx-auto mb-3 h-20 w-20 rounded-2xl object-cover" />
        ) : null}
        <h2 className="font-display text-3xl leading-none">{tenant.companyName}</h2>
        {tenant.tradeName ? <p className="mt-1 text-sm text-muted">{tenant.tradeName}</p> : null}
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember">
          {ORDER_LABELS[orderType] || orderType} invoice
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          {[tenant.address, tenant.city].filter(Boolean).join(", ")}
          {tenant.phone ? (
            <>
              <br />
              {tenant.phone}
            </>
          ) : null}
        </p>
      </header>

      <div className="my-4 border-t border-dashed border-black/15" />

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <p className="text-muted">Invoice</p>
        <p className="text-right font-semibold">{invoice.number}</p>
        <p className="text-muted">Type</p>
        <p className="text-right">{ORDER_LABELS[orderType] || orderType}</p>
        <p className="text-muted">Date</p>
        <p className="text-right">{prettyDate(invoice.createdAt)}</p>
        <p className="text-muted">Payment</p>
        <p className="text-right">{PAYMENT_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</p>
        {customer ? (
          <>
            <p className="text-muted">Customer</p>
            <p className="text-right">{customer}</p>
          </>
        ) : null}
      </div>

      <div className="my-4 border-t border-dashed border-black/15" />

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-2 text-left font-medium">Item</th>
            <th className="pb-2 text-center font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((line) => (
            <tr key={`${line.productId}-${line.name}`}>
              <td className="py-1.5 pr-2">
                <p className="font-medium">{line.name}</p>
                <p className="text-xs text-muted">{pkr(line.price)}</p>
              </td>
              <td className="py-1.5 text-center">{line.qty}</td>
              <td className="py-1.5 text-right">{pkr(line.price * line.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-black/15" />

      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{pkr(invoice.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Discount{invoice.discountName ? ` (${invoice.discountName})` : ""}</dt>
          <dd>- {pkr(invoice.discountAmt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Tax</dt>
          <dd>{pkr(invoice.taxAmt)}</dd>
        </div>
        {orderType === "TAKEAWAY" ? (
          <div className="flex justify-between">
            <dt className="text-muted">Service tax{invoice.serviceTaxPercent ? ` (${invoice.serviceTaxPercent}%)` : ""}</dt>
            <dd>{pkr(invoice.serviceTaxAmt || 0)}</dd>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt className="text-muted">Delivery charges</dt>
            <dd>{pkr(invoice.deliveryCharge || 0)}</dd>
          </div>
        )}
        <div className="mt-2 flex justify-between font-display text-2xl">
          <dt>Total</dt>
          <dd>{pkr(invoice.total)}</dd>
        </div>
        {invoice.received ? (
          <div className="flex justify-between text-xs text-muted">
            <dt>Received / change</dt>
            <dd>
              {pkr(invoice.received)} / {pkr(invoice.changeDue)}
            </dd>
          </div>
        ) : null}
      </dl>

      {(tenant.ntn || tenant.strn || tenant.fbrPosId) && (
        <div className="mt-4 rounded-2xl bg-parchment/80 px-3 py-2 text-[11px] leading-5 text-muted">
          {tenant.ntn ? <p>NTN {tenant.ntn}</p> : null}
          {tenant.strn ? <p>STRN {tenant.strn}</p> : null}
          {tenant.fbrPosId ? <p>FBR POS ID {tenant.fbrPosId}</p> : null}
        </div>
      )}

      {showFbrLicense && (tenant.fbrLicenseDate || tenant.fbrRegisterId) ? (
        <div className="mt-2 rounded-2xl border border-black/8 px-3 py-2 text-[11px] leading-5">
          {tenant.fbrLicenseDate ? <p>FBR license date {prettyLicenseDate(tenant.fbrLicenseDate)}</p> : null}
          {tenant.fbrRegisterId ? <p>FBR register ID {tenant.fbrRegisterId}</p> : null}
        </div>
      ) : null}

      {invoice.qrPayload ? (
        <div className="mt-5 grid justify-items-center gap-2">
          <QRCodeCanvas value={invoice.qrPayload} size={128} />
          <p className="text-center text-[10px] uppercase tracking-[0.16em] text-muted">FBR / shop QR</p>
        </div>
      ) : null}

      <p className="mt-5 text-center text-[11px] text-muted">Thank you for your visit</p>
    </article>
  );
}

export function InvoicePrintPanel({
  invoice,
  tenant,
  children,
}: {
  invoice: Invoice;
  tenant: Tenant;
  children?: React.ReactNode;
}) {
  const [showFbrLicense, setShowFbrLicense] = useState(false);
  const canShowLicense = Boolean(tenant.fbrLicenseDate || tenant.fbrRegisterId);

  return (
    <div className="grid gap-4">
      <div className="no-print">
        <PrintActions invoice={invoice} />
        <p className="mt-2 text-xs text-muted">
          Print bill Fanoos app se TM-m30 pe jata hai (jo phone Bluetooth pe already connected hai). Chrome searching / WiFi / IP nahi.
        </p>
        <Link href="/shop/printer" className="mt-2 inline-block text-xs font-semibold text-ember">
          Printer settings
        </Link>
      </div>
      <label className="no-print flex items-start gap-3 rounded-2xl bg-parchment/90 px-3 py-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-ember"
          checked={showFbrLicense}
          disabled={!canShowLicense}
          onChange={(e) => setShowFbrLicense(e.target.checked)}
        />
        <span>
          <span className="font-semibold">Print FBR license date & register ID</span>
          <span className="mt-0.5 block text-xs text-muted">
            {canShowLicense
              ? "Tick only when this bill needs those two lines. They stay off unless you check this."
              : "Add license date and register ID in Shop settings first."}
          </span>
        </span>
      </label>
      <InvoiceSlip invoice={invoice} tenant={tenant} showFbrLicense={showFbrLicense} />
      {children}
    </div>
  );
}

export function useAutoPrint(enabled: boolean, invoice?: Invoice, tenant?: Tenant) {
  useEffect(() => {
    if (!enabled || !invoice || !tenant) return;
    const t = window.setTimeout(() => printInvoice(invoice, tenant), 800);
    return () => window.clearTimeout(t);
  }, [enabled, invoice, tenant]);
}
