"use client";

import { useState } from "react";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select } from "@/components/ui";
import { useShop, type Discount } from "@/lib/store";

export default function DiscountsPage() {
  const shop = useShop();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Discount | null>(null);
  const [form, setForm] = useState({ name: "", type: "PERCENT", value: "", minAmount: "" });

  if (shop.ready && shop.user.role === "CASHIER") {
    return <Empty title="Owner only" text="Discounts are locked for cashiers." />;
  }

  function start(d?: Discount) {
    setEdit(d || null);
    setForm(
      d
        ? { name: d.name, type: d.type, value: String(d.value), minAmount: String(d.minAmount) }
        : { name: "", type: "PERCENT", value: "", minAmount: "0" },
    );
    setOpen(true);
  }

  async function save() {
    try {
      await shop.saveDiscount({
        id: edit?.id,
        name: form.name,
        type: form.type,
        value: Number(form.value || 0),
        minAmount: Number(form.minAmount || 0),
      });
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save discount");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Discounts</h1>
          <p className="text-muted">Percent or rupees. Edit or delete whenever a offer ends.</p>
        </div>
        <Button onClick={() => start()}>Add discount</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shop.discounts.map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl">{d.name}</p>
                <p className="text-muted">
                  {d.type === "PERCENT" ? `${d.value}%` : `Rs ${d.value}`} off
                  {d.minAmount ? ` after Rs ${d.minAmount}` : ""}
                </p>
              </div>
              <Badge tone={d.active ? "moss" : "ink"}>{d.active ? "Live" : "Off"}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button tone="ghost" onClick={() => start(d)}>
                Edit
              </Button>
              <Button tone="danger" onClick={() => shop.removeDiscount(d.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} title={edit ? "Edit discount" : "New discount"} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed rupees</option>
            </Select>
          </Field>
          <Field label="Value">
            <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
          <Field label="Minimum bill">
            <Input value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
          </Field>
          <Button onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
