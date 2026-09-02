import { CONFIG, END_TARGET } from "./config";
import { isHoliday } from "./holidays";
import { addDays, atTime, startOfDay } from "./time";

export type Status = "IN_SESSION" | "OFF_SESSION" | "FINISHED";

export const isWorkday = (d: Date) =>
  CONFIG.WORK_DAYS.includes(d.getDay()) && !isHoliday(d);

export function nextSessionStart(now: Date): Date {
  const todayStart = atTime(now, CONFIG.WORK_START);
  if (isWorkday(now) && now < todayStart) return todayStart;

  let d = addDays(startOfDay(now), 1);
  while (!isWorkday(d)) d = addDays(d, 1);
  return atTime(d, CONFIG.WORK_START);
}

/**
 * Sisa magang versi "hari kerja saja", dikemas jadi milidetik dengan aturan
 * 1 hari kerja = 24 jam supaya bisa langsung dipakai flip clock (hari/jam/menit/detik).
 * Hari = jumlah sesi kerja yang belum dimulai; jam ke bawah = sisa sesi hari ini.
 * Di luar jam kerja nilainya konstan, jadi countdown otomatis beku sampai sesi berikutnya.
 */
export function workRemainingMs(now: Date): number {
  if (now >= END_TARGET) return 0;

  // Jam istirahat siang tetap dihitung sebagai jam kerja: 07.30 sampai 16.00 utuh.
  // Yang berubah saat istirahat cuma pilihan kalimat (lihat quoteMood di quotes.ts).
  const todayMs =
    getSessionStatus(now) === "IN_SESSION"
      ? Math.min(+atTime(now, CONFIG.WORK_END), +END_TARGET) - +now
      : 0;

  let days = 0;
  const from =
    now < atTime(now, CONFIG.WORK_START) ? startOfDay(now) : addDays(startOfDay(now), 1);
  for (let d = from; atTime(d, CONFIG.WORK_START) < END_TARGET; d = addDays(d, 1))
    if (isWorkday(d)) days++;

  return days * 86_400_000 + Math.max(0, todayMs);
}

export function getSessionStatus(now: Date): Status {
  if (now >= END_TARGET) return "FINISHED";
  const inRange =
    now >= atTime(now, CONFIG.WORK_START) && now < atTime(now, CONFIG.WORK_END);
  return isWorkday(now) && inRange ? "IN_SESSION" : "OFF_SESSION";
}
