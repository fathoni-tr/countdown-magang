// Bus pesan sementara untuk chat gelembung anonim.
//
// Tidak ada penyimpanan sama sekali: pesan cuma lewat dari sebuah POST ke
// kumpulan stream SSE yang kebetulan sedang terbuka. Kalau tidak ada yang
// mendengarkan, pesan hilang begitu saja -- itu memang perilakunya.
//
// ponytail: Set/Map di scope modul = satu instance serverless. Kalau nanti
// terbukti Vercel memecah pengunjung ke beberapa instance sampai mereka tidak
// saling lihat, ganti publish/subscribe di file ini dengan Pusher/Ably;
// route handler dan UI tidak perlu ikut berubah.

export type ChatMessage = { id: string; text: string };

export const MAX_LEN = 120;
export const RATE_MS = 3000;

/* ---------------------------------------------------------------- pub/sub */

type Listener = (m: ChatMessage) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function publish(text: string): ChatMessage {
  const m: ChatMessage = { id: crypto.randomUUID(), text };
  // Satu pendengar yang error (stream sudah tertutup) tidak boleh menjatuhkan
  // pengiriman ke pendengar lain.
  for (const fn of listeners) {
    try {
      fn(m);
    } catch {
      listeners.delete(fn);
    }
  }
  return m;
}

/* ------------------------------------------------------------ rate limit */

const lastHit = new Map<string, number>();

/** false = terlalu cepat, tolak. */
export function rateLimit(ip: string, now = Date.now()): boolean {
  const prev = lastHit.get(ip);
  if (prev !== undefined && now - prev < RATE_MS) return false;
  lastHit.set(ip, now);
  // Buang entri yang sudah lewat jendela supaya Map tidak tumbuh terus.
  if (lastHit.size > 500)
    for (const [k, t] of lastHit) if (now - t >= RATE_MS) lastHit.delete(k);
  return true;
}

/* --------------------------------------------------------------- validasi */

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s",
};

/**
 * Rapikan supaya bentuk samaran tetap kena: "4nj1nggg", "k*ntol", "a.n.j.i.n.g".
 * Spasi sengaja dipertahankan -- batas kata masih dibutuhkan supaya kata wajar
 * seperti "cokelat" tidak ikut tersaring.
 */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[.\-_*'`+|]/g, "") // karakter yang dipakai orang untuk menyensor
    .replace(/(.)\1+/g, "$1"); // huruf ganda dipadatkan: "anjjjing" -> "anjing"

// ponytail: daftar kata, bukan moderasi sungguhan. Cukup untuk menahan yang
// paling gamblang. Naikkan ke layanan moderasi hanya kalau kena spam nyata.
//
// Pencocokan pakai batas kata pada teks yang sudah dinormalkan (lihat normalize),
// jadi "cokelat", "asuransi", "perekat", "mekanik" aman. Kalau menambah kata,
// pastikan tidak menjadi potongan kata wajar dalam bahasa Indonesia.
//
// SENGAJA TIDAK MASUK DAFTAR, jangan tambahkan tanpa membaca alasannya:
//   cium dewasa mati bunuh gila haram paksa stres tewas telanjang silet urin
//     -> kata sehari-hari. "lampu mati", "cium tangan", "mata telanjang",
//        "stres deadline" adalah pesan wajar.
//   yatim piatu yateam -> "yatim piatu" bukan hinaan sama sekali.
//   gay gei gey lesbi waria -> istilah identitas netral. Memblokirnya membuat
//        orang tidak bisa menyebut dirinya sendiri.
//   xxx -> normalisasi memadatkan huruf ganda jadi "x", menyaring tiap pesan
//        yang memuat huruf x sendirian.
//   matane matamu raimu bodoh -> bentuk wajar, sudah terbukti menabrak kalimat
//        di lib/quotes.ts.
//   tll ppk mmk ntt oon -> menyusut jadi tl/pk/mk/nt/on (TL = team leader).
const BAD_WORDS = [
  // --- Makian inti ---
  "anjing", "anjeng", "anjink", "anjim", "asu", "bangsat", "bangsad",
  "bajingan", "jancok", "jancuk", "dancok", "diancuk", "dancuk", "cukimai",
  "cukimay", "pantek", "pukimak", "pukimai", "puki", "kimak", "kimek",
  "bejat", "bejad", "jingan", "jangkik", "jangkrik", "ndhasmu", "encuk",
  "hencet", "bangor", "modyar", "mokad", "kutis", "nazi", "bundir", "togel",
  // ponytail: "matamu"/"raimu" sengaja dilewat -- itu bentuk milik biasa
  // ("matamu sudah kerja dari tadi"), umpatannya cuma soal nada.
  "lancau", "lanciao",
  // --- Hewan yang dipakai menghina.
  //     ponytail: hanya yang praktis selalu jadi hinaan. "sapi", "kebo",
  //     "tikus", "ular", "kera" sengaja dilewat -- itu kata benda wajar. ---
  "babi", "kampret", "kmpret", "kmprt", "celeng", "bagong", "kirik",
  "kunyuk", "monyet", "babon", "keledai", "bangke", "bangkai", "bodat",
  // --- Setan / laknat / umpatan umum ---
  "setan", "syaitan", "iblis", "laknat", "jahanam", "keparat", "bedebah",
  "biadab", "brengsek", "sialan", "najis", "kampang", "kurang ajar",
  "anak haram", "mampus", "mampos", "modar", "matek", "koit",
  // --- Menghina kecerdasan ---
  // ponytail: "bodoh" sengaja dilewat -- kalimat wajar seperti "diam bukan
  // berarti bodoh" masih memakainya. "bego"/"goblok" tidak punya masalah itu.
  "tolol", "tolo", "goblok", "goblog", "gblk", "gblok", "bego", "begok",
  "dongo", "bloon", "geblek", "pekok", "koplok", "idiot", "sinting",
  "sarap", "telmi", "belegug", "kehed", "gejul", "borokokok",
  // --- Menghina status / penampilan ---
  "kampungan", "katrok", "ndeso", "norak", "udik", "gembel", "cebol",
  "gembrot", "dekil", "cungkring", "bopeng", "peang", "cemen", "culun",
  "burik", "jilat", "penjilat",
  // --- Seksual / tubuh ---
  "kontol","kont", "kontoi", "konthol", "kwontol", "qontol", "memek", "memeq",
  "meki", "pepek", "peler", "peli", "itil", "klentit", "klitoris", "toket",
  "tete", "nenen", "jembut", "silit", "burit", "pantat", "pentil", "titit",
  "telaso", "tusbol", "selangkang", "sempak", "kutang", "penis", "vagina",
  "ngentot", "ngentod", "kentot", "entot", "encuk", "hencet", "ngewe",
  "coli", "colmek", "crot", "sange", "sangean", "ngaceng", "onani",
  "masturbasi", "orgasme", "senggama", "setubuh", "sodomi", "perkosa",
  "cipok", "colai", "cawek", "ngolom", "ngulum", "cumbu", "mesum", "bugil",
  "bokep", "porno", "hentai", "dildo", "sepong", "blowjob", "montok", "bohay",
  // --- Pelacuran ---
  "lonte", "pelacur", "plcur", "perek", "pecun", "sundal", "sundala",
  "bispak", "jablay", "jablai", "kimcil", "germo", "mucikari", "gigolo", "psk",
  // --- Slur identitas ---
  "bencong", "banci", "maho", "homo", "aseng", "negro", "sipit",
  "kadrun", "cebong",
  // --- Kotoran ---
  "tai", "taik", "tahi", "telek", "bacot", "bct",
  // --- Singkatan / sensor.
  //     ponytail: singkatan berhuruf ganda seperti "tll"/"ppk"/"mmk"/"ntt"/"oon"
  //     sengaja TIDAK dipakai. Normalisasi memadatkan huruf ganda, jadi mereka
  //     menyusut jadi "tl"/"pk"/"mk"/"nt"/"on" dan menyaring singkatan wajar
  //     (TL = team leader, "on"). ---
  "anj", "anjg", "anjng", "njing", "ajg", "kntl", "ktl", "kontl", "kntol",
  "mmek", "mek", "pler", "plr", "ngtt", "ngntot", "bgst", "bngst", "bngsat",
  "bgsd", "bngsd", "bjgn", "jncok", "jncuk", "cok", "cuk", "jmbt", "asw",
  // --- Seruan yang dihaluskan. ponytail: hapus baris ini kalau terlalu ketat,
  //     "anjir"/"anjay" sekarang lebih sering jadi seruan kaget daripada makian. ---
  "anjrit", "anjrot", "anjas", "anjis",
  // --- Inggris ---
  "fuck", "fucking", "fucker", "fuk", "fck", "fvck", "fuq", "phuck",
  "motherfucker", "wtf", "stfu", "gtfo", "shit", "shithead", "bullshit",
  "bitch", "bitches", "bitchass", "bastard", "cunt", "asshole", "assholes",
  "arsehole", "arse", "dick", "dickhead", "cock", "prick", "pussy", "twat",
  "wanker", "bollocks", "bugger", "dumbass", "jackass", "douche", "douchebag",
  "moron", "stupid", "dumb", "jerk", "scum", "loser", "pissed", "damn",
  "dammit", "goddamn", "fag", "faggot", "retard", "retarded", "nigger",
  "nigga", "niggas", "whore", "whores", "slut", "sluts", "skank", "hoe",
  "porn", "boobs", "tits", "sex", "seks", "horny",
];

// Daftar ikut dinormalkan supaya kedua sisi bicara bahasa yang sama. Tanpa ini
// tiap kata berhuruf ganda ("tll", "asshole") tidak akan pernah cocok, karena
// teks masuk sudah dipadatkan lebih dulu.
const BAD_RE = new RegExp(
  `\\b(${[...new Set(BAD_WORDS.map(normalize))].join("|")})\\b`,
);

export type Reject = "empty" | "too-long" | "bad-word";
export type Verdict = { ok: true; text: string } | { ok: false; reason: Reject };

export function validate(raw: unknown): Verdict {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_LEN) return { ok: false, reason: "too-long" };
  if (BAD_RE.test(normalize(text))) return { ok: false, reason: "bad-word" };
  return { ok: true, text };
}
