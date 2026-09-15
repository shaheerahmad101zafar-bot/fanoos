"use client";

import { useEffect, useRef, useState } from "react";
import { cropImage, loadImage } from "@/lib/image";
import { Button } from "@/components/ui";

export function ImageCropper({
  src,
  aspect = 4 / 3,
  onApply,
  onCancel,
}: {
  src: string;
  aspect?: number;
  onApply: (dataUrl: string) => void;
  onCancel?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [imgAspect, setImgAspect] = useState(aspect);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    loadImage(src)
      .then((img) => setImgAspect(img.width / img.height || aspect))
      .catch(() => {});
  }, [src, aspect]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - drag.current.x) / Math.max(1, rect.width / 2);
    const dy = (e.clientY - drag.current.y) / Math.max(1, rect.height / 2);
    setOffset({
      x: Math.max(-1, Math.min(1, drag.current.ox + dx)),
      y: Math.max(-1, Math.min(1, drag.current.oy + dy)),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function apply() {
    setBusy(true);
    try {
      onApply(await cropImage(src, { aspect, zoom, offsetX: offset.x, offsetY: offset.y }));
    } finally {
      setBusy(false);
    }
  }

  const wide = imgAspect >= aspect;
  const widthPct = (wide ? (imgAspect / aspect) * zoom : zoom) * 100;
  const heightPct = (wide ? zoom : (aspect / imgAspect) * zoom) * 100;
  const shiftX = widthPct > 100 ? offset.x * (1 - 100 / widthPct) * 50 : 0;
  const shiftY = heightPct > 100 ? offset.y * (1 - 100 / heightPct) * 50 : 0;

  return (
    <div className="grid gap-3">
      <div
        ref={frameRef}
        className="relative cursor-grab overflow-hidden rounded-[22px] bg-parchment touch-none active:cursor-grabbing"
        style={{ aspectRatio: `${aspect}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
          style={{
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            transform: `translate(calc(-50% + ${shiftX}%), calc(-50% + ${shiftY}%))`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-2 ring-inset ring-white/70" />
      </div>
      <label className="grid gap-1 text-sm">
        <span className="flex justify-between text-muted">
          <span>Zoom</span>
          <span>{zoom.toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-ember"
        />
      </label>
      <p className="text-xs text-muted">Photo auto-fits the card. Drag to move, zoom to crop tighter.</p>
      <div className="flex gap-2">
        <Button
          type="button"
          tone="ghost"
          className="flex-1"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Auto fit
        </Button>
        {onCancel ? (
          <Button type="button" tone="ghost" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" className="flex-1" disabled={busy} onClick={apply}>
          {busy ? "Saving…" : "Use photo"}
        </Button>
      </div>
    </div>
  );
}
