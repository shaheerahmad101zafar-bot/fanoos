"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Card, Empty } from "@/components/ui";
import { ORDER_LABELS, PAYMENT_LABELS, pkr, prettyDate } from "@/lib/format";
import { useShop } from "@/lib/store";

export default function InvoicesPage() {
  const shop = useShop();
  const [type, setType] = useState<"ALL" | "TAKEAWAY" | "DELIVERY">("ALL");
  if (!shop.invoices.length) return <Empty title="No bills yet" text="The first sale will land here." />;

  const rows = shop.invoices.filter((inv) => {
    if (type === "ALL") return true;
    return (inv.orderType || "TAKEAWAY") === type;
  });

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl">Invoices</h1>
      <div className="flex gap-2">
        {(["ALL", "TAKEAWAY", "DELIVERY"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              type === key ? "bg-ember text-white" : "bg-white text-ink"
            }`}
          >
            {key === "ALL" ? "All" : ORDER_LABELS[key]}
          </button>
        ))}
      </div>

      {!rows.length ? <Empty title="No bills in this type" text="Try All, Takeaway or Delivery." /> : null}

      <div className="grid gap-3 md:hidden">
        {rows.map((inv) => (
          <Card key={inv.id}>
            <Link href={`/shop/invoices/${inv.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{inv.number}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ember">
                    {ORDER_LABELS[inv.orderType || "TAKEAWAY"] || inv.orderType}
                  </p>
                  <p className="mt-1 text-sm text-muted">{prettyDate(inv.createdAt)}</p>
                  {inv.customerName || inv.customerPhone ? (
                    <p className="mt-1 truncate text-sm">
                      {[inv.customerName, inv.customerPhone].filter(Boolean).join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Walk-in</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl">{pkr(inv.total)}</p>
                  <p className="text-xs text-muted">{PAYMENT_LABELS[inv.paymentMethod] || inv.paymentMethod}</p>
                </div>
              </div>
            </Link>
            {inv.pending ? <p className="mt-2 text-xs text-ember">Waiting to sync</p> : null}
            {inv.status === "VOID" ? <p className="mt-2 text-xs text-rose">Void</p> : null}
            <Link
              href={`/shop/invoices/${inv.id}`}
              className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
            >
              <Printer className="h-4 w-4" />
              Print bill
            </Link>
          </Card>
        ))}
      </div>

      <Card pad={false} className="hidden md:block">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-parchment/80 text-muted">
              <tr>
                <th className="px-4 py-3">Bill</th>
                <th>Type</th>
                <th>Customer</th>
                <th>When</th>
                <th>Pay</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t border-black/5">
                  <td className="px-4 py-3 font-semibold">
                    {inv.number}
                    {inv.pending ? <span className="ml-2 text-xs text-ember">offline</span> : null}
                    {inv.status === "VOID" ? <span className="ml-2 text-xs text-rose">void</span> : null}
                  </td>
                  <td>{ORDER_LABELS[inv.orderType || "TAKEAWAY"] || inv.orderType}</td>
                  <td className="max-w-[220px] truncate">
                    {inv.customerName || inv.customerPhone ? (
                      [inv.customerName, inv.customerPhone].filter(Boolean).join(" · ")
                    ) : (
                      <span className="text-muted">Walk-in</span>
                    )}
                  </td>
                  <td>{prettyDate(inv.createdAt)}</td>
                  <td>{PAYMENT_LABELS[inv.paymentMethod] || inv.paymentMethod}</td>
                  <td>{pkr(inv.total)}</td>
                  <td className="px-4">
                    <Link href={`/shop/invoices/${inv.id}`} className="text-ember">
                      Open
                    </Link>
                    <Link href={`/shop/invoices/${inv.id}?print=1`} className="ml-3 text-ember">
                      Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
