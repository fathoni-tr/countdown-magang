// Logika murni untuk game di GameDock. Dipisah dari komponen supaya bisa
// diuji tanpa React (lihat test-games.ts).

/* ---------- 2048 ---------- */

export const SIZE = 4;

export type Tile = {
  id: number;
  r: number;
  c: number;
  v: number;
  /** Baru muncul -> animasi pop kecil. */
  born?: boolean;
  /** Hasil penggabungan di langkah ini -> animasi pop besar. */
  merged?: boolean;
  /** Sudah diserap ubin lain: tetap digambar satu langkah supaya terlihat
      meluncur ke tujuan, lalu dibuang di langkah berikutnya. */
  dead?: boolean;
};

export type Grid = (Tile | null)[][];

let seq = 0;

export const emptyGrid = (): Grid =>
  Array.from({ length: SIZE }, () => Array<Tile | null>(SIZE).fill(null));

export function toGrid(tiles: Tile[]): Grid {
  const g = emptyGrid();
  for (const t of tiles) if (!t.dead) g[t.r][t.c] = t;
  return g;
}

/** Ubin baru di sel kosong acak. null kalau papan sudah penuh. */
export function spawn(g: Grid): Tile | null {
  const free: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (!g[r][c]) free.push([r, c]);
  if (!free.length) return null;
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  return { id: ++seq, r, c, v: Math.random() < 0.9 ? 2 : 4, born: true };
}

export function canMove(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const t = g[r][c];
      if (!t) return true;
      if (r + 1 < SIZE && g[r + 1][c]?.v === t.v) return true;
      if (c + 1 < SIZE && g[r][c + 1]?.v === t.v) return true;
    }
  return false;
}

const VEC = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const;
export type Dir = keyof typeof VEC;

/**
 * Geser + gabungkan semua ubin ke satu arah. Ubin yang paling dekat sisi tujuan
 * diproses lebih dulu supaya barisan sudah rapat sebelum yang belakang menyusul.
 */
export function slide(prev: Tile[], dir: Dir) {
  const [dr, dc] = VEC[dir];
  const g = toGrid(prev.map((t) => ({ ...t, born: false, merged: false })));
  const idx = [...Array(SIZE).keys()];
  const rows = dr > 0 ? [...idx].reverse() : idx;
  const cols = dc > 0 ? [...idx].reverse() : idx;
  const ghosts: Tile[] = [];
  let gained = 0;
  let moved = false;

  for (const r of rows)
    for (const c of cols) {
      const t = g[r][c];
      if (!t) continue;
      let nr = r;
      let nc = c;
      let eaten = false;

      for (;;) {
        const tr = nr + dr;
        const tc = nc + dc;
        if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) break;
        const o = g[tr][tc];
        if (o) {
          // Satu ubin hanya boleh ikut satu penggabungan per langkah:
          // 2·2·2·2 jadi 4·4, bukan 8.
          if (o.v === t.v && !o.merged) {
            g[r][c] = null;
            o.v *= 2;
            o.merged = true;
            gained += o.v;
            moved = true;
            eaten = true;
            ghosts.push({ ...t, r: tr, c: tc, dead: true });
          }
          break;
        }
        nr = tr;
        nc = tc;
      }

      if (eaten) continue;
      if (nr !== r || nc !== c) {
        g[r][c] = null;
        g[nr][nc] = t;
        t.r = nr;
        t.c = nc;
        moved = true;
      }
    }

  const live: Tile[] = [];
  for (const row of g) for (const t of row) if (t) live.push(t);
  // Ghost didahulukan supaya tergambar di bawah ubin hasil gabungan.
  return { tiles: [...ghosts, ...live], gained, moved };
}

export function freshTiles(): Tile[] {
  const g = emptyGrid();
  const out: Tile[] = [];
  for (let i = 0; i < 2; i++) {
    const t = spawn(g);
    if (t) {
      g[t.r][t.c] = t;
      out.push(t);
    }
  }
  return out;
}

/* ---------- Furdle ---------- */

export const ROWS = 6;

/** Bantuan yang boleh dipakai per ronde. */
export const MAX_HINTS = 2;

export type Mark = "hit" | "near" | "miss";

/**
 * Nilai satu tebakan. Panjangnya mengikuti jawaban, jadi fungsi ini sama saja
 * untuk mode 4, 5, maupun 6 huruf.
 *
 * Dua lintasan: huruf yang tepat posisi diambil dulu, sisanya baru boleh
 * mengklaim huruf "ada tapi salah posisi" dari stok yang belum terpakai —
 * kalau tidak, huruf kembar akan ditandai berlebihan.
 */
export function scoreGuess(guess: string, answer: string): Mark[] {
  const n = answer.length;
  const marks: Mark[] = Array(n).fill("miss");
  const left: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) marks[i] = "hit";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (marks[i] === "hit") continue;
    if ((left[guess[i]] ?? 0) > 0) {
      marks[i] = "near";
      left[guess[i]] -= 1;
    }
  }
  return marks;
}

/**
 * Posisi berikutnya yang dibuka tombol bantuan: huruf yang belum pernah tepat
 * posisi di tebakan mana pun, dan belum dibuka sebelumnya. null kalau sudah
 * tidak ada yang bisa dibuka.
 */
export function nextHint(answer: string, rows: string[], revealed: number[]): number | null {
  const sisa = [...answer]
    .map((_, i) => i)
    .filter((i) => !revealed.includes(i) && !rows.some((g) => g[i] === answer[i]));
  if (!sisa.length) return null;
  return sisa[Math.floor(Math.random() * sisa.length)];
}

export const MARK_RANK: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
