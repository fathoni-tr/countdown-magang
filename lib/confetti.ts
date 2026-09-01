import { CONFIG, END_TARGET } from "./config";
import { isWorkday } from "./schedule";
import { store } from "./storage";
import { atTime, ymd } from "./time";

type Confetti = (opts: Record<string, unknown>) => void;
let confetti: Confetti | null = null;

const reduced = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** onReduced: fallback transisi warna kartu (T-18). */
export async function fire(big: boolean, onReduced: () => void): Promise<void> {
  if (reduced()) return onReduced();
  if (!confetti) {
    try {
      confetti = (await import("canvas-confetti")).default as Confetti;
    } catch {
      return; // gagal muat: lewati diam-diam
    }
  }
  confetti({
    particleCount: big ? 400 : 140,
    spread: big ? 160 : 75,
    origin: { y: 0.6 },
  });
}

/** Idempoten per hari per perangkat. Aman dipanggil setiap detik dan pada visibilitychange. */
export function checkConfetti(now: Date, onReduced: () => void): void {
  if (now >= END_TARGET) {
    if (store.get("confetti:finished")) return;
    store.set("confetti:finished", "1");
    void fire(true, onReduced);
    return;
  }
  if (!isWorkday(now)) return;

  const end = atTime(now, CONFIG.WORK_END);
  if (now < end) return;
  if ((+now - +end) / 60_000 > CONFIG.CONFETTI_GRACE_MINUTES) return;

  const key = `confetti:${ymd(now)}`;
  if (store.get(key)) return;
  store.set(key, "1");
  void fire(false, onReduced);
}
