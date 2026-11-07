import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Audiowide, IBM_Plex_Sans } from "next/font/google";
import {
  DESCRIPTION,
  JSON_LD,
  HEADING,
  KEYWORDS,
  REPO_URL,
  SITE_NAME,
  SITE_URL,
  TARGET_LONG,
  TITLE,
} from "@/lib/seo";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const audiowide = Audiowide({
  variable: "--font-audiowide",
  subsets: ["latin"],
  weight: "400",
});

// Judul, deskripsi, dan JSON-LD dibangun dari CONFIG di lib/seo.ts.
// Gambar preview tidak ditulis di sini: app/opengraph-image.png (+ .alt.txt)
// otomatis dipasang Next.js sebagai og:image beserta ukurannya. Manifest juga
// otomatis dari app/manifest.ts.
const SHARE_TITLE = `${HEADING} — sisa waktu menuju ${TARGET_LONG}`;

// Kode verifikasi Google Search Console (opsional). Isi env
// GOOGLE_SITE_VERIFICATION di Vercel lalu redeploy; kosong = tag tidak dibuat.
const GOOGLE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  // Wajib untuk link preview: og:image harus URL lengkap, dan WhatsApp/Telegram
  // tidak mau menebak domainnya dari path relatif.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  category: "productivity",
  authors: [{ name: "fathoni-tr", url: REPO_URL }],
  creator: "fathoni-tr",
  alternates: { canonical: "/" },
  // Izinkan Google menampilkan cuplikan teks dan gambar besar di hasil pencarian.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "id_ID",
    title: SHARE_TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    // Kartu besar: gambar penuh di atas judul, bukan thumbnail kecil di samping.
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
  },
};

// interactiveWidget: papan ketik ponsel memperkecil viewport, bukan menutupi
// halaman. Tanpa ini kolom tulis pesan (position: fixed) bisa tersembunyi di
// belakang papan ketik, terutama di Safari iOS.
// themeColor = --bg di globals.css (warna bilah browser di ponsel).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

// JSON-LD bukan skrip yang dijalankan, jadi aman di bawah CSP. "<" di-escape
// sesuai saran dokumentasi Next.js (guides/json-ld) supaya tidak bisa menutup tag.
const jsonLd = JSON.stringify(JSON_LD).replace(/</g, "\\u003c");

// Terapkan tema sebelum paint pertama supaya tidak berkedip.
const themeScript = `try{var t=localStorage.getItem('theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${plex.variable} ${audiowide.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body className="min-h-full font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
