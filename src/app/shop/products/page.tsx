"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { BarcodeMark } from "@/components/BarcodeMark";
import { ImageCropper } from "@/components/ImageCropper";
import { Button, Card, Empty, Field, Input, Modal, Select } from "@/components/ui";
import { categoryLabel, childCategories, parentCategories, splitCategory, UNITS } from "@/lib/catalog";
import { readImageFile } from "@/lib/image";
import { pkr } from "@/lib/format";
import { unitTotals } from "@/lib/price";
import { useShop, type Category, type Product } from "@/lib/store";

const empty = {
  name: "",
  price: "",
  costPrice: "",
  stock: "",
  sku: "",
  barcode: "",
  unit: "pcs",
  taxPercent: "",
  categoryId: "",
  subcategoryId: "",
  discountId: "",
  batchNo: "",
  expiryDate: "",
  imageData: "",
};

export default function ProductsPage() {
  const shop = useShop();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [rawImage, setRawImage] = useState("");
  const [cropping, setCropping] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", parentId: "" });
  const [quickCat, setQuickCat] = useState("");
  const [quickSub, setQuickSub] = useState("");
  const [quickDiscount, setQuickDiscount] = useState({ name: "", type: "PERCENT", value: "" });
  const [showQuickDiscount, setShowQuickDiscount] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [catBusy, setCatBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [catError, setCatError] = useState("");

  const parents = parentCategories(shop.categories);
  const children = childCategories(shop.categories, form.categoryId);
  const selectedDiscount = shop.discounts.find((d) => d.id === form.discountId && d.active);
  const totals = unitTotals(Number(form.price || 0), Number(form.taxPercent || shop.tenant.defaultTaxPercent || 0), selectedDiscount);
  const units = form.unit && !UNITS.includes(form.unit) ? [form.unit, ...UNITS] : UNITS;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return shop.products.filter((p) => {
      if (filter !== "all") {
        const ids = [filter, ...shop.categories.filter((c) => c.parentId === filter).map((c) => c.id)];
        if (!p.categoryId || !ids.includes(p.categoryId)) return false;
      }
      if (!s) return true;
      return [p.name, p.sku, p.barcode, categoryLabel(shop.categories, p.categoryId)].some((x) =>
        x?.toLowerCase().includes(s),
      );
    });
  }, [filter, q, shop.categories, shop.products]);

  if (shop.ready && shop.user.role === "CASHIER") {
    return <Empty title="Owner only" text="Ask the shop owner to change the catalogue." />;
  }

  function start(p?: Product, parentId = "", childId = "") {
    setEdit(p || null);
    setRawImage("");
    setCropping(false);
    setQuickCat("");
    setQuickSub("");
    setShowQuickDiscount(false);
    setQuickDiscount({ name: "", type: "PERCENT", value: "" });
    if (p) {
      const loc = splitCategory(shop.categories, p.categoryId);
      setForm({
        name: p.name,
        price: String(p.price),
        costPrice: String(p.costPrice),
        stock: String(p.stock),
        sku: p.sku || "",
        barcode: p.barcode || "",
        unit: p.unit,
        taxPercent: String(p.taxPercent),
        categoryId: loc.parentId,
        subcategoryId: loc.childId,
        discountId: p.discountId || "",
        batchNo: p.batchNo || "",
        expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "",
        imageData: p.imageData || "",
      });
    } else {
      setForm({ ...empty, categoryId: parentId, subcategoryId: childId, taxPercent: String(shop.tenant.defaultTaxPercent || "") });
    }
    setViewing(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError("");
    try {
      const row = await shop.saveProduct({
        id: edit?.id,
        name: form.name,
        price: Number(form.price || 0),
        costPrice: Number(form.costPrice || 0),
        stock: Number(form.stock || 0),
        sku: form.sku,
        barcode: form.barcode,
        unit: form.unit,
        taxPercent: Number(form.taxPercent || shop.tenant.defaultTaxPercent),
        categoryId: form.subcategoryId || form.categoryId || null,
        discountId: form.discountId || null,
        batchNo: form.batchNo || null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).getTime() : null,
        imageData: form.imageData || null,
      });
      setOpen(false);
      setCropping(false);
      setViewing(row);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  }

  async function makeCategory(name: string, parentId: string | null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    return shop.saveCategory({ name: trimmed, parentId });
  }

  async function saveCategoryModal() {
    setCatBusy(true);
    setCatError("");
    try {
      const row = await makeCategory(catForm.name, catForm.parentId || null);
      if (!row) return;
      setCatOpen(false);
      setCatForm({ name: "", parentId: "" });
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setCatBusy(false);
    }
  }

  async function addQuickCategory() {
    setFormError("");
    try {
      const row = await makeCategory(quickCat, null);
      if (!row) return;
      setForm((f) => ({ ...f, categoryId: row.id, subcategoryId: "" }));
      setQuickCat("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add category");
    }
  }

  async function addQuickSub() {
    if (!form.categoryId) {
      setFormError("Pick a category first, then add a subcategory.");
      return;
    }
    setFormError("");
    try {
      const row = await makeCategory(quickSub, form.categoryId);
      if (!row) return;
      setForm((f) => ({ ...f, subcategoryId: row.id }));
      setQuickSub("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add subcategory");
    }
  }

  async function addQuickDiscount() {
    if (!quickDiscount.name.trim() || !quickDiscount.value) return;
    setFormError("");
    try {
      const row = await shop.saveDiscount({
        name: quickDiscount.name.trim(),
        type: quickDiscount.type,
        value: Number(quickDiscount.value || 0),
      });
      setForm((f) => ({ ...f, discountId: row.id }));
      setQuickDiscount({ name: "", type: "PERCENT", value: "" });
      setShowQuickDiscount(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add discount");
    }
  }

  async function deleteCategoryRow(cat: Category) {
    const kids = childCategories(shop.categories, cat.id).length;
    const parentName = shop.categories.find((c) => c.id === cat.parentId)?.name;
    const msg = cat.parentId
      ? `Delete subcategory “${cat.name}”? Products stay in ${parentName || "the main category"}.`
      : `Delete category “${cat.name}”${kids ? ` and its ${kids} subcategor${kids === 1 ? "y" : "ies"}` : ""}? Products stay in the shop, without this category.`;
    if (!confirm(msg)) return;
    try {
      await shop.removeCategory(cat.id);
      if (filter === cat.id) setFilter("all");
      setForm((f) => ({
        ...f,
        categoryId: f.categoryId === cat.id ? "" : f.categoryId,
        subcategoryId: f.subcategoryId === cat.id || f.categoryId === cat.id ? "" : f.subcategoryId,
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete category");
    }
  }

  function productsFor(parent: Category, childId?: string) {
    const ids = childId ? [childId] : [parent.id, ...childCategories(shop.categories, parent.id).map((c) => c.id)];
    return filtered.filter((p) => p.categoryId && ids.includes(p.categoryId));
  }

  const uncategorized = filtered.filter((p) => !p.categoryId);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Products</h1>
          <p className="text-muted">Sample items are ready. Open any product to change photo, name or price any time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={() => { setCatError(""); setCatForm({ name: "", parentId: "" }); setCatOpen(true); }}>
            Add category
          </Button>
          <Button onClick={() => start()}>Add product</Button>
        </div>
      </div>

      <Input placeholder="Search name, SKU or barcode" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
            filter === "all" ? "bg-ink text-cream" : "bg-white text-ink"
          }`}
        >
          All
        </button>
        {parents.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              filter === c.id ? "bg-ink text-cream" : "bg-white text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!parents.length ? (
        <Empty title="Add a category first" text="Biryani, drinks, tablets — then drop products inside." />
      ) : null}

      {parents
        .filter((parent) => filter === "all" || filter === parent.id)
        .map((parent) => (
          <CategoryBlock
            key={parent.id}
            parent={parent}
            childrenCats={childCategories(shop.categories, parent.id)}
            products={productsFor(parent)}
            shopCategories={shop.categories}
            shopDiscounts={shop.discounts}
            onAddProduct={(childId) => start(undefined, parent.id, childId)}
            onAddSub={() => {
              setCatError("");
              setCatForm({ name: "", parentId: parent.id });
              setCatOpen(true);
            }}
            onDeleteCategory={(cat) => void deleteCategoryRow(cat)}
            onView={setViewing}
            onEdit={start}
            onDelete={(p) => {
              if (confirm(`Delete ${p.name}? This removes it from Sell too.`)) void shop.removeProduct(p.id);
            }}
          />
        ))}

      {uncategorized.length ? (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">No category yet</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {uncategorized.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categories={shop.categories}
                discounts={shop.discounts}
                onView={() => setViewing(p)}
                onEdit={() => start(p)}
                onDelete={() => {
                  if (confirm(`Delete ${p.name}? This removes it from Sell too.`)) void shop.removeProduct(p.id);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Modal open={catOpen} title={catForm.parentId ? "New subcategory" : "New category"} onClose={() => !catBusy && setCatOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Biryani" />
          </Field>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium text-ink/80">Under category</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCatForm({ ...catForm, parentId: "" })}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  !catForm.parentId ? "bg-ink text-cream" : "bg-white text-ink"
                }`}
              >
                Main category
              </button>
              {parents.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, parentId: c.id })}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${
                    catForm.parentId === c.id ? "bg-ember text-white" : "bg-white text-ink"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">Tap a category to make this a subcategory. This does not freeze the screen.</span>
          </div>
          {catError ? <p className="text-sm text-rose">{catError}</p> : null}
          <Button onClick={() => void saveCategoryModal()} disabled={catBusy || !catForm.name.trim()}>
            {catBusy ? "Saving…" : catForm.parentId ? "Save subcategory" : "Save category"}
          </Button>
        </div>
      </Modal>

      <Modal open={open} title={edit ? "Edit product" : "New product"} onClose={() => setOpen(false)} wide>
        <div className="grid gap-3">
          <Field label="Photo" hint="Fits the sell card automatically. You can drag and zoom before saving.">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const raw = await readImageFile(file);
                setRawImage(raw);
                setCropping(true);
              }}
            />
          </Field>
          {cropping && (rawImage || form.imageData) ? (
            <ImageCropper
              src={rawImage || form.imageData}
              onApply={(imageData) => {
                setForm((f) => ({ ...f, imageData }));
                setCropping(false);
              }}
              onCancel={() => setCropping(false)}
            />
          ) : form.imageData ? (
            <div className="grid gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageData} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setRawImage(rawImage || form.imageData);
                  setCropping(true);
                }}
              >
                Adjust photo
              </Button>
            </div>
          ) : null}

          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })}
              >
                <option value="">Choose category</option>
                {parents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategory">
              <Select
                value={form.subcategoryId}
                onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
                disabled={!form.categoryId}
              >
                <option value="">{form.categoryId ? "None — keep in main category" : "Pick a category first"}</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex gap-2">
              <Input placeholder="New category" value={quickCat} onChange={(e) => setQuickCat(e.target.value)} />
              <Button type="button" tone="ghost" className="shrink-0 px-3" onClick={addQuickCategory} disabled={!quickCat.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New subcategory"
                value={quickSub}
                onChange={(e) => setQuickSub(e.target.value)}
                disabled={!form.categoryId}
              />
              <Button type="button" tone="ghost" className="shrink-0 px-3" onClick={addQuickSub} disabled={!form.categoryId || !quickSub.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Cost">
              <Input value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Stock">
              <Input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Unit">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Tax %">
              <Input value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} inputMode="decimal" />
            </Field>
          </div>

          <Field label="Discount">
            <Select value={form.discountId} onChange={(e) => setForm({ ...form, discountId: e.target.value })}>
              <option value="">No discount</option>
              {shop.discounts
                .filter((d) => d.active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.type === "PERCENT" ? `${d.value}%` : pkr(d.value)}
                  </option>
                ))}
            </Select>
          </Field>
          <button type="button" className="text-left text-sm text-ember" onClick={() => setShowQuickDiscount((v) => !v)}>
            {showQuickDiscount ? "Hide new discount" : "+ New discount"}
          </button>
          {showQuickDiscount ? (
            <div className="grid gap-2 rounded-2xl bg-white/70 p-3 sm:grid-cols-[1fr_140px_100px_auto]">
              <Input placeholder="Name" value={quickDiscount.name} onChange={(e) => setQuickDiscount({ ...quickDiscount, name: e.target.value })} />
              <Select value={quickDiscount.type} onChange={(e) => setQuickDiscount({ ...quickDiscount, type: e.target.value })}>
                <option value="PERCENT">Percent</option>
                <option value="FIXED">Rupees</option>
              </Select>
              <Input placeholder="Value" value={quickDiscount.value} onChange={(e) => setQuickDiscount({ ...quickDiscount, value: e.target.value })} inputMode="decimal" />
              <Button type="button" tone="ghost" onClick={addQuickDiscount} disabled={!quickDiscount.name.trim() || !quickDiscount.value}>
                Add
              </Button>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white/70 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Auto price</p>
            <dl className="mt-2 grid gap-1">
              <div className="flex justify-between">
                <dt>Price</dt>
                <dd>{pkr(totals.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount{selectedDiscount ? ` (${selectedDiscount.name})` : ""}</dt>
                <dd>- {pkr(totals.discountAmt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>After discount</dt>
                <dd>{pkr(totals.afterDiscount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd>{pkr(totals.taxAmt)}</dd>
              </div>
              <div className="mt-1 flex justify-between font-display text-2xl">
                <dt>Customer pays</dt>
                <dd className="text-ember">{pkr(totals.final)}</dd>
              </div>
            </dl>
          </div>

          <Field label="Barcode" hint="Type the number. The barcode image draws itself.">
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </Field>
          <BarcodeMark value={form.barcode} />

          {shop.tenant.businessType === "MEDICAL" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Batch">
                <Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} />
              </Field>
              <Field label="Expiry">
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </Field>
            </div>
          ) : null}
          {formError ? <p className="text-sm text-rose">{formError}</p> : null}
          <Button onClick={() => void save()} disabled={!form.name.trim() || cropping || busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!viewing} title="Product" onClose={() => setViewing(null)} wide>
        {viewing ? (
          <ProductView
            product={viewing}
            categories={shop.categories}
            discounts={shop.discounts}
            onEdit={() => {
              const product = viewing;
              setViewing(null);
              start(product);
            }}
            onDone={() => setViewing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function CategoryBlock({
  parent,
  childrenCats,
  products,
  shopCategories,
  shopDiscounts,
  onAddProduct,
  onAddSub,
  onDeleteCategory,
  onView,
  onEdit,
  onDelete,
}: {
  parent: Category;
  childrenCats: Category[];
  products: Product[];
  shopCategories: Category[];
  shopDiscounts: { id: string; name: string; type: string; value: number; minAmount: number; active: boolean }[];
  onAddProduct: (childId: string) => void;
  onAddSub: () => void;
  onDeleteCategory: (cat: Category) => void;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const [sub, setSub] = useState("");
  const activeSub = childrenCats.some((c) => c.id === sub) ? sub : "";
  const rows = activeSub ? products.filter((p) => p.categoryId === activeSub) : products;

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">{parent.name}</h2>
          <p className="text-xs text-muted">{rows.length} products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={onAddSub}>
            Add subcategory
          </Button>
          <Button tone="ghost" onClick={() => onAddProduct(activeSub)}>
            Add product
          </Button>
          <Button
            tone="danger"
            onClick={() => onDeleteCategory(parent)}
            aria-label={`Delete category ${parent.name}`}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      {childrenCats.length ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
          <button
            onClick={() => setSub("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              !activeSub ? "bg-ember text-white" : "bg-white text-ink"
            }`}
          >
            All in {parent.name}
          </button>
          {childrenCats.map((c) => (
            <div
              key={c.id}
              className={`flex shrink-0 items-center rounded-full ${
                activeSub === c.id ? "bg-ember text-white" : "bg-white text-ink"
              }`}
            >
              <button
                onClick={() => setSub(c.id)}
                className="px-3 py-1.5 text-sm font-semibold"
              >
                {c.name}
              </button>
              <button
                type="button"
                className="pr-2"
                aria-label={`Delete subcategory ${c.name}`}
                onClick={() => onDeleteCategory(c)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={shopCategories}
              discounts={shopDiscounts}
              onView={() => onView(p)}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No product in this category yet.</p>
      )}
    </section>
  );
}

function ProductCard({
  product,
  categories,
  discounts,
  onView,
  onEdit,
  onDelete,
}: {
  product: Product;
  categories: Category[];
  discounts: { id: string; name: string; type: string; value: number; minAmount: number; active: boolean }[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const discount = discounts.find((d) => d.id === product.discountId && d.active);
  const totals = unitTotals(product.price, product.taxPercent, discount);
  return (
    <Card pad={false} className="overflow-hidden">
      <button className="w-full text-left" onClick={onView}>
        <div className="aspect-[4/3] bg-parchment">
          {product.imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageData} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center font-display text-4xl text-muted">{product.name[0]}</div>
          )}
        </div>
        <div className="p-4 pb-0">
          <p className="text-xs text-muted">{categoryLabel(categories, product.categoryId) || "No category"}</p>
          <p className="font-semibold">{product.name}</p>
          <p className="text-ember">{pkr(totals.final)}</p>
          {totals.discountAmt ? <p className="text-xs text-muted line-through">{pkr(product.price)}</p> : null}
          <p className="text-xs text-muted">
            Stock {product.stock} {product.unit}
            {product.sku ? ` · ${product.sku}` : ""}
          </p>
        </div>
      </button>
      <div className="flex gap-2 p-4">
        <Button tone="ghost" className="flex-1" onClick={onView}>
          View
        </Button>
        <Button tone="ghost" className="flex-1" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit photo & price
        </Button>
        <Button tone="danger" className="px-3" aria-label="Delete product" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function ProductView({
  product,
  categories,
  discounts,
  onEdit,
  onDone,
}: {
  product: Product;
  categories: Category[];
  discounts: { id: string; name: string; type: string; value: number; minAmount: number; active: boolean }[];
  onEdit: () => void;
  onDone: () => void;
}) {
  const discount = discounts.find((d) => d.id === product.discountId && d.active);
  const totals = unitTotals(product.price, product.taxPercent, discount);
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_10px_24px_rgba(18,14,10,0.07)]">
        <div className="aspect-[4/3] bg-parchment">
          {product.imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageData} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center font-display text-5xl text-muted">{product.name[0]}</div>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-muted">{categoryLabel(categories, product.categoryId) || "No category"}</p>
          <p className="font-display text-3xl">{product.name}</p>
          <p className="mt-1 text-ember">{pkr(totals.final)}</p>
          {totals.discountAmt ? (
            <p className="text-sm text-muted">
              {pkr(product.price)} − {discount?.name} {pkr(totals.discountAmt)} + tax {pkr(totals.taxAmt)}
            </p>
          ) : (
            <p className="text-sm text-muted">Tax {pkr(totals.taxAmt)}</p>
          )}
          <p className="mt-2 text-sm text-muted">
            Stock {product.stock} {product.unit}
            {product.sku ? ` · SKU ${product.sku}` : ""}
          </p>
          {product.batchNo ? <p className="mt-1 text-sm text-muted">Batch {product.batchNo}</p> : null}
          {product.barcode ? (
            <div className="mt-3">
              <BarcodeMark value={product.barcode} />
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted">This is how it appears on Sell. Tap the card there to add it to the bill.</p>
      <div className="flex gap-2">
        <Button tone="ghost" className="flex-1" onClick={onEdit}>
          Change photo & price
        </Button>
        <Button className="flex-1" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
