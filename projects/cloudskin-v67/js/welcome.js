/* ============================================================
   CLOUDSKIN welcome offer
   Fresh-start behaviour: appears ONCE PER SESSION (sessionStorage),
   ~3s after the first homepage load of that session. Returning
   visitors in a brand-new session see it again, UNLESS they have
   subscribed, in which case it never shows again (localStorage).
   ============================================================ */
(() => {
  "use strict";

  // Homepage only: the welcome offer must NOT appear on collection / product / login pages.
  const path = location.pathname;
  if (path !== "/home" && !path.endsWith("/home.html")) return;

  // The Vellum live editor (armed owner session) must NOT see the shopper newsletter popup: it locks
  // page scroll and clutters the owner's editing session. Public shoppers are unaffected.
  try { if (sessionStorage.getItem("vlm-armed") === "1") return; } catch (e) {}

  const $ = (s, c = document) => c.querySelector(s);
  const C = window.CLOUDSKIN || {};
  const t = (k) => (C.t ? C.t(k) : k);

  const SUB_KEY = "cloudskin_welcome_subscribed"; // localStorage: subscribed, never show again
  const SEEN_KEY = "cloudskin_welcome_session";   // sessionStorage: already shown this session
  // The live Stripe promotion code behind the 10% offer. The checkout session sets
  // allow_promotion_codes, so this is redeemable at payment. Keep it in step with
  // the promotion code in Stripe.
  const WELCOME_CODE = "WELCOME10";

  function build() {
    const wrap = document.createElement("div");
    wrap.className = "welcome";
    wrap.innerHTML = `
      <div class="welcome__overlay" data-welcome-close></div>
      <div class="welcome__box" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">
        <button class="welcome__close" data-welcome-close aria-label="Close">&times;</button>
        <div class="welcome__imgs" aria-hidden="true">
          <img src="img/shoot/campaign-white-pool.jpg" alt="" loading="lazy">
        </div>
        <div class="welcome__body">
          <p class="welcome__eyebrow">${t("welcome.eyebrow")}</p>
          <h2 id="welcomeTitle" class="welcome__title">${t("welcome.title")}</h2>
          <p class="welcome__copy">${t("welcome.copy")}</p>
          <form class="welcome__form" id="welcomeForm" novalidate>
            <label class="visually-hidden" for="welcomeEmail">${t("welcome.ph")}</label>
            <input type="email" id="welcomeEmail" name="email" placeholder="${t("welcome.ph")}" autocomplete="email" required>
            <button type="submit">${t("welcome.claim")} <span aria-hidden="true">&rarr;</span></button>
          </form>
          <button class="welcome__skip" data-welcome-close type="button">${t("welcome.no")}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("welcome-open");
    requestAnimationFrame(() => wrap.classList.add("in"));

    const lastFocused = document.activeElement;

    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);

    function close() {
      wrap.classList.remove("in");
      document.body.classList.remove("welcome-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => { wrap.remove(); lastFocused?.focus?.(); }, 420);
    }

    wrap.querySelectorAll("[data-welcome-close]").forEach(el => {
      el.addEventListener("click", close);
      // iOS: when the keyboard collapses mid-tap the layout shifts and the click
      // retargets past the button ("needs two taps"). Touch events stay locked to
      // the touchstart element, so closing on touchend survives the shift; the
      // preventDefault suppresses the now-misaimed synthetic click.
      el.addEventListener("touchend", (e) => { e.preventDefault(); close(); });
    });

    const form = $("#welcomeForm", wrap);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const email = $("#welcomeEmail", wrap);
      if (!email.checkValidity()) { email.reportValidity(); return; }
      if (C.newsletter) C.newsletter.subscribe(email.value.trim(), "welcome").catch(() => {});  // capture the address into newsletter_signups (was silently discarded)
      // also deliver the code by email (server-side Resend via cloudskin-notify; fire and forget)
      try {
        const SBW = window.CLOUDSKIN_SB || {};
        if (SBW.url) fetch(SBW.url.replace(/\/$/, "") + "/functions/v1/cloudskin-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SBW.anonKey || "", Authorization: "Bearer " + (SBW.anonKey || "") },
          body: JSON.stringify({ type: "welcome", email: email.value.trim() })
        }).catch(() => {});
      } catch (e) {}
      try { localStorage.setItem(SUB_KEY, "1"); } catch (e) {}  // subscribed, never show again
      // Hand over the REAL discount code. The popup promises 10% off, so it has to
      // deliver something the customer can actually redeem: WELCOME_CODE is a live
      // Stripe promotion code and the checkout accepts promotion codes. Shown on
      // screen (not only emailed) so the offer is never a dead end.
      const ok = document.createElement("div");
      ok.className = "welcome__ok";
      ok.innerHTML =
        `<p class="welcome__okmsg">${t("welcome.ok")}</p>` +
        `<p class="welcome__codelabel">${t("welcome.codeLabel")}</p>` +
        `<button type="button" class="welcome__code" data-welcome-code aria-label="${WELCOME_CODE}">${WELCOME_CODE}</button>`;
      form.replaceWith(ok);
      // tap/click to copy, with a quiet confirmation on the chip itself
      const chip = ok.querySelector("[data-welcome-code]");
      chip?.addEventListener("click", () => {
        const done = () => { chip.classList.add("is-copied"); setTimeout(() => chip.classList.remove("is-copied"), 1600); };
        try { navigator.clipboard.writeText(WELCOME_CODE).then(done).catch(() => {}); } catch (e) {}
      });
      $(".welcome__skip", wrap)?.remove();
      setTimeout(close, 1800);
    });

    $(".welcome__close", wrap)?.focus();
  }

  // The GDPR cookie banner (shell.js) is a legal, priority overlay at the same
  // stacking level. NEVER show this marketing offer on top of it: a shopper must be
  // able to accept or refuse consent unobstructed. So we wait until they resolve the
  // banner, then present the offer. Returning visitors (stored choice, no banner) see
  // it immediately as before.
  function consentBannerUp() {
    var b = document.getElementById("cookieConsent");
    return !!(b && !b.hidden && b.classList.contains("on"));
  }
  function markSeen() { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {} }
  function showWhenConsentClear() {
    if (!consentBannerUp()) { markSeen(); build(); return; }
    var done = false, iv = null;
    function go() {
      if (done) return; done = true;
      window.removeEventListener("cloudskin:consent", go);
      if (iv) clearInterval(iv);
      setTimeout(function () { markSeen(); build(); }, 650);   // let the banner finish sliding out
    }
    window.addEventListener("cloudskin:consent", go);          // fires on Accept / Reject / Save
    iv = setInterval(function () { if (!consentBannerUp()) go(); }, 400);  // fallback for any dismiss path
  }

  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (localStorage.getItem(SUB_KEY)) return;      // subscribed once, never again
      if (sessionStorage.getItem(SEEN_KEY)) return;   // already shown this session
    } catch (e) {}
    setTimeout(showWhenConsentClear, 3000);
  });
})();
