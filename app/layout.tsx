import type { Metadata } from "next";
import { Audiowide, IBM_Plex_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Intern Countdown",
  description: "Sisa waktu magang menuju 29 Januari 2027 pukul 16.00 waktu setempat.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Intern Countdown",
    description: "Sisa waktu magang menuju 29 Januari 2027 pukul 16.00 waktu setempat.",
    type: "website",
  },
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
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
