// Self-check logika jadwal. Jalankan: npx tsx test-schedule.ts
// Tanpa framework. Gagal = throw.
import assert from "node:assert/strict";
import { CONFIG, END_TARGET } from "./lib/config";
import { getSessionStatus, isWorkday, nextSessionStart } from "./lib/schedule";
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

  // parts: clamp negatif dan pembagian benar
  assert.deepEqual(parts(-5), { d: 0, h: 0, m: 0, s: 0, ms: 0 });
  assert.deepEqual(parts(90_061_123), { d: 1, h: 1, m: 1, s: 1, ms: 123 });

  // atTime memakai komponen lokal (dasar kebenaran multi-zona T-10/T-11)
  const a = atTime(at(2026, 9, 2, 23, 59), CONFIG.WORK_END);
  assert.equal(a.getHours(), 16);
  assert.equal(a.getDate(), 2);

  console.log("OK: semua pemeriksaan jadwal lolos");
}

main();
