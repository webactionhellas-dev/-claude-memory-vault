/* Vellum demo - zero-dependency static file server (offline sandbox).
   Usage:  node serve.mjs [port]     (default 3060)
   Then open  http://localhost:3060/home.html
   Serves only this folder. No backend, no proxying, fully offline. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 3060;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain',
  '.xml': 'application/xml; charset=utf-8'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';   // CloudSkin: '/' is the store-access GATE (home.html lives at /home)
  else if (urlPath.startsWith('/blog/')) urlPath = '/blog-post.html';   // /blog/<slug> post route (slug read client-side)
  else if (urlPath === '/creator' || urlPath === '/home' || urlPath === '/about' || urlPath === '/blog' || urlPath === '/collection' || urlPath === '/product' || urlPath === '/studio' || urlPath === '/checkout' || urlPath === '/account' || urlPath === '/login') urlPath += '.html';   // cleanUrls parity
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404: ' + urlPath); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Vellum demo serving ${ROOT}\n  http://localhost:${PORT}/home.html`));
