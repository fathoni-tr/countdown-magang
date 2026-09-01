"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";

type Variant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "rectangle"
  | "hexagon"
  | "star";

// Titik dalam ruang satuan [-1,1]; diskalakan oleh radius lalu digeser ke (cx,cy).
const poly = (n: number, r2 = 1, rot = -Math.PI / 2): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return [Math.cos(a) * r2, Math.sin(a) * r2] as [number, number];
  });

const star = (): [number, number][] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r2 = i % 2 ? 0.45 : 1;
    return [Math.cos(a) * r2, Math.sin(a) * r2] as [number, number];
  });

const SHAPES: Record<Exclude<Variant, "circle">, [number, number][]> = {
  square: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  rectangle: [[-1.5, -0.85], [1.5, -0.85], [1.5, 0.85], [-1.5, 0.85]],
  diamond: poly(4),
  triangle: [[0, -1.2], [1.2, 1], [-1.2, 1]],
  hexagon: poly(6),
  star: star(),
};

const clip = (v: Variant, cx: number, cy: number, r: number) =>
  v === "circle"
    ? `circle(${r}px at ${cx}px ${cy}px)`
    : `polygon(${SHAPES[v]
        .map(([x, y]) => `${cx + x * r}px ${cy + y * r}px`)
        .join(", ")})`;

const Sun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
  </svg>
);

const Moon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export function AnimatedThemeToggler({
  className,
  variant = "circle",
  duration = 600,
  fromCenter = false,
}: {
  className?: string;
  variant?: Variant;
  duration?: number;
  fromCenter?: boolean;
}) {
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // Tema awal dipasang skrip di <head>; baca DOM agar tidak hydration mismatch.
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);

  const toggle = async () => {
    const swap = () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      setDark(next === "dark");
      store.set("theme", next);
    };

    // ponytail: tanpa View Transitions API (Firefox/Safari lama) tema tetap berganti,
    // hanya tanpa animasi. prefers-reduced-motion -> reveal singkat, bukan dimatikan.
    if (!document.startViewTransition || !ref.current) return swap();

    const t = document.startViewTransition(() => flushSync(swap));
    await t.ready;

    const b = ref.current.getBoundingClientRect();
    const cx = fromCenter ? innerWidth / 2 : b.left + b.width / 2;
    const cy = fromCenter ? innerHeight / 2 : b.top + b.height / 2;
    const r = Math.hypot(
      Math.max(cx, innerWidth - cx),
      Math.max(cy, innerHeight - cy),
    );
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : duration;

    document.documentElement.animate(
      { clipPath: [clip(variant, cx, cy, 0), clip(variant, cx, cy, r)] },
      {
        duration: ms,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  return (
    <button
      ref={ref}
      onClick={toggle}
      aria-label={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--fg)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        className,
      )}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
