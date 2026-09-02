"use client";

import { useEffect, useState } from "react";
import { TextAnimate } from "@/components/magicui/text-animate";
import { ROTATE_MS, nextQuoteIndex, quoteAt, quoteMood, type Mood } from "@/lib/quotes";

/** Acak per perangkat, jadi harus dipilih di klien (halaman ini force-static). */
export default function QuoteTicker() {
  const [q, setQ] = useState<{ mood: Mood; i: number } | null>(null);

  useEffect(() => {
    // Suasana dicek tiap putaran, jadi pergantian jam kerja/istirahat/libur
    // menyusul paling lama satu putaran. Ganti suasana = undi ulang dari awal.
    const pick = () =>
      setQ((prev) => {
        const mood = quoteMood(new Date());
        return { mood, i: nextQuoteIndex(mood, prev?.mood === mood ? prev.i : -1) };
      });
    pick();
    const id = setInterval(pick, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    // min-h menahan pergeseran layout saat kalimat pendek berganti jadi dua baris.
    <div className="mx-auto flex min-h-[4.5rem] max-w-2xl items-center justify-center sm:min-h-[5rem]">
      {q && (
        <TextAnimate
          key={`${q.mood}-${q.i}`}
          animation="blurInUp"
          by="character"
          delay={0.1}
          className="text-pretty text-lg italic text-[var(--dim)] sm:text-2xl"
        >
          {quoteAt(q.mood, q.i)}
        </TextAnimate>
      )}
    </div>
  );
}
