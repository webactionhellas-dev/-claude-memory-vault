import tls from 'node:tls';
import { fetchWithTiming } from './lib.js';

// Real gap in a site-health tool: it checked uptime, images and security headers but never
// the TLS certificate itself. An expired cert is the single most embarrassing way a client
// site goes down, since browsers show a full-page warning instead of a broken image, and it
// is entirely predictable in advance - which is exactly what a monitoring tool should catch.
// Non-blocking: any failure (non-https, connection refused, timeout) resolves null rather than
// failing the whole check, since this is a bonus signal, not the core reachability check.
function checkSslExpiry(urlString, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlString); } catch { return resolve(null); }
    if (u.protocol !== 'https:') return resolve(null);
    const port = u.port ? Number(u.port) : 443;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const socket = tls.connect({ host: u.hostname, port, servername: u.hostname, timeout: timeoutMs, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return finish(null);
      const daysRemaining = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
      finish(daysRemaining);
    });
    socket.on('timeout', () => { socket.destroy(); finish(null); });
    socket.on('error', () => finish(null));
  });
}

function decodeHtmlEntities(str) {
  // HTML attribute values legitimately contain &amp; for a literal & (e.g. Vercel's
  // /_vercel/image?url=...&amp;w=750) - without decoding this, the extra params get
  // treated as part of the URL string and mangle the request. Minimal decode, no dep.
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractImageUrls(html, baseUrl) {
  const urls = new Set();
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) && urls.size < 200) {
    const src = decodeHtmlEntities(m[1]);
    if (src.startsWith('data:')) continue;
    try { urls.add(new URL(src, baseUrl).href); } catch { /* skip malformed */ }
  }
  return [...urls];
}

function checkHeaders(headers, expected) {
  const missing = [];
  const csp = headers.get('content-security-policy') || '';
  for (const name of expected) {
    if (name === 'x-frame-options' && /frame-ancestors/i.test(csp)) continue; // CSP can cover this instead
    if (!headers.get(name)) missing.push(name);
  }
  return missing;
}

async function checkImages(urls, maxImages) {
  const sample = urls.slice(0, maxImages);
  const results = await Promise.all(sample.map(async (imgUrl) => {
    let r = await fetchWithTiming(imgUrl, { method: 'HEAD', timeoutMs: 8000 });
    if (!r.ok && r.status === 0) return { url: imgUrl, ok: false, status: 0 }; // network failure, real
    if (!r.ok && (r.status === 405 || r.status === 501)) {
      r = await fetchWithTiming(imgUrl, { method: 'GET', timeoutMs: 8000 }); // some hosts reject HEAD
    }
    return { url: imgUrl, ok: r.ok, status: r.status };
  }));
  return results.filter((r) => !r.ok);
}

export async function checkSite(site, thresholds, expectedHeaders = []) {
  const page = await fetchWithTiming(site.url, { timeoutMs: 12000 });
  const result = {
    name: site.name,
    url: site.url,
    checkedAt: new Date().toISOString(),
    reachable: page.ok,
    status: page.status,
    ms: page.ms,
    error: page.error || null,
    slow: page.ms > thresholds.slowMs,
    critical: page.ms > thresholds.criticalMs,
    missingHeaders: [],
    brokenImages: [],
  };

  if (!page.ok) {
    result.overall = 'down';
    return result;
  }

  result.missingHeaders = checkHeaders(page.headers, expectedHeaders);

  try {
    const html = await page.res.text();
    const imageUrls = extractImageUrls(html, site.url);
    result.brokenImages = await checkImages(imageUrls, thresholds.maxImagesChecked || 20);
    result.imagesChecked = Math.min(imageUrls.length, thresholds.maxImagesChecked || 20);
  } catch {
    result.imagesChecked = 0;
  }

  result.sslDaysRemaining = await checkSslExpiry(site.url);
  const sslExpired = result.sslDaysRemaining !== null && result.sslDaysRemaining < 0;
  const sslExpiringSoon = result.sslDaysRemaining !== null && result.sslDaysRemaining >= 0 && result.sslDaysRemaining <= 14;

  if (sslExpired) result.overall = 'down';
  else if (result.brokenImages.length > 0) result.overall = 'warn';
  else if (result.critical) result.overall = 'down';
  else if (result.slow || result.missingHeaders.length > 0 || sslExpiringSoon) result.overall = 'warn';
  else result.overall = 'ok';

  return result;
}
