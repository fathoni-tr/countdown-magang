"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canMove,
  freshTiles,
  SIZE,
  slide,
  spawn,
  toGrid,
  type Dir,
  type Tile,
} from "@/lib/games";
import { fire } from "@/lib/confetti";
import { store } from "@/lib/storage";

const BEST_KEY = "g2048-best";

/**
 * Warna ubin ikut tema situs: makin tinggi nilainya makin pekat ke --accent,
 * lalu ditarik ke emas khas 2048 mulai dari 256.
 */
function tileStyle(v: number): React.CSSProperties {
  const p = Math.min((Math.log2(v) - 1) / 10, 1); // 2 -> 0, 2048 -> 1
  const gold = Math.max(0, (p - 0.7) / 0.3);
  const base = `color-mix(in oklab, var(--accent) ${Math.round(12 + p * 88)}%, var(--card))`;
  const digits = String(v).length;
  return {
    background: gold > 0 ? `color-mix(in oklab, #edc22e ${Math.round(gold * 72)}%, ${base})` : base,
    // --bg, bukan putih: --accent dan --bg selalu berlawanan, jadi kontrasnya
    // benar di tema terang maupun gelap. Ubin emas selalu terang di kedua tema,
    // jadi teksnya dipaku gelap.
    // Ambang 0.25/0.6 dipilih dengan mengukur rasio kontras tiap nilai ubin:
    // yang terburuk 3.46 (terang) dan 4.37 (gelap), lolos ambang 3:1 WCAG
    // untuk teks besar. Menggesernya ke bawah menjatuhkan yang terburuk ke 2.86.
    color: gold > 0.25 ? "#11161c" : p > 0.6 ? "var(--bg)" : "var(--fg)",
    fontSize: `calc(var(--cell) * ${digits > 3 ? 0.3 : digits > 2 ? 0.38 : 0.46})`,
    boxShadow: gold > 0 ? `0 0 ${Math.round(gold * 22)}px rgb(237 194 46 / ${(gold * 0.5).toFixed(2)})` : undefined,
  };
}

/**
 * Posisi ubin. --cell dan --gap adalah panjang sungguhan (lihat globals.css),
 * jadi translate cukup dianimasikan compositor tanpa menghitung ulang tata
 * letak -- versi sebelumnya memakai left/top persen dan memicu relayout tiap
 * frame untuk seluruh papan.
 *
 * translate/scale ditulis sebagai properti terpisah, bukan lewat transform,
 * supaya animasi pop (scale) tidak saling menimpa dengan geseran (translate).
 */
function cellPos(r: number, c: number): React.CSSProperties {
  const step = "calc(var(--cell) + var(--gap))";
  return {
    width: "var(--cell)",
    height: "var(--cell)",
    translate: `calc(${step} * ${c}) calc(${step} * ${r})`,
  };
}

export default function Game2048() {
  const [tiles, setTiles] = useState<Tile[]>(freshTiles);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  // Rekor saat ronde dimulai. `best` ikut naik bersama skor, jadi tidak bisa
  // dipakai untuk menentukan kapan rekornya baru saja terlampaui.
  const target = useRef(0);
  const cheered = useRef(false);

  useEffect(() => {
    const b = Number(store.get(BEST_KEY)) || 0;
    setBest(b);
    target.current = b;
  }, []);

  useEffect(() => {
    if (score <= best) return;
    setBest(score);
    store.set(BEST_KEY, String(score));
    // Rekor lama terlampaui: rayakan sekali per ronde. Skor 0 di awal tidak
    // dihitung, jadi ronde pertama (belum ada rekor) tidak langsung meledak.
    if (!cheered.current && target.current > 0 && score > target.current) {
      cheered.current = true;
      void fire(false, () => {});
    }
  }, [score, best]);

  // Sengaja tidak memakai updater setTiles(prev => ...): updater harus murni,
  // sementara satu langkah juga perlu menambah skor dan menandai game berakhir.
  const step = useCallback(
    (dir: Dir) => {
      const { tiles: next, gained, moved } = slide(tiles.filter((t) => !t.dead), dir);
      if (!moved) return;
      const g = toGrid(next);
      const born = spawn(g);
      if (born) g[born.r][born.c] = born;
      const all = born ? [...next, born] : next;
      setTiles(all);
      setScore((s) => s + gained);
      if (all.some((t) => t.v >= 2048)) setWon(true);
      setOver(!canMove(g));
    },
    [tiles],
  );

  const restart = () => {
    setTiles(freshTiles());
    setScore(0);
    setOver(false);
    setWon(false);
    target.current = best;
    cheered.current = false;
  };

  useEffect(() => {
    const KEYS: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return;
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault(); // tahan scroll halaman selagi main
      step(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Geser jari: arah diambil dari sumbu dengan pergeseran terbesar, minimal
  // 24 px supaya sentuhan tak sengaja tidak terbaca sebagai langkah.
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    const down = (e: PointerEvent) => {
      sx = e.clientX;
      sy = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
    };
  }, [step]);

  return (
    // Lebar papan (px, bukan rem: tidak boleh ikut berubah kalau pengguna
    // menyetel font dasar browser) diatur kelas .game2048 di globals.css.
    <div className="game2048 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">2048</div>
          <div className="text-xs text-[var(--dim)]">Gabungkan angka yang sama</div>
        </div>
        <div className="flex gap-2">
          <Stat label="Skor" value={score} />
          <Stat label="Terbaik" value={best} />
        </div>
      </div>

      <div
        ref={board}
        // touch-none: cegah browser menafsirkan geser jari sebagai scroll.
        className="board2048 relative aspect-square w-full touch-none select-none rounded-xl border border-[var(--line)] bg-[var(--card)]"
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-lg bg-[var(--line)] opacity-50"
            style={cellPos(Math.floor(i / SIZE), i % SIZE)}
          />
        ))}

        {tiles.map((t) => (
          <span
            key={t.id}
            className={
              "tile2048 absolute grid place-content-center rounded-lg font-display tabular-nums" +
              (t.born ? " tile2048-born" : t.merged ? " tile2048-merged" : "")
            }
            style={{ ...cellPos(t.r, t.c), ...tileStyle(t.v), zIndex: t.dead ? 1 : 2 }}
          >
            {t.v}
          </span>
        ))}

        {over && (
          <div className="absolute inset-0 z-10 grid place-content-center gap-3 rounded-xl bg-[var(--card)]/85 backdrop-blur-sm">
            <p className="font-display text-xl uppercase tracking-[0.14em] text-[var(--fg)]">
              {won ? "2048!" : "Habis"}
            </p>
            <button
              onClick={restart}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--bg)]"
            >
              Main lagi
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--dim)]">
        <span className="hidden sm:inline">Panah / WASD</span>
        <span className="sm:hidden">Geser jari</span>
        <button onClick={restart} className="underline underline-offset-4 hover:text-[var(--fg)]">
          Ulangi
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
