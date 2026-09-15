import { requireOwner, requireSession, requireTenant } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { createStaff, deleteStaff } from "@/lib/server/admin";
import {
  addCashMove,
  applySync,
  assertTenant,
  bootstrap,
  closeCash,
  createInvoice,
  deleteDiscount,
  deleteProduct,
  getInvoice,
  openCash,
  setupOwnShop,
  updateSettings,
  deleteCategory,
  upsertCategory,
  upsertCustomer,
  upsertDiscount,
  upsertProduct,
  voidInvoice,
} from "@/lib/server/shop";

function last(path: string[]) {
  return path[path.length - 1];
}

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await requireTenant();
    const tenantId = assertTenant(session);
    const path = (await ctx.params).path;
    const joined = path.join("/");

    if (joined === "bootstrap") return json(await bootstrap(tenantId, session));
    if (path[0] === "invoices" && path[1]) return json(await getInvoice(tenantId, path[1]));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await ctx.params).path;
    const joined = path.join("/");
    const body = await request.json().catch(() => ({}));

    if (joined === "setup") {
      const session = await requireSession();
      return json(await setupOwnShop(session, body));
    }

    if (joined === "sync") {
      const session = await requireTenant();
      return json(await applySync(session, Array.isArray(body.ops) ? body.ops : []));
    }

    if (joined === "invoices") {
      const session = await requireTenant();
      return json(await createInvoice(session, body));
    }

    if (joined === "products") {
      const session = await requireOwner();
      return json(await upsertProduct(session.tenantId, body));
    }

    if (joined === "discounts") {
      const session = await requireOwner();
      return json(await upsertDiscount(session.tenantId, body));
    }

    if (joined === "customers") {
      const session = await requireTenant();
      return json(await upsertCustomer(session.tenantId, body));
    }

    if (joined === "categories") {
      const session = await requireOwner();
      return json(await upsertCategory(session.tenantId, body));
    }

    if (joined === "cash/open") {
      const session = await requireTenant();
      return json(await openCash(session.tenantId, body));
    }

    if (joined === "cash/close") {
      const session = await requireTenant();
      return json(await closeCash(session.tenantId, body));
    }

    if (joined === "cash/move") {
      const session = await requireTenant();
      return json(await addCashMove(session.tenantId, body));
    }

    if (joined === "settings") {
      const session = await requireOwner();
      return json(await updateSettings(session.tenantId, body));
    }

    if (joined === "staff") {
      const session = await requireOwner();
      return json(await createStaff(session.tenantId, body));
    }

    if (path[0] === "invoices" && path[1] && last(path) === "void") {
      const session = await requireOwner();
      return json(await voidInvoice(session.tenantId, path[1], session.role));
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await requireOwner();
    const path = (await ctx.params).path;
    if (path[0] === "products" && path[1]) return json(await deleteProduct(session.tenantId, path[1]));
    if (path[0] === "discounts" && path[1]) return json(await deleteDiscount(session.tenantId, path[1]));
    if (path[0] === "categories" && path[1]) return json(await deleteCategory(session.tenantId, path[1]));
    if (path[0] === "staff" && path[1]) return json(await deleteStaff(session.tenantId, path[1]));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}
