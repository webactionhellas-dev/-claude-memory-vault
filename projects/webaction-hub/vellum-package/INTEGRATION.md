# Vellum backend package - integration guide

Vellum is the house on-canvas live-site editor: the owner clicks any tagged text,
image, or link on the real rendered site and edits it in place. This package is
the GENERIC BACKEND for it: one Supabase migration, one edge function, one
config convention. It is the production-proven house architecture (live on the
first client site, security-audited PASS 2026-07-23) with every client-specific
name removed.

Frontend status: SHIPPED. The generic frontend lives in `web/`:
`vellum-content.js` (public applier), `vellum-edit-mode.js` +
`vellum-edit-mode.css` (the on-canvas editor), `creator.html` +
`vellum-creator.js` (the owner gate). All of it is generalized from the
production-proven first-client implementation, reads every site-specific
value from `window.VELLUM_CFG`, and targets exactly the contracts below
(verified end to end against a mock backend; see "The generic frontend"
section near the end of this file, including the offline sandbox).

## Architecture in one paragraph

All editable content lives in one flat key -> value table, `site_content`,
which the public can only SELECT (RLS, zero write policies). Every write goes
through SECURITY DEFINER RPCs (`vellum_save`, `vellum_delete`) that open with a
bcrypt (cost 12) password check plus a per-IP throttle (`vellum_verify`, 10
fails per 15 minutes -> 15 minute lockout, fail-safe: a throttle infrastructure
error falls back to plain bcrypt, never deny-all). Image uploads go through the
`vellum-upload` edge function: password checked FIRST, MIME allowlist
(jpg/png/webp), size cap, magic-byte sniff, traversal-safe paths, then a
service-role write into a public-READ storage bucket with no client write
policies. The frontend applies overrides with `textContent` for text and
attribute-only writes for images and links, which is the load-bearing XSS
guard.

## The tagging convention (package standard)

A site opts an element into editing by tagging it. The applier reads the
attribute, looks the key up in the content map, and applies the override.
Keys are dotted paths, e.g. `home.hero.title` or `product.<handle>.images.<colour>`.

| Attribute            | Applies as                                       | Notes                                                                 |
| -------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `data-content`       | `el.textContent = value`                         | Text only, never HTML. Empty/absent value keeps the built-in copy.     |
| `data-content-img`   | `el.src = value` + remove `srcset` + rewrite any `<picture>` sources | Attribute-only. The saved focal point lives at `<key>.pos` and applies as `object-position`. |
| `data-content-link`  | `el.href` from the config `linkTargets` whitelist | The stored value is a SLUG, never a raw URL. Unknown/empty slug leaves the built-in href untouched. |
| `data-content-bg`    | `el.style.setProperty('--vlm-bg', 'url("<escaped>")')` | For CSS-background sections; the stylesheet layers gradients over `var(--vlm-bg, url(default))`. Quotes/backslashes in the URL are escaped before injection. |

Value conventions: everything is a string. `''` (empty) means "revert to the
built-in default" (the applier fail-opens). Multi-value fields (e.g. photo
lists) are newline-joined URLs under one key. Boolean flags are `'1'`/`'0'`
with key-absent meaning "keep the default".

Future alias: `data-edit="text|image|link|bg"` will be accepted as a synonym
by the generic frontend when it lands; new builds should keep using the
`data-content*` attributes above until then, they remain the canonical form.

## What a page includes (4 items)

1. `supabase-js` (UMD build from CDN, or bundled): provides `window.supabase`.
2. `vellum.config.js` (copy `web/vellum.config.example.js`, fill in): provides
   `window.VELLUM_CFG` with the project URL, anon key, and whitelists.
3. The content applier `web/vellum-content.js`: fetches the content table with
   the anon key, applies overrides per the table above, fires
   `vellum:content-ready`. Include on EVERY public page, deferred.
4. The editor, via the ARMED-SESSION LAZY LOADER (the default integration
   pattern): public pages carry only this tiny inline snippet at the end of
   `<body>`; the editor CSS + JS download ONLY in a tab the creator gate
   armed, so the public pays ~0.3 KB and never sees a hint of the editor.

   ```html
   <script>try{if(sessionStorage.getItem('vlm-armed')==='1'){
     var l=document.createElement('link');l.rel='stylesheet';l.href='/js/vellum-edit-mode.css';document.head.appendChild(l);
     var s=document.createElement('script');s.src='/js/vellum-edit-mode.js';s.defer=true;document.body.appendChild(s);
   }}catch(e){}</script>
   ```

   (Adjust the two paths; add the site's cache-bust query if it uses one. As
   a second line of defense the editor ALSO self-gates on the same
   sessionStorage flag and renders zero chrome, zero listeners when absent,
   so including it unconditionally is safe, just not free.)

Plus one gate page: `/creator` (not linked anywhere public). It shows a
password field, calls the `vellum_auth` RPC, and on `true` sets the arming
contract in sessionStorage (`vlm-armed = '1'`, `vlm-pw = <password>`) and
redirects into the site. The password is re-sent per write RPC (tab-scoped
session, cleared by the editor's Done button); it never appears in any bundle.

## Adopting on a fresh Supabase project (exact steps)

1. Create (or pick) the site's Supabase project. Fleet rule: `get_cost` +
   `confirm_cost` before creating anything that bills.
2. Run `supabase/migrations/0001_vellum_core.sql` (SQL editor paste, or
   `supabase db push`, or the MCP `apply_migration`). Idempotent.
3. Seed the owner password: run the commented `vellum_secret` insert from
   section 3 of the migration with a STRONG password, directly in the SQL
   editor. Delete the query from the editor history afterwards (it contains
   the plaintext). Rotation later = re-run the same statement.
4. Deploy the edge function: `supabase functions deploy vellum-upload` from
   the package folder (or the MCP `deploy_edge_function`). Keep the default
   verify_jwt ON. Optionally `supabase secrets set VELLUM_BUCKET=...`,
   `VELLUM_MAX_UPLOAD_MB=...`, `VELLUM_ALLOWED_ORIGIN=https://www.example.com`
   (set the origin one for production).
5. Copy `web/vellum.config.example.js` into the site as `vellum.config.js`,
   fill in the project URL + anon key (Dashboard -> Project Settings -> API),
   and list the site's real link targets and editable pages.
6. Verify against reality before wiring the frontend: run the verification
   block at the bottom of the migration (auth true/false, save + delete
   round-trip on `__vellum_test`, anon direct-write denied), then run the
   Supabase security advisors and confirm `site_content` shows only the
   public-SELECT policy.
7. Tag the site's editable elements per the convention above, add the 4
   includes, and copy `web/creator.html` + `web/vellum-creator.js` in as the
   `/creator` page (unlinked, noindex; adjust its three script paths).

### House starters

- `web-action-commerce-starter` (Astro 7 + Supabase): this migration coexists
  with the starter's `supabase/migrations/0001_init.sql` on the same project.
  Verified: no name collisions (the starter owns profiles/products/inventory/
  orders/order_items; Vellum owns site_content/vellum_*). Save it as the next
  numbered migration in that repo.
- `web-action-marketing-starter` (Next.js 15): the starter ships without
  Supabase; adopting Vellum means creating a project and doing steps 1 to 6,
  then loading the config + scripts (a small client component or `<Script>`
  tags in the root layout).

## Security invariants (an adopting site MUST keep all of these)

1. `site_content` keeps RLS enabled with EXACTLY one policy: public SELECT.
   Never add a write policy; writes only exist through the RPCs.
2. `vellum_secret` and `vellum_throttle` keep RLS on with ZERO policies and
   stay revoked from anon/authenticated. `vellum_verify` stays revoked too.
3. The applier writes text with `textContent` ONLY. Never `innerHTML`, never
   `insertAdjacentHTML`, no exceptions. This is the load-bearing XSS guard:
   the content table is owner-writable, and an owner account (or leaked
   password) must not become script execution on every visitor.
4. Images/links apply as attributes only (`src`, `href`); link values resolve
   through the config whitelist, never applied as raw URLs; CSS background
   URLs are escaped before entering `url("...")`.
5. Only the anon (publishable) key ships client-side. The service-role key
   exists ONLY inside the edge function environment. The owner password is
   never in any repo, bundle, or client file; it lives in the owner's head
   and, per armed tab, in sessionStorage.
6. The edge function keeps its order: password first (401 before any decode),
   then MIME allowlist + size cap + magic-byte sniff + sanitized path, and
   `x-upsert: false` (uploads are immutable, no overwrites).
7. The editor renders zero chrome unless armed by `/creator`. No public
   "edit" pill, ever.
8. The bucket stays public-READ with no client write policies; if you rename
   it, rename it in BOTH the migration and the function env.
9. Re-run the Supabase security advisors after any schema change.

## Client call contracts (for the frontend lane)

- Login: `sb.rpc('vellum_auth', { p_password }) -> boolean`
- Save: `sb.rpc('vellum_save', { p_password, p_items: { key: value, ... } })`,
  debounced batch, retry-safe (keep pending keys on error, beforeunload guard).
- Revert: prefer `sb.rpc('vellum_delete', { p_password, p_keys: [...] })`
  (returns rows deleted); saving `''` also works (applier fail-opens empty).
- Upload: `POST <supabaseUrl>/functions/v1/vellum-upload` with headers
  `Content-Type: application/json`, `apikey: <anon>`,
  `Authorization: Bearer <anon>`; body
  `{ password, handle, filename, contentType, dataBase64, dest? }`;
  response `{ url }`. Client resizes to 2560px JPEG q0.88 before upload.

## Migrating an existing CloudSkin-pattern site

Name map (data copies over 1:1, `key`/`value` semantics identical):
`cloudskin_content -> site_content`, `studio_secret -> vellum_secret`,
`studio_auth_throttle -> vellum_throttle`, `studio_verify -> vellum_verify`,
`studio_auth -> vellum_auth`, `studio_save -> vellum_save`,
`studio_delete -> vellum_delete`, `studio-upload -> vellum-upload`,
bucket `product-media -> site-media` (or keep the old bucket via
`VELLUM_BUCKET`). CloudSkin itself stays on its live `studio_*` names; do not
migrate it while it is in production use without a dedicated cutover plan.

## The generic frontend (shipped, in `web/`)

| File                   | Role                                                            |
| ---------------------- | --------------------------------------------------------------- |
| `vellum-content.js`    | Public applier. Every page, deferred. Fail-open everywhere.      |
| `vellum-edit-mode.js`  | The on-canvas editor. Loaded only for armed sessions.            |
| `vellum-edit-mode.css` | The editor chrome (all `vlm-` namespaced, mounts in `#vlm-root`).|
| `creator.html` + `vellum-creator.js` | The owner gate: server-side auth, then arms the tab. |
| `EXAMPLE.html`         | A tiny page wired end to end (attrs + config + loader).          |
| `sandbox/`             | Offline verification: static server + in-page mock backend.      |

Everything site-specific comes from `window.VELLUM_CFG`. Beyond the backend
keys documented in `vellum.config.example.js`, the frontend reads these
OPTIONAL keys (all safe to omit; the appendix in the example file shows them):

- `siteName`: shown in the editor bar ("Editing <siteName>").
- `returnPath`: where the creator gate sends the owner after arming
  (default: `editablePages[0]`, else `/`).
- `revert`: `"empty"` (default; revert saves `''` and the applier fail-opens
  to the built-in) or `"delete"` (true row delete via `rpc.del`). Read at
  call time, so it is switchable per environment.
- `linkLabels` / `linkGroups`: friendly names and grouping for the link
  picker; without them, slugs are prettified into one "Pages" group.
- `pageLabels`: page filename -> label for the "Your edits" drawer.
- `session.setOnArm`: extra sessionStorage keys the gate sets on arm (e.g. a
  store-access pass on a gated site). Kept on Done, by design.
- `menuPin`: `{ item, menu }` selectors for holding a hover menu open while
  its poster is edited (defaults `.nav__item` / `.mega`).
- `products`: the product-catalog hooks (below). ABSENT on a marketing site:
  every product, merchandising, PDP-gallery and Complete-the-Look code path
  is feature-gated on it and degrades to nothing, verified crash-free.

Product hooks (`cfg.products`): `list()` returns the live catalog array
(objects with `handle`, `title`, `category`, `gender`, `images`);
`cardSelector`/`cardName`/`cardMedia` describe the card markup;
`orderedContainers` are the grids/rails that follow catalog order,
`curatedContainers` the hand-picked rails the editor must never re-rank;
`categories`/`audiences` (+ `audienceLabels`) drive the merch panel segments
and are omitted from saves when empty; `trendingDefaultOn` mirrors a site
whose Trending rail is on-unless-removed; `manage(p)` filters test items out
of the drawer; `thumbFor(p)`, `cardHTML(p, i)`, `productUrl(handle)` are
render helpers (`cardHTML` + `pdp.completeLookRail` together enable the
Complete-the-Look picker). `pdp` describes the product page: `root`, `watch`
(re-render observer target), `thumbs`, `mainImage`, `colourName`,
`handleParam`, `completeLookRail`/`completeLookTitle`/`completeLookMax`,
`maxPhotos`, and `textRules` (`{selector, key}`, `{selector, key,
perIndex}`, or `{selector, sharedKey}`) for tagging runtime-rendered copy.

The site's card factory can consume what the applier merges onto the live
products: `p._vlmImgs` (per-colour photo lists), `p._orderOverride`
(1-based), `p._hidden`, plus the plain `bestSeller/isNew/trending/gender/
category/badge` fields. Re-renders listen for `vellum:products-updated`.

Hard-trap fixes carried over verbatim from the production build (do not
"simplify" these away): bounded `freeCoveredImages` climb (max 4 hops, never
onto MAIN/BODY/HEADER/FOOTER/NAV/HTML, interactive controls re-enabled inside
neutralised sections) re-run on scroll so below-fold images free as they
appear; editor chrome in a site grid spans `grid-column: 1 / -1`; single
photo thumb strips hidden by the site are force-shown in edit mode (the
editor adds `.vlm-thumbs-forced` when it finds the strip `display:none`; if
the site also collapsed the grid TRACK, add one per-site rule like
`body.vlm-mode .gallery--single{grid-template-columns:66px 1fr;}`); icon-only
bar under 380px so Done never clips; MutationObserver re-tags and FLIP
cleanups debounce via `setTimeout`, never rAF (webviews throttle rAF);
`wakeLazyImages` when armed; contenteditable is `plaintext-only` with paste
forced to text/plain, a live element-stripping MutationObserver, and a
textContent-only commit (the load-bearing XSS invariant, never innerHTML);
the hover ring hides on scroll; an emptied field fail-opens back to the
original; zero chrome without the armed session.

One addition over the original: the applier dispatches
`vellum:content-applied` after every apply pass and the editor re-asserts
the session's edits on top, so the applier's delayed re-apply (for late
i18n/shell re-renders) can never roll a just-committed edit back to the
previously published value. The applier also skips any element currently
carrying `.vlm-editing`.

### Offline sandbox (how the package was verified, rerunnable)

```
cd vellum-package/web
node sandbox/serve.mjs            # http://localhost:3070/
```

`/` is EXAMPLE.html, `/creator` the gate (sandbox password `sandbox-pass`),
`/sandbox/products.html` the product-layer page. The server swaps the
supabase-js CDN tag for `sandbox/mock-backend.js` and `vellum.config.js` for
`sandbox/config.js`, so the shipped files run byte-identical against in-page
stubs that record every RPC/upload call on `window.__MOCK` (no network, no
real Supabase). Verified green end to end: non-armed pages load zero editor
bytes and zero chrome; the gate arms only on a server-verified password;
text/image/link edits round-trip through `vellum_save` and `vellum-upload`
with byte-compatible payloads; revert works in both modes; the armed session
survives navigation; Done disarms; the product layer saves the full
`product.<h>.*` key set; zero console errors throughout.

## Future

- `data-edit="text|image|link|bg"` alias for the `data-content*` attributes
  (both applier and editor); `data-content*` stays canonical until then.
