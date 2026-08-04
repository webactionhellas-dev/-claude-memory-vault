---
name: palmos-app
description: "PALMOS live 1:1 coaching app — source location unknown, live app is a strong UI shell over a half-built backend"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5a79f364-1455-4438-b772-70aa39b6a313
  modified: 2026-08-02T14:13:55.724Z
---

PALMOS, a live 1:1 fitness-coaching platform for Athens coaches ("Train live. Watch it
back."). Vercel project `palmos`, team `webactionhellascom`
(`prj_IAVq9xFUd1EZTTgAQ0wFfeVM9Bqi`). Next.js + turbopack, Supabase, LiveKit (live),
Mux (recording), storage split across R2 + GCS + Bunny.

**Source is NOT on GitHub AT ALL, and not on the aster laptop.** Proven exhaustively
2026-08-02, do not re-run this hunt:

- aster filesystem: nothing
- obsidian vault, local *and* remote branch: nothing (every "palm" hit is palm trees in
  hotel/villa copy)
- `arxidatos1600`: 3 repos, no palmos
- `webactionhellas-dev`: 3 repos incl. private `webaction-hub` (25 project folders) — no palmos
- `webactionhellas` org: **0 repositories**, verified from inside as an active member.
  Org was created 2026-07-31 and nothing was ever pushed to it. See
  [[github-account-topology]].
- Vercel project `palmos`: **no git repo linked**; latest production deploy carries no
  commit metadata at all.

Every signal says PALMOS was built and deployed straight from a local folder on the
**nospa** machine and never pushed anywhere. One deploy is authored by "nos", and a commit
reads "Re-apply the four fixes the other machine's branch did not carry". Until someone
pushes it from that machine, no other machine can work on it — there is nothing to clone.

**State of the live app, verified while signed in as coach Dimitra (2026-08-02):**

Real, working, correctly-empty endpoints: `/api/calendar`, `/api/billing/summary`,
`/api/live/active`, `/api/favorites`.

Missing entirely (404): `/api/clients`, `/api/sessions`, `/api/bookings`,
`/api/availability`.

`/schedule` is a **mockup that presents itself as a working booking system** — hardcoded
date strip (showed Wed 24 to Sun 28 on Sunday 2 August), a displayed booking the real
calendar API says does not exist, a "6 of 10 credits" counter with no backing table, and
**inert** time-slot buttons that fire zero network requests when clicked. Anyone demoing
this would reasonably believe booking works.

"Pick clients" on `/golive` is a pure no-op (0 dialogs, no state change); its cause is the
`/api/clients` 404. `/api/calendar` returns `tz: "UTC"`, not `Europe/Athens`.

Role bleed: client-facing screens (`/schedule`, `/progress`, `/nutrition`) are reachable
inside the coach account, so the demo coach can book a 1:1 with herself.

**Deploy hygiene problem:** the current production deployment has *no git commit metadata
at all*, and the Supabase RLS/auth-seam deploy carried `gitDirty: 1` on a side branch
`vercel-live`. Nobody can diff what is actually running in production.

Full implementation spec (ordered work + test plan) written to
`C:\Users\aster\Documents\palmos-build-spec.md`.
