const mediaCacheName = "gestalt-media-v3";
const mediaRoots = ["/public/images/", "/public/media/"];

function scopedPath(path) {
  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  return `${scopePath}${path}`.replace(/\/{2,}/g, "/");
}

function isCacheableMediaRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return false;
  }

  return mediaRoots.some((root) => url.pathname.startsWith(scopedPath(root)));
}

async function fetchAndStore(request, cache) {
  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function serveMedia(event) {
  const cache = await caches.open(mediaCacheName);
  const cached = await cache.match(event.request, { ignoreSearch: true });

  if (cached) {
    return cached;
  }

  try {
    return await fetchAndStore(event.request, cache);
  } catch {
    return new Response("", { status: 504, statusText: "Media unavailable" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== mediaCacheName && key.startsWith("gestalt-media-")).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (isCacheableMediaRequest(event.request)) {
    event.respondWith(serveMedia(event));
  }
});
