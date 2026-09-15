"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { LanternMark } from "@/components/LanternMark";
import Link from "next/link";

const spark = [
  { v: 18 },
  { v: 22 },
  { v: 19 },
  { v: 28 },
  { v: 24 },
  { v: 36 },
  { v: 31 },
  { v: 42 },
];

export function LoginStage() {
  return (
    <div className="relative hidden overflow-hidden bg-ink text-cream lg:block">
      <div className="absolute inset-0 lantern-glow opacity-80" />
      <span className="bubble" style={{ left: "12%", bottom: "18%", width: 16, height: 16, animationDuration: "9s" }} />
      <span className="bubble" style={{ left: "70%", bottom: "28%", width: 22, height: 22, animationDelay: "1s" }} />
      <span className="bubble" style={{ left: "40%", bottom: "12%", width: 10, height: 10, animationDelay: "2s" }} />
      <span className="bubble" style={{ left: "84%", bottom: "40%", width: 14, height: 14, animationDelay: "0.6s" }} />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-3">
          <LanternMark />
          <span className="font-display text-3xl">Fanoos</span>
        </Link>

        <div>
          <h1 className="font-display text-5xl leading-tight">A lantern for every counter.</h1>
          <p className="mt-4 max-w-md text-cream/65">
            Enter the shop you were given. Another shop cannot see your products, bills or cash.
          </p>

          <div className="mt-8 grid max-w-md gap-3">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gold/80">Today’s counter</p>
                  <p className="mt-1 font-display text-3xl">Rs 18,420</p>
                  <p className="text-xs text-cream/50">12 bills · cash · JazzCash</p>
                </div>
                <div className="h-16 w-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spark}>
                      <Area type="monotone" dataKey="v" stroke="#F4A261" strokeWidth={2} fill="#F4A26133" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="invoice-slip-preview rounded-[24px] border border-white/10 bg-[#fbf7f1] p-4 text-ink shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
              <p className="text-center text-[11px] uppercase tracking-[0.16em] text-muted">Invoice SH-0148</p>
              <p className="text-center font-display text-xl">Chicken Biryani × 2</p>
              <div className="mt-3 flex justify-between text-sm">
                <span>Total</span>
                <span className="font-semibold">Rs 900</span>
              </div>
              <div className="mx-auto mt-3 grid h-14 w-14 place-items-center rounded-xl bg-white">
                <div className="grid grid-cols-4 gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 ${i % 3 === 0 ? "bg-ink" : "bg-ink/20"}`} />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted">FBR / shop QR</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gold/80">Need help? WhatsApp Sohaib · 0341 7669398</p>
      </div>
    </div>
  );
}
