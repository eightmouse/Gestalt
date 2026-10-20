const mediaCacheName = "gestalt-media-v3";
const mediaRoots = ["/public/images/", "/public/media/"];
const mediaRefreshInterval = 5 * 60 * 1000;
const mediaRetryInterval = 30 * 1000;
const mediaRefreshAfter = new Map();
const mediaRefreshes = new Map();

function scopedPath(path) {
  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  return `${scopePath}${path}`.replace(/\/{2,}/g, "/");
}

function isCacheableMediaRequest(request) {
  if (request.method !== "GET" || request.cache === "no-store" || request.headers.has("range") || request.headers.has("authorization")) {
    return false;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return false;
  }

  return mediaRoots.some((root) => url.pathname.startsWith(scopedPath(root)));
}

function rememberMediaRefresh(url, delay) {
  mediaRefreshAfter.delete(url);
  mediaRefreshAfter.set(url, Date.now() + delay);

  if (mediaRefreshAfter.size > 256) {
    mediaRefreshAfter.delete(mediaRefreshAfter.keys().next().value);
  }
}

function refreshMedia(request, cache) {
  const existing = mediaRefreshes.get(request.url);

  if (existing) {
    return existing;
  }

  // Ask the HTTP cache to validate unchanged files, rather than redownloading them.
  const refresh = fetch(new Request(request, { cache: "no-cache" }))
    .then(async (response) => {
      const cacheControl = response.headers.get("cache-control") || "";

      if (response.ok && response.status !== 206) {
        try {
          if (/\b(?:no-store|private)\b/i.test(cacheControl)) {
            await cache.delete(request);
          } else {
            await cache.put(request, response.clone());
          }
        } catch {
          // Storage restrictions must not prevent a successful network response.
        }
      }

      rememberMediaRefresh(request.url, response.ok ? mediaRefreshInterval : mediaRetryInterval);
      return response;
    })
    .catch((error) => {
      rememberMediaRefresh(request.url, mediaRetryInterval);
      throw error;
    })
    .finally(() => mediaRefreshes.delete(request.url));

  mediaRefreshes.set(request.url, refresh);
  return refresh;
}

async function serveMedia(event) {
  let cache;
  let cached;

  try {
    cache = await caches.open(mediaCacheName);
    cached = await cache.match(event.request);
  } catch {
    try {
      return await fetch(event.request);
    } catch {
      return new Response("", { status: 504, statusText: "Media unavailable" });
    }
  }

  const forceRefresh = event.request.cache === "reload" || event.request.cache === "no-cache";

  if (cached && !forceRefresh) {
    if (Date.now() >= (mediaRefreshAfter.get(event.request.url) || 0)) {
      event.waitUntil(refreshMedia(event.request, cache).catch(() => {}));
    }

    return cached;
  }

  try {
    const response = await refreshMedia(event.request, cache);
    return !response.ok && cached ? cached : response.clone();
  } catch {
    return cached || new Response("", { status: 504, statusText: "Media unavailable" });
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
