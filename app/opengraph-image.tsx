// Gambar link preview (WhatsApp/Telegram/X), 1200 x 630, dibangun dari CONFIG
// saat build -- ganti tanggal di lib/config.ts, gambarnya ikut. Next.js memasang
// og:image + ukuran + alt dari ekspor di bawah. Isi penting sengaja di tengah:
// thumbnail kecil WhatsApp memotong jadi persegi.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { END_TARGET } from "@/lib/config";
import { SITE_NAME, SITE_URL, TARGET_LONG, TARGET_TIME } from "@/lib/seo";
import { PALETTE } from "@/lib/theme";
import { pad } from "@/lib/time";

export const alt = `${SITE_NAME}: flip clock menuju ${TARGET_LONG} pukul ${TARGET_TIME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = PALETTE.dark;
const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
const [audiowide, plexRegular, plexSemi, plexBold] = await Promise.all([
  font("Audiowide-Regular.ttf"),
  font("IBMPlexSans-Regular.ttf"),
  font("IBMPlexSans-SemiBold.ttf"),
  font("IBMPlexSans-Bold.ttf"),
]);

// Keping flip clock: TGL : BLN : THN dari tanggal target.
const GROUPS = [
  { label: "TGL", digits: pad(END_TARGET.getDate()) },
  { label: "BLN", digits: pad(END_TARGET.getMonth() + 1) },
  { label: "THN", digits: pad(END_TARGET.getFullYear() % 100) },
];

/** Lingkaran berpusat di (600, 328) -- tengah gambar, sedikit di bawah. */
const circle = (d: number) => ({
  position: "absolute" as const,
  left: 600 - d / 2,
  top: 328 - d / 2,
  width: d,
  height: d,
  borderRadius: "50%",
});

const Tile = ({ n }: { n: string }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 74,
      height: 104,
      background: C.card,
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 72,
      lineHeight: 1,
      color: C.fg,
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    }}
  >
    {n}
    {/* garis lipat flip clock */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 52, height: 1, background: "rgba(148,161,174,0.35)" }} />
  </div>
);

const Sep = () => (
  <div style={{ fontSize: 52, fontWeight: 700, color: C.dim, paddingTop: 18 }}>:</div>
);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          background: C.bg,
          color: C.fg,
          fontFamily: "Plex",
        }}
      >
        {/* Globe: cahaya + bola titik, meniru globe cobe di situs. */}
        <div
          style={{
            ...circle(560),
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(109,155,255,0.18), rgba(109,155,255,0.06) 55%, transparent 70%)",
          }}
        />
        <div
          style={{
            ...circle(430),
            opacity: 0.75,
            backgroundColor: "#10161e",
            backgroundImage: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.10), transparent 60%)",
            boxShadow: "0 0 80px 10px rgba(109,155,255,0.12), inset -40px -50px 90px rgba(0,0,0,0.55)",
          }}
        />
        {/* Pola titik sebagai SVG: satori tidak merender radial-gradient
            sekecil 11 px yang diulang lewat backgroundSize. */}
        <svg width={430} height={430} style={{ ...circle(430), opacity: 0.75 }}>
          <defs>
            <pattern id="dot" width="11" height="11" patternUnits="userSpaceOnUse">
              <circle cx="5.5" cy="5.5" r="1.4" fill="rgba(148,161,174,0.35)" />
            </pattern>
          </defs>
          <circle cx="215" cy="215" r="215" fill="url(#dot)" />
        </svg>
        <div style={{ ...circle(12), left: 738, top: 516, background: "#f97316", boxShadow: "0 0 14px #f97316" }} />
        <div style={{ ...circle(9), left: 448, top: 512, background: "#f97316", boxShadow: "0 0 14px #f97316" }} />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "Audiowide",
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "0.14em",
              // letter-spacing menambah ruang di kanan huruf terakhir; geser balik.
              paddingLeft: "0.14em",
            }}
          >
            {SITE_NAME.toUpperCase()
              .split(" ")
              .map((w) => (
                <div key={w}>{w}</div>
              ))}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
            {GROUPS.flatMap((g, i) => [
              ...(i ? [<Sep key={`s${i}`} />] : []),
              <div key={g.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Tile n={g.digits[0]} />
                  <Tile n={g.digits[1]} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.28em", paddingLeft: "0.28em", color: C.dim }}>
                  {g.label}
                </div>
              </div>,
            ])}
          </div>

          <div style={{ display: "flex", fontSize: 26, fontWeight: 600 }}>
            Menuju&nbsp;<span style={{ color: C.accent, fontWeight: 700 }}>{TARGET_LONG}</span>&nbsp;· {TARGET_TIME}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 30,
            display: "flex",
            justifyContent: "center",
            fontSize: 19,
            letterSpacing: "0.04em",
            color: C.dim,
          }}
        >
          {new URL(SITE_URL).host}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Audiowide", data: audiowide, weight: 400, style: "normal" },
        { name: "Plex", data: plexRegular, weight: 400, style: "normal" },
        { name: "Plex", data: plexSemi, weight: 600, style: "normal" },
        { name: "Plex", data: plexBold, weight: 700, style: "normal" },
      ],
    },
  );
}
