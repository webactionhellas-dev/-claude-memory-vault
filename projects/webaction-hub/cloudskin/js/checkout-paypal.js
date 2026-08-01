/* ============================================================
   CLOUDSKIN - PayPal Smart Button (frontend, self-gating)
   ------------------------------------------------------------
   Renders the official PayPal JS SDK button on the unified /checkout page as a
   SIBLING beside the Stripe embedded Payment Element (card + Apple Pay + Google
   Pay), under one "Payment" heading. PayPal is NO LONGER in the cart drawer or the
   add-to-bag panel (Mike's ask: payment methods together, in the payment step).
   Loads AFTER shell.js + shopify.js + checkout.js (mirrors checkout.js's
   structure: build cart lines -> call the create-paypal-order Supabase Edge
   Function server-side, which re-prices in AED then converts to the store's
   PayPal settlement currency -> PayPal's own popup handles buyer approval ->
   capture-paypal-order confirms + redirects, exactly parallel to the Stripe
   flow's redirect to account.html?order=success.

   SELF-GATING (important): this file calls GET create-paypal-order for the
   PUBLIC config (client id + currency) FIRST, and renders NOTHING unless that
   call returns {ok:true}. The backend only returns ok:true when its configured
   PAYPAL_ENV actually authenticates against the stored PayPal credentials, so
   until Mike explicitly finishes PayPal go-live (see supabase/README.md), this
   file is a harmless no-op on the live site: no button appears, no SDK loads,
   the existing Stripe checkout path is completely unaffected either way.
   ============================================================ */
(function () {
  "use strict";
  var C = window.CLOUDSKIN = window.CLOUDSKIN || {};

  var SB = window.CLOUDSKIN_SB || {};
  var BASE = SB.url ? SB.url.replace(/\/$/, "") : "";
  var CONFIG_URL = BASE + "/functions/v1/create-paypal-order";
  var CREATE_URL = CONFIG_URL; // same endpoint: GET = config, POST = create order
  var CAPTURE_URL = BASE + "/functions/v1/capture-paypal-order";

  var CART_KEY = "cloudskin_cart";
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } }
  function byHandle(h) { return (window.CLOUDSKIN_PRODUCTS || []).find(function (p) { return p.handle === h; }); }
  function authHeaders(extra) {
    var h = { "apikey": SB.anonKey || "", "Authorization": "Bearer " + (SB.anonKey || "") };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function toast(msg) { if (C.toast) C.toast(msg); else if (C.openInfo) C.openInfo(msg); }

  /* Build resolvable variant lines from the bag, same rule as checkout.js:
     items not yet in Shopify are silently skipped (matches the Stripe path). */
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

  /* ---- PayPal SDK loader (dynamic: client id comes from the server, never hardcoded here) ---- */
  var sdkPromise = null;
  function loadSdk(clientId, currency) {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var existing = document.getElementById("paypal-sdk");
      if (existing) existing.remove();
      var s = document.createElement("script");
      s.id = "paypal-sdk";
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(clientId) +
              "&currency=" + encodeURIComponent(currency || "USD") + "&intent=capture&components=buttons";
      s.onload = function () { resolve(window.paypal); };
      s.onerror = function () { reject(new Error("PayPal SDK failed to load")); };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  var configPromise = null;
  function getConfig() {
    if (!configPromise) {
      configPromise = fetch(CONFIG_URL, { method: "GET", headers: authHeaders() })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .catch(function () { return { ok: false }; });
    }
    return configPromise;
  }

  /* PayPal SDK callback: build the order server-side (re-priced, never trusts
     the client). Throwing here tells the SDK the order could not start. */
  async function createOrder() {
    var built = buildLines();
    if (!built.lines.length) {
      toast((C.t && C.t("checkout.unavailableBody")) || "Checkout is unavailable right now.");
      throw new Error("empty or unresolvable cart");
    }
    var payload = { lines: built.lines };
    payload.lang = (C.getLang && C.getLang()) || document.documentElement.lang || "en";
    var u = (C.auth && C.auth.user) ? C.auth.user() : null;
    if (u && u.email) payload.email = u.email;

    var res = await fetch(CREATE_URL, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.orderId) {
      toast((data && data.error) || (C.t && C.t("checkout.unavailableBody")) || "PayPal checkout is unavailable right now.");
      throw new Error((data && data.error) || "create-paypal-order failed");
    }
    return data.orderId;
  }

  /* PayPal SDK callback: buyer approved in the popup. Confirm + capture
     server-side, then follow the SAME redirect Stripe uses so post-purchase
     (order-confirmation banner, account history, tracking) is identical. */
  async function onApprove(data) {
    var res = await fetch(CAPTURE_URL, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ orderId: data.orderID }),
    });
    var out = await res.json().catch(function () { return {}; });
    if (res.ok && out.redirect) { window.location.href = out.redirect; return; }
    if (res.status === 202) {
      toast(out.message || "Your payment is processing; you will receive a confirmation email shortly.");
      return;
    }
    toast((out && out.error) || (C.t && C.t("checkout.unavailableBody")) || "Payment could not be completed.");
  }

  function onError(err) {
    console.warn("[CloudSkin] PayPal button error:", err);
    toast((C.t && C.t("checkout.unavailableBody")) || "PayPal checkout is unavailable right now.");
  }

  function renderInto(containerId, dividerId, paypalSdk) {
    var el = document.getElementById(containerId);
    if (!el || el.dataset.ppRendered === "1") return;
    el.innerHTML = "";
    paypalSdk.Buttons({
      style: { layout: "horizontal", color: "black", shape: "rect", label: "paypal", height: 48, tagline: false },
      createOrder: createOrder,
      onApprove: onApprove,
      onError: onError,
    }).render("#" + containerId);
    el.dataset.ppRendered = "1";
    var divider = dividerId && document.getElementById(dividerId);
    if (divider) divider.hidden = false;
  }

  /* Mount into the /checkout payment section's PayPal slot. Safe to call
     repeatedly (the slot renders once, guarded by data-pp-rendered). No-op on any
     page without the slot (i.e. everywhere except /checkout). */
  async function mountAll() {
    if (!document.getElementById("paypalButtonCheckout")) return; // only the /checkout page has the slot
    var cfg = await getConfig();
    if (!cfg || !cfg.ok || !cfg.clientId) return; // fail-closed: no live config -> no button, ever
    try {
      var sdk = await loadSdk(cfg.clientId, cfg.currency);
      renderInto("paypalButtonCheckout", null, sdk); // the .co-or divider is static in checkout.html
    } catch (e) {
      console.warn("[CloudSkin] PayPal SDK failed to load; button stays hidden.", e);
    }
  }

  document.addEventListener("DOMContentLoaded", mountAll);
  // Re-run on demand (js/checkout-page.js calls this after the payment section is
  // rendered; renderInto() is idempotent per container).
  C.checkoutPaypal = { mountAll: mountAll };
})();
