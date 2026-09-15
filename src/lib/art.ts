export function tileArt(label: string, from: string, to: string) {
  const safe = label.replace(/[<>&'"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#g)"/>
  <circle cx="520" cy="70" r="140" fill="rgba(255,255,255,0.10)"/>
  <circle cx="80" cy="420" r="120" fill="rgba(0,0,0,0.10)"/>
  <text x="40" y="400" font-family="Georgia, serif" font-size="54" fill="rgba(255,255,255,0.92)">${safe}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
