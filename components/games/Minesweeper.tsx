"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MS_H,
  MS_MINES,
  MS_W,
  msEmpty,
  msFlag,
  msGenerate,
  msReveal,
  msWon,
  type MineCell,
} from "@/lib/games";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const BEST_KEY = "mines-best";

export default function Minesweeper() {
  // papan null = belum dimulai; ranjau hanya dipasang setelah klik pertama,
  // supaya sel pertama pemain selalu aman.
  const [grid, setGrid] = useState<MineCell[][] | null>(null);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [flags, setFlags] = useState(0);
  const [best, setBest] = useState(0);
  const [start, setStart] = useState(0);
  const [secs, setSecs] = useState(0);
  const cheered = useRef(false);

  useEffect(() => {
    setBest(Number(store.get(BEST_KEY)) || 0);
  }, []);

  // Timer berjalan hanya saat sedang main, bukan saat menang/kalah.
  useEffect(() => {
    if (!grid || dead || won) return;
    const id = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [grid, dead, won, start]);

  const reveal = useCallback(
    (r: number, c: number) => {
      if (dead || won) return;
      setGrid((g) => {
        // Klik pertama: pasang ranjau menjauhi sel ini.
        const base = g ?? msGenerate(r, c);
        const res = msReveal(base, r, c);
        if (res.dead) {
          setDead(true);
          return res.grid;
        }
        if (msWon(res.grid)) {
          setWon(true);
          if (!cheered.current) {
            cheered.current = true;
            const t = Math.floor((Date.now() - start) / 1000);
            void fire(false, () => {});
            setBest((b) => {
              // Skor = waktu tercepat; 0 berarti belum pernah menang.
              const nb = b === 0 ? t : Math.min(b, t);
              if (nb !== b) store.set(BEST_KEY, String(nb));
              return nb;
            });
          }
        }
        return res.grid;
      });
    },
    [dead, won, start],
  );

  const flag = useCallback(
    (e: React.MouseEvent, r: number, c: number) => {
      e.preventDefault();
      if (dead || won || !grid) return;
      setGrid((g) => {
        const ng = msFlag(g!, r, c);
        setFlags(ng.flat().filter((x) => x.flagged).length);
        return ng;
      });
    },
    [dead, won, grid],
  );

  const restart = useCallback(() => {
    setGrid(null);
    setDead(false);
    setWon(false);
    setFlags(0);
    setSecs(0);
    cheered.current = false;
  }, []);

  const cellText = (cell: MineCell): string =>
    !cell.revealed ? (cell.flagged ? "⚑" : "") : cell.mine ? "💣" : String(cell.adjacent || "");

  return (
    <div className="mines flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">
            Minesweeper
          </div>
          <div className="text-xs text-[var(--dim)]">
            {MS_MINES} ranjau · klik kanan untuk menandai
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Ranjau" value={MS_MINES - flags} />
          <Stat label="Detik" value={secs} />
          <Stat label="Rekor" value={best} />
        </div>
      </div>

      <div className="mines-board">
        {(grid ?? msEmpty()).map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => reveal(r, c)}
              onContextMenu={(e) => flag(e, r, c)}
              className={
                "mines-cell " +
                (cell.revealed
                  ? cell.mine
                    ? "mines-cell-mine"
                    : "mines-cell-open"
                  : "mines-cell-hidden")
              }
            >
              {cellText(cell)}
            </button>
          )),
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--dim)]">
        <span>
          {dead ? "Kena ranjau!" : won ? `Selesai dalam ${secs} detik!` : "Buka semua sel aman"}
        </span>
        <button
          type="button"
          onClick={restart}
          className="underline underline-offset-4 hover:text-[var(--fg)]"
        >
          Ulang
        </button>
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
