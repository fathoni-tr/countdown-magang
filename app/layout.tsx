import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Audiowide, IBM_Plex_Sans } from "next/font/google";
import { CONFIG, END_TARGET } from "@/lib/config";
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

// Tanggal dibangun dari CONFIG, jadi teks preview tidak bisa ketinggalan kalau
// tanggal selesai magang diubah. Contoh: "Jumat, 29 Januari 2027 pukul 16.00".
const TARGET = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(END_TARGET);
const JAM = `${String(CONFIG.END_TARGET.hour).padStart(2, "0")}.${String(CONFIG.END_TARGET.minute).padStart(2, "0")}`;

const TITLE = "Countdown Magang";
// Kalimat pertama = inti yang tetap terbaca walau WhatsApp memotongnya.
const DESCRIPTION = `Hitung mundur selesai magang: ${TARGET} pukul ${JAM}. Mode hari kerja, kata semangat harian, chat anonim, dan mini game buat teman-teman magang.`;

// Gambar preview tidak ditulis di sini: app/opengraph-image.png (+ .alt.txt)
// otomatis dipasang Next.js sebagai og:image beserta ukurannya.
export const metadata: Metadata = {
  // Wajib untuk link preview: og:image harus URL lengkap, dan WhatsApp/Telegram
  // tidak mau menebak domainnya dari path relatif.
  metadataBase: new URL(CONFIG.SITE_URL),
  title: `${TITLE} — ${TARGET}`,
  description: DESCRIPTION,
  applicationName: TITLE,
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    locale: "id_ID",
    title: `${TITLE} — sisa waktu menuju ${TARGET}`,
    description: DESCRIPTION,
  },
  twitter: {
    // Kartu besar: gambar penuh di atas judul, bukan thumbnail kecil di samping.
    card: "summary_large_image",
    title: `${TITLE} — sisa waktu menuju ${TARGET}`,
    description: DESCRIPTION,
  },
};

// interactiveWidget: papan ketik ponsel memperkecil viewport, bukan menutupi
// halaman. Tanpa ini kolom tulis pesan (position: fixed) bisa tersembunyi di
// belakang papan ketik, terutama di Safari iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

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
      </head>
      <body className="min-h-full font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
