"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Stat } from "@/components/ui";
import { PAYMENT_LABELS, pkr, prettyDate, startOfDay } from "@/lib/format";
import { useShop } from "@/lib/store";

export default function CashPage() {
  const shop = useShop();
  const [floatAmt, setFloatAmt] = useState("5000");
  const [closeAmt, setCloseAmt] = useState("");
  const [moveAmt, setMoveAmt] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [moveType, setMoveType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");

  const todayMoves = shop.cashMoves.filter((m) => m.createdAt >= startOfDay());
  const sales = todayMoves.filter((m) => m.type === "SALE").reduce((s, m) => s + m.amount, 0);
  const cashSales = todayMoves.filter((m) => m.type === "SALE" && m.method === "CASH").reduce((s, m) => s + m.amount, 0);
  const ins = todayMoves.filter((m) => m.type === "CASH_IN").reduce((s, m) => s + m.amount, 0);
  const outs = todayMoves.filter((m) => m.type === "CASH_OUT").reduce((s, m) => s + m.amount, 0);
  const expected = (shop.cashSession?.openingFloat || 0) + cashSales + ins + outs;

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl">Daily cash flow</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today sales" value={pkr(sales)} tone="ember" />
        <Stat label="Cash sales" value={pkr(cashSales)} tone="moss" />
        <Stat label="Expected drawer" value={pkr(expected)} hint="Float + cash sales + in − out" tone="ink" />
        <Stat
          label="Register"
          value={shop.cashSession && !shop.cashSession.closedAt ? "Open" : "Closed"}
          hint={shop.cashSession ? `Float ${pkr(shop.cashSession.openingFloat)}` : "Open a day first"}
          tone="gold"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Register</h2>
          {!shop.cashSession || shop.cashSession.closedAt ? (
            <div className="mt-4 grid gap-3">
              <Field label="Opening float">
                <Input value={floatAmt} onChange={(e) => setFloatAmt(e.target.value)} />
              </Field>
              <Button onClick={() => shop.openRegister(Number(floatAmt || 0))}>Open the day</Button>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <Field label="Counted cash at close">
                <Input value={closeAmt} onChange={(e) => setCloseAmt(e.target.value)} />
              </Field>
              <p className="text-sm text-muted">
                Difference vs expected: {pkr(Number(closeAmt || 0) - expected)}
              </p>
              <Button tone="ink" onClick={() => shop.closeRegister(Number(closeAmt || 0))}>
                Close the day
              </Button>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Cash in / out</h2>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Button tone={moveType === "CASH_IN" ? "moss" : "ghost"} onClick={() => setMoveType("CASH_IN")}>
                Cash in
              </Button>
              <Button tone={moveType === "CASH_OUT" ? "danger" : "ghost"} onClick={() => setMoveType("CASH_OUT")}>
                Cash out
              </Button>
            </div>
            <Field label="Amount">
              <Input value={moveAmt} onChange={(e) => setMoveAmt(e.target.value)} />
            </Field>
            <Field label="Note">
              <Input value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Owner took, supplier, etc." />
            </Field>
            <Button
              onClick={async () => {
                await shop.moveCash(moveType, Number(moveAmt || 0), moveNote);
                setMoveAmt("");
                setMoveNote("");
              }}
            >
              Record
            </Button>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <table className="w-full text-left text-sm">
          <thead className="bg-parchment/80 text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th>Type</th>
              <th>Method</th>
              <th>Note</th>
              <th className="text-right px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {todayMoves.map((m) => (
              <tr key={m.id} className="border-t border-black/5">
                <td className="px-4 py-2">{prettyDate(m.createdAt)}</td>
                <td>{m.type}</td>
                <td>{PAYMENT_LABELS[m.method] || m.method}</td>
                <td>{m.note}</td>
                <td className="px-4 text-right">{pkr(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
