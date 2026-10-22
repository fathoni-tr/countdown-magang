import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP tanpa nonce (lihat "Without Nonces" di dokumentasi CSP Next.js): nonce
// memaksa setiap halaman dirender dinamis, padahal "/" sengaja statis.
// 'unsafe-inline' di script-src tetap perlu untuk skrip tema di layout.tsx dan
// skrip inline milik Next. Yang tetap ditutup rapat: memuat skrip/gaya dari
// domain lain, dipasang di <iframe> situs lain, <object>/<embed>, <base> palsu,
// dan form yang dikirim ke luar.
//
// Pengecualian yang disengaja:
//   worker-src blob:   canvas-confetti membuat Web Worker dari Blob URL.
//   va.vercel-scripts  @vercel/analytics memuat skrip debug dari sini di dev.
//   'unsafe-eval'      React dev tools butuh eval; produksi tidak.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Cadangan frame-ancestors untuk browser lama: tolak clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Jangan biarkan browser menebak tipe berkas (mis. JSON dibaca sebagai HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Situs ini tidak butuh kamera, mikrofon, lokasi, dll. Matikan semuanya.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Jangan umumkan "X-Powered-By: Next.js" -- info gratis untuk pemindai celah.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
