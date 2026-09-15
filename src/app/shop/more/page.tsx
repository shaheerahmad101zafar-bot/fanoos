"use client";

import Link from "next/link";
import { useShop } from "@/lib/store";

export default function MorePage() {
  const shop = useShop();
  const links = [
    ["/shop/products", "Products", "OWNER"],
    ["/shop/discounts", "Discounts", "OWNER"],
    ["/shop/cash", "Cash flow", "CASHIER"],
    ["/shop/customers", "Customers", "CASHIER"],
    ["/shop/settings", "Shop & FBR", "OWNER"],
    ["/shop/printer", "Bill printer", "CASHIER"],
    ["/shop/invoices", "Invoices", "CASHIER"],
  ].filter(([, , role]) => (role === "OWNER" ? shop.user.role === "OWNER" : true));

  return (
    <div className="grid gap-3">
      <h1 className="font-display text-4xl">More</h1>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-[24px] bg-white px-5 py-4 text-lg shadow-[var(--shadow)]">
          {label}
        </Link>
      ))}
    </div>
  );
}
