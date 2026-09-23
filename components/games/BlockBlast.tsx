"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BB_SIZE,
  bbCanPlace,
  bbPiece,
  bbPlace,
  bbRotate,
  type Piece,
} from "@/lib/games";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const BEST_KEY = "blockblast-best";
// ponytail: tiga keping per giliran, gaya 1010!/Block Blast.
const HAND = 3;

export default function BlockBlast() {
  const [board, setBoard] = useState<(0 | 1)[][]>(() =>
    Array.from({ length: BB_SIZE }, () => Array<0 | 1>(BB_SIZE).fill(0)),
  );
  const [hand, setHand] = useState<Piece[]>(() => [bbPiece(), bbPiece(), bbPiece()]);
  const [sel, setSel] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const cheered = useRef(false);

  useEffect(() => {
    setBest(Number(store.get(BEST_KEY)) || 0);
  }, []);

  /** Giliran baru: isi tangan yang sudah habis, cek game over. */
  const refill = useCallback((b: (0 | 1)[][], h: Piece[]) => {
    const nh = h.map((p) => p ?? bbPiece());
    setHand(nh);
    setOver(!nh.some((p) => bbCanPlace(b, p.cells)));
  }, []);

  const place = useCallback(
    (r: number, c: number) => {
      if (over) return;
      const p = hand[sel];
      if (!p) return;
      const res = bbPlace(board, p.cells, r, c);
      if (!res) return;

      // Tandai sel yang dihapus sebentar supaya animasi terlihat sebelum hilang.
      if (res.cleared.length) {
        const key = new Set(res.cleared.map(([rr, cc]) => `${rr}-${cc}`));
        setCleared(key);
        setTimeout(() => setCleared(new Set()), 260);
      }

      const nh = hand.map((p2, i) => (i === sel ? (null as unknown as Piece) : p2));
      setBoard(res.board);
      setScore((s) => {
        const total = s + res.gained;
        setBest((b) => {
          if (total > b) {
            store.set(BEST_KEY, String(total));
            return total;
          }
          return b;
        });
        return total;
      });
      setSel(0);
      refill(res.board, nh);

      if (res.lines >= 2 && !cheered.current) {
        cheered.current = true;
        void fire(false, () => {});
      }
    },
    [board, hand, sel, over, refill],
  );

  const rotate = useCallback(() => {
    const p = hand[sel];
    if (!p) return;
    setHand((h) => h.map((q, i) => (i === sel ? { ...q, cells: bbRotate(q.cells) } : q)));
  }, [hand, sel]);

  const restart = useCallback(() => {
    const b = Array.from({ length: BB_SIZE }, () => Array<0 | 1>(BB_SIZE).fill(0));
    setBoard(b);
    setHand([bbPiece(), bbPiece(), bbPiece()]);
    setScore(0);
    setSel(0);
    setOver(false);
    cheered.current = false;
  }, []);

  // Hover preview: posisi tempat keping akan mendarat, valid atau tidak.
  const [hover, setHover] = useState<[number, number] | null>(null);
  const preview = useCallback(
    (r: number, c: number) => {
      const p = hand[sel];
      if (!p) return false;
      return p.cells.every(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        return (
          rr >= 0 && rr < BB_SIZE && cc >= 0 && cc < BB_SIZE && board[rr][cc] === 0
        );
      });
    },
    [hand, sel, board],
  );

  return (
    <div className="blockblast flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">
            Block Blast
          </div>
          <div className="text-xs text-[var(--dim)]">Isi baris atau kolom sampai penuh</div>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Skor" value={score} />
          <Stat label="Terbaik" value={best} />
        </div>
      </div>

      <div className="blockblast-board">
        {board.map((row, r) =>
          row.map((v, c) => {
            const key = `${r}-${c}`;
            const inPreview =
              hover &&
              hand[sel]?.cells.some(([dr, dc]) => r === hover[0] + dr && c === hover[1] + dc);
            return (
              <button
                key={key}
                type="button"
                onClick={() => place(r, c)}
                onMouseEnter={() => setHover([r, c])}
                onMouseLeave={() => setHover(null)}
                className={
                  "blockblast-cell " +
                  (v
                    ? cleared.has(key)
                      ? "blockblast-cell-clear"
                      : "blockblast-cell-on"
                    : inPreview
                      ? "blockblast-cell-preview"
                      : "")
                }
              />
            );
          }),
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {hand.map((p, i) => (
            <button
              key={p?.id ?? `empty-${i}`}
              type="button"
              onClick={() => p && setSel(i)}
              disabled={!p}
              aria-label={`Keping ${i + 1}${p ? "" : " (sudah dipakai)"}`}
              className={
                "blockblast-tray " + (i === sel ? "blockblast-tray-sel" : "")
              }
            >
              {p ? (
                <span className="blockblast-mini">
                  {p.cells.map(([r, c]) => (
                    <span
                      key={`${r}-${c}`}
                      style={{ gridRow: r + 1, gridColumn: c + 1 }}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={rotate}
            disabled={over || !hand[sel]}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--fg)] transition hover:border-[var(--accent)] disabled:opacity-30"
          >
            Putar
          </button>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--fg)] transition hover:border-[var(--accent)]"
          >
            Ulang
          </button>
        </div>
      </div>

      {over && (
        <p className="text-center text-sm text-[var(--dim)]">
          Tidak ada keping yang muat lagi. Skor {score}.{" "}
          <button
            type="button"
            onClick={restart}
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Main lagi
          </button>
        </p>
      )}
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
