"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeMark({ value, className }: { value: string; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [ok, setOk] = useState(false);
  const text = value.trim();

  useEffect(() => {
    if (!ref.current || !text) {
      setOk(false);
      return;
    }
    try {
      JsBarcode(ref.current, text, {
        format: "CODE128",
        displayValue: true,
        font: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 13,
        height: 52,
        margin: 8,
        background: "#fff8ef",
        lineColor: "#1a120c",
      });
      setOk(true);
    } catch {
      setOk(false);
    }
  }, [text]);

  if (!text) return null;
  return (
    <div className={className}>
      <svg ref={ref} className={ok ? "w-full max-w-sm rounded-2xl bg-[#fff8ef]" : "hidden"} />
      {!ok ? <p className="text-xs text-muted">Barcode {text}</p> : null}
    </div>
  );
}
