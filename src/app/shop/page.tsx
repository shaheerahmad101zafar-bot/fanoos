"use client";

import Link from "next/link";
import { MixBars, MonthArea } from "@/components/SalesCharts";
import { Card, Stat } from "@/components/ui";
import { PAYMENT_LABELS, compactPkr, pkr, prettyDay, startOfDay, startOfMonth } from "@/lib/format";
import { useShop } from "@/lib/store";

export default function ShopHome() {
  const shop = useShop();
  const paid = shop.invoices.filter((i) => i.status === "PAID");
  const today = paid.filter((i) => i.createdAt >= startOfDay());
  const month = paid.filter((i) => i.createdAt >= startOfMonth());
  const todayTotal = today.reduce((s, i) => s + i.total, 0);
  const monthTotal = month.reduce((s, i) => s + i.total, 0);
  const cashToday = today.reduce((s, i) => s + i.cashAmount, 0);
  const cardToday = today.reduce((s, i) => s + i.cardAmount, 0);
  const walletToday = today.reduce((s, i) => s + i.walletAmount, 0);
  const low = shop.products.filter((p) => p.active && p.stock <= p.lowStock);
  const expiring = shop.products.filter(
    (p) => p.expiryDate && p.expiryDate < Date.now() + 1000 * 60 * 60 * 24 * 30,
  );

  const byMonth = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, 0);
  }
  for (const inv of paid) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) || 0) + inv.total);
  }
  const monthData = [...byMonth.entries()].map(([key, total]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      label: new Date(y, m, 1).toLocaleDateString("en-PK", { month: "short" }),
      total,
    };
  });

  const byDay = new Map<string, { cash: number; card: number; wallet: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), { cash: 0, card: 0, wallet: 0 });
  }
  for (const inv of paid) {
    const key = new Date(inv.createdAt).toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue;
    row.cash += inv.cashAmount;
    row.card += inv.cardAmount;
    row.wallet += inv.walletAmount;
  }
  const dayData = [...byDay.entries()].map(([key, v]) => ({
    label: prettyDay(new Date(key).getTime()),
    ...v,
  }));

  const methods = Object.entries(
    today.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.paymentMethod] = (acc[inv.paymentMethod] || 0) + inv.total;
      return acc;
    }, {}),
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">{shop.tenant.businessType.toLowerCase()}</p>
          <h1 className="font-display text-4xl">{shop.tenant.companyName || "Your lantern"}</h1>
        </div>
        <Link href="/shop/pos" className="rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white">
          New sale
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today" value={pkr(todayTotal)} hint={`${today.length} invoices`} tone="ember" />
        <Stat label="This month" value={compactPkr(monthTotal)} hint="Paid sales" tone="ink" />
        <Stat label="Cash today" value={pkr(cashToday)} hint={`Card ${pkr(cardToday)}`} tone="moss" />
        <Stat label="Wallets today" value={pkr(walletToday)} hint="JazzCash / EasyPaisa" tone="gold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="text-sm uppercase tracking-[0.16em] text-muted">Monthly sales</p>
          <h2 className="mt-1 font-display text-2xl">The year in flame</h2>
          <div className="mt-4">
            <MonthArea data={monthData} />
          </div>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.16em] text-muted">Cash vs card vs wallet</p>
          <h2 className="mt-1 font-display text-2xl">Last 14 days</h2>
          <div className="mt-4">
            <MixBars data={dayData} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="font-display text-xl">How they paid today</h3>
          <div className="mt-4 grid gap-2">
            {methods.length ? (
              methods.map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-2xl bg-parchment px-3 py-2 text-sm">
                  <span>{PAYMENT_LABELS[k] || k}</span>
                  <b>{pkr(v)}</b>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No sales yet today.</p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Low stock</h3>
          <div className="mt-4 grid gap-2">
            {low.slice(0, 6).map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <b>
                  {p.stock} {p.unit}
                </b>
              </div>
            ))}
            {!low.length ? <p className="text-sm text-muted">Shelves look healthy.</p> : null}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">
            {shop.tenant.businessType === "MEDICAL" ? "Near expiry" : "Need attention"}
          </h3>
          <div className="mt-4 grid gap-2">
            {shop.tenant.businessType === "MEDICAL" ? (
              expiring.length ? (
                expiring.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <b>{p.batchNo}</b>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No near-expiry items.</p>
              )
            ) : (
              <p className="text-sm text-muted">
                Register {shop.cashSession ? "is open" : "is closed"}. Bills is phone pe rehte hain.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
