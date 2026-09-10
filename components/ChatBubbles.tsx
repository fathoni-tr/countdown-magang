"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const LIFE_MS = 5000;
const MAX_ON_SCREEN = 15;
const MAX_LEN = 120; // cermin dari MAX_LEN di lib/chat-bus.ts (server yang menentukan)

type Bubble = {
  id: string;
  text: string;
  x: number; // persen lebar layar
  drift: number; // amplitudo goyang, px
  wig: number; // durasi satu ayunan, detik
};

const TOLAKAN: Record<string, string> = {
  rate: "Sabar, satu pesan tiap 3 detik.",
  "too-long": `Maksimal ${MAX_LEN} karakter.`,
  "bad-word": "Pesannya kurang ramah, ganti dulu.",
};

export default function ChatBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Satu koneksi SSE selama halaman terbuka. EventSource menyambung ulang
  // sendiri kalau fungsi Vercel kehabisan durasi.
  useEffect(() => {
    const es = new EventSource("/api/chat");
    const timers = new Set<ReturnType<typeof setTimeout>>();

    es.onmessage = (e) => {
      let m: { id: string; text: string };
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }

      const b: Bubble = {
        id: m.id,
        text: m.text,
        x: 12 + Math.random() * 76,
        drift: 8 + Math.random() * 6,
        wig: 1.1 + Math.random() * 0.6,
      };
      // Saat ramai, gelembung paling lama dibuang duluan.
      setBubbles((prev) => [...prev.slice(-(MAX_ON_SCREEN - 1)), b]);

      const t = setTimeout(() => {
        timers.delete(t);
        setBubbles((prev) => prev.filter((x) => x.id !== b.id));
      }, LIFE_MS);
      timers.add(t);
    };

    return () => {
      es.close();
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function kirim() {
    const t = text.trim();
    if (!t) return;
    setText("");
    setErr("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (r.ok) return;
      const { reason } = (await r.json().catch(() => ({}))) as { reason?: string };
      setErr(TOLAKAN[reason ?? ""] ?? "Pesan tidak terkirim.");
    } catch {
      setErr("Pesan tidak terkirim.");
    }
    setTimeout(() => setErr(""), 3000);
  }

  return (
    <>
      {/* Lapisan gelembung: dekorasi, tidak boleh menangkap klik. */}
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="chat-bubble"
            style={
              {
                left: `${b.x}%`,
                "--drift": `${b.drift}px`,
                "--wig": `${b.wig}s`,
              } as CSSProperties
            }
          >
            <span className="chat-bubble-i max-w-[min(20rem,70vw)] rounded-2xl border border-[var(--line)] bg-[var(--card)]/85 px-4 py-2 text-sm text-[var(--fg)] shadow-lg backdrop-blur-sm">
              {b.text}
            </span>
          </div>
        ))}
      </div>

      {/* Menumpuk ke atas, bukan ke samping: di layar 375 px satu baris
          (input + penghitung + Kirim + pensil) tidak muat dan terpotong.
          inset-x-4 + safe-area menjaga jarak dari tepi dan gesture bar iPhone. */}
      <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2">
        {open && (
          <div className="flex w-full max-w-sm flex-col items-end gap-1">
            {err && (
              <span className="rounded-lg bg-[var(--card)] px-2 py-1 text-xs text-[var(--dim)] shadow">
                {err}
              </span>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void kirim();
              }}
              className="flex w-full items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] py-1 pl-4 pr-1 shadow-lg"
            >
              <input
                ref={inputRef}
                value={text}
                maxLength={MAX_LEN}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Tulis pesan, hilang dalam 5 detik..."
                aria-label="Tulis pesan anonim"
                // enterKeyHint: tombol kirim di papan ketik ponsel.
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                // text-base = 16px. Di bawah itu Safari iOS otomatis memperbesar
                // halaman begitu kolom disentuh, dan tidak mengembalikannya.
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--fg)] outline-none placeholder:text-[var(--dim)]"
              />
              <span className="shrink-0 text-[0.7rem] tabular-nums text-[var(--dim)]">
                {text.length}/{MAX_LEN}
              </span>
              <button
                type="submit"
                aria-label="Kirim pesan"
                className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-2 text-xs text-white transition hover:opacity-90"
              >
                Kirim
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup kolom pesan" : "Tulis pesan anonim"}
          aria-expanded={open}
          className="grid h-12 w-12 place-content-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--fg)] shadow-lg transition hover:scale-105"
        >
          {/* pensil */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>
    </>
  );
}
