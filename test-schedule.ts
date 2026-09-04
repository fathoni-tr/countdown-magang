// Self-check logika jadwal. Jalankan: npx tsx test-schedule.ts
// Tanpa framework. Gagal = throw.
import assert from "node:assert/strict";
import { MOODS, nextQuoteIndex, quoteAt, quoteCount, quoteMood } from "./lib/quotes";
import { CONFIG, END_TARGET } from "./lib/config";
import { getSessionStatus, isWorkday, nextSessionStart, workRemainingMs } from "./lib/schedule";
import { atTime, parts, ymd } from "./lib/time";
import { loadHolidays, type Holiday } from "./lib/holidays";

const HOLIDAYS: Holiday[] = [
  { date: "2026-09-07", name: "Libur Uji", type: "nasional" }, // Senin
];

// Stub fetch: holidays.ts memuat kalender lewat fetch.
globalThis.fetch = (async (url: string | URL | Request) => {
  const y = String(url).match(/holidays-(\d{4})\.json/)?.[1];
  return new Response(JSON.stringify(y === "2026" ? HOLIDAYS : []), { status: 200 });
}) as typeof fetch;

const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s);

async function main() {
  await loadHolidays([2026, 2027]);

  // T-01 Rabu 15.59.59 -> IN_SESSION
  assert.equal(getSessionStatus(at(2026, 9, 2, 15, 59, 59)), "IN_SESSION");

  // T-02 Rabu 16.00.00 -> OFF_SESSION, sekunder ke Kamis 07.30
  const rabu16 = at(2026, 9, 2, 16, 0, 0);
  assert.equal(getSessionStatus(rabu16), "OFF_SESSION");
  const kamis = nextSessionStart(rabu16);
  assert.equal(ymd(kamis), "2026-09-03");
  assert.equal(kamis.getHours(), 7);
  assert.equal(kamis.getMinutes(), 30);

  // Sebelum jam masuk di hari kerja -> hari ini 07.30
  const rabu6 = at(2026, 9, 2, 6, 0);
  assert.equal(getSessionStatus(rabu6), "OFF_SESSION");
  assert.equal(ymd(nextSessionStart(rabu6)), "2026-09-02");

  // T-06 Jumat 16.05: 2026-09-04 Jumat, Senin 09-07 libur -> lompat ke Selasa 09-08
  assert.equal(ymd(nextSessionStart(at(2026, 9, 4, 16, 5))), "2026-09-08");

  // T-07 Sabtu siang
  const sabtu = at(2026, 9, 5, 12, 0);
  assert.equal(isWorkday(sabtu), false);
  assert.equal(getSessionStatus(sabtu), "OFF_SESSION");
  assert.equal(ymd(nextSessionStart(sabtu)), "2026-09-08");

  // T-08 Senin tanggal merah bukan hari kerja
  assert.equal(isWorkday(at(2026, 9, 7, 10, 0)), false);
  assert.equal(CONFIG.TREAT_CUTI_BERSAMA_AS_HOLIDAY, true);

  // T-15 Jumat 29 Jan 2027 16.00 lokal -> FINISHED
  assert.equal(getSessionStatus(at(2027, 1, 29, 15, 59, 59)), "IN_SESSION");
  assert.equal(getSessionStatus(at(2027, 1, 29, 16, 0, 0)), "FINISHED");
  assert.equal(getSessionStatus(new Date(+END_TARGET + 1000)), "FINISHED");

  // T-16 Kamis 28 Jan 16.05 -> sekunder masih valid (Jumat 07.30 sebelum END)
  const kamisAkhir = at(2027, 1, 28, 16, 5);
  assert.equal(getSessionStatus(kamisAkhir), "OFF_SESSION");
  assert.ok(nextSessionStart(kamisAkhir) < END_TARGET, "sekunder harus tampil");

  // Mode hari kerja: beku di luar sesi, turun tepat 1 hari saat sesi berikutnya mulai.
  const beku = workRemainingMs(at(2026, 9, 4, 16, 0)); // Jumat 16.00
  assert.equal(beku % 86_400_000, 0, "di luar jam kerja sisa sesi harus 0");
  assert.equal(workRemainingMs(at(2026, 9, 6, 12, 0)), beku, "Minggu harus beku");
  assert.equal(workRemainingMs(at(2026, 9, 7, 6, 0)), beku, "Senin libur harus beku");
  assert.equal(
    workRemainingMs(at(2026, 9, 8, 7, 30)), // Selasa 07.30, sesi mulai
    beku - 86_400_000 + 30_600_000, // 07.30 sampai 16.00 utuh
    "sesi mulai: -1 hari kerja, +sisa sesi penuh",
  );

  // Jam istirahat siang tetap ikut terhitung, jadi tidak ada jeda di countdown.
  const siang = workRemainingMs(at(2026, 9, 8, 12, 0));
  assert.equal(workRemainingMs(at(2026, 9, 8, 12, 30)), siang - 1_800_000, "istirahat tetap jalan");
  assert.equal(workRemainingMs(at(2026, 9, 8, 13, 0)), siang - 3_600_000);
  assert.equal(siang, workRemainingMs(at(2026, 9, 8, 11, 59)) - 60_000);
  assert.equal(
    workRemainingMs(at(2026, 9, 8, 15, 59)),
    beku - 86_400_000 + 60_000,
    "menjelang pulang tinggal 1 menit",
  );
  assert.equal(workRemainingMs(new Date(+END_TARGET + 1000)), 0);
  assert.ok(beku < workRemainingMs(at(2026, 9, 4, 10, 0)), "sisa harus menurun");

  // parts: clamp negatif dan pembagian benar
  assert.deepEqual(parts(-5), { d: 0, h: 0, m: 0, s: 0, ms: 0 });
  assert.deepEqual(parts(90_061_123), { d: 1, h: 1, m: 1, s: 1, ms: 123 });

  // atTime memakai komponen lokal (dasar kebenaran multi-zona T-10/T-11)
  const a = atTime(at(2026, 9, 2, 23, 59), CONFIG.WORK_END);
  assert.equal(a.getHours(), 16);
  assert.equal(a.getDate(), 2);

  // Suasana kalimat ikut jam. 2026-09-02 = Rabu, 09-05 Sabtu, 09-07 tanggal merah.
  assert.equal(quoteMood(at(2026, 9, 2, 9, 0)), "kerja");
  assert.equal(quoteMood(at(2026, 9, 2, 12, 0)), "siang", "12.00 mulai istirahat siang");
  assert.equal(quoteMood(at(2026, 9, 2, 12, 59)), "siang");
  assert.equal(quoteMood(at(2026, 9, 2, 13, 0)), "kerja", "13.00 kerja lagi");
  assert.equal(quoteMood(at(2026, 9, 2, 16, 0)), "pulang", "lewat jam pulang");
  assert.equal(quoteMood(at(2026, 9, 2, 23, 0)), "pulang");
  assert.equal(quoteMood(at(2026, 9, 2, 6, 0)), "pagi", "sebelum jam masuk");
  assert.equal(quoteMood(at(2026, 9, 5, 12, 0)), "libur");
  assert.equal(quoteMood(at(2026, 9, 7, 10, 0)), "libur");

  const kalimat = (m: (typeof MOODS)[number]) =>
    Array.from({ length: quoteCount(m) }, (_, i) => quoteAt(m, i));

  assert.ok(
    kalimat("libur").some((q) => q.toLowerCase().includes("laporan")),
    "set libur harus mengingatkan laporan magang",
  );

  // nextQuoteIndex: selalu dalam rentang, tidak pernah mengulang indeks sekarang,
  // dan bisa mencapai semua indeks. Tanpa duplikat, tanpa em dash.
  for (const mood of MOODS) {
    const n = quoteCount(mood);
    const semua = kalimat(mood);
    assert.equal(new Set(semua).size, n, `kalimat kembar di set ${mood}`);
    // Semua kalimat wajib ASCII: menjaring em dash, en dash, dan kutip lengkung
    // sekaligus tanpa perlu menulis karakternya di berkas ini.
    assert.ok(
      semua.every((q) => [...q].every((c) => c.codePointAt(0)! < 128)),
      `karakter non-ASCII di set ${mood}`,
    );

    const kena = new Set<number>();
    let prev = nextQuoteIndex(mood, -1);
    assert.ok(prev >= 0 && prev < n, "pilihan pertama harus dalam rentang");
    for (let k = 0; k < 20_000; k++) {
      const next = nextQuoteIndex(mood, prev);
      assert.ok(next >= 0 && next < n, "indeks harus dalam rentang");
      assert.notEqual(next, prev, "tidak boleh mengulang kalimat yang sama beruntun");
      kena.add(next);
      prev = next;
    }
    assert.equal(kena.size, n, `semua kalimat harus bisa terpilih di set ${mood}`);
  }

  console.log("OK: semua pemeriksaan jadwal lolos");
}

main();
