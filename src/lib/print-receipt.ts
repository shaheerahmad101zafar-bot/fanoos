const OVERLAY_ID = "fanoos-print-overlay";

export function cleanupPrintMode() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("is-printing", "is-printing-image");
  document.getElementById(OVERLAY_ID)?.remove();
  document.querySelectorAll(".invoice-print-clone").forEach((node) => node.remove());
}

export function watchPrintCleanup() {
  if (typeof window === "undefined") return () => {};
  cleanupPrintMode();
  const onVisible = () => {
    if (document.visibilityState === "visible") cleanupPrintMode();
  };
  const onShow = () => cleanupPrintMode();
  window.addEventListener("pageshow", onShow);
  window.addEventListener("afterprint", onShow);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("pageshow", onShow);
    window.removeEventListener("afterprint", onShow);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function ticketCanvas(lines: string[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 576;
  canvas.height = Math.max(320, 80 + lines.length * 40);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Print image nahi bani");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#120e0a";
  ctx.textAlign = "center";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("Fanoos", canvas.width / 2, 64);
  ctx.font = "28px sans-serif";
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, 120 + i * 40);
  });
  return canvas;
}

export async function captureSlipJpeg(width = 576) {
  const slip = document.querySelector(".invoice-slip");
  if (!(slip instanceof HTMLElement)) {
    return ticketCanvas(["Printer test", new Date().toLocaleString("en-PK")]).toDataURL("image/jpeg", 0.92);
  }
  const { captureElementCanvas } = await import("@/lib/print-capture");
  const canvas = await captureElementCanvas(slip, width);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function printJpegDataUrl(dataUrl: string) {
  return new Promise<void>((resolve, reject) => {
    cleanupPrintMode();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `<img alt="Bill" src="${dataUrl}" />`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("is-printing-image");

    const img = overlay.querySelector("img");
    if (!(img instanceof HTMLImageElement)) {
      cleanupPrintMode();
      reject(new Error("Print image nahi bani"));
      return;
    }

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("afterprint", done);
      window.setTimeout(cleanupPrintMode, 300);
      resolve();
    };

    const go = () => {
      window.addEventListener("afterprint", done);
      window.setTimeout(() => window.print(), 80);
      window.setTimeout(done, 120000);
    };

    if (img.complete && img.naturalWidth > 0) {
      window.requestAnimationFrame(go);
    } else {
      img.onload = () => window.requestAnimationFrame(go);
      img.onerror = () => {
        cleanupPrintMode();
        reject(new Error("Bill image load nahi hui"));
      };
    }
  });
}

export async function printVisibleBill() {
  const jpeg = await captureSlipJpeg(576);
  await printJpegDataUrl(jpeg);
}

export async function printTestTicket() {
  const jpeg = ticketCanvas(["TM-m30 test print", new Date().toLocaleString("en-PK")]).toDataURL("image/jpeg", 0.92);
  await printJpegDataUrl(jpeg);
}
