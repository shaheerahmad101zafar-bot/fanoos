export function id(prefix = "") {
  const raw = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12) || String(Date.now());
  return prefix ? `${prefix}_${raw}` : raw;
}
