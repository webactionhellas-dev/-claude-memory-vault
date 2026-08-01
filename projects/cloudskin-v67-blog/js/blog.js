/* ============================================================
   CLOUDSKIN, Journal engine (headless WordPress)
   ------------------------------------------------------------
   Renders /blog (index) and /blog/<slug> (post) from the
   WordPress REST API configured in js/blog-config.js. If WP is
   not configured or is unreachable, it falls back to a small set
   of clearly-labelled bilingual SAMPLE posts so the pages always
   build and verify. Per-post SEO (title, description, canonical,
   Open Graph, Twitter, JSON-LD Article) is injected at runtime.
   Untrusted WordPress HTML is sanitised through a strict tag +
   attribute allowlist before it is ever inserted.
   Depends on: js/i18n.js (C.t, C.lang) + the shared shell.
   ============================================================ */
(() => {
  "use strict";
  const C = (window.CLOUDSKIN = window.CLOUDSKIN || {});
  const cfg = window.CLOUDSKIN_WP || {};
  const SITE = "https://www.cloudskin.com";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = C.lang || "en";
  const t = (k) => (C.t ? C.t(k) : k);

  /* ---- localisation of the {n} in reading-time / author strings ---- */
  const fill = (k, vars) => (C.t ? C.t(k, vars) : k);

  /* ---------- sample posts (placeholders; shown until WP is connected) ----------
     Real CloudSkin photography that already ships with the site is used for the
     covers. Copy is original brand editorial, written natively in EL + EN. It
     carries NO invented facts, prices, statistics or reviews, and is clearly
     flagged in the UI as preview content. */
  const SAMPLES = [
    {
      slug: "court-to-everywhere",
      date: "2026-07-20", cover: "/img/shoot/tennis-night-white.jpg",
      catSlug: "movement",
      cat: { el: "Κίνηση", en: "Movement" },
      author: { el: "Η ομάδα CloudSkin", en: "The CloudSkin Team" },
      title: { el: "Από το γήπεδο στην καθημερινότητα", en: "Court to everywhere" },
      excerpt: {
        el: "Γιατί σχεδιάζουμε κομμάτια που περνούν αβίαστα από το ματς στην υπόλοιπη μέρα.",
        en: "Why we design pieces that move without effort from the match into the rest of your day."
      },
      body: {
        el: "<p>Η CloudSkin ξεκίνησε από μια απλή ιδέα. Τα αθλητικά ρούχα οφείλουν να ακολουθούν όλη σου τη μέρα, όχι μόνο την προπόνηση. Θέλαμε κομμάτια που φοριούνται στο γήπεδο και συνεχίζουν μαζί σου στον καφέ, στη διαδρομή, στο σπίτι.</p><h2>Σχεδιασμένο σε κίνηση</h2><p>Κάθε κομμάτι δοκιμάζεται εκεί όπου θα ζήσει. Στο σερβίς, στο τρέξιμο για το λεωφορείο, στο τέλος μιας μεγάλης μέρας. Η εφαρμογή μένει σταθερή, το ύφασμα αναπνέει και η γραμμή παραμένει καθαρή.</p><blockquote>Η πολυτέλεια δεν κρατιέται για τις ειδικές στιγμές. Βρίσκεται στα κομμάτια που επιλέγεις να ζεις κάθε μέρα.</blockquote><p>Αυτό είναι το νόημα του court to everywhere. Λιγότερες επιλογές το πρωί, περισσότερη άνεση όλη την ημέρα, και μια αίσθηση ηρεμίας που σε ακολουθεί παντού.</p>"
      }
    },
    {
      slug: "the-second-skin-standard",
      date: "2026-07-08", cover: "/img/shoot/villa-yoga-white.jpg",
      catSlug: "fabric",
      cat: { el: "Ύφασμα", en: "Fabric" },
      author: { el: "Η ομάδα CloudSkin", en: "The CloudSkin Team" },
      title: { el: "Το ύφασμα ως δεύτερο δέρμα", en: "The second-skin standard" },
      excerpt: {
        el: "Τι σημαίνει ένα ύφασμα να εξαφανίζεται πάνω σου και να σε αφήνει να κινηθείς ελεύθερα.",
        en: "What it means for a fabric to disappear on the skin and let you move freely."
      },
      body: {
        el: "<p>Πολύ συχνά τα αθλητικά ρούχα σε βάζουν να διαλέξεις ανάμεσα στο πώς αποδίδουν και στο πώς δείχνουν. Εμείς θέλαμε και τα δύο.</p><h2>Ελαφρύ, σταθερό, διακριτικό</h2><p>Δουλεύουμε με υφάσματα που τεντώνουν προς κάθε κατεύθυνση, στεγνώνουν γρήγορα και κρατούν το σχήμα τους. Η ιδέα είναι απλή. Να νιώθεις το κομμάτι σαν δεύτερο δέρμα και να ξεχνάς ότι το φοράς.</p><p>Οι λεπτομέρειες μένουν ήσυχες. Καθαρές ραφές, απαλή αίσθηση στο δέρμα, χρώματα που συνδυάζονται μεταξύ τους. Τίποτα που να χρειάζεται να το σκεφτείς.</p>"
      }
    },
    {
      slug: "the-founders-edit",
      date: "2026-06-24", cover: "/img/founders/about-camp-court.jpg",
      catSlug: "style",
      cat: { el: "Στυλ", en: "Style" },
      author: { el: "Η ομάδα CloudSkin", en: "The CloudSkin Team" },
      title: { el: "The Founders' Edit, μια μελέτη στην απλότητα", en: "The Founders' Edit, a study in simplicity" },
      excerpt: {
        el: "Μαύρο, λευκό και τίποτα που να χρειάζεται δεύτερη σκέψη. Η φιλοσοφία πίσω από την κάψουλα.",
        en: "Black, white and nothing to overthink. The thinking behind the capsule."
      },
      body: {
        el: "<p>Χτίσαμε το The Founders' Edit γύρω από μια ιδέα. Μαύρο, λευκό και τίποτα που να χρειάζεται να το υπερσκεφτείς.</p><h2>Κομμάτια που κρατούν</h2><p>Δεν κυνηγάμε τάσεις. Φτιάχνουμε κομμάτια που αντέχουν και κινούνται μαζί σου, είτε είσαι στο γήπεδο, στο στούντιο ή έξω στην καθημερινότητά σου. Απλά, διακριτικά κομψά, εύκολα να τα φορέσεις ξανά και ξανά.</p><blockquote>Μια γκαρνταρόμπα που ξεκουράζει το μυαλό αντί να το γεμίζει.</blockquote><p>Αυτή η ησυχία είναι σκόπιμη. Όταν τα βασικά είναι σωστά, το ντύσιμο γίνεται εύκολο και ο χρόνος μένει για τα υπόλοιπα.</p>"
      }
    },
    {
      slug: "a-quiet-ritual-before-the-match",
      date: "2026-06-10", cover: "/img/shoot/padel-serve-white.jpg",
      catSlug: "ritual",
      cat: { el: "Ρουτίνα", en: "Ritual" },
      author: { el: "Η ομάδα CloudSkin", en: "The CloudSkin Team" },
      title: { el: "Μια ήσυχη ρουτίνα πριν το ματς", en: "A quiet ritual before the match" },
      excerpt: {
        el: "Πώς τα μικρά, σταθερά βήματα πριν το παιχνίδι φτιάχνουν έναν καθαρότερο ρυθμό.",
        en: "How small, steady steps before play set a clearer rhythm."
      },
      body: {
        el: "<p>Πριν από κάθε παιχνίδι υπάρχει μια μικρή στιγμή ησυχίας. Λίγα λεπτά για να βρεις τον ρυθμό σου.</p><h2>Απλά βήματα</h2><p>Ένα ζέσταμα χωρίς βιασύνη, μια βαθιά αναπνοή, τα κομμάτια που εμπιστεύεσαι στη θέση τους. Δεν χρειάζεται τίποτα περίπλοκο. Χρειάζεται μόνο κάτι σταθερό στο οποίο επιστρέφεις.</p><p>Όταν το ρούχο δεν σε απασχολεί, ο νους μένει στο παιχνίδι. Αυτή είναι η ιδέα πίσω από κάθε κομμάτι που φτιάχνουμε.</p>"
      }
    }
  ];

  /* ---------- html sanitiser (strict allowlist; inert DOMParser) ---------- */
  const ALLOWED_TAGS = new Set(["p", "br", "hr", "h2", "h3", "h4", "blockquote", "ul", "ol", "li",
    "strong", "b", "em", "i", "u", "a", "img", "figure", "figcaption", "pre", "code", "span",
    "sub", "sup", "table", "thead", "tbody", "tr", "th", "td", "mark", "small"]);
  const ALLOWED_ATTR = { a: ["href", "title"], img: ["src", "alt", "title", "width", "height"] };
  // elements that are dropped WITH their contents (never unwrapped)
  const DROP_WHOLE = new Set(["script", "style", "iframe", "object", "embed", "form", "input",
    "button", "textarea", "select", "link", "meta", "svg", "math", "noscript", "template",
    "head", "title", "base", "audio", "video", "source", "canvas", "applet"]);

  function safeHref(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (v[0] === "#" || v[0] === "/") return v;                 // in-page / root-relative
    if (/^(https?:|mailto:)/i.test(v)) return v;                 // http(s) / mail
    return "";                                                    // reject javascript:, data:, etc.
  }
  function safeSrc(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (v[0] === "/") return v;
    if (/^https?:/i.test(v)) return v;
    if (/^data:image\/(png|jpe?g|gif|webp|avif);/i.test(v)) return v;
    return "";
  }
  function walk(src, dest) {
    src.childNodes.forEach((node) => {
      if (node.nodeType === 3) { dest.appendChild(document.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1) return;                            // drop comments / others
      const tag = node.tagName.toLowerCase();
      if (DROP_WHOLE.has(tag)) return;                            // drop element + contents
      if (!ALLOWED_TAGS.has(tag)) { walk(node, dest); return; }   // unwrap: keep sanitised children
      const el = document.createElement(tag);
      (ALLOWED_ATTR[tag] || []).forEach((a) => {
        let v = node.getAttribute(a);
        if (v == null) return;
        if (a === "href") { v = safeHref(v); if (!v) return; }
        if (a === "src") { v = safeSrc(v); if (!v) return; }
        el.setAttribute(a, v);
      });
      if (tag === "a") {
        el.setAttribute("rel", "noopener nofollow ugc");
        const h = el.getAttribute("href") || "";
        if (/^https?:/i.test(h)) el.setAttribute("target", "_blank");
      }
      if (tag === "img") { el.setAttribute("loading", "lazy"); el.setAttribute("decoding", "async"); }
      walk(node, el);
      dest.appendChild(el);
    });
  }
  function sanitize(html) {
    const doc = new DOMParser().parseFromString("<body><div id='r'>" + (html || "") + "</div></body>", "text/html");
    const holder = document.createElement("div");
    walk(doc.getElementById("r"), holder);
    return holder.innerHTML;
  }

  /* ---------- helpers ---------- */
  const decodeEntities = (s) => {
    const el = document.createElement("textarea"); el.innerHTML = s || ""; return el.value;
  };
  const stripTags = (html) => {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  };
  const pick = (obj) => (obj && typeof obj === "object" && !Array.isArray(obj))
    ? (obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : Object.values(obj)[0]))
    : obj;
  function fmtDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return "";
    try { return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(date); }
    catch (e) { return date.toISOString().slice(0, 10); }
  }
  function readingTime(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const n = Math.max(1, Math.round(words / 200));
    return fill(n === 1 ? "blog.readTimeOne" : "blog.readTime", { n: n });
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- normalise ---------- */
  function fromSample(s) {
    const bodyHTML = sanitize(pick(s.body));
    return {
      slug: s.slug, url: SITE + "/blog/" + s.slug,
      title: pick(s.title), excerpt: pick(s.excerpt),
      bodyHTML: bodyHTML, bodyText: stripTags(pick(s.body)),
      cover: s.cover, coverAlt: pick(s.title),
      date: new Date(s.date + "T09:00:00Z"), modified: new Date(s.date + "T09:00:00Z"),
      author: pick(s.author), cat: pick(s.cat), catSlug: s.catSlug, sample: true
    };
  }
  function fromWP(p) {
    const emb = p._embedded || {};
    const media = (emb["wp:featuredmedia"] || [])[0] || null;
    let cover = "";
    if (media && !media.code) {
      const sizes = (media.media_details && media.media_details.sizes) || {};
      cover = (sizes.large && sizes.large.source_url) || (sizes.medium_large && sizes.medium_large.source_url) || media.source_url || "";
    }
    const terms = (emb["wp:term"] || []).find((arr) => Array.isArray(arr) && arr.some((x) => x && x.taxonomy === "category")) || [];
    const catTerm = terms.find((x) => x && x.taxonomy === "category");
    const author = ((emb.author || [])[0] || {}).name || "";
    const contentHTML = p.content ? p.content.rendered : "";
    return {
      slug: p.slug, url: SITE + "/blog/" + p.slug, id: p.id,
      title: decodeEntities(p.title ? p.title.rendered : ""),
      excerpt: stripTags(p.excerpt ? p.excerpt.rendered : "").replace(/\s*\[…\]\s*$/, "…"),
      bodyHTML: sanitize(contentHTML), bodyText: stripTags(contentHTML),
      cover: cover, coverAlt: (media && media.alt_text) || decodeEntities(p.title ? p.title.rendered : ""),
      date: new Date(p.date_gmt ? p.date_gmt + "Z" : p.date),
      modified: new Date(p.modified_gmt ? p.modified_gmt + "Z" : (p.modified || p.date)),
      author: author, cat: catTerm ? decodeEntities(catTerm.name) : "", catSlug: catTerm ? catTerm.slug : "",
      sample: false
    };
  }

  /* ---------- data access (cached) ---------- */
  const base = (cfg.url || "").replace(/\/+$/, "");
  const langQ = cfg.lang ? "&lang=" + encodeURIComponent(cfg.lang) : "";
  let _listCache = null;
  async function getList() {
    if (_listCache) return _listCache;
    if (base) {
      try {
        const per = Number(cfg.perPage) || 12;
        const url = base + "/posts?_embed=1&per_page=" + per + langQ;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error("WP HTTP " + r.status);
        const arr = await r.json();
        if (Array.isArray(arr) && arr.length) { _listCache = { posts: arr.map(fromWP), sample: false }; return _listCache; }
        throw new Error("WP returned no posts");
      } catch (e) {
        console.warn("[CloudSkin Journal] WordPress unavailable, showing sample posts.", e && e.message);
      }
    }
    _listCache = { posts: SAMPLES.map(fromSample), sample: true };
    return _listCache;
  }
  async function getPost(slug) {
    if (base) {
      try {
        const url = base + "/posts?_embed=1&slug=" + encodeURIComponent(slug) + langQ;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (r.ok) { const arr = await r.json(); if (Array.isArray(arr) && arr.length) return { post: fromWP(arr[0]), sample: false }; }
      } catch (e) { console.warn("[CloudSkin Journal] WordPress post fetch failed, trying samples.", e && e.message); }
    }
    const s = SAMPLES.find((x) => x.slug === slug);
    return s ? { post: fromSample(s), sample: true } : { post: null, sample: !base };
  }

  /* ---------- reveal (IntersectionObserver + guaranteed fallback) ---------- */
  function reveal(nodes) {
    const els = [...nodes];
    const show = (el) => el.classList.add("in");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(show); return; }
    const io = new IntersectionObserver((ents, o) => {
      ents.forEach((e) => { if (e.isIntersecting) { show(e.target); o.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    els.forEach((el, i) => { el.style.setProperty("--d", (i % 3) * 0.06 + "s"); io.observe(el); });
    // preview pane / background tab / no-IO-fire: force reveal so content is never stuck hidden
    setTimeout(() => els.forEach(show), 1400);
  }

  /* ---------- SEO head injection ---------- */
  function setTitle(s) { document.title = s; }
  function meta(sel, attr, key, val) {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  function metaName(name, val) { meta('meta[name="' + name + '"]', "name", name, val); }
  function metaProp(prop, val) { meta('meta[property="' + prop + '"]', "property", prop, val); }
  function linkRel(rel, href) {
    let el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
    el.setAttribute("href", href);
  }
  function jsonLd(id, obj) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = id; document.head.appendChild(el); }
    el.textContent = JSON.stringify(obj);
  }

  /* ---------- card markup ---------- */
  function cardHTML(p) {
    const cover = p.cover
      ? '<span class="bcard__media"><img src="' + esc(p.cover) + '" alt="' + esc(p.coverAlt || p.title) + '" loading="lazy" decoding="async"></span>'
      : '<span class="bcard__media bcard__media--empty" aria-hidden="true"></span>';
    const cat = p.cat ? '<span class="bcard__cat">' + esc(p.cat) + "</span>" : "";
    return '<a class="bcard reveal" href="/blog/' + esc(p.slug) + '">' +
      cover + cat +
      '<span class="bcard__title">' + esc(p.title) + "</span>" +
      (p.excerpt ? '<span class="bcard__excerpt">' + esc(p.excerpt) + "</span>" : "") +
      '<span class="bcard__meta"><span>' + esc(fmtDate(p.date)) + "</span>" +
      '<span aria-hidden="true">&middot;</span><span>' + esc(readingTime(p.bodyText)) + "</span></span>" +
      "</a>";
  }

  /* ============================================================
     INDEX  (/blog)
     ============================================================ */
  async function renderIndex(root) {
    const skel = document.getElementById("jSkeleton");
    const { posts, sample } = await getList();
    if (skel) skel.remove();

    if (!posts.length) {
      root.innerHTML = '<p class="post-missing__title" style="text-align:center">' + esc(t("blog.empty")) + "</p>";
      return;
    }

    // preview flag
    const note = document.getElementById("jNote");
    if (note && sample) note.classList.add("on");

    // categories from the real list
    const cats = [];
    const seen = {};
    posts.forEach((p) => { if (p.catSlug && !seen[p.catSlug]) { seen[p.catSlug] = 1; cats.push({ slug: p.catSlug, label: p.cat }); } });

    const featured = posts[0];
    const rest = posts.slice(1);

    const filtersHTML = cats.length > 1 ? (
      '<div class="jfilter" role="tablist" aria-label="' + esc(t("blog.filterLabel")) + '">' +
      '<button class="jfilter__btn is-active" data-cat="all" role="tab" aria-selected="true">' + esc(t("blog.all")) + "</button>" +
      cats.map((c) => '<button class="jfilter__btn" data-cat="' + esc(c.slug) + '" role="tab" aria-selected="false">' + esc(c.label) + "</button>").join("") +
      "</div>"
    ) : "";

    const featuredHTML =
      '<section class="jfeat reveal" id="jFeatured" aria-label="' + esc(t("blog.featured")) + '">' +
      '<a class="jfeat__media" href="/blog/' + esc(featured.slug) + '" tabindex="-1" aria-hidden="true">' +
      (featured.cover ? '<img src="' + esc(featured.cover) + '" alt="' + esc(featured.coverAlt || featured.title) + '" fetchpriority="high" decoding="async">' : "") +
      "</a>" +
      '<div class="jfeat__body">' +
      (featured.cat ? '<p class="jfeat__cat">' + esc(featured.cat) + "</p>" : "") +
      '<h2 class="jfeat__title"><a href="/blog/' + esc(featured.slug) + '">' + esc(featured.title) + "</a></h2>" +
      (featured.excerpt ? '<p class="jfeat__excerpt">' + esc(featured.excerpt) + "</p>" : "") +
      '<p class="jfeat__meta"><span>' + esc(fmtDate(featured.date)) + "</span>" +
      '<span aria-hidden="true">&middot;</span><span>' + esc(readingTime(featured.bodyText)) + "</span></p>" +
      '<a class="link-cta jfeat__more" href="/blog/' + esc(featured.slug) + '">' + esc(t("blog.readStory")) +
      ' <span class="jarrow" aria-hidden="true">&rarr;</span></a>' +
      "</div></section>";

    const gridHeadHTML =
      '<div class="jsec-head" id="jSecHead"><h2>' + esc(t("blog.latest")) + "</h2>" +
      '<span id="jCount"></span></div>';

    root.innerHTML = filtersHTML + featuredHTML + gridHeadHTML + '<div class="jgrid" id="jGrid"></div>';

    const grid = document.getElementById("jGrid");
    const feat = document.getElementById("jFeatured");
    const countEl = document.getElementById("jCount");

    function paint(list, showFeatured) {
      if (feat) feat.hidden = !showFeatured;
      grid.innerHTML = list.map(cardHTML).join("");
      if (countEl) { const cn = showFeatured ? list.length + 1 : list.length; countEl.textContent = fill(cn === 1 ? "blog.countOne" : "blog.count", { n: cn }); }
      reveal(grid.querySelectorAll(".bcard"));
      if (showFeatured && feat && feat.classList.contains("reveal")) reveal([feat]);
    }
    paint(rest, true);

    // client-side category filtering
    root.querySelectorAll(".jfilter__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".jfilter__btn").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
        btn.classList.add("is-active"); btn.setAttribute("aria-selected", "true");
        const c = btn.dataset.cat;
        if (c === "all") paint(rest, true);
        else paint(posts.filter((p) => p.catSlug === c), false);
      });
    });

    // SEO: Blog + ItemList of the posts (index page canonical/OG are static in blog.html)
    jsonLd("ld-bloglist", {
      "@context": "https://schema.org", "@type": "Blog",
      "@id": SITE + "/blog#blog", "url": SITE + "/blog",
      "name": "The CloudSkin Journal", "inLanguage": lang,
      "publisher": { "@type": "Organization", "name": "CLOUDSKIN", "@id": SITE + "/#org" },
      "blogPost": posts.slice(0, 12).map((p) => ({
        "@type": "BlogPosting", "headline": p.title, "url": p.url,
        "datePublished": p.date.toISOString(),
        "image": p.cover ? (/^https?:/.test(p.cover) ? p.cover : SITE + "/" + p.cover.replace(/^\//, "")) : undefined
      }))
    });
  }

  /* ============================================================
     POST  (/blog/<slug>)
     ============================================================ */
  function currentSlug() {
    const path = location.pathname.replace(/\/+$/, "");
    const m = path.match(/\/blog\/([^\/]+)$/);
    if (m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get("slug") || "";
  }

  async function renderPost(root) {
    const slug = currentSlug();
    const skel = document.getElementById("jPostSkeleton");
    if (!slug) { if (skel) skel.remove(); renderMissing(root); return; }

    const { post, sample } = await getPost(slug);
    if (skel) skel.remove();
    if (!post) { renderMissing(root); return; }

    const note = document.getElementById("jNote");
    if (note && sample) note.classList.add("on");

    const backLbl = t("blog.back");
    const coverHTML = post.cover
      ? '<figure class="post-cover"><img src="' + esc(post.cover) + '" alt="' + esc(post.coverAlt || post.title) + '" fetchpriority="high" decoding="async"></figure>'
      : "";
    const metaBits = [];
    metaBits.push("<span>" + esc(fmtDate(post.date)) + "</span>");
    metaBits.push("<span>" + esc(readingTime(post.bodyText)) + "</span>");
    if (post.author) metaBits.push("<span>" + esc(fill("blog.by", { name: post.author })) + "</span>");
    const metaHTML = metaBits.join('<span aria-hidden="true">&middot;</span>');

    root.innerHTML =
      '<header class="post-head">' +
      '<a class="post-back" href="/blog"><span class="jarrow" aria-hidden="true">&larr;</span> ' + esc(backLbl) + "</a>" +
      (post.cat ? '<p class="post-cat">' + esc(post.cat) + "</p>" : "") +
      '<h1 class="post-title">' + esc(post.title) + "</h1>" +
      '<div class="post-meta">' + metaHTML + "</div>" +
      "</header>" +
      coverHTML +
      '<div class="post-body">' + post.bodyHTML + "</div>" +
      '<div class="post-foot"><a class="btn btn--outline" href="/blog">' + esc(t("blog.backToJournal")) + "</a></div>" +
      '<section class="post-more" id="jMore" hidden></section>';

    // SEO
    const desc = (post.excerpt || post.bodyText || "").slice(0, 300);
    const img = post.cover ? (/^https?:/.test(post.cover) ? post.cover : SITE + "/" + post.cover.replace(/^\//, "")) : SITE + "/img/brand/og-image.jpg";
    setTitle(post.title + " | CLOUDSKIN® Journal");
    metaName("description", desc);
    linkRel("canonical", post.url);
    metaProp("og:type", "article");
    metaProp("og:site_name", "CLOUDSKIN");
    metaProp("og:title", post.title);
    metaProp("og:description", desc);
    metaProp("og:url", post.url);
    metaProp("og:image", img);
    metaName("twitter:card", "summary_large_image");
    metaName("twitter:title", post.title);
    metaName("twitter:description", desc);
    metaName("twitter:image", img);
    jsonLd("ld-article", {
      "@context": "https://schema.org", "@type": "Article",
      "headline": post.title,
      "description": desc,
      "image": [img],
      "datePublished": post.date.toISOString(),
      "dateModified": (post.modified || post.date).toISOString(),
      "inLanguage": lang,
      "author": { "@type": post.author ? "Person" : "Organization", "name": post.author || "CLOUDSKIN" },
      "publisher": { "@type": "Organization", "name": "CLOUDSKIN", "@id": SITE + "/#org", "logo": { "@type": "ImageObject", "url": SITE + "/img/brand/og-image.jpg" } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": post.url }
    });

    // continue reading (reuse the recent list; never a second dependency)
    try {
      const { posts } = await getList();
      const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
      if (others.length) {
        const more = document.getElementById("jMore");
        more.innerHTML = '<h2 class="post-more__head">' + esc(t("blog.more")) + '</h2><div class="post-more__grid">' +
          others.map(cardHTML).join("") + "</div>";
        more.hidden = false;
        reveal(more.querySelectorAll(".bcard"));
      }
    } catch (e) { /* continue-reading is optional */ }
  }

  function renderMissing(root) {
    root.innerHTML =
      '<div class="post-missing"><h1 class="post-missing__title">' + esc(t("blog.missingTitle")) + "</h1>" +
      "<p>" + esc(t("blog.missingBody")) + "</p>" +
      '<a class="btn btn--outline" href="/blog">' + esc(t("blog.backToJournal")) + "</a></div>";
    metaName("robots", "noindex, nofollow");
  }

  /* ---------- shared-chrome link fix ----------
     The post route /blog/<slug> lives one path segment deep, so the shared
     header/footer/menu's root-less relative links (e.g. "collection.html")
     would otherwise resolve under /blog/ and 404. Rewrite them to root-
     relative once the shell has rendered. Fragment (#...), absolute,
     protocol (mailto:/tel:) and already-root (/...) links are left untouched,
     so the skip-link, "back to top" and JS-handled links keep working. */
  function fixChromeLinks() {
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (!h || /^(\/|#|https?:|mailto:|tel:|data:|\/\/)/i.test(h)) return;
      a.setAttribute("href", "/" + h.replace(/^\.?\//, ""));
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    fixChromeLinks();                                 // after the shell has rendered the chrome
    const idx = document.getElementById("blogIndex");
    const post = document.getElementById("blogPost");
    if (idx) renderIndex(idx);
    else if (post) renderPost(post);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  // belt-and-braces: re-run once everything (incl. any late shell render) is settled
  window.addEventListener("load", fixChromeLinks);
})();
