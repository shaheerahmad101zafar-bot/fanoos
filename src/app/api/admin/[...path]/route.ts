import { requireSuper } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import {
  adminStats,
  createShopAdmin,
  deleteShopAdmin,
  deleteShopById,
  listPendingAdmins,
  listShops,
  patchShop,
  resetAdminPassword,
  setAdminActive,
} from "@/lib/server/admin";

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    await requireSuper();
    const joined = (await ctx.params).path.join("/");
    if (joined === "stats") return json(await adminStats());
    if (joined === "shops") return json(await listShops());
    if (joined === "admins") return json(await listPendingAdmins());
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    await requireSuper();
    const path = (await ctx.params).path;
    const body = await request.json();
    if (path.join("/") === "admins") return json(await createShopAdmin(body));
    if (path[0] === "admins" && path[1] && (path[2] === "password" || body.action === "password")) {
      return json(await resetAdminPassword(path[1], String(body.password || "")));
    }
    if (path[0] === "admins" && path[1] && (body.action === "active" || typeof body.active === "boolean")) {
      return json(await setAdminActive(path[1], body.active !== false));
    }
    if (path[0] === "shops" && path[1]) return json(await patchShop(path[1], body));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    await requireSuper();
    const path = (await ctx.params).path;
    if (path[0] === "admins" && path[1]) return json(await deleteShopAdmin(path[1]));
    if (path[0] === "shops" && path[1]) return json(await deleteShopById(path[1]));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}
