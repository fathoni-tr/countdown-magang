export const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const atTime = (d: Date, t: { hour: number; minute: number }) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.hour, t.minute, 0, 0);

export type Parts = { d: number; h: number; m: number; s: number; ms: number };

export function parts(ms: number): Parts {
  const v = Math.max(0, ms);
  return {
    d: Math.floor(v / 86_400_000),
    h: Math.floor(v / 3_600_000) % 24,
    m: Math.floor(v / 60_000) % 60,
    s: Math.floor(v / 1000) % 60,
    ms: v % 1000,
  };
}

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const fmtDate = (d: Date) =>
  `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const fmtShort = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function tzInfo() {
  const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -new Date().getTimezoneOffset();
  const label =
    ({ 420: "WIB", 480: "WITA", 540: "WIT" } as Record<number, string>)[offset] ??
    `UTC${offset >= 0 ? "+" : ""}${offset / 60}`;
  return { iana, offset, label };
}
