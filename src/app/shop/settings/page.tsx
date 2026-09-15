"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ImageCropper } from "@/components/ImageCropper";
import { PrinterConnect } from "@/components/PrinterConnect";
import { Button, Card, Empty, Field, Input, PasswordInput, Select, Textarea } from "@/components/ui";
import { buildQrPayload } from "@/lib/fbr";
import { readImageFile } from "@/lib/image";
import { useShop } from "@/lib/store";

function LogoField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [cropping, setCropping] = useState(false);

  return (
    <Field label={label} hint={hint}>
      <Input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setRaw(await readImageFile(file));
          setCropping(true);
        }}
      />
      {cropping && (raw || value) ? (
        <ImageCropper
          src={raw || value}
          aspect={1}
          onApply={(next) => {
            onChange(next);
            setCropping(false);
          }}
          onCancel={() => setCropping(false)}
        />
      ) : value ? (
        <div className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              tone="ghost"
              onClick={() => {
                setRaw(value);
                setCropping(true);
              }}
            >
              Adjust
            </Button>
            <Button type="button" tone="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          </div>
        </div>
      ) : null}
    </Field>
  );
}

export default function SettingsPage() {
  const shop = useShop();
  const [form, setForm] = useState(() => ({
    companyName: shop.tenant.companyName,
    tradeName: shop.tenant.tradeName || "",
    address: shop.tenant.address || "",
    city: shop.tenant.city || "",
    phone: shop.tenant.phone || "",
    email: shop.tenant.email || "",
    ntn: shop.tenant.ntn || "",
    strn: shop.tenant.strn || "",
    fbrPosId: shop.tenant.fbrPosId || "",
    fbrLicenseDate: shop.tenant.fbrLicenseDate || "",
    fbrRegisterId: shop.tenant.fbrRegisterId || "",
    customQr: shop.tenant.customQr || "",
    invoicePrefix: shop.tenant.invoicePrefix,
    defaultTaxPercent: String(shop.tenant.defaultTaxPercent),
    takeawayServiceTaxPercent: String(shop.tenant.takeawayServiceTaxPercent || 0),
    defaultDeliveryCharge: String(shop.tenant.defaultDeliveryCharge || 0),
    businessType: shop.tenant.businessType,
    logoData: shop.tenant.logoData || "",
    invoiceLogoData: shop.tenant.invoiceLogoData || "",
  }));
  const [staff, setStaff] = useState({ name: "", email: "", password: "" });
  const [saved, setSaved] = useState(false);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSaved, setStaffSaved] = useState(false);
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    if (!shop.tenant.id) return;
    setForm({
      companyName: shop.tenant.companyName,
      tradeName: shop.tenant.tradeName || "",
      address: shop.tenant.address || "",
      city: shop.tenant.city || "",
      phone: shop.tenant.phone || "",
      email: shop.tenant.email || "",
      ntn: shop.tenant.ntn || "",
      strn: shop.tenant.strn || "",
      fbrPosId: shop.tenant.fbrPosId || "",
      fbrLicenseDate: shop.tenant.fbrLicenseDate || "",
      fbrRegisterId: shop.tenant.fbrRegisterId || "",
      customQr: shop.tenant.customQr || "",
      invoicePrefix: shop.tenant.invoicePrefix,
      defaultTaxPercent: String(shop.tenant.defaultTaxPercent),
      takeawayServiceTaxPercent: String(shop.tenant.takeawayServiceTaxPercent || 0),
      defaultDeliveryCharge: String(shop.tenant.defaultDeliveryCharge || 0),
      businessType: shop.tenant.businessType,
      logoData: shop.tenant.logoData || "",
      invoiceLogoData: shop.tenant.invoiceLogoData || "",
    });
  }, [shop.ready, shop.tenant.id]);

  if (shop.ready && shop.user.role === "CASHIER") {
    return <Empty title="Owner only" text="Company, FBR and QR settings stay with the owner." />;
  }

  const preview = buildQrPayload({
    companyName: form.companyName,
    ntn: form.ntn,
    strn: form.strn,
    fbrPosId: form.fbrPosId,
    customQr: form.customQr || null,
    invoiceNo: `${form.invoicePrefix}-00001`,
    dateIso: new Date().toISOString(),
    total: 1250,
    tax: 160,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <h1 className="font-display text-4xl">Shop identity</h1>
        <p className="mt-1 text-muted">The name you type here is what prints — and what the QR is born from.</p>
        <div className="mt-5 grid gap-3">
          <Field label="Company name">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <Field label="Trade name">
            <Input value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Shop type">
              <Select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
                <option value="RESTAURANT">Restaurant</option>
                <option value="MEDICAL">Medical store</option>
                <option value="RETAIL">Retail</option>
                <option value="GENERAL">General</option>
              </Select>
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="FBR NTN">
              <Input value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
            </Field>
            <Field label="STRN">
              <Input value={form.strn} onChange={(e) => setForm({ ...form, strn: e.target.value })} />
            </Field>
            <Field label="FBR POS ID">
              <Input value={form.fbrPosId} onChange={(e) => setForm({ ...form, fbrPosId: e.target.value })} />
            </Field>
            <Field label="FBR license date" hint="Prints only when you tick the box on an invoice">
              <Input
                type="date"
                value={form.fbrLicenseDate}
                onChange={(e) => setForm({ ...form, fbrLicenseDate: e.target.value })}
              />
            </Field>
            <Field label="FBR register ID" hint="Same as license date — optional on print">
              <Input
                value={form.fbrRegisterId}
                onChange={(e) => setForm({ ...form, fbrRegisterId: e.target.value })}
                placeholder="REG-..."
              />
            </Field>
            <Field label="Invoice prefix">
              <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
            </Field>
            <Field label="Default tax %">
              <Input value={form.defaultTaxPercent} onChange={(e) => setForm({ ...form, defaultTaxPercent: e.target.value })} />
            </Field>
            <Field label="Takeaway service tax %" hint="Added only on takeaway invoices. POS can also save this with One-click for all.">
              <Input
                value={form.takeawayServiceTaxPercent}
                onChange={(e) => setForm({ ...form, takeawayServiceTaxPercent: e.target.value })}
                inputMode="decimal"
              />
            </Field>
            <Field label="Default delivery charges (Rs)" hint="Added only on delivery invoices. Change any time.">
              <Input
                value={form.defaultDeliveryCharge}
                onChange={(e) => setForm({ ...form, defaultDeliveryCharge: e.target.value })}
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field
            label="Your own QR text (optional)"
            hint="Leave empty to auto-build from company name + NTN. Tokens: {company} {ntn} {strn} {pos} {invoice} {date} {total} {tax}"
          >
            <Textarea value={form.customQr} onChange={(e) => setForm({ ...form, customQr: e.target.value })} />
          </Field>
          <LogoField
            label="Shop logo"
            hint="Shows in the app. You can replace it any time."
            value={form.logoData}
            onChange={(logoData) => setForm((f) => ({ ...f, logoData }))}
          />
          <LogoField
            label="Invoice logo"
            hint="Prints on the bill. Leave empty to use the shop logo."
            value={form.invoiceLogoData}
            onChange={(invoiceLogoData) => setForm((f) => ({ ...f, invoiceLogoData }))}
          />
          <Button
            onClick={async () => {
              await shop.saveSettings({
                ...form,
                defaultTaxPercent: Number(form.defaultTaxPercent || 0),
                takeawayServiceTaxPercent: Number(form.takeawayServiceTaxPercent || 0),
                defaultDeliveryCharge: Number(form.defaultDeliveryCharge || 0),
                logoData: form.logoData || null,
                invoiceLogoData: form.invoiceLogoData || null,
              });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? "Saved" : "Save shop"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        <PrinterConnect />
        <Card className="grid justify-items-center">
          <p className="text-sm uppercase tracking-[0.16em] text-muted">Live QR preview</p>
          <h2 className="font-display text-2xl">{form.companyName || "Company"}</h2>
          <div className="mt-4 rounded-3xl bg-white p-4">
            <QRCodeSVG value={preview || "Fanoos"} size={200} />
          </div>
          <pre className="mt-4 w-full overflow-auto rounded-2xl bg-parchment p-3 text-xs text-muted">{preview}</pre>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Staff</h2>
          <p className="text-sm text-muted">
            Add a cashier with a new email. They can sell, but cannot open shop settings.
          </p>
          <div className="mt-3 grid gap-2">
            {shop.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-parchment px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p>
                    {s.name} · {s.role === "OWNER" ? "Owner" : "Cashier"}
                  </p>
                  <p className="truncate text-muted">{s.email}</p>
                </div>
                {s.role === "CASHIER" ? (
                  <Button
                    type="button"
                    tone="danger"
                    className="shrink-0 px-3"
                    disabled={removingId === s.id}
                    aria-label={`Delete cashier ${s.name}`}
                    onClick={async () => {
                      if (!confirm(`Delete cashier ${s.name}? They will not be able to sign in.`)) return;
                      setRemovingId(s.id);
                      setStaffError("");
                      try {
                        await shop.removeStaff(s.id);
                      } catch (err) {
                        setStaffError(err instanceof Error ? err.message : "Could not delete cashier");
                      } finally {
                        setRemovingId("");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {removingId === s.id ? "…" : "Delete"}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <Input
              placeholder="Cashier name"
              value={staff.name}
              onChange={(e) => setStaff({ ...staff, name: e.target.value })}
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="Cashier email (not the owner email)"
              value={staff.email}
              onChange={(e) => setStaff({ ...staff, email: e.target.value })}
              autoComplete="off"
            />
            <PasswordInput
              placeholder="Password (6+ characters)"
              value={staff.password}
              onChange={(e) => setStaff({ ...staff, password: e.target.value })}
              autoComplete="new-password"
            />
            {staffError ? <p className="text-sm text-rose">{staffError}</p> : null}
            <Button
              tone="ink"
              disabled={staffBusy || !staff.name.trim() || !staff.email.trim() || !staff.password}
              onClick={async () => {
                setStaffBusy(true);
                setStaffError("");
                try {
                  await shop.addStaff(staff);
                  setStaff({ name: "", email: "", password: "" });
                  setStaffSaved(true);
                  window.setTimeout(() => setStaffSaved(false), 1800);
                } catch (err) {
                  setStaffError(err instanceof Error ? err.message : "Could not add cashier");
                } finally {
                  setStaffBusy(false);
                }
              }}
            >
              {staffBusy ? "Adding…" : staffSaved ? "Cashier added" : "Add cashier"}
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted">Cashiers is phone pe save hote hain. Internet ki zaroorat nahi.</p>
        </Card>
      </div>
    </div>
  );
}
