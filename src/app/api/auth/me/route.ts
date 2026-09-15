import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    user: {
      id: "usr_usman",
      email: "usman@shop.local",
      name: "Usman",
      role: "OWNER",
      tenantId: "tnt_usman",
    },
  });
}
