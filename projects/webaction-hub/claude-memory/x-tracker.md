---
name: x-tracker
description: "Mike's read-only X + Solana-wallet meme-coin alert radar in C:\\Users\\mikef\\x-tracker; alerts only, never auto-trades"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1723eb50-372f-402c-9de1-1b8ef310ac68
---

Mike trades meme coins on Axiom (Google login) and wanted an "X Tracker" to snipe off famous-person X announcements + "massive wallet" moves. Built as a **read-only alert radar, not an auto-sniper** in `C:\Users\mikef\x-tracker`. Node, zero-dep (Node 24).

**Hard line held (even when Mike said "full access, do everything"):** no auto-trading, and I do NOT create accounts / enter his passwords / pay. Account signup + Google login is a PROHIBITED action for me per safety rules; Mike did the Helius Google login himself, then I drove the rest via claude-in-chrome (Browser 1). No payment ever.

**Status (2026-07-09): wallet tracking is LIVE and verified end-to-end.**
- Helius API key wired into `.env` and validated (getHealth ok). Key: 2c543b46-... (his "Apemangrove" project).
- Alert channel = **ntfy** (no-account push), chosen because Telegram Web needed a QR/phone login Mike wanted to avoid. Topic in `.env` NTFY_TOPIC=xtracker-143b9bdf0515; he must install the ntfy phone app + subscribe to that topic. Telegram still supported if he ever logs in. Dashboard at :8787 works with no login.
- Watchlist LIVE-VERIFIED against Helius: kept 7 of 10 Kolscan seed wallets (jrus, Trey, theo, Cooker, Cupsey, Euris, Latuche). Dropped narc/Cented/Gake - their labeled address receives tokens but never pays from its own balance (parent/decoy/multi-wallet), so zero detectable buy signal. Lesson: always live-verify KOL wallet addresses.
- **Key detector fix:** buy detection must read ownership from `accountData.tokenBalanceChanges` (userAccount===wallet) + SOL/stable spent, NOT tokenTransfers/feePayer - top wallets route trades through Axiom/Photon/bot fee payers, so signer-based matching misses most buys. In src/wallets.js tokensBought().
- Applied the 9-agent workflow's 13-bug audit: per-module try/catch + saveState in finally (index.js), atomic state writes + seen-pruning (lib.js), per-query since_id + BigInt guard (x.js), isMain() windows-path fix, Telegram 4096 cap.

**Shipped + live-verified (2026-07-09 pm):** enrichment (src/enrich.js) - every token alert now carries a RugCheck rug-safety grade (Safe/Caution/High/Critical + reasons, fail-safe UP) and Dexscreener market data (symbol/price/liquidity/age), both free no-key. Convergence (src/convergence.js) - a louder top-priority alert when >=2 distinct watched wallets buy the same mint within windowMinutes; verified firing on real data (theo+Cupsey both bought $Unipcs, a 1-min-old token graded Critical). Dashboard rebuilt with risk badges, market rows, convergence highlight, source + hide-risk filters. Fixed a real bug: fireAlert never called sendNtfy (alerts weren't reaching phone) - now sends to ntfy + telegram + dashboard. Config knobs: enrich, convergence{count,windowMinutes}.

**Speed shipped + verified (2026-07-09 later pm):** real-time websocket engine (src/stream.js) via Helius standard logsSubscribe (FREE on his key, not the paid Geyser transactionSubscribe) - wallet buys now ~1-2s vs 20s poll; REST poll kept as backfill; shared dedupe. Refactored buy detection into src/detect.js (tokensBought + processWalletTx) used by both poll and stream. Verified: WS transport floods with events, correctly skips err:true (top wallets Cupsey/theo are HFT bots spamming FAILED txs - real intel), and signature-fetch path detects the same buys as poll (MATCH true x3). Double-click launcher start-tracker.bat added (Mike is not CLI-comfortable; dashboard only exists while it runs - reassure him of this). Dashboard proven live in his Browser 1 (screenshot).

**X: Mike chose the CHEAP 3rd-party route (not the $200/mo official).** Built pluggable provider in src/x.js: config.xProvider 'twitterapi' (needs TWITTERAPI_KEY from twitterapi.io, pay-as-you-go) or 'official' (X_BEARER_TOKEN). twitterapi.io adapter written to docs but UNVERIFIED until he adds a key - validate live then. config.xAccounts seeded with elonmusk/realDonaldTrump/blknoiz06/MustStopMurad; he still needs to confirm exact handles (voice-garbled 'tram/velvet mask/Chernos'). X latency realistically ~10-15s, NOT sub-second. Still pending: his twitterapi.io signup+key, confirm handles. Next roadmap: wallet scoring/auto-rotation.

**Honest frame given to Mike repeatedly:** copy-trading KOLs is negative-EV for the follower (you buy after them, into higher price); watchlist is survivorship bias; risk <=5% capital; tool gives awareness not edge.
