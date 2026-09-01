import { CONFIG } from "./config";
import { ymd } from "./time";

export type Holiday = { date: string; name: string; type: "nasional" | "cuti_bersama" };

let map = new Map<string, Holiday>();

export async function loadHolidays(years: number[]): Promise<void> {
  const next = new Map<string, Holiday>();
  for (const y of [...new Set(years)]) {
    try {
      const res = await fetch(`/data/holidays-${y}.json`);
      if (!res.ok) continue;
      for (const h of (await res.json()) as Holiday[]) next.set(h.date, h);
    } catch { /* offline / tidak ada berkas: lewati */ }
  }
  map = next;
}

export const holidayOn = (d: Date) => map.get(ymd(d)) ?? null;

export function isHoliday(d: Date): boolean {
  const h = holidayOn(d);
  if (!h) return false;
  return CONFIG.TREAT_CUTI_BERSAMA_AS_HOLIDAY || h.type !== "cuti_bersama";
}

export function nextHoliday(from: Date): (Holiday & { d: Date }) | null {
  const f = ymd(from);
  const list = [...map.values()]
    .filter((h) => h.date >= f)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list[0]) return null;
  const [y, m, d] = list[0].date.split("-").map(Number);
  return { ...list[0], d: new Date(y, m - 1, d) };
}
