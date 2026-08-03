---
name: cloudskin-launching-page
description: "CloudSkin Shopify \"coming soon\" / password-page design — cinematic above-the-clouds splash"
metadata: 
  node_type: memory
  type: project
  originSessionId: e64e217b-ed96-4d5d-8d6d-49fcdbec2bf9
---

Custom "Launching Soon" / password-page design for the client's live Shopify store (cloudskin.com/password), to replace the generic default. Single self-contained HTML file `cloudskin-launching.html` (base64-embedded sky image, ~201KB), saved in both `claude projects/cloudskin/` and `Downloads/`. Built by `scratchpad/build_launch.py`.

Design: cinematic dark "above the clouds" theme using the real brand sky `img/brand/clouds-crop.jpg` (text-free version); **live animated** glowing amber CLOUDSKIN wordmark (Inter 300, not baked into photo); "Court to everywhere." slogan in Fraunces italic; glass email capture (JS-only thank-you, needs wiring to Shopify/Klaviyo on live); real socials IG + TikTok (@cloudskin.active); decorative "Enter password" modal (real auth handled by Shopify). Matches the flagship [[cloudskin-site]] brand fonts/palette but darker/teaser mood.

User will paste it into the client's Shopify password template themselves. To deploy lean: upload clouds-crop.jpg to Shopify Files and swap the base64 for the file URL. Preview served via `cloudskin-latest` launch config (port 5212) → /cloudskin-launching.html.
