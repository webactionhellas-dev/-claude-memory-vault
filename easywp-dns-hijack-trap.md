---
name: easywp-dns-hijack-trap
description: "Namecheap EasyWP's 'Your Namecheap domain' setup silently rewrites the @ ALIAS/A record, taking down any OTHER site (e.g. a Vercel-hosted storefront) already living on that root domain"
metadata: 
  node_type: memory
  type: reference
  originSessionId: f69617f8-7852-4c5f-8be1-4ee37e93c84c
  modified: 2026-07-28T15:33:58.452Z
---

**What happened (cloudskin.com, 2026-07-28):** while setting up WordPress for a client's blog via
Namecheap EasyWP (Hosting → EasyWP → Create a new Website), the "Choose a domain" step offered "Your
Namecheap domain" for a domain the account already owned. Selecting it and continuing caused EasyWP to
**automatically rewrite the domain's `@` ALIAS record** from the existing target (Vercel:
`cname.vercel-dns.com`) to EasyWP's own ingress host (`ingress-helicon.easywp.com`). The domain's actual
production site (a live Vercel storefront, unrelated to the blog) went down instantly for every visitor
with a TLS hostname-mismatch error ("connection not private") — the browser got a `*.ingress-*.ewp.live`
certificate instead of the site's real one. A Vercel-side rollback did nothing, because Vercel's
deployment was never the problem; the domain had simply stopped pointing at Vercel.

**Why it's easy to miss:** the EasyWP wizard's own copy says exactly what it's about to do — "The DNS
settings for your chosen domain will automatically update to link to your new EasyWP site" — but that
reads as routine/expected when you're just trying to stand up a blog, not as "this will repoint your
apex domain away from your production host." The `www` CNAME (pointing at the apex) was untouched, so
the fix was a single-record edit, not a rebuild — but diagnosing it took a live TLS cert dump
(`openssl s_client -connect host:443 -servername host | openssl x509 -noout -subject -issuer`) to see
the wrong issuer/CN, since a same-machine `curl` reported a generic-looking cert error that could have
been mistaken for a local/schannel quirk.

**Also silently added, not urgent but worth cleaning up:** a `v=spf1 include:easywp.com ~all` TXT record
on `@`, which can conflict with the domain's real mail path (SPF should reflect whoever actually sends
mail for that domain, e.g. Google Workspace/`SMTP.GOOGLE.COM`) — a deliverability/spam-scoring risk, not
an outage.

**The fix:** Namecheap → Domain List → the domain → Advanced DNS → find the `@` record (ALIAS or A) now
pointing at the EasyWP/ingress host → edit its VALUE back to the original hosting target (for Vercel:
`cname.vercel-dns.com`; note the Namecheap UI has separate Host and Value fields in that row — it is
easy to mis-click and edit the wrong one, verify both after saving). Propagation is fast (the record's
own TTL, often 1–5 min) but not instant.

**How to apply next time:** before running EasyWP/Namecheap's "Create a new Website" (or any hosting
wizard) against a domain that ALREADY hosts a live production site elsewhere (Vercel, Netlify, etc.):
1. Never let the wizard target the domain's own `@`/root or `www` records for a NEW, unrelated purpose
   (a blog, a staging site, anything not meant to replace the live production host).
2. Instead, plan to add ONLY a dedicated subdomain host record afterward (e.g. `blog` →
   whatever the new service needs), and verify in Advanced DNS that `@` and `www` are UNCHANGED once
   the wizard finishes — don't assume "no domain field asked for a subdomain" means "safe," since some
   wizards apply changes to the apex by default and let you narrow scope only in a later step.
3. If a wizard's domain-selection step throws a transient error (e.g. an EasyWP 500), retry once; if it
   persists, prefer starting the new service on a wizard-provided temporary address and pointing a
   SEPARATE subdomain at it manually later, rather than repeatedly retrying "Your Namecheap domain" and
   risking it silently succeeding against the wrong record on a later attempt.

Relates to [[cloudskin-office-session-20260728]] (the incident this was found in) and
[[mike-operator-profile]] (Mike's Namecheap-hosted domains generally point to Vercel; the same trap
applies to any of them).
