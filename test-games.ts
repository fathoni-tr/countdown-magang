// Self-check logika game (2048 + Furdle). Jalankan: npx tsx test-games.ts
// Tanpa framework. Gagal = throw.
import assert from "node:assert/strict";
import { canMove, nextHint, scoreGuess, slide, toGrid, type Tile } from "./lib/games";
import { ANSWERS, LENGTHS, WORDS } from "./lib/words";

let n = 0;

/** Papan dari matriks angka; 0 = kosong. */
function board(rows: number[][]): Tile[] {
  const out: Tile[] = [];
  let id = 0;
  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) out.push({ id: ++id, r, c, v });
    }),
  );
  return out;
}

/** Kembali ke matriks angka supaya mudah dibandingkan. */
function matrix(tiles: Tile[]): number[][] {
  const g = toGrid(tiles);
  return g.map((row) => row.map((t) => t?.v ?? 0));
}

const E = [0, 0, 0, 0];

function check(name: string, fn: () => void) {
  fn();
  n++;
  console.log("  ok  " + name);
}

console.log("2048");

check("ubin meluncur rapat ke kiri", () => {
  const { tiles, moved, gained } = slide(board([[0, 2, 0, 4], E, E, E]), "left");
  assert.deepEqual(matrix(tiles)[0], [2, 4, 0, 0]);
  assert.equal(moved, true);
  assert.equal(gained, 0);
});

check("dua ubin sama digabung, skor bertambah", () => {
  const { tiles, gained } = slide(board([[2, 2, 0, 0], E, E, E]), "left");
  assert.deepEqual(matrix(tiles)[0], [4, 0, 0, 0]);
  assert.equal(gained, 4);
});

check("2·2·2·2 jadi 4·4, bukan 8", () => {
  const { tiles, gained } = slide(board([[2, 2, 2, 2], E, E, E]), "left");
  assert.deepEqual(matrix(tiles)[0], [4, 4, 0, 0]);
  assert.equal(gained, 8);
});

check("2·2·2 gabung yang terdepan saja", () => {
  const { tiles } = slide(board([[2, 2, 2, 0], E, E, E]), "left");
  assert.deepEqual(matrix(tiles)[0], [4, 2, 0, 0]);
});

check("hasil gabungan tidak ikut digabung lagi di langkah yang sama", () => {
  const { tiles } = slide(board([[4, 2, 2, 0], E, E, E]), "left");
  assert.deepEqual(matrix(tiles)[0], [4, 4, 0, 0]);
});

check("arah kanan menyisakan ubin di tepi kanan", () => {
  const { tiles } = slide(board([[2, 0, 0, 2], E, E, E]), "right");
  assert.deepEqual(matrix(tiles)[0], [0, 0, 0, 4]);
});

check("arah bawah bekerja per kolom", () => {
  const { tiles } = slide(board([[2, 0, 0, 0], [2, 0, 0, 0], E, E]), "down");
  assert.deepEqual(
    matrix(tiles).map((r) => r[0]),
    [0, 0, 0, 4],
  );
});

check("papan tanpa langkah sah -> moved false", () => {
  const stuck = board([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  for (const d of ["up", "down", "left", "right"] as const) {
    assert.equal(slide(stuck, d).moved, false, d);
  }
  assert.equal(canMove(toGrid(stuck)), false);
});

check("papan penuh tapi ada pasangan bertetangga masih bisa jalan", () => {
  const g = toGrid(
    board([
      [2, 2, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]),
  );
  assert.equal(canMove(g), true);
});

check("jumlah ubin hidup tidak pernah bertambah sendiri", () => {
  const start = board([
    [2, 4, 8, 2],
    [4, 2, 4, 8],
    [0, 0, 2, 4],
    [0, 0, 0, 2],
  ]);
  const { tiles } = slide(start, "left");
  const live = tiles.filter((t) => !t.dead);
  assert.ok(live.length <= start.length);
  // Ghost + hidup harus menutupi semua ubin awal (tidak ada yang lenyap diam-diam).
  assert.equal(tiles.length, start.length);
});

check("total nilai kekal (gabungan hanya memindah nilai)", () => {
  const start = board([
    [2, 2, 4, 4],
    [8, 8, 0, 0],
    E,
    E,
  ]);
  const sum = (ts: Tile[]) => ts.filter((t) => !t.dead).reduce((a, t) => a + t.v, 0);
  const { tiles } = slide(start, "left");
  assert.equal(sum(tiles), sum(start));
});

console.log("Furdle");

check("semua tepat", () => {
  assert.deepEqual(scoreGuess("crane", "crane"), ["hit", "hit", "hit", "hit", "hit"]);
});

check("huruf kembar di tebakan, satu di jawaban -> hanya satu ditandai", () => {
  // "allee" vs "eagle": jawaban punya satu 'l', jadi 'l' kedua harus miss.
  assert.deepEqual(scoreGuess("allee", "eagle"), ["near", "near", "miss", "near", "hit"]);
});

check("huruf kembar tidak ditandai berlebihan", () => {
  // jawaban punya satu 's', tebakan punya dua.
  assert.deepEqual(scoreGuess("sassy", "spoke"), ["hit", "miss", "miss", "miss", "miss"]);
});

check("posisi tepat menang atas posisi salah untuk huruf yang sama", () => {
  // 'e' di jawaban cuma satu dan posisinya cocok di indeks 4.
  assert.deepEqual(scoreGuess("eaten", "unite"), ["near", "miss", "near", "miss", "near"]);
  assert.deepEqual(scoreGuess("speed", "abide"), ["miss", "miss", "near", "miss", "near"]);
});

check("tidak ada huruf yang cocok", () => {
  assert.deepEqual(scoreGuess("fuzzy", "adobe").filter((x) => x !== "miss"), []);
});

check("daftar kata sehat untuk tiap panjang", () => {
  assert.deepEqual([...LENGTHS], [4, 5, 6]);
  for (const n of LENGTHS) {
    const kata = WORDS[n];
    const jawab = ANSWERS[n];
    assert.ok(kata.length > 1000, `kamus ${n} huruf terlalu kecil: ${kata.length}`);
    assert.ok(jawab.length > 300 && jawab.length <= kata.length, `jawaban ${n} huruf janggal`);
    const pola = new RegExp(`^[a-z]{${n}}$`);
    assert.ok(kata.every((w) => pola.test(w)), `ada kata yang bukan ${n} huruf kecil`);
    const set = new Set(kata);
    assert.ok(jawab.every((a) => set.has(a)), `ada jawaban ${n} huruf di luar daftar tebakan`);
    assert.equal(set.size, kata.length, `ada kata kembar di daftar ${n} huruf`);
  }
});

check("kata dari quotes ikut jadi jawaban dan tebakan", () => {
  // "nggak" dan "pelan" ada di lib/quotes.ts.
  for (const w of ["nggak", "pelan"]) {
    assert.ok(WORDS[5].includes(w) && ANSWERS[5].includes(w), w);
  }
});

check("itpln ada sebagai jawaban sekaligus tebakan sah", () => {
  assert.ok(WORDS[5].includes("itpln"));
  assert.ok(ANSWERS[5].includes("itpln"));
});

check("penilaian bekerja untuk 4 dan 6 huruf", () => {
  assert.deepEqual(scoreGuess("baju", "baju"), ["hit", "hit", "hit", "hit"]);
  assert.deepEqual(scoreGuess("kaya", "baju"), ["miss", "hit", "miss", "miss"]);
  assert.equal(scoreGuess("bangun", "bangun").length, 6);
  // "gunung" vs "bangun": jawaban punya satu 'g', satu 'u' di luar posisi tepat,
  // dan satu 'n' sisa -- 'u' kedua dan 'g' kedua harus kehabisan jatah.
  assert.deepEqual(scoreGuess("gunung", "bangun"), [
    "near", "near", "hit", "miss", "near", "miss",
  ]);
});

check("bantuan membuka posisi yang belum tepat, lalu habis", () => {
  const jawaban = "rumah";
  // Belum menebak apa pun: semua posisi masih bisa dibuka.
  const a = nextHint(jawaban, [], []);
  assert.ok(a !== null && a >= 0 && a < 5);
  // Posisi yang sudah dibuka tidak ditawarkan lagi.
  const semua = [0, 1, 2, 3, 4];
  assert.equal(nextHint(jawaban, [], semua), null);
  // Huruf yang sudah tepat posisi di tebakan sebelumnya juga dilewati.
  assert.equal(nextHint(jawaban, ["rumah"], []), null);
  const sisa = nextHint("rumah", ["ruang"], []);
  assert.ok(sisa !== null && ![0, 1].includes(sisa), "posisi yang sudah tepat ikut ditawarkan");
});

console.log(`\n${n} pemeriksaan lolos.`);
