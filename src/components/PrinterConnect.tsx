"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  hasNativeBluetooth,
  listBondedPrinters,
  pickTmPrinter,
  type BondedPrinter,
} from "@/lib/native-bt";
import {
  FANOOS_APP_APK,
  connectBluetoothPrinter,
  loadPrinter,
  savePrinter,
  type PrinterConfig,
} from "@/lib/printer";

export function PrinterConnect({ compact = false }: { compact?: boolean }) {
  const [cfg, setCfg] = useState<PrinterConfig>(() => loadPrinter());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [native, setNative] = useState(false);
  const [printers, setPrinters] = useState<BondedPrinter[]>([]);

  useEffect(() => {
    const sync = () => setCfg(loadPrinter());
    sync();
    window.addEventListener("fanoos-printer", sync);
    return () => window.removeEventListener("fanoos-printer", sync);
  }, []);

  useEffect(() => {
    const inApp = hasNativeBluetooth();
    setNative(inApp);
    if (!inApp) return;
    void listBondedPrinters().then((items) => {
      setPrinters(items);
      const current = loadPrinter();
      if (current.bluetoothAddress) return;
      const picked = pickTmPrinter(items);
      if (!picked) return;
      savePrinter({
        ...current,
        bluetoothName: picked.name || "TM-m30",
        bluetoothAddress: picked.address,
      });
      setCfg(loadPrinter());
    });
  }, []);

  async function usePrinter(printer: BondedPrinter) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      savePrinter({
        ...loadPrinter(),
        bluetoothName: printer.name || "TM-m30",
        bluetoothAddress: printer.address,
      });
      setCfg(loadPrinter());
      await connectBluetoothPrinter();
      setCfg(loadPrinter());
      setMessage(`${printer.name || "TM-m30"} se test slip nikal gayi. Ab bill pe Print bill dabao.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bluetooth printer nahi mila.");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      {native ? (
        <>
          <p className="text-sm leading-6">
            Printer phone Bluetooth pe already connected hai. Chrome jaisi searching yahan nahi — neeche phone ki{" "}
            <b>paired printers</b> ki list hai. <b>TM-m30</b> pe tap karo.
          </p>
          {printers.length ? (
            <div className="grid gap-2">
              {printers.map((printer) => {
                const selected = cfg.bluetoothAddress === printer.address;
                const likely = /TM-?m30|epson/i.test(printer.name || "");
                return (
                  <button
                    key={printer.address}
                    type="button"
                    disabled={busy}
                    onClick={() => void usePrinter(printer)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm ${
                      selected ? "bg-ink text-cream" : "bg-white text-ink"
                    }`}
                  >
                    <span className="block font-semibold">{printer.name || "Bluetooth device"}</span>
                    <span className={`block text-xs ${selected ? "text-cream/70" : "text-muted"}`}>
                      {likely ? "TM-m30 — yeh choose karo · " : ""}
                      {printer.address}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-rose">
              Paired printer list khali hai. Phone Settings → Bluetooth mein TM-m30 Connected rakho, Fanoos app ko
              Bluetooth permission do, phir app dubara kholo.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm leading-6">
            Phone Bluetooth mein <b>TM-m30 already connected</b> hai. Chrome usay dhoondh nahi sakta — woh Classic
            Bluetooth printer hai, is liye app searching pe atak jati thi.
          </p>
          <p className="text-xs leading-5 text-muted">
            Chrome ki Pair / scanning band karo. Fanoos Android app install karo. Us app mein phone ki paired list se
            TM-m30 aata hai, phir Print bill usi printer pe nikalta hai. WiFi / IP / Add printer mat use karo.
          </p>
          <a
            href={FANOOS_APP_APK}
            className="flex min-h-12 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-cream"
          >
            Fanoos app download — TM-m30 print
          </a>
          <p className="text-xs leading-5 text-muted">
            Chrome browser mein kholo. APK seedha mat lo — ZIP download dabao, zip khol ke fanoos.apk install karo.
          </p>
        </>
      )}

      <div className="flex gap-2">
        {([58, 80] as const).map((mm) => (
          <button
            key={mm}
            type="button"
            onClick={() => {
              const next = { ...cfg, paperMm: mm };
              setCfg(next);
              savePrinter(next);
            }}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              cfg.paperMm === mm ? "bg-ink text-cream" : "bg-white text-ink"
            }`}
          >
            {mm}mm
          </button>
        ))}
      </div>

      {native && printers.length ? (
        <Button
          className="w-full min-h-12"
          disabled={busy || !pickTmPrinter(printers)}
          onClick={() => {
            const picked =
              printers.find((item) => item.address === cfg.bluetoothAddress) || pickTmPrinter(printers);
            if (picked) void usePrinter(picked);
          }}
        >
          {busy ? "TM-m30 pe bhej rahe hain…" : "Test print — paired TM-m30"}
        </Button>
      ) : null}

      {cfg.bluetoothName ? <p className="text-xs text-moss">Selected · {cfg.bluetoothName}</p> : null}
      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {message ? <p className="text-sm text-moss">{message}</p> : null}
    </>
  );

  if (compact) {
    return <div className="grid gap-3 rounded-2xl bg-parchment/90 px-3 py-3">{body}</div>;
  }

  return (
    <Card>
      <h2 className="font-display text-2xl">Bill printer</h2>
      <p className="mt-1 text-sm text-muted">Bluetooth thermal printer — TM-m30</p>
      <div className="mt-4 grid gap-3">{body}</div>
    </Card>
  );
}
