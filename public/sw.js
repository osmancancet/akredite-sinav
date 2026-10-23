// Kanıthane çevrimdışı önbellek servisi (yalnızca aynı köken GET istekleri).
// Hiçbir kullanıcı verisi önbelleğe alınmaz; yalnızca uygulamanın statik dosyaları.
const CACHE = "akredite-sinav-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (c) => {
        await c.addAll(["/", "/app", "/manifest.webmanifest", "/icon.svg", "/frameworks/index.json"]);
        // Akreditasyon ölçüt kataloğu (herkese açık kuruluş belgelerinden; kullanıcı verisi değil) çevrimdışı için önbelleğe alınır
        try {
          const index = await (await c.match("/frameworks/index.json")).json();
          await c.addAll(index.map((f) => `/frameworks/${f.slug}.json`));
        } catch {
          /* katalog önbelleğe alınamazsa çevrimiçi açılışta istek anında önbelleğe alınır */
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const { type, urls } = event.data ?? {};
  if (type !== "precache" || !Array.isArray(urls)) return;
  const same = urls.filter((u) => typeof u === "string" && new URL(u).origin === self.location.origin && new URL(u).pathname.startsWith("/_next/static/"));
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(same.map((u) => c.match(u).then((hit) => hit || c.add(u)).catch(() => undefined)))));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(url.pathname.startsWith("/app") ? "/app" : "/"))),
  );
});
