"use client";

import { useEffect, type ReactNode } from "react";
import { watchPrintCleanup } from "@/lib/print-receipt";

export function Pwa({ children }: { children: ReactNode }) {
  useEffect(() => watchPrintCleanup(), []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.pathname.startsWith("/download")) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return children;
}
