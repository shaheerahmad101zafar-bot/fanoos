export type BondedPrinter = { name: string; address: string };

type NativeBridge = {
  listBonded(): string;
  printSpp(address: string, data: string): string;
  printSppJobs?(address: string, jobsJson: string): string;
};

function nativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { FanoosPrinter?: NativeBridge }).FanoosPrinter;
  if (!bridge || typeof bridge.listBonded !== "function") return null;
  return bridge;
}

export function hasNativeBluetooth() {
  return nativeBridge() !== null;
}

export async function listBondedPrinters(): Promise<BondedPrinter[]> {
  const bridge = nativeBridge();
  if (!bridge) return [];
  const raw = bridge.listBonded();
  try {
    const parsed = JSON.parse(raw) as BondedPrinter[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toB64(bytes: Uint8Array) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export async function printSpp(address: string, bytes: Uint8Array) {
  await printSppJobs(address, [bytes]);
}

export async function printSppJobs(address: string, jobs: Uint8Array[]) {
  const bridge = nativeBridge();
  if (!bridge) {
    throw new Error(
      "Phone Bluetooth mein TM-m30 already connected hai. Chrome usay search nahi karta — yeh Classic Bluetooth hai. Fanoos Android app se print karo, wahan paired printer list mein TM-m30 aata hai.",
    );
  }
  const payload = JSON.stringify(jobs.map(toB64));
  if (typeof bridge.printSppJobs === "function") {
    const result = bridge.printSppJobs(address, payload);
    if (result && result.startsWith("error:")) {
      throw new Error(result.slice(6) || "Bluetooth print nahi hua.");
    }
    return;
  }
  for (const job of jobs) {
    const result = bridge.printSpp(address, toB64(job));
    if (result && result.startsWith("error:")) {
      throw new Error(result.slice(6) || "Bluetooth print nahi hua.");
    }
  }
}

export function pickTmPrinter(printers: BondedPrinter[]) {
  return (
    printers.find((item) => /TM-?m30|epson/i.test(item.name || "")) ||
    printers.find((item) => /printer|pos|rpp|mtp/i.test(item.name || "")) ||
    printers[0] ||
    null
  );
}
