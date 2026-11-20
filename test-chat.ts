// Cek terkecil untuk batas chat: panjang, filter kata, rate limit, pub/sub.
// Jalankan: npx tsx test-chat.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clientIp,
  GLOBAL_PER_SEC,
  MAX_STREAMS,
  MAX_STREAMS_PER_IP,
  RATE_MS,
  publish,
  rateLimit,
  streamCount,
  subscribe,
} from "./lib/chat/bus";
import { validate } from "./lib/chat/moderation";
import { MAX_LEN } from "./lib/chat/protocol";
import { GET, POST } from "./app/api/chat/route";

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
  // lib/chat/moderation.ts. Kalau salah satu mulai tersaring, daftarnya kelewat ketat.
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

// Plafon global: banyak IP berbeda dalam satu detik tetap dibatasi total.
{
  const t = 50_000_000;
  let lolos = 0;
  for (let i = 0; i < GLOBAL_PER_SEC * 3; i++) if (rateLimit(`10.0.0.${i}`, t)) lolos++;
  assert.equal(lolos, GLOBAL_PER_SEC, "plafon global per detik tidak berlaku");
  assert.equal(rateLimit("10.9.9.9", t + 1000), true, "detik berikutnya buka lagi");
}

// --- IP klien ---------------------------------------------------------------
assert.equal(clientIp(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
assert.equal(clientIp(new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" })), "8.8.8.8");
assert.equal(clientIp(new Headers()), "local");
assert.equal(clientIp(new Headers({ "x-real-ip": "x".repeat(5000) })).length, 64, "kunci Map dibatasi");

// --- karakter tak terlihat & huruf hias -------------------------------------
for (const s of [
  "an\u200Bjing", // zero-width space di tengah kata
  "an\u200Djing", // zero-width joiner
  "ａｎｊｉｎｇ", // huruf lebar penuh
  "𝐚𝐧𝐣𝐢𝐧𝐠", // huruf tebal matematika
])
  assert.deepEqual(validate(s), { ok: false, reason: "bad-word" }, JSON.stringify(s));
// Bidi override dibuang: teks tampil sesuai urutan aslinya, bukan dibalik.
assert.deepEqual(validate("\u202Egnijna"), { ok: true, text: "gnijna" }, "bidi override dibuang");
assert.deepEqual(validate("ha\u200Blo\u0000"), { ok: true, text: "halo" }, "karakter tak terlihat dibuang");
assert.deepEqual(validate("baris\nbaru"), { ok: true, text: "baris baru" }, "baris baru tetap jadi spasi");

// --- pub/sub --------------------------------------------------------------
const diterima: string[] = [];
const off = subscribe((m) => diterima.push(m.text))!;
subscribe(() => {
  throw new Error("pendengar rusak");
}); // tidak boleh menjatuhkan yang lain
publish("halo");
assert.deepEqual(diterima, ["halo"]);
off();
off(); // dua kali tidak boleh membuat hitungan negatif
publish("setelah unsubscribe");
assert.deepEqual(diterima, ["halo"], "unsubscribe berhenti menerima");
assert.equal(streamCount(), 0, "pendengar rusak ikut dilepas");

// Plafon stream per IP: yang ke-(N+1) ditolak, IP lain tetap boleh, dan slot
// kembali setelah dilepas.
{
  const offs = Array.from({ length: MAX_STREAMS_PER_IP }, () => subscribe(() => {}, "7.7.7.7"));
  assert.ok(offs.every(Boolean));
  assert.equal(subscribe(() => {}, "7.7.7.7"), null, "melewati plafon per IP");
  const lain = subscribe(() => {}, "6.6.6.6");
  assert.ok(lain, "IP lain tidak ikut terkunci");
  offs[0]!();
  const lagi = subscribe(() => {}, "7.7.7.7");
  assert.ok(lagi, "slot kembali setelah dilepas");
  [...offs.slice(1), lain, lagi].forEach((f) => f!());
  assert.equal(streamCount(), 0);
}

// Plafon stream total per instance: yang ke-(MAX_STREAMS+1) ditolak walau IP-nya baru.
{
  const offs = Array.from({ length: MAX_STREAMS }, (_, i) =>
    subscribe(() => {}, `20.${Math.floor(i / MAX_STREAMS_PER_IP)}.0.${i % MAX_STREAMS_PER_IP}`),
  );
  assert.ok(offs.every(Boolean));
  assert.equal(subscribe(() => {}, "21.0.0.1"), null, "melewati plafon total");
  offs.forEach((f) => f!());
  assert.equal(streamCount(), 0);
}

// --- route handler ----------------------------------------------------------
// Dipanggil langsung, tanpa server: semua gerbang POST/GET harus menjawab
// status dan `reason` yang persis.
async function post(body: string, headers: Record<string, string> = {}) {
  const res = await POST(
    new Request("http://countdown.test/api/chat", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", host: "countdown.test", ...headers },
    }),
  );
  const reason = res.status === 204 ? null : ((await res.json()) as { reason: string }).reason;
  return [res.status, reason] as const;
}

// tsx menjalankan berkas ini sebagai CJS: tanpa top-level await.
async function testRoute() {
  const json = (text: unknown) => JSON.stringify({ text });
  const ip = (n: number) => ({ "x-real-ip": `30.0.0.${n}` });

  assert.deepEqual(await post(json("halo"), ip(1)), [204, null], "pesan wajar lolos");
  assert.deepEqual(await post(json("halo"), ip(1)), [429, "rate"], "kirim lagi < 3 detik");
  assert.deepEqual(
    await post(json("halo"), { ...ip(2), origin: "https://jahat.example" }),
    [403, "origin"],
    "POST lintas situs",
  );
  assert.deepEqual(await post(json("halo"), { ...ip(3), origin: "http://countdown.test" }), [204, null], "origin sendiri boleh");
  assert.deepEqual(await post(json("halo"), { ...ip(4), "content-type": "text/plain" }), [415, "content-type"]);
  assert.deepEqual(await post(json("x".repeat(5000)), ip(5)), [413, "too-large"]);
  assert.deepEqual(await post("{bukan json", ip(6)), [400, "bad-json"]);
  assert.deepEqual(await post(json("   "), ip(7)), [400, "empty"]);
  assert.deepEqual(await post(json(42), ip(7)), [400, "empty"]);
  assert.deepEqual(await post(json("a".repeat(MAX_LEN + 1)), ip(8)), [400, "too-long"]);
  assert.deepEqual(await post(json("dasar anjing"), ip(9)), [400, "bad-word"]);

  // GET: stream SSE terdaftar di bus, dan dilepas saat klien pergi.
  {
    const ac = new AbortController();
    const res = GET(new Request("http://countdown.test/api/chat", { signal: ac.signal }));
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^text\/event-stream/);
    assert.equal(streamCount(), 1);
    ac.abort();
    assert.equal(streamCount(), 0, "abort melepas pendengar");

    // Plafon penuh -> 503 busy, bukan stream setengah jadi.
    const offs = Array.from({ length: MAX_STREAMS_PER_IP }, () => subscribe(() => {}, "40.0.0.1"));
    const busy = GET(new Request("http://countdown.test/api/chat", { headers: { "x-real-ip": "40.0.0.1" } }));
    assert.equal(busy.status, 503);
    assert.deepEqual(await busy.json(), { reason: "busy" });
    offs.forEach((f) => f!());
  }
}

void testRoute().then(() => console.log("test-chat: semua lolos"));
