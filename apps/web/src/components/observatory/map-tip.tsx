"use client";

/** Shared pieces of the map plates: the text factor --k and the ink tooltip. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";

/** Sets --k = viewBox width / rendered width on the <svg> (no re-render), and reports the width. */
export function useTextScale(viewBoxWidth: number, onResize?: (k: number) => void) {
  const ref = useRef<SVGSVGElement>(null);
  const cb = useRef(onResize);
  useEffect(() => {
    cb.current = onResize;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      const k = Math.round((viewBoxWidth / w) * 1000) / 1000;
      el.style.setProperty("--k", String(k));
      cb.current?.(k);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewBoxWidth]);
  return ref;
}

/* ── ink tooltip: "NGA · WAPP" first line, then the name and the values ───────────────── */
type Active = { key: string; x: number; y: number; focus: boolean };

/** Tooltip state for a map. Handlers are stable and read the country from the element's
 *  `data-key`; `anchor` gives the viewBox point a keyboard-focused country's tooltip hangs from. */
export function useMapTip(anchor?: (key: string) => [number, number] | undefined, vbWidth = 1) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const anchorRef = useRef(anchor);
  useEffect(() => {
    anchorRef.current = anchor;
  });
  const [active, setActive] = useState<Active | null>(null);

  const place = useCallback(() => {
    const wrap = wrapRef.current, tip = tipRef.current;
    if (!wrap || !tip) return;
    const { x, y } = pos.current;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const right = x > w * 0.58, above = y > h * 0.62;
    tip.style.left = right ? "auto" : `${Math.round(x + 14)}px`;
    tip.style.right = right ? `${Math.round(w - x + 14)}px` : "auto";
    tip.style.top = above ? "auto" : `${Math.round(y + 14)}px`;
    tip.style.bottom = above ? `${Math.round(h - y + 10)}px` : "auto";
  }, []);
  useEffect(() => {
    if (active) place();
  }, [active, place]);

  const handlers = useMemo(() => {
    const keyOf = (e: { currentTarget: Element }) => e.currentTarget.getAttribute("data-key") ?? "";
    const fromPointer = (e: MouseEvent<Element>) => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (r) pos.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    return {
      onMouseEnter: (e: MouseEvent<Element>) => {
        const key = keyOf(e);
        fromPointer(e);
        setActive((a) => (a && a.key === key && !a.focus ? a : { key, ...pos.current, focus: false }));
      },
      onMouseMove: (e: MouseEvent<Element>) => {
        fromPointer(e);
        place();
      },
      onMouseLeave: () => setActive((a) => (a && !a.focus ? null : a)),
      /** keyboard focus: hang the tooltip from the country's centroid */
      onFocus: (e: FocusEvent<Element>) => {
        const key = keyOf(e);
        const wrap = wrapRef.current;
        const at = anchorRef.current?.(key);
        if (!wrap || !at) return;
        const s = wrap.clientWidth / vbWidth;
        pos.current = { x: at[0] * s, y: at[1] * s };
        const visible = e.currentTarget.matches?.(":focus-visible") ?? true;
        setActive({ key, ...pos.current, focus: visible });
      },
      onBlur: () => setActive(null),
    };
  }, [place, vbWidth]);
  return { wrapRef, tipRef, active, handlers };
}

export function InkTip({ tipRef, code, name, lines }: { tipRef: React.RefObject<HTMLDivElement | null>; code: string; name: string; lines: string[] }) {
  return (
    <div
      ref={tipRef}
      role="presentation"
      className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-sm bg-foreground px-[9px] py-[5px] text-[12.5px] leading-[1.4] text-card"
    >
      <span className="block text-[11px] font-semibold tracking-[0.06em] text-on-ink-muted">{code}</span>
      <span className="block font-semibold">{name}</span>
      {lines.map((l, i) => (
        <span key={i} className="block tabular-nums">
          {l}
        </span>
      ))}
    </div>
  );
}

