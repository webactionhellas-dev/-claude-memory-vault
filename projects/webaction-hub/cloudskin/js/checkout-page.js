/* ============================================================
   CLOUDSKIN - unified /checkout page (frontend orchestrator)
   ------------------------------------------------------------
   ONE branded page where every payment method sits together as siblings:
     * Stripe embedded Payment Element (card + Apple Pay + Google Pay + Link)
       via a Checkout Session in ui_mode:'elements' (create-checkout-elements),
       so the amount, shipping option and WELCOME10 promo stay 100% server-
       authoritative and Stripe Adaptive Pricing still charges the buyer's local
       currency. The webhook (checkout.session.completed) is UNCHANGED.
     * PayPal Smart Button (create-paypal-order/capture), mounted right beside it
       under the same "Payment" heading by js/checkout-paypal.js.

   RESILIENCE (never dead-end a sale): if Stripe.js fails to load, the embedded
   SDK method is missing, or session creation fails, we fall back to the proven
   HOSTED redirect (js/checkout.js -> create-checkout-session), which itself
   falls back to Shopify hosted checkout. PayPal is a fully independent rail and
   stays available either way.

   No secret is ever used here: the browser only calls the edge functions with
   the public anon key; the Stripe publishable key is returned by the server so
   it always matches the same account/mode (test vs live) that minted the session.
   ============================================================ */
(function () {
  "use strict";
  var C = window.CLOUDSKIN = window.CLOUDSKIN || {};
  var SB = window.CLOUDSKIN_SB || {};
  var BASE = SB.url ? SB.url.replace(/\/$/, "") : "";
  var ELEMENTS_URL = BASE + "/functions/v1/create-checkout-elements";
  var STRIPE_JS = "https://js.stripe.com/basil/stripe.js";
  var CART_KEY = "cloudskin_cart";

  /* ---- tiny helpers ---- */
  function $(s, r) { return (r || document).querySelector(s); }
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } }
  function byHandle(h) { return (window.CLOUDSKIN_PRODUCTS || []).find(function (p) { return p.handle === h; }); }
  function money(n) { return C.money ? C.money(n) : ("€" + Math.round(Number(n) || 0)); }
  function t(k, d) { var v = C.t ? C.t(k) : null; return (v && v !== k) ? v : d; }
  function authHeaders(extra) {
    var h = { "apikey": SB.anonKey || "", "Authorization": "Bearer " + (SB.anonKey || "") };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* Free-ship threshold + flat rate, AED base (mirrors _shared/shipping.ts SHIP_DEFAULTS.aed
     and js/config.js CLOUDSKIN.FREESHIP). The server re-decides authoritatively; this is
     display only. Cart product.price is the AED base number, same as the cart drawer. */
  var FREESHIP_AED = C.FREESHIP || 840;
  var FLAT_AED = 71;

  /* Payment lines for Stripe/PayPal: resolvable Shopify variant GIDs only, same rule
     as js/checkout.js (items not yet in Shopify are silently skipped). Independent of
     the summary, which displays the whole bag from local product data. */
  function buildLines() {
    var cart = readCart();
    var lines = [], missing = 0;
    cart.forEach(function (it) {
      var p = byHandle(it.handle);
      var vid = (C.shopify && C.shopify.variantId) ? C.shopify.variantId(it.handle, it.color || (p && p.color), it.size) : null;
      if (vid) lines.push({ variantId: vid, quantity: it.qty, size: it.size || "" });
      else missing++;
    });
    return { lines: lines, missing: missing, count: cart.length };
  }

  /* The displayable bag: every cart item that resolves to a known product (local
     data, no network). Drives the summary + the AED-base subtotal for the free-ship
     display. The server always re-prices authoritatively; this is display only. */
  function cartRows() {
    var rows = [], subtotalAed = 0, count = 0;
    readCart().forEach(function (it) {
      var p = byHandle(it.handle);
      if (!p) return;
      rows.push({ p: p, it: it });
      subtotalAed += (Number(p.price) || 0) * it.qty;
      count += it.qty;
    });
    return { rows: rows, subtotalAed: subtotalAed, count: count };
  }

  /* ---- order summary (left column), display-only; the charge is server-authoritative ---- */
  function renderSummary() {
    var box = $("#coSummary");
    if (!box) return { rows: [], count: 0, subtotalAed: 0 };
    var built = cartRows();
    if (!built.rows.length) {
      box.innerHTML = '<p class="co-empty">' + esc(t("cart.empty", "Your bag is empty.")) + '</p>' +
        '<a class="btn btn--outline" href="/home">' + esc(t("cart.continue", "Continue shopping")) + '</a>';
      return built;
    }
    var free = built.subtotalAed >= FREESHIP_AED;
    var shipAed = free ? 0 : FLAT_AED;
    var rows = built.rows.map(function (r) {
      var img = (C.baseImageFor && C.baseImageFor(r.p, r.it.color)) || (r.p.images && r.p.images[0]) || r.p.image || (r.p.media && r.p.media[0]) || "";
      var meta = [r.it.color, r.it.size, "Qty " + r.it.qty].filter(Boolean).join(" · ");
      return '<div class="co-item">' +
        '<div class="co-item__media">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') + '</div>' +
        '<div class="co-item__info"><h4>' + esc(r.p.title || r.p.name || r.p.handle) + '</h4>' + (meta ? '<p>' + esc(meta) + '</p>' : '') + '</div>' +
        '<div class="co-item__price">' + esc(money(r.p.price * r.it.qty)) + '</div>' +
        '</div>';
    }).join("");

    var pct = Math.max(0, Math.min(100, Math.round((built.subtotalAed / FREESHIP_AED) * 100)));
    var freebar = free
      ? '<div class="co-freebar co-freebar--done">' + esc(t("cart.freeUnlocked", "Complimentary shipping unlocked")) + '</div>'
      : '<div class="co-freebar"><span>' + esc(t("cart.freeHint", "You are " + money(FREESHIP_AED - built.subtotalAed) + " away from complimentary shipping").replace("{amount}", money(FREESHIP_AED - built.subtotalAed))) + '</span><div class="co-freebar__track"><i style="width:' + pct + '%"></i></div></div>';

    box.innerHTML =
      '<h2 class="co-h">' + esc(t("checkout.summary", "Order summary")) + '</h2>' +
      '<div class="co-items">' + rows + '</div>' +
      freebar +
      '<div class="co-totals">' +
        '<div class="co-row"><span>' + esc(t("cart.subtotal", "Subtotal")) + '</span><strong>' + esc(money(built.subtotalAed)) + '</strong></div>' +
        '<div class="co-row co-row--muted"><span>' + esc(t("cart.shipping", "Shipping")) + '</span><span>' + (free ? esc(t("cart.complimentary", "Complimentary")) : esc(money(shipAed))) + '</span></div>' +
        '<div class="co-row co-row--total"><span>' + esc(t("checkout.total", "Total")) + '</span><strong>' + esc(money(built.subtotalAed + shipAed)) + '</strong></div>' +
      '</div>' +
      '<p class="co-fineprint">' + esc(t("cart.duties", "Duties & taxes included. Final amount and your currency are confirmed at payment.")) + '</p>';
    return built;
  }

  /* ---- Stripe.js loader (from js.stripe.com, never bundled - PCI requirement) ---- */
  var stripeJsPromise = null;
  function loadStripeJs() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripeJsPromise) return stripeJsPromise;
    stripeJsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = STRIPE_JS; s.async = true;
      s.onload = function () { window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js loaded without global")); };
      s.onerror = function () { reject(new Error("Stripe.js failed to load")); };
      document.head.appendChild(s);
    });
    return stripeJsPromise;
  }

  /* Appearance API: theme Stripe's iframe to the CloudSkin brand (read live CSS tokens). */
  function appearance() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var x = cs.getPropertyValue(name); return (x && x.trim()) || fb; }
    return {
      theme: "flat",
      variables: {
        colorPrimary: v("--ink", "#171512"),
        colorText: v("--ink", "#171512"),
        colorTextSecondary: v("--stone", "#857d72"),
        colorBackground: "#ffffff",
        colorDanger: "#a23b3b",
        fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
        borderRadius: "0px",
        spacingUnit: "4px"
      },
      rules: {
        ".Input": { border: "1px solid " + v("--hair", "#e6e0d6"), boxShadow: "none", padding: "12px 14px" },
        ".Input:focus": { border: "1px solid " + v("--ink", "#171512"), boxShadow: "none" },
        ".Label": { fontWeight: "600", letterSpacing: ".02em" },
        ".Tab": { border: "1px solid " + v("--hair", "#e6e0d6"), borderRadius: "0px" },
        ".Tab--selected": { borderColor: v("--ink", "#171512") }
      }
    };
  }

  function setMsg(msg, isErr) {
    var el = $("#coMsg"); if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("co-msg--err", !!isErr);
  }
  function setPayBusy(b) {
    var btn = $("#coPayBtn"); if (!btn) return;
    btn.disabled = b; btn.classList.toggle("is-busy", b);
  }

  /* Fall back to the proven hosted redirect (js/checkout.js begin() -> create-checkout-session
     -> Shopify hosted last resort). The PayPal rail is unaffected. */
  function fallbackToHosted(reason) {
    if (reason) console.warn("[CloudSkin] embedded checkout unavailable, using hosted fallback:", reason);
    var wrap = $("#coStripe");
    if (wrap) {
      wrap.innerHTML =
        '<p class="co-fallback__note">' + esc(t("checkout.cardVia", "Pay securely by card, Apple Pay or Google Pay.")) + '</p>' +
        '<button class="btn btn--full" id="coHostedBtn">' + esc(t("checkout.payCard", "Continue to secure card payment")) + '</button>';
      var b = $("#coHostedBtn");
      if (b) b.addEventListener("click", function () {
        b.disabled = true; b.classList.add("is-busy");
        if (C.checkoutStripe && C.checkoutStripe.begin) C.checkoutStripe.begin();
        else if (C.checkout) C.checkout();
      });
    }
    // PayPal still mounts independently below.
  }

  function showFallbackOnly() {
    // No resolvable Stripe lines (e.g. items not yet in Shopify): still let PayPal try,
    // and offer the hosted path which shares the same skip rule.
    fallbackToHosted("no-resolvable-lines");
  }

  /* ---- embedded Stripe init ---- */
  var inited = false;
  async function initStripe() {
    if (inited) return; inited = true;
    var built = buildLines();
    if (!built.lines.length) { showFallbackOnly(); return; }

    var payload = {
      lines: built.lines,
      currency: (C.currency || "EUR"),
      lang: (C.getLang && C.getLang()) || document.documentElement.lang || "en"
    };
    var u = (C.auth && C.auth.user) ? C.auth.user() : null;
    if (u && u.email) payload.email = u.email;

    var res, data;
    try {
      res = await fetch(ELEMENTS_URL, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      data = await res.json().catch(function () { return {}; });
    } catch (e) { return fallbackToHosted("network:" + (e && e.message)); }

    if (!res.ok || !data.clientSecret || !data.publishableKey) {
      return fallbackToHosted((data && (data.code || data.error)) || ("status:" + (res && res.status)));
    }

    var Stripe, stripe, checkout, actions;
    try {
      Stripe = await loadStripeJs();
      stripe = Stripe(data.publishableKey);
      if (typeof stripe.initCheckoutElementsSdk !== "function") return fallbackToHosted("initCheckoutElementsSdk-missing");
      checkout = await stripe.initCheckoutElementsSdk({ clientSecret: data.clientSecret, elementsOptions: { appearance: appearance() } });
    } catch (e) { return fallbackToHosted("init-threw:" + (e && e.message)); }

    // Optional elements: each guarded so a single missing/renamed method never breaks pay.
    tryMount(checkout, "createCurrencySelectorElement", "#coCurrency");
    tryMount(checkout, "createContactDetailsElement", "#coContact");
    tryMount(checkout, "createShippingAddressElement", "#coAddress");
    // Payment Element is REQUIRED. If it cannot mount, fall back to hosted.
    try {
      var pe = checkout.createPaymentElement();
      pe.mount("#coPayment");
    } catch (e) { return fallbackToHosted("payment-element:" + (e && e.message)); }

    // Actions carry confirm()/getSession()/applyPromotionCode().
    try {
      var la = await checkout.loadActions();
      actions = la && la.actions ? la.actions : la;
    } catch (e) { return fallbackToHosted("loadActions:" + (e && e.message)); }

    wirePay(actions);
    wirePromo(actions);
    syncTotals(actions);

    var wrap = $("#coStripe");
    if (wrap) wrap.classList.add("is-ready");
    var pay = $("#coPayBtn");
    if (pay) pay.hidden = false;
  }

  function tryMount(checkout, method, sel) {
    var host = $(sel);
    if (!host) return;
    try {
      if (typeof checkout[method] !== "function") { host.hidden = true; return; }
      var el = checkout[method]();
      el.mount(sel);
      host.hidden = false;
    } catch (e) { host.hidden = true; }
  }

  function wirePay(actions) {
    var btn = $("#coPayBtn");
    if (!btn || !actions || typeof actions.confirm !== "function") return;
    btn.addEventListener("click", async function () {
      setMsg("");
      setPayBusy(true);
      try {
        var out = await actions.confirm();
        // confirm() resolves with { error } on failure; on success Stripe redirects
        // to the session return_url (the webhook is the source of truth for "paid").
        if (out && out.error) setMsg(out.error.message || t("checkout.payErr", "Payment could not be completed."), true);
      } catch (e) {
        setMsg((e && e.message) || t("checkout.payErr", "Payment could not be completed."), true);
      } finally {
        setPayBusy(false);
      }
    });
  }

  function wirePromo(actions) {
    var form = $("#coPromoForm");
    if (!form) return;
    if (!actions || typeof actions.applyPromotionCode !== "function") { form.hidden = true; return; }
    form.hidden = false;
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var input = $("#coPromoInput"), note = $("#coPromoNote");
      var code = (input && input.value || "").trim();
      if (!code) return;
      if (note) { note.textContent = t("checkout.promoChecking", "Checking…"); note.hidden = false; }
      try {
        var out = await actions.applyPromotionCode(code);
        if (out && out.error) { if (note) note.textContent = out.error.message || t("checkout.promoBad", "That code is not valid."); }
        else { if (note) note.textContent = t("checkout.promoOk", "Promo applied."); syncTotals(actions); }
      } catch (e) {
        if (note) note.textContent = (e && e.message) || t("checkout.promoBad", "That code is not valid.");
      }
    });
  }

  /* Sync our summary total line with the live Stripe session total (reflects promo +
     Adaptive Pricing currency). Best-effort: our cart-derived summary stays as the base. */
  function syncTotals(actions) {
    try {
      if (!actions || typeof actions.getSession !== "function") return;
      var s = actions.getSession();
      var total = s && s.total;
      var amt = total && (total.total || total.grandTotal || total);
      var formatted = amt && (amt.formattedAmount || amt.formatted);
      if (formatted) {
        var el = $("#coStripeTotal");
        if (el) { el.textContent = t("checkout.chargedTotal", "Total charged") + ": " + formatted; el.hidden = false; }
      }
    } catch (e) { /* display sugar only */ }
  }

  /* ---- boot ---- */
  function boot() {
    if (!$("#coSummary")) return; // not the checkout page
    var built = renderSummary();
    if (built && built.count === 0) { fallbackHideStripe(); return; }
    // Mount PayPal (self-gating: shows nothing until the PayPal backend is live).
    if (C.checkoutPaypal && C.checkoutPaypal.mountAll) { try { C.checkoutPaypal.mountAll(); } catch (e) {} }
    // Init the embedded Stripe payment section.
    initStripe();
  }

  function fallbackHideStripe() {
    var sec = $("#coPaymentSection");
    if (sec) sec.hidden = true;
  }

  // Products/shell load first; wait for them so byHandle + variantId resolve.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);

  C.checkoutPage = { boot: boot, renderSummary: renderSummary };
})();
