"use client";

import { use, useEffect, useState } from "react";
import { InvoicePrintPanel, PrintActions, useAutoPrint } from "@/components/InvoiceSlip";
import { Button } from "@/components/ui";
import { useShop } from "@/lib/store";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shop = useShop();
  const [busy, setBusy] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const inv = shop.invoices.find((i) => i.id === id);

  useEffect(() => {
    setAutoPrint(new URLSearchParams(window.location.search).get("print") === "1");
  }, []);

  useAutoPrint(autoPrint, inv, shop.tenant);

  if (!inv) {
    return <p className="text-muted">This bill is not on this device.</p>;
  }

  async function voidBill() {
    if (!confirm("Void this invoice and return stock?")) return;
    setBusy(true);
    try {
      await shop.voidInvoice(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-xl gap-4 pb-28 lg:pb-8">
      <div className="no-print">
        <p className="text-sm text-muted">Invoice</p>
        <h1 className="font-display text-4xl">{inv.number}</h1>
      </div>
      <InvoicePrintPanel invoice={inv} tenant={shop.tenant} />
      {shop.user.role === "OWNER" && inv.status === "PAID" ? (
        <Button tone="danger" disabled={busy} onClick={voidBill} className="no-print">
          Void invoice
        </Button>
      ) : null}
      <div
        className="no-print fixed inset-x-3 z-40 lg:hidden"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="rounded-[28px] bg-cream p-2 shadow-[0_18px_40px_rgba(18,14,10,0.35)]">
          <PrintActions invoice={inv} />
        </div>
      </div>
    </div>
  );
}
