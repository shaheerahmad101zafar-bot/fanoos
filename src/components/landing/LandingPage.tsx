"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  QrCode,
  Shield,
  ShoppingBag,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { LanternMark } from "@/components/LanternMark";
import { compactPkr } from "@/lib/format";

const WHATSAPP = "923417669398";
const WHATSAPP_DISPLAY = "0341 7669398";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Assalam o Alaikum Sohaib, Fanoos site ke hawale se baat karni hai.")}`;

const monthSales = [
  { label: "Apr", total: 186000 },
  { label: "May", total: 214000 },
  { label: "Jun", total: 198000 },
  { label: "Jul", total: 246000 },
  { label: "Aug", total: 271000 },
  { label: "Sep", total: 312000 },
];

const payMix = [
  { label: "Mon", cash: 42000, card: 18000, wallet: 12000 },
  { label: "Tue", cash: 38000, card: 21000, wallet: 16000 },
  { label: "Wed", cash: 51000, card: 14000, wallet: 19000 },
  { label: "Thu", cash: 47000, card: 22000, wallet: 15000 },
  { label: "Fri", cash: 72000, card: 28000, wallet: 24000 },
  { label: "Sat", cash: 81000, card: 31000, wallet: 27000 },
  { label: "Sun", cash: 39000, card: 16000, wallet: 11000 },
];

const slides = [
  {
    title: "Sell on the counter",
    text: "Tap a product, add quantity, take cash, card, JazzCash or EasyPaisa. The bill prints with your shop name.",
    stat: "Fast POS",
  },
  {
    title: "Watch the money",
    text: "Daily cash flow and monthly graphs so the owner sees what came in — without opening another shop’s books.",
    stat: "Live graphs",
  },
  {
    title: "FBR-ready invoices",
    text: "NTN, STRN, POS ID and a QR that builds itself. License date and register ID print only if you tick the box.",
    stat: "FBR QR",
  },
  {
    title: "Works when the line dies",
    text: "Load shedding or dead fiber — the cashier still sells. Bills wait on the phone and sync when internet returns.",
    stat: "Offline",
  },
];

const features = [
  { icon: ShoppingBag, title: "Products with photos", text: "Add, edit, view and delete. Auto-fit pictures, drag to crop, stock, barcode and medical expiry." },
  { icon: QrCode, title: "Invoices + FBR QR", text: "Every bill carries your company, tax IDs and QR. Optional customer name and number." },
  { icon: WifiOff, title: "Offline lantern", text: "Counter keeps selling without internet. Pending bills sync the moment the line comes back." },
  { icon: Shield, title: "Sealed shops", text: "Each admin opens only their shop. Spice House never sees another client’s products or cash." },
  { icon: BarChart3, title: "Cash & graphs", text: "Open register, cash in/out, card and wallets, then read the month on a graph." },
  { icon: Smartphone, title: "Phone and computer", text: "Mobile layout on the pocket. Desktop ticket on the counter. Same login, same ledger." },
];

function Bubbles() {
  const dots = [
    { left: "8%", size: 18, delay: "0s" },
    { left: "22%", size: 10, delay: "1.4s" },
    { left: "41%", size: 26, delay: "0.6s" },
    { left: "63%", size: 14, delay: "2.1s" },
    { left: "78%", size: 22, delay: "0.9s" },
    { left: "91%", size: 12, delay: "1.8s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: d.left,
            bottom: "8%",
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: `${8 + i}s`,
          }}
        />
      ))}
    </div>
  );
}

export function LandingPage() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#100c09] text-[#fbf7f1]">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-ember/20 blur-3xl" style={{ animation: "drift 10s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute right-[-5rem] top-10 h-[22rem] w-[22rem] lantern-glow opacity-80" />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <LanternMark />
          <div>
            <p className="font-display text-2xl leading-none">Fanoos</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">فانوس</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-cream/70 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#graphs" className="hover:text-white">Graphs</a>
          <a href="#owner" className="hover:text-white">Owner</a>
          <a href="#contact" className="hover:text-white">WhatsApp</a>
        </nav>
        <div className="flex items-center gap-2">
          <InstallButton variant="ember" />
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 sm:inline-flex"
          >
            WhatsApp
          </a>
          <Link href="/login" className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <Bubbles />
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-gold">Restaurant · Medical · Retail</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] text-white sm:text-7xl">
              A lantern for every shop counter.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              Fanoos is billing software you give to many shop owners. Each admin builds their own
              profile, products and invoices. One shop never sees another. Built in Pakistan for
              cash, JazzCash, EasyPaisa and FBR bills — on phone and computer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink">
                Open your shop
              </Link>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-6 py-3 text-sm text-cream/85">
                Talk on WhatsApp
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-cream/55">
              <span>Offline + online</span>
              <span>FBR QR</span>
              <span>Separate admin per client</span>
            </div>
          </div>

          <div className="relative rounded-[36px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-gold/80">Sample counter today</p>
            <p className="mt-3 font-display text-5xl">Rs 3.1L</p>
            <p className="mt-1 text-sm text-cream/50">This month · cash, card and wallets</p>
            <div className="mt-5 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthSales}>
                  <defs>
                    <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F4A261" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#F4A261" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: "#d4b36a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => compactPkr(Number(v))} />
                  <Area type="monotone" dataKey="total" stroke="#F4A261" strokeWidth={3} fill="url(#landFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <svg viewBox="0 0 300 40" className="mt-2 h-10 w-full">
              <path
                className="draw-line"
                d="M0 28 C40 24 50 8 90 14 C130 20 140 6 180 10 C220 14 230 22 300 4"
                fill="none"
                stroke="#E24A16"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/8 to-white/0 p-6 sm:p-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold">Slide</p>
                <h2 className="mt-2 font-display text-4xl" style={{ animation: "slide-in 0.45s ease" }} key={slide}>
                  {slides[slide].title}
                </h2>
              </div>
              <span className="rounded-full bg-ember px-3 py-1 text-xs font-semibold">{slides[slide].stat}</span>
            </div>
            <p className="mt-4 max-w-2xl text-cream/70" key={`t-${slide}`}>
              {slides[slide].text}
            </p>
            <div className="mt-6 flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setSlide(i)}
                  className={`h-2 rounded-full transition-all ${i === slide ? "w-10 bg-gold" : "w-2 bg-white/25"}`}
                  aria-label={s.title}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="font-display text-4xl">Everything a shop needs on one lantern</h2>
          <p className="mt-3 max-w-2xl text-cream/65">
            Super Admin only creates the login. The shop admin then uploads products, prints bills
            and reads their own graphs. Nothing crosses to the next client.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <Icon className="h-6 w-6 text-gold" />
                  <h3 className="mt-4 font-display text-2xl">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-cream/65">{f.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="graphs" className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="font-display text-4xl">Graphs the owner actually reads</h2>
          <p className="mt-3 max-w-2xl text-cream/65">
            Monthly sales climb, and the week shows cash vs card vs JazzCash / EasyPaisa.
            These charts live inside each shop — never on Super Admin.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-[#fbf7f1] p-5 text-ink">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Monthly sales</p>
              <p className="font-display text-2xl">The year in flame</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthSales}>
                    <defs>
                      <linearGradient id="emberLand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E24A16" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#E24A16" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(18,14,10,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => compactPkr(Number(v))} tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
                    <Tooltip formatter={(v) => compactPkr(Number(v))} />
                    <Area type="monotone" dataKey="total" stroke="#E24A16" strokeWidth={3} fill="url(#emberLand)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#fbf7f1] p-5 text-ink">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Cash vs card vs wallet</p>
              <p className="font-display text-2xl">Last 7 days</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payMix}>
                    <CartesianGrid stroke="rgba(18,14,10,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => compactPkr(Number(v))} tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
                    <Tooltip formatter={(v) => compactPkr(Number(v))} />
                    <Bar dataKey="cash" stackId="a" fill="#3F6F52" />
                    <Bar dataKey="card" stackId="a" fill="#D4B36A" />
                    <Bar dataKey="wallet" stackId="a" fill="#E24A16" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="font-display text-4xl">How a new client starts</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Super Admin creates a login", "Only name, email and password. No one else’s shop is opened."],
              ["2", "That admin builds the shop", "Company name, FBR, logo, products with photos, cashiers."],
              ["3", "They sell on their lantern", "POS, invoices, cash flow, graphs. The next client cannot see this book."],
            ].map(([n, t, d]) => (
              <article key={n} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <p className="font-display text-4xl text-gold">{n}</p>
                <h3 className="mt-2 font-display text-2xl">{t}</h3>
                <p className="mt-2 text-sm text-cream/65">{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="owner" className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid items-center gap-10 rounded-[36px] border border-white/10 bg-white/5 p-6 sm:p-10 lg:grid-cols-[280px_1fr]">
            <div className="relative mx-auto">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-gold via-ember to-transparent opacity-80 blur-md" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sohaib-zafar.png"
                alt="Sohaib Zafar, owner of Fanoos"
                className="relative h-64 w-64 rounded-full object-cover object-[center_12%] ring-4 ring-gold/70"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">Founder & owner</p>
              <h2 className="mt-2 font-display text-4xl">Sohaib Zafar</h2>
              <p className="mt-4 max-w-xl text-cream/75">
                Fanoos is built and owned by Sohaib Zafar — for restaurants, medical stores and
                retail counters across Pakistan. If a shop login, license or bill needs help,
                message directly on WhatsApp. No ticket maze.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                  <Building2 className="h-4 w-4 text-gold" /> Fanoos
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                  <BadgeCheck className="h-4 w-4 text-gold" /> Owner
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-[36px] bg-gradient-to-br from-ember to-[#9b2c2c] p-8 text-white sm:p-12">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Need the site, a shop, or a fix?</p>
            <h2 className="mt-3 font-display text-4xl">WhatsApp Sohaib</h2>
            <p className="mt-3 max-w-xl text-white/85">
              Koi issue ho — login, shop setup, FBR, ya naya client add karna ho — WhatsApp par rabta
              karo. Number: {WHATSAPP_DISPLAY}
            </p>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Chat on WhatsApp {WHATSAPP_DISPLAY}
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-sm text-cream/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Fanoos · Sohaib Zafar</p>
          <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="text-gold hover:text-white">
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </div>
      </footer>

      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.45)]"
        aria-label="WhatsApp Sohaib"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
          <path d="M20 11.5A8.5 8.5 0 1 1 8.4 18.7L4 20l1.4-4.2A8.5 8.5 0 0 1 20 11.5Zm-8.5 7a7 7 0 1 0-6-3.5l.2.3-.8 2.5 2.6-.8.3.2a7 7 0 0 0 3.7 1.3Zm3.8-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.6.7-.7.8-.1.1-.3.2-.5 0-.2-.1-.9-.3-1.7-1.1-.6-.6-1-1.3-1.1-1.5-.1-.2 0-.3.1-.5l.3-.4.1-.2c0-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.8 3.4 1.3.5 1.9.6 2.6.5.4 0 1.2-.2 1.4-.5.2-.3.2-.6.1-.7 0-.1-.2-.1-.4-.2Z" />
        </svg>
      </a>
    </div>
  );
}
