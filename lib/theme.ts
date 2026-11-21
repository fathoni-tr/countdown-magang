// Warna tema untuk tempat yang tidak bisa membaca CSS variable: metadata
// <meta name="theme-color">, manifest PWA, dan gambar link preview. Cermin dari
// :root / :root[data-theme="dark"] di app/globals.css -- test-seo.ts
// memastikan keduanya tidak menyimpang.
export const PALETTE = {
  light: { bg: "#f6f7f9", fg: "#11161c", dim: "#5a6572", card: "#ffffff", accent: "#1d4ed8" },
  dark: { bg: "#0b0f14", fg: "#eef2f6", dim: "#cbd5e1", card: "#141b23", accent: "#6d9bff" },
} as const;
