"use client";

import { useEffect, useRef, useState } from "react";
import FlipClockCountdown from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";
import { CONFIG, END_TARGET } from "@/lib/config";
import { checkConfetti } from "@/lib/confetti";
import { holidayOn, loadHolidays } from "@/lib/holidays";
import {
  getSessionStatus,
  nextSessionStart,
  workRemainingMs,
  type Status,
} from "@/lib/schedule";
import { store } from "@/lib/storage";
import { DAY_NAMES, addDays, atTime, pad, parts, startOfDay, ymd } from "@/lib/time";
import { cn } from "@/lib/utils";

type Mode = "all" | "work";
const MODE_KEY = "count-mode";

const Clock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

const INTERNSHIP_START = CONFIG.INTERNSHIP_START
  ? new Date(CONFIG.INTERNSHIP_START.y, CONFIG.INTERNSHIP_START.m, CONFIG.INTERNSHIP_START.d)
  : null;

/** Label sekunder + nama libur yang dilompati. */
function secondaryLabel(now: Date, target: Date): string {
  const besok = ymd(target) === ymd(addDays(now, 1));
  const hari = besok ? "besok" : DAY_NAMES[target.getDay()];
  const skipped: string[] = [];
  for (let d = addDays(startOfDay(now), 1); d < startOfDay(target); d = addDays(d, 1)) {
    const h = holidayOn(d);
    if (h) skipped.push(h.name);
  }
  const jam = `${pad(CONFIG.WORK_START.hour)}.${pad(CONFIG.WORK_START.minute)}`;
  return `Mulai lagi ${hari} ${jam}${skipped.length ? `, libur ${skipped.join(", ")}` : ""}`;
}

export default function Countdown() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("IN_SESSION");
  const [secLabel, setSecLabel] = useState("");
  const [showSecondary, setShowSecondary] = useState(false);
  // Pilihan per-perangkat, bertahan antar kunjungan (T-17: localStorage boleh gagal).
  const [mode, setMode] = useState<Mode>(() => (store.get(MODE_KEY) === "work" ? "work" : "all"));
  // Mode hari kerja di luar jam kerja: jam utama pindah ke "mulai lagi", sisa
  // waktu kerja turun jadi angka kecil yang beku.
  const [swapped, setSwapped] = useState(false);
  const [mainTo, setMainTo] = useState(+END_TARGET);

  const sd = useRef<HTMLSpanElement>(null);
  const sdWrap = useRef<HTMLDivElement>(null);
  const sh = useRef<HTMLSpanElement>(null);
  const sm = useRef<HTMLSpanElement>(null);
  const ss = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const sr = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    let lastMin = -1;

    // ponytail: transisi warna kartu, jalan barengan confetti.
    const flash = () => {
      const el = card.current;
      if (!el) return;
      el.dataset.flash = "1";
      setTimeout(() => el && delete el.dataset.flash, 700);
    };

    // ponytail: countdown utama diurus FlipClockCountdown. Tick ini hanya untuk
    // sekunder, progress, confetti, dan ringkasan pembaca layar. Selalu hitung
    // ulang dari Date.now() supaya tab background tidak melar.
    const tick = () => {
      const now = new Date();
      const p = parts(+END_TARGET - +now);

      const st = getSessionStatus(now);
      setStatus((prev) => (prev === st ? prev : st));

      const eligible =
        st === "OFF_SESSION" &&
        (CONFIG.SHOW_SECONDARY_BEFORE_WORK_START || now >= atTime(now, CONFIG.WORK_END));
      const target = eligible ? nextSessionStart(now) : null;
      const show = !!target && target < END_TARGET;
      setShowSecondary((prev) => (prev === show ? prev : show));

      const swap = mode === "work" && show;
      setSwapped((prev) => (prev === swap ? prev : swap));
      const to = swap && target ? +target : +END_TARGET;
      setMainTo((prev) => (prev === to ? prev : to));

      if (show && target) {
        const q = swap ? parts(workRemainingMs(now)) : parts(+target - +now);
        if (sd.current) sd.current.textContent = String(q.d);
        if (sdWrap.current) sdWrap.current.hidden = q.d === 0;
        if (sh.current) sh.current.textContent = pad(q.h);
        if (sm.current) sm.current.textContent = pad(q.m);
        if (ss.current) ss.current.textContent = pad(q.s);
        setSecLabel((prev) => {
          const next = secondaryLabel(now, target);
          return prev === next ? prev : next;
        });
      }

      if (INTERNSHIP_START && bar.current && pct.current) {
        const ratio = (+now - +INTERNSHIP_START) / (+END_TARGET - +INTERNSHIP_START);
        const v = Math.min(100, Math.max(0, ratio * 100));
        bar.current.style.width = `${v}%`;
        pct.current.textContent = `${v.toFixed(2)}% selesai`;
      }

      checkConfetti(now, flash);

      if (p.m !== lastMin) {
        lastMin = p.m;
        if (sr.current) sr.current.textContent = `Sisa ${p.d} hari ${p.h} jam ${p.m} menit.`;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      lastMin = -1;
      tick();
    };

    void loadHolidays([new Date().getFullYear(), END_TARGET.getFullYear()]);
    tick();
    // ponytail: 1 Hz, bukan 4 Hz. Satuan terkecil yang ditampilkan detik;
    // confetti dan progress bar tidak butuh resolusi lebih tinggi dari itu.
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);

  const toggleMode = () =>
    setMode((m) => {
      const next: Mode = m === "all" ? "work" : "all";
      store.set(MODE_KEY, next);
      return next;
    });

  if (!mounted) {
    // Placeholder kerangka: nilai waktu tidak boleh dirender di server.
    return <div className="h-[40vh] animate-pulse rounded-3xl bg-[var(--line)]" aria-hidden />;
  }

  const finished = status === "FINISHED";

  return (
    <>
      <button
        type="button"
        onClick={toggleMode}
        aria-pressed={mode === "work"}
        aria-label={
          mode === "work"
            ? "Mode hari kerja. Ganti ke hitung semua hari"
            : "Mode semua hari. Ganti ke hitung hari kerja saja"
        }
        title={mode === "work" ? "Hitung hari kerja saja" : "Hitung semua hari"}
        className={cn(
          "fixed left-4 top-4 z-10 grid size-10 place-items-center rounded-full border bg-[var(--card)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          mode === "work"
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--line)] text-[var(--fg)]",
        )}
      >
        <Clock />
      </button>

      <div
        ref={card}
        className="flip-card rounded-3xl transition-colors duration-500 data-[flash]:bg-[var(--accent)]"
      >
        {finished ? (
          <p className="text-4xl font-bold">Magang selesai. Terima kasih.</p>
        ) : (
          <div aria-live="off">
            {swapped && <p className="mb-3 text-sm text-[var(--dim)]">{secLabel}</p>}
            {/* Ukuran & warna diatur variabel --fcc-* di .flip-card (globals.css).
                Mode hari kerja: `now` semu = END_TARGET - sisa waktu kerja, jadi
                komponen menampilkan hari kerja tersisa tanpa perlu API tambahan. */}
            <FlipClockCountdown
              key={`${mode}-${swapped}`}
              to={mainTo}
              now={
                mode === "work" && !swapped
                  ? () => +END_TARGET - workRemainingMs(new Date())
                  : Date.now
              }
              labels={["HARI", "JAM", "MENIT", "DETIK"]}
              hideOnComplete={false}
              digitBlockStyle={{ fontWeight: 700 }}
              labelStyle={{ fontWeight: 600, letterSpacing: "0.18em" }}
            />
          </div>
        )}
        <p ref={sr} className="sr-only" />
      </div>

      {!finished && showSecondary && (
        <div className="mt-8">
          <p className="mb-1 text-sm text-[var(--dim)]">
            {swapped ? "Sisa hari kerja (beku sampai sesi berikutnya)" : secLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 [font-variant-numeric:tabular-nums]">
            <Unit label="Hari" inner={sd} wrap={sdWrap} />
            <Unit label="Jam" inner={sh} />
            <Unit label="Menit" inner={sm} />
            <Unit label="Detik" inner={ss} />
          </div>
        </div>
      )}

      {INTERNSHIP_START && !finished && (
        <div className="mx-auto mt-8 w-full max-w-2xl">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
            <div
              ref={bar}
              className="h-full w-0 rounded-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
            />
          </div>
          <span ref={pct} className="mt-2 block text-xs text-[var(--dim)]" />
        </div>
      )}
    </>
  );
}

function Unit({
  label,
  inner,
  wrap,
}: {
  label: string;
  inner: React.RefObject<HTMLSpanElement | null>;
  wrap?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={wrap} className="min-w-11">
      <span ref={inner} className="block text-[clamp(1rem,4.4vw,1.7rem)] font-bold leading-none">
        --
      </span>
      <span className="text-[0.65rem] uppercase tracking-widest text-[var(--dim)]">{label}</span>
    </div>
  );
}
