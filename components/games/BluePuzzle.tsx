"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const LEVEL_KEY = "bluepuzzle-level";
const BEST_KEY = "bluepuzzle-best";

// Level N → (N+2)×(N+2) grid. Level 1 = 3×3, level 8 = 10×10.
const gridSize = (level: number) => level + 2;

const ADJ: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

function flip(grid: boolean[][], r: number, c: number): boolean[][] {
  const n = grid.length;
  const next = grid.map((row) => [...row]);
  for (const [dr, dc] of ADJ) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n) next[nr][nc] = !next[nr][nc];
  }
  return next;
}

function scramble(n: number): boolean[][] {
  // Mulai dari semua biru (sudah menang), lalu klik acak → selalu bisa diselesaikan.
  let g: boolean[][] = Array.from({ length: n }, () => Array(n).fill(true));
  const moves = Math.floor(n * n * 0.45) + Math.floor(Math.random() * n * 2) + 1;
  for (let i = 0; i < moves; i++) {
    g = flip(g, Math.floor(Math.random() * n), Math.floor(Math.random() * n));
  }
  // Pastikan belum menang di awal.
  if (g.flat().every(Boolean)) g = flip(g, 0, 0);
  return g;
}

export default function BluePuzzle() {
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<boolean[][]>(() => scramble(gridSize(1)));
  const [clicks, setClicks] = useState(0);
  const [best, setBest] = useState(0);
  const cheered = useRef(false);

  useEffect(() => {
    const lv = Math.max(1, Number(store.get(LEVEL_KEY)) || 1);
    const bst = Number(store.get(BEST_KEY)) || 0;
    setBest(bst);
    if (lv !== 1) { setLevel(lv); setGrid(scramble(gridSize(lv))); }
  }, []);

  const won = useMemo(() => grid.flat().every(Boolean), [grid]);

  useEffect(() => {
    if (!won || cheered.current) return;
    cheered.current = true;
    void fire(false, () => {});
    if (level > best) { setBest(level); store.set(BEST_KEY, String(level)); }
  }, [won, level, best]);

  const handleClick = useCallback((r: number, c: number) => {
    if (won) return;
    setGrid((g) => flip(g, r, c));
    setClicks((k) => k + 1);
  }, [won]);

  const restart = () => {
    setGrid(scramble(gridSize(level)));
    setClicks(0);
    cheered.current = false;
  };

  // Level yang boleh dimainkan: semua yang sudah selesai + satu level berikutnya.
  const maxLevel = Math.max(best + 1, level);

  const goTo = (lv: number) => {
    if (lv < 1 || lv > maxLevel) return;
    setLevel(lv);
    setGrid(scramble(gridSize(lv)));
    setClicks(0);
    cheered.current = false;
    store.set(LEVEL_KEY, String(lv));
  };

  const n = gridSize(level);

  return (
    <div className="bluepuzzle flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">Blue Puzzle</div>
          <div className="text-xs text-[var(--dim)]">Jadikan semua kotak biru</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(level - 1)}
            disabled={level <= 1}
            aria-label="Level sebelumnya"
            className="px-1 text-[var(--dim)] hover:text-[var(--fg)] disabled:opacity-30"
          >
            ‹
          </button>
          <Stat label="Level" value={level} />
          <button
            type="button"
            onClick={() => goTo(level + 1)}
            disabled={level >= maxLevel}
            aria-label="Level berikutnya"
            className="px-1 text-[var(--dim)] hover:text-[var(--fg)] disabled:opacity-30"
          >
            ›
          </button>
          <Stat label="Langkah" value={clicks} />
          <Stat label="Terbaik" value={best} />
        </div>
      </div>

      <div
        className="bluepuzzle-board"
        style={{ "--bp-n": n } as React.CSSProperties}
      >
        {grid.map((row, r) =>
          row.map((blue, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleClick(r, c)}
              className={"bluepuzzle-cell " + (blue ? "bluepuzzle-cell-blue" : "bluepuzzle-cell-orange")}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--dim)]">
        <span>{won ? "Level selesai!" : "Klik kotak untuk membalik warnanya"}</span>
        <div className="flex gap-3">
          <button onClick={restart} className="underline underline-offset-4 hover:text-[var(--fg)]">
            Ulang
          </button>
          {won && (
            <button onClick={() => goTo(level + 1)} className="underline underline-offset-4 text-[var(--accent)] hover:text-[var(--fg)]">
              Level berikutnya
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-14 rounded-lg border border-[var(--line)] px-2 py-1 text-center">
      <div className="text-[0.6rem] uppercase tracking-wider text-[var(--dim)]">{label}</div>
      <div className="font-display text-sm tabular-nums text-[var(--fg)]">{value}</div>
    </div>
  );
}
