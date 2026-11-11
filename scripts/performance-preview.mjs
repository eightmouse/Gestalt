import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Opt-in, loopback-only public-shell profiling. Never serves local APIs or private files.
const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = await realpath(path.join(root, "public"));
const port = Number(process.argv[2] || 4197);
const fixed = new Set(["index.html", "static-app.js", "app/globals.css", "app/desktop-navigation.css", "app/appearance.css", "app/memory-state.css", "app/pocket-index.css"]);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp4": "video/mp4" };
const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405).end(); return; }
    const url = new URL(request.url, "http://127.0.0.1");
    const name = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (name === "__performance-probe.js") {
      response.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" });
      response.end(await readFile(new URL("./performance-probe.js", import.meta.url)));
      return;
    }
    if (!fixed.has(name) && !name.startsWith("public/")) { response.writeHead(404).end(); return; }
    const file = await realpath(path.resolve(root, name));
    if (!fixed.has(name) && !file.startsWith(publicRoot + path.sep)) { response.writeHead(404).end(); return; }
    let body = await readFile(file);
    if (name === "index.html") body = Buffer.from(body.toString().replace("<head>", '<head><script src="/__performance-probe.js" defer></script>'));
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(404).end(); }
});
server.listen(port, "127.0.0.1", () => console.log(`Performance preview: http://127.0.0.1:${port}/ (Ctrl+C stops it)`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit()));
