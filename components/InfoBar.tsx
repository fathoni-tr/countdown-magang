"use client";

import { useEffect, useState } from "react";
import { nextHoliday, holidayOn, loadHolidays } from "@/lib/holidays";
import { END_TARGET } from "@/lib/config";
import { fmtShort, pad, tzInfo } from "@/lib/time";

export default function InfoBar() {
  const [tz, setTz] = useState<{ iana: string; label: string } | null>(null);
  const [clock, setClock] = useState("");
  const [holiday, setHoliday] = useState("");

  useEffect(() => {
    setTz(tzInfo());

    const t = setInterval(() => {
      const n = new Date();
      setClock(`${pad(n.getHours())}.${pad(n.getMinutes())}`);
    }, 1000);

    void loadHolidays([new Date().getFullYear(), END_TARGET.getFullYear()]).then(() => {
      const now = new Date();
      const today = holidayOn(now);
      if (today) return setHoliday(`Hari ini libur: ${today.name}`);
      const next = nextHoliday(now);
      if (next) setHoliday(`Libur berikutnya: ${next.name}, ${fmtShort(next.d)}`);
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => clearInterval(t);
  }, []);

  if (!tz) return null;

  return (
    <div className="mt-8 text-xs text-[var(--dim)]">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <span>
          {tz.label} · {tz.iana} · {clock}
        </span>
        {holiday && <span>{holiday}</span>}
      </div>
    </div>
  );
}
