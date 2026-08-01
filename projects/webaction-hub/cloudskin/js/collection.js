/* ============================================================
   CLOUDSKIN, collection (PLP) controller
   Reads ?c=slug plus optional facet params, renders the sticky
   filter bar, sort, live count, and the 2:3 card grid.
   ============================================================ */
(() => {
  "use strict";
  const C = window.CLOUDSKIN;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const slug = params.get("c") || "collection";

  // active filter state, seeded from URL facets
  const state = { size: new Set(), color: new Set(), fabric: new Set(), length: new Set(), activity: new Set(), support: new Set(), sort: "trending" };
  ["color", "activity", "length", "rise", "support"].forEach(k => {
    const v = params.get(k);
    if (v && state[k]) state[k].add(v);
  });

  // gender is a STRUCTURAL filter (not a facet) so category/sport pages opened from the
  // Women or Men menu never show the other gender's products.
  const structural = {};
  const genderParam = params.get("gender");
  if (genderParam) structural.gender = genderParam;

  /* owner display order: tag each product's static (curate) position once; an owner
     "order" override (p._orderOverride, applied by content.js) wins when present. */
  (window.CLOUDSKIN_PRODUCTS || []).forEach((p, i) => { if (p && p._baseOrder == null) p._baseOrder = i; });
  const effOrder = p => (p && p._orderOverride != null) ? p._orderOverride : 1000 + ((p && p._baseOrder) || 0);

  // def + base are recomputed on load AND when the owner's overrides arrive, because a
  // gender/flag edit can move a product into or out of this collection (rebuild, not re-sort).
  let def, base;
  const plpT = $("#plpTitle"), plpS = $("#plpSub");
  function computeBase() {
    const r = C.resolveCollection(slug, structural);
    def = r.def; base = r.items;
    document.title = `${def.title} | CLOUDSKIN®`;
    if (plpT) plpT.textContent = def.title;
    if (plpS) plpS.textContent = def.subtitle || "";
    const crumb = $("#crumbCat"); if (crumb) crumb.textContent = def.title;
  }
  computeBase();

  /* ---- canonical + CollectionPage / ItemList / breadcrumb schema (SEO) ---- */
  (() => {
    const canon = document.createElement("link");
    canon.rel = "canonical"; canon.href = location.origin + location.pathname + location.search;
    document.head.appendChild(canon);
    const s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: location.origin + "/" },
          { "@type": "ListItem", position: 2, name: def.title, item: location.href }
        ] },
        { "@type": "CollectionPage", name: def.title + " | CLOUDSKIN", description: def.subtitle || "", url: location.href,
          mainEntity: { "@type": "ItemList", numberOfItems: base.length,
            itemListElement: base.slice(0, 24).map((p, i) => ({
              "@type": "ListItem", position: i + 1,
              item: { "@type": "Product", name: p.title, url: location.origin + "/product.html?handle=" + p.handle,
                image: location.origin + "/" + (p.images && p.images[0]),
                offers: { "@type": "Offer", priceCurrency: "EUR", price: p.price, availability: "https://schema.org/InStock" } }
            }))
          }
        }
      ]
    });
    document.head.appendChild(s);
  })();

  /* ---- facet definitions built from the collection's products ---- */
  const uniq = (key, split) => {
    const s = new Set();
    base.forEach(p => {
      const v = p[key];
      if (Array.isArray(v)) v.forEach(x => s.add(x));
      else if (v) s.add(v);
    });
    return [...s];
  };
  let facetDefs = [];
  function buildFacets() {
    facetDefs = [
      { key: "size", label: C.t("facet.size"), type: "list", opts: () => {
          const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
          const set = new Set(); base.forEach(p => (p.sizes || []).forEach(s => set.add(s)));
          return order.filter(s => set.has(s));
        }, match: (p, sel) => (p.sizes || []).some(s => sel.has(s)) },
      { key: "color", label: C.t("facet.color"), type: "sw", opts: () => {
          const set = new Set(); base.forEach(p => (p.availColors || p.colors || [p.color]).forEach(c => set.add(c)));
          return [...set];
        }, match: (p, sel) => (p.availColors || p.colors || [p.color]).some(c => sel.has(c)) },
      { key: "length", label: C.t("facet.length"), type: "list", opts: () => uniq("lengths"), match: (p, sel) => (p.lengths || []).some(l => sel.has(l)) }
      // Fabric, Activity and Support facets intentionally removed per brief.
    ].filter(f => f.opts().length > 1); // only show facets with >1 option in this collection
  }
  buildFacets();

  /* ---- render facet bar ---- */
  function renderFacets() {
    $("#facets").innerHTML = facetDefs.map(f => {
      const sel = state[f.key];
      const n = sel.size ? `<span class="dot">${sel.size}</span>` : "";
      let pop;
      if (f.type === "sw") {
        pop = `<div class="facet__swatches">${f.opts().map(o =>
          `<span class="sw ${sel.has(o) ? "on" : ""}" style="background:${C.hexFor(o)}" data-k="${f.key}" data-v="${o}" title="${o}" role="button" tabindex="0" aria-label="${o}"></span>`).join("")}</div>`;
      } else {
        pop = f.opts().map(o =>
          `<label class="opt"><input type="checkbox" data-k="${f.key}" data-v="${o}" ${sel.has(o) ? "checked" : ""}> ${o}</label>`).join("");
      }
      return `<div class="facet" data-facet="${f.key}">
        <button class="facet__btn" aria-expanded="false">${f.label}${n} <span class="caret">▾</span></button>
        <div class="facet__pop">${pop}</div>
      </div>`;
    }).join("");
    wireFacets();
  }

  function wireFacets() {
    $$(".facet").forEach(fc => {
      const btn = $(".facet__btn", fc);
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = fc.classList.contains("open");
        $$(".facet").forEach(x => { x.classList.remove("open"); $(".facet__btn", x)?.setAttribute("aria-expanded", "false"); });
        if (!open) { fc.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });
    $$('.facet__pop input[type=checkbox]').forEach(cb =>
      cb.addEventListener("change", () => { toggle(cb.dataset.k, cb.dataset.v, cb.checked); }));
    $$(".facet__swatches .sw").forEach(sw => {
      const act = () => { const on = !state[sw.dataset.k].has(sw.dataset.v); sw.classList.toggle("on", on); toggle(sw.dataset.k, sw.dataset.v, on); };
      sw.addEventListener("click", act);
      sw.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    });
  }

  function toggle(key, val, on) {
    if (on) state[key].add(val); else state[key].delete(val);
    apply();
  }

  document.addEventListener("click", () => $$(".facet").forEach(x => x.classList.remove("open")));

  /* ---- sort + apply ---- */
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; apply(); });

  function activeChips() {
    const chips = [];
    facetDefs.forEach(f => state[f.key].forEach(v => chips.push([f.key, v])));
    const box = $("#activeChips");
    if (!chips.length) { box.innerHTML = ""; return; }
    box.innerHTML = chips.map(([k, v]) => `<span class="chip">${v}<button data-rm-k="${k}" data-rm-v="${v}" aria-label="Remove ${v}">✕</button></span>`).join("")
      + `<button class="clear" id="clearAll">${C.t("chips.clearAll")}</button>`;
    $$("[data-rm-k]").forEach(b => b.addEventListener("click", () => { state[b.dataset.rmK].delete(b.dataset.rmV); renderFacets(); apply(); }));
    $("#clearAll").addEventListener("click", () => { facetDefs.forEach(f => state[f.key].clear()); renderFacets(); apply(); });
  }

  function apply() {
    let list = base.filter(p => facetDefs.every(f => { const sel = state[f.key]; return sel.size === 0 || f.match(p, sel); }));
    const s = state.sort;
    const trendScore = p => (p.bestSeller ? 2 : 0) + (p.isNew ? 1 : 0);
    if (s === "plh") list.sort((a, b) => a.price - b.price);
    else if (s === "phl") list.sort((a, b) => b.price - a.price);
    else {
      // "trending" (default). If the owner has set a manual order for any piece here,
      // honour it; otherwise keep the built-in best-seller / review-count ranking.
      const owned = list.some(p => p._orderOverride != null);
      if (owned) list.sort((a, b) => effOrder(a) - effOrder(b));
      else list.sort((a, b) => (trendScore(b) - trendScore(a)) || ((b.reviewCount || 0) - (a.reviewCount || 0)));
    }

    // Colourway split: one card per real, displayable colourway, so a two-colour product shows as
    // TWO cards (both colours visible with zero taps - the mobile-first fix, since phones have no
    // hover to reveal a swatch swap). When a colour filter is active, keep only the selected
    // colourway(s). Variant-safe (every card is a real Shopify variant) and each card deep-links
    // to + adds that exact colour; `single` renders just that colour's swatch.
    const selColors = new Set(state.color);
    const cards = C.colorwayCards(list, selColors);

    $("#count").textContent = C.t(cards.length === 1 ? "count.one" : "count.many", { n: cards.length });
    const wrap = $("#results"), empty = $("#empty");
    if (!cards.length) { wrap.innerHTML = ""; empty.hidden = false; activeChips(); return; }
    empty.hidden = true;

    wrap.innerHTML = `<div class="pgrid">${cards.map((e, i) => C.cardHTML(e.p, i, e.color, true)).join("")}</div>`;
    activeChips();
    requestAnimationFrame(() => requestAnimationFrame(() => $$(".pcard", wrap).forEach(c => c.classList.add("in"))));
  }

  /* mobile filter button just scrolls the bar into focus / toggles first facet */
  $("#mFilterBtn")?.addEventListener("click", () => {
    const bar = $("#filterbar"); bar.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // full (re)build: recompute the collection, its facets, and the grid.
  function build() { computeBase(); buildFacets(); renderFacets(); apply(); }

  /* ---- held first paint (no flash) ----
     collection.js runs at parse time, BEFORE content.js has fetched the owner's Supabase
     overrides (gender/category/order flags + Studio photos). Painting the static curate
     defaults now and re-painting when the overrides land makes the grid visibly reshuffle
     and swap card photos. Instead we HOLD the grid (empty, its height reserved so the page
     doesn't jump) until content.js signals `cloudskin:content-ready`, then render ONCE with
     the final data. Fail-open: if Supabase is slow or unreachable, a short timeout paints the
     curate defaults so the grid is never left blank. */
  const gridEl = $("#grid");
  if (gridEl) gridEl.style.minHeight = "60vh";     // reserve space during the hold (no layout jump)
  let painted = false, paintedFromData = false, holdTimer = 0;
  function firstPaint(fromData) {
    if (painted) return;
    painted = true;
    paintedFromData = !!fromData;
    clearTimeout(holdTimer);
    build();
    if (gridEl) gridEl.style.minHeight = "";        // release the reserve once the real grid is in
  }
  holdTimer = setTimeout(() => firstPaint(false), 1200);   // fail-open ceiling: paint curate defaults if Supabase is slow/down
  if (window.CLOUDSKIN && CLOUDSKIN.contentReady) firstPaint(true);
  else document.addEventListener("cloudskin:content-ready", () => firstPaint(true));

  /* products-updated (owner overrides): before the first paint, settle the grid once with the
     final data. AFTER the first paint, re-render ONLY if that paint already reflected real data
     (a genuine Studio-edit re-render). If the fail-open timeout painted defaults because Supabase
     was slow, we do NOT repaint when the data finally lands; that late swap would be the very
     reshuffle we are eliminating; the shopper keeps the stable default grid for this load. */
  document.addEventListener("cloudskin:products-updated", () => {
    if (!painted) firstPaint(true);
    else if (paintedFromData) build();
  });
})();
