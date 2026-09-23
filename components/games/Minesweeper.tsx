"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MS_LEVELS,
  msChord,
  msEmpty,
  msFlag,
  msGenerate,
  msLevelOf,
  msReveal,
  msWon,
  type MineCell,
  type MsLevel,
} from "@/lib/games";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const LEVEL_KEY = "mines-level";
const BEST_KEY = "mines-best";
// Tekan-lama dianggap penanda. 350 ms cukup lama supaya ketuk biasa tidak
// kena, tapi masih terasa responsif.
const LONG_PRESS_MS = 350;

/** 65 -> "1:05". Menit tidak dipotong di 60, jadi 3725 -> "62:05". */
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Rekor per level disimpan satu string: "pemula:42,ahli:120". */
function readBest(id: string): number {
  const hit = (store.get(BEST_KEY) ?? "").split(",").find((p) => p.startsWith(id + ":"));
  return hit ? Number(hit.slice(id.length + 1)) || 0 : 0;
}

function writeBest(id: string, secs: number): void {
  const map = new Map(
    (store.get(BEST_KEY) ?? "")
      .split(",")
      .filter(Boolean)
      .map((p) => p.split(":") as [string, string]),
  );
  map.set(id, String(secs));
  store.set(BEST_KEY, [...map].map(([k, v]) => `${k}:${v}`).join(","));
}

export default function Minesweeper() {
  const [level, setLevel] = useState<MsLevel>(() => msLevelOf(store.get(LEVEL_KEY)));
  const [grid, setGrid] = useState<MineCell[][] | null>(null);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [flags, setFlags] = useState(0);
  const [best, setBest] = useState(0);
  const [secs, setSecs] = useState(0);
  // null = belum mulai. Angka ini juga jadi titik nol timer, jadi detik
  // dihitung sejak klik pertama -- bukan sejak halaman dibuka.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const cheered = useRef(false);
  // iOS Safari tidak mengirim contextmenu saat tekan-lama, jadi tekan-lama
  // diurus sendiri lewat pointer event.
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Menahan klik susulan setelah tekan-lama sudah menangani selnya.
  const suppress = useRef(false);

  useEffect(() => setBest(readBest(level.id)), [level]);

  // Timer berhenti saat menang atau kena ranjau.
  useEffect(() => {
    if (startedAt === null || dead || won) return;
    const id = setInterval(() => setSecs(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt, dead, won]);

  const apply = useCallback(
    (res: { grid: MineCell[][]; dead: boolean }, started: number | null) => {
      setGrid(res.grid);
      setFlags(res.grid.flat().filter((x) => x.flagged).length);
      if (res.dead) {
        // Waktu dibekukan di detik kematian, bukan di tik terakhir -- bisa
        // lewat hampir satu detik kalau kena tepat setelah tik.
        if (started !== null) setSecs(Math.floor((Date.now() - started) / 1000));
        return setDead(true);
      }
      if (msWon(res.grid) && !cheered.current) {
        cheered.current = true;
        setWon(true);
        const t = started === null ? 0 : Math.floor((Date.now() - started) / 1000);
        setSecs(t);
        void fire(false, () => {});
        setBest((b) => {
          const nb = b === 0 ? t : Math.min(b, t);
          if (nb !== b) writeBest(level.id, nb);
          return nb;
        });
      }
    },
    [level],
  );

  const tap = useCallback(
    (r: number, c: number) => {
      if (dead || won) return;
      if (!grid) {
        // Klik pertama: ranjau dipasang menjauhi sel ini, timer mulai dari nol.
        const now = Date.now();
        setStartedAt(now);
        apply(msReveal(msGenerate(level, r, c), r, c), now);
        return;
      }
      const cell = grid[r][c];
      // Angka yang sudah terbuka -> chord (buka sekitarnya). Kotak tertutup -> buka.
      apply(cell.revealed ? msChord(grid, r, c) : msReveal(grid, r, c), startedAt);
    },
    [dead, won, grid, level, startedAt, apply],
  );

  const flagAt = useCallback(
    (r: number, c: number) => {
      if (dead || won || !grid) return;
      const ng = msFlag(grid, r, c);
      setGrid(ng);
      setFlags(ng.flat().filter((x) => x.flagged).length);
    },
    [dead, won, grid],
  );

  /** Klik kanan DAN tekan-lama mendarat di sini. */
  const longPress = useCallback(
    (r: number, c: number) => {
      suppress.current = true;
      if (grid?.[r]?.[c].revealed) tap(r, c); // chord
      else flagAt(r, c); // tandai
    },
    [grid, tap, flagAt],
  );

  const endHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  const reset = useCallback((lv: MsLevel) => {
    setGrid(null);
    setDead(false);
    setWon(false);
    setFlags(0);
    setSecs(0);
    setStartedAt(null);
    cheered.current = false;
    setBest(readBest(lv.id));
  }, []);

  const goTo = (lv: MsLevel) => {
    setLevel(lv);
    store.set(LEVEL_KEY, lv.id);
    reset(lv);
  };

  const i = MS_LEVELS.indexOf(level);
  const view = grid ?? msEmpty(level);
  const stop = dead || won;

  return (
    // relative: jangkar overlay "Main lagi" saat kena ranjau.
    <div className="mines relative flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">
            Minesweeper
          </div>
          <div className="text-xs text-[var(--dim)]">
            Ketuk buka · tahan atau klik kanan tandai · ketuk angka buka sekitarnya
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Ranjau" value={level.mines - flags} />
          <Stat label="Waktu" value={fmtTime(secs)} />
          <Stat label="Rekor" value={best ? fmtTime(best) : "—"} />
        </div>
      </div>

      <div className="mines-scroll">
        <div
          className={"mines-board" + (dead ? " mines-boom" : "")}
          style={{ "--ms-n": level.w } as React.CSSProperties}
        >
          {view.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                // Papan mati: sel tidak lagi interaktif, jadi Tab tidak
                // menyusuri 81 tombol mati sebelum sampai ke "Main lagi".
                disabled={stop}
                onPointerDown={(e) => {
                  if (e.button !== 0) return; // klik kanan diurus onContextMenu
                  suppress.current = false;
                  hold.current = setTimeout(() => longPress(r, c), LONG_PRESS_MS);
                }}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
                onContextMenu={(e) => {
                  e.preventDefault();
                  endHold();
                  longPress(r, c);
                }}
                onClick={() => {
                  if (suppress.current) {
                    suppress.current = false;
                    return;
                  }
                  tap(r, c);
                }}
                className={
                  "mines-cell " +
                  // Kena ranjau: semua ranjau dibuka, tidak cuma yang kena.
                  (cell.revealed || (dead && cell.mine)
                    ? cell.mine
                      ? "mines-cell-mine"
                      : "mines-cell-open"
                    : "mines-cell-hidden")
                }
              >
                {!cell.revealed && !(dead && cell.mine)
                  ? cell.flagged
                    ? "⚑"
                    : ""
                  : cell.mine
                    ? "💣"
                    : cell.adjacent
                      ? String(cell.adjacent)
                      : ""}
              </button>
            )),
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[var(--dim)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(MS_LEVELS[i - 1])}
            disabled={i <= 0}
            aria-label="Level sebelumnya"
            className="px-1 hover:text-[var(--fg)] disabled:opacity-30"
          >
            ‹
          </button>
          <span className="font-display uppercase tracking-wider text-[var(--fg)]">
            {level.name}
          </span>
          <button
            type="button"
            onClick={() => goTo(MS_LEVELS[i + 1])}
            disabled={i >= MS_LEVELS.length - 1}
            aria-label="Level berikutnya"
            className="px-1 hover:text-[var(--fg)] disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span>{won ? `Selesai dalam ${fmtTime(secs)}!` : ""}</span>
          <button
            type="button"
            onClick={() => reset(level)}
            className="underline underline-offset-4 hover:text-[var(--fg)]"
          >
            Ulang
          </button>
        </div>
      </div>

      {dead && (
        <div
          role="alert"
          className="absolute inset-0 z-20 grid place-content-center gap-3 rounded-xl bg-[var(--card)]/85 backdrop-blur-sm"
        >
          <p className="font-display text-xl uppercase tracking-[0.14em] text-[var(--fg)]">
            Kena ranjau!
          </p>
          <p className="text-xs text-[var(--dim)]">
            Waktu {fmtTime(secs)} · {level.name}
          </p>
          <button
            type="button"
            onClick={() => reset(level)}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--bg)]"
          >
            Main lagi
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-14 rounded-lg border border-[var(--line)] px-2 py-1 text-center">
      <div className="text-[0.6rem] uppercase tracking-wider text-[var(--dim)]">{label}</div>
      <div className="font-display text-sm tabular-nums text-[var(--fg)]">{value}</div>
    </div>
  );
}
