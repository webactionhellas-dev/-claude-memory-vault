---
name: user-identity-asteris
description: "The actual operator of this aster machine/session is Asteris, NOT Mike -- Mike is a different person whose agency toolkit was copied here as a template"
metadata: 
  node_type: memory
  type: user
  originSessionId: c7b03d4a-780f-440b-9b50-f1c4b08c1b1d
  modified: 2026-08-02T13:37:05.045Z
---

**The person actually using this machine and its Claude/Jarvis setup is named Asteris** (matches the Windows username `aster`, the email asteriskateris1@gmail.com, and the Telegram bot's own handle `@asterisrighthandbot`). He identifies himself as the owner/principal user of this assistant.

**Why this needed correcting:** [[mike-operator-profile]] and most of the existing project memory (cloudskin, drip-store, dionyssos-hotel, mykonos-prestige, etc.) describe "Mike," a different person who runs the Web Action web agency on his own separate machines (`mikef` home, `nospa` office). Per [[aster-laptop-brain-setup]], this aster machine received a full transplant of Mike's toolkit -- skills, agents, CLAUDE.md house rules -- as a shared template. Every session since then (including this one, until now) kept assuming "the user = Mike" by default, since that's who the inherited memory files talk about. This surfaced as a real, visible bug 2026-08-02: the Jarvis persona (`JARVIS_SYSTEM_PROMPT` in `telegram_relay.py`/`jarvis_voice.py`) was written to address "Mike" by name, and Asteris heard a TTS test sample say "Good evening, Mike" and asked "who is Mike" -- he genuinely didn't recognize the name.

**Fixed 2026-08-02:** `JARVIS_SYSTEM_PROMPT` in both scripts now says "Asteris," not "Mike." Also pinned as a critical/always-injected fact in Jarvis's own memory store (`jarvis_memory.json`, `[ALWAYS]` prefix) so the correction survives independently of the system prompt. `telegram_relay.py` restarted with the fix live.

**Resolved 2026-08-02: Asteris and Mike are business partners in Web Action Hellas** (webactionhellas) -- confirmed directly by Asteris, not inferred. So the Mike-centric project memory (cloudskin, drip-store, dionyssos-hotel, mykonos-prestige, all the client-site work, house standards, the agency agent fleet, etc.) is genuinely shared company context, not just Mike's personal solo business -- it's fair game and relevant to Asteris's own work too. **How to apply:** treat the existing project/client memory as legitimately applicable to Asteris. Still default to treating HIM, not Mike, as the actual person in the room for anything identity/preference/persona-related (how Jarvis addresses him, whose name goes in a persona prompt, etc.) -- that part of the original bug is fixed and doesn't change just because they're partners. If either partner's individual preferences ever diverge (e.g. one wants em-dashes allowed, the other doesn't), ask which one is setting the rule rather than assuming they're identical.

A stray pre-existing fact in `jarvis_memory.json` ("it forever") may be a remnant of an earlier failed attempt by Asteris to get this same identity fact remembered, mis-parsed by the memory command parser before the "remember always" pinning feature existed -- left untouched since its original intent isn't fully certain, but worth noting if it ever comes up confusingly.
