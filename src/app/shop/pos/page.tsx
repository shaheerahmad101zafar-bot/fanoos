"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { InvoicePrintPanel } from "@/components/InvoiceSlip";
import { Button, Card, Field, Input, Modal, Select } from "@/components/ui";
import { childCategories, inCategoryBranch, parentCategories } from "@/lib/catalog";
import { ORDER_LABELS, PAYMENT_LABELS, pkr } from "@/lib/format";
import { applyDiscount, billTotals, unitTotals } from "@/lib/price";
import type { InvoiceItem } from "@/lib/types";
import { useShop, type Discount, type Invoice } from "@/lib/store";

type Line = InvoiceItem;

export default function PosPage() {
  const shop = useShop();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [discountId, setDiscountId] = useState("");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("CASH");
  const [received, setReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"TAKEAWAY" | "DELIVERY">("TAKEAWAY");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [serviceTaxPercent, setServiceTaxPercent] = useState("");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [done, setDone] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (!shop.ready) return;
    setServiceTaxPercent(String(shop.tenant.takeawayServiceTaxPercent ?? ""));
    setDeliveryCharge(String(shop.tenant.defaultDeliveryCharge ?? ""));
  }, [shop.ready, shop.tenant.id]);

  const products = shop.products.filter((p) => {
    if (!p.active) return false;
    if (cat !== "all" && !inCategoryBranch(shop.categories, p.categoryId, cat)) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [p.name, p.sku, p.barcode].some((x) => x?.toLowerCase().includes(s));
  });

  const discount = shop.discounts.find((d) => d.id === discountId && d.active) as Discount | undefined;
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const discountAmt =
    discount && subtotal >= discount.minAmount
      ? discount.type === "PERCENT"
        ? (subtotal * discount.value) / 100
        : discount.value
      : 0;
  const taxAmt = cart.reduce((s, l) => s + (l.price * l.qty * l.taxPercent) / 100, 0);
  const bill = billTotals({
    subtotal,
    discountAmt,
    taxAmt,
    orderType,
    serviceTaxPercent: Number(serviceTaxPercent || shop.tenant.takeawayServiceTaxPercent || 0),
    deliveryCharge: Number(deliveryCharge || shop.tenant.defaultDeliveryCharge || 0),
  });
  const total = bill.total;
  const recv = Number(received || total);
  const change = Math.max(0, recv - total);
  const itemsCount = cart.reduce((s, l) => s + l.qty, 0);

  function sellPrice(productId: string) {
    const p = shop.products.find((x) => x.id === productId);
    if (!p) return 0;
    const offer = shop.discounts.find((d) => d.id === p.discountId && d.active);
    return applyDiscount(p.price, offer).after;
  }

  function add(productId: string) {
    const p = shop.products.find((x) => x.id === productId);
    if (!p) return;
    const price = sellPrice(p.id);
    setCart((cur) => {
      const hit = cur.find((l) => l.productId === p.id);
      if (hit) return cur.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...cur,
        { productId: p.id, name: p.name, qty: 1, price, taxPercent: p.taxPercent, unit: p.unit },
      ];
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((cur) => cur.map((l) => (l.productId === productId ? { ...l, qty } : l)).filter((l) => l.qty > 0));
  }

  function openPay() {
    setPayError("");
    setTicketOpen(false);
    setPayOpen(true);
  }

  async function pay() {
    setBusy(true);
    setPayError("");
    try {
      const invoice = await shop.checkout({
        items: cart,
        discount: discount || null,
        paymentMethod: method,
        cashAmount: method === "CASH" || method === "MIXED" ? (method === "CASH" ? total : total / 2) : 0,
        cardAmount: method === "CARD" || method === "MIXED" ? (method === "CARD" ? total : total / 2) : 0,
        walletAmount: method === "JAZZCASH" || method === "EASYPAISA" ? total : 0,
        received: recv,
        changeDue: change,
        customerName,
        customerPhone,
        orderType,
        deliveryCharge: bill.deliveryCharge,
        serviceTaxPercent: bill.serviceTaxPercent,
      });
      setDone(invoice);
      setCart([]);
      setPayOpen(false);
      setReceived("");
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not save bill");
    } finally {
      setBusy(false);
    }
  }

  async function saveForAll() {
    setSavingDefaults(true);
    try {
      await shop.saveSettings({
        takeawayServiceTaxPercent: Number(serviceTaxPercent || 0),
        defaultDeliveryCharge: Number(deliveryCharge || 0),
      });
      setDefaultsSaved(true);
      window.setTimeout(() => setDefaultsSaved(false), 2000);
    } finally {
      setSavingDefaults(false);
    }
  }
  const posParentId = shop.categories.find((c) => c.id === cat)?.parentId || (cat === "all" ? "" : cat);
  const posSubs = posParentId ? childCategories(shop.categories, posParentId) : [];

  const ticketBody = (
    <>
      <div className="grid grid-cols-2 gap-2">
        {(["TAKEAWAY", "DELIVERY"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
              orderType === type ? "bg-ember text-white" : "bg-white"
            }`}
          >
            {ORDER_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {cart.map((l) => (
          <div key={l.productId} className="flex items-center gap-2 rounded-2xl bg-parchment/80 p-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{l.name}</p>
              <p className="text-xs text-muted">{pkr(l.price)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="rounded-full bg-white p-1.5"
                onClick={() => setQty(l.productId, l.qty - 1)}
                aria-label={l.qty === 1 ? "Remove from cart" : "Remove one"}
              >
                {l.qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-rose" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <span className="w-6 text-center text-sm">{l.qty}</span>
              <button className="rounded-full bg-white p-1.5" onClick={() => setQty(l.productId, l.qty + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={() => setQty(l.productId, 0)} aria-label="Remove from cart">
              <Trash2 className="h-4 w-4 text-rose" />
            </button>
          </div>
        ))}
        {!cart.length ? <p className="text-sm text-muted">Tap a product to start a bill.</p> : null}
      </div>

      <Select className="mt-4" value={discountId} onChange={(e) => setDiscountId(e.target.value)}>
        <option value="">No discount</option>
        {shop.discounts
          .filter((d) => d.active)
          .map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
      </Select>

      <div className="mt-4 grid gap-2 rounded-2xl bg-white p-3">
        <Field label="Takeaway service tax %" hint="Only added on takeaway bills.">
          <Input
            value={serviceTaxPercent}
            onChange={(e) => setServiceTaxPercent(e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>
        <Field label="Delivery charges (Rs)" hint="Only added on delivery bills.">
          <Input
            value={deliveryCharge}
            onChange={(e) => setDeliveryCharge(e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>
        <Button type="button" tone="ink" disabled={savingDefaults} onClick={() => void saveForAll()}>
          {savingDefaults ? "Saving…" : defaultsSaved ? "Saved for all bills" : "One-click for all"}
        </Button>
        <p className="text-xs text-muted">Write the charges once, tap this, and every next bill uses them.</p>
      </div>

      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{pkr(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Discount</dt>
          <dd>- {pkr(discountAmt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Tax</dt>
          <dd>{pkr(taxAmt)}</dd>
        </div>
        {orderType === "TAKEAWAY" ? (
          <div className="flex justify-between">
            <dt>Service tax</dt>
            <dd>{pkr(bill.serviceTaxAmt)}</dd>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{pkr(bill.deliveryCharge)}</dd>
          </div>
        )}
        <div className="mt-2 flex justify-between font-display text-2xl">
          <dt>Total</dt>
          <dd>{pkr(total)}</dd>
        </div>
      </dl>

      <Button className="mt-4 w-full" disabled={!cart.length} onClick={openPay}>
        Charge {cart.length ? pkr(total) : ""}
      </Button>
    </>
  );

  return (
    <div className="pos-screen grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <div className="sticky top-[4.25rem] z-10 -mx-1 space-y-3 bg-[#efe4d4]/95 px-1 pb-3 backdrop-blur-xl lg:static lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-0">
          <Input
            placeholder="Search name, SKU or barcode"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            className="lg:max-w-none"
          />
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              onClick={() => setCat("all")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                cat === "all" ? "bg-ink text-cream" : "bg-white text-ink"
              }`}
            >
              All
            </button>
            {parentCategories(shop.categories).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  cat === c.id || shop.categories.some((x) => x.id === cat && x.parentId === c.id)
                    ? "bg-ink text-cream"
                    : "bg-white text-ink"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {posSubs.length ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                onClick={() => setCat(posParentId)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  cat === posParentId ? "bg-ember text-white" : "bg-white text-ink"
                }`}
              >
                All
              </button>
              {posSubs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                    cat === c.id ? "bg-ember text-white" : "bg-white text-ink"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((p) => {
            const qty = cart.find((l) => l.productId === p.id)?.qty || 0;
            return (
              <div
                key={p.id}
                className={`relative overflow-hidden rounded-[22px] border bg-white text-left shadow-[0_10px_24px_rgba(18,14,10,0.07)] transition ${
                  qty ? "border-ember/40" : "border-black/5"
                }`}
              >
                <button onClick={() => add(p.id)} className="block w-full text-left active:scale-[0.99]">
                  <div className="relative aspect-[4/3] bg-parchment">
                    {p.imageData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageData} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center font-display text-3xl text-muted">{p.name[0]}</div>
                    )}
                    {qty === 0 ? (
                      <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ember shadow">
                        <Plus className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <p className="line-clamp-1 text-sm font-semibold sm:text-base">{p.name}</p>
                    <p className="mt-1 text-sm text-ember sm:text-base">
                      {pkr(unitTotals(p.price, 0, shop.discounts.find((d) => d.id === p.discountId && d.active)).afterDiscount)}
                    </p>
                  </div>
                </button>
                {qty > 0 ? (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-ember p-1 text-white shadow-[0_8px_18px_rgba(226,74,22,0.35)]">
                    <button
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQty(p.id, qty - 1);
                      }}
                      aria-label={qty === 1 ? "Remove from cart" : "Remove one"}
                    >
                      {qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="min-w-5 text-center text-sm font-bold">{qty}</span>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        add(p.id);
                      }}
                      aria-label="Add one"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {qty > 1 ? (
                      <button
                        className="grid h-7 w-7 place-items-center rounded-full bg-black/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQty(p.id, 0);
                        }}
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Card className="hidden h-fit xl:sticky xl:top-20 xl:block">
        <h2 className="font-display text-2xl">Ticket</h2>
        <div className="mt-4">{ticketBody}</div>
      </Card>

      {cart.length ? (
        <div className="no-print fixed inset-x-3 z-20 xl:hidden" style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-2 rounded-[28px] bg-ink p-2 text-cream shadow-[0_18px_40px_rgba(18,14,10,0.35)]">
            <button onClick={() => setTicketOpen(true)} className="min-w-0 flex-1 px-3 py-1 text-left">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-cream/55">
                <ShoppingBag className="h-3.5 w-3.5" />
                {itemsCount} {itemsCount === 1 ? "item" : "items"}
              </p>
              <p className="font-display text-2xl leading-none">{pkr(total)}</p>
            </button>
            <Button className="shrink-0" onClick={openPay}>
              Charge
            </Button>
          </div>
        </div>
      ) : null}

      <Modal open={ticketOpen} title="Ticket" onClose={() => setTicketOpen(false)}>
        {ticketBody}
      </Modal>

      <Modal open={payOpen} title="Take payment" onClose={() => setPayOpen(false)}>
        <div className="grid gap-3">
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Customer — optional</p>
            <div className="mt-2 grid gap-2">
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
              />
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <p className="mt-2 text-xs text-muted">Leave blank for a walk-in. If they give a name or number, it prints on the bill.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAYMENT_LABELS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMethod(k)}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                  method === k ? "bg-ember text-white" : "bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            <span>Amount received</span>
            <Input value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(total)} inputMode="decimal" />
          </label>
          <p className="text-sm">
            Change: <b>{pkr(change)}</b>
          </p>
          {payError ? <p className="text-sm text-rose">{payError}</p> : null}
          <Button disabled={busy} onClick={pay}>
            {busy ? "Saving…" : `Collect ${pkr(total)}`}
          </Button>
        </div>
      </Modal>

      <Modal open={!!done} title="Bill saved" onClose={() => setDone(null)} wide>
        {done ? (
          <InvoicePrintPanel invoice={done} tenant={shop.tenant}>
            <Button className="no-print w-full" onClick={() => setDone(null)}>
              New sale
            </Button>
          </InvoicePrintPanel>
        ) : null}
      </Modal>
    </div>
  );
}
