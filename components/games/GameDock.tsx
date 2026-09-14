"use client";

import { useEffect, useState } from "react";
import BluePuzzle from "./BluePuzzle";
import Furdle from "./Furdle";
import Game2048 from "./Game2048";

// Urutan siklus tombol puzzle: Furdle -> 2048 -> Blue Puzzle.
const GAMES = [
  { name: "Furdle", Comp: Furdle },
  { name: "2048", Comp: Game2048 },
  { name: "Blue Puzzle", Comp: BluePuzzle },
];

const OFF = -1;

const Puzzle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-5" aria-hidden>
    {/* Satu keping jigsaw: badan kotak dengan tonjolan di atas dan kanan. */}
    <path d="M4 8.4h4.5a2.2 2.2 0 1 1 3 0H16v3.5a2.2 2.2 0 1 1 0 3v4.1H4Z" />
  </svg>
);

export default function GameDock() {
  const [i, setI] = useState(OFF);
  const active = GAMES[i];

  // Bersihkan penanda kalau komponennya dilepas.
  useEffect(() => () => document.documentElement.removeAttribute("data-game"), []);

  // Halaman perlu tahu ada game yang jalan supaya jam flip mengecil dan
  // dekorasi dilepas. Lewat atribut di <html> saja: page.tsx tetap komponen
  // server, tidak perlu context atau prop drilling.
  //
  // Atribut dipasang di sini, bukan di useEffect: kalau menunggu effect,
  // browser menata ulang halaman sekali dengan gaya lama lalu sekali lagi
  // setelah atributnya berubah -- dua kali kerja tiap kali ganti game.
  const next = () => {
    const v = i + 1 >= GAMES.length ? OFF : i + 1;
    document.documentElement.toggleAttribute("data-game", v !== OFF);
    setI(v);
  };
  const label = active ? `Ganti ke ${GAMES[i + 1]?.name ?? "countdown"}` : `Main ${GAMES[0].name}`;

  return (
    <>
      {active && (
        <div className="relative z-10 mt-6 flex justify-center pb-24">
          <active.Comp key={i} />
        </div>
      )}

      <button
        type="button"
        onClick={next}
        title={label}
        aria-label={label}
        // Ukuran & bentuk disamakan dengan tombol bulat lain di halaman
        // (pengalih tema, pengalih mode hitung).
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--fg)] shadow-lg transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Puzzle />
      </button>
    </>
  );
}
