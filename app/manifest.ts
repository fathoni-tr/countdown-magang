import type { MetadataRoute } from "next";
import { BATCH, HEADING, ORG, TARGET_LONG, TARGET_TIME } from "@/lib/seo";
import { PALETTE } from "@/lib/theme";

// /manifest.webmanifest (PWA). Dibangun dari CONFIG supaya nama dan tanggalnya
// sama dengan judul halaman; Next.js otomatis memasang <link rel="manifest">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: HEADING,
    short_name: "Countdown",
    description: `Sisa waktu magang ${ORG} ${BATCH} menuju ${TARGET_LONG} pukul ${TARGET_TIME} waktu setempat.`,
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: PALETTE.dark.bg,
    theme_color: PALETTE.dark.bg,
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
