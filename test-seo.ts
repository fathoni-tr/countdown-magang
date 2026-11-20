// Cek kecil untuk teks SEO dan warna tema yang dibangun dari config.
// Jalankan: npx tsx test-seo.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { END_TARGET } from "./lib/config";
import { TARGET_LONG, TARGET_SHORT } from "./lib/seo";
import { PALETTE } from "./lib/theme";

// Formatter buatan sendiri (lib/time) harus sama dengan format baku id-ID.
const intl = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", o).format(END_TARGET);
assert.equal(TARGET_LONG, intl({ weekday: "long", day: "numeric", month: "long", year: "numeric" }));
assert.equal(TARGET_SHORT, intl({ day: "numeric", month: "long", year: "numeric" }));

// PALETTE (TS) harus sama dengan variabel CSS di globals.css: keduanya dipakai
// bersamaan (CSS untuk halaman, PALETTE untuk theme-color/manifest/gambar OG).
const css = readFileSync("app/globals.css", "utf8");
const block = (sel: string) => css.slice(css.indexOf(`${sel} {`), css.indexOf("}", css.indexOf(`${sel} {`)));
for (const [mode, sel] of [["light", ":root"], ["dark", ':root[data-theme="dark"]']] as const)
  for (const [k, v] of Object.entries(PALETTE[mode]))
    assert.match(block(sel), new RegExp(`--${k}: ${v};`), `${mode}.${k} != globals.css`);

console.log("test-seo: semua lolos");
