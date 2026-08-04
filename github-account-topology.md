---
name: github-account-topology
description: "Which GitHub account holds what for Web Action, and why the aster laptop cannot see the webactionhellas org repos"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5a79f364-1455-4438-b772-70aa39b6a313
  modified: 2026-08-02T14:13:45.151Z
---

Mapped 2026-08-02 while hunting for the PALMOS source. There are **three** GitHub
identities in play, and the aster laptop is logged into the one with the least access.

| Identity | Type | Holds | Reachable from aster? |
|---|---|---|---|
| `arxidatos1600` | user | agentfleet, claude-memory-vault, BERTO-LUCCI | yes, this is what `gh` is authed as |
| `webactionhellas-dev` | user | `-claude-memory-vault` (the obsidian vault remote), `webaction-hub` (private, 25 project folders), `webteam` (agents/skills/memory brain) | yes |
| `webactionhellas` | **organization** | the real project repos, per Mike | **no** |

**The trap:** `gh` on aster is authenticated as `arxidatos1600`, which is not a member of
the `webactionhellas` org. `gh api orgs/webactionhellas/repos` returns empty and
`gh api repos/webactionhellas/<name>` returns **404, not 403** — GitHub deliberately
hides private-repo existence from accounts that lack access. So a 404 here does NOT mean
the repo is absent; it means the current login cannot see it. Do not conclude "the repo
does not exist" from a 404 on that org.

**RESOLVED 2026-08-02.** The cause was a **pending, never-accepted org invitation** sitting
at `github.com/settings/organizations`. Accepted it; `arxidatos1600` is now an active
member (role: member). No re-auth was needed — the existing CLI token already had
`repo` + `read:org`, so access worked the instant membership went active.

**And the punchline: the org is EMPTY.** Verified from inside as a member:

```
orgs/webactionhellas → public_repos: 0, total_private_repos: 0, owned_private_repos: 0
created_at: 2026-07-31   (org is brand new)
```

So the org holds nothing. Project source does NOT live there. It lives in
`webactionhellas-dev/webaction-hub` (private, 25 project folders) — that is the real
project repo for this agency. Check there first, not the org.

**Related:** the Vercel side is a separate identity again — team `webactionhellascom`
(`team_fAnVpAdOPwPZAR4kW0o2BwID`), CLI authed as `webactionhellas-dev`. Vercel access does
not imply GitHub access, and several Vercel projects (PALMOS among them) have **no git
repo linked at all**, so they deploy from a local folder and leave no traceable commit.

See [[palmos-app]] for the project this was discovered on.
