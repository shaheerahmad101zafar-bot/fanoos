import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE = "application/vnd.android.package-archive";
const NAME = "fanoos.apk";

function apkHeaders(length: number): HeadersInit {
  return {
    "Content-Type": TYPE,
    "Content-Disposition": `attachment; filename="${NAME}"`,
    "Content-Length": String(length),
    "Cache-Control": "public, max-age=120",
    "X-Content-Type-Options": "nosniff",
  };
}

async function apkBytes(): Promise<Uint8Array> {
  const files = [
    join(process.cwd(), "public", "fanoos-1.4.apk"),
    join(process.cwd(), "public", "fanoos.apk"),
  ];
  for (const file of files) {
    try {
      return await readFile(file);
    } catch {
      /* try next path, then CDN */
    }
  }

  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://fanoos-bice.vercel.app";
  const res = await fetch(`${origin}/fanoos-1.4.apk`);
  if (!res.ok) {
    throw new Error("apk missing");
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function GET() {
  try {
    const bytes = await apkBytes();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: apkHeaders(bytes.byteLength),
    });
  } catch {
    return NextResponse.json({ error: "APK not found" }, { status: 404 });
  }
}

export async function HEAD() {
  try {
    const bytes = await apkBytes();
    return new NextResponse(null, { status: 200, headers: apkHeaders(bytes.byteLength) });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
