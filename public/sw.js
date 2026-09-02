// ponytail: HTML dan data selalu ambil jaringan dulu, jadi deploy baru langsung
// kelihatan tanpa hard reset. Cache cuma cadangan waktu offline. Aset ber-hash
// di /_next/static isinya tidak pernah berubah, jadi aman diambil dari cache.
const CACHE = "intern-countdown-v2";
const OFFLINE = ["/", "/manifest.json", "/data/holidays-2026.json", "/data/holidays-2027.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Simpan diam-diam. Respons error atau partial (206) jangan sampai masuk cache.
function simpan(req, res) {
  if (res.ok && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit ?? fetch(req).then((res) => simpan(req, res))),
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => simpan(req, res))
      .catch(() => caches.match(req).then((hit) => hit ?? caches.match("/"))),
  );
});
