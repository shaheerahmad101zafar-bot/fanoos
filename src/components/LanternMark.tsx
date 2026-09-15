export function LanternMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M20 18h24l3 8H17l3-8Z" fill="#D4B36A" />
      <path d="M18 26h28v22c0 6-6 10-14 10s-14-4-14-10V26Z" fill="#2A2118" />
      <path d="M24 30h16v14c0 3-3 6-8 6s-8-3-8-6V30Z" fill="#E24A16" />
      <path d="M28 34h8v8c0 1.4-1.6 3-4 3s-4-1.6-4-3v-8Z" fill="#F4A261" />
      <rect x="29" y="8" width="6" height="10" rx="2" fill="#D4B36A" />
      <path d="M18 48h28" stroke="#D4B36A" strokeWidth="2" />
    </svg>
  );
}
