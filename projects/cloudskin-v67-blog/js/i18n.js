/* ============================================================
   CLOUDSKIN, internationalization engine
   Loads FIRST (before config/shell) so C.t() + C.money() exist
   when everything else renders. English is the default/main
   language; 8 more are offered (Arabic · Urdu · Persian · Hindi ·
   Chinese · Turkish · Russian · French). Region (browser locale +
   timezone, no external calls) picks the initial language +
   currency; a header/footer switcher overrides and persists.
   Strings live in js/i18n-strings.js (window.CLOUDSKIN_I18N).
   NOTE: the CLOUDSKIN wordmark/logo are never translated or
   re-fonted - see css/main.css .logo / .hero__wordmark guards.
   ============================================================ */
(() => {
  "use strict";
  const C = (window.CLOUDSKIN = window.CLOUDSKIN || {});
  const STR = window.CLOUDSKIN_I18N || {};
  const EN = STR.en || {};

  /* ---- languages ---- */
  const LANGS = [
    { code: "en", native: "English",    label: "English",    dir: "ltr" },
    { code: "ar", native: "العربية",    label: "Arabic",     dir: "rtl", nolatin: true },
    { code: "el", native: "Ελληνικά",   label: "Greek",      dir: "ltr" },
    { code: "es", native: "Español",    label: "Spanish",    dir: "ltr" },
    { code: "it", native: "Italiano",   label: "Italian",    dir: "ltr" },
    { code: "fr", native: "Français",   label: "French",     dir: "ltr" },
    { code: "de", native: "Deutsch",    label: "German",     dir: "ltr" },
    { code: "nl", native: "Nederlands", label: "Dutch",      dir: "ltr" },
    { code: "pt", native: "Português",  label: "Portuguese", dir: "ltr" },
    { code: "sv", native: "Svenska",    label: "Swedish",    dir: "ltr" },
    { code: "ru", native: "Русский",    label: "Russian",    dir: "ltr" }
  ];
  const LANG_CODES = LANGS.map(l => l.code);

  /* ---- currencies (rates are approximate, AED base, static table).
     The store's base currency is AED, so every rate here is "units of this
     currency per 1 dirham" and AED is exactly 1. ---- */
  const CUR = {
    USD: { symbol: "$", rate: 0.2714 },
    EUR: { symbol: "€", rate: 0.2381 },
    AUD: { symbol: "A$", rate: 0.3881 },
    AED: { symbol: "د.إ", rate: 1 },
    GBP: { symbol: "£", rate: 0.2021 },
    THB: { symbol: "฿", rate: 9.143 },
    SEK: { symbol: "kr", rate: 2.631 },
    RUB: { symbol: "₽", rate: 20.95 },
    SAR: { symbol: "ر.س", rate: 1.019 },
    KWD: { symbol: "د.ك", rate: 0.08429 }
  };
  const CUR_CODES = Object.keys(CUR);

  const LS_LANG = "cloudskin_lang", LS_CUR = "cloudskin_ccy";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---- region → currency (locale region subtag first, then timezone) ---- */
  const REGION_CUR = {
    AE: "AED", QA: "AED", BH: "AED", OM: "AED",
    KW: "KWD", SA: "SAR",
    GB: "GBP", AU: "AUD", TH: "THB", SE: "SEK", US: "USD", RU: "RUB",
    FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
    GR: "EUR", PT: "EUR", IE: "EUR", AT: "EUR", FI: "EUR", LU: "EUR", CY: "EUR"
  };
  const TZ_CUR = [
    [/dubai|abu_dhabi/, "AED"], [/qatar|bahrain|muscat/, "AED"], [/kuwait/, "KWD"], [/riyadh/, "SAR"],
    [/london/, "GBP"], [/sydney|melbourne|brisbane|perth|adelaide/, "AUD"],
    [/bangkok/, "THB"], [/stockholm|gothenburg/, "SEK"],
    [/moscow|kaliningrad|samara|yekaterinburg|novosibirsk|krasnoyarsk|omsk|volgograd/, "RUB"],
    [/paris|berlin|madrid|rome|amsterdam|brussels|athens|nicosia|lisbon|vienna|dublin|helsinki|luxembourg/, "EUR"]
  ];

  function detectLang() {
    const navs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (const l of navs) { const p = (l || "").toLowerCase().split("-")[0]; if (LANG_CODES.includes(p)) return p; }
    return "en";
  }
  function regionCode() {
    try { const loc = new Intl.Locale(navigator.language); if (loc.region) return loc.region.toUpperCase(); } catch (e) {}
    const m = (navigator.language || "").split("-")[1];
    return m ? m.toUpperCase() : "";
  }
  function detectCur() {
    const r = regionCode(); if (REGION_CUR[r]) return REGION_CUR[r];
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase();
    for (const [re, c] of TZ_CUR) if (re.test(tz)) return c;
    return "EUR";
  }

  /* ---- resolve active language + currency (saved override → detected → default) ---- */
  let lang = get(LS_LANG); if (!LANG_CODES.includes(lang)) lang = "en";
  let cur  = get(LS_CUR);  if (!CUR_CODES.includes(cur))   cur  = detectCur();
  const meta = LANGS.find(l => l.code === lang) || LANGS[0];

  C.lang = lang; C.dir = meta.dir; C.currency = cur; C.LANGS = LANGS; C.CUR = CUR;

  /* ---- translation lookup with {var} interpolation + English fallback ---- */
  const dict = Object.assign({}, EN, STR[lang] || {});
  C.t = (key, vars) => {
    let s = dict[key] != null ? dict[key] : (EN[key] != null ? EN[key] : key);
    if (vars) s = String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  };

  /* ---- currency-aware money: AED-base number → active currency, shaped for the active language ---- */
  const cdef = CUR[cur] || CUR.EUR;
  C.money = (n, dec = false) => {
    const val = Number(n) * cdef.rate;
    try {
      return new Intl.NumberFormat(lang, {
        style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
        minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0
      }).format(val);
    } catch (e) {
      return cdef.symbol + " " + (dec ? val.toFixed(2) : Math.round(val));
    }
  };
  C.currencySymbol = cdef.symbol;
  C.curRate = cdef.rate;   // active currency's AED-base rate (used for per-currency thresholds)

  /* ---- exact amount ALREADY in the active currency (no EUR-rate conversion), shaped for
     the active language. Used for per-currency figures like the free-shipping threshold,
     which are owner-set marketing numbers rather than a converted EUR base. ---- */
  C.moneyExact = (n, dec = false) => {
    try {
      return new Intl.NumberFormat(lang, {
        style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
        minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0
      }).format(Number(n));
    } catch (e) {
      return cdef.symbol + " " + (dec ? Number(n).toFixed(2) : Math.round(Number(n)));
    }
  };

  /* ---- delivery estimate (region-aware, no external calls): DHL Express transit
     bands out of Dubai plus a short dispatch buffer, in business days, rendered as
     a localized date range (e.g. "29-31 Aug") for the PDP "Arrives" line. It is
     currency- and threshold-independent, so the store's base currency never affects it. ---- */
  const SHIP_BAND = {
    AE: [1, 2],
    SA: [2, 3], QA: [2, 3], BH: [2, 3], KW: [2, 3], OM: [2, 3],
    JO: [3, 4], LB: [3, 4], EG: [3, 4], IL: [3, 4], TR: [3, 4],
    GB: [3, 5], IE: [3, 5], FR: [3, 5], DE: [3, 5], ES: [3, 5], IT: [3, 5], NL: [3, 5],
    BE: [3, 5], AT: [3, 5], PT: [3, 5], GR: [3, 5], CY: [3, 5], SE: [3, 5], DK: [3, 5],
    FI: [3, 5], NO: [3, 5], CH: [3, 5], PL: [3, 5], CZ: [3, 5], RO: [3, 5], HU: [3, 5],
    US: [4, 6], CA: [4, 6], AU: [4, 6], NZ: [4, 6], JP: [4, 6], SG: [4, 6], HK: [4, 6]
  };
  function bizAdd(from, days) {
    const d = new Date(from); let added = 0;
    while (added < days) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++; }
    return d;
  }
  C.regionCode = regionCode;
  /* localized "arrives between" date range for the active region, or "" if unavailable (never throws). */
  C.shipEstimateRange = () => {
    try {
      const band = SHIP_BAND[regionCode()] || [4, 7];
      const now = new Date();
      const d1 = bizAdd(now, band[0]), d2 = bizAdd(now, band[1]);
      const dtf = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
      try { return dtf.formatRange(d1, d2); } catch (e) { return dtf.format(d1) + " - " + dtf.format(d2); }
    } catch (e) { return ""; }
  };

  /* ---- <html> lang / dir / script class (RTL + non-Latin type handling) ---- */
  const html = document.documentElement;
  html.setAttribute("lang", lang);
  html.setAttribute("dir", meta.dir);
  html.classList.toggle("i18n-nolatin", !!meta.nolatin);
  html.classList.toggle("i18n-rtl", meta.dir === "rtl");

  /* ---- translate static DOM ([data-i18n] textContent, -ph placeholder, -al aria-label) ---- */
  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(el => { const v = C.t(el.getAttribute("data-i18n")); if (v != null) el.textContent = v; });
    root.querySelectorAll("[data-i18n-ph]").forEach(el => el.setAttribute("placeholder", C.t(el.getAttribute("data-i18n-ph"))));
    root.querySelectorAll("[data-i18n-al]").forEach(el => el.setAttribute("aria-label", C.t(el.getAttribute("data-i18n-al"))));
  }
  C.i18nApply = apply;
  apply();

  /* ---- language / currency switcher ---- */
  const GLOBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>`;

  function panelMarkup() {
    const langs = LANGS.map(l =>
      `<button class="i18n-opt${l.code === lang ? " on" : ""}" data-lang="${l.code}" lang="${l.code}" ${l.dir === "rtl" ? 'dir="rtl"' : ""}>
        <span class="i18n-opt__native">${l.native}</span><span class="i18n-opt__label">${l.label}</span></button>`).join("");
    const curs = CUR_CODES.map(c =>
      `<button class="i18n-opt i18n-opt--cur${c === cur ? " on" : ""}" data-cur="${c}"><span class="i18n-opt__native">${c}</span><span class="i18n-opt__label">${CUR[c].symbol}</span></button>`).join("");
    return `
      <div class="i18n-modal__overlay" data-i18n-close></div>
      <div class="i18n-modal__box" role="dialog" aria-modal="true" aria-label="Language and currency">
        <button class="i18n-modal__close" data-i18n-close aria-label="Close">&times;</button>
        <h3 class="i18n-modal__h">${C.t("switch.language")}</h3>
        <div class="i18n-grid i18n-grid--langs">${langs}</div>
        <h3 class="i18n-modal__h">${C.t("switch.currency")}</h3>
        <div class="i18n-grid i18n-grid--curs">${curs}</div>
      </div>`;
  }

  function openPanel() { const m = document.getElementById("i18nPanel"); if (!m) return; m.classList.add("on"); m.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closePanel() { const m = document.getElementById("i18nPanel"); if (!m) return; m.classList.remove("on"); m.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

  function mount() {
    // header trigger - DESKTOP: right icon cluster, immediately before Search.
    // MOBILE (burger layout, ≤820px): left cluster next to the burger, so it never
    // crowds the centred wordmark. It relocates live when crossing the breakpoint.
    if (!document.getElementById("langBtn")) {
      const b = document.createElement("button");
      b.id = "langBtn"; b.className = "i18n-btn"; b.type = "button";
      b.setAttribute("aria-label", C.t("switch.language"));
      b.innerHTML = `${GLOBE}<span class="i18n-btn__t">${lang.toUpperCase()} · ${cur}</span>`;
      b.addEventListener("click", openPanel);
      // ≤1080px is the burger ("mobile") layout - globe stays left next to the burger there;
      // only the true desktop nav (>1080px) puts it in the right cluster beside Search.
      const mqMobile = matchMedia("(max-width: 1080px)");
      const placeLang = () => {
        const left = document.querySelector(".nav__left");
        const icons = document.querySelector(".nav__icons");
        const searchBtn = document.getElementById("searchBtn");
        if (mqMobile.matches) {
          if (left && b.parentElement !== left) left.appendChild(b);
        } else if (icons) {
          if (searchBtn) { if (b !== searchBtn.previousElementSibling) icons.insertBefore(b, searchBtn); }
          else if (b.parentElement !== icons) icons.appendChild(b);
        }
      };
      placeLang();
      mqMobile.addEventListener ? mqMobile.addEventListener("change", placeLang) : mqMobile.addListener(placeLang);
    }
    // mobile menu entry
    const mmenu = document.getElementById("mmenu");
    if (mmenu && !mmenu.querySelector(".mmenu__i18n")) {
      const a = document.createElement("button");
      a.type = "button"; a.className = "mmenu__account mmenu__i18n"; a.setAttribute("data-open-i18n", "");
      a.innerHTML = `<span>${meta.native} · ${cur}</span><span aria-hidden="true">${GLOBE}</span>`;
      const acc = mmenu.querySelector(".mmenu__account");
      if (acc) acc.insertAdjacentElement("afterend", a); else mmenu.appendChild(a);
    }
    // panel (once)
    if (!document.getElementById("i18nPanel")) {
      const m = document.createElement("div");
      m.className = "i18n-modal"; m.id = "i18nPanel"; m.setAttribute("aria-hidden", "true");
      m.innerHTML = panelMarkup();
      document.body.appendChild(m);
    }
  }

  // event delegation (works for header btn, footer btn, mmenu entry, panel options)
  document.addEventListener("click", e => {
    if (e.target.closest("[data-open-i18n]")) { e.preventDefault(); openPanel(); return; }
    if (e.target.closest("[data-i18n-close]")) { e.preventDefault(); closePanel(); return; }
    const lb = e.target.closest("[data-lang]");
    if (lb) { const v = lb.getAttribute("data-lang"); if (v !== lang) { set(LS_LANG, v); location.reload(); } else closePanel(); return; }
    const cb = e.target.closest("[data-cur]");
    if (cb) { const v = cb.getAttribute("data-cur"); if (v !== cur) { set(LS_CUR, v); location.reload(); } else closePanel(); return; }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
