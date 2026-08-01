/* ============================================================
   CLOUDSKIN, Journal sitemap generator (headless WordPress)
   ------------------------------------------------------------
   Rewrites the <url> block between the BLOG:START / BLOG:END
   markers in ../sitemap.xml with one entry per live WordPress
   post, as cloudskin.com/blog/<slug> URLs (so the SEO value
   lands on the main domain, not the WP host).

   Usage:
     node scripts/gen-sitemap.mjs                 (reads the WP URL from js/blog-config.js)
     node scripts/gen-sitemap.mjs https://blog.cloudskin.com/wp-json/wp/v2
     CLOUDSKIN_WP_URL=https://.../wp-json/wp/v2 node scripts/gen-sitemap.mjs

   Zero dependencies (Node 18+ built-in fetch). Run it in the
   deploy step, or whenever the writing team publishes, so the
   sitemap stays in step with the Journal. If no WP URL is set,
   it leaves the sample entries untouched and exits cleanly.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SITE = "https://www.cloudskin.com";
const SITEMAP = path.join(ROOT, "sitemap.xml");

function readConfiguredWP() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "blog-config.js"), "utf8");
    const url = (src.match(/url\s*:\s*["']([^"']*)["']/) || [])[1] || "";
    const lang = (src.match(/lang\s*:\s*["']([^"']*)["']/) || [])[1] || "";
    return { url, lang };
  } catch { return { url: "", lang: "" }; }
}

const cfg = readConfiguredWP();
const base = (process.argv[2] || process.env.CLOUDSKIN_WP_URL || cfg.url || "").replace(/\/+$/, "");
const langQ = cfg.lang ? "&lang=" + encodeURIComponent(cfg.lang) : "";

if (!base) {
  console.log("[gen-sitemap] No WordPress URL configured (js/blog-config.js url is empty). Sample entries left as-is.");
  process.exit(0);
}

const iso = (d) => { const x = new Date(d); return isNaN(x) ? "" : x.toISOString().slice(0, 10); };
const xmlEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  const url = base + "/posts?per_page=100&_fields=slug,modified,modified_gmt&orderby=modified&order=desc" + langQ;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("WordPress HTTP " + r.status + " for " + url);
  const posts = await r.json();
  if (!Array.isArray(posts) || !posts.length) throw new Error("WordPress returned no posts");

  const block = posts.map((p) => {
    const loc = SITE + "/blog/" + xmlEsc(p.slug);
    const lastmod = iso(p.modified_gmt ? p.modified_gmt + "Z" : p.modified);
    return "  <url>\n" +
      "    <loc>" + loc + "</loc>\n" +
      (lastmod ? "    <lastmod>" + lastmod + "</lastmod>\n" : "") +
      "    <changefreq>monthly</changefreq>\n" +
      "    <priority>0.7</priority>\n" +
      "  </url>";
  }).join("\n");

  let xml = fs.readFileSync(SITEMAP, "utf8");
  const startRe = /(<!-- BLOG:START[^>]*-->)/;
  const endRe = /(<!-- BLOG:END -->)/;
  if (!startRe.test(xml) || !endRe.test(xml)) throw new Error("BLOG:START / BLOG:END markers not found in sitemap.xml");
  xml = xml.replace(/<!-- BLOG:START[^>]*-->[\s\S]*?<!-- BLOG:END -->/,
    "<!-- BLOG:START (auto-generated from the WordPress feed on " + new Date().toISOString().slice(0, 10) + ") -->\n" +
    block + "\n  <!-- BLOG:END -->");
  fs.writeFileSync(SITEMAP, xml);
  console.log("[gen-sitemap] Wrote " + posts.length + " Journal entries to sitemap.xml from " + base);
}

main().catch((e) => { console.error("[gen-sitemap] Failed:", e.message); process.exit(1); });
