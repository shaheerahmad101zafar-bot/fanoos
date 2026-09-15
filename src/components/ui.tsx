"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  tone = "ember",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ember" | "ghost" | "ink" | "gold" | "danger" | "moss";
}) {
  const tones = {
    ember: "bg-ember text-white hover:brightness-110 shadow-[0_10px_24px_rgba(226,74,22,0.28)]",
    gold: "bg-gold text-ink hover:brightness-105",
    ink: "bg-ink text-cream hover:bg-bark",
    ghost: "bg-transparent text-ink border border-black/10 hover:bg-black/5",
    danger: "bg-rose text-white hover:brightness-110",
    moss: "bg-moss text-white hover:brightness-110",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink/80">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const box =
  "w-full rounded-2xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-base outline-none transition focus:border-ember/50 focus:ring-4 focus:ring-ember/10 sm:text-sm";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(box, props.className)} {...props} />;
}

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={cn(box, "pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:bg-black/5 hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(box, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(box, "min-h-24", props.className)} {...props} />;
}

export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cn("rounded-[28px] border border-black/5 bg-white/80 shadow-[var(--shadow)]", pad && "p-5", className)}>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "ember" | "moss" | "gold";
}) {
  const tones = {
    ink: "from-[#2a2118] to-[#120e0a] text-cream",
    ember: "from-[#e24a16] to-[#9b2c2c] text-white",
    moss: "from-[#3f6f52] to-[#1b4332] text-white",
    gold: "from-[#d4b36a] to-[#8a6a2a] text-ink",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] bg-gradient-to-br p-5 rise", tones[tone])}>
      <p className="text-xs uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-2 text-sm opacity-70">{hint}</p> : null}
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="no-print-keep fixed inset-0 z-50 grid place-items-end p-3 sm:place-items-center">
      <button className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto overscroll-y-contain rounded-[28px] bg-cream p-4 shadow-[var(--shadow)] sm:p-5 [-webkit-overflow-scrolling:touch]",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="no-print mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">{title}</h3>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-muted hover:bg-black/5">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/10 px-6 py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-2 text-muted">{text}</p>
    </div>
  );
}

export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "moss" | "rose" | "ink" }) {
  const tones = {
    gold: "bg-gold/20 text-[#7a5b16]",
    moss: "bg-moss/15 text-moss",
    rose: "bg-rose/15 text-rose",
    ink: "bg-ink/10 text-ink",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
