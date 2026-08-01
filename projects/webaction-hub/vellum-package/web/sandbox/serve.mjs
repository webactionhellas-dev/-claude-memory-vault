/* Vellum sandbox - zero-dependency static server (offline verification).
   Usage:  node sandbox/serve.mjs [port]     (default 3070; run from web/)
   Then open  http://localhost:3070/            (EXAMPLE.html)
              http://localhost:3070/creator     (the arming gate)
              http://localhost:3070/sandbox/products.html  (products layer)

   Serves the web/ folder. Two sandbox substitutions keep the SHIPPED files
   byte-identical while everything runs offline against in-page stubs:
     - any HTML's supabase-js CDN <script src> -> /sandbox/mock-backend.js
     - /vellum.config.js -> /sandbox/config.js (the sandbox site config)
   Production integrations do neither; see INTEGRATION.md. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // web/
const PORT = Number(process.argv[2]) || 3070;
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/EXAMPLE.html';
  else if (urlPath === '/creator') urlPath = '/creator.html';                    // cleanUrls parity
  else if (urlPath === '/about.html' || urlPath === '/about') urlPath = '/sandbox/about.html';
  else if (urlPath === '/vellum.config.js') urlPath = '/sandbox/config.js';      // sandbox site config
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404: ' + urlPath); return; }
    const ext = path.extname(filePath).toLowerCase();
    let body = data;
    if (ext === '.html') {
      // swap the CDN tag for the in-page mock so the sandbox is fully offline
      body = Buffer.from(data.toString('utf8').split(CDN).join('/sandbox/mock-backend.js'), 'utf8');
    }
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  });
}).listen(PORT, () => console.log(`Vellum sandbox serving ${ROOT}\n  http://localhost:${PORT}/`));
