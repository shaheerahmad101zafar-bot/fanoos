"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useInstall } from "@/lib/install";
import { cn } from "@/components/ui";

export function InstallButton({
  variant = "ink",
  className,
}: {
  variant?: "ink" | "light" | "ember";
  className?: string;
}) {
  const { canInstall, install, hint, hideHint, ios } = useInstall();
  if (!canInstall && !hint) return null;

  const tones = {
    ink: "border-black/10 bg-white text-ink hover:bg-black/5",
    light: "border-white/20 bg-white/10 text-cream hover:bg-white/15",
    ember: "border-transparent bg-white text-ink hover:brightness-105",
  };

  return (
    <>
      {canInstall ? (
        <button
          type="button"
          onClick={() => void install()}
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold",
            tones[variant],
            className,
          )}
        >
          <Download className="h-4 w-4" />
          Install
        </button>
      ) : null}
      {hint ? (
        <div className="no-print-keep fixed inset-0 z-[70] grid place-items-end p-3 sm:place-items-center">
          <button className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={hideHint} aria-label="Close" />
          <div className="relative z-10 w-full max-w-md rounded-[28px] bg-cream p-5 text-ink shadow-[var(--shadow)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-display text-2xl">Install Fanoos</h3>
              <button onClick={hideHint} className="rounded-full p-2 text-muted hover:bg-black/5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {ios ? (
              <ol className="grid gap-3 text-sm">
                <li className="flex gap-3 rounded-2xl bg-white p-3">
                  <Share className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
                  <span>Tap the Share button at the bottom of Safari.</span>
                </li>
                <li className="flex gap-3 rounded-2xl bg-white p-3">
                  <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
                  <span>Then tap Add to Home Screen, then Add.</span>
                </li>
              </ol>
            ) : (
              <p className="text-sm text-muted">
                Chrome or Edge: tap <b>Install</b> in the address bar, or the browser menu → Install Fanoos. After that it
                opens like an app on your phone or computer.
              </p>
            )}
            <button onClick={hideHint} className="mt-4 w-full rounded-full bg-ember py-3 text-sm font-semibold text-white">
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
