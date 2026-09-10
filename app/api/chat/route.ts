import { publish, rateLimit, subscribe, validate } from "@/lib/chat-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Batas durasi fungsi Vercel; 300 detik adalah plafon paket Hobby dengan Fluid
// compute. Koneksi tetap putus di sini, tapi EventSource menyambung ulang
// sendiri dan pesan cuma hidup 5 detik, jadi kerugiannya paling satu gelembung
// tiap 5 menit.
export const maxDuration = 300;

const enc = new TextEncoder();

export function GET() {
  let off = () => {};
  let ping: ReturnType<typeof setInterval> | undefined;

  function stop() {
    off();
    clearInterval(ping);
  }

  const stream = new ReadableStream({
    start(c) {
      const send = (s: string) => {
        try {
          c.enqueue(enc.encode(s));
        } catch {
          stop(); // stream sudah ditutup klien
        }
      };
      off = subscribe((m) => send(`data: ${JSON.stringify(m)}\n\n`));
      // Komentar berkala menahan proxy memutus koneksi yang diam.
      ping = setInterval(() => send(": ping\n\n"), 15_000);
      send(": ok\n\n");
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ reason: "empty" }, { status: 400 });
  }

  const v = validate((body as { text?: unknown } | null)?.text);
  if (!v.ok) return Response.json({ reason: v.reason }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!rateLimit(ip)) return Response.json({ reason: "rate" }, { status: 429 });

  publish(v.text);
  return new Response(null, { status: 204 });
}
