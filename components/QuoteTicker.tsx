"use client";

import { useEffect, useState } from "react";
import { TextAnimate } from "@/components/magicui/text-animate";
import { ROTATE_MS, nextQuoteIndex, quoteAt, slotOf, type Slot } from "@/lib/quotes";

/** Acak per perangkat, jadi harus dipilih di klien (halaman ini force-static). */
export default function QuoteTicker() {
  const [q, setQ] = useState<{ slot: Slot; i: number } | null>(null);

  useEffect(() => {
    // Slot (suasana + hari) dicek tiap putaran, jadi pergantian jam
    // kerja/istirahat/libur dan ganti hari menyusul paling lama satu putaran.
    // Ganti slot = undi ulang dari awal.
    const pick = () =>
      setQ((prev) => {
        const slot = slotOf(new Date());
        return { slot, i: nextQuoteIndex(slot, prev?.slot === slot ? prev.i : -1) };
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
          key={`${q.slot}-${q.i}`}
          animation="blurInUp"
          by="character"
          delay={0.1}
          className="text-pretty text-lg italic text-[var(--dim)] sm:text-2xl"
        >
          {quoteAt(q.slot, q.i)}
        </TextAnimate>
      )}
    </div>
  );
}
