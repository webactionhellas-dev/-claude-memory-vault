# X Tracker

A **read-only radar** for Solana meme-coin trading. It watches wallets (and,
optionally, X accounts) and pushes you a rich alert the instant something moves.
It does **not** place trades. You open the token and decide. That line is fixed.

## What each alert tells you

- **who** bought (which watched wallet) and how much
- **live market**: symbol, price, liquidity, pair age, DEX (Dexscreener, free)
- **rug-safety grade**: Safe / Caution / High / Critical with reasons
  (RugCheck, free) so obvious scams are flagged before you touch them
- **convergence**: a louder, top-priority alert when 2+ watched wallets buy the
  **same** mint inside the window. This is the highest-signal event in the set.
- one-tap links: Axiom, Dexscreener, GMGN, BullX, plus the raw mint to paste

Alerts go to your phone via **ntfy** (no account) and to a live dashboard at
`http://localhost:8787`.

## Read this first (honest expectations)

- This gives you **awareness, not an edge**. You act after the tracked wallet, so
  you buy into a higher price than it did. Even sub-second, a KOL who is in and
  out in seconds cannot be copied profitably. Treat every alert as "go look",
  never "buy".
- The watchlist is **survivorship bias**. Top-leaderboard wallets are on a hot
  streak that regresses; some "alpha" wallets are the exit liquidity. Rotate them.
- The rug grade answers "can I sell / will the LP pull", NOT "will this go up". A
  green Safe is not a buy signal. Risk no more than ~5% of capital. Not advice.

## Run it

1. **Keys** (`.env`, already set up by the wizard): `HELIUS_API_KEY` (free, wallets),
   `NTFY_TOPIC` (free push), optional `X_BEARER_TOKEN` (paid, tweets),
   optional `TELEGRAM_*`. Re-run `node setup.mjs` to change them.
2. **Phone push**: install the **ntfy** app, subscribe to your `NTFY_TOPIC`
   (server `ntfy.sh`). No account.
3. **Start**:
   ```
   npm start
   ```
   Dashboard: http://localhost:8787 . First run per source bootstraps silently
   (records history, no alerts), so alerts begin from new activity.

## Watchlist

`config.json` -> `wallets` holds 7 Kolscan-sourced wallets that were LIVE-VERIFIED
to actually show self-funded buys. Three candidates (narc, Cented, Gake) were
dropped because their labeled address receives tokens but never pays from its own
balance (parent/decoy/multi-wallet) - see `//flaggedWallets`. Re-verify any wallet
before adding: KOLs rotate addresses constantly.

`xAccounts` needs the paid X API to do anything, and needs handles that actually
post contract addresses (the seeded one, Toly, does not).

## Config knobs (config.json)

- `pollSeconds` (20) - how often to poll
- `convergence` `{count, windowMinutes}` - when to fire a convergence alert
- `enrich` (true) - rug grade + market data on/off
- `dedupeMinutes` (30) - suppress repeats of the same token+source
- `axiomPattern` - Axiom deeplink (UNVERIFIED; the mint is always shown so you can
  paste it into Axiom regardless)

## Reliability

Runs only while the process is up (i.e. your PC is on). For 24/7, host it on a
small always-on box. State is written atomically and dedupe keys self-prune, so it
is safe to leave running. Test one module standalone: `npm run check-wallets`.

## Roadmap (next power-ups)

- Sub-second latency via websockets (Helius transactionSubscribe / PumpPortal) -
  all-DEX streaming is ~$49/mo now
- Wallet scoring + auto-rotation (copyability, not just leaderboard PnL)
- Bigger, curated wallet set once scoring is in

## The line

No auto-buying, ever. Wiring this to trade on your Axiom/Google session would mean
automating money into the highest-risk assets against bots you cannot out-race,
through unofficial endpoints that need your credentials and break constantly. The
durable, safe boundary is a fast heads-up that hands off to your own session. The
judgment stays yours.
