"use client";

import { PrinterConnect } from "@/components/PrinterConnect";

export default function PrinterPage() {
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <h1 className="font-display text-4xl">Bill printer</h1>
      <p className="text-sm text-muted">Phone Bluetooth pe jo TM-m30 already connected hai, usi se print. Chrome searching nahi.</p>
      <PrinterConnect />
    </div>
  );
}
