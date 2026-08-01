/* ============================================================
   CLOUDSKIN, product (PDP) controller
   Reads ?handle=, renders gallery + sticky buy box + accordions
   + reviews + recommendation carousels + sticky add-to-bag.
   ============================================================ */
(() => {
  "use strict";
  const C = window.CLOUDSKIN;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const money = C.money;
  const P = () => window.CLOUDSKIN_PRODUCTS || [];
  const params = new URLSearchParams(location.search);
  const handle = params.get("handle") || params.get("h");   // accept both ?handle= and ?h=
  const p = P().find(x => x.handle === handle) || P()[0];
  if (!p) { $("#pdpMain").innerHTML = "<p>Product not found.</p>"; return; }

  /* ---- continuity image (?img=) --------------------------------------------
     The clicked card hands us the EXACT image it was showing (shell.js cardHTML
     appends &img=<url>). We paint that as the first gallery image SYNCHRONOUSLY,
     before the async cloudskin_content fetch runs, so the PDP opens on the photo
     you tapped with no flash of the catalogue shot. Validated to a safe source:
     a same-origin bundled "img/…" path, or the CloudSkin Supabase public bucket.
     Anything else is ignored (falls back to the normal catalogue gallery). */
  const imgParam = (() => {
    const raw = params.get("img");
    if (!raw) return null;
    if (/^img\/[A-Za-z0-9._/-]+$/.test(raw)) return raw;   // bundled product shot
    try {
      const u = new URL(raw, location.origin);
      const sbUrl = (window.CLOUDSKIN_SB && window.CLOUDSKIN_SB.url) || "";
      if (sbUrl && u.origin === new URL(sbUrl).origin && u.protocol === "https:") return u.href;
    } catch (e) {}
    return null;
  })();
  // Clean product URL for canonical + structured data (the transient ?img continuity param is
  // presentation-only and must never leak into canonical/JSON-LD; the colour variant is kept).
  const cleanURL = location.origin + location.pathname + "?handle=" + encodeURIComponent(p.handle) +
    (params.get("color") ? "&color=" + encodeURIComponent(params.get("color")) : "");

  /* ---- product copy: canonical defaults now live in js/product-content.js
     (shared with the Content Studio so the two never drift). The initial render
     below uses these exactly as before, so the storefront is byte-identical.
     Owner edits arrive as Supabase overrides and are layered on AFTER first
     paint by the additive block near the end of this file - with no overrides
     saved, that block is a no-op and nothing on the page changes. If the module
     ever fails to load, pc falls back to null and the page uses p.blurb, exactly
     as it did before this system existed. ---- */
  const PDP = window.CLOUDSKIN_PDP || {};
  const CARE = PDP.CARE || ["Wash by hand / cool wash under 30°C", "Do not bleach", "Line dry in the shape", "Do not iron", "Do not dry clean"];
  const PRODUCT_CONTENT = PDP.PRODUCTS || {};
  const pc = PRODUCT_CONTENT[p.handle] || null;
  // escape owner-supplied text before it goes into innerHTML (bullets / accordions)
  const escH = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let selectedSize = null;
  const allImgs = (p.allImages && p.allImages.length ? p.allImages : p.images) || [];
  const seoImages = allImgs.slice(0, 6);

  document.title = `${p.title} · ${p.color} | CLOUDSKIN®`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = `${p.title} in ${p.color}. ${p.blurb}`;

  /* ---- breadcrumb (gender-scoped so it lands on the right category edit) ---- */
  const catSlug = { "Skirts": "skirts", "Dresses": "dresses", "Bras": "bras", "Tops": "tops", "Layers": "layers", "Shorts": "shorts" }[p.category] || "collection";
  const genderQ = p.gender === "Men" ? "&gender=Men" : p.gender === "Women" ? "&gender=Women" : "";
  $("#crumb").innerHTML = `<a href="home.html">${C.t("crumb.home")}</a> / <a href="collection.html?c=${catSlug}${genderQ}">${p.category}</a> / ${p.title}`;

  /* ---- JSON-LD ---- */
  $("#ld-product").textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product",
    name: p.title, image: seoImages.map(g => location.origin + "/" + g),
    description: p.blurb, brand: { "@type": "Brand", name: "CLOUDSKIN" },
    sku: p.handle,
    offers: { "@type": "Offer", priceCurrency: "EUR", price: p.price, availability: "https://schema.org/InStock", url: cleanURL }
  });

  /* ---- canonical + breadcrumb schema (SEO) ---- */
  (() => {
    const canon = document.createElement("link");
    canon.rel = "canonical"; canon.href = cleanURL;
    document.head.appendChild(canon);
    const bc = document.createElement("script"); bc.type = "application/ld+json";
    bc.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: location.origin + "/" },
        { "@type": "ListItem", position: 2, name: p.category, item: location.origin + "/collection.html?c=" + catSlug + genderQ },
        { "@type": "ListItem", position: 3, name: p.title, item: cleanURL }
      ]
    });
    document.head.appendChild(bc);
  })();

  /* ---- main render: gallery + buybox ---- */
  const stars = r => "★★★★★☆☆☆☆☆".slice(5 - Math.round(r), 10 - Math.round(r));
  const priceHTML = p.compareAt
    ? `<s>${money(p.compareAt, true)}</s><span class="sale">${money(p.price, true)}</span>`
    : money(p.price, true);
  // only offer colourways that actually have a distinct product photo (see curate.js availColors)
  const colors = (p.availColors && p.availColors.length ? p.availColors : (p.colors && p.colors.length ? p.colors : [p.color]));
  const lengths = p.lengths || [];

  /* colour → images: the gallery shows only the actual product shots (studio /shopify/ images),
     which pair to colours by index so selecting a colour swaps the gallery to that colourway.
     Generic /shoot/ lifestyle frames are NOT shown here (they don't depict the specific product);
     it's fine for a product to have a single photo. */
  const shopShots = allImgs.filter(s => s.includes("/shopify/"));
  const colorShot = {};
  colors.forEach((c, i) => { if (shopShots[i]) colorShot[c] = shopShots[i]; });
  /* Gallery source of truth, in priority order:
     1. Owner-curated photos from the Content Studio, PER COLOUR
        (Supabase key product.<handle>.images.<colourSlug>) - Larissa adds/reorders
        the real product shots for the exact colour the customer selected.
     2. The flat legacy key product.<handle>.images (all colours), kept as a fallback
        for any product that predates per-colour photos.
     3. Otherwise the bundled local product shots (colour-paired by index), so a product
        with no Studio photos yet keeps its current photo and nothing goes blank. */
  let studioImages = null;          // flat key (fallback), filled once Studio content loads
  let studioColourImages = {};      // colourSlug -> [urls] from the per-colour keys
  let studioFocal = {};             // url -> {pos,zoom} owner framing (binds to the URL, so it survives reorder)
  const focalFor = (u) => (u && studioFocal[u]) || null;
  const addFocal = (focal) => { if (focal) Object.keys(focal).forEach((u) => { studioFocal[u] = focal[u]; }); };
  // Gallery = the owner's Content Studio photos for this colour, IN HER ORDER: photo #1 (her chosen
  // base) is the big main image and also the card/preview, so opening the product shows the SAME
  // image you clicked (continuity); photos #2, #3… are the extra views (thumbnails). With no owner
  // photos yet it falls back to the clean catalogue shot(s), exactly as before.
  const galleryFor = (color) => {
    // tolerant per-colour match (exact slug, else an unambiguous colour-family match) so her
    // photo still shows if the colour was renamed after upload (White/White Mist, case, spacing).
    const byColour = C.studioImagesForColour(studioColourImages, color);
    if (byColour && byColour.length) return byColour.slice(0, 8);
    if (studioImages && studioImages.length) return studioImages.slice(0, 8);
    const base = (colors.length > 1 && colorShot[color]) ? [colorShot[color]] : shopShots;
    return base.filter(Boolean).slice(0, 8);
  };
  /* ---- first-paint snapshot seed (deploy-time js/content-snapshot.js) ----
     If the baked snapshot is present, populate this product's Content Studio photos
     SYNCHRONOUSLY now, so galleryFor() opens on the owner's real photo #1 - even on a
     cold load where Supabase is slow or unreachable (no catalogue-default flash, no
     async wait). The live fetch further down still reconciles any post-deploy edit. */
  (function seedStudioFromSnapshot() {
    const snap = window.CLOUDSKIN_CONTENT_SNAPSHOT;
    if (!snap) return;
    const flatKey = "product." + p.handle + ".images";
    const colourPrefix = flatKey + ".";
    Object.keys(snap).forEach((k) => {
      if (k.indexOf(colourPrefix) !== 0) return;
      const s = k.slice(colourPrefix.length);
      const parsed = C.parseStudioCell(snap[k]);
      if (s && parsed.urls.length) { studioColourImages[s] = parsed.urls; addFocal(parsed.focal); }
    });
    const flat = snap[flatKey];
    if (flat) {
      const parsed = C.parseStudioCell(flat);
      if (parsed.urls.length) { studioImages = parsed.urls; addFocal(parsed.focal); }
    }
  })();
  let gallery = galleryFor(p.color);
  // Open on the tapped card's exact image, painted now (no catalogue-shot flash). The async
  // Studio reconcile below rebuilds the full gallery; because the card always hands us photo #1,
  // photo #1 stays identical and the main image never visibly changes.
  if (imgParam) gallery = [imgParam];

  $("#pdpMain").innerHTML = `
    <div class="gallery${gallery.length < 2 ? " gallery--single" : ""}" id="gallery">
      <div class="gallery__thumbs" id="thumbs">
        ${gallery.map((g, i) => `<button class="${i === 0 ? "on" : ""}" data-i="${i}" aria-label="View image ${i + 1}"><img src="${g}" alt="${p.title} view ${i + 1}" loading="lazy" decoding="async"${C.focalAttrs(focalFor(g))}></button>`).join("")}
      </div>
      <div class="gallery__main" id="galMain"><img id="galImg" src="${gallery[0]}" alt="${p.title} in ${p.color}" decoding="async"${C.focalAttrs(focalFor(gallery[0]))}></div>
    </div>
    <div class="buybox" id="buybox">
      <h1 class="buybox__title">${p.title}</h1>
      <div class="buybox__price">${priceHTML}</div>

      <div class="buybox__group">
        <div class="buybox__label"><span>${C.t("facet.color")} · <strong id="colorName">${p.color}</strong></span></div>
        <div class="opts opts--sw" id="colorOpts">
          ${colors.map((c, i) => `<i class="${i === 0 ? "on" : ""}" style="background:${C.hexFor(c)}" data-color="${c}" title="${c}" role="button" tabindex="0" aria-label="${c}"></i>`).join("")}
        </div>
      </div>

      ${lengths.length > 1 ? `<div class="buybox__group">
        <div class="buybox__label"><span>${C.t("facet.length")}</span></div>
        <div class="opts" id="lengthOpts">${lengths.map((l, i) => `<button class="${i === 0 ? "on" : ""}" data-length="${l}">${l}</button>`).join("")}</div>
      </div>` : ""}

      ${(p.sizes && p.sizes.length) ? `<div class="buybox__group">
        <div class="buybox__label"><span>${C.t("pdp.size")}</span><a href="#" id="sizeGuide">${C.t("pdp.sizeGuide")}</a></div>
        <div class="opts" id="sizeOpts">${p.sizes.map(s => `<button data-size="${s}">${s}</button>`).join("")}</div>
        <p id="sizeErr" style="color:var(--alert);font-size:12px;margin-top:8px;display:none">${C.t("pdp.selectSize")}</p>
      </div>` : ""}

      <div class="buybox__add"><button class="btn btn--full btn--lg" id="addBtn">${C.t("pdp.addToBag")}</button></div>
      <button class="btn btn--wish" id="wishBtn" type="button" data-wishbtn="${p.handle}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span data-wishlbl>${C.t("pdp.addWish")}</span></button>

      <div class="buybox__details">
        <p class="buybox__desc">${pc ? pc.desc : p.blurb}</p>
        <ul class="buybox__bullets">
          ${(pc && pc.features ? pc.features : [`${p.fabric || "Performance"} fabric, four-way stretch, second-skin hold`, "Sculpting fit, fully opaque", `Designed for ${(p.activities || ["everyday movement"]).join(" · ")}`]).map(f => `<li>${f}</li>`).join("")}
        </ul>
      </div>
      <p class="buybox__ship">${C.t("pdp.ship")}</p>
      ${(() => {
        const r = (C.shipEstimateRange && C.shipEstimateRange()) || "";
        return r ? `<p class="buybox__arrives"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>${C.t("pdp.arrives", { range: `<strong>${r}</strong>` })}</span></p>` : "";
      })()}
    </div>`;

  /* ---- gallery interactions ---- */
  const galImg = $("#galImg"), galMain = $("#galMain");
  let mainImgSeq = 0;   // guards against an out-of-order decode landing after a newer swatch/thumb tap
  // set the main image only when it actually changes - so the async Studio reconcile,
  // which resolves to the SAME photo #1 the card handed us, causes no repaint/flicker.
  function setMainImg(url) {
    if (!url) return;
    let abs = url; try { abs = new URL(url, location.href).href; } catch (e) {}
    // apply the per-photo focal even when the src is unchanged (a live reconcile may have only
    // changed the framing), then swap the src if it actually differs.
    if (galImg.getAttribute("src") === url || galImg.src === abs) { C.applyPhotoFocal(galImg, focalFor(url)); return; }
    // Decode the new photo BEFORE swapping so the current image holds until the new one can paint
    // (no blank/pop). Focal is applied in the SAME frame as the src swap. Only the latest request
    // wins, so a slow decode from an earlier tap can never overwrite a newer selection.
    const want = url, seq = ++mainImgSeq;
    const swap = () => {
      if (seq !== mainImgSeq) return;
      galImg.src = want;
      C.applyPhotoFocal(galImg, focalFor(want));
    };
    const pre = new Image();
    if (pre.decode) { pre.src = want; pre.decode().then(swap, swap); }
    else { pre.onload = swap; pre.onerror = swap; pre.src = want; }
  }
  function bindThumbs() {
    $$("#thumbs button").forEach(b => b.addEventListener("click", () => {
      $$("#thumbs button").forEach(x => x.classList.remove("on")); b.classList.add("on");
      setMainImg(gallery[+b.dataset.i]);   // decode-then-swap (graceful), same as every other main-image change
    }));
  }
  function renderGallery() {
    const gEl = $("#gallery"); if (gEl) gEl.classList.toggle("gallery--single", gallery.length < 2);
    $("#thumbs").innerHTML = gallery.map((g, i) => `<button class="${i === 0 ? "on" : ""}" data-i="${i}" aria-label="View image ${i + 1}"><img src="${g}" alt="${p.title} view ${i + 1}" loading="lazy" decoding="async"${C.focalAttrs(focalFor(g))}></button>`).join("");
    setMainImg(gallery[0]);
    bindThumbs();
  }
  bindThumbs();   // initial thumbs are already in the template
  // Warm the cache: idle-preload photo #1 of every OTHER colourway so the first swatch tap
  // swaps instantly from cache. Detached Image objects only - no DOM, no resolver change.
  (function preloadOtherColours() {
    const warm = () => {
      colors.forEach((c) => {
        if (c === p.color) return;
        const first = galleryFor(c)[0];
        if (!first) return;
        const im = new Image(); im.decoding = "async"; im.src = first;
      });
    };
    if ("requestIdleCallback" in window) requestIdleCallback(warm); else setTimeout(warm, 1200);
  })();
  galMain.addEventListener("click", () => galMain.classList.toggle("zoom"));
  // zoom toward the cursor (transform-origin follows the pointer while zoomed)
  galMain.addEventListener("mousemove", (e) => {
    if (!galMain.classList.contains("zoom")) return;
    const r = galMain.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    galImg.style.transformOrigin = `${x}% ${y}%`;
  });
  galMain.addEventListener("mouseleave", () => { galImg.style.transformOrigin = ""; });   // "" -> fall back to the owner focal (--szo) for a zoomed photo

  /* ---- color / length / size selectors ---- */
  $$("#colorOpts i").forEach(el => {
    const pick = () => {
      $$("#colorOpts i").forEach(x => x.classList.remove("on")); el.classList.add("on");
      const c = el.dataset.color;
      $("#colorName").textContent = c;
      gallery = galleryFor(c);           // swap the gallery to the selected colourway
      renderGallery();
      const sbImg = $("#sbImg"); if (sbImg) sbImg.src = gallery[0];   // keep sticky bar thumb in sync
      syncAvailability();                // a size can be sold out in one colour but not another
    };
    el.addEventListener("click", pick);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
  });
  // open on a specific colourway when asked (e.g. arriving from a colour-filtered collection card)
  (() => {
    const want = params.get("color");
    if (!want) return;
    const sw = $$("#colorOpts i").find(el => el.dataset.color === want);
    if (sw && !sw.classList.contains("on")) sw.click();
  })();
  $$("#lengthOpts button").forEach(b => b.addEventListener("click", () => { $$("#lengthOpts button").forEach(x => x.classList.remove("on")); b.classList.add("on"); }));
  $$("#sizeOpts button").forEach(b => b.addEventListener("click", () => {
    $$("#sizeOpts button").forEach(x => x.classList.remove("on")); b.classList.add("on");
    selectedSize = b.dataset.size; $("#sizeErr").style.display = "none";
    const sb = $("#sbSize"); if (sb) sb.value = selectedSize;
  }));
  /* ---- size guide modal (professional, on-brand, applies to every product) ---- */
  const FIG_WOMEN = `<img class="sg-svg" src="img/brand/sg-figure-women.png" alt="" loading="lazy">`;
  const FIG_MEN = `<img class="sg-svg" src="img/brand/sg-figure-men.png" alt="" loading="lazy">`;
  const SG = {
    women: {
      sizes: ["S", "M", "L", "XL"],
      rows: [
        ["AU / UK", ["6", "8", "10", "12"]],
        ["US", ["2", "4", "6", "8"]],
        ["EU", ["34", "36", "38", "40"]],
        [C.t("sg.bust"), ["81–86", "86–91", "91–96", "96–101"]],
        [C.t("sg.waist"), ["63–68", "68–73", "73–78", "78–83"]],
        [C.t("sg.hips"), ["89–94", "94–99", "99–104", "104–109"]]
      ],
      measure: [["sg.bust", "sg.bustDesc"], ["sg.waist", "sg.waistDesc"], ["sg.hips", "sg.hipsDesc"]],
      fig: FIG_WOMEN
    },
    men: {
      sizes: ["S", "M", "L", "XL"],
      rows: [
        ["AU / UK", ["S", "M", "L", "XL"]],
        [C.t("sg.chest"), ["82–97", "97–102", "102–107", "107–112"]],
        [C.t("sg.waist"), ["77–82", "82–87", "87–92", "92–97"]],
        [C.t("sg.hips"), ["92–97", "97–102", "102–107", "107–112"]]
      ],
      measure: [["sg.chest", "sg.chestDesc"], ["sg.waist", "sg.waistDesc"], ["sg.hips", "sg.hipsDesc"]],
      fig: FIG_MEN
    }
  };
  const sgBlockHTML = (key) => {
    const d = SG[key];
    return `<section class="sg-block">
      <h3 class="sg-block__title">${C.t(key === "women" ? "sg.women" : "sg.men")}</h3>
      <div class="sg-block__grid">
        <div class="sg-tablewrap"><table class="sizeguide__table">
          <thead><tr><th>${C.t("pdp.size")}</th>${d.sizes.map(s => `<th>${s}</th>`).join("")}</tr></thead>
          <tbody>${d.rows.map(r => `<tr><td class="sg-rowlabel">${r[0]}</td>${r[1].map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        <div class="sg-measure">
          <h4 class="sg-measure__h">${C.t("sg.howToMeasure")}</h4>
          <div class="sg-measure__row">
            <div class="sg-figure">${d.fig}</div>
            <ul class="sg-measure__list">
              ${d.measure.map(([lbl, desc]) => `<li><strong>${C.t(lbl)}</strong><span>${C.t(desc)}</span></li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    </section>`;
  };
  function buildSizeGuide() {
    if ($("#sizeGuideModal")) return $("#sizeGuideModal");
    const el = document.createElement("div");
    el.className = "sizeguide"; el.id = "sizeGuideModal"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="sizeguide__overlay" data-sg-close></div>
      <div class="sizeguide__box" role="dialog" aria-modal="true" aria-labelledby="sgTitle">
        <button class="sizeguide__close" type="button" data-sg-close aria-label="Close size guide">&times;</button>
        <div class="sg-head">
          <img class="sg-logo" src="img/brand/cloudskin-logo-white.png" alt="CLOUDSKIN">
          <h2 class="sizeguide__title" id="sgTitle">${C.t("sg.title")}</h2>
          <p class="sizeguide__intro">${C.t("sg.intro")}</p>
        </div>
        ${sgBlockHTML("women")}
        ${sgBlockHTML("men")}
        <div class="sg-foot">
          <div class="sg-foot__col">
            <h4>${C.t("sg.fitTitle")}</h4>
            <p>${C.t("sg.fitCopy")}</p>
          </div>
          <div class="sg-foot__col">
            <h4>${C.t("sg.unsureTitle")}</h4>
            <p>${C.t("sg.unsureCopy")}</p>
            <a class="sg-foot__mail" href="mailto:support@cloudskin.com">support@cloudskin.com</a>
            <p class="sg-foot__help">${C.t("sg.unsureHelp")}</p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", e => { if (e.target.closest("[data-sg-close]")) closeSizeGuide(); });
    return el;
  }
  function openSizeGuide() {
    const el = buildSizeGuide();
    requestAnimationFrame(() => el.classList.add("on"));
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".sizeguide__close", el)?.focus();
  }
  function closeSizeGuide() {
    const el = $("#sizeGuideModal"); if (!el) return;
    el.classList.remove("on"); el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSizeGuide(); });
  // Prefer the canonical shared guide in shell.js (C.openSizeGuide); local copy is a fallback.
  $("#sizeGuide")?.addEventListener("click", e => { e.preventDefault(); (C.openSizeGuide || openSizeGuide)(); });

  function addToBag() {
    const needsSize = !!(p.sizes && p.sizes.length);
    const errEl = $("#sizeErr");
    if (needsSize && !selectedSize) { if (errEl) { errEl.textContent = C.t("pdp.selectSize"); errEl.style.display = "block"; } return; }
    const selColor = (document.querySelector("#colorOpts i.on")?.dataset.color) || p.color;
    // never let a sold-out size into the bag (would dead-end at Shopify checkout)
    if (selectedSize && C.shopify && C.shopify.available(p.handle, selColor, selectedSize) === false) {
      if (errEl) { errEl.textContent = C.t("pdp.sizeSoldOut"); errEl.style.display = "block"; }
      syncAvailability();
      return;
    }
    C.cart.add(p.handle, selectedSize || "", selColor);
  }
  $("#addBtn").addEventListener("click", addToBag);
  // Add to Wishlist (below Add to Bag) - toggles saved state; renderWish() keeps label/fill in sync
  const wishBtn = $("#wishBtn");
  if (wishBtn) {
    const syncWish = () => { const on = C.wishlist.has(p.handle); wishBtn.classList.toggle("on", on); const l = wishBtn.querySelector("[data-wishlbl]"); if (l) l.textContent = on ? C.t("pdp.inWish") : C.t("pdp.addWish"); };
    wishBtn.addEventListener("click", () => { C.wishlist.toggle(p.handle); syncWish(); });
    syncWish();
  }

  /* ---- accordions ---- */
  const acc = [
    [C.t("acc.fabricCare"), pc
      ? `<p><strong>${pc.fabric}.</strong> Built for movement, designed for everyday life.</p><ul class="acc__list">${CARE.map(x => `<li>${x}</li>`).join("")}</ul>`
      : "Nylon/elastane performance blend. Machine wash cold with like colours, hang dry. Do not bleach, tumble dry or iron."],
    [C.t("acc.fit"), pc
      ? `<p><strong>Fit: ${pc.fit[0]}.</strong> ${pc.fit[1]} True to size; between sizes, size up for an easy line or stay true for support.</p>`
      : "True to size with a sculpting, second-skin hold. Between sizes? Size up for an easy line, stay true for support."],
    [C.t("acc.shipping"), "Complimentary worldwide shipping. Free 30-day returns on all unworn items with tags."]
  ];
  // all detail tiles start CLOSED - the customer opens what they want
  $("#acc").innerHTML = acc.map((a) => `
    <div class="acc__item">
      <button class="acc__btn" aria-expanded="false">${a[0]}<span>+</span></button>
      <div class="acc__panel"><div>${a[1]}</div></div>
    </div>`).join("");
  const accItems = $$(".acc__item");
  accItems.forEach(item => $(".acc__btn", item).addEventListener("click", () => {
    const willOpen = !item.classList.contains("open");
    // accordion: only one panel open at a time
    accItems.forEach(other => {
      if (other !== item && other.classList.contains("open")) {
        other.classList.remove("open");
        $(".acc__btn", other).setAttribute("aria-expanded", "false");
      }
    });
    item.classList.toggle("open", willOpen);
    $(".acc__btn", item).setAttribute("aria-expanded", willOpen);
  }));

  /* reviews module removed - product pages no longer show reviews */

  /* ---- Complete the Look: pair tops with skirts, and skirts with tops ---- */
  // exclude the current product AND any hidden item (e.g. the €1 checkout-test product)
  const others = P().filter(x => x.handle !== p.handle && (C.isShopVisible ? C.isShopVisible(x) : true));
  // colour + product-line matches rank a coordinating piece highest (e.g. a white skirt leads with the white top)
  const lineKey = t => (t || "").trim().split(/\s+/)[0].toLowerCase();
  const setScore = x => (x.color === p.color ? 2 : 0) + (lineKey(x.title) === lineKey(p.title) ? 3 : 0);
  const UPPER = ["Tops", "Bras", "Layers"];            // everything worn up top
  const isSkirt = x => x.category === "Skirts";
  const isUpper = x => UPPER.includes(x.category);
  const sameGender = x => !p.gender || !x.gender || x.gender === p.gender;
  // a skirt suggests tops (upper-body); a top/bra/layer suggests skirts - same gender preferred
  let ctl = isSkirt(p) ? others.filter(x => isUpper(x) && sameGender(x))
          : isUpper(p) ? others.filter(x => isSkirt(x) && sameGender(x))
          : [];
  ctl = ctl.sort((a, b) => setScore(b) - setScore(a)).slice(0, 3);
  // fallback so the section is never empty (e.g. a dress, or a men's top with no men's skirt): coordinating, same gender
  if (!ctl.length) ctl = others.filter(x => x.category !== p.category && sameGender(x)).sort((a, b) => setScore(b) - setScore(a)).slice(0, 3);
  const fill = (id, list) => {
    const el = $(id); if (!el) return;
    // Idempotent: only rebuild when the resolved product set actually changes. product.js applies
    // the owner's Studio overrides on load AND again ~400ms later, so a stable "Complete the Look"
    // (same handles) was being re-filled 2-3 times, each innerHTML rewrite destroying the revealed
    // cards and recreating fresh opacity:0 nodes - restarting the fade and, on any observer miss,
    // leaving them hidden (the live "flash then disappear"). Skipping a no-op re-fill keeps the
    // already-revealed cards in place; a genuine change still rebuilds once (caught by the shared
    // reveal MutationObserver in shell.js).
    const sig = list.map(x => x.handle).join("|");
    if (el.dataset.fillSig === sig) return;
    el.dataset.fillSig = sig;
    // Each card must show the owner's Studio photo, not the catalogue default. This rail can render
    // before content.js's global photo merge runs, so seed _studioImgs from the baked snapshot onto
    // each product here (idempotent: skips any product already merged) so cardHTML/baseImageFor use it.
    const _snap = window.CLOUDSKIN_CONTENT_SNAPSHOT;
    if (_snap) list.forEach(pr => {
      if (!pr || !pr.handle || pr._studioImgs) return;
      const fk = "product." + pr.handle + ".images", cp = fk + ".";
      let imgs = null;
      Object.keys(_snap).forEach(k => {
        let slug;
        if (k === fk) slug = ""; else if (k.indexOf(cp) === 0) slug = k.slice(cp.length); else return;
        const parsed = C.parseStudioCell(_snap[k]);
        if (parsed.urls.length) { (imgs || (imgs = {}))[slug] = parsed.urls; C.mergeStudioFocal(pr, parsed.focal); }
      });
      if (imgs) pr._studioImgs = imgs;
    });
    el.innerHTML = list.map((x, i) => C.cardHTML(x, i)).join("");
    // Belt-and-suspenders visibility guarantee: reveal the freshly inserted cards directly, without
    // depending on the shared IntersectionObserver firing for them. A re-fill creates fresh opacity:0
    // .pcard nodes; if the observer misses them the cards stay hidden (the live "flash then disappear").
    // Adding the reveal class on the next frame reveals them deterministically (the 0.7s fade is
    // preserved), and the idempotency guard above means this only runs on a genuine change, so no flicker.
    requestAnimationFrame(() => el.querySelectorAll(".pcard, .reveal, .reveal-img").forEach(n => n.classList.add("in")));
  };
  fill("#railCtl", ctl.length ? ctl : others.slice(0, 3));

  /* ---- sticky add-to-bag bar ---- */
  const sb = $("#stickybar");
  $("#sbImg").src = gallery[0] || p.images[0]; $("#sbTitle").textContent = p.title;
  $("#sbPrice").textContent = money(p.price, true);
  const hasSizes = !!(p.sizes && p.sizes.length);
  // placeholder "Size" is shown initially but disabled+hidden so only real sizes are selectable
  $("#sbSize").innerHTML = `<option value="" disabled selected hidden>${C.t("pdp.size")}</option>` + (p.sizes || []).map(s => `<option>${s}</option>`).join("");
  $("#sbSize").style.display = hasSizes ? "" : "none";   // never show an empty size dropdown
  $("#sbSize").addEventListener("change", e => {
    selectedSize = e.target.value || null;
    $$("#sizeOpts button").forEach(x => x.classList.toggle("on", x.dataset.size === selectedSize));
  });
  $("#sbAdd").addEventListener("click", addToBag);
  const addBtn = $("#addBtn");
  const io = new IntersectionObserver(es => es.forEach(en => sb.classList.toggle("on", !en.isIntersecting && en.boundingClientRect.top < 0)), { threshold: 0 });
  io.observe(addBtn);

  /* ---- live stock gating: disable sold-out sizes for the selected colour ----
     Runs once Shopify data is ready and again whenever the colour changes.
     Fail-open: if Shopify data isn't loaded, every size stays enabled. */
  function currentColor() {
    return (document.querySelector("#colorOpts i.on")?.dataset.color) || p.color;
  }
  function syncAvailability() {
    if (!(C.shopify && C.shopify.loaded)) return;
    const color = currentColor();
    let clearedSelection = false;
    $$("#sizeOpts button").forEach(b => {
      const oos = C.shopify.available(p.handle, color, b.dataset.size) === false;
      b.disabled = oos;                                   // css strikes through + blocks clicks
      b.setAttribute("aria-disabled", oos ? "true" : "false");
      b.title = oos ? C.t("pdp.sizeSoldOut") : "";
      if (oos && b.classList.contains("on")) { b.classList.remove("on"); clearedSelection = true; }
    });
    // sticky-bar size dropdown: grey out sold-out options
    const sbSel = $("#sbSize");
    if (sbSel) $$("option", sbSel).forEach(o => {
      if (o.value) o.disabled = C.shopify.available(p.handle, color, o.value) === false;
    });
    // if the selected size just went out of stock for this colour, drop the selection
    if (clearedSelection || (selectedSize && C.shopify.available(p.handle, color, selectedSize) === false)) {
      selectedSize = null;
      if (sbSel) sbSel.value = "";
    }
    // keep SEO availability + price honest (Shopify is the source of truth)
    try {
      const ld = $("#ld-product");
      if (ld) {
        const obj = JSON.parse(ld.textContent);
        obj.offers.availability = C.shopify.anyAvailable(p.handle)
          ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
        const sp = C.shopify.price(p.handle); if (sp != null) obj.offers.price = sp;
        ld.textContent = JSON.stringify(obj);
      }
    } catch (e) {}
  }
  syncAvailability();                                       // Shopify data may already be loaded
  document.addEventListener("cloudskin:shopify-ready", syncAvailability);

  /* ---- owner text overrides (CLOUDSKIN Content Studio) ----------------------
     PURELY ADDITIVE. The page has already rendered its built-in copy above.
     Here we fetch any owner edits saved in the Studio and, for each field the
     owner has actually changed, swap that one piece of text in place. With no
     saved edits this loop touches nothing, so the storefront is unchanged. If a
     saved value is blank or Supabase is unreachable, the built-in copy stays.
     The Studio keys are: product.<handle>.desc / .features / .fabric /
     .fit.type / .fit.copy  and the shared  pdp.care / pdp.fit.trailing /
     pdp.shipping / pdp.shipline. */
  (() => {
    const cfg = window.CLOUDSKIN_SB || {};
    const h = p.handle;
    const nz = (v) => (v != null && String(v).trim() !== "") ? String(v) : null;   // non-blank or null
    const toLines = (v) => String(v).split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    function applyOverrides(map) {
      const g = (k) => nz(map[k]);
      // 1. description
      const d = g("product." + h + ".desc");
      if (d) { const el = $(".buybox__desc"); if (el) el.textContent = d; }
      // 2. feature bullets. Two writer shapes are reconciled: the Studio writes the WHOLE list as
      //    product.<h>.features (one bullet per line); the Creator tags each <li> and writes a
      //    per-bullet product.<h>.features.<i> (0-based). Base = whole-list override if present, else
      //    the bullets currently in the DOM; then overlay any per-bullet overrides that fall within
      //    the base length. Only rewrite the list when at least one override exists, so a product
      //    with no feature edits is left exactly as rendered.
      const fRaw = g("product." + h + ".features");
      const featPrefix = "product." + h + ".features.";        // literal prefix (no RegExp built from the handle)
      const perBullet = {};
      Object.keys(map).forEach((k) => {
        if (k.indexOf(featPrefix) !== 0) return;
        const idx = k.slice(featPrefix.length);
        if (!/^\d+$/.test(idx)) return;                        // accept features.0 / .1 / .2 ..., ignore features.<other>
        const v = nz(map[k]);
        if (v != null) perBullet[Number(idx)] = v;
      });
      if (fRaw || Object.keys(perBullet).length) {
        const ul = $(".buybox__bullets");
        if (ul) {
          const base = fRaw ? toLines(fRaw) : $$("li", ul).map((li) => li.textContent.trim());
          const merged = base.map((b, i) => (perBullet[i] != null ? perBullet[i] : b));
          ul.innerHTML = merged.map((f) => `<li>${escH(f)}</li>`).join("");
        }
      }
      // accordion content panels, in render order: [0] Fabric & Care, [1] Fit, [2] Shipping & Returns
      const panels = $$(".acc__item .acc__panel > div");
      // 3. Fabric & Care. Precedence: the Creator tags the whole panel and writes
      //    product.<h>.acc.0; that whole-panel edit WINS over the Studio's structured
      //    fabric + shared care rebuild. If acc.0 is absent, keep the structured rebuild.
      const acc0 = g("product." + h + ".acc.0");
      const fab = g("product." + h + ".fabric"), careRaw = g("pdp.care");
      if (acc0 && panels[0]) {
        panels[0].innerHTML = `<p>${escH(acc0).replace(/\n/g, "<br>")}</p>`;
      } else if ((fab || careRaw) && panels[0] && pc) {
        const fabric = fab || pc.fabric;
        const care = careRaw ? toLines(careRaw) : CARE;
        panels[0].innerHTML = `<p><strong>${escH(fabric)}.</strong> Built for movement, designed for everyday life.</p><ul class="acc__list">${care.map(x => `<li>${escH(x)}</li>`).join("")}</ul>`;
      }
      // 4. Fit. Same precedence: the Creator's whole-panel edit product.<h>.acc.1 WINS over the
      //    Studio's structured fit.type + fit.copy + shared trailing-note rebuild.
      const acc1 = g("product." + h + ".acc.1");
      const ft = g("product." + h + ".fit.type"), fc = g("product." + h + ".fit.copy"), ftr = g("pdp.fit.trailing");
      if (acc1 && panels[1]) {
        panels[1].innerHTML = `<p>${escH(acc1).replace(/\n/g, "<br>")}</p>`;
      } else if ((ft || fc || ftr) && panels[1] && pc) {
        const type = ft || pc.fit[0], copy = fc || pc.fit[1];
        const trail = ftr || "True to size; between sizes, size up for an easy line or stay true for support.";
        panels[1].innerHTML = `<p><strong>Fit: ${escH(type)}.</strong> ${escH(copy)} ${escH(trail)}</p>`;
      }
      // 5. Shipping & Returns  (shared)
      const shp = g("pdp.shipping");
      if (shp && panels[2]) panels[2].innerHTML = escH(shp);
      // 6. shipping line under the Add to Bag button (shared)
      const sl = g("pdp.shipline");
      if (sl) { const el = $(".buybox__ship"); if (el) el.textContent = sl; }
      // 6b. Complete the Look: owner-picked products win over the automatic pairing.
      //     Stored as product.<handle>.completeLook (newline/comma list of handles).
      //     Empty or unresolved -> leave the auto-paired rail rendered above untouched.
      const clRaw = g("product." + h + ".completeLook");
      if (clRaw) {
        const wanted = clRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        const chosen = [];
        wanted.forEach(hh => {
          const px = P().find(x => x.handle === hh && x.handle !== h && (C.isShopVisible ? C.isShopVisible(x) : true));
          if (px && chosen.indexOf(px) < 0) chosen.push(px);
        });
        if (chosen.length) fill("#railCtl", chosen.slice(0, 4));
      }
      // 7. product photos uploaded in the Content Studio -> become the gallery.
      //    Per colour: product.<handle>.images.<colourSlug>. Flat product.<handle>.images
      //    is kept as a fallback for products saved before per-colour photos existed.
      const flatKey = "product." + h + ".images";
      const colourPrefix = flatKey + ".";
      const colourMap = {};
      studioFocal = {};   // rebuild framing from the authoritative live values (drop any stale focal)
      Object.keys(map).forEach((k) => {
        if (k.indexOf(colourPrefix) !== 0) return;
        const slug = k.slice(colourPrefix.length);
        const parsed = C.parseStudioCell(map[k]);
        if (slug && parsed.urls.length) { colourMap[slug] = parsed.urls; addFocal(parsed.focal); }
      });
      studioColourImages = colourMap;
      const imgsRaw = g(flatKey);
      if (imgsRaw) {
        const parsed = C.parseStudioCell(imgsRaw);
        if (parsed.urls.length) { studioImages = parsed.urls; addFocal(parsed.focal); }
      }
      // Reconcile the gallery with the owner's Studio photos now they've loaded. This ALWAYS
      // runs (not only when owner photos exist) so a product opened via a card - where first
      // paint was collapsed to the single continuity image - is expanded back to its full set
      // of catalogue thumbs. renderGallery keeps the main image untouched when photo #1 is
      // unchanged (setMainImg guard), so opening on the tapped photo never flashes.
      gallery = galleryFor(currentColor());
      renderGallery();
      const sbImg = $("#sbImg"); if (sbImg) sbImg.src = gallery[0];
    }

    // First-paint snapshot: apply the owner's saved text overrides (and reconcile the gallery to
    // her Studio photos) SYNCHRONOUSLY now, so her edited copy shows on the first frame with no
    // network wait. Runs even with no backend configured. The live fetch below reconciles any
    // post-deploy edit; applyOverrides is idempotent, so an unchanged re-apply repaints nothing
    // visible (setMainImg guards the main image, renderGallery replaces thumbs in place).
    const snap = window.CLOUDSKIN_CONTENT_SNAPSHOT;
    if (snap) applyOverrides(snap);
    if (!window.supabase || !cfg.url || !cfg.anonKey) return;   // no backend → keep snapshot / built-in copy
    const sb = window.CLOUDSKIN_SB_CLIENT || window.supabase.createClient(cfg.url, cfg.anonKey);
    sb.from("cloudskin_content").select("key,value").then((res) => {
      if (res.error || !res.data) return;
      const map = {}; res.data.forEach(r => { map[r.key] = r.value; });
      applyOverrides(map);
      setTimeout(() => applyOverrides(map), 400);   // re-apply once in case anything re-rendered late
    }, () => {});   // network error → keep built-in copy, no console noise
  })();

  C.observeReveals();
})();
