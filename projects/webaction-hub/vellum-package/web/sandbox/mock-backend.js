/* Vellum sandbox - in-page MOCK of the backend surface (offline).
   Stands in for the supabase-js CDN script (sandbox/serve.mjs swaps the
   tag). Implements exactly the client call contracts the real backend
   exposes, so vellum-content.js / vellum-edit-mode.js / vellum-creator.js
   run UNMODIFIED against it:
     - supabase.createClient(url, key) -> client
     - client.from(<contentTable>).select('key,value') -> {data, error}
     - client.rpc(<auth>, {p_password}) -> {data: boolean}
     - client.rpc(<save>, {p_password, p_items}) -> {data, error}
     - client.rpc(<del>,  {p_password, p_keys})  -> {data: n, error}
     - fetch(<...>/functions/v1/<uploadFunction>, {password, handle,
       filename, contentType, dataBase64, dest?}) -> {url}
   Every call is recorded on window.__MOCK for the verification script. */
(function () {
  var IMG_LIVE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiIGZpbGw9IiMyZjdkNWIiLz48dGV4dCB4PSI1MCUiIHk9IjUyJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPmxpdmU8L3RleHQ+PC9zdmc+";
  var BG_LIVE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM2YjNhMmUiLz48L3N2Zz4=";
  var UPLOADED = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiIGZpbGw9IiNiOThhNGYiLz48dGV4dCB4PSI1MCUiIHk9IjUyJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPnVwbG9hZGVkPC90ZXh0Pjwvc3ZnPg==";

  var M = window.__MOCK = {
    password: "sandbox-pass",
    // the "already saved" content the applier must apply on load
    rows: [
      { key: "home.hero.title", value: "Live content from the mock backend" },
      { key: "home.hero.image", value: IMG_LIVE },
      { key: "home.hero.cta",   value: "__about" },
      { key: "home.band.bg",    value: BG_LIVE },
      // products page: one pre-saved flag so the applier merge is observable
      { key: "product.aria-top.isNew", value: "1" }
    ],
    selects: [], authCalls: [], saves: [], deletes: [], uploads: [], rpcErrors: [],
    uploadedUrl: UPLOADED
  };

  function cfg() { return window.VELLUM_CFG || {}; }
  function rpcNames() { var c = cfg(); return c.rpc || { auth: "vellum_auth", save: "vellum_save", del: "vellum_delete" }; }
  function ok(data) { return Promise.resolve({ data: data === undefined ? null : data, error: null }); }
  function fail(msg) { return Promise.resolve({ data: null, error: { message: msg } }); }

  var CLIENT = {
    from: function (table) {
      return {
        select: function (cols) {
          M.selects.push({ table: table, cols: cols });
          if (table !== (cfg().contentTable || "site_content")) return fail("relation does not exist: " + table);
          return ok(M.rows.map(function (r) { return { key: r.key, value: r.value }; }));
        }
      };
    },
    rpc: function (name, args) {
      var n = rpcNames(); args = args || {};
      if (name === n.auth) {
        M.authCalls.push({ name: name, ok: args.p_password === M.password });
        return ok(args.p_password === M.password);
      }
      if (name === n.save) {
        if (args.p_password !== M.password) { M.rpcErrors.push({ name: name, reason: "bad password" }); return fail("invalid password"); }
        M.saves.push({ name: name, items: JSON.parse(JSON.stringify(args.p_items || {})) });
        return ok(null);
      }
      if (name === n.del) {
        if (args.p_password !== M.password) { M.rpcErrors.push({ name: name, reason: "bad password" }); return fail("invalid password"); }
        var keys = (args.p_keys || []).slice();
        M.deletes.push({ name: name, keys: keys });
        return ok(keys.length);
      }
      M.rpcErrors.push({ name: name, reason: "unknown rpc" });
      return fail("unknown rpc: " + name);
    }
  };

  window.supabase = { createClient: function () { return CLIENT; } };

  // intercept ONLY the Vellum upload edge-function call; everything else passes through
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opts) {
    var u = String(url || "");
    var fn = "/functions/v1/" + (cfg().uploadFunction || "vellum-upload");
    if (u.indexOf(fn) >= 0) {
      var payload = {};
      try { payload = JSON.parse((opts && opts.body) || "{}"); } catch (e) {}
      var rec = {
        url: u,
        headers: (opts && opts.headers) || {},
        fields: {
          password: payload.password, handle: payload.handle, filename: payload.filename,
          contentType: payload.contentType, dest: payload.dest,
          hasDataBase64: typeof payload.dataBase64 === "string" && payload.dataBase64.indexOf("data:image/") === 0
        }
      };
      M.uploads.push(rec);
      if (payload.password !== M.password) {
        return Promise.resolve(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }));
      }
      return Promise.resolve(new Response(JSON.stringify({ url: M.uploadedUrl }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    return realFetch ? realFetch(url, opts) : Promise.reject(new Error("fetch unavailable"));
  };
})();
