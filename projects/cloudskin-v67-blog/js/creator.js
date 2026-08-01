/* =====================================================================
   VELLUM / creator.js  -  the owner-gated entry to the live editor.
   ---------------------------------------------------------------------
   This is the ONLY way the on-canvas editor arms. The owner enters her
   password here; we verify it server-side via the studio_auth RPC (the
   same gate /studio uses), and on success we ARM the editor session and
   send her into the real site, where js/edit-mode.js takes over.

   ARMING CONTRACT (sessionStorage) - js/edit-mode.js reads exactly these:
     vlm-armed = "1"   -> editor is armed; edit-mode.js mounts + auto-enters
                          edit mode on every page for THIS tab only. Absent
                          => edit-mode.js renders ZERO chrome (public never
                          sees it). Cleared by the editor's "Done" button.
     vlm-pw    = <pw>  -> the verified password, re-sent per studio_save /
                          studio-upload write (mirrors studio.js, which holds
                          PW in memory; the editor spans real page nav so it
                          must survive navigation -> sessionStorage, tab-scoped,
                          cleared on Done). Flagged security tradeoff; the store
                          is gated/pre-launch and this keeps the existing pw.
     cs_gate_ok = "1"  -> lets the authenticated owner through the store-access
                          gate so she can view + edit the gated storefront.

   Nothing is written to the site here; this only authenticates and arms.
   ===================================================================== */
(function () {
  "use strict";
  var cfg = window.CLOUDSKIN_SB || {};
  var form = document.getElementById("creatorForm");
  var pwInput = document.getElementById("pw");
  var errEl = document.getElementById("err");
  var goBtn = document.getElementById("go");
  var RETURN = "/home";

  function showErr(msg) { errEl.textContent = msg || ""; }
  function busy(on) { goBtn.disabled = on; goBtn.textContent = on ? "Checking…" : "Enter editor"; }

  // Already armed in this tab (e.g. she reloaded /creator): go straight in.
  try { if (sessionStorage.getItem("vlm-armed") === "1") { location.replace(RETURN); return; } } catch (e) {}

  if (!cfg.url || !cfg.anonKey || !window.supabase) {
    showErr("The editor is not configured yet. Please contact your developer.");
    if (goBtn) goBtn.disabled = true;
    return;
  }

  var sb = window.CLOUDSKIN_SB_CLIENT || window.supabase.createClient(cfg.url, cfg.anonKey);
  window.CLOUDSKIN_SB_CLIENT = sb;

  function arm(pw) {
    try {
      sessionStorage.setItem("vlm-pw", pw);
      sessionStorage.setItem("vlm-armed", "1");
      sessionStorage.setItem("cs_gate_ok", "1");   // let the owner past the store-access gate
    } catch (e) {}
    location.href = RETURN;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = (pwInput.value || "").trim();
    showErr("");
    if (!pw) { pwInput.focus(); return; }
    busy(true);
    // studio_auth is a SECURITY DEFINER RPC that bcrypt-checks the password
    // server-side and returns a boolean. No token is issued; the password is
    // re-sent per write (same model as /studio).
    sb.rpc("studio_auth", { p_password: pw }).then(function (r) {
      if (r && r.error) { busy(false); showErr("Could not reach the server. Please try again."); return; }
      if (r && r.data === true) { arm(pw); return; }
      busy(false);
      showErr("That password does not match. Please try again.");
      pwInput.focus(); pwInput.select();
    }).catch(function () {
      busy(false); showErr("Could not reach the server. Please try again.");
    });
  });

  setTimeout(function () { try { pwInput.focus(); } catch (e) {} }, 30);
})();
