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

export function getSessionStatus(now: Date): Status {
  if (now >= END_TARGET) return "FINISHED";
  const inRange =
    now >= atTime(now, CONFIG.WORK_START) && now < atTime(now, CONFIG.WORK_END);
  return isWorkday(now) && inRange ? "IN_SESSION" : "OFF_SESSION";
}
