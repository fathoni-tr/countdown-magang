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

import type { ChatMessage } from "./protocol";

export const RATE_MS = 3000;
/** Batas byte body POST. JSON {"text": 120 karakter} paling ~500 byte bahkan
    untuk emoji; 2 KB sudah longgar. Lebih dari ini = bukan klien kita. */
export const MAX_BODY_BYTES = 2048;
/** Pesan per detik untuk SEMUA pengirim digabung. Tiap pesan dikirim ke setiap
    stream yang terbuka, jadi tanpa plafon ini banjir dari banyak IP berlipat
    ganda jadi beban siaran. */
export const GLOBAL_PER_SEC = 10;
/** Plafon stream SSE per instance dan per IP. Per-IP dibuat longgar karena
    satu kantor biasanya keluar lewat satu IP publik (NAT) -- semua anak magang
    di kantor yang sama tidak boleh saling mengunci. */
export const MAX_STREAMS = 1000;
export const MAX_STREAMS_PER_IP = 50;
/** Plafon entri rate limit. Melewati ini = sedang dibanjiri banyak IP; tolak
    sampai jendela lama kedaluwarsa daripada membiarkan memori tumbuh. */
export const MAX_TRACKED_IPS = 10_000;

/* ---------------------------------------------------------------- pub/sub */

type Listener = (m: ChatMessage) => void;
// Nilai = IP pemilik stream, supaya hitungan per-IP ikut turun saat pendengar
// dibuang -- termasuk yang dibuang otomatis oleh publish karena error.
const listeners = new Map<Listener, string>();
const streamsPerIp = new Map<string, number>();

function release(fn: Listener): void {
  const ip = listeners.get(fn);
  if (ip === undefined) return; // sudah dilepas; aman dipanggil dua kali
  listeners.delete(fn);
  const n = (streamsPerIp.get(ip) ?? 1) - 1;
  if (n > 0) streamsPerIp.set(ip, n);
  else streamsPerIp.delete(ip);
}

/** null = plafon stream penuh; pemanggil wajib menolak koneksinya. */
export function subscribe(fn: Listener, ip = "local"): (() => void) | null {
  if (listeners.size >= MAX_STREAMS) return null;
  if ((streamsPerIp.get(ip) ?? 0) >= MAX_STREAMS_PER_IP) return null;
  listeners.set(fn, ip);
  streamsPerIp.set(ip, (streamsPerIp.get(ip) ?? 0) + 1);
  return () => release(fn);
}

export const streamCount = () => listeners.size;

export function publish(text: string): ChatMessage {
  const m: ChatMessage = { id: crypto.randomUUID(), text };
  // Satu pendengar yang error (stream sudah tertutup) tidak boleh menjatuhkan
  // pengiriman ke pendengar lain.
  for (const fn of [...listeners.keys()]) {
    try {
      fn(m);
    } catch {
      release(fn);
    }
  }
  return m;
}

/* ------------------------------------------------------------- IP klien */

/**
 * IP pengirim. Di Vercel, x-real-ip / x-forwarded-for DITIMPA platform dari
 * koneksi TCP, jadi tidak bisa dipalsukan klien. Kalau di-host sendiri, proxy
 * di depannya (nginx dll.) WAJIB menimpa header ini juga -- tanpa itu siapa pun
 * bisa mengarang IP dan lolos dari rate limit.
 *
 * Dipotong 64 karakter: kunci Map tidak boleh bisa dibuat sebesar apa pun.
 */
export function clientIp(h: Headers): string {
  const raw = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "";
  return raw.trim().slice(0, 64) || "local";
}

/* ------------------------------------------------------------ rate limit */

const lastHit = new Map<string, number>();
let winStart = 0;
let winCount = 0;

/** false = terlalu cepat (per IP atau total semua pengirim), tolak. */
export function rateLimit(ip: string, now = Date.now()): boolean {
  const prev = lastHit.get(ip);
  if (prev !== undefined && now - prev < RATE_MS) return false;

  if (now - winStart >= 1000) {
    winStart = now;
    winCount = 0;
  }
  if (winCount >= GLOBAL_PER_SEC) return false;

  // Buang entri yang sudah lewat jendela supaya Map tidak tumbuh terus.
  if (lastHit.size > 500)
    for (const [k, t] of lastHit) if (now - t >= RATE_MS) lastHit.delete(k);
  if (lastHit.size >= MAX_TRACKED_IPS) return false;

  winCount++;
  lastHit.set(ip, now);
  return true;
}
