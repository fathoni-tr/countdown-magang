# Task — Intern Countdown

## Tahap 1 — Yang sudah dikerjakan

Next.js 16 (App Router) + React 19 + Tailwind 4, halaman tunggal `force-static`,
deploy di Vercel.

### Countdown
- `lib/config.ts` — satu sumber kebenaran: target selesai magang **29 Jan 2027, 16.00**,
  jam kerja 07.30–16.00, istirahat 12.00–13.00, hari kerja Sen–Jum.
- `lib/schedule.ts` — dua mode hitungan:
  - **semua hari** (kalender polos sampai target), dan
  - **hari kerja saja** (`workRemainingMs`, 1 hari kerja dipadatkan jadi 24 jam
    supaya tetap muat di flip clock). Di luar jam kerja countdown beku sendiri.
  - `getSessionStatus()` → `IN_SESSION` / `OFF_SESSION` / `FINISHED`.
- `components/Countdown.tsx` — flip clock (`@leenguyen/react-flip-clock-countdown`),
  toggle mode countdown, preferensi disimpan per perangkat lewat `lib/storage.ts`
  (localStorage yang gagal diam-diam kalau diblokir).
- `lib/holidays.ts` + `public/data/` — libur nasional & cuti bersama ikut dipotong
  dari hitungan hari kerja.
- `lib/confetti.ts` — confetti saat sesi kerja selesai, idempoten per hari.

### Kalimat motivasi
- `lib/quotes.ts` (~29 KB) — sistem **slot** = suasana × hari.
  Suasana: pagi (sebelum kerja), kerja, istirahat siang, setelah kerja, libur.
  Kalimat berbeda tiap hari dalam seminggu, bukan cuma tiap jam.
- `components/QuoteTicker.tsx` — rotasi acak per perangkat, slot dicek ulang tiap
  putaran jadi pergantian jam/hari menyusul otomatis. Animasi `blurInUp` per karakter.

### Tampilan & lain-lain
- `components/Globe.tsx` — globe `cobe` sebagai dekorasi latar (`pointer-events-none`).
- `components/magicui/animated-theme-toggler.tsx` — toggle terang/gelap.
- `components/InfoBar.tsx` — zona waktu perangkat, jam berjalan, info libur berikutnya.
- PWA: `public/manifest.json`, ikon 192/512.
- `public/sw.js` — service worker **network-first**, `skipWaiting` + `claim`,
  reload sekali otomatis untuk pengunjung lama supaya tidak kena versi basi.
- `@vercel/analytics` terpasang di `app/layout.tsx`.
- `test-schedule.ts` (`npm test`, via tsx) — cek hitungan jadwal, libur, dan pemilihan slot.

---

## Tahap 2 — Chat gelembung anonim (ephemeral) — SELESAI

### Yang mau dicapai
Pengunjung klik ikon pensil di kanan bawah → tulis pesan → Enter/kirim → pesan
tampil sebagai gelembung yang naik dari bawah layar ke tengah sambil bergoyang,
lalu hilang setelah **5 detik**. Pesan terlihat oleh **semua pengunjung yang sedang
online saat itu**. Tanpa database, tanpa akun, tanpa nama pengirim, tanpa riwayat.

### Keputusan arsitektur
**SSE in-memory** — nol dependency baru, nol akun pihak ketiga, nol database.

```
POST /api/chat   → validasi → broadcast ke semua stream yang terbuka → 204
GET  /api/chat   → text/event-stream, tetap terbuka, kirim tiap pesan masuk
```

Pesan tidak pernah disimpan. Ia hanya lewat dari satu request ke sekumpulan
`ReadableStream` yang sedang hidup di memori proses. Kalau tidak ada yang
mendengarkan, pesan hilang begitu saja — itu memang perilaku yang diinginkan.

**Konsekuensi Vercel yang harus diterima (sudah dikonfirmasi):**
- Vercel serverless bisa menjalankan lebih dari satu instance. Pengunjung yang
  kebetulan mendarat di instance berbeda tidak akan saling melihat pesan.
  Untuk trafik satu angkatan magang, praktis selalu satu instance.
- Fungsi Vercel punya batas durasi (Hobby ±60 detik), jadi koneksi SSE akan putus
  berkala. `EventSource` menyambung ulang sendiri; karena pesan cuma hidup 5 detik,
  paling buruk kehilangan satu-dua gelembung saat reconnect. Bisa diterima.
- Kalau nanti terbukti pecah antar-instance, jalur upgrade-nya: ganti broadcast
  in-memory dengan Pusher/Ably free tier — hanya file `lib/chat-bus.ts` yang berubah,
  UI tidak tersentuh.

### File
| File | Aksi | Isi |
|---|---|---|
| `app/api/chat/route.ts` | baru | `GET` (SSE) + `POST` (kirim). `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 60`. |
| `lib/chat-bus.ts` | baru | `Set<(msg) => void>` di scope modul + `subscribe()` / `publish()`. Satu-satunya titik yang perlu diganti kalau pindah ke pub/sub eksternal. |
| `components/ChatBubbles.tsx` | baru | Tombol pensil, input, `EventSource`, render gelembung. |
| `app/globals.css` | ubah | Keyframes `bubble-rise` + `bubble-wiggle`. |
| `app/page.tsx` | ubah | Pasang `<ChatBubbles />`. Halaman tetap `force-static`; komponennya client-side. |
| `public/sw.js` | ubah | Lewatkan `/api/`. Service worker lama meng-clone tiap respons GET untuk cache — pada stream SSE yang tidak pernah selesai itu menahan buffer selamanya, dan fallback offline-nya mengirim HTML ke `EventSource`. Cache dinaikkan ke `v3`. |
| `test-chat.ts` | baru | Self-check: batas panjang, filter kata (termasuk `4nj1ng` / `anjjjiiing`), positif palsu (`cokelat`, `asuransi`), jendela rate limit, pub/sub + unsubscribe. |

### Animasi gelembung
CSS murni, tanpa library animasi. Dua lapis elemen supaya transform-nya tidak
berebut: pembungkus mengurus naik + pudar, isinya mengurus goyang. Pemusatan
horizontal pakai properti `translate` yang terpisah dari `transform`, jadi tidak
ditimpa animasi.

- **Naik**: `translateY` dari `100vh` (bawah layar) ke `45vh` (sekitar tengah),
  `ease-out` supaya melambat menjelang tengah — seperti gelembung udara yang
  kehilangan dorongan.
- **Goyang**: `translateX` bolak-balik ±10–14 px, durasi ~1,3 detik, diulang.
  Amplitudo dan fase diacak sedikit per gelembung (CSS custom property dari JS)
  supaya dua gelembung tidak bergerak identik.
- **Hilang**: `opacity` 0 → 1 di 8% pertama, 1 → 0 di 25% terakhir, plus `scale`
  turun tipis. Elemen dihapus dari state setelah 5 detik lewat `setTimeout`.
- Posisi horizontal awal diacak, tapi dijepit di 10%–90% lebar layar.
- Hormati `prefers-reduced-motion`: hilangkan goyang, sisakan fade naik pelan.

### Ponsel
- Kolom tulis **menumpuk ke atas** tombol pensil (`flex-col`), bukan ke samping.
  Satu baris (input + penghitung + Kirim + pensil) tidak muat di layar 375 px
  dan terpotong di tepi kiri.
- Input `text-base` (16 px). Di bawah 16 px, Safari iOS otomatis memperbesar
  halaman begitu kolom disentuh dan tidak mengembalikannya.
- Dibungkus `<form>` + `enterKeyHint="send"`, jadi tombol kirim papan ketik
  ponsel berfungsi dan berlabel benar.
- `interactiveWidget: "resizes-content"` di `app/layout.tsx` — papan ketik
  memperkecil viewport, bukan menutupi kolom yang `position: fixed`.
- `inset-x-4` + `env(safe-area-inset-bottom)` — aman dari gesture bar iPhone.

### Validasi & batas (semua di server, client cuma cermin)
- Maksimal **120 karakter**. Dipotong di input, ditolak di server kalau lebih.
- **Rate limit per IP**: 1 pesan / 3 detik. `Map<ip, timestamp>` di memori,
  dibersihkan berkala. Lebih cepat dari itu → `429`.
- **Filter kata kasar**: 304 kata (ID + EN) di `lib/chat-bus.ts`, dikelompokkan:
  makian inti, hewan-untuk-menghina, setan/laknat, kecerdasan, status/penampilan,
  seksual, pelacuran, slur identitas, kotoran, singkatan/sensor, Inggris.
  Pesan yang
  kena ditolak `400`. Sebelum dicocokkan, teks dinormalkan: huruf dikecilkan,
  angka samaran diganti (`4nj1ng`), huruf ganda dipadatkan (`anjjjiiing`), dan
  karakter sensor dibuang (`k*ntol`, `a.n.j.i.n.g`). Daftarnya ikut dinormalkan
  supaya kedua sisi cocok. Pencocokan pakai batas kata, jadi `cokelat`,
  `asuransi`, `perekat`, `mekanik` aman.
  Yang sengaja **tidak** diblokir, dengan alasannya:
  - `tll`, `ppk`, `mmk`, `ntt`, `oon` — huruf gandanya dipadatkan jadi
    `tl`/`pk`/`mk`/`nt`/`on`, menyaring singkatan wajar (**TL = team leader**, NTT, "on").
  - `bodoh` — masih dipakai dalam kalimat wajar; salah satu quote proyek sendiri
    berbunyi *"Diam bukan berarti bodoh…"*.
  - `matamu`, `raimu` — bentuk milik biasa (*"Matamu sudah kerja dari tadi"*).
  - `sapi`, `kebo`, `tikus`, `ular`, `kera`, `susu` — kata benda wajar.
  - `cium`, `dewasa`, `mati`, `bunuh`, `gila`, `haram`, `paksa`, `stres`,
    `tewas`, `telanjang`, `silet`, `urin` — kata sehari-hari. "lampu mati",
    "cium tangan", "mata telanjang", "stres deadline" adalah pesan wajar.
  - `yatim`, `piatu` — bukan hinaan sama sekali.
  - `xxx` — huruf gandanya dipadatkan jadi `x`, akan menyaring tiap pesan yang
    memuat huruf x sendirian ("ukuran 10 x 5").
  - `gay`, `lesbi`, `waria` — istilah identitas netral, bukan hinaan.

  Alasan tiap penolakan ditulis ulang sebagai komentar di `lib/chat-bus.ts`
  supaya tidak ada yang menambahkannya kembali tanpa sadar.

  Uji jaring pengaman di `test-chat.ts`: kata & singkatan wajar → 0 tersaring
  keliru; seluruh hinaan yang terdaftar → 0 lolos; 424 kalimat asli dari
  `lib/quotes.ts` → 0 positif palsu. Korpus itu dibaca ulang tiap `npm test`,
  jadi menambah kata ke daftar langsung ketahuan kalau menabrak kalimat wajar.
  Tetap bukan moderasi sempurna.
- Body harus JSON `{ text: string }`; selain itu `400`. Teks di-render sebagai
  teks biasa di React (tidak ada `dangerouslySetInnerHTML`), jadi tidak ada jalur XSS.
- **Maksimal ~15 gelembung** di layar bersamaan. Kalau ramai, yang paling lama
  dibuang duluan supaya layar tidak penuh dan animasi tidak berat.

### Hasil verifikasi
- `npm test` lolos (jadwal + chat), `tsc --noEmit` bersih, `next build` sukses.
  Rute akhir: `/` tetap **Static**, `/api/chat` **Dynamic**.
- API diuji ujung ke ujung di dev: SSE `200 text/event-stream`; POST valid `204`,
  banjir `429 {"reason":"rate"}`, kata kasar `400 {"reason":"bad-word"}`,
  lebih dari 120 karakter `400 {"reason":"too-long"}`, bukan JSON `400`.
  Hanya pesan yang lolos validasi yang muncul di stream.
- Animasi diukur di browser (tinggi viewport 803 px, waktu animasi dikunci manual):

  | detik | posisi atas | opacity |
  |---|---|---|
  | 0,00 | 815 px (di bawah layar) | 0 |
  | 0,25 | 792 px | 0,63 |
  | 1,00 | 721 px | 1 |
  | 3,00 | 535 px | 1 |
  | 4,00 | 446 px | 0,80 |
  | 4,90 | 383 px (≈ tengah layar) | 0,08 |

  Goyang: `--drift` diacak per gelembung (contoh 13,99 px), `translateX` berayun
  `-13,99 → -11,28 → -3,14 …`. Chrome penguji menyalakan `prefers-reduced-motion`
  dan goyangnya memang otomatis mati di sana — sesuai rencana.

### Catatan saat `npm run dev`
Service worker menyajikan `/_next/static/` **cache-first**. Di produksi nama
berkasnya ber-hash jadi aman, tapi di dev nama itu dipakai ulang, sehingga
perubahan CSS bisa tidak terlihat sampai service worker di-unregister. Kalau
sering mengganggu, tambahkan `if (location.hostname === "localhost") return;`
sebelum `navigator.serviceWorker.register` di `components/InfoBar.tsx`.

### Sengaja tidak dibuat
- **Riwayat / persistensi** — bertentangan dengan konsepnya. Tidak akan ditambah.
- **Nama, avatar, "siapa yang online"** — pengunjung anonim, tidak perlu identitas.
- **Reply, reaksi, room** — tambahkan hanya kalau memang diminta nanti.
- **WebSocket** — SSE sudah cukup karena arahnya satu jalur (server → client);
  pengiriman pakai POST biasa.
- **Panel moderasi** — filter kata + rate limit dulu. Naikkan hanya kalau kena spam nyata.
