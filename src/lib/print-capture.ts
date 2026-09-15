const COLOR_FN = /oklab|oklch|lab\(|lch\(|color-mix|color\(/i;

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function srgbCompand(c: number) {
  const sign = c < 0 ? -1 : 1;
  const abs = Math.abs(c);
  const mag = abs <= 0.0031308 ? 12.92 * abs : 1.055 * abs ** (1 / 2.4) - 0.055;
  return sign * mag;
}

function oklabToCss(L: number, a: number, b: number, alpha = 1) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r = clampByte(srgbCompand(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255);
  const g = clampByte(srgbCompand(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255);
  const bl = clampByte(srgbCompand(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s) * 255);
  return alpha < 0.999 ? `rgba(${r}, ${g}, ${bl}, ${Math.max(0, Math.min(1, alpha))})` : `rgb(${r}, ${g}, ${bl})`;
}

function parseChannel(token: string, kind: "l" | "ab" | "c" | "alpha") {
  const t = token.trim();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 0;
  const pct = t.includes("%");
  if (kind === "alpha") return pct ? n / 100 : n;
  if (kind === "l") return pct ? n / 100 : n > 1.5 ? n / 100 : n;
  if (kind === "c") return pct ? (n / 100) * 0.4 : n;
  return pct ? (n / 100) * 0.4 : n;
}

function parseHue(token: string) {
  const t = token.trim().toLowerCase();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 0;
  if (t.includes("turn")) return n * 360;
  if (t.includes("rad")) return (n * 180) / Math.PI;
  if (t.includes("grad")) return n * 0.9;
  return n;
}

function fnArgs(fn: string) {
  const inner = fn.slice(fn.indexOf("(") + 1, fn.lastIndexOf(")")).trim();
  const [main, alphaRaw] = inner.split("/");
  const parts = main.trim().split(/[\s,]+/).filter(Boolean);
  const alpha = alphaRaw == null ? 1 : parseChannel(alphaRaw, "alpha");
  return { parts, alpha };
}

function parseCssColorFn(fn: string) {
  const name = fn.slice(0, fn.indexOf("(")).trim().toLowerCase();
  const { parts, alpha } = fnArgs(fn);
  if ((name === "oklab" || name === "lab") && parts.length >= 3) {
    const L = parseChannel(parts[0], "l");
    const a = parseChannel(parts[1], "ab");
    const b = parseChannel(parts[2], "ab");
    return oklabToCss(L, a, b, alpha);
  }
  if ((name === "oklch" || name === "lch") && parts.length >= 3) {
    const L = parseChannel(parts[0], "l");
    const C = parseChannel(parts[1], "c");
    const h = (parseHue(parts[2]) * Math.PI) / 180;
    return oklabToCss(L, C * Math.cos(h), C * Math.sin(h), alpha);
  }
  return "";
}

function canvasFill(value: string) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#111111";
    ctx.fillStyle = value;
    const out = String(ctx.fillStyle);
    if (!out || COLOR_FN.test(out)) return "";
    return out;
  } catch {
    return "";
  }
}

function cssToRgb(value: string) {
  const raw = value.trim();
  if (!raw || raw === "none" || raw === "transparent") return raw;
  if (!COLOR_FN.test(raw) && !raw.includes("color(")) return raw;
  const whole = parseCssColorFn(raw) || canvasFill(raw);
  if (whole && !COLOR_FN.test(whole)) return whole;
  return replaceColorFunctions(raw);
}

function replaceColorFunctions(css: string) {
  const names = ["color-mix", "oklab", "oklch", "lab", "lch", "color"];
  let out = css;
  for (const name of names) {
    const needle = `${name}(`;
    let idx = 0;
    while (idx < out.length) {
      const found = out.toLowerCase().indexOf(needle, idx);
      if (found < 0) break;
      let i = found + needle.length;
      let depth = 1;
      while (i < out.length && depth > 0) {
        if (out[i] === "(") depth += 1;
        else if (out[i] === ")") depth -= 1;
        i += 1;
      }
      const fn = out.slice(found, i);
      const converted = parseCssColorFn(fn) || canvasFill(fn) || "#111111";
      out = `${out.slice(0, found)}${converted}${out.slice(i)}`;
      idx = found + converted.length;
    }
  }
  return out;
}

function flattenElement(el: Element, view: Window) {
  const style = (el as HTMLElement).style;
  if (!style) return;
  const cs = view.getComputedStyle(el);
  for (let i = 0; i < cs.length; i += 1) {
    const prop = cs.item(i);
    const val = cs.getPropertyValue(prop);
    if (!val || (!COLOR_FN.test(val) && !val.includes("color("))) continue;
    try {
      style.setProperty(prop, cssToRgb(val), cs.getPropertyPriority(prop));
    } catch {
      // ignore read-only properties
    }
  }
  style.color = cssToRgb(cs.color) || "#120e0a";
  const bg = cssToRgb(cs.backgroundColor);
  if (bg && bg !== "none") style.backgroundColor = bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? "transparent" : bg;
  style.borderTopColor = cssToRgb(cs.borderTopColor);
  style.borderRightColor = cssToRgb(cs.borderRightColor);
  style.borderBottomColor = cssToRgb(cs.borderBottomColor);
  style.borderLeftColor = cssToRgb(cs.borderLeftColor);
  style.outlineColor = cssToRgb(cs.outlineColor);
  style.boxShadow = "none";
  style.textShadow = "none";
  style.filter = "none";
  style.textDecorationColor = cssToRgb(cs.textDecorationColor);
  style.setProperty("-webkit-text-stroke-color", cssToRgb(cs.getPropertyValue("-webkit-text-stroke-color") || "transparent"));
  style.backgroundImage = "none";
  if (COLOR_FN.test(cs.backgroundImage) || cs.backgroundImage.includes("color(")) {
    style.backgroundImage = "none";
  }
  if (el.namespaceURI === "http://www.w3.org/2000/svg") {
    const fill = cs.fill;
    const stroke = cs.stroke;
    if (fill && fill !== "none") el.setAttribute("fill", cssToRgb(fill));
    if (stroke && stroke !== "none") el.setAttribute("stroke", cssToRgb(stroke));
  }
}

function asHtml(el: Element | null | undefined): HTMLElement | null {
  if (!el || !("style" in el)) return null;
  return el as HTMLElement;
}

export function preparePrintClone(doc: Document, root?: Element | null) {
  const view = doc.defaultView;
  if (!view) return;
  for (const node of Array.from(doc.querySelectorAll("style"))) {
    if (node.textContent) node.textContent = replaceColorFunctions(node.textContent);
  }
  if (doc.documentElement) flattenElement(doc.documentElement, view);
  if (doc.body) {
    doc.body.style.color = "#120e0a";
    doc.body.style.backgroundColor = "#ffffff";
    flattenElement(doc.body, view);
  }
  const target = asHtml(root) || asHtml(doc.querySelector(".invoice-slip")) || asHtml(doc.body);
  if (!target) return;
  target.style.transform = "none";
  target.style.opacity = "1";
  target.style.visibility = "visible";
  target.style.position = "static";
  target.style.maxHeight = "none";
  target.style.overflow = "visible";
  target.style.boxShadow = "none";
  target.style.borderRadius = "0";
  target.style.backgroundColor = "#ffffff";
  target.style.color = "#120e0a";
  target.style.maxWidth = "none";
  if (target.classList.contains("is-thermal-print")) {
    target.style.padding = "4px 8px 6px";
    target.style.margin = "0";
    target.style.border = "none";
    target.style.width = target.style.width || "576px";
  }
  const nodes = [target, ...Array.from(target.querySelectorAll("*"))];
  for (const node of nodes) flattenElement(node, view);
}

export function trimCanvas(canvas: HTMLCanvasElement, pad = 6) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const ink = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    return lum < 242 && data[i + 3] > 20;
  };
  let top = 0;
  let bottom = height - 1;
  findTop: for (; top < height; top += 1) {
    for (let x = 0; x < width; x += 1) if (ink(x, top)) break findTop;
  }
  findBottom: for (; bottom > top; bottom -= 1) {
    for (let x = 0; x < width; x += 1) if (ink(x, bottom)) break findBottom;
  }
  const y0 = Math.max(0, top - pad);
  const y1 = Math.min(height - 1, bottom + pad);
  const nextH = y1 - y0 + 1;
  if (nextH <= 0 || nextH >= height - 2) return canvas;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = nextH;
  const next = out.getContext("2d");
  if (!next) return canvas;
  next.fillStyle = "#ffffff";
  next.fillRect(0, 0, width, nextH);
  next.drawImage(canvas, 0, y0, width, nextH, 0, 0, width, nextH);
  return out;
}

export async function captureElementCanvas(el: HTMLElement, targetWidth: number) {
  const html2canvas = (await import("html2canvas")).default;
  const source = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 8000,
    foreignObjectRendering: false,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    width: Math.ceil(el.scrollWidth || el.offsetWidth),
    height: Math.ceil(el.scrollHeight || el.offsetHeight),
    windowWidth: Math.ceil(el.scrollWidth || el.offsetWidth),
    windowHeight: Math.ceil(el.scrollHeight || el.offsetHeight),
    onclone: (doc, clone) => {
      preparePrintClone(doc, clone || doc.querySelector(".invoice-slip"));
    },
  });
  const height = Math.max(64, Math.round((source.height * targetWidth) / source.width));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Print image nahi bani");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, height);
  ctx.drawImage(source, 0, 0, targetWidth, height);
  return trimCanvas(canvas);
}
