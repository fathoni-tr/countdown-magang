// Kontrak chat yang dipakai bersama server (app/api/chat) dan klien
// (components/ChatBubbles). Sengaja tanpa import apa pun: file ini ikut masuk
// bundle browser, jadi state server dan daftar kata kasar tidak boleh ada di sini.

export type ChatMessage = { id: string; text: string };

export const MAX_LEN = 120;

/** Semua alasan penolakan yang bisa dikirim server sebagai `{ reason }`. */
export type ChatError =
  | "empty" // teks kosong / bukan string
  | "too-long" // > MAX_LEN karakter
  | "bad-word" // kena filter kata
  | "bad-json" // body bukan JSON
  | "too-large" // body > batas byte
  | "content-type" // bukan application/json
  | "origin" // POST lintas situs
  | "rate" // terlalu cepat
  | "busy"; // plafon stream SSE penuh

/** Data dari jaringan: pastikan bentuknya benar sebelum dipakai. */
export function isChatMessage(v: unknown): v is ChatMessage {
  const m = v as Partial<ChatMessage> | null;
  return typeof m?.id === "string" && typeof m?.text === "string";
}
