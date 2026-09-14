"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fire } from "@/lib/confetti";
import { MARK_RANK, MAX_HINTS, ROWS, nextHint, scoreGuess, type Mark } from "@/lib/games";
import { store } from "@/lib/storage";
import { ANSWERS, LENGTHS, WORDS, type Len } from "@/lib/words";

const LEN_KEY = "furdle-len";
const streakKey = (n: Len) => `furdle-streak-${n}`;
const bestKey = (n: Len) => `furdle-best-${n}`;

// Set dibangun sekali per panjang kata, saat tebakan pertama divalidasi.
const dicts = new Map<Len, Set<string>>();
function isWord(n: Len, w: string) {
  let d = dicts.get(n);
  if (!d) dicts.set(n, (d = new Set(WORDS[n])));
  return d.has(w);
}

const pickAnswer = (n: Len) => ANSWERS[n][Math.floor(Math.random() * ANSWERS[n].length)];

const MARK_CLASS: Record<Mark, string> = {
  hit: "border-transparent bg-[var(--accent)] text-[var(--bg)]",
  near: "border-transparent bg-amber-400 text-[#11161c]",
  miss: "border-transparent bg-[var(--dim)] text-[var(--bg)]",
};

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const Bulb = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4" aria-hidden>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1v1h6v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3Z" />
  </svg>
);

export default function Furdle() {
  const [len, setLen] = useState<Len>(5);
  const [answer, setAnswer] = useState(() => pickAnswer(5));
  const [rows, setRows] = useState<string[]>([]);
  const [cur, setCur] = useState("");
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const won = rows.length > 0 && rows[rows.length - 1] === answer;
  const done = won || rows.length >= ROWS;

  const start = useCallback((n: Len) => {
    setLen(n);
    setAnswer(pickAnswer(n));
    setRows([]);
    setCur("");
    setMsg("");
    setRevealed([]);
    store.set(LEN_KEY, String(n));
  }, []);

  // Panjang kata yang terakhir dipakai diingat antar kunjungan.
  useEffect(() => {
    const saved = Number(store.get(LEN_KEY)) as Len;
    if (LENGTHS.includes(saved) && saved !== 5) start(saved);
  }, [start]);

  useEffect(() => {
    setStreak(Number(store.get(streakKey(len))) || 0);
    setBest(Number(store.get(bestKey(len))) || 0);
  }, [len]);

  const reject = useCallback((text: string) => {
    setMsg(text);
    setShake((n) => n + 1);
  }, []);

  const submit = useCallback(() => {
    if (done) return;
    if (cur.length < len) return reject("Kurang huruf");
    if (!isWord(len, cur)) return reject("Tidak ada di daftar kata");

    const next = [...rows, cur];
    setRows(next);
    setCur("");
    setMsg("");

    if (cur === answer) {
      void fire(false, () => {});
      const s = streak + 1;
      setStreak(s);
      store.set(streakKey(len), String(s));
      if (s > best) {
        setBest(s);
        store.set(bestKey(len), String(s));
      }
    } else if (next.length >= ROWS) {
      setStreak(0);
      store.set(streakKey(len), "0");
    }
  }, [answer, best, cur, done, len, reject, rows, streak]);

  const type = useCallback(
    (ch: string) => {
      if (done) return;
      setMsg("");
      setCur((c) => (c.length < len ? c + ch : c));
    },
    [done, len],
  );

  const back = useCallback(() => {
    setMsg("");
    setCur((c) => c.slice(0, -1));
  }, []);

  const hint = () => {
    if (done || revealed.length >= MAX_HINTS) return;
    const i = nextHint(answer, rows, revealed);
    if (i === null) return reject("Semua huruf sudah ketahuan");
    setRevealed([...revealed, i]);
    setMsg("");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Enter") return submit();
      if (e.key === "Backspace") return back();
      if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, submit, type]);

  // Warna tiap huruf di papan tik: ambil penilaian terbaik yang pernah didapat.
  const keyMark = useMemo(() => {
    const m: Record<string, Mark> = {};
    for (const g of rows) {
      const marks = scoreGuess(g, answer);
      for (let i = 0; i < answer.length; i++) {
        const prev = m[g[i]];
        if (!prev || MARK_RANK[marks[i]] > MARK_RANK[prev]) m[g[i]] = marks[i];
      }
    }
    return m;
  }, [answer, rows]);

  const hintsLeft = MAX_HINTS - revealed.length;

  return (
    // Lebar papan dan ukuran huruf (ikut jumlah kolom) diatur .furdle di
    // globals.css; --cols dipakai grid tiap baris.
    <div className="furdle flex flex-col gap-3" style={{ "--cols": len } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2 text-left">
        <div>
          <div className="font-display text-lg uppercase tracking-[0.18em] text-[var(--fg)]">Furdle</div>
          <div className="text-xs text-[var(--dim)]">
            Tebak kata {len} huruf, {ROWS} percobaan
          </div>
        </div>
        <div className="flex gap-2">
          <Stat label="Beruntun" value={streak} />
          <Stat label="Terbaik" value={best} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Ganti panjang kata = ronde baru, termasuk beruntun & terbaik yang
            dicatat terpisah per panjang. */}
        <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => start(n)}
              aria-pressed={n === len}
              className={
                "px-3 py-1 text-xs tabular-nums transition-colors " +
                (n === len
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "text-[var(--dim)] hover:text-[var(--fg)]")
              }
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={hint}
          disabled={done || hintsLeft === 0}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-[var(--fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        >
          <Bulb />
          Bantuan · {hintsLeft}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {Array.from({ length: ROWS }, (_, r) => {
          const submitted = r < rows.length;
          const active = !submitted && r === rows.length;
          const word = submitted ? rows[r] : active ? cur : "";
          const marks = submitted ? scoreGuess(rows[r], answer) : null;
          return (
            <div
              // Baris aktif di-remount tiap `shake` naik supaya animasi goyang
              // jalan lagi; tanpa itu animasi hanya main sekali.
              key={active ? `${r}-${shake}` : r}
              className={"furdle-row" + (active && shake ? " furdle-shake" : "")}
            >
              {Array.from({ length: len }, (_, i) => {
                // Huruf hasil bantuan muncul samar bergaris putus-putus di sel
                // yang masih kosong, jadi terbaca sebagai petunjuk, bukan
                // tebakan yang sudah dikirim.
                const isHint = !submitted && !word[i] && revealed.includes(i);
                return (
                  <span
                    key={i}
                    className={
                      "grid aspect-square place-content-center rounded-md border-2 text-[length:var(--letter)] font-semibold uppercase " +
                      (marks
                        ? `furdle-flip ${MARK_CLASS[marks[i]]}`
                        : isHint
                          ? "border-dashed border-[var(--accent)] text-[var(--accent)] opacity-60"
                          : word[i]
                            ? "furdle-pop border-[var(--dim)] text-[var(--fg)]"
                            : "border-[var(--line)] text-[var(--fg)]")
                    }
                    style={marks ? { animationDelay: `${i * 90}ms` } : undefined}
                  >
                    {word[i] ?? (isHint ? answer[i] : "")}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="min-h-5 text-center text-xs text-[var(--dim)]">
        {done ? (
          <>
            {won ? "Tepat! " : `Jawabannya ${answer.toUpperCase()}. `}
            <button
              onClick={() => start(len)}
              className="underline underline-offset-4 hover:text-[var(--fg)]"
            >
              Main lagi
            </button>
          </>
        ) : (
          msg
        )}
      </p>

      <div className="flex flex-col gap-1.5">
        {KEY_ROWS.map((row, i) => (
          <div key={row} className="furdle-keys">
            {i === 2 && <Key wide label="↵" onPress={submit} />}
            {[...row].map((ch) => (
              <Key key={ch} label={ch} mark={keyMark[ch]} onPress={() => type(ch)} />
            ))}
            {i === 2 && <Key wide label="⌫" onPress={back} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Key({
  label,
  mark,
  wide,
  onPress,
}: {
  label: string;
  mark?: Mark;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={
        "furdle-key h-[44px] rounded-md text-[14px] font-medium uppercase transition-colors " +
        (wide ? "furdle-key-wide text-[17px] " : "") +
        (mark
          ? MARK_CLASS[mark]
          : "border border-[var(--line)] bg-[var(--card)] text-[var(--fg)] active:bg-[var(--line)]")
      }
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-14 rounded-lg border border-[var(--line)] px-2 py-1 text-center">
      <div className="text-[0.6rem] uppercase tracking-wider text-[var(--dim)]">{label}</div>
      <div className="font-display text-sm tabular-nums text-[var(--fg)]">{value}</div>
    </div>
  );
}
