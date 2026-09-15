"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Modal } from "@/components/ui";
import { useShop } from "@/lib/store";

export default function CustomersPage() {
  const shop = useShop();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Customers</h1>
          <p className="text-muted">Useful for regulars, clinics, and office accounts.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shop.customers.map((c) => (
          <Card key={c.id}>
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-muted">{c.phone || "No phone"}</p>
            <p className="text-sm text-muted">{c.address}</p>
          </Card>
        ))}
      </div>
      <Modal open={open} title="New customer" onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Button
            onClick={async () => {
              await shop.saveCustomer(form);
              setOpen(false);
              setForm({ name: "", phone: "", address: "" });
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
