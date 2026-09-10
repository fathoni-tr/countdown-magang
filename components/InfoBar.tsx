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

    // Service worker versi baru langsung mengambil alih (skipWaiting + claim).
    // Muat ulang sekali supaya user yang sudah pernah buka situs ini ikut dapat
    // versi terbaru tanpa perlu hard reset. Kunjungan pertama tidak ikut reload.
    // Saat dev, nama berkas di /_next/static/ dipakai ulang sehingga service
    // worker (cache-first untuk folder itu) menyajikan JS/CSS basi dan
    // perubahan tidak terlihat sampai di-unregister manual. Di produksi nama
    // berkasnya ber-hash, jadi masalah ini tidak ada.
    const dev = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (!dev && "serviceWorker" in navigator) {
      const sudahDikontrol = !!navigator.serviceWorker.controller;
      let dimuatUlang = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!sudahDikontrol || dimuatUlang) return;
        dimuatUlang = true;
        location.reload();
      });
      // updateViaCache none: berkas sw.js sendiri tidak boleh diambil dari cache HTTP.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
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
