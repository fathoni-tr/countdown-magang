import ChatBubbles from "@/components/ChatBubbles";
import Countdown from "@/components/Countdown";
import QuoteTicker from "@/components/QuoteTicker";
import { Globe } from "@/components/Globe";
import InfoBar from "@/components/InfoBar";
import GameDock from "@/components/games/GameDock";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { END_TARGET } from "@/lib/config";
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

      <h1 className="relative font-display text-2xl uppercase tracking-[0.18em] text-[var(--fg)] sm:text-4xl">
        COUNTDOWN MAGANG
      </h1>
      <p className="game-hide relative mb-6 text-sm text-[var(--dim)]">
        {fmtDate(END_TARGET)} · 16.00 waktu setempat
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
    </main>
  );
}
