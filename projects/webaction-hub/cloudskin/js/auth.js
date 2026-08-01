/* ============================================================
   CLOUDSKIN - authentication (Supabase Auth)
   Exposes CLOUDSKIN.auth for the login page, header state and
   order capture. Safe no-op until supabase-config.js is filled.
   Loads AFTER the supabase-js CDN script and supabase-config.js.
   ============================================================ */
(() => {
  "use strict";
  const C = (window.CLOUDSKIN = window.CLOUDSKIN || {});
  const cfg = window.CLOUDSKIN_SB || {};
  const ready = !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);

  // one shared client for the whole site (null until configured)
  C.sb = ready ? window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  let currentUser = null;
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => { try { fn(currentUser); } catch (e) {} });

  const redirect = (path) => `${location.origin}/${path}`;

  C.auth = {
    configured: () => !!C.sb,
    user: () => currentUser,
    isAdmin: () => !!currentUser && (currentUser.email || "").toLowerCase() === (cfg.adminEmail || "hello@cloudskin.com").toLowerCase(),

    async signUp(email, password, meta = {}) {
      if (!C.sb) return { error: notReady() };
      const { data, error } = await C.sb.auth.signUp({
        email, password,
        options: { data: { full_name: meta.full_name || "", marketing_opt_in: !!meta.marketing_opt_in }, emailRedirectTo: redirect("login.html") }
      });
      // best-effort owner notification to info@cloudskin.com (never blocks the customer)
      if (!error && data && data.user) {
        try {
          fetch(cfg.url + "/functions/v1/cloudskin-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey },
            body: JSON.stringify({ type: "signup", userId: data.user.id })
          }).catch(function () {});
        } catch (e) {}
      }
      return { data, error };
    },
    // send a contact-form message to the owner (info@cloudskin.com)
    async contact(payload) {
      try {
        const res = await fetch((cfg.url || "") + "/functions/v1/cloudskin-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: cfg.anonKey || "", Authorization: "Bearer " + (cfg.anonKey || "") },
          body: JSON.stringify(Object.assign({ type: "contact" }, payload))
        });
        const out = await res.json().catch(() => ({}));
        return { ok: res.ok && out.ok, error: out.error };
      } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    },
    async signIn(email, password) {
      if (!C.sb) return { error: notReady() };
      const { data, error } = await C.sb.auth.signInWithPassword({ email, password });
      return { data, error };
    },
    async signInWithGoogle() {
      if (!C.sb) return { error: notReady() };
      return C.sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect("login.html") } });
    },
    async resetPassword(email) {
      if (!C.sb) return { error: notReady() };
      return C.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect("login.html") });
    },
    async signOut() {
      if (!C.sb) return;
      await C.sb.auth.signOut();
      currentUser = null; notify(); syncHeader();
    },
    onChange(fn) { listeners.add(fn); if (currentUser !== undefined) fn(currentUser); return () => listeners.delete(fn); }
  };

  // newsletter capture → Supabase (public insert-only table; duplicates count as success)
  C.newsletter = {
    async subscribe(email, source) {
      email = String(email || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "invalid email" };
      if (!C.sb) return { ok: false, error: "not configured" };
      const { error } = await C.sb.from("newsletter_signups").insert({ email, source: source || "site" });
      if (error && !/duplicate|unique|already|23505/i.test((error.message || "") + (error.code || ""))) return { ok: false, error: error.message };
      return { ok: true };
    }
  };

  function notReady() { return { message: "Accounts are being set up. Please check back shortly." }; }

  // reflect the signed-in state on the header account icon (link → account/login)
  function syncHeader() {
    // The account icon (and mobile menu entry) go to the account page when signed in,
    // the login page when not - so a returning, still-signed-in customer lands on their
    // account, never the sign-in form again.
    document.querySelectorAll('a[href="login.html"], a[href="account.html"]').forEach(a => {
      if (!a.closest('.nav__icons') && !a.classList.contains('mmenu__account')) return;
      a.setAttribute("href", currentUser ? "account.html" : "login.html");
      a.classList.toggle("is-authed", !!currentUser);
      a.setAttribute("aria-label", currentUser ? "Account" : (C.t ? C.t("a11y.account") : "Account"));
    });
  }

  // boot: read the current session, then watch for changes
  if (C.sb) {
    C.sb.auth.getSession().then(({ data }) => {
      currentUser = (data && data.session && data.session.user) || null;
      notify(); syncHeader();
    });
    C.sb.auth.onAuthStateChange((_evt, session) => {
      currentUser = (session && session.user) || null;
      notify(); syncHeader();
    });
  }
})();
