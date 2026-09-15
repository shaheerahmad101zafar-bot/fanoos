import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role, SessionUser } from "./types";

export const COOKIE = "fanoos_session";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "fanoos-dev-change-this-in-production");
}

export async function signSession(user: SessionUser) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.email || !payload.role) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name || ""),
      role: payload.role as Role,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
    };
  } catch {
    return null;
  }
}

export async function writeSession(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSession() {
  const jar = await cookies();
  return readToken(jar.get(COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const err = new Error("UNAUTHENTICATED");
    err.name = "UNAUTHENTICATED";
    throw err;
  }
  return session;
}

export async function requireTenant() {
  const session = await requireSession();
  if (session.role === "SUPER_ADMIN" || !session.tenantId) {
    const err = new Error("FORBIDDEN");
    err.name = "FORBIDDEN";
    throw err;
  }
  return { ...session, tenantId: session.tenantId };
}

export async function requireSuper() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") {
    const err = new Error("FORBIDDEN");
    err.name = "FORBIDDEN";
    throw err;
  }
  return session;
}

export async function requireOwner() {
  const session = await requireTenant();
  if (session.role !== "OWNER") {
    const err = new Error("FORBIDDEN");
    err.name = "FORBIDDEN";
    throw err;
  }
  return session;
}
