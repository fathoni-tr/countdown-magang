import {
  clientIp,
  MAX_BODY_BYTES,
  publish,
  rateLimit,
  subscribe,
  validate,
} from "@/lib/chat-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Batas durasi fungsi Vercel; 300 detik adalah plafon paket Hobby dengan Fluid
// compute. Koneksi tetap putus di sini, tapi EventSource menyambung ulang
// sendiri dan pesan cuma hidup 5 detik, jadi kerugiannya paling satu gelembung
// tiap 5 menit.
export const maxDuration = 300;

const enc = new TextEncoder();

/** Tolakan kecil seragam. no-store: jangan sampai proxy menyimpan 429/503. */
const reject = (status: number, reason: string, extra?: Record<string, string>) =>
  Response.json({ reason }, { status, headers: { "cache-control": "no-store", ...extra } });

export function GET(req: Request) {
  let off: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | undefined;
  let deliver: ((s: string) => void) | null = null;

  function stop() {
    off?.();
    off = null;
    deliver = null;
    clearInterval(ping);
  }

  // Daftar dulu SEBELUM membuat stream: kalau plafon penuh, tolak dengan 503
  // biasa supaya tidak ada stream setengah jadi yang menahan memori.
  off = subscribe((m) => deliver?.(`data: ${JSON.stringify(m)}\n\n`), clientIp(req.headers));
  if (!off) return reject(503, "busy", { "retry-after": "30" });

  const stream = new ReadableStream({
    start(c) {
      deliver = (s: string) => {
        try {
          c.enqueue(enc.encode(s));
        } catch {
          stop(); // stream sudah ditutup klien
        }
      };
      // Komentar berkala menahan proxy memutus koneksi yang diam.
      ping = setInterval(() => deliver?.(": ping\n\n"), 15_000);
      deliver(": ok\n\n");
    },
    cancel: stop,
  });

  // Pengaman kedua: tidak semua runtime memanggil cancel saat klien pergi.
  req.signal.addEventListener("abort", stop, { once: true });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

/** Body dibaca dengan plafon byte. Content-Length bisa dibohongi atau tidak ada
    (chunked), jadi hitungan dilakukan sambil membaca, bukan dari header. */
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(req: Request) {
  // Tolak lintas situs: halaman lain tidak boleh memakai pengunjungnya untuk
  // menembak endpoint ini. Browser selalu mengirim Origin pada POST fetch;
  // klien non-browser tanpa Origin tetap kena rate limit di bawah.
  const origin = req.headers.get("origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== req.headers.get("host")) return reject(403, "origin");
  }

  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return reject(415, "content-type");

  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return reject(413, "too-large");
  const raw = await readCapped(req, MAX_BODY_BYTES);
  if (raw === null) return reject(413, "too-large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reject(400, "empty");
  }

  const v = validate((body as { text?: unknown } | null)?.text);
  if (!v.ok) return reject(400, v.reason);

  if (!rateLimit(clientIp(req.headers))) return reject(429, "rate", { "retry-after": "3" });

  publish(v.text);
  return new Response(null, { status: 204 });
}
