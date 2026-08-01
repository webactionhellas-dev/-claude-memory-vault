# Vellum package

Drop-in generic backend AND frontend for Vellum, the house on-canvas
live-site editor (the owner edits the real site by clicking it). Extracted
from the first production deployment of the pattern (backend security
audited PASS 2026-07-23; frontend generalized from the live-audited editor
and verified end to end against a mock backend), client-agnostic, ready for
any house site.

```
vellum-package/
  supabase/
    migrations/0001_vellum_core.sql    schema, RLS, RPCs, throttle, bucket
    functions/vellum-upload/index.ts   password-gated image upload edge fn
  web/
    vellum.config.example.js           per-site public config (copy + fill)
    vellum-content.js                  public applier (every page, deferred)
    vellum-edit-mode.js                the on-canvas editor (armed tabs only)
    vellum-edit-mode.css               editor chrome (vlm- namespaced)
    creator.html + vellum-creator.js   the owner gate that arms the editor
    EXAMPLE.html                       a tiny page wired end to end
    sandbox/                           offline verification (server + mocks)
  INTEGRATION.md                       conventions, adoption steps, invariants
  SAAS-READY.md                        multi-tenant upgrade path
```

Start with INTEGRATION.md: backend adoption first, then "The generic
frontend" section for the includes, the config keys, and the armed-session
lazy loader. Try it locally with `node web/sandbox/serve.mjs`.
