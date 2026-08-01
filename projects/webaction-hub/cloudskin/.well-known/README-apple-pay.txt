CloudSkin - Apple Pay domain association (Phase C, PENDING Mike's Stripe Dashboard step)
========================================================================================

Apple Pay + Google Pay render inside the Stripe Payment Element on /checkout. Google
Pay needs NO extra step once the domain is registered. Apple Pay needs the domain
registered as a Stripe "Payment method domain". Stripe handles Apple merchant
validation for you - you do NOT create an Apple Merchant ID or CSR.

DO THIS (Mike, in the Stripe Dashboard, LIVE mode - it auto-registers sandboxes too):

1. Go to  https://dashboard.stripe.com/settings/payment_method_domains
2. Click "Add a new domain" and add BOTH:
       cloudskin.com
       www.cloudskin.com
3. Stripe will try to verify each domain automatically. In most Elements setups it
   auto-hosts + verifies with no file needed. If Stripe asks you to host the file:
   - download the association file it shows you, and
   - save it in THIS folder as EXACTLY:
         .well-known/apple-developer-merchantid-domain-association   (no extension)
   - redeploy (node scripts/deploy.mjs), then click "Verify" in the Dashboard.

Why there is no association file committed here yet:
- The file content is account- and domain-specific and is issued by Stripe. We do
  not invent it. Vercel already serves /.well-known/* (this folder) as static files,
  the CSP already allows js.stripe.com, and cleanUrls does not rewrite this path, so
  the moment the real file is dropped in and deployed it is reachable at
  https://cloudskin.com/.well-known/apple-developer-merchantid-domain-association

Verify (after deploy):
    curl -s https://cloudskin.com/.well-known/apple-developer-merchantid-domain-association

Real-device test (Apple Pay only shows on Safari + an Apple device with a card in
Wallet): open https://cloudskin.com/checkout in Safari on iPhone/Mac and confirm the
Apple Pay sheet appears in the Payment Element. Google Pay: Chrome with a saved card.
