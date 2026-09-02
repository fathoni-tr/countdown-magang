import { CONFIG, END_TARGET } from "./config";
import { isWorkday } from "./schedule";
import { store } from "./storage";
import { atTime, ymd } from "./time";

type Confetti = (opts: Record<string, unknown>) => void;
let confetti: Confetti | null = null;

/** Confetti selalu jalan, termasuk saat prefers-reduced-motion (permintaan eksplisit).
    flash = transisi warna kartu, ditembakkan barengan. */
export async function fire(big: boolean, flash: () => void): Promise<void> {
  flash();
  if (!confetti) {
    try {
      confetti = (await import("canvas-confetti")).default as Confetti;
    } catch {
      return; // gagal muat: lewati diam-diam
    }
  }
  sideCannons(confetti, big ? 8000 : 3000);
}

const COLORS = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

/** Dua meriam kiri-kanan menembak terus selama ms. */
function sideCannons(confetti: Confetti, ms: number): void {
  const end = Date.now() + ms;
  const frame = () => {
    if (Date.now() > end) return;
    for (const [x, angle] of [[0, 60], [1, 120]] as const) {
      confetti({
        particleCount: 2,
        angle,
        spread: 55,
        startVelocity: 60,
        origin: { x, y: 0.5 },
        colors: COLORS,
      });
    }
    requestAnimationFrame(frame);
  };
  frame();
}

/** Idempoten per hari per perangkat. Aman dipanggil setiap detik dan pada visibilitychange. */
export function checkConfetti(now: Date, flash: () => void): void {
  if (now >= END_TARGET) {
    if (store.get("confetti:finished")) return;
    store.set("confetti:finished", "1");
    void fire(true, flash);
    return;
  }
  if (!isWorkday(now)) return;

  const end = atTime(now, CONFIG.WORK_END);
  if (now < end) return;
  if ((+now - +end) / 60_000 > CONFIG.CONFETTI_GRACE_MINUTES) return;

  const key = `confetti:${ymd(now)}`;
  if (store.get(key)) return;
  store.set(key, "1");
  void fire(false, flash);
}
