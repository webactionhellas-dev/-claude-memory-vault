# Dionyssos Hotel Skopelos — Website Redesign

A premium redesign prototype for [dionyssoshotel.gr](https://www.dionyssoshotel.gr), built as a
standalone static site using the hotel's own photography.

## View it

Open `index.html` directly in a browser, or serve the folder:

```
npx http-server . -p 5402
```

(A `dionyssos` preview configuration also exists in `~/.claude/launch.json`.)

## What's here

| File | Purpose |
|---|---|
| `index.html` | The new homepage — English, fully responsive, no build step |
| `assets/css/main.css` | Design system: "Plaster & Aegean Ink" (tokens at the top) |
| `assets/js/main.js` | Reveals, parallax, mobile menu, gallery drag, booking-date guards |
| `assets/img/` | 30 photos pulled from the current site (the hotel's own assets) |
| `STRATEGY.md` | Full strategy: brand, UX audit, sitemap, CRO, SEO, copy deck, art direction, revenue model |

## Before going live

See the launch checklist at the bottom of `STRATEGY.md` — most importantly:
replace the placeholder guest quotes with verified reviews, confirm the
direct-booking perks and trust-strip figures with the family, and verify the
booking-engine query parameters.
