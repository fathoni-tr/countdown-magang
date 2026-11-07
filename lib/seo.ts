// Teks SEO dipakai bersama oleh metadata (layout.tsx), manifest, JSON-LD, dan
// /llms.txt. Semua tanggal dibangun dari CONFIG supaya tidak ketinggalan kalau
// tanggal selesai magang diubah.
import { CONFIG, END_TARGET } from "@/lib/config";

const pad = (n: number) => String(n).padStart(2, "0");

export const SITE_URL = CONFIG.SITE_URL;
export const SITE_NAME = "Countdown Magang";
export const REPO_URL = "https://github.com/fathoni-tr/countdown-magang";

// "Jumat, 29 Januari 2027" dan "29 Januari 2027".
export const TARGET_LONG = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(END_TARGET);
export const TARGET_SHORT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(END_TARGET);
export const TARGET_TIME = `${pad(CONFIG.END_TARGET.hour)}.${pad(CONFIG.END_TARGET.minute)}`;
const WORK_HOURS = `${pad(CONFIG.WORK_START.hour)}.${pad(CONFIG.WORK_START.minute)}–${pad(CONFIG.WORK_END.hour)}.${pad(CONFIG.WORK_END.minute)}`;

// Nama kampus/instansi yang dicari orang ("magang itpln", "intern itpln").
// Ganti kalau situs ini dipakai angkatan lain. Google hampir tidak membaca
// meta keywords, jadi istilah pencarian harus muncul di judul, deskripsi, dan
// teks halaman -- semuanya dibangun dari konstanta di bawah.
export const ORG = "ITPLN";
// Label angkatan yang ikut tampil di judul halaman (h1) dan hasil pencarian.
export const BATCH = "2023";
// "Countdown Magang ITPLN 2023" -- h1 halaman, nama di JSON-LD/manifest/llms.txt.
export const HEADING = `${SITE_NAME} ${ORG} ${BATCH}`;

// Judul < ~65 karakter supaya tidak dipotong di hasil Google. Memuat
// "countdown magang", "magang ITPLN 2023", dan "intern countdown" sekaligus.
export const TITLE = `${HEADING} (Intern Countdown) — ${TARGET_SHORT}`;
// Kalimat pertama = inti yang tetap terbaca walau WhatsApp/Google memotongnya.
export const DESCRIPTION = `Hitung mundur selesai magang ${ORG} ${BATCH}: ${TARGET_LONG} pukul ${TARGET_TIME}. Countdown intern dengan mode hari kerja, kata semangat harian, chat anonim, dan mini game buat teman-teman magang.`;

export const FEATURES = [
  `Flip clock hitung mundur ke ${TARGET_LONG} pukul ${TARGET_TIME} waktu setempat`,
  `Mode "hari kerja": hanya menghitung jam kerja (Senin–Jumat, ${WORK_HOURS}), melewati libur nasional dan cuti bersama`,
  "Kata semangat yang berganti sesuai jam dan hari",
  "Chat anonim real-time tanpa akun; pesan hilang setelah 5 detik dan tidak disimpan",
  "Mini game: Furdle (Wordle bahasa Indonesia), 2048, Blue Puzzle, Block Blast, Minesweeper",
  "Tema terang/gelap, bisa dipasang sebagai aplikasi (PWA), ramah ponsel",
];

const org = ORG.toLowerCase();
export const KEYWORDS = [
  "countdown magang",
  `countdown magang ${org}`,
  `countdown magang ${org} ${BATCH}`,
  `magang ${org} ${BATCH}`,
  `intern ${org} ${BATCH}`,
  `magang ${org}`,
  `intern ${org}`,
  `internship ${org}`,
  "countdown intern",
  "intern countdown",
  "internship countdown",
  "hitung mundur magang",
  "hitung mundur selesai magang",
  "sisa waktu magang",
  "sisa hari magang",
  "kapan magang selesai",
  "countdown hari kerja",
];

// Teks pengantar untuk HTML statis dan /llms.txt: kalimat biasa yang memuat
// istilah pencarian di atas, bukan daftar kata kunci.
export const INTRO = `${HEADING} adalah countdown intern berbahasa Indonesia untuk teman-teman magang ${ORG} ${BATCH}: menampilkan sisa waktu magang sampai hari terakhir, ${TARGET_LONG} pukul ${TARGET_TIME}. Gratis dan tanpa akun.`;

// Data terstruktur schema.org (JSON-LD) untuk Google dan AI agent.
export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: HEADING,
      alternateName: [
        SITE_NAME,
        `${SITE_NAME} ${ORG}`,
        `Countdown Intern ${ORG}`,
        `Hitung Mundur Magang ${ORG}`,
        "Intern Countdown",
      ],
      description: DESCRIPTION,
      inLanguage: "id-ID",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: HEADING,
      url: SITE_URL,
      description: DESCRIPTION,
      abstract: INTRO,
      audience: { "@type": "Audience", audienceType: `Mahasiswa dan peserta magang ${ORG} ${BATCH}` },
      image: `${SITE_URL}/opengraph-image.png`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      inLanguage: "id-ID",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      featureList: FEATURES,
      keywords: KEYWORDS.join(", "),
      isPartOf: { "@id": `${SITE_URL}/#website` },
      sameAs: [REPO_URL],
    },
  ],
};
