import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DESCRIPTION, FEATURES, HEADING, INTRO, KEYWORDS, REPO_URL, SITE_URL } from "@/lib/seo";

// /llms.txt (https://llmstxt.org): ringkasan teks biasa untuk AI agent dan
// crawler LLM yang tidak menjalankan JavaScript -- halaman utama nyaris kosong
// tanpa JS karena hitung mundurnya dihitung di browser. Dibangun dari CONFIG
// saat build, jadi tanggalnya tidak bisa ketinggalan.
export const dynamic = "force-static";

// Hanya tautkan berkas libur yang benar-benar ada di public/data.
const years = readdirSync(join(process.cwd(), "public", "data"))
  .map((f) => /^holidays-(\d{4})\.json$/.exec(f)?.[1])
  .filter((y): y is string => !!y)
  .sort();

const body = `# ${HEADING}

> ${DESCRIPTION}

${INTRO} Sisa waktunya dihitung langsung di browser pengunjung (waktu setempat), jadi angka pastinya hanya terlihat dengan JavaScript.

Dikenal juga sebagai: ${KEYWORDS.slice(0, 11).join(", ")}.

## Fitur

${FEATURES.map((f) => `- ${f}`).join("\n")}

## Halaman dan data

- [Halaman utama](${SITE_URL}/): hitung mundur, kata semangat, chat anonim, dan mini game
${years.map((y) => `- [Libur nasional & cuti bersama ${y}](${SITE_URL}/data/holidays-${y}.json): JSON \`{ date, name, type }\`, type = \`nasional\` atau \`cuti_bersama\``).join("\n")}

## Opsional

- [Kode sumber (MIT)](${REPO_URL}): Next.js, bisa dipakai untuk tanggal magang sendiri lewat \`lib/config.ts\`
`;

export function GET() {
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
