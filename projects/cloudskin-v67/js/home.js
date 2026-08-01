/* ============================================================
   CLOUDSKIN, homepage controller
   Hero carousel, cloud parallax/drift, product rails, newsletter.
   ============================================================ */
(() => {
  "use strict";
  const C = window.CLOUDSKIN;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // shopper-visible catalog only (excludes the €1 checkout-test product and any hidden item)
  const products = () => (window.CLOUDSKIN_PRODUCTS || []).filter(p => C.isShopVisible ? C.isShopVisible(p) : true);

  /* ---- owner display order ----
     Tag each product's static (curate) position once; an owner "order" override
     (p._orderOverride, applied by content.js) wins, else products keep curate order.
     Self-contained so the rail renders correctly even if content.js never loads. */
  (window.CLOUDSKIN_PRODUCTS || []).forEach((p, i) => { if (p && p._baseOrder == null) p._baseOrder = i; });
  const effOrder = p => (p && p._orderOverride != null) ? p._orderOverride : 1000 + ((p && p._baseOrder) || 0);
  const inOrder = () => products().slice().sort((a, b) => effOrder(a) - effOrder(b));
  /* Trending rail (#railNew): every product is Trending by default (the full-catalog rail the
     site always showed); the owner curates by REMOVING pieces (product.<h>.trending === false).
     So the rail always matches the merch panel's Trending toggle - no product shows here with
     its toggle reading off. */
  const trendingList = () => inOrder().filter(p => CLOUDSKIN.isTrending ? CLOUDSKIN.isTrending(p) : (p && p.trending !== false));

  /* ---- product rails ---- */
  function fillRail(id, list, instant) {
    const el = $(id); if (!el) return;
    // HOME rail: ONE card per product, showing every real colourway as a swatch. Desktop hovers a swatch
    // (not the photo) to preview a colour; mobile taps a swatch to switch. (The COLLECTION grid keeps the
    // one-card-per-colour split - phones there see both colours with zero taps. Here the switchable card
    // is what Mike wants.) cardHTML(p,i) with single=false renders the full swatch set; shell.js keeps
    // data-color in sync on every switch so add-to-bag always resolves the exact shown real variant.
    el.innerHTML = list.map((p, i) => C.cardHTML(p, i)).join("");
    // on a live re-render the reveal animation already played once - show cards at once
    if (instant) $$(".pcard", el).forEach(c => c.classList.add("in"));
  }
  function renderRails(instant) { fillRail("#railNew", trendingList(), instant); }   // Trending - owner-curated, full catalog until curated

  /* ---- held first paint (no flash) ----
     Same reasoning as the collection grid: paint the rail ONCE with the final,
     override-applied catalog instead of painting curate defaults now and re-painting
     (photo swap / reshuffle) when content.js's overrides land. Hold until
     `cloudskin:content-ready`, or a short fail-open timeout if Supabase is slow/down. */
  let railPainted = false, railFromData = false, railHold = 0;
  function fadeInRail() {
    const el = $("#railNew"); if (!el) return;
    // add .in on the next frames so the cards fade in cleanly, independent of the
    // IntersectionObserver reveal (which never fires in the in-app preview pane).
    requestAnimationFrame(() => requestAnimationFrame(() => $$(".pcard", el).forEach(c => c.classList.add("in"))));
  }
  function firstPaintRails(fromData) {
    if (railPainted) return;
    railPainted = true;
    railFromData = !!fromData;
    clearTimeout(railHold);
    renderRails(false);   // insert cards without the "instant" flag...
    fadeInRail();          // ...then fade them in once
    if (C.initRailCarousels) C.initRailCarousels();
  }
  railHold = setTimeout(() => firstPaintRails(false), 1200);   // fail-open ceiling: paint curate defaults if Supabase is slow/down
  if (window.CLOUDSKIN && CLOUDSKIN.contentReady) firstPaintRails(true);
  else document.addEventListener("cloudskin:content-ready", () => firstPaintRails(true));

  C.observeReveals();

  /* ---- products-updated (owner overrides): settle the rail once before the first paint; after
         the first paint, re-render ONLY if that paint already reflected real data (genuine Studio
         edit). A late Supabase response that arrives after the fail-open default paint is NOT
         re-applied, so the rail never reshuffles. ---- */
  document.addEventListener("cloudskin:products-updated", () => {
    if (!railPainted) { firstPaintRails(true); return; }
    if (!railFromData) return;
    renderRails(true);
    if (C.initRailCarousels) C.initRailCarousels();   // keep the carousel arrows in sync with the new cards
  });

  /* ---- hero framing is FIXED in CSS (main.css: .hero__media img { object-position }) ----
     A previous "adaptive framing" routine recomputed object-position on the image `load` event.
     Because natural dimensions are not known until the image decodes, its value could only be set
     AFTER first paint, so on every refresh the hero visibly JUMPED from the CSS default to the
     computed value (and the value swung widely with viewport). It also fought the Creator Studio
     focal puck by overwriting the owner's saved home.hero.image.pos. The hero must be correct on
     the FIRST painted frame and never move, so framing is now a deterministic CSS default that the
     owner fine-tunes with the focal puck (persisted as home.hero.image.pos, applied by content.js).
     No JS touches the hero object-position. */

  /* ---- drag-to-scroll product rails (mouse/trackpad; phones swipe natively) ----
     Drag mode (and the pointer capture that retargets the click) starts ONLY after
     the pointer moves past a threshold - so a plain click on a card is never
     swallowed and always navigates to the product page. */
  $$(".prail").forEach(rail => {
    let down = false, dragging = false, startX = 0, startScroll = 0, moved = 0, pid = null;
    const THRESH = 8;
    rail.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch" || rail.scrollWidth <= rail.clientWidth + 4) return;
      down = true; dragging = false; moved = 0; startX = e.clientX; startScroll = rail.scrollLeft; pid = e.pointerId;
    });
    rail.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
      if (!dragging && moved > THRESH) { dragging = true; rail.classList.add("dragging"); rail.setPointerCapture?.(pid); }
      if (dragging) rail.scrollLeft = startScroll - dx;
    });
    const end = () => { if (!down) return; down = false; if (dragging) rail.classList.remove("dragging"); dragging = false; };
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("click", e => { if (moved > THRESH) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---- Instagram masonry: staggered blur/scale/fade reveal, once on scroll-in ---- */
  const igm = $("#igMasonry");
  if (igm) {
    if (reduce) { igm.classList.add("in"); }
    else {
      const io = new IntersectionObserver((es, obs) => es.forEach(e => {
        if (e.isIntersecting) { igm.classList.add("in"); obs.disconnect(); }
      }), { rootMargin: "0px 0px -180px 0px", threshold: 0.04 });
      io.observe(igm);
    }
  }

  /* ---- hero carousel (only when there is more than one slide) ---- */
  const slides = $$(".hero__slide"), dots = $$("#heroDots button");
  if (slides.length > 1) {
    let idx = 0, heroTimer;
    const go = n => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("on", i === idx));
      dots.forEach((d, i) => { d.classList.toggle("on", i === idx); if (i === idx) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    };
    const restart = () => { if (reduce) return; clearInterval(heroTimer); heroTimer = setInterval(() => go(idx + 1), 5500); };
    dots.forEach(d => d.addEventListener("click", () => { go(+d.dataset.go); restart(); }));
    restart();
    // WCAG 2.2.2, pause auto-advance on hover/focus
    const heroEl = $(".hero");
    if (heroEl && !reduce) {
      heroEl.addEventListener("mouseenter", () => clearInterval(heroTimer));
      heroEl.addEventListener("mouseleave", restart);
      heroEl.addEventListener("focusin", () => clearInterval(heroTimer));
      heroEl.addEventListener("focusout", restart);
    }
  }

  /* ---- cloud parallax + mouse drift ---- */
  const clouds = $(".hero__clouds");
  const pxEls = $$("[data-parallax]");
  const heroMedia = $(".hero__media");
  // mobile/touch perf: skip per-scroll-frame transforms entirely (hero image + clouds stay static on phones)
  const noParallax = matchMedia("(max-width: 820px)").matches || matchMedia("(pointer: coarse)").matches;
  if (!reduce && !noParallax) {
    let driftX = 0, targetX = 0, tick = false, running = false;
    addEventListener("mousemove", e => { targetX = (e.clientX / innerWidth - 0.5) * 22; if (!running && scrollY < innerHeight) { running = true; frame(); } }, { passive: true });
    function frame() {
      driftX += (targetX - driftX) * 0.05;
      if (clouds && scrollY < innerHeight) clouds.style.transform = `translate3d(${driftX.toFixed(1)}px, ${(Math.min(scrollY, innerHeight) * 0.28).toFixed(1)}px, 0)`;
      // idle out once past the hero, and when drift has settled, lets the page reach a paint-stable state
      if (scrollY < innerHeight && Math.abs(targetX - driftX) > 0.2) requestAnimationFrame(frame);
      else running = false;
    }
    running = true; frame();
    function onScroll() {
      const vh = innerHeight;
      // Hero parallax: the PHOTO drifts a little on scroll (wordmark / sub / buttons stay put). The media
      // box is over-scanned in CSS (.hero__media inset: -90px 0), and the drift is CAPPED to 72px < that
      // over-scan, so the moving photo can NEVER expose the dark hero backdrop at an edge (Mike: keep the
      // parallax, kill the black). Other sections keep their [data-parallax] drift below.
      const y = scrollY;
      if (heroMedia && y < vh * 1.3) {
        heroMedia.style.transform = `translate3d(0, ${Math.min(y * 0.12, 72).toFixed(1)}px, 0)`;
      }
      pxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const prog = (r.top + r.height / 2 - vh / 2) / vh;
        const sp = parseFloat(el.dataset.parallax) || 0.08;
        el.style.transform = `translate3d(0, ${(-prog * sp * 200).toFixed(1)}px, 0) scale(1.08)`;
      });
      tick = false;
    }
    addEventListener("scroll", () => {
      if (!tick) { requestAnimationFrame(onScroll); tick = true; }
      if (!running && scrollY < innerHeight) { running = true; frame(); }
    }, { passive: true });
    onScroll();
  }

  /* ---- testimonials rotation (pausable per WCAG 2.2.2) ---- */
  const quotes = $$("#quotesTrack .quote");
  if (quotes.length > 1 && !reduce) {
    let q = 0, qTimer;
    const adv = () => { quotes[q].classList.remove("on"); q = (q + 1) % quotes.length; quotes[q].classList.add("on"); };
    const startQ = () => { qTimer = setInterval(adv, 3600); };
    const stopQ = () => clearInterval(qTimer);
    startQ();
    const qEl = $(".quotes");
    qEl?.addEventListener("mouseenter", stopQ); qEl?.addEventListener("mouseleave", startQ);
    qEl?.addEventListener("focusin", stopQ); qEl?.addEventListener("focusout", startQ);
  }

  /* ---- newsletter ---- */
  const form = $("#nlForm"), ok = $("#nlOk"), email = $("#nlEmail");
  form?.addEventListener("submit", e => {
    e.preventDefault();
    if (!email.checkValidity()) { email.reportValidity(); return; }
    if (C.newsletter) C.newsletter.subscribe(email.value.trim(), "home").catch(() => {});
    form.style.display = "none"; ok.hidden = false;
    ok.setAttribute("tabindex", "-1"); ok.focus();   // move focus to the confirmation for AT
  });
})();
