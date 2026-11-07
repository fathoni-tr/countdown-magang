import ChatBubbles from "@/components/ChatBubbles";
import Countdown from "@/components/Countdown";
import QuoteTicker from "@/components/QuoteTicker";
import { Globe } from "@/components/Globe";
import InfoBar from "@/components/InfoBar";
import GameDock from "@/components/games/GameDock";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { END_TARGET } from "@/lib/config";
import { DESCRIPTION, FEATURES, HEADING, INTRO, TARGET_TIME } from "@/lib/seo";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-static";

export default function Page() {
  return (
    <main className="relative grid min-h-dvh w-full place-content-center gap-2 overflow-hidden px-4 py-8 text-center">
      <AnimatedThemeToggler className="fixed right-4 top-4 z-10" />

      {/* Globe memposisikan dirinya sendiri (absolute inset-0), jadi ia butuh
          pembungkus berukuran. Dekorasi -> pointer-events-none & opacity rendah.
          game-hide: disembunyikan saat mode game (lihat globals.css); loop
          WebGL-nya ikut berhenti sendiri, lihat Globe.tsx. */}
      <div className="game-hide pointer-events-none fixed left-1/2 top-1/2 aspect-square w-[min(85vh,85vw)] -translate-x-1/2 -translate-y-1/2 opacity-45">
        <Globe className="max-w-none" />
      </div>

      <h1 className="relative text-balance font-display text-2xl uppercase tracking-[0.18em] text-[var(--fg)] sm:text-4xl">
        {HEADING}
      </h1>
      <p className="game-hide relative mb-6 text-sm text-[var(--dim)]">
        {fmtDate(END_TARGET)} · {TARGET_TIME} waktu setempat
      </p>
      <div className="relative">
        <Countdown />
      </div>
      <div className="game-hide relative mt-8">
        <QuoteTicker />
      </div>
      <div className="game-hide relative">
        <InfoBar />
      </div>

      <GameDock />
      <ChatBubbles />

      {/* Ringkasan teks untuk pembaca layar, mesin pencari, dan AI agent: angka
          hitung mundur, kata semangat, dan game baru muncul setelah JavaScript
          jalan, jadi tanpa ini HTML statisnya cuma berisi judul. Isinya sama
          dengan yang tampil di layar (bukan daftar kata kunci). */}
      <section className="sr-only" aria-labelledby="tentang">
        <h2 id="tentang">Tentang {HEADING}</h2>
        <p>{INTRO}</p>
        <p>{DESCRIPTION}</p>
        <ul>
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
