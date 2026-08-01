---
name: mike-operator-profile
description: "Who Mike is as an operator — runs the Web Action web agency, is building an autonomous AI-agent fleet to run it, and the standards/working-style distilled from his actions"
metadata: 
  node_type: memory
  type: user
  originSessionId: 1a0debd0-7bdf-45ac-b42d-966c016d9330
---

Mike (Michael; agency **Web Action / webactionhellas**, Greek market) runs a boutique web-design agency and is deliberately building an **autonomous AI-agent fleet to run it** rather than just asking for one-off sites. Almost every session is either a real business site (Greek local brands — hotels, villas, restaurants, groomers, tattoo/beauty, shops, cafes) or a move to make the fleet itself smarter. He interacts largely by **voice-to-text**, so business names arrive garbled (this is why the `brief` skill exists). Windows 10, Mini-ITX PC, wants local AI; single LG monitor where he **cannot distinguish dark/black tones** (see [[mike-dark-tone-visibility]]) — design and verify with that in mind.

**What he is really doing:** training a team, not just requesting output. His corrections become invariants, skills, agents, and a **gated learning loop** (house-playbook + one-lesson-per-memory-file). The fleet he named and built is real: Nami (design lead) · Echo (backend) · Corky (debug/perf) · Twitch (scrape) · Lyra (copy) · Boss Master (orchestrator) + website-builder / site-qa / deploy-launch. See [[agency-agent-fleet]], [[nami-design-standards]], [[house-starters]].

**His non-negotiables (learned from what he rejects, not just what he says):**
- **Real data only, business-relevance-first** — real logo/photos/reviews/copy sourced first; every visual, 3D, animation, section must be ABOUT what the business sells. He kills stock photos and abstract orbs/particles as "useless / generic." This is his single most-repeated correction. See [[business-relevance-first]].
- **World-class or nothing** — expensive-feeling, editorial, award-site bar; named bespoke design system per business; distinctive foundry-level type (never Inter/Roboto as the brand face); GSAP+Lenis house motion. Zero AI-slop.
- **No em-dashes anywhere.** **Native professional Greek** (Greek default, bilingual EL/EN, never translationese).
- **Security is top priority** — no site hackable, no data leaked (security gate is his stated #1).
- **Deploy is gated** — house default "not deployed"; production only on an explicit go.
- **Least tokens** — deterministic work goes to scripts, run once; narrow agent scope to keep the loop fast.

**How he works:** checkpointed autonomy (approve design brief → autonomous build → review → gated deploy). Match effort to task — lightweight-by-default, full pipeline only for real builds (he wrote this refinement into CLAUDE.md himself). Honest scope always (guarantee the automated gate, never claim "zero bugs"); verify claims against real output. He values the system compounding over time — preserve durable lessons, update don't duplicate.
