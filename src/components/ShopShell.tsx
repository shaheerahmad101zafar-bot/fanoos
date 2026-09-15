"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  LayoutDashboard,
  Menu,
  Package,
  Percent,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Wifi,
} from "lucide-react";
import { LanternMark } from "./LanternMark";
import { Button } from "./ui";
import { ShopProvider, useShop } from "@/lib/store";
import { watchPrintCleanup } from "@/lib/print-receipt";

const NAV = [
  { href: "/shop", label: "Home", icon: LayoutDashboard, roles: ["OWNER", "CASHIER"] },
  { href: "/shop/pos", label: "Sell", icon: ShoppingBag, roles: ["OWNER", "CASHIER"] },
  { href: "/shop/products", label: "Products", icon: Package, roles: ["OWNER"] },
  { href: "/shop/invoices", label: "Invoices", icon: Receipt, roles: ["OWNER", "CASHIER"] },
  { href: "/shop/discounts", label: "Discounts", icon: Percent, roles: ["OWNER"] },
  { href: "/shop/cash", label: "Cash flow", icon: Banknote, roles: ["OWNER", "CASHIER"] },
  { href: "/shop/customers", label: "Customers", icon: Users, roles: ["OWNER", "CASHIER"] },
  { href: "/shop/settings", label: "Shop", icon: Settings, roles: ["OWNER"] },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shop = useShop();
  const role = shop.user.role;

  useEffect(() => watchPrintCleanup(), []);

  if (!shop.ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#efe4d4] text-ink">
        <div className="grid justify-items-center gap-3">
          <LanternMark className="h-16 w-16" />
          <p className="font-display text-2xl">Usman Shop</p>
          <p className="text-sm text-muted">Phone pe khul rahi hai…</p>
        </div>
      </div>
    );
  }

  if (shop.error && !shop.tenant.id) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#efe4d4] px-6 text-ink">
        <div className="grid max-w-md justify-items-center gap-3 text-center">
          <LanternMark className="h-16 w-16" />
          <p className="font-display text-2xl">Could not open shop</p>
          <p className="text-sm text-muted">{shop.error}</p>
          <Button onClick={() => void shop.refresh()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#efe4d4] text-ink">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="no-print hidden flex-col border-r border-black/5 bg-[#16110c] text-cream lg:flex">
          <div className="flex items-center gap-3 px-5 py-6">
            <LanternMark className="h-11 w-11" />
            <div>
              <p className="font-display text-2xl leading-none">{shop.tenant.companyName || "Shop"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold/80">
                {shop.tenant.tradeName || "POS"}
              </p>
            </div>
          </div>
          <div className="mx-4 rounded-2xl bg-white/5 px-4 py-3">
            <p className="truncate text-sm font-semibold">{shop.tenant.companyName || "Your shop"}</p>
            <p className="truncate text-xs text-cream/50">{shop.user.name}</p>
          </div>
          <nav className="mt-4 grid gap-1 px-3">
            {NAV.filter((n) => n.roles.includes(role)).map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                    active ? "bg-ember text-white" : "text-cream/75 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/5 bg-[#efe4d4]/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <LanternMark className="h-8 w-8 shrink-0" />
              <span className="truncate font-display text-xl">{shop.tenant.companyName || "Usman Shop"}</span>
            </div>
            <div className="hidden text-sm text-muted lg:block">Bills is phone pe save hote hain.</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-moss/15 px-3 py-1 text-xs font-semibold text-moss">
                <Wifi className="h-3.5 w-3.5" />
                Phone shop
              </span>
            </div>
          </header>

          <main
            className={
              pathname.startsWith("/shop/pos")
                ? "flex-1 p-3 pb-36 lg:p-6 lg:pb-8"
                : "flex-1 p-4 pb-24 lg:p-6 lg:pb-8"
            }
          >
            {children}
          </main>

          <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-black/5 bg-[#16110c] px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] text-cream lg:hidden">
            {[
              { href: "/shop", label: "Home", icon: LayoutDashboard },
              { href: "/shop/pos", label: "Sell", icon: ShoppingBag },
              { href: "/shop/invoices", label: "Bills", icon: Receipt },
              { href: "/shop/more", label: "More", icon: Menu },
            ].map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`grid min-h-12 place-items-center gap-1 rounded-2xl py-2 text-[11px] ${
                    active ? "bg-ember text-white" : "text-cream/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider>
      <ShellInner>{children}</ShellInner>
    </ShopProvider>
  );
}
