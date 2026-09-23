"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BB_SIZE,
  bbCanPlace,
  bbEmpty,
  bbPiece,
  bbPlace,
  bbRotate,
  type Piece,
} from "@/lib/games";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const BEST_KEY = "blockblast-best";

/** Durasi animasi ledakan, ikut combo. Dipasang juga sebagai --bb-clear-dur di
    globals.css supaya CSS dan timeout pembersih tidak bisa berbeda. */
const clearDur = (combo: number) => 200 + Math.min(combo, 6) * 25;
/** +20 ms kelonggaran: kelasnya dilepas SETELAH animasi selesai, bukan di tengah. */
const clearMs = (combo: number) => clearDur(combo) + 20;

/** Slot kosong = keping sudah dipakai, menunggu giliran berikutnya. */
type Slot = Piece | null;

export default function BlockBlast() {
  const [board, setBoard] = useState<number[][]>(() => bbEmpty());
  const [hand, setHand] = useState<Slot[]>(() => [bbPiece(), bbPiece(), bbPiece()]);
  const [sel, setSel] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  // key sel -> warna keping yang barusan terhapus. bbPlace sudah mengosongkan
  // sel itu di papan, jadi warnanya wajib disimpan di sini; kalau tidak, tidak
  // ada yang bisa dianimasikan (nilai 0 tidak dirender sama sekali).
  const [cleared, setCleared] = useState<Map<string, number>>(new Map());
  // Combo: berapa kali beruntun peletakan menghapus baris/kolom. Hanya untuk
  // efek -- skor tetap dihitung bbPlace. Peletakan tanpa hapus memutus rantai.
  const [combo, setCombo] = useState(0);
  // Nomor ledakan. Dipakai sebagai key lapisan efek supaya animasinya diputar
  // ulang; kalau papannya yang di-remount, semua sel ikut berkedip.
  const [boom, setBoom] = useState(0);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<{ i: number; r: number; c: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cheered = useRef(false);
  // Penjaga: timeout pembersih dari ledakan lama tidak boleh menghapus efek
  // yang baru saja dipasang.
  const fxId = useRef(0);

  useEffect(() => {
    setBest(Number(store.get(BEST_KEY)) || 0);
  }, []);

  /**
   * Sel di bawah titik layar. Dihitung dari geometri papan, BUKAN
   * elementFromPoint -- elemen yang dikembalikan justru keping yang sedang
   * diseret sendiri. Rumusnya harus cocok dengan --bb-cell di globals.css.
   */
  const cellAt = useCallback((x: number, y: number): [number, number] | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = (rect.width - gap * (BB_SIZE - 1)) / BB_SIZE + gap;
    const c = Math.floor((x - rect.left) / step);
    const r = Math.floor((y - rect.top) / step);
    return r >= 0 && r < BB_SIZE && c >= 0 && c < BB_SIZE ? [r, c] : null;
  }, []);

  /** Giliran baru: isi keping yang sudah terpakai, lalu cek game over. */
  const refill = useCallback((b: number[][], h: Slot[]) => {
    const nh = h.map((p) => p ?? bbPiece());
    setHand(nh);
    setOver(!nh.some((p) => p && bbCanPlace(b, p.cells)));
  }, []);

  const place = useCallback(
    (r: number, c: number, i: number) => {
      if (over) return;
      const p = hand[i];
      if (!p) return;
      const res = bbPlace(board, p.cells, r, c, p.color);
      if (!res) return;

      // Efek ledakan. Warna diambil dari papan SEBELUM bbPlace mengosongkannya.
      const nc = res.lines > 0 ? combo + 1 : 0;
      setCombo(nc);
      if (res.cleared.length) {
        const id = ++fxId.current;
        // Warna cadangan p.color: sel yang baru saja diisi keping ini masih 0
        // di papan lama, dan --bb-0 tidak ada -> ledakannya jadi tembus pandang.
        setCleared(new Map(res.cleared.map(([rr, cc]) => [`${rr}-${cc}`, board[rr][cc] || p.color])));
        setBoom((b) => b + 1);
        setTimeout(() => {
          if (fxId.current === id) setCleared(new Map());
        }, clearMs(nc));
      }

      const nh = hand.map((q, k) => (k === i ? null : q));
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
      // Pindah ke keping berikutnya yang masih ada di tangan.
      const next = nh.findIndex((q) => q !== null);
      setSel(next === -1 ? 0 : next);
      refill(res.board, nh);

      // Konfeti baru dari combo 3 ke atas: combo 1-2 sudah cukup ramai oleh
      // ledakannya sendiri.
      if (nc >= 3 && !cheered.current) {
        cheered.current = true;
        void fire(false, () => {});
      }
    },
    [board, hand, over, refill, combo],
  );

  const rotate = useCallback(() => {
    const p = hand[sel];
    if (!p) return;
    setHand((h) =>
      h.map((q, i) => (i === sel && q ? { ...q, cells: bbRotate(q.cells) } : q)),
    );
  }, [hand, sel]);

  const restart = useCallback(() => {
    setBoard(bbEmpty());
    setHand([bbPiece(), bbPiece(), bbPiece()]);
    setScore(0);
    setSel(0);
    setOver(false);
    setCleared(new Map());
    setCombo(0);
    setBoom(0);
    cheered.current = false;
    fxId.current = 0;
  }, []);

  /* -------------------------------------------------------- seret & lepas */

  const onDown = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (over || !hand[i]) return;
    // Jari boleh keluar dari tombol keping tanpa kehilangan event.
    e.currentTarget.setPointerCapture(e.pointerId);
    setSel(i);
    setDrag({ i, r: -1, c: -1 });
  };

  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const hit = cellAt(e.clientX, e.clientY);
    setDrag((d) => (d ? { ...d, r: hit ? hit[0] : -1, c: hit ? hit[1] : -1 } : d));
  };

  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const hit = cellAt(e.clientX, e.clientY);
    const i = drag.i;
    setDrag(null);
    if (hit) place(hit[0], hit[1], i); // lepas di luar papan -> snap balik
  };

  // Saat menyeret, bayangan mengikuti jari. Kalau tidak, ikuti kursor tetikus.
  const ghost = drag && drag.r >= 0 ? [drag.r, drag.c] : hover;
  const active = drag ? hand[drag.i] : hand[sel];
  // Intensitas 0..1 dari combo: dipakai ledakan dan getaran papan.
  const fx = Math.min(combo, 6) / 6;

  return (
    <div className="blockblast flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">
            Block Blast
          </div>
          <div className="text-xs text-[var(--dim)]">
            Seret keping ke papan · isi baris atau kolom sampai penuh
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Skor" value={score} />
          <Stat label="Terbaik" value={best} />
        </div>
      </div>

      <div
        ref={boardRef}
        // bb-shake-0/1 berganti-ganti tiap ledakan: dua nama keyframe identik
        // supaya animasinya diputar ulang TANPA me-remount papan (remount bikin
        // 64 sel berkedip).
        className={"blockblast-board" + (boom ? ` bb-shake-${boom % 2}` : "")}
        style={
          {
            "--bb-fx": fx,
            "--bb-clear-dur": `${clearDur(combo)}ms`,
            "--bb-shake-dur": `${140 + fx * 180}ms`,
          } as React.CSSProperties
        }
      >
        {/* Ledakan sel yang terhapus. Ditempatkan absolut, BUKAN sebagai anak
            grid: elemen dalam aliran grid ikut menggeser penempatan sel di
            sekitarnya dan papannya berantakan. Warnanya dari `cleared`, karena
            papan sudah dikosongkan bbPlace. */}
        {[...cleared].map(([key, col]) => {
          const [r, c] = key.split("-").map(Number);
          return (
            <span
              key={`fx-${boom}-${key}`}
              className="bb-burst"
              aria-hidden="true"
              style={
                {
                  "--bb": `var(--bb-${col})`,
                  left: `calc((var(--bb-cell) + var(--bb-gap)) * ${c})`,
                  top: `calc((var(--bb-cell) + var(--bb-gap)) * ${r})`,
                } as React.CSSProperties
              }
            />
          );
        })}

        {board.map((row, r) =>
          row.map((v, c) => {
            const key = `${r}-${c}`;
            const inPreview =
              !v &&
              !!ghost &&
              !!active?.cells.some(([dr, dc]) => r === ghost[0] + dr && c === ghost[1] + dc);
            // 0 = kosong, 1..BB_COLORS = indeks warna --bb-*.
            const color = v || (inPreview && active ? active.color : 0);
            return (
              <button
                key={key}
                type="button"
                onClick={() => place(r, c, sel)}
                onMouseEnter={() => setHover([r, c])}
                onMouseLeave={() => setHover(null)}
                aria-label={`Sel ${r + 1},${c + 1}`}
                className={
                  "blockblast-cell " +
                  (v ? "blockblast-cell-on" : inPreview ? "blockblast-cell-preview" : "")
                }
                style={
                  color
                    ? ({ "--bb": `var(--bb-${color})` } as React.CSSProperties)
                    : undefined
                }
              />
            );
          }),
        )}

        {/* role=status: combo itu umpan balik permainan, jadi ikut dibacakan
            pembaca layar -- bukan cuma hiasan visual. */}
        {combo >= 2 && (
          <span key={`combo-${boom}`} className="bb-combo font-display" role="status">
            Combo ×{combo}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {hand.map((p, i) => (
            <button
              key={p?.id ?? `empty-${i}`}
              type="button"
              onPointerDown={(e) => onDown(e, i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={() => {
                if (hand[i]) setSel(i);
              }}
              disabled={!p}
              aria-label={`Keping ${i + 1}${p ? "" : " (sudah dipakai)"}`}
              className={"blockblast-tray " + (i === sel ? "blockblast-tray-sel" : "")}
              style={p ? ({ "--bb": `var(--bb-${p.color})` } as React.CSSProperties) : undefined}
            >
              {p ? (
                <span className="blockblast-mini">
                  {p.cells.map(([r, c]) => (
                    <span key={`${r}-${c}`} style={{ gridRow: r + 1, gridColumn: c + 1 }} />
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
