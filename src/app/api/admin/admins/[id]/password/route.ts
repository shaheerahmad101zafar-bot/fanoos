import { requireSuper } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { resetAdminPassword } from "@/lib/server/admin";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper();
    const { id } = await ctx.params;
    const body = await request.json();
    return json(await resetAdminPassword(id, String(body.password || "")));
  } catch (error) {
    return fail(error);
  }
}
