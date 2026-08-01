/* ============================================================
   CLOUDSKIN, Journal STATIC pre-render (SSG) build script
   ------------------------------------------------------------
   Turns the headless-WordPress Journal from client-side rendering
   into build-time STATIC pre-rendering with fully baked SEO, in
   EVERY site language.

   For EACH live WordPress post it writes a COMPLETE static file at
   blog/<slug>.html (English source, served at the clean URL
   /blog/<slug>) AND, for every other site language, a complete
   translated static file at blog/<lang>/<slug>.html (served at
   /blog/<lang>/<slug>). Vercel cleanUrls gives these filesystem
   files priority over the /blog/:slug(:lang) -> /blog-post.html
   rewrites; those rewrites stay as the client-side freshness
   fallback for slugs/languages published between deploys.

   Each file ships the full sanitised article body plus a fully
   baked <head>: unique title, meta description, canonical (per
   language), Open Graph (article, published/modified time, image),
   Twitter Card, JSON-LD Article, and hreflang alternates linking
   every language version (+ x-default). Arabic pages are baked
   RTL (dir="rtl", lang="ar"). The /blog index (blog.html) is
   pre-rendered English with baked post cards; sitemap.xml is
   regenerated from the real feed with per-language <loc> entries.

   TRANSLATION (scripts/translate-posts.mjs)
     Each English post is translated into every non-English site
     language via the Anthropic Claude API, cached per post+lang by
     a hash of the source, so a rebuild only translates NEW/CHANGED
     posts. Failures fall back to no page for that language (the
     rewrite serves the English client layer, so the URL never
     404s) and warn; the whole engine being unreachable simply
     ships the English blog. See translate-posts.mjs for the cache
     + engine details. Translated body HTML is re-run through the
     SAME strict sanitiser below (defence in depth).

   FAIL-SAFE (safest for deploy.mjs):
     - WordPress reachable      -> regenerate everything from WP.
     - WP unreachable + prior   -> keep last-known-good generated files
       generated files present     (never regress real posts on a blip),
                                    warn, exit 0.
     - WP unreachable + none    -> bake the bundled SAMPLE posts so the
       generated yet              blog is never empty/broken, warn, exit 0.
     - Cannot read a template /  -> HARD FAIL, exit 1 (deploy aborts).
       cannot write output

   The WordPress HTML is sanitised through the SAME strict tag +
   attribute allowlist as js/blog.js, ported server-side (no DOM here).

   Usage:  node scripts/gen-blog.mjs            (fetch WP + write files)
           node scripts/gen-blog.mjs --check    (report only; no writes)
           node scripts/gen-blog.mjs <wp-rest-base>   (override the WP URL)

   Zero dependencies (Node 18+ built-in fetch). Uses process.exitCode
   (never process.exit) so it drains undici sockets cleanly on Windows.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeSitemap } from "./gen-sitemap.mjs";
import { translationConfig, getTranslation, mapLimit, listCached, removeCached, readCache, srcHash } from "./translate-posts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SITE = "https://www.cloudskin.com";
const BLOG_DIR = path.join(ROOT, "blog");
const OG_FALLBACK = SITE + "/img/brand/og-image.jpg";
const GEN_SIG = "CLOUDSKIN:GEN-BLOG";        // marker stamped in every generated post file
const CHECK = process.argv.includes("--check") || process.argv.includes("--dry-run");
const argUrl = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) || "";

/* ---- English UI chrome (site default language; matches js/i18n-strings.js).
        The client-side engine re-localises at runtime; the baked layer is the
        default-language snapshot crawlers and no-JS visitors see. Non-English
        pages use uiFor(lang), built from js/i18n-strings.js below. ---- */
const L = {
  all: "All", filterLabel: "Filter by topic", featured: "Featured story",
  latest: "Latest", readStory: "Read the story", back: "The Journal",
  backToJournal: "Back to the Journal", more: "Continue reading",
  empty: "No stories yet. Check back soon.",
  prev: "Previous page", next: "Next page", pager: "Blog pages",
  page: (n) => "Page " + n,
  by: (n) => "By " + n,
  readTime: (n) => (n === 1 ? "1 min read" : n + " min read"),
  count: (n) => (n === 1 ? "1 article" : n + " articles")
};
// Post cards per baked index page (mirrors js/blog.js PER_PAGE; set from blog-config.js in build()).
let PER_PAGE = 9;

/* ============================================================
   HTML sanitiser (server port of the js/blog.js allowlist)
   ============================================================ */
const ALLOWED_TAGS = new Set(["p", "br", "hr", "h2", "h3", "h4", "blockquote", "ul", "ol", "li",
  "strong", "b", "em", "i", "u", "a", "img", "figure", "figcaption", "pre", "code", "span",
  "sub", "sup", "table", "thead", "tbody", "tr", "th", "td", "mark", "small"]);
const ALLOWED_ATTR = { a: ["href", "title"], img: ["src", "alt", "title", "width", "height"] };
const DROP_WHOLE = new Set(["script", "style", "iframe", "object", "embed", "form", "input",
  "button", "textarea", "select", "link", "meta", "svg", "math", "noscript", "template",
  "head", "title", "base", "audio", "video", "source", "canvas", "applet"]);
const VOID = new Set(["br", "hr", "img"]);

function safeHref(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (v[0] === "#" || v[0] === "/") return v;
  if (/^(https?:|mailto:)/i.test(v)) return v;
  return "";
}
function safeSrc(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (v[0] === "/") return v;
  if (/^https?:/i.test(v)) return v;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);/i.test(v)) return v;
  return "";
}
// escape a value for use INSIDE a double-quoted attribute without double-encoding
// existing entities (bare & only -> &amp;; " < > always escaped).
function attrVal(v) {
  return String(v == null ? "" : v)
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;")
    .replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function parseAttrs(str) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(str))) {
    const name = m[1].toLowerCase();
    const val = m[3] != null ? m[3] : (m[4] != null ? m[4] : (m[5] != null ? m[5] : ""));
    out[name] = val;
  }
  return out;
}
function buildOpenTag(name, attrStr) {
  const src = parseAttrs(attrStr);
  const keep = [];
  (ALLOWED_ATTR[name] || []).forEach((a) => {
    let v = src[a];
    if (v == null) return;
    if (a === "href") { v = safeHref(v); if (!v) return; }
    if (a === "src") { v = safeSrc(v); if (!v) return; }
    keep.push(a + '="' + attrVal(v) + '"');
  });
  if (name === "a") {
    keep.push('rel="noopener nofollow ugc"');
    const h = safeHref(src.href || "");
    if (/^https?:/i.test(h)) keep.push('target="_blank"');
  }
  if (name === "img") { keep.push('loading="lazy"'); keep.push('decoding="async"'); }
  return "<" + name + (keep.length ? " " + keep.join(" ") : "") + ">";
}
// mirrors js/blog.js walk(): DROP_WHOLE elements are dropped with contents,
// unknown tags are unwrapped (children kept), allowed tags are rebuilt with
// only their allowlisted attributes.
function sanitize(html) {
  const s = String(html || "");
  const n = s.length;
  let out = "", i = 0, dropTag = null, dropDepth = 0;
  const tagRe = /^<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/;
  while (i < n) {
    if (s[i] === "<") {
      if (s.startsWith("<!--", i)) { const e = s.indexOf("-->", i + 4); i = e < 0 ? n : e + 3; continue; }
      if (s.startsWith("<!", i)) { const e = s.indexOf(">", i); i = e < 0 ? n : e + 1; continue; }
      const m = s.slice(i).match(tagRe);
      if (!m) { if (!dropTag) out += "&lt;"; i += 1; continue; }
      const raw = m[0];
      const isClose = raw[1] === "/";
      const name = m[1].toLowerCase();
      const attrStr = m[2] || "";
      const selfClose = /\/\s*>$/.test(raw);
      i += raw.length;
      if (dropTag) {
        if (!isClose && name === dropTag && !selfClose && !VOID.has(name)) dropDepth++;
        else if (isClose && name === dropTag) { dropDepth--; if (dropDepth <= 0) dropTag = null; }
        continue;
      }
      if (DROP_WHOLE.has(name)) {
        if (!isClose && !selfClose && !VOID.has(name)) { dropTag = name; dropDepth = 1; }
        continue;
      }
      if (!ALLOWED_TAGS.has(name)) continue;                    // unwrap
      if (isClose) { if (!VOID.has(name)) out += "</" + name + ">"; continue; }
      out += buildOpenTag(name, attrStr);
      continue;
    }
    const j = s.indexOf("<", i);
    const text = j < 0 ? s.slice(i) : s.slice(i, j);
    if (!dropTag) out += text;
    i = j < 0 ? n : j;
  }
  return out;
}

/* ---- plain-text + entity helpers (for reading time / meta description) ---- */
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
function decodeEntities(s) {
  return String(s || "").replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (mm, e) => {
    if (e[0] === "#") { const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(cp) ? String.fromCodePoint(cp) : mm; }
    return NAMED[e] != null ? NAMED[e] : mm;
  });
}
const stripTags = (html) => decodeEntities(String(html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/* ---- HTML-escape for text nodes (<title>, JSON handled separately) ---- */
const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const escAttr = (s) => attrVal(s);

function readingTime(text, ui) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return (ui || L).readTime(Math.max(1, Math.round(words / 200)));
}
function fmtDate(d, lang) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date)) return "";
  try { return new Intl.DateTimeFormat(lang || "en", { day: "numeric", month: "long", year: "numeric" }).format(date); }
  catch (e) { return date.toISOString().slice(0, 10); }
}
const absImg = (cover) => cover ? (/^https?:/i.test(cover) ? cover : SITE + "/" + cover.replace(/^\//, "")) : OG_FALLBACK;

/* ---- URL helpers (langSeg is "" for English, else the lang code) ---- */
const postHref = (slug, langSeg) => "/blog/" + (langSeg ? langSeg + "/" : "") + slug;
const blogHome = (langSeg) => "/blog" + (langSeg ? "/" + langSeg : "");
const postUrl = (slug, langCode) => langCode === "en" ? SITE + "/blog/" + slug : SITE + "/blog/" + langCode + "/" + slug;

/* ============================================================
   Site languages + per-language UI strings (single source of truth:
   js/i18n.js LANGS + js/i18n-strings.js). Loaded at build time so
   there is no drift between the client engine and the baked pages.
   ============================================================ */
function loadLangs() {
  const src = fs.readFileSync(path.join(ROOT, "js", "i18n.js"), "utf8");
  const start = src.indexOf("const LANGS");
  if (start < 0) throw new Error("LANGS array not found in js/i18n.js");
  const bStart = src.indexOf("[", start);
  let depth = 0, end = -1;
  for (let i = bStart; i < src.length; i++) {
    const c = src[i];
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error("could not bracket-match the LANGS array in js/i18n.js");
  return vm.runInNewContext("(" + src.slice(bStart, end) + ")", Object.create(null), { timeout: 1000 });
}
function loadI18nStrings() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "i18n-strings.js"), "utf8");
    const sandbox = { window: {} };
    vm.runInNewContext(src, sandbox, { timeout: 2000 });
    return sandbox.window.CLOUDSKIN_I18N || {};
  } catch { return {}; }
}
// Build a language-specific UI-chrome object with English fallback, shaped like L.
function uiFor(langCode, I18N) {
  const en = I18N.en || {};
  const d = Object.assign({}, en, I18N[langCode] || {});
  const t = (k, fb) => (d[k] != null ? d[k] : (en[k] != null ? en[k] : fb));
  const fill = (s, n) => String(s).replace(/\{n\}/g, n);
  return {
    all: t("blog.all", "All"),
    filterLabel: t("blog.filterLabel", "Filter by topic"),
    featured: t("blog.featured", "Featured story"),
    latest: t("blog.latest", "Latest"),
    readStory: t("blog.readStory", "Read the story"),
    back: t("blog.back", "The Journal"),
    backToJournal: t("blog.backToJournal", "Back to the Journal"),
    more: t("blog.more", "Continue reading"),
    empty: t("blog.empty", "No stories yet. Check back soon."),
    prev: t("blog.prev", "Previous page"),
    next: t("blog.next", "Next page"),
    pager: t("blog.pager", "Blog pages"),
    page: (n) => String(t("blog.page", "Page {n}")).replace(/\{n\}/g, n),
    by: (n) => String(t("blog.by", "By {name}")).replace("{name}", n),
    readTime: (n) => (n === 1 ? t("blog.readTimeOne", "1 min read") : fill(t("blog.readTime", "{n} min read"), n)),
    count: (n) => (n === 1 ? t("blog.countOne", "1 article") : fill(t("blog.count", "{n} articles"), n)),
  };
}

/* ============================================================
   WordPress fetch (paginated) + normalisation
   ============================================================ */
function readConfiguredWP() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "blog-config.js"), "utf8");
    return {
      url: (src.match(/url\s*:\s*["']([^"']*)["']/) || [])[1] || "",
      lang: (src.match(/lang\s*:\s*["']([^"']*)["']/) || [])[1] || "",
      perPage: Number((src.match(/perPage\s*:\s*(\d+)/) || [])[1]) || 9
    };
  } catch { return { url: "", lang: "", perPage: 9 }; }
}
async function fetchAllPosts(base, langQ) {
  const per = 100;
  let page = 1, total = 1, all = [];
  while (page <= total) {
    const url = base + "/posts?_embed=1&per_page=" + per + "&page=" + page + langQ;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("WordPress HTTP " + r.status + " for page " + page);
    const tp = Number(r.headers.get("x-wp-totalpages")) || 1;
    total = tp;
    const arr = await r.json();
    if (!Array.isArray(arr)) throw new Error("WordPress returned a non-array");
    all = all.concat(arr);
    page++;
    if (arr.length < per) break;
  }
  return all;
}
function fromWP(p) {
  const emb = p._embedded || {};
  const media = (emb["wp:featuredmedia"] || [])[0] || null;
  let cover = "", coverW = 0, coverH = 0;
  if (media && !media.code) {
    const sizes = (media.media_details && media.media_details.sizes) || {};
    const chosen = sizes.large || sizes.medium_large || null;
    cover = (chosen && chosen.source_url) || media.source_url || "";
    if (chosen) { coverW = chosen.width || 0; coverH = chosen.height || 0; }
    else if (media.media_details) { coverW = media.media_details.width || 0; coverH = media.media_details.height || 0; }
  }
  const terms = (emb["wp:term"] || []).find((arr) => Array.isArray(arr) && arr.some((x) => x && x.taxonomy === "category")) || [];
  const catTerm = terms.find((x) => x && x.taxonomy === "category" && x.slug !== "uncategorized") || terms.find((x) => x && x.taxonomy === "category");
  const author = ((emb.author || [])[0] || {}).name || "";
  const contentHTML = p.content ? p.content.rendered : "";
  const title = decodeEntities(p.title ? p.title.rendered : "");
  return {
    slug: p.slug, url: SITE + "/blog/" + p.slug, id: p.id, title,
    excerpt: stripTags(p.excerpt ? p.excerpt.rendered : "").replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "…"),
    bodyHTML: sanitize(contentHTML), bodyText: stripTags(contentHTML),
    cover, coverW, coverH, coverAlt: (media && media.alt_text) || title,
    date: new Date(p.date_gmt ? p.date_gmt + "Z" : p.date),
    modified: new Date(p.modified_gmt ? p.modified_gmt + "Z" : (p.modified || p.date)),
    author, cat: catTerm ? decodeEntities(catTerm.name) : "", catSlug: catTerm ? catTerm.slug : "",
    lang: "en", sample: false
  };
}

/* ---- SAMPLE posts: single source of truth is the SAMPLES array in js/blog.js.
        Extracted here at build time (trusted own source) so there is no drift. ---- */
function loadSamples() {
  const src = fs.readFileSync(path.join(ROOT, "js", "blog.js"), "utf8");
  const start = src.indexOf("const SAMPLES");
  if (start < 0) throw new Error("SAMPLES array not found in js/blog.js");
  const bStart = src.indexOf("[", start);
  let depth = 0, end = -1;
  for (let i = bStart; i < src.length; i++) {
    const c = src[i];
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error("Could not bracket-match the SAMPLES array in js/blog.js");
  const arrText = src.slice(bStart, end);
  return vm.runInNewContext("(" + arrText + ")", Object.create(null), { timeout: 1000 });
}
function fromSample(s, lang) {
  const pick = (o) => (o && typeof o === "object" && !Array.isArray(o)) ? (o[lang] != null ? o[lang] : o.en) : o;
  const bodyRaw = pick(s.body);
  return {
    slug: s.slug, url: SITE + "/blog/" + s.slug, title: pick(s.title), excerpt: pick(s.excerpt),
    bodyHTML: sanitize(bodyRaw), bodyText: stripTags(bodyRaw),
    cover: s.cover, coverW: 0, coverH: 0, coverAlt: pick(s.title),
    date: new Date(s.date + "T09:00:00Z"), modified: new Date(s.date + "T09:00:00Z"),
    author: pick(s.author), cat: pick(s.cat), catSlug: s.catSlug, lang, sample: true
  };
}

/* ---- build a translated post object from an English source + translated fields.
        The translated body is re-sanitised (defence in depth). ---- */
function makeLangPost(post, langCode, fields) {
  const bodyHTML = sanitize(fields.bodyHTML || post.bodyHTML);
  return Object.assign({}, post, {
    title: fields.title || post.title,
    excerpt: fields.excerpt || post.excerpt,
    cat: fields.cat || post.cat,
    coverAlt: fields.coverAlt || post.coverAlt,
    bodyHTML,
    bodyText: stripTags(bodyHTML),
    lang: langCode,
    url: postUrl(post.slug, langCode),
  });
}

/* ============================================================
   Markup builders (match js/blog.js output so CSS + JS-takeover align).
   ctx = { lang, langSeg, ui }  (English: {lang:"en", langSeg:"", ui:L})
   ============================================================ */
function cardHTML(p, ctx) {
  const cover = p.cover
    ? '<span class="bcard__media"><img src="' + escAttr(p.cover) + '" alt="' + escAttr(p.coverAlt || p.title) + '" loading="lazy" decoding="async"></span>'
    : '<span class="bcard__media bcard__media--empty" aria-hidden="true"></span>';
  const cat = p.cat ? '<span class="bcard__cat">' + escHtml(p.cat) + "</span>" : "";
  return '<a class="bcard" href="' + escAttr(postHref(p.slug, ctx.langSeg)) + '">' + cover + cat +
    '<span class="bcard__title">' + escHtml(p.title) + "</span>" +
    (p.excerpt ? '<span class="bcard__excerpt">' + escHtml(p.excerpt) + "</span>" : "") +
    '<span class="bcard__meta"><span>' + escHtml(fmtDate(p.date, ctx.lang)) + "</span>" +
    '<span aria-hidden="true">&middot;</span><span>' + escHtml(readingTime(p.bodyText, ctx.ui)) + "</span></span></a>";
}
function indexInnerHTML(posts, ctx) {
  const ui = ctx.ui;
  // Genuinely empty feed: the masthead stays, only a quiet "no stories yet" line.
  if (!posts.length) {
    return '<p class="post-missing__title" style="text-align:center">' + escHtml(ui.empty) + "</p>";
  }
  const cats = []; const seen = {};
  posts.forEach((p) => { if (p.catSlug && !seen[p.catSlug]) { seen[p.catSlug] = 1; cats.push({ slug: p.catSlug, label: p.cat }); } });
  const featured = posts[0];
  const rest = posts.slice(1);
  const filtersHTML = cats.length > 1 ? (
    '<div class="jfilter" role="tablist" aria-label="' + escAttr(ui.filterLabel) + '">' +
    '<button class="jfilter__btn is-active" data-cat="all" role="tab" aria-selected="true">' + escHtml(ui.all) + "</button>" +
    cats.map((c) => '<button class="jfilter__btn" data-cat="' + escAttr(c.slug) + '" role="tab" aria-selected="false">' + escHtml(c.label) + "</button>").join("") +
    "</div>"
  ) : "";
  const featuredHTML =
    '<section class="jfeat" id="jFeatured" aria-label="' + escAttr(ui.featured) + '">' +
    '<a class="jfeat__media" href="' + escAttr(postHref(featured.slug, ctx.langSeg)) + '" tabindex="-1" aria-hidden="true">' +
    (featured.cover ? '<img src="' + escAttr(featured.cover) + '" alt="' + escAttr(featured.coverAlt || featured.title) + '" fetchpriority="high" decoding="async">' : "") +
    "</a><div class=\"jfeat__body\">" +
    (featured.cat ? '<p class="jfeat__cat">' + escHtml(featured.cat) + "</p>" : "") +
    '<h2 class="jfeat__title"><a href="' + escAttr(postHref(featured.slug, ctx.langSeg)) + '">' + escHtml(featured.title) + "</a></h2>" +
    (featured.excerpt ? '<p class="jfeat__excerpt">' + escHtml(featured.excerpt) + "</p>" : "") +
    '<p class="jfeat__meta"><span>' + escHtml(fmtDate(featured.date, ctx.lang)) + "</span>" +
    '<span aria-hidden="true">&middot;</span><span>' + escHtml(readingTime(featured.bodyText, ui)) + "</span></p>" +
    '<a class="link-cta jfeat__more" href="' + escAttr(postHref(featured.slug, ctx.langSeg)) + '">' + escHtml(ui.readStory) +
    ' <span class="jarrow" aria-hidden="true">&rarr;</span></a></div></section>';
  const gridHeadHTML =
    '<div class="jsec-head" id="jSecHead"><h2>' + escHtml(ui.latest) + "</h2>" +
    '<span id="jCount">' + escHtml(ui.count(posts.length)) + "</span></div>";
  // Bake PAGE 1 only (featured + first PER_PAGE cards) + a static pager. The client
  // engine re-renders with full numbered pagination; this is the no-JS / first-paint /
  // crawler baseline. Every post also has its own static page + sitemap entry, so page
  // 2+ posts are always crawlable regardless of index pagination.
  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const gridHTML = '<div class="jgrid" id="jGrid">' + rest.slice(0, PER_PAGE).map((p) => cardHTML(p, ctx)).join("") + "</div>";
  return filtersHTML + featuredHTML + gridHeadHTML + gridHTML + staticPagerHTML(1, pages, ctx);
}
/* static (baked) copy of the client pager: ‹ 1 … 4 5 6 … 20 › */
function staticPagerHTML(page, pages, ctx) {
  const ui = ctx.ui;
  if (pages <= 1) return '<nav class="jpager" id="jPager" aria-label="' + escAttr(ui.pager) + '" hidden></nav>';
  const want = new Set([1, pages]);
  for (let n = page - 1; n <= page + 1; n++) if (n >= 1 && n <= pages) want.add(n);
  const nums = [...want].sort((a, b) => a - b);
  let inner = '<button class="jpager__nav" type="button" data-pg="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") +
    ' aria-label="' + escAttr(ui.prev) + '">&lsaquo;</button>';
  let prev = 0;
  nums.forEach((n) => {
    if (prev && n - prev > 1) inner += '<span class="jpager__gap" aria-hidden="true">&hellip;</span>';
    inner += '<button class="jpager__pg' + (n === page ? " is-active" : "") + '" type="button" data-pg="' + n + '"' +
      (n === page ? ' aria-current="page"' : "") + ' aria-label="' + escAttr(ui.page(n)) + '">' + n + "</button>";
    prev = n;
  });
  inner += '<button class="jpager__nav" type="button" data-pg="' + (page + 1) + '"' + (page === pages ? " disabled" : "") +
    ' aria-label="' + escAttr(ui.next) + '">&rsaquo;</button>';
  return '<nav class="jpager" id="jPager" aria-label="' + escAttr(ui.pager) + '">' + inner + "</nav>";
}
function articleInnerHTML(post, others, ctx) {
  const ui = ctx.ui;
  const coverHTML = post.cover
    ? '<figure class="post-cover"><img src="' + escAttr(post.cover) + '" alt="' + escAttr(post.coverAlt || post.title) + '" fetchpriority="high" decoding="async"></figure>'
    : "";
  const metaBits = ["<span>" + escHtml(fmtDate(post.date, ctx.lang)) + "</span>", "<span>" + escHtml(readingTime(post.bodyText, ui)) + "</span>"];
  if (post.author) metaBits.push("<span>" + escHtml(ui.by(post.author)) + "</span>");
  const metaHTML = metaBits.join('<span aria-hidden="true">&middot;</span>');
  const moreHTML = others.length
    ? '<section class="post-more" id="jMore"><h2 class="post-more__head">' + escHtml(ui.more) +
      '</h2><div class="post-more__grid">' + others.map((p) => cardHTML(p, ctx)).join("") + "</div></section>"
    : '<section class="post-more" id="jMore" hidden></section>';
  return "<header class=\"post-head\">" +
    '<a class="post-back" href="' + escAttr(blogHome(ctx.langSeg)) + '"><span class="jarrow" aria-hidden="true">&larr;</span> ' + escHtml(ui.back) + "</a>" +
    (post.cat ? '<p class="post-cat">' + escHtml(post.cat) + "</p>" : "") +
    '<h1 class="post-title">' + escHtml(post.title) + "</h1>" +
    '<div class="post-meta">' + metaHTML + "</div></header>" +
    coverHTML +
    '<div class="post-body">' + post.bodyHTML + "</div>" +
    '<div class="post-foot"><a class="btn btn--outline" href="' + escAttr(blogHome(ctx.langSeg)) + '">' + escHtml(ui.backToJournal) + "</a></div>" +
    moreHTML;
}

/* ---- hreflang alternates for a post (altLangs is the list of codes that have a
        real version, always including "en"), plus x-default -> English. ---- */
function hreflangHTML(slug, altLangs) {
  const lines = altLangs.map((c) =>
    '  <link rel="alternate" hreflang="' + escAttr(c) + '" href="' + escAttr(postUrl(slug, c)) + '">');
  lines.push('  <link rel="alternate" hreflang="x-default" href="' + escAttr(postUrl(slug, "en")) + '">');
  return lines.join("\n");
}

/* ---- baked <head> for a post (title/desc/canonical/OG/Twitter/hreflang/JSON-LD).
        altLangs: codes with a real version (incl "en") -> hreflang alternates. ---- */
function postHeadHTML(post, altLangs) {
  const desc = (post.excerpt || post.bodyText || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const img = absImg(post.cover);
  const pub = post.date.toISOString();
  const mod = (post.modified || post.date).toISOString();
  const lang = post.lang || "en";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title, description: desc, image: [img],
    datePublished: pub, dateModified: mod, inLanguage: lang,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || "CLOUDSKIN" },
    publisher: { "@type": "Organization", name: "CLOUDSKIN", "@id": SITE + "/#org", logo: { "@type": "ImageObject", url: OG_FALLBACK } },
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url }
  };
  const lines = [
    "  <title>" + escHtml(post.title) + " | CLOUDSKIN® Journal</title>",
    '  <meta name="description" content="' + escAttr(desc) + '">',
    '  <link rel="canonical" href="' + escAttr(post.url) + '">',
    '  <meta name="robots" content="noindex, nofollow">',
    '  <meta name="theme-color" content="#f7f4ef">',
    '  <meta property="og:type" content="article">',
    '  <meta property="og:site_name" content="CLOUDSKIN">',
    '  <meta property="og:locale" content="' + escAttr(lang) + '">',
    '  <meta property="og:title" content="' + escAttr(post.title) + '">',
    '  <meta property="og:description" content="' + escAttr(desc) + '">',
    '  <meta property="og:url" content="' + escAttr(post.url) + '">',
    '  <meta property="og:image" content="' + escAttr(img) + '">'
  ];
  if (post.coverW && post.coverH) {
    lines.push('  <meta property="og:image:width" content="' + post.coverW + '">');
    lines.push('  <meta property="og:image:height" content="' + post.coverH + '">');
  }
  lines.push('  <meta property="article:published_time" content="' + escAttr(pub) + '">');
  lines.push('  <meta property="article:modified_time" content="' + escAttr(mod) + '">');
  if (post.cat) lines.push('  <meta property="article:section" content="' + escAttr(post.cat) + '">');
  lines.push('  <meta name="twitter:card" content="summary_large_image">');
  lines.push('  <meta name="twitter:site" content="@cloudskin.active">');
  lines.push('  <meta name="twitter:title" content="' + escAttr(post.title) + '">');
  lines.push('  <meta name="twitter:description" content="' + escAttr(desc) + '">');
  lines.push('  <meta name="twitter:image" content="' + escAttr(img) + '">');
  // hreflang alternates (only when there is more than one language version)
  if (altLangs && altLangs.length > 1) lines.push(hreflangHTML(post.slug, altLangs));
  lines.push('  <script type="application/ld+json">' + JSON.stringify(ld) + "</script>");
  return lines.join("\n");
}
function indexLdHTML(posts, lang) {
  const blog = {
    "@context": "https://schema.org", "@type": "Blog", "@id": SITE + "/blog#blog", url: SITE + "/blog",
    name: "The CloudSkin Journal", inLanguage: lang,
    publisher: { "@type": "Organization", name: "CLOUDSKIN", "@id": SITE + "/#org" },
    blogPost: posts.slice(0, 12).map((p) => {
      const o = { "@type": "BlogPosting", headline: p.title, url: p.url, datePublished: p.date.toISOString() };
      if (p.cover) o.image = absImg(p.cover);
      return o;
    })
  };
  const itemList = {
    "@context": "https://schema.org", "@type": "ItemList", name: "The CloudSkin Journal",
    itemListElement: posts.slice(0, 12).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: p.url, name: p.title }))
  };
  return '  <script type="application/ld+json">' + JSON.stringify(blog) + "</script>\n" +
    '  <script type="application/ld+json">' + JSON.stringify(itemList) + "</script>";
}

/* ---- marker replace: replace text between START/END, else throw (hard fail) ---- */
function replaceBetween(html, startMarker, endMarker, inner, file) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker);
  if (s < 0 || e < 0 || e < s) throw new Error("markers " + startMarker + " / " + endMarker + " not found in " + file);
  return html.slice(0, s + startMarker.length) + "\n" + inner + "\n" + html.slice(e);
}

/* ---- build the <html ...> open tag for a language page (lang + dir + RTL/non-latin
        class + data-blog-static so the client engine keeps the baked translation). ---- */
function langHtmlOpen(meta) {
  let open = '<html lang="' + escAttr(meta.code) + '"';
  if (meta.dir === "rtl") open += ' dir="rtl"';
  open += ' data-blog-static="' + escAttr(meta.code) + '"';
  const cls = [meta.dir === "rtl" ? "i18n-rtl" : "", meta.nolatin ? "i18n-nolatin" : ""].filter(Boolean).join(" ");
  if (cls) open += ' class="' + cls + '"';
  return open + ">";
}

/* ============================================================
   Build
   ============================================================ */
function warn(msg) { console.warn("[gen-blog] WARNING: " + msg); }
function fail(msg) { console.error("[gen-blog] HARD FAIL: " + msg); process.exitCode = 1; }

function listGeneratedSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".html"))
    .filter((f) => { try { return fs.readFileSync(path.join(BLOG_DIR, f), "utf8").includes(GEN_SIG); } catch { return false; } })
    .map((f) => f.replace(/\.html$/, ""));
}
// Every GEN_SIG-stamped .html we generate under blog/ (English top-level + lang
// subdirs), returned as absolute paths, for orphan cleanup.
function listAllGeneratedFiles() {
  const out = [];
  const scan = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "i18n-cache") scan(p); }
      else if (e.name.endsWith(".html")) {
        try { if (fs.readFileSync(p, "utf8").includes(GEN_SIG)) out.push(p); } catch { /* skip */ }
      }
    }
  };
  scan(BLOG_DIR);
  return out;
}

async function main() {
  const cfg = readConfiguredWP();
  const base = (argUrl || process.env.CLOUDSKIN_WP_URL || cfg.url || "").replace(/\/+$/, "");
  const langQ = cfg.lang ? "&lang=" + encodeURIComponent(cfg.lang) : "";
  const siteLang = cfg.lang || "en";
  PER_PAGE = Math.max(1, cfg.perPage || 9);   // keep the baked page size in sync with js/blog.js

  // Templates are REQUIRED (hard fail if missing).
  let idxTpl, postTpl;
  try { idxTpl = fs.readFileSync(path.join(ROOT, "blog.html"), "utf8"); }
  catch (e) { return fail("cannot read blog.html template: " + e.message); }
  try { postTpl = fs.readFileSync(path.join(ROOT, "blog-post.html"), "utf8"); }
  catch (e) { return fail("cannot read blog-post.html template: " + e.message); }

  // 1) Try WordPress. `wpReachable` distinguishes a genuine empty feed (WP up,
  //    0 published posts) from a WP blip: the former is a real state we bake as
  //    an empty index, the latter preserves the last-known-good bake.
  let posts = null, mode = "wp", wpReachable = false;
  if (base) {
    try {
      const raw = await fetchAllPosts(base, langQ);
      wpReachable = true;
      posts = raw
        .filter((p) => !p.status || p.status === "publish")
        .map(fromWP)
        .sort((a, b) => b.date - a.date);
    } catch (e) {
      warn("WordPress unreachable at build time (" + (e && e.message) + ").");
      posts = null;
    }
  } else {
    warn("No WordPress URL configured in js/blog-config.js.");
  }

  // 2) Fail-safe branch ONLY when WP could not be reached (blip / no config).
  //    A reachable-but-empty feed (posts = []) skips this and bakes an empty blog.
  if (!wpReachable && !posts) {
    const prior = listGeneratedSlugs();
    if (prior.length) {
      console.log("[gen-blog] Keeping last-known-good generated posts (" + prior.length + "): " + prior.join(", ") + ". Nothing regenerated. Exit 0.");
      return;                                                   // preserve real content on a WP blip
    }
    mode = "sample";
    try { posts = loadSamples().map((s) => fromSample(s, siteLang === "el" ? "el" : "en")).sort((a, b) => b.date - a.date); }
    catch (e) { return fail("WordPress unreachable AND sample posts could not be loaded: " + e.message); }
    warn("No prior generation found; baking " + posts.length + " bundled SAMPLE posts so the blog is never empty.");
  }

  // A reachable-but-empty WP is a valid state (bake an empty index + clean orphans).
  // Zero posts is only a failure when WP was NOT reached and no fallback filled in.
  if (!posts.length && !wpReachable) return fail("resolved 0 posts and WordPress was unreachable (refusing to ship an empty blog).");

  // ---- resolve site languages (best-effort; failure disables translation, English still ships) ----
  let LANGS = [{ code: "en", dir: "ltr" }], TARGET_LANGS = [], I18N = {};
  try { LANGS = loadLangs(); TARGET_LANGS = LANGS.filter((l) => l.code && l.code !== "en"); }
  catch (e) { warn("could not read site languages from js/i18n.js (" + e.message + "); English-only build."); TARGET_LANGS = []; }
  // Scope which languages get baked translations. BLOG_LANGS="ar" (or "ar,fr") restricts
  // TARGET_LANGS to that allowlist; unset (or "all") keeps every site language. English is
  // always the source and never in this list. CloudSkin's blog audience is EN + Arabic (Gulf),
  // so the auto-publish pipeline sets BLOG_LANGS=ar to keep translation cost + quality focused.
  const langScope = (process.env.BLOG_LANGS || "").trim().toLowerCase();
  if (langScope && langScope !== "all" && TARGET_LANGS.length) {
    const want = new Set(langScope.split(/[,\s]+/).filter(Boolean));
    const siteCodes = TARGET_LANGS.map((l) => l.code);
    TARGET_LANGS = TARGET_LANGS.filter((l) => want.has(l.code));
    const ignored = [...want].filter((c) => !siteCodes.includes(c));
    console.log("[gen-blog] BLOG_LANGS=" + langScope + " -> translating [" +
      TARGET_LANGS.map((l) => l.code).join(",") + "] of site langs [" + siteCodes.join(",") + "]" +
      (ignored.length ? " (ignored non-site codes: " + ignored.join(",") + ")" : ""));
  }
  I18N = loadI18nStrings();
  const RESERVED = new Set(TARGET_LANGS.map((l) => l.code));   // guard against a post slug colliding with a lang dir

  // ---- translation config ----
  const tcfg = translationConfig();
  // Only translate REAL posts (never bundled samples), never in --check.
  const translateOn = tcfg.engine !== "none" && mode === "wp" && TARGET_LANGS.length > 0;

  // 3) CHECK mode: report and stop.
  if (CHECK) {
    console.log("[gen-blog] --check: mode=" + mode + ", would write " + posts.length + " English post file(s): " + posts.map((p) => p.slug).join(", "));
    if (tcfg.engine === "none") {
      console.log("[gen-blog] --check: translation OFF (no API key / TRANSLATE_ENGINE=none). English-only.");
    } else if (mode !== "wp") {
      console.log("[gen-blog] --check: translation skipped in sample mode.");
    } else {
      let hits = 0, misses = 0;
      for (const post of posts) for (const Lg of TARGET_LANGS) {
        const r = readCacheState(post, Lg.code);
        if (r) hits++; else misses++;
      }
      console.log("[gen-blog] --check: engine=" + tcfg.engine + " model=" + tcfg.model +
        ", langs=[" + TARGET_LANGS.map((l) => l.code).join(",") + "], " +
        "cache-fresh=" + hits + " to-translate=" + misses + " (" + posts.length + " posts x " + TARGET_LANGS.length + " langs).");
    }
    console.log("[gen-blog] --check: would pre-render blog.html + regenerate sitemap.xml. No files written.");
    return;
  }

  // 4) Write per-post ENGLISH static files + translate + write per-language files.
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const slugSet = new Set(posts.map((p) => p.slug));

  // 4a) Translate (cache-aware, concurrency-limited). translations[slug][lang] = {ok, fields}.
  const translations = {};
  if (translateOn) {
    if (tcfg.engine === "mock") warn("TRANSLATE: engine=mock (deterministic pipeline harness; body HTML NOT translated).");
    const jobs = [];
    for (const post of posts) for (const Lg of TARGET_LANGS) jobs.push({ post, Lg });
    let apiCalls = 0, cacheHits = 0, failures = 0;
    await mapLimit(jobs, tcfg.concurrency, async ({ post, Lg }) => {
      const r = await getTranslation(tcfg, post, Lg.code, Lg.label || Lg.native || Lg.code);
      (translations[post.slug] || (translations[post.slug] = {}))[Lg.code] = r;
      if (!r.ok) { failures++; warn("translation failed for /" + Lg.code + "/" + post.slug + ": " + r.error + " (English fallback via rewrite; will retry next build)."); }
      else if (r.fromCache) cacheHits++; else apiCalls++;
    });
    console.log("[gen-blog] translate: " + apiCalls + " new, " + cacheHits + " cached, " + failures + " failed (engine=" + tcfg.engine + ", model=" + tcfg.model + ").");
  }

  const wroteFiles = new Set();          // absolute paths written this build (for orphan cleanup)
  const sitemapPosts = [];               // { slug, lastmod, langs: [codes] }

  posts.forEach((post) => {
    // langs with a real version for THIS post (English always; plus successful translations)
    const okLangs = TARGET_LANGS.filter((Lg) => translations[post.slug] && translations[post.slug][Lg.code] && translations[post.slug][Lg.code].ok);
    const altCodes = ["en"].concat(okLangs.map((Lg) => Lg.code));

    // ---- English page ----
    const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
    let html = postTpl;
    html = html.replace(/<html lang="[^"]*">/, '<html lang="' + escAttr(post.lang || "en") + '">');
    html = html.replace(/<head>/, "<head>\n  <!-- " + GEN_SIG + " v2 slug=" + escAttr(post.slug) + " lang=en baked=" + stamp + " mode=" + mode + " -->");
    html = replaceBetween(html, "<!-- GEN-BLOG:HEAD:START -->", "<!-- GEN-BLOG:HEAD:END -->", postHeadHTML(post, altCodes), "blog-post.html");
    html = replaceBetween(html, "<!-- GEN-BLOG:ARTICLE:START -->", "<!-- GEN-BLOG:ARTICLE:END -->",
      '    <article id="blogPost">' + articleInnerHTML(post, others, { lang: "en", langSeg: "", ui: L }) + "</article>", "blog-post.html");
    if (mode === "sample") html = html.replace('id="jNote"', 'id="jNote" class="on"');
    const enPath = path.join(BLOG_DIR, post.slug + ".html");
    fs.writeFileSync(enPath, html);
    wroteFiles.add(path.resolve(enPath));

    // ---- language pages ----
    if (RESERVED.has(post.slug)) {
      warn('post slug "' + post.slug + '" collides with a language code; skipping its language pages to avoid a routing clash.');
    } else {
      okLangs.forEach((Lg) => {
        const fields = translations[post.slug][Lg.code].fields;
        const lp = makeLangPost(post, Lg.code, fields);
        const lo = posts.filter((p) => p.slug !== post.slug).slice(0, 3).map((o) => {
          const ot = translations[o.slug] && translations[o.slug][Lg.code];
          return (ot && ot.ok) ? makeLangPost(o, Lg.code, ot.fields) : Object.assign({}, o); // untranslated "more" card keeps English text but links stay in-language
        });
        const ctx = { lang: Lg.code, langSeg: Lg.code, ui: uiFor(Lg.code, I18N) };
        let lh = postTpl;
        lh = lh.replace(/<html lang="[^"]*">/, langHtmlOpen(Lg));
        lh = lh.replace(/<head>/, "<head>\n  <!-- " + GEN_SIG + " v2 slug=" + escAttr(post.slug) + " lang=" + escAttr(Lg.code) + " baked=" + stamp + " mode=" + mode + " -->");
        lh = replaceBetween(lh, "<!-- GEN-BLOG:HEAD:START -->", "<!-- GEN-BLOG:HEAD:END -->", postHeadHTML(lp, altCodes), "blog-post.html");
        lh = replaceBetween(lh, "<!-- GEN-BLOG:ARTICLE:START -->", "<!-- GEN-BLOG:ARTICLE:END -->",
          '    <article id="blogPost">' + articleInnerHTML(lp, lo, ctx) + "</article>", "blog-post.html");
        const dir = path.join(BLOG_DIR, Lg.code);
        fs.mkdirSync(dir, { recursive: true });
        const lpPath = path.join(dir, post.slug + ".html");
        fs.writeFileSync(lpPath, lh);
        wroteFiles.add(path.resolve(lpPath));
      });
    }

    sitemapPosts.push({ slug: post.slug, lastmod: (post.modified || post.date).toISOString().slice(0, 10), langs: okLangs.map((Lg) => Lg.code) });
  });

  // 5) Orphan cleanup (WP mode only, so a WP blip never deletes real files).
  //    Deletes any GEN_SIG-stamped file under blog/ we did NOT just write, plus
  //    stale translation-cache files for slugs no longer present.
  if (mode === "wp") {
    listAllGeneratedFiles().forEach((abs) => {
      if (!wroteFiles.has(path.resolve(abs))) {
        try { fs.unlinkSync(abs); console.log("[gen-blog] removed stale file: " + path.relative(ROOT, abs)); } catch { /* ignore */ }
      }
    });
    listCached().forEach(({ slug, lang }) => {
      if (!slugSet.has(slug)) { removeCached(slug, lang); console.log("[gen-blog] removed stale cache: blog/i18n-cache/" + slug + "." + lang + ".json"); }
    });
    // prune empty language directories left behind
    try {
      for (const e of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== "i18n-cache") {
          const d = path.join(BLOG_DIR, e.name);
          try { if (fs.readdirSync(d).length === 0) fs.rmdirSync(d); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  // 6) Pre-render the /blog index (blog.html) in English (unchanged behaviour).
  let idx = idxTpl;
  idx = replaceBetween(idx, "<!-- GEN-BLOG:INDEX:START -->", "<!-- GEN-BLOG:INDEX:END -->", indexInnerHTML(posts, { lang: "en", langSeg: "", ui: L }), "blog.html");
  idx = replaceBetween(idx, "<!-- GEN-BLOG:LD:START -->", "<!-- GEN-BLOG:LD:END -->", indexLdHTML(posts, siteLang), "blog.html");
  if (mode === "sample") idx = idx.replace('id="jNote"', 'id="jNote" class="on"');
  fs.writeFileSync(path.join(ROOT, "blog.html"), idx);

  // 7) Regenerate sitemap.xml from the real posts (English + per-language URLs).
  try {
    writeSitemap(sitemapPosts);
  } catch (e) { warn("sitemap regeneration skipped: " + e.message); }

  const langPageCount = wroteFiles.size - posts.length;
  console.log("[gen-blog] mode=" + mode + ": wrote " + posts.length + " English post file(s) + " + langPageCount + " language page(s) -> blog/, pre-rendered blog.html, regenerated sitemap.xml.");
  if (mode === "sample") console.log("[gen-blog] NOTE: sample content shipped (WordPress was unreachable). Connect WP + redeploy to publish real posts.");
}

/* ---- --check helper: is there a fresh cached translation for (post, lang)?
        Mirrors getTranslation()'s reuse condition (ok + matching source hash). ---- */
function readCacheState(post, langCode) {
  const c = readCache(post.slug, langCode);
  if (!c || c.ok !== true || !c.fields) return false;
  const h = srcHash({ title: post.title, excerpt: post.excerpt, cat: post.cat, coverAlt: post.coverAlt, bodyHTML: post.bodyHTML });
  return c.srcHash === h;
}

const runDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (runDirectly) main();
export { main, sanitize, fromWP, fromSample };
