import { writeSession } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { loginUser } from "@/lib/server/login";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginUser(String(body.email || ""), String(body.password || ""));
    await writeSession(user);
    return json({ user, needsSetup: user.role === "OWNER" && !user.tenantId });
  } catch (error) {
    return fail(error);
  }
}
