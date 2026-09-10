// Cek terkecil untuk batas chat: panjang, filter kata, rate limit, pub/sub.
// Jalankan: npx tsx test-chat.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_LEN, RATE_MS, publish, rateLimit, subscribe, validate } from "./lib/chat-bus";

// --- validate -------------------------------------------------------------
assert.deepEqual(validate("  halo   dunia  "), { ok: true, text: "halo dunia" });
assert.equal(validate(""). ok, false);
assert.equal(validate("   ").ok, false);
assert.equal(validate(123).ok, false);
assert.equal(validate(null).ok, false);

assert.deepEqual(validate("a".repeat(MAX_LEN)), { ok: true, text: "a".repeat(MAX_LEN) });
assert.deepEqual(validate("a".repeat(MAX_LEN + 1)), { ok: false, reason: "too-long" });

// Kata kasar: utuh, disamarkan angka, huruf berulang, disensor simbol/titik.
for (const s of [
  "dasar anjing", "4nj1ng", "anjjjiiing", "a.n.j.i.n.g", "a-n-j-i-n-g",
  "WHAT THE FUCK", "goblok banget", "k*ntol", "k0nt0l", "pler lu",
  "dasar anj", "bgst kali", "ngentot", "b4c0t", "$hit", "wtf ini",
  "dasar babi", "b4b1", "kampret lu", "setan alas", "brengsek",
  "sialan banget", "mampus kau", "dasar gembel", "kampungan", "kurang ajar",
  "stupid banget", "what a loser",
  "bejat", "jangkrik", "ndhasmu", "dasar bodat", "cemen lu", "culun",
  "penjilat", "konthol", "pepek", "bugil", "hentai", "sempak", "titit",
  "onani", "sodomi", "mokad", "modyar",
])
  assert.deepEqual(validate(s), { ok: false, reason: "bad-word" }, s);

// Batas kata harus menahan positif palsu. Semua ini kata wajar yang mengandung
// potongan dari daftar di atas.
for (const s of [
  "cokelat enak", "sabar ya", "semangat teman-teman", "asuransi kantor",
  "mekanik datang", "perekat kertas", "pantai selatan", "sangat bagus",
  "anjuran atasan", "pukul empat", "sulit sekali", "laptop asus", "e-mail masuk",
  "sisa 100 hari", "begonia mekar", "kelas pagi", "assalamualaikum semua",
  // Singkatan wajar yang pernah tersaring keliru saat daftar diperbanyak.
  "tanya ke tl dulu", "pk 3 sore", "mk semester ini", "cuti ke ntt",
  // Kata yang PERNAH diusulkan masuk daftar tapi ditolak -- lihat catatan di
  // lib/chat-bus.ts. Kalau salah satu mulai tersaring, daftarnya kelewat ketat.
  "lampu mati", "cium tangan dulu", "sudah dewasa", "gila kerennya",
  "makanan haram", "jangan dipaksa", "stres deadline", "mata telanjang",
  "yatim piatu", "anak yatim", "korban tewas", "beli silet", "tes urin",
  "x dan y", "ukuran 10 x 5", "matane wis kesel", "jangan bodoh",
  "on time ya", "sarapan dulu", "tolong bantu", "telekomunikasi",
  "kebodohan masa lalu", "closer ke target", "beli sepatu", "sipil dan arsitek",
  "monitor kantor", "modal dikit", "pegang janji", "normal aja", "koin receh",
])
  assert.equal(validate(s).ok, true, s);

// Korpus nyata: 500+ kalimat Indonesia milik proyek ini tidak boleh ada yang
// tersaring. Ini jaring pengaman tiap kali BAD_WORDS ditambah.
const korpus = [...new Set(
  (["lib/quotes.ts", "lib/holidays.ts", "components/Countdown.tsx", "app/page.tsx"]
    .map((f) => readFileSync(f, "utf8"))
    .join("\n")
    .match(/"[^"]{12,}"/g) ?? []
  ).map((s) => s.slice(1, -1)),
)];
assert.ok(korpus.length > 300, `korpus terlalu kecil: ${korpus.length}`);
for (const s of korpus) {
  const v = validate(s.slice(0, MAX_LEN));
  assert.notEqual(v.ok === false && v.reason, "bad-word", `positif palsu di korpus: ${s}`);
}

// --- rate limit -----------------------------------------------------------
const t0 = 1_000_000;
assert.equal(rateLimit("1.1.1.1", t0), true);
assert.equal(rateLimit("1.1.1.1", t0 + RATE_MS - 1), false, "terlalu cepat");
assert.equal(rateLimit("1.1.1.1", t0 + RATE_MS), true, "sudah lewat jendela");
assert.equal(rateLimit("2.2.2.2", t0), true, "IP lain tidak ikut kena");

// --- pub/sub --------------------------------------------------------------
const diterima: string[] = [];
const off = subscribe((m) => diterima.push(m.text));
subscribe(() => {
  throw new Error("pendengar rusak");
}); // tidak boleh menjatuhkan yang lain
publish("halo");
assert.deepEqual(diterima, ["halo"]);
off();
publish("setelah unsubscribe");
assert.deepEqual(diterima, ["halo"], "unsubscribe berhenti menerima");

console.log("test-chat: semua lolos");
