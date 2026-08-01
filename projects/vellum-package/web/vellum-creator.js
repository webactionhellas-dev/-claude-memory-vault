/* =====================================================================
   VELLUM / vellum-creator.js - the owner-gated entry to the live editor.
   ---------------------------------------------------------------------
   This is the ONLY way the on-canvas editor arms. The owner enters her
   password here; we verify it server-side via the auth RPC (cfg.rpc.auth,
   default "vellum_auth"), and on success we ARM the editor session and
   send her into the real site, where vellum-edit-mode.js takes over.

   ARMING CONTRACT (sessionStorage; key names from cfg.session, defaults
   shown) - vellum-edit-mode.js reads exactly these:
     vlm-armed = "1"   -> editor is armed; the edit layer mounts + auto
                          enters edit mode on every page for THIS tab only.
                          Absent => the edit layer renders ZERO chrome (the
                          public never sees it). Cleared by "Done".
     vlm-pw    = <pw>  -> the verified password, re-sent per save/upload
                          write (no token model; the editor spans real page
                          navigation so it lives in tab-scoped sessionStorage
                          and is cleared on Done).
   Optional cfg.session.setOnArm = { key: value, ... } lets a gated site
   also open its own doors for the owner (e.g. a store-access pass).

   Nothing is written to the site here; this only authenticates and arms.
   ===================================================================== */
(function () {
  "use strict";
  var cfg = window.VELLUM_CFG || {};
  var SES = cfg.session || {};
  var K_ARMED = SES.armed || "vlm-armed";
  var K_PW = SES.pw || "vlm-pw";
  var AUTH = (cfg.rpc && cfg.rpc.auth) || "vellum_auth";
  var RETURN = cfg.returnPath || (cfg.editablePages && cfg.editablePages[0]) || "/";

  var form = document.getElementById("creatorForm");
  var pwInput = document.getElementById("pw");
  var errEl = document.getElementById("err");
  var goBtn = document.getElementById("go");

  function showErr(msg) { errEl.textContent = msg || ""; }
  function busy(on) { goBtn.disabled = on; goBtn.textContent = on ? "Checking..." : "Enter editor"; }

  // Already armed in this tab (e.g. she reloaded the gate page): go straight in.
  try { if (sessionStorage.getItem(K_ARMED) === "1") { location.replace(RETURN); return; } } catch (e) {}

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    showErr("The editor is not configured yet. Please contact your developer.");
    if (goBtn) goBtn.disabled = true;
    return;
  }

  var sb = window.VELLUM_SB_CLIENT || window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  window.VELLUM_SB_CLIENT = sb;

  function arm(pw) {
    try {
      sessionStorage.setItem(K_PW, pw);
      sessionStorage.setItem(K_ARMED, "1");
      var extra = SES.setOnArm || {};
      Object.keys(extra).forEach(function (k) { sessionStorage.setItem(k, String(extra[k])); });
    } catch (e) {}
    location.href = RETURN;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = (pwInput.value || "").trim();
    showErr("");
    if (!pw) { pwInput.focus(); return; }
    busy(true);
    // The auth RPC is SECURITY DEFINER: it bcrypt-checks the password server
    // side (with the per-IP throttle) and returns a boolean. No token is
    // issued; the password is re-sent per write.
    sb.rpc(AUTH, { p_password: pw }).then(function (r) {
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
