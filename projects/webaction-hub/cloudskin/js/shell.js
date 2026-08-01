/* ============================================================
   CLOUDSKIN, shared shell
   Renders announcement bar, sticky header + mega-menu, mobile
   menu, cart drawer, footer, toast on every page. Exposes
   CLOUDSKIN.cart / .wishlist / .toast for page controllers.
   ============================================================ */
(() => {
  "use strict";
  // bfcache self-heal, DESKTOP ONLY: a browser restored from back-forward cache serves a frozen
  // snapshot of the page (stale catalogue photos instead of fresh uploads). On iOS Safari, calling
  // location.reload() from inside a bfcache pageshow handler is a known WebKit trap: the reload can
  // silently stall/hang, leaving the visitor staring at a blank white page (no header, stuck loading
  // bar) for seconds with no recovery - confirmed on-device via screen recording 2026-07-31, worse
  // than the veil bug this was meant to avoid. Skip it entirely on touch: content.js's own live-fetch
  // reconciliation (fires on every page load) already catches up any stale Studio-edited photos
  // within moments, no full reload required. Desktop keeps the reload (finePointer, no WebKit trap).
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
  }

  // Mobile viewport stability: lock a pixel viewport-height (--app-h) that updates ONLY
  // on a real width / orientation change, so full-height sections (the hero) never resize
  // as the mobile browser chrome shows/hides on scroll (the moving "shade"). svh is the
  // pre-JS CSS fallback; desktop (fine pointer) is left untouched so height stays fully
  // responsive there. Matches the house mobile-viewport doctrine.
  if (matchMedia("(hover: none)").matches || matchMedia("(pointer: coarse)").matches) {
    let lastVW = 0;
    const setAppH = () => { if (innerWidth === lastVW) return; lastVW = innerWidth; document.documentElement.style.setProperty("--app-h", innerHeight + "px"); };
    setAppH();
    addEventListener("resize", setAppH, { passive: true });
    addEventListener("orientationchange", () => { lastVW = 0; setAppH(); });
  }

  const C = window.CLOUDSKIN;
  const P = () => window.CLOUDSKIN_PRODUCTS || [];
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = C.money;
  const byHandle = h => P().find(p => p.handle === h);

  /* ---------------- markup ---------------- */
  const iconSearch = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`;
  const iconUser = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
  const iconBag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;
  const iconHeart = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

  function megaMarkup() {
    // mobileOnly items (e.g. Our Story) are shown in the burger menu only, not the desktop top nav
    return C.nav.filter(cat => !cat.mobileOnly).map(cat => {
      if (!cat.columns || !cat.columns.length) {
        const cls = cat.accent ? "nav__item nav__item--accent" : "nav__item";
        return `<li class="${cls}"><a class="nav__link" href="${cat.href || `collection.html?c=${cat.slug}`}">${cat.label}</a></li>`;
      }
      const cols = cat.columns.map(col => `
        <div class="mega__col${col.separate ? " mega__col--sep" : ""}">
          <h4>${col.head}</h4>
          ${col.links.map(([t, href]) =>
            `<a href="${href}">${col.swatches ? `<i style="background:${C.hexFor(t)}"></i>` : ""}${t}</a>`).join("")}
        </div>`).join("");
      // owner-overridable feature poster: image, caption + link target read from the
      // Content Studio (js/content.js) after render; falls back to the config defaults.
      const fkey = `nav.${cat.slug}.feature`;
      const feat = cat.feature ? `
        <div class="mega__feature"><a href="${cat.feature.href}" data-content-link="${fkey}.link">
          <img src="${cat.feature.img}" alt="${cat.feature.caption}" loading="lazy" data-content-img="${fkey}.image">
          <span data-content="${fkey}.caption">${cat.feature.caption}</span></a></div>` : "";
      return `
        <li class="nav__item">
          <a class="nav__link" href="collection.html?c=${cat.slug}">${cat.label}</a>
          <div class="mega" role="region" aria-label="${cat.label} menu">
            <div class="mega__cols">${cols}</div>${feat}
          </div>
        </li>`;
    }).join("");
  }

  function mmenuMarkup() {
    return C.nav.map(cat => {
      if (!cat.columns || !cat.columns.length)
        return `<div class="mmenu__cat"><button onclick="location.href='${cat.href || `collection.html?c=${cat.slug}`}'">${cat.label}<span style="visibility:hidden">+</span></button></div>`;
      const links = (cat.mobileLinks || cat.columns.flatMap(col => col.links)).map(([t, href]) => `<a href="${href}">${t}</a>`).join("");
      return `<div class="mmenu__cat"><button data-mtoggle>${cat.label}<span>+</span></button><div class="mmenu__sub">${links}</div></div>`;
    }).join("");
  }

  function footerMarkup() {
    const footLink = (l) => {
      const [label, target] = Array.isArray(l) ? l : [l, "#"];
      if (typeof target === "string" && target.startsWith("legal:"))
        return `<a href="#" data-legal="${target.slice(6)}">${label}</a>`;
      if (target === "cart") return `<a href="#" data-open-cart>${label}</a>`;
      return `<a href="${target || "#"}">${label}</a>`;
    };
    const cols = C.footer.columns.map((col, ci) => `
      <nav class="footer__col" aria-label="${col.head}">
        <h3 data-content="footer.col${ci + 1}.head">${col.head}</h3>
        ${col.links.map(footLink).join("")}
      </nav>`).join("");
    const nl = C.footer.newsletter ? `
      <form class="footer__nl" id="footerNl" novalidate>
        <h3 data-content="footer.nl.head">${C.footer.newsletter.head}</h3>
        <p class="footer__nl-copy" data-content="footer.nl.copy">${C.footer.newsletter.copy}</p>
        <div class="footer__nl-row">
          <label class="visually-hidden" for="footerNlEmail">Email Address</label>
          <input type="email" id="footerNlEmail" placeholder="Email Address" autocomplete="email" required>
          <button type="submit" aria-label="Sign up"><span aria-hidden="true">&rarr;</span></button>
        </div>
        <p class="footer__nl-ok" id="footerNlOk" role="status" hidden>Welcome to the house &#9729;</p>
      </form>` : "";
    const socials = C.footer.socials.map(([name, href]) => {
      const paths = {
        Instagram: `<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>`,
        TikTok: `<path d="M16.5 3c.4 2.1 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v6.6a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.1a3 3 0 1 0 2 2.8V3h3z" fill="currentColor" stroke="none"/>`,
        Facebook: `<path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" fill="currentColor" stroke="none"/>`
      };
      return `<a href="${href}" target="_blank" rel="noopener" aria-label="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${paths[name] || ""}</svg></a>`;
    }).join("");
    return `
      <div class="footer__bgs" aria-hidden="true"><span class="footer__bg footer__bg--a"></span><span class="footer__bg footer__bg--b"></span></div>
      <div class="footer__grid">
        <div class="footer__brand">
          <p class="logo">CLOUDSKIN<sup>®</sup></p>
          <p class="footer__tag" data-content="footer.tag">${C.t("foot.tag")}</p>
          ${nl}
          <div class="footer__social">${socials}</div>
          <a class="footer__ig" href="https://www.instagram.com/cloudskin.active" target="_blank" rel="noopener">@cloudskin.active</a>
          <a class="footer__mail" href="mailto:info@cloudskin.com">info@cloudskin.com</a>
        </div>
        ${cols}
      </div>
      <div class="footer__legal">
        <span>© ${C.t("foot.rights")}</span>
        <div class="footer__legal-links"><a href="#" data-legal="terms">${C.t("foot.termsShort")}</a><a href="#" data-legal="privacy">${C.t("foot.privacyShort")}</a><a href="#" data-legal="cookies">${C.t("foot.cookiePolicy")}</a><a href="#" data-cookie-prefs>${C.t("foot.cookiePrefs")}</a></div>
        <div class="footer__region"><button class="footer__lang" type="button" data-open-i18n aria-label="${C.t("switch.language")}" style="background:none;border:0;color:inherit;cursor:pointer;font:inherit;padding:0;text-decoration:underline;text-underline-offset:3px">${((C.LANGS || []).find(l => l.code === C.lang) || {}).native || "English"} · ${C.currency}</button><a class="footer__totop" href="#top">${C.t("foot.toTop")}</a></div>
      </div>`;
  }

  function render() {
    const header = $("#site-header");
    if (header) {
      header.innerHTML = `
        <div class="announce" role="region" aria-label="Announcements"><div class="announce__track">
          ${C.announcements.map((m, i) => `<p class="${i === 0 ? "on" : ""}">${m}</p>`).join("")}
        </div></div>
        <header class="header" id="header"><nav class="nav" aria-label="Primary">
          <div class="nav__left">
            <button class="burger" id="burger" aria-label="${C.t("a11y.openMenu")}" aria-expanded="false"><span></span><span></span></button>
            <ul class="nav__left-links">${megaMarkup()}</ul>
          </div>
          <a class="logo" href="home.html">CLOUDSKIN<sup>®</sup></a>
          <div class="nav__right">
            <div class="nav__icons">
              <button id="searchBtn" aria-label="${C.t("a11y.search")}">${iconSearch}</button>
              <button class="wishbtn" id="wishBtnHeader" aria-label="${C.t("wish.title")}">${iconHeart}<span class="wishbtn__c" data-wishcount>0</span></button>
              <a href="login.html" aria-label="${C.t("a11y.account")}">${iconUser}</a>
              <button class="bag" id="bagBtn" aria-label="${C.t("a11y.openBag")}">${iconBag}<span class="bag__count" id="bagCount" aria-live="polite">0</span></button>
            </div>
          </div>
        </nav></header>
        <div class="mmenu" id="mmenu" aria-hidden="true">
          ${mmenuMarkup()}
          <button type="button" class="mmenu__account mmenu__wish" data-open-wish><span>${C.t("wish.title")}<span class="mmenu__wishc" data-wishcount>0</span></span><span aria-hidden="true">&rarr;</span></button>
          <a class="mmenu__account" href="login.html"><span>${C.t("mmenu.account")}</span><span aria-hidden="true">&rarr;</span></a>
          <p class="mmenu__foot">${C.t("mmenu.foot")}</p>
        </div>`;
    }
    const footer = $("#site-footer");
    if (footer) { footer.classList.add("footer"); footer.innerHTML = footerMarkup(); }

    // cart drawer + toast (appended once)
    if (!$("#cartDrawer")) {
      const d = document.createElement("div");
      d.innerHTML = `
        <div class="scrim" id="scrim" hidden></div>
        <aside class="drawer" id="cartDrawer" aria-label="Shopping bag" aria-hidden="true">
          <header class="drawer__head"><h2>${C.t("cart.title")}</h2><button class="drawer__close" id="drawerClose" aria-label="Close">✕</button></header>
          <div class="drawer__body" id="drawerBody"></div>
          <footer class="drawer__foot">
            <div class="freebar" id="drawerFreeBar" hidden>
              <div class="freebar__row">
                <span class="freebar__label" id="drawerFreeHint"></span>
                <span class="freebar__check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg></span>
              </div>
              <div class="freebar__track"><span class="freebar__fill" id="drawerFreeFill"></span></div>
            </div>
            <div class="drawer__line"><span>${C.t("cart.subtotal")}</span><strong id="drawerTotal">${money(0)}</strong></div>
            <div class="drawer__line drawer__line--muted"><span>${C.t("cart.shipping")}</span><span id="drawerShip">${C.t("cart.shipCalc")}</span></div>
            <button class="btn btn--full" id="checkoutBtn">${C.t("cart.checkout")}</button>
            <p class="drawer__duties">${C.t("cart.duties")}</p>
          </footer>
        </aside>
        <aside class="drawer drawer--wish" id="wishDrawer" aria-label="${C.t("wish.title")}" aria-hidden="true">
          <header class="drawer__head"><h2>${C.t("wish.title")}<span id="wishHeadCount"></span></h2><button class="drawer__close" id="wishClose" aria-label="Close">✕</button></header>
          <div class="drawer__body" id="wishBody"></div>
        </aside>
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
        <div class="search" id="searchOverlay" aria-hidden="true">
          <div class="search__scrim" data-search-close></div>
          <div class="search__panel" role="dialog" aria-modal="true" aria-label="${C.t("search.title")}">
            <div class="search__bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input type="search" id="searchInput" placeholder="${C.t("search.placeholder")}" autocomplete="off" aria-label="${C.t("search.placeholder")}">
              <button class="search__close" data-search-close aria-label="Close">✕</button>
            </div>
            <div class="search__results" id="searchResults"></div>
          </div>
        </div>
        <div class="addbag" id="addBag" aria-hidden="true">
          <div class="addbag__scrim" data-addbag-close></div>
          <div class="addbag__panel" role="dialog" aria-modal="true" aria-label="${C.t("bag.added")}">
            <div class="addbag__head">
              <span class="addbag__eyebrow"><svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>${C.t("bag.added")}</span>
              <button class="addbag__close" data-addbag-close aria-label="Close">✕</button>
            </div>
            <div class="addbag__item" id="addBagItem"></div>
            <div class="addbag__sub"><span>${C.t("bag.subtotal")} <em id="addBagCount"></em></span><strong id="addBagTotal"></strong></div>
            <div class="addbag__actions">
              <button class="btn addbag__view" id="addBagView">${C.t("bag.viewBag")}</button>
              <button class="btn btn--full" id="addBagCheckout">${C.t("cart.checkout")}</button>
            </div>
            <div class="addbag__pairs" id="addBagPairs" hidden>
              <h4 class="addbag__pairsh">${C.t("bag.pairs")}</h4>
              <div class="addbag__pairsrow" id="addBagPairsRow"></div>
            </div>
          </div>
        </div>
        <div class="infomodal" id="infoModal" aria-hidden="true">
          <div class="infomodal__overlay" data-info-close></div>
          <div class="infomodal__box" role="dialog" aria-modal="true" aria-labelledby="infoTitle">
            <button class="infomodal__close" data-info-close aria-label="Close">&times;</button>
            <h2 class="infomodal__title" id="infoTitle"></h2>
            <div class="infomodal__body" id="infoBody"></div>
          </div>
        </div>
        <div class="cconsent" id="cookieConsent" role="dialog" aria-label="${C.t("cookie.title")}" aria-describedby="cookieConsentText" hidden>
          <div class="cconsent__inner">
            <p class="cconsent__text" id="cookieConsentText">${C.t("cookie.msg")} <a href="#" data-legal="cookies">${C.t("cookie.policyLink")}</a></p>
            <div class="cconsent__actions">
              <button type="button" class="cconsent__btn cconsent__btn--ghost" data-cc="prefs">${C.t("cookie.prefs")}</button>
              <button type="button" class="cconsent__btn cconsent__btn--ghost" data-cc="reject">${C.t("cookie.reject")}</button>
              <button type="button" class="cconsent__btn cconsent__btn--solid" data-cc="accept">${C.t("cookie.accept")}</button>
            </div>
          </div>
        </div>
        <div class="cprefs" id="cookiePrefs" aria-hidden="true">
          <div class="cprefs__overlay" data-cprefs-close></div>
          <div class="cprefs__box" role="dialog" aria-modal="true" aria-labelledby="cprefsTitle">
            <button class="cprefs__close" data-cprefs-close aria-label="Close">&times;</button>
            <h2 class="cprefs__title" id="cprefsTitle">${C.t("cookie.title")}</h2>
            <p class="cprefs__intro">${C.t("cookie.intro")} <a href="#" data-legal="cookies">${C.t("cookie.policyLink")}</a></p>
            <div class="cprefs__row">
              <div class="cprefs__meta"><strong>${C.t("cookie.essential")}</strong><span>${C.t("cookie.essentialDesc")}</span></div>
              <span class="cprefs__always">${C.t("cookie.always")}</span>
            </div>
            <label class="cprefs__row cprefs__row--toggle">
              <div class="cprefs__meta"><strong>${C.t("cookie.prefsCat")}</strong><span>${C.t("cookie.prefsCatDesc")}</span></div>
              <span class="cprefs__switch"><input type="checkbox" data-cc-cat="preferences"><span class="cprefs__track" aria-hidden="true"></span></span>
            </label>
            <label class="cprefs__row cprefs__row--toggle">
              <div class="cprefs__meta"><strong>${C.t("cookie.analytics")}</strong><span>${C.t("cookie.analyticsDesc")}</span></div>
              <span class="cprefs__switch"><input type="checkbox" data-cc-cat="analytics"><span class="cprefs__track" aria-hidden="true"></span></span>
            </label>
            <div class="cprefs__actions">
              <button type="button" class="cconsent__btn cconsent__btn--ghost" data-cc="reject">${C.t("cookie.reject")}</button>
              <button type="button" class="cconsent__btn cconsent__btn--solid" data-cc="save">${C.t("cookie.save")}</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(d);
    }
  }

  /* ---------------- interactions ---------------- */
  let toastTimer;
  C.toast = (html) => {
    const t = $("#toast"); if (!t) return;
    t.innerHTML = html; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2600);
  };

  /* cart API */
  const CART_KEY = "cloudskin_cart", WISH_KEY = "cloudskin_wish";
  let cart = load(CART_KEY), wish = load(WISH_KEY);
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } }
  function save() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); localStorage.setItem(WISH_KEY, JSON.stringify(wish)); }

  C.cart = {
    add(handle, size, color, qty = 1) {
      color = color || "";
      // never add a sold-out variant - it would dead-end at Shopify checkout
      if (size && C.shopify && C.shopify.available(handle, color, size) === false) {
        if (C.toast) C.toast(C.t("pdp.sizeSoldOut"));
        return;
      }
      const key = handle + "|" + color + "|" + (size || "");
      const found = cart.find(i => i.key === key);
      if (found) found.qty += qty; else cart.push({ key, handle, size: size || "", color, qty });
      save(); renderCart(); bump();
      showAdded(handle, size, color);
    },
    remove(handle, size, color) {
      const key = handle + "|" + (color || "") + "|" + (size || "");
      cart = cart.filter(i => i.key !== key);
      save(); renderCart(); bump();
    },
    has(handle, size, color) {
      const key = handle + "|" + (color || "") + "|" + (size || "");
      return cart.some(i => i.key === key);
    },
    open: openDrawer, count: () => cart.reduce((s, i) => s + i.qty, 0)
  };
  C.wishlist = {
    toggle(handle) {
      const i = wish.indexOf(handle);
      if (i >= 0) wish.splice(i, 1); else wish.push(handle);
      save(); renderWish(); return wish.includes(handle);
    },
    remove(handle) { const i = wish.indexOf(handle); if (i >= 0) { wish.splice(i, 1); save(); renderWish(); } },
    has: h => wish.includes(h),
    list: () => wish.slice(),
    count: () => wish.length,
    open: () => openWish()
  };

  function bump() { const b = $("#bagCount"); if (!b) return; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }

  function renderCart() {
    const body = $("#drawerBody"), total = $("#drawerTotal"), count = $("#bagCount");
    if (count) count.textContent = C.cart.count();
    // keep every card's "cloud" quick-add in sync with the bag (filled = in bag)
    $$("[data-cloudadd]").forEach(btn => {
      const h = btn.dataset.cloudadd;
      btn.classList.toggle("added", cart.some(i => i.handle === h));
    });
    if (!body) return;
    const subEur = cart.reduce((s, it) => { const p = byHandle(it.handle); return s + (p ? p.price * it.qty : 0); }, 0);
    if (!cart.length) { body.innerHTML = `<p class="drawer__empty">${C.t("cart.empty")}</p>`; total.textContent = money(0); }
    else {
      body.innerHTML = cart.map(it => {
        const p = byHandle(it.handle); if (!p) return "";
        return `<div class="ditem" data-key="${it.key}">
          <img src="${C.baseImageFor(p, it.color)}" alt="${p.title}">
          <div class="ditem__info"><h4>${p.title}</h4><p>${it.color || p.color}${it.size ? " · " + C.t("pdp.size") + " " + it.size : ""}</p>
            <div class="ditem__row"><span class="qty"><button data-dec aria-label="Decrease">−</button><span>${it.qty}</span><button data-inc aria-label="Increase">+</button></span>
            <span class="ditem__price">${money(p.price * it.qty)}</span></div></div></div>`;
      }).join("");
      total.textContent = money(subEur);
    }
    updateShipping(subEur);
  }

  /* free-shipping threshold in the EUR base: the single EUR 200 figure the announcement
     bar shows, so the cart qualifies at exactly that amount.
     Under it: "calculated at checkout"; at/above: complimentary. */
  function freeship() { return C.freeShipEur ? C.freeShipEur() : (C.FREESHIP || 200); }
  function updateShipping(subEur) {
    const ship = $("#drawerShip"), bar = $("#drawerFreeBar"), label = $("#drawerFreeHint"), fill = $("#drawerFreeFill");
    const thr = freeship();
    const free = subEur >= thr;
    if (ship) { ship.textContent = free ? C.t("cart.shipFree") : C.t("cart.shipCalc"); ship.classList.toggle("is-free", free); }
    if (bar) {
      if (!cart.length) { bar.hidden = true; return; }
      bar.hidden = false;
      const pct = thr > 0 ? Math.max(0, Math.min(1, subEur / thr)) : 1;
      if (fill) fill.style.width = (pct * 100).toFixed(1) + "%";
      bar.classList.toggle("is-free", free);
      if (label) label.textContent = free ? C.t("cart.freeYes") : C.t("cart.freeHint", { amount: money(thr - subEur) });
    }
  }
  C.shipInfo = (subEur) => ({ free: subEur >= freeship(), remaining: Math.max(0, freeship() - subEur) });

  function openDrawer() { const s = $("#scrim"), d = $("#cartDrawer"); s.hidden = false; requestAnimationFrame(() => { s.classList.add("on"); d.classList.add("on"); }); d.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closeDrawer() { const s = $("#scrim"), d = $("#cartDrawer"); s.classList.remove("on"); d.classList.remove("on"); d.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; setTimeout(() => s.hidden = true, 400); }

  /* ---- "Pairs great with" recommender (shared): a skirt suggests tops, a top suggests
     skirts, else a coordinating piece - same gender + colour/line preferred ---- */
  C.pairsWith = (handle, n = 3, colour) => {
    const p = byHandle(handle); if (!p) return [];
    // Pair against the colour the shopper actually chose (falls back to the
    // product's default), so a black skirt suggests pieces available in black.
    const col = colour || p.color;
    const others = P().filter(x => x.handle !== handle && (C.isShopVisible ? C.isShopVisible(x) : true));
    const lineKey = t => (t || "").trim().split(/\s+/)[0].toLowerCase();
    const score = x => ((x.colors || [x.color]).includes(col) ? 2 : 0) + (lineKey(x.title) === lineKey(p.title) ? 3 : 0);
    const UPPER = ["Tops", "Bras", "Layers", "Lounge"];
    const sameG = x => !p.gender || !x.gender || x.gender === p.gender;
    const isSkirt = x => x.category === "Skirts";
    const isUpper = x => UPPER.includes(x.category);
    let list = isSkirt(p) ? others.filter(x => isUpper(x) && sameG(x))
             : isUpper(p) ? others.filter(x => isSkirt(x) && sameG(x)) : [];
    list = list.sort((a, b) => score(b) - score(a)).slice(0, n);
    if (!list.length) list = others.filter(x => x.category !== p.category && sameG(x)).sort((a, b) => score(b) - score(a)).slice(0, n);
    if (!list.length) list = others.slice(0, n);
    return list;
  };

  /* ---- "Added to Bag" confirmation popup (mini-cart): product + order subtotal +
     View Bag / Checkout + "Pairs great with" row ---- */
  function showAdded(handle, size, color) {
    const wrap = $("#addBag"); if (!wrap) { return; }
    const p = byHandle(handle);
    const item = $("#addBagItem");
    if (p && item) item.innerHTML = `
      <img src="${C.baseImageFor(p, color)}" alt="${p.title}">
      <div class="addbag__iteminfo"><h4>${p.title}</h4><p>${color || p.color}${size ? " · " + C.t("pdp.size") + " " + size : ""}</p></div>`;
    const subEur = cart.reduce((s, it) => { const q = byHandle(it.handle); return s + (q ? q.price * it.qty : 0); }, 0);
    const cnt = C.cart.count();
    const cEl = $("#addBagCount"); if (cEl) cEl.textContent = "(" + cnt + ")";
    const tEl = $("#addBagTotal"); if (tEl) tEl.textContent = money(subEur);
    // pairs great with
    const pairs = C.pairsWith(handle, 3, color || (p && p.color));
    const row = $("#addBagPairsRow"), pairsBox = $("#addBagPairs");
    if (row && pairsBox) {
      if (pairs.length) {
        // show each suggestion in the colourway that matches the added item when
        // that piece comes in it (studio-first resolver), else its own default
        const wantCol = color || (p && p.color);
        row.innerHTML = pairs.map(x => {
          const pcol = wantCol && (x.colors || [x.color]).includes(wantCol) ? wantCol : x.color;
          const pu = C.baseImageFor(x, pcol);
          return `<a class="pairitem" href="${C.pdpHref(x)}">
          <span class="pairitem__img"><img src="${pu}" alt="${x.title}" loading="lazy"${C.focalAttrs(C.studioFocalFor(x, pu))}></span>
          <span class="pairitem__t">${x.title}</span>
          <span class="pairitem__p">${money(x.price)}</span></a>`;
        }).join("");
        pairsBox.hidden = false;
      } else pairsBox.hidden = true;
    }
    openAdded();
  }
  function openAdded() {
    const w = $("#addBag"); if (!w) return;
    // never stack over the full cart drawer
    if ($("#cartDrawer")?.classList.contains("on")) return;
    // anchor the panel just below the (sticky) header, robust at any scroll position
    const hdr = $("#header"), panel = $(".addbag__panel", w);
    if (hdr && panel) panel.style.top = Math.max(8, hdr.getBoundingClientRect().bottom + 8) + "px";
    w.classList.add("on"); w.setAttribute("aria-hidden", "false");
  }
  function closeAdded() { const w = $("#addBag"); if (!w) return; w.classList.remove("on"); w.setAttribute("aria-hidden", "true"); }

  /* ---- Wishlist drawer ---- */
  function renderWish() {
    const b = $("#wishBody"); const hc = $("#wishHeadCount"); const badges = $$("[data-wishcount]");
    const n = C.wishlist.count();
    badges.forEach(el => { el.textContent = n; el.classList.toggle("on", n > 0); });
    if (hc) hc.textContent = n ? " (" + n + ")" : "";
    // sync PDP wishlist button if present
    $$("[data-wishbtn]").forEach(btn => { const on = C.wishlist.has(btn.dataset.wishbtn); btn.classList.toggle("on", on); const lbl = btn.querySelector("[data-wishlbl]"); if (lbl) lbl.textContent = on ? C.t("pdp.inWish") : C.t("pdp.addWish"); });
    if (!b) return;
    const list = C.wishlist.list().map(byHandle).filter(Boolean);
    if (!list.length) { b.innerHTML = `<p class="drawer__empty">${C.t("wish.empty")}</p>`; return; }
    b.innerHTML = list.map(p => `<div class="ditem" data-wishkey="${p.handle}">
      <a href="${C.pdpHref(p)}"><img src="${C.baseImageFor(p)}" alt="${p.title}"></a>
      <div class="ditem__info"><h4><a href="${C.pdpHref(p)}">${p.title}</a></h4><p>${p.color}</p>
        <div class="ditem__row"><button class="wish__add" data-wishadd="${p.handle}" aria-label="${C.t("pdp.addToBag")}: ${p.title}" title="${C.t("pdp.addToBag")}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg></button>
        <span class="ditem__price">${money(p.price)}</span></div></div>
      <button class="ditem__rm" data-wishrm="${p.handle}" aria-label="Remove">✕</button></div>`).join("");
  }
  function openWish() { const s = $("#scrim"), d = $("#wishDrawer"); if (!d) return; renderWish(); s.hidden = false; requestAnimationFrame(() => { s.classList.add("on"); d.classList.add("on"); }); d.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closeWish() { const s = $("#scrim"), d = $("#wishDrawer"); if (!d) return; s.classList.remove("on"); d.classList.remove("on"); d.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; setTimeout(() => s.hidden = true, 400); }

  /* ---- product search overlay ---- */
  function openSearch() {
    const o = $("#searchOverlay"); if (!o) return;
    o.classList.add("on"); o.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
    const inp = $("#searchInput"); if (inp) { runSearch(inp.value || ""); setTimeout(() => inp.focus(), 60); }
  }
  function closeSearch() { const o = $("#searchOverlay"); if (!o) return; o.classList.remove("on"); o.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  function runSearch(qRaw) {
    const res = $("#searchResults"); if (!res) return;
    const q = (qRaw || "").trim().toLowerCase();
    if (!q) { res.innerHTML = ""; res.classList.remove("has"); return; }
    const terms = q.split(/\s+/);
    const hay = p => [p.title, p.color, p.category, p.gender, p.fabric, p.blurb, (p.activities || []).join(" "), (p.colors || []).join(" ")].join(" ").toLowerCase();
    const matches = P().filter(p => (C.isShopVisible ? C.isShopVisible(p) : true) && terms.every(t => hay(p).includes(t))).slice(0, 8);
    if (!matches.length) { res.innerHTML = `<p class="search__none">${C.t("search.none")}</p>`; res.classList.add("has"); return; }
    res.innerHTML = matches.map(p => `<a class="sresult" href="${C.pdpHref(p)}">
      <span class="sresult__img"><img src="${C.baseImageFor(p)}" alt="${p.title}" loading="lazy"></span>
      <span class="sresult__body"><span class="sresult__t">${p.title}</span><span class="sresult__meta">${p.category || ""}${p.color ? " · " + p.color : ""}</span></span>
      <span class="sresult__p">${money(p.price)}</span></a>`).join("");
    res.classList.add("has");
  }
  C.openSearch = openSearch;

  /* ---- info / legal modal (Returns, Privacy, Terms, FAQ, Shipping, Size Guide, Contact) ---- */
  function showInfo(title, html) {
    const modal = $("#infoModal"); if (!modal) return;
    $("#infoTitle").textContent = title;
    $("#infoBody").innerHTML = html;
    modal.classList.add("on"); modal.setAttribute("aria-hidden", "false");
    const box = $(".infomodal__box", modal); if (box) box.scrollTop = 0;
    document.body.style.overflow = "hidden";
    $(".infomodal__close", modal)?.focus();
  }
  function openInfo(key) { const data = (C.legal || {})[key]; if (data) showInfo(data.title, data.html); }

  // Contact form (rendered inside the Contact info modal) → emails info@cloudskin.com
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("#csContactForm");
    if (!form) return;
    e.preventDefault();
    const msg = form.querySelector("#csContactMsg");
    const btn = form.querySelector('button[type="submit"]');
    const show = (t, ok) => { if (msg) { msg.hidden = false; msg.textContent = t; msg.style.color = ok ? "#2c5c3f" : "#8a2f22"; } };
    const data = { name: form.name.value.trim(), email: form.email.value.trim(), message: form.message.value.trim(), company: form.company.value };
    if (form.dataset.purpose) data.message = `[${form.dataset.purpose}]\n` + data.message;
    if (!data.email || !data.message) { show("Please add your email and a message.", false); return; }
    if (!(C.auth && C.auth.contact)) { show("Messaging isn't available right now. Please email info@cloudskin.com.", false); return; }
    if (btn) { btn.disabled = true; btn.classList.add("is-busy"); }
    const r = await C.auth.contact(data);
    if (btn) { btn.disabled = false; btn.classList.remove("is-busy"); }
    if (r.ok) { form.reset(); show("Thanks, your message has been sent. We'll be in touch soon.", true); }
    else { show("Sorry, we couldn't send that just now. Please email info@cloudskin.com directly.", false); }
  });

  /* ---- checkout → order confirmation (adapts the order-confirmation email copy;
     live transactional emails require the store's payment/email backend) ---- */
  async function checkout() {
    if (!cart.length) return;
    // Unified branded checkout (/checkout): Stripe card + Apple Pay + Google Pay and
    // PayPal all live there as siblings (no PayPal in the bag). That page re-prices
    // server-side and owns the full fallback chain (embedded Payment Element -> hosted
    // Stripe redirect -> Shopify hosted checkout), so the bag button just takes the
    // shopper there. On the rare chance navigation is blocked, degrade honestly.
    try { window.location.href = "/checkout"; }
    catch (err) { console.warn("[CloudSkin] could not open /checkout.", err); fallbackConfirm(); }
  }

  /* Honest failure: the Storefront API / checkout was unreachable, OR the cart
     contained items Shopify wouldn't accept. NEVER fabricate an order and NEVER
     clear the bag - tell the customer and let them retry / contact support. */
  function fallbackConfirm() {
    if (!cart.length) return;
    showInfo(C.t("checkout.unavailableTitle"), `
      <p>${C.t("checkout.unavailableBody")}</p>
      <p>${C.t("checkout.unavailableHelp", { email: '<a href="mailto:support@cloudskin.com">support@cloudskin.com</a>' })}</p>`);
  }

  /* persist the placed order to Supabase for the owner dashboard (no-op until
     configured). Goes through the place_order() SECURITY DEFINER RPC - one
     trusted transaction, no direct table writes, never blocks the confirmation. */
  async function recordOrder(items) {
    if (!C.sb || !items.length) return;
    try {
      const user = (C.auth && C.auth.user && C.auth.user()) || null;
      const payload = items.map(it => { const p = byHandle(it.handle); return { handle: it.handle, title: p ? p.title : it.handle, color: p ? p.color : null, size: it.size || null, price_eur: p ? p.price : 0, qty: it.qty }; });
      await C.sb.rpc("place_order", { p_email: user ? user.email : null, p_currency: C.currency || "EUR", p_items: payload });
    } catch (e) { /* never block the confirmation UI */ }
  }
  function closeInfo() {
    const modal = $("#infoModal"); if (!modal) return;
    modal.classList.remove("on"); modal.setAttribute("aria-hidden", "true");
    // Keep the scroll lock if a modal is still open beneath this one (the cookie
    // preferences panel links to this cookies policy), so closing the policy does
    // not unlock the page behind the still-open prefs overlay.
    document.body.style.overflow = $("#cookiePrefs")?.classList.contains("on") ? "hidden" : "";
  }
  C.openInfo = openInfo;

  /* ---- GDPR cookie consent (headless storefront needs its own; Shopify's banner
     only covers the hosted checkout). Model: essential cookies are always on (bag,
     sign-in, security, language); Preferences + Analytics are OFF until the visitor
     opts in. No non-essential / tracking script may run unless C.consent.allows(cat)
     is true; today none exist, so this is the honest gate for anything added later.
     Consent is stored locally and can be changed any time via the footer link. ---- */
  const CONSENT_KEY = "cloudskin_consent", CONSENT_V = 1;
  function readConsent() {
    try { const r = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); return (r && r.v === CONSENT_V) ? r : null; }
    catch (e) { return null; }
  }
  function writeConsent(prefs) {
    const rec = { v: CONSENT_V, essential: true, preferences: !!prefs.preferences, analytics: !!prefs.analytics, ts: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(rec)); } catch (e) {}
    hideConsentBanner();
    try { window.dispatchEvent(new CustomEvent("cloudskin:consent", { detail: rec })); } catch (e) {}
    return rec;
  }
  C.consent = {
    get: readConsent,
    save: writeConsent,
    allows: (cat) => cat === "essential" ? true : !!(readConsent() || {})[cat]
  };

  /* ---- Analytics is cookieless (Vercel Web Analytics) but still gated behind the
     "analytics" consent category so the consent UI is honest: nothing is measured
     until the visitor opts in. The static HTML no longer hardcodes the script; it is
     injected here at most once (window flag), only when consent allows analytics, and
     again on the consent event if the visitor turns analytics on later. ---- */
  function loadAnalytics() {
    if (window.__csAnalyticsLoaded) return;
    if (!C.consent.allows("analytics")) return;
    window.__csAnalyticsLoaded = true;
    const s = document.createElement("script");
    s.defer = true; s.src = "/_vercel/insights/script.js";
    document.head.appendChild(s);
  }
  window.addEventListener("cloudskin:consent", loadAnalytics);

  // Show the banner at most once per browsing session: after it has appeared, a
  // session flag suppresses it on later page loads so it never nags across the site.
  // It still stays until the visitor chooses; a recorded choice (localStorage) hides
  // it for good, and a brand-new session shows it again only if no choice was made.
  function bannerSeenThisSession() { try { return sessionStorage.getItem("cs_consent_seen") === "1"; } catch (e) { return false; } }
  function showConsentBanner() {
    const b = $("#cookieConsent"); if (!b) return;
    try { sessionStorage.setItem("cs_consent_seen", "1"); } catch (e) {}
    b.hidden = false;
    // A short timer, not requestAnimationFrame: rAF is throttled/deferred when the
    // page loads in a background tab (and inside the in-app preview pane), which would
    // leave the consent banner stuck off-screen. A timeout always fires, and the slide
    // still animates because .hidden was cleared a tick earlier.
    setTimeout(() => b.classList.add("on"), 20);
  }
  function hideConsentBanner() {
    const b = $("#cookieConsent"); if (!b) return;
    b.classList.remove("on");
    setTimeout(() => { if (!b.classList.contains("on")) b.hidden = true; }, reduce ? 0 : 320);
  }
  function openCookiePrefs() {
    const m = $("#cookiePrefs"); if (!m) return;
    const cur = readConsent() || { preferences: false, analytics: false };
    $$("[data-cc-cat]", m).forEach(cb => { cb.checked = !!cur[cb.dataset.ccCat]; });
    m.classList.add("on"); m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".cprefs__close", m)?.focus();
  }
  function closeCookiePrefs() {
    // No-op unless the panel is actually open, so callers that fire it defensively
    // (banner "Reject", the shared ESC handler) never release a scroll lock that a
    // different overlay, e.g. the cart drawer, is still holding.
    const m = $("#cookiePrefs"); if (!m || !m.classList.contains("on")) return;
    m.classList.remove("on"); m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function savePrefsFromModal() {
    const m = $("#cookiePrefs");
    const prefs = {};
    $$("[data-cc-cat]", m).forEach(cb => { prefs[cb.dataset.ccCat] = cb.checked; });
    writeConsent(prefs);
    closeCookiePrefs();
  }
  C.openCookiePrefs = openCookiePrefs;

  /* ---- size guide modal (shared, professional; used by the PDP button AND the footer
     "Size Guide" link so the exact same guide appears everywhere) ---- */
  const SG_FIG_WOMEN = `<img class="sg-svg" src="img/brand/sg-figure-women.png" alt="" loading="lazy">`;
  const SG_FIG_MEN = `<img class="sg-svg" src="img/brand/sg-figure-men.png" alt="" loading="lazy">`;
  const SG_DATA = {
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
      fig: SG_FIG_WOMEN
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
      fig: SG_FIG_MEN
    }
  };
  const sgBlockHTML = (key) => {
    const d = SG_DATA[key];
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
  C.openSizeGuide = openSizeGuide;

  function wire() {
    // announcement rotation
    const msgs = $$(".announce__track p");
    if (msgs.length > 1 && !reduce) {
      let i = 0; setInterval(() => { msgs[i].classList.remove("on"); i = (i + 1) % msgs.length; msgs[i].classList.add("on"); }, 4200);
    }
    // header scroll behaviour
    const header = $("#header"); let lastY = scrollY, tick = false;
    const over = $("#site-header")?.dataset.over === "1";
    const announce = $(".announce");
    if (over) { header.classList.add("header--transparent"); announce?.classList.add("over"); }
    function onScroll() {
      const y = scrollY;
      if (over) {
        const solid = y > 24;
        header.classList.toggle("solid", solid);
        announce?.classList.toggle("over", !solid);
      }
      // header stays pinned (no auto-hide) so the nav is always reachable
      lastY = y; tick = false;
    }
    addEventListener("scroll", () => { if (!tick) { requestAnimationFrame(onScroll); tick = true; } }, { passive: true });
    onScroll();
    // The header is JS-injected and position:sticky. On a bfcache / back-forward restore,
    // or a reload where the browser restores a non-zero scroll position, iOS Safari can
    // leave the sticky header parked at its flow origin (off-screen) until the first
    // scroll - so the navbar reads as "missing" until you scroll. On EVERY show (initial
    // load included; pageshow always fires) re-resolve the transparent/solid state AND,
    // when restored scrolled, do a 1px scroll round-trip (same net position) to force the
    // compositor to re-pin the header immediately - no user scroll required.
    C.syncHeader = onScroll;
    addEventListener("pageshow", () => {
      onScroll();
      requestAnimationFrame(() => {
        onScroll();
        const x = scrollX, y = scrollY;
        if (y > 0) { scrollTo(x, y + 1); scrollTo(x, y); } else { scrollTo(x, 1); scrollTo(x, 0); }
      });
    });

    // mobile menu
    const burger = $("#burger"), mmenu = $("#mmenu");
    burger?.addEventListener("click", () => {
      const on = mmenu.classList.toggle("on"); burger.classList.toggle("on", on);
      burger.setAttribute("aria-expanded", on); mmenu.setAttribute("aria-hidden", !on);
      document.body.style.overflow = on ? "hidden" : "";
      document.body.classList.toggle("menu-open", on);   // pins the header (logo + close) at the top
    });
    $$("[data-mtoggle]", mmenu).forEach(b => b.addEventListener("click", () => {
      const cat = b.closest(".mmenu__cat");
      const willOpen = !cat.classList.contains("open");
      // accordion: only one category open at a time
      $$(".mmenu__cat.open", mmenu).forEach(c => { if (c !== cat) c.classList.remove("open"); });
      cat.classList.toggle("open", willOpen);
    }));

    // cart
    $("#bagBtn")?.addEventListener("click", openDrawer);
    $("#drawerClose")?.addEventListener("click", closeDrawer);
    $("#scrim")?.addEventListener("click", () => { closeDrawer(); closeWish(); });
    $("#checkoutBtn")?.addEventListener("click", checkout);
    $("#drawerBody")?.addEventListener("click", e => {
      const item = e.target.closest(".ditem"); if (!item) return;
      const it = cart.find(x => x.key === item.dataset.key); if (!it) return;
      if (e.target.closest("[data-inc]")) it.qty++;
      if (e.target.closest("[data-dec]")) { it.qty--; if (it.qty <= 0) cart = cart.filter(x => x !== it); }
      save(); renderCart();
    });

    // search
    $("#searchBtn")?.addEventListener("click", openSearch);
    $("#searchInput")?.addEventListener("input", e => runSearch(e.target.value));

    // wishlist
    $("#wishBtnHeader")?.addEventListener("click", () => openWish());
    $("#wishClose")?.addEventListener("click", closeWish);
    $("#wishBody")?.addEventListener("click", e => {
      const add = e.target.closest("[data-wishadd]");
      if (add) {
        const wh = add.dataset.wishadd, wp = byHandle(wh);
        // products with sizes must pick one on the PDP (avoids adding the wrong/sold-out variant)
        if (wp && wp.sizes && wp.sizes.length) { location.href = C.pdpHref(wp); }
        else { C.cart.add(wh, ""); }
        return;
      }
      const rm = e.target.closest("[data-wishrm]");
      if (rm) { C.wishlist.remove(rm.dataset.wishrm); return; }
    });

    // added-to-bag popup
    $("#addBagView")?.addEventListener("click", () => { closeAdded(); openDrawer(); });
    $("#addBagCheckout")?.addEventListener("click", () => { closeAdded(); checkout(); });

    addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeWish(); closeInfo(); closeCookiePrefs(); closeAdded(); closeSearch(); if (mmenu?.classList.contains("on")) burger.click(); } });

    // footer info/legal links → info modal, cart link → drawer, modal close buttons
    document.addEventListener("click", e => {
      const li = e.target.closest("[data-legal]");
      if (li) {
        e.preventDefault();
        if (li.dataset.legal === "sizeguide" && C.openSizeGuide) { C.openSizeGuide(); return; }
        openInfo(li.dataset.legal); return;
      }
      if (e.target.closest("[data-cookie-prefs]")) { e.preventDefault(); openCookiePrefs(); return; }
      const cc = e.target.closest("[data-cc]");
      if (cc) {
        e.preventDefault();
        const a = cc.dataset.cc;
        if (a === "accept") writeConsent({ preferences: true, analytics: true });
        else if (a === "reject") { writeConsent({ preferences: false, analytics: false }); closeCookiePrefs(); }
        else if (a === "prefs") openCookiePrefs();
        else if (a === "save") savePrefsFromModal();
        return;
      }
      if (e.target.closest("[data-cprefs-close]")) { e.preventDefault(); closeCookiePrefs(); return; }
      if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openDrawer(); return; }
      if (e.target.closest("[data-open-wish]")) { e.preventDefault(); openWish(); return; }
      if (e.target.closest("[data-info-close]")) { e.preventDefault(); closeInfo(); return; }
      if (e.target.closest("[data-addbag-close]")) { e.preventDefault(); closeAdded(); return; }
      if (e.target.closest("[data-search-close]")) { e.preventDefault(); closeSearch(); return; }
    });
    // footer "Be First to Know" newsletter
    const fnl = $("#footerNl");
    fnl?.addEventListener("submit", e => {
      e.preventDefault();
      const email = $("#footerNlEmail", fnl);
      if (!email.checkValidity()) { email.reportValidity(); return; }
      if (C.newsletter) C.newsletter.subscribe(email.value.trim(), "footer").catch(() => {});
      $("#footerNlOk", fnl)?.removeAttribute("hidden");
      email.value = "";
    });

    renderCart();
    renderWish();
  }

  /* ---------------- one-source-of-truth base image (shared) ----------------
     The image a product previews on: the owner's Content Studio photo #1 for the shown colour
     (identical to the PDP's first/big image), else the clean catalogue shot. Used by the card
     factory AND every other product preview + link (cart "pairs", wishlist, search) so a product
     ALWAYS previews on, and opens on, the same photo #1. slug matches js/studio.js slugColour. */
  const _cslug = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  /* Tolerant per-colour lookup for the owner's Content Studio photos (shared with js/product.js).
     Her photos are keyed by a colour slug (slugColour of the colour name at save time). Normally
     the shopper's selected colour slugs to the SAME key, so an exact match wins. But a colour can
     be RENAMED at the source, e.g. a Shopify re-sync turning "White Mist" into "White", or a case /
     spacing / word-order change; that would orphan her photo and wrongly fall back to the catalogue
     shot (the reported symptom). This still finds her photo across such drift, and NEVER cross-
     assigns colours:
       1. exact slug match (fast path, unchanged behaviour);
       2. else an UNAMBIGUOUS colour-family match: the selected colour and exactly ONE stored colour
          share their word tokens (one token set is a subset of the other, order-insensitive), e.g.
          "white" <-> "white-mist". Zero or two-plus candidates = no match, so a genuine data gap
          still falls back to the catalogue and two similar colours are never mixed up.
     `bySlug` maps slug -> [urls]; returns the matched url array or null. */
  C.studioImagesForColour = (bySlug, colour) => {
    if (!bySlug) return null;
    const want = _cslug(colour);
    const exact = bySlug[want];
    if (exact && exact.length) return exact;
    const wantTok = want ? want.split("-").filter(Boolean) : [];
    if (!wantTok.length) return null;
    const subset = (a, b) => a.every((t) => b.indexOf(t) >= 0);
    const hits = [];
    Object.keys(bySlug).forEach((slug) => {
      if (slug === want || !slug) return;                 // skip exact (handled) and the flat "" key
      const arr = bySlug[slug]; if (!arr || !arr.length) return;
      const tok = slug.split("-").filter(Boolean); if (!tok.length) return;
      if (subset(wantTok, tok) || subset(tok, wantTok)) hits.push(arr);
    });
    return hits.length === 1 ? hits[0] : null;            // only when unambiguous
  };
  /* Colours we can actually DISPLAY for this product: the product's REAL Shopify variants
     (p.colors), limited to those that have a distinct catalogue photo (colours pair to the
     /shopify/ shots by index, so we never offer a colour we can't show). Single source of truth
     for the card factory, the base-image resolver and the colourway split - so they never
     disagree. NEVER invents a colour: the result is always a subset of the real variants. */
  C.availColorsFor = (p) => {
    if (!p) return [];
    if (p.availColors && p.availColors.length) return p.availColors;
    const shopShots = (p.allImages && p.allImages.length ? p.allImages : (p.images || [])).filter(s => s.includes("/shopify/"));
    const distinctShots = shopShots.filter((s, k) => shopShots.indexOf(s) === k);
    const colorsAll = (p.colors && p.colors.length ? p.colors : [p.color]);
    // A colour is displayable if the owner uploaded a Studio photo for it (stored in product-media, NOT
    // /shopify/), OR (fallback) it maps to a distinct catalogue shot by index. Gating on catalogue shots
    // alone wrongly dropped colours Larissa HAS photographed (e.g. the-court-skirt Black), so tapping that
    // swatch never switched the photo. Studio-first keeps the switch, the split and the resolver in step.
    const snap = window.CLOUDSKIN_CONTENT_SNAPSHOT;
    const hasStudio = (c) => {
      if (p._studioImgs && C.studioImagesForColour(p._studioImgs, c)) return true;
      return !!(snap && p.handle && snap["product." + p.handle + ".images." + _cslug(c)]);
    };
    return colorsAll.filter((c, k) => hasStudio(c) || k < Math.max(1, distinctShots.length));
  };
  /* Presentation-layer colourway split: expand a product list so each REAL, displayable colourway
     becomes its own card entry {p, color}. A two-colour product yields TWO entries (both colours
     visible with zero taps - the mobile-first fix, since phones have no hover to reveal a swatch
     swap); a one-colour product yields exactly one. Colourways of the same product stay adjacent.
     NEVER invents a colour (entries come only from availColorsFor, a subset of the real Shopify
     variants), so every card deep-links to and adds a real variant. Optional `only` (Set of colour
     names) keeps just those colours - used when a colour filter is active - and never drops a
     matched product (falls back to all its displayable colours). */
  C.colorwayCards = (list, only) => {
    const out = [];
    (list || []).forEach(p => {
      if (!p) return;
      const cols = C.availColorsFor(p);
      const picked = (only && only.size) ? cols.filter(c => only.has(c)) : cols;
      const use = picked.length ? picked : (cols.length ? cols : [p.color]);
      use.forEach(c => out.push({ p: p, color: c }));
    });
    return out;
  };
  /* ---------- Vellum per-photo focal + zoom (System B) ----------
     Owner product photos are stored per colour as a newline list where each line is
     URL, or URL|pos, or URL|pos|zoom (a bare URL = the CSS default framing). The focal
     binds to the URL, so it survives reorder. parseStudioCell splits one stored cell into
     the bare-URL list (exactly what every existing consumer expects) PLUS a url -> {pos,zoom}
     focal map, so the same focal serves the card, the PDP main + thumb, and the pair-with. */
  C.parseStudioCell = (raw) => {
    const urls = [], focal = {};
    String(raw == null ? "" : raw).split(/\r?\n/).forEach((line) => {
      line = line.trim(); if (!line) return;
      const bar = line.indexOf("|");
      if (bar < 0) { urls.push(line); return; }
      const url = line.slice(0, bar).trim(); if (!url) return;
      const parts = line.slice(bar + 1).split("|");
      const pos = (parts[0] || "").trim();
      const zoom = parseFloat(parts[1]);
      urls.push(url);
      const f = {};
      if (pos) f.pos = pos;
      if (!isNaN(zoom) && zoom > 1.001) f.zoom = zoom;
      if (f.pos || f.zoom) focal[url] = f;
    });
    return { urls, focal };
  };
  // accumulate a parsed focal map onto a product (url-keyed, merges across colours)
  C.mergeStudioFocal = (p, focal) => {
    if (!p || !focal) return;
    const keys = Object.keys(focal); if (!keys.length) return;
    const dst = p._studioFocal || (p._studioFocal = {});
    keys.forEach((u) => { dst[u] = focal[u]; });
  };
  C.studioFocalFor = (p, url) => (p && p._studioFocal && url && p._studioFocal[url]) || null;
  // attribute string to splice into an <img ...> so it paints pre-framed on the FIRST frame
  C.focalAttrs = (f) => {
    if (!f) return "";
    let style = "";
    if (f.pos) style += "object-position:" + f.pos + ";";
    const zoomed = f.zoom && f.zoom > 1.001;
    if (zoomed) style += "--sz:" + f.zoom + ";--szo:" + (f.pos || "50% 50%") + ";";
    return (style ? ` style="${style}"` : "") + (zoomed ? ` class="vlm-zoomed"` : "");
  };
  // apply a focal to a LIVE <img> (colour switch, content.js swap, PDP re-render)
  C.applyPhotoFocal = (img, f) => {
    if (!img) return;
    img.style.objectPosition = (f && f.pos) ? f.pos : "";
    if (f && f.zoom && f.zoom > 1.001) {
      img.classList.add("vlm-zoomed");
      img.style.setProperty("--sz", f.zoom);
      img.style.setProperty("--szo", f.pos || "50% 50%");
    } else {
      img.classList.remove("vlm-zoomed");
      img.style.removeProperty("--sz"); img.style.removeProperty("--szo");
    }
  };

  C.baseImageFor = (p, forceColor = null) => {
    // Self-heal: if the owner's Studio photos were not merged onto this product object (e.g. cart /
    // wishlist / account / order items resolved before content.js's global merge ran), seed them from
    // the baked snapshot now, so EVERY product image site-wide uses her photo, not the catalogue default.
    if (p && !p._studioImgs && p.handle && window.CLOUDSKIN_CONTENT_SNAPSHOT) {
      const snap = window.CLOUDSKIN_CONTENT_SNAPSHOT, fk = "product." + p.handle + ".images", cp = fk + ".";
      let imgs = null;
      for (const k in snap) {
        let slug;
        if (k === fk) slug = ""; else if (k.indexOf(cp) === 0) slug = k.slice(cp.length); else continue;
        const parsed = C.parseStudioCell(snap[k]);   // splits URL|pos|zoom, binds focal to the URL
        if (parsed.urls.length) { (imgs || (imgs = {}))[slug] = parsed.urls; C.mergeStudioFocal(p, parsed.focal); }
      }
      p._studioImgs = imgs || {};
    }
    const shopShots = (p.allImages && p.allImages.length ? p.allImages : p.images).filter(s => s.includes("/shopify/"));
    const distinctShots = shopShots.filter((s, k) => shopShots.indexOf(s) === k);
    const availColors = C.availColorsFor(p);
    const displayColor = (forceColor && availColors.indexOf(forceColor) >= 0) ? forceColor : p.color;
    const di = Math.max(0, availColors.indexOf(displayColor));
    const studioList = (p._studioImgs && (C.studioImagesForColour(p._studioImgs, displayColor) || p._studioImgs[""])) || null;
    return (studioList && studioList[0]) || distinctShots[di] || p.images[0];
  };
  // product link that opens flash-free on the previewed photo #1 (product.js reads &img=).
  C.pdpHref = (p, forceColor = null) => `product.html?handle=${p.handle}&img=${encodeURIComponent(C.baseImageFor(p, forceColor))}`;

  /* ---------------- product-card factory (shared) ---------------- */
  C.cardHTML = (p, i = 0, forceColor = null, single = false) => {
    let badge = "";
    // Merchandising "New" / "Best Seller" pills removed from product cards per Mike (2026-07-18):
    // he does not want these tags on the photos. The New / Best Sellers / Trending collections
    // still work (driven by p.isNew / p.bestSeller flags), only the on-card badge is gone.
    // The Sale badge (a real discount marker, shown only when a product has a compareAt price)
    // is kept, since it signals an actual price reduction rather than a curation tag.
    if (p.compareAt) badge = `<span class="pcard__badge pcard__badge--sale">Sale</span>`;
    const price = p.compareAt
      ? `<s>${money(p.compareAt)}</s><span class="sale">${money(p.price)}</span>`
      : money(p.price);
    const sizes = (p.sizes || []).slice(0, 6);
    const href = `product.html?handle=${p.handle}`;
    // Colourways we can actually display: the product's real Shopify variants limited to those
    // with a distinct photo - never a colour we cannot show, never an invented one.
    const availColors = C.availColorsFor(p);
    // which colourway THIS card presents. The colourway split / a colour filter can force one
    // (e.g. the WHITE photo of a black/white product), else the product's default colour.
    const displayColor = (forceColor && availColors.indexOf(forceColor) >= 0) ? forceColor : p.color;
    // `single` mode (the colourway split): the card is ONE colourway and shows only its own swatch
    // as a colour indicator (the sibling card carries the other colour). Otherwise the full set -
    // kept for the Complete-the-Look rail and any non-split surface.
    const swColors = single ? [displayColor] : availColors.slice(0, 6);
    const extra = (!single && availColors.length > 6) ? `<em>+${availColors.length - 6}</em>` : "";
    // Card/preview = the owner's chosen base photo (Content Studio photo #1 for this colour), so the
    // home + shop preview matches the FIRST image on the product page (click-through continuity).
    // Falls back to the clean catalogue shot when she hasn't set photos.
    const mainImg = C.baseImageFor(p, forceColor);
    // Carry the card's displayed image to the PDP (&img=) so the product page opens on the EXACT
    // photo tapped, painted synchronously on first paint - no async catalogue->owner-photo swap
    // ("flash"). product.js validates this param to a safe source (bundled img/ path or the
    // CloudSkin Supabase public bucket) before using it, and reconciles to it once Studio loads.
    let cardHref = href + ((displayColor && displayColor !== p.color) ? "&color=" + encodeURIComponent(displayColor) : "");
    cardHref += "&img=" + encodeURIComponent(mainImg);
    // Each card paints its chosen colour's photo #1 (static) on load - no second <img> to flash or
    // bleed. On a multi-colour card, hovering a SWATCH (desktop) or tapping one (mobile) swaps THIS img's
    // src to that colourway's photo #1; hovering the PHOTO never changes colour (Mike's call - it must not
    // switch out from under a shopper eyeing one colour). Single-swatch cards (the collection split) have
    // nothing to switch. object-fit:cover fills the fixed 3/4 frame (top-biased focal) so photos never letterbox.
    return `
    <article class="pcard" data-handle="${p.handle}" data-color="${displayColor}" data-sticky="${displayColor}" style="transition-delay:${(i % 4) * 60}ms">
      <a class="pcard__media" href="${cardHref}" aria-label="${p.title}">
        ${badge}
        <img src="${mainImg}" alt="${p.title} in ${displayColor}" loading="lazy"${C.focalAttrs(C.studioFocalFor(p, mainImg))}>
        ${sizes.length ? `<div class="pcard__quick">
          <span class="pcard__quick-label">${C.t("card.quickAdd")}</span>
          <div class="pcard__quick-row" aria-label="${C.t("card.quickAdd")}">
            ${sizes.map(s => `<button data-qadd="${p.handle}" data-size="${s}">${s}</button>`).join("")}
          </div>
        </div>` : ""}
      </a>
      <button class="pcard__cloud" data-cloudadd="${p.handle}" aria-label="${C.t("pdp.addToBag")}: ${p.title}" title="${C.t("pdp.addToBag")}">
        <svg viewBox="0 0 26 20" aria-hidden="true"><path d="M7.5 18h10.2a4.3 4.3 0 0 0 .5-8.57A6.2 6.2 0 0 0 6.3 8.4 4.1 4.1 0 0 0 7.5 18Z"/></svg>
      </button>
      <a href="${cardHref}" style="color:inherit">
        <div class="pcard__swatches">${swColors.map((c) => `<i style="background:${C.hexFor(c)}" title="${c}" data-color="${c}" role="button" tabindex="0" aria-label="Show ${c}" class="${c === displayColor ? "on" : ""}"></i>`).join("")}${extra}</div>
        <h3 class="pcard__name">${p.title}</h3>
        <p class="pcard__meta">${displayColor}</p>
        <p class="pcard__price">${price}</p>
      </a>
    </article>`;
  };

  /* delegate quick-add + wishlist globally */
  const isTouch = () => matchMedia("(hover: none)").matches;
  document.addEventListener("click", e => {
    const q = e.target.closest("[data-qadd]");
    if (q) {
      e.preventDefault();
      const qp = byHandle(q.dataset.qadd);
      // add the card's OWN colourway (the split renders one card per real colour), so the bag gets
      // the exact variant shown; fall back to the product's default colour for an unstamped card.
      const qcolor = (q.closest(".pcard") && q.closest(".pcard").dataset.color) || (qp && qp.color);
      C.cart.add(q.dataset.qadd, q.dataset.size, qcolor);
      q.closest(".pcard")?.classList.remove("show-quick");   // touch: collapse the size picker after picking
      return;
    }
    const c = e.target.closest("[data-cloudadd]");
    if (c) {
      e.preventDefault();
      const handle = c.dataset.cloudadd;
      const p = byHandle(handle);
      // TOUCH: the cloud button reveals the on-card size picker (no hover on phones) so the
      // shopper can tap a size - matching the desktop quick-add. One card open at a time.
      if (isTouch() && p && p.sizes && p.sizes.length) {
        const card = c.closest(".pcard");
        const wasOpen = card?.classList.contains("show-quick");
        document.querySelectorAll(".pcard.show-quick").forEach(x => x.classList.remove("show-quick"));
        if (card && !wasOpen) card.classList.add("show-quick");
        return;
      }
      const size = (p && p.sizes && p.sizes[0]) || "";      // cloud quick-add uses the first size
      // ...and the card's OWN colourway (one card per real colour after the split) so the bag gets
      // the exact variant shown; fall back to the product's default colour when unstamped.
      const color = (c.closest(".pcard") && c.closest(".pcard").dataset.color) || (p && p.color) || "";
      if (C.cart.has(handle, size, color)) {                // already in the bag → second click removes it
        C.cart.remove(handle, size, color);
        c.classList.remove("added");
        c.classList.add("unadded");                         // force the empty/white look instantly (overrides :hover)
        c.addEventListener("mouseleave", () => c.classList.remove("unadded"), { once: true });
        C.toast(C.t("toast.removed", { item: `<em>${p ? p.title : "item"}</em>` }));
      } else {
        C.cart.add(handle, size, color);                    // add() shows its own "Added …" toast
        c.classList.add("added");
        c.classList.remove("unadded");
      }
      c.classList.remove("puff"); void c.offsetWidth; c.classList.add("puff");
      return;
    }
    // touch: tapping anywhere outside an open on-card size picker collapses it
    if (!e.target.closest(".pcard.show-quick")) document.querySelectorAll(".pcard.show-quick").forEach(x => x.classList.remove("show-quick"));
  });

  /* card colour switch: swap a card to another real colourway - its front photo, active swatch, colour
     label, deep-links AND the data-color that add-to-bag reads all move together, so what you SEE is
     exactly what the card links to and what the bag receives (never a phantom / desynced variant). The
     colour resolves the SAME way as the card's photo #1 and the PDP: the owner's Studio per-colour photo
     first (via C.baseImageFor), else the catalogue /shopify/ shot - so a switch always tracks Larissa's
     uploaded per-colour photos, not a stale shot-by-index. */
  function cardSwatches(card) { return [...card.querySelectorAll(".pcard__swatches i[data-color]")]; }
  function applyCardColour(card, color, commit) {
    if (!card || !color) return;
    const p = byHandle(card.dataset.handle); if (!p) return;
    const shot = C.baseImageFor(p, color);
    const front = card.querySelector(".pcard__media img");
    // swap the front photo AND re-apply that photo's owner focal (System B: focal binds to the URL). A
    // colourway with no saved focal returns null, which resets the img to the CSS default framing - so a
    // switch never carries the previous colour's crop over to the new photo.
    if (front && shot) { front.src = shot; front.alt = p.title + " in " + color; C.applyPhotoFocal(front, C.studioFocalFor(p, shot)); }
    cardSwatches(card).forEach(x => x.classList.toggle("on", x.dataset.color === color));
    card.dataset.color = color;                      // add-to-bag (quick-add + cloud button) reads this
    if (commit) card.dataset.sticky = color;         // a deliberate click/tap pick persists past hover
    const meta = card.querySelector(".pcard__meta"); if (meta) meta.textContent = color;
    // keep both card links on the shown colour so a click-through opens the exact photo + variant
    const href = "product.html?handle=" + p.handle
               + ((color !== p.color) ? "&color=" + encodeURIComponent(color) : "")
               + "&img=" + encodeURIComponent(shot);
    card.querySelectorAll('a[href*="product.html"]').forEach(a => { a.href = href; });
  }
  function swatchPick(sw, commit) {
    const card = sw.closest(".pcard"); if (!card) return;
    applyCardColour(card, sw.dataset.color, commit);
  }
  // COMMIT (persists): click / tap a swatch. Capture phase cancels the wrapping product link first.
  document.addEventListener("click", e => {
    const sw = e.target.closest(".pcard__swatches i[data-color]");
    if (!sw) return;
    e.preventDefault(); e.stopPropagation();
    swatchPick(sw, true);
  }, true);
  // COMMIT (persists): keyboard (Enter / Space) on a focused swatch.
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const sw = e.target.closest(".pcard__swatches i[data-color]");
    if (!sw) return;
    e.preventDefault(); e.stopPropagation();
    swatchPick(sw, true);
  }, true);
  /* DESKTOP hover (pointer-fine only): hover a colour SWATCH to preview that colourway; leaving the card
     snaps back to the sticky pick (the shopper's click/tap, else the card default). Deliberately NOT wired
     to the product PHOTO - hovering the image must never change the colour out from under a shopper who is
     eyeing a specific one (Mike's call); the swatches are the only hover control. Phones have no hover and
     keep tap-to-switch above. Delegated on mouseover/mouseout (they bubble); the mouseout revert uses a
     relatedTarget guard so it fires once, when the pointer truly leaves the card. */
  if (matchMedia("(hover: hover)").matches) {
    document.addEventListener("mouseover", e => {
      const sw = e.target.closest(".pcard__swatches i[data-color]");
      if (sw && !sw.classList.contains("on")) swatchPick(sw, false);                 // hover a swatch = preview that colour
    });
    document.addEventListener("mouseout", e => {
      const card = e.target.closest(".pcard");
      if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;      // still inside the card
      const sticky = card.dataset.sticky || card.dataset.color;
      if (sticky !== card.dataset.color) applyCardColour(card, sticky, false);       // revert preview on leave
    });
  }

  /* product rail carousel: prev/next arrows + edge state, shown only while the rail scrolls
     (mobile/tablet). On desktop the rails wrap into a centred grid, so the arrows stay hidden. */
  C.initRailCarousels = () => {
    $$(".prail").forEach(rail => {
      if (rail.dataset.railwrapped) return;
      rail.dataset.railwrapped = "1";
      const wrap = document.createElement("div");
      wrap.className = "railwrap" + (rail.classList.contains("prail--carousel") ? " railwrap--carousel" : "");
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-roledescription", "carousel");
      wrap.setAttribute("aria-label", "Products");
      rail.parentNode.insertBefore(wrap, rail);
      const arrow = dir => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "railnav railnav--" + dir;
        b.setAttribute("aria-label", dir === "prev" ? "Scroll to previous products" : "Scroll to next products");
        if (rail.id) b.setAttribute("aria-controls", rail.id);
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === "prev" ? "M15 4l-8 8 8 8" : "M9 4l8 8-8 8"}"/></svg>`;
        b.addEventListener("click", () => {
          const card = rail.querySelector(".pcard");
          const step = card ? card.getBoundingClientRect().width + 18 : rail.clientWidth * 0.85;
          // In RTL the browser uses the negative-scroll model (scrollLeft runs 0 at the
          // start on the right, down to -max at the end on the left), so the delta that
          // moves toward "previous" flips sign. Without this, the RTL arrows scroll the
          // wrong way (or look dead).
          const rtl = getComputedStyle(rail).direction === "rtl";
          const delta = (dir === "prev" ? -1 : 1) * (rtl ? -1 : 1) * step;
          rail.scrollBy({ left: delta, behavior: reduce ? "auto" : "smooth" });
        });
        return b;
      };
      const prev = arrow("prev"), next = arrow("next");
      wrap.append(prev, rail, next);   // prev before the rail, next after: better keyboard tab order
      const update = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        wrap.classList.toggle("has-nav", max > 4);
        // Normalise distance-from-start regardless of the LTR/RTL scroll model so the
        // prev/next disabled state is correct in Arabic too (previously prev was always
        // disabled in RTL because scrollLeft is <= 0 there).
        const rtl = getComputedStyle(rail).direction === "rtl";
        const fromStart = rtl ? -rail.scrollLeft : rail.scrollLeft;
        prev.disabled = fromStart <= 4;
        next.disabled = fromStart >= max - 4;
      };
      rail.addEventListener("scroll", update, { passive: true });
      addEventListener("resize", update, { passive: true });
      addEventListener("load", update);
      new MutationObserver(update).observe(rail, { childList: true });
      update();
    });
  };

  /* reveal system (shared) - resilient to asynchronously-injected content.
     One PERSISTENT IntersectionObserver reveals .reveal / .reveal-img / .pcard as they
     scroll into view. A MutationObserver auto-registers any such element added to the DOM
     AFTER the first scan (e.g. the PDP "Complete the Look" cards, which product.js re-fills
     once the owner's Supabase overrides load - AFTER this ran at init), so they never stay
     stuck at their hidden opacity:0 initial state. A load + timeout + post-mutation safety
     pass reveals anything already sitting in / near the viewport in environments where the
     IntersectionObserver callback is throttled or never fires (e.g. background tabs). The
     intentional 0.7s fade is preserved; every target still animates in the first time only. */
  const REVEAL_SEL = ".reveal, .reveal-img, .pcard";
  let revealIO = null, safetyT = 0;
  const nearViewport = (el, pad) => {
    const r = el.getBoundingClientRect(), vh = innerHeight || document.documentElement.clientHeight;
    return r.bottom > -pad && r.top < vh + pad && r.width > 0 && r.height > 0;
  };
  const revealNow = (el) => { el.classList.add("in"); if (revealIO) revealIO.unobserve(el); };
  const trackReveal = (el) => {
    if (!el || el.nodeType !== 1 || el.classList.contains("in") || el.dataset.revSeen === "1") return;
    el.dataset.revSeen = "1";
    revealIO.observe(el);
  };
  const scanReveals = (root) => (root || document).querySelectorAll(REVEAL_SEL).forEach(trackReveal);
  const safetyPass = () => $$(REVEAL_SEL).forEach(el => { if (!el.classList.contains("in") && nearViewport(el, 140)) revealNow(el); });
  C.observeReveals = () => {
    if (!revealIO) {
      revealIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) revealNow(en.target); }),
        { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
      // register reveal targets injected after this first scan (the async Complete-the-Look re-fill, etc.)
      new MutationObserver(muts => {
        let added = false;
        muts.forEach(m => m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches(REVEAL_SEL)) { trackReveal(n); added = true; }
          if (n.querySelectorAll) { const hit = n.querySelectorAll(REVEAL_SEL); if (hit.length) { hit.forEach(trackReveal); added = true; } }
        }));
        if (added) { clearTimeout(safetyT); safetyT = setTimeout(safetyPass, 250); }
      }).observe(document.body, { childList: true, subtree: true });
      addEventListener("load", safetyPass);
      setTimeout(safetyPass, 1200);
    }
    scanReveals(document);
  };

  /* ---------------- boot ---------------- */
  render();
  wire();
  document.addEventListener("DOMContentLoaded", () => { renderCart(); renderWish(); C.initRailCarousels(); if (!readConsent() && !bannerSeenThisSession()) showConsentBanner(); loadAnalytics(); });
})();
