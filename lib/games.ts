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

/* ---------- Block Blast ---------- */

// ponytail: grid polos + keping Tetris klasik. Mirip 1010!/Block Blast: tiap
// giliran pemain dapat 3 keping acak, diletakkan di mana saja yang muat.
// Baris atau kolom yang penuh terhapus, skornya dihitung.
// Tidak ada game loop / requestAnimationFrame -- cuma reaksi terhadap klik,
// seperti 2048. Bandingkan dengan Tetris asli yang butuh loop gravitasi.

export const BB_SIZE = 8;

export const BB_SHAPES = [
  // Kotak
  [[1, 1], [1, 1]],
  // Batang
  [[1, 1, 1, 1]],
  // Hook
  [[1, 1, 0], [1, 0, 0]],
  // Huruf T
  [[1, 1, 1], [0, 1, 0]],
  // Tangga
  [[1, 0], [1, 1], [0, 1]],
  // Huruf L
  [[1, 0], [1, 0], [1, 1]],
] as const;

export type Piece = { id: number; cells: [number, number][]; color: number };

/** Jumlah warna keping. 0 = kosong, 1..BB_COLORS = warna (lihat --bb-* di globals.css). */
export const BB_COLORS = 6;

let bbSeq = 0;

/** Papan kosong. number[][] supaya warna ikut tersimpan di papan yang sama. */
export function bbEmpty(): number[][] {
  return Array.from({ length: BB_SIZE }, () => Array<number>(BB_SIZE).fill(0));
}

/** Keping acak dari 6 bentuk Tetris klasik, plus warnanya. */
export function bbPiece(): Piece {
  const shape = BB_SHAPES[Math.floor(Math.random() * BB_SHAPES.length)];
  const cells: [number, number][] = [];
  shape.forEach((row, r) => row.forEach((v, c) => v && cells.push([r, c])));
  return { id: ++bbSeq, cells, color: 1 + Math.floor(Math.random() * BB_COLORS) };
}

/** Rotasi 90° searah jarum jam. */
export function bbRotate(cells: [number, number][]): [number, number][] {
  // ponytail: translasi (r, c) → (c, -r) lalu dinormalkan ke koordinat >= 0,
  // supaya sel [0,0] selalu di pojok kiri atas bentuk.
  const rot = cells.map(([r, c]) => [c, -r] as [number, number]);
  const minR = Math.min(...rot.map(([r]) => r));
  const minC = Math.min(...rot.map(([, c]) => c));
  return rot.map(([r, c]) => [r - minR, c - minC] as [number, number]);
}

/** true kalau keping muat di (r, c) tanpa keluar papan atau menumpuk. */
export function bbFits(
  board: number[][],
  cells: [number, number][],
  r: number,
  c: number,
): boolean {
  return cells.every(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && rr < BB_SIZE && cc >= 0 && cc < BB_SIZE && board[rr][cc] === 0;
  });
}

/** Cek apakah keping ini masih bisa diletakkan di mana pun. Kalau tidak, game over. */
export function bbCanPlace(board: number[][], cells: [number, number][]): boolean {
  for (let r = 0; r < BB_SIZE; r++)
    for (let c = 0; c < BB_SIZE; c++)
      if (bbFits(board, cells, r, c)) return true;
  return false;
}

export type BbPlace = {
  board: number[][];
  cleared: [number, number][]; // baris penuh [r, -1], kolom penuh [-1, c]
  lines: number;
  gained: number;
};

/**
 * Letakkan keping, lalu hapus baris/kolom penuh. Mengembalikan papan baru,
 * daftar sel yang dihapus (untuk animasi), dan skor.
 */
export function bbPlace(
  board: number[][],
  cells: [number, number][],
  r: number,
  c: number,
  color = 1,
): BbPlace | null {
  if (!bbFits(board, cells, r, c)) return null;
  const b = board.map((row) => [...row]);
  for (const [dr, dc] of cells) b[r + dr][c + dc] = color;

  const fullR: number[] = [];
  const fullC: number[] = [];
  // !== 0, bukan === 1: papan sekarang menyimpan warna, bukan cuma 0/1.
  for (let rr = 0; rr < BB_SIZE; rr++)
    if (b[rr].every((v) => v !== 0)) fullR.push(rr);
  for (let cc = 0; cc < BB_SIZE; cc++)
    if (b.every((row) => row[cc] !== 0)) fullC.push(cc);

  const cleared: [number, number][] = [];
  for (const rr of fullR)
    for (let cc = 0; cc < BB_SIZE; cc++) cleared.push([rr, cc]);
  for (const cc of fullC)
    for (let rr = 0; rr < BB_SIZE; rr++)
      if (!fullR.includes(rr)) cleared.push([rr, cc]);

  for (const [rr, cc] of cleared) b[rr][cc] = 0;

  // 1 poin per sel diletakkan, 10 per sel yang terhapus (dorongan bersih-bersih).
  const lines = fullR.length + fullC.length;
  return { board: b, cleared, lines, gained: cells.length + cleared.length * 10 };
}

/* ---------- Minesweeper ---------- */

// ponytail: flood fill reveal. Tidak ada timer server; detik jalan di klien.

export type MineCell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

export type MsLevel = { id: string; name: string; w: number; h: number; mines: number };

// Papan yang lebih lebar dari layar ponsel digeser mendatar, bukan dikecilkan
// sampai tidak bisa ditepuk (lihat .mines-scroll di globals.css).
export const MS_LEVELS: readonly MsLevel[] = [
  { id: "pemula", name: "Pemula", w: 9, h: 9, mines: 10 },
  { id: "menengah", name: "Menengah", w: 12, h: 14, mines: 30 },
  { id: "ahli", name: "Ahli", w: 16, h: 16, mines: 50 },
] as const;

export const msLevelOf = (id: string | null): MsLevel =>
  MS_LEVELS.find((l) => l.id === id) ?? MS_LEVELS[0];

export function msEmpty(lv: MsLevel): MineCell[][] {
  return Array.from({ length: lv.h }, () =>
    Array.from({ length: lv.w }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );
}

/**
 * Pasang ranjau secara acak, kecuali sel aman pertama yang dibuka pemain.
 * Hitung jumlah ranjau tetangga untuk tiap sel.
 */
export function msGenerate(lv: MsLevel, safeR: number, safeC: number): MineCell[][] {
  const g = msEmpty(lv);
  let placed = 0;
  // Sel pertama DAN 8 tetangganya bebas ranjau, jadi bukaan pertama selalu
  // area kosong -- bukan angka yang langsung mentok.
  while (placed < lv.mines) {
    const r = Math.floor(Math.random() * lv.h);
    const c = Math.floor(Math.random() * lv.w);
    if (g[r][c].mine || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
    g[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < lv.h; r++)
    for (let c = 0; c < lv.w; c++) {
      if (g[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < lv.h && cc >= 0 && cc < lv.w && g[rr][cc].mine) n++;
        }
      g[r][c].adjacent = n;
    }
  return g;
}

/** Ukuran dibaca dari grid-nya, jadi tidak ada fungsi yang terikat satu level. */
const msDims = (g: MineCell[][]) => ({ h: g.length, w: g[0]?.length ?? 0 });

/**
 * Buka sel. Kalau kosong (0 tetangga), membuka seluruh area kosong yang
 * terhubung (flood fill). Mengembalikan papan baru. true kalau pemain kena ranjau.
 */
export function msReveal(g: MineCell[][], r: number, c: number): { grid: MineCell[][]; dead: boolean } {
  const { h, w } = msDims(g);
  if (r < 0 || r >= h || c < 0 || c >= w) return { grid: g, dead: false };
  if (g[r][c].revealed || g[r][c].flagged) return { grid: g, dead: false };
  const next = g.map((row) => row.map((cell) => ({ ...cell })));
  if (next[r][c].mine) {
    next[r][c].revealed = true;
    return { grid: next, dead: true };
  }
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [rr, cc] = stack.pop()!;
    const cell = next[rr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = rr + dr, nc = cc + dc;
          if (nr >= 0 && nr < h && nc >= 0 && nc < w && !next[nr][nc].revealed)
            stack.push([nr, nc]);
        }
  }
  return { grid: next, dead: false };
}

export function msFlag(g: MineCell[][], r: number, c: number): MineCell[][] {
  if (g[r][c].revealed) return g;
  return g.map((row, ri) =>
    row.map((cell, ci) => (ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell)),
  );
}

/**
 * Chord: kalau jumlah bendera di sekitar angka sama dengan angkanya, buka semua
 * tetangga yang belum ditandai. Bendera salah tempat -> kena ranjau; itu aturan
 * Minesweeper, bukan bug.
 */
export function msChord(g: MineCell[][], r: number, c: number): { grid: MineCell[][]; dead: boolean } {
  const { h, w } = msDims(g);
  const cell = g[r]?.[c];
  if (!cell?.revealed || cell.adjacent === 0) return { grid: g, dead: false };

  let flags = 0;
  const around: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= h || cc < 0 || cc >= w) continue;
      if (g[rr][cc].flagged) flags++;
      else if (!g[rr][cc].revealed) around.push([rr, cc]);
    }
  if (flags !== cell.adjacent || !around.length) return { grid: g, dead: false };

  let next = g;
  for (const [rr, cc] of around) {
    const res = msReveal(next, rr, cc);
    next = res.grid;
    if (res.dead) return { grid: next, dead: true };
  }
  return { grid: next, dead: false };
}

export function msWon(g: MineCell[][]): boolean {
  return g.flat().every((cell) => (cell.mine ? true : cell.revealed));
}
