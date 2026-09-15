import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "Server error";
  if (name === "UNAUTHENTICATED" || message === "UNAUTHENTICATED") {
    return json({ error: "Please sign in" }, 401);
  }
  if (name === "FORBIDDEN" || message === "FORBIDDEN") {
    return json({ error: "You cannot open this" }, 403);
  }
  if (/not found/i.test(message)) {
    return json({ error: message }, 404);
  }
  console.error(error);
  return json({ error: message || "Server error" }, 400);
}
