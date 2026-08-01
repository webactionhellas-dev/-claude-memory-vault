# Shopify email templates (manual apply)

Shopify notification emails live in the Shopify admin, not in this repo's deploy pipeline. This
folder holds the source-of-truth copies so they're version-controlled and can be applied from
any machine.

## draft-order-invoice.liquid

Redesigned "Draft order invoice" email to match the branded Order confirmation / Shipping
confirmation emails (centered CLOUDSKIN wordmark, serif-italic headline, editorial layout,
line items with thumbnails, invoice totals). Replaces Shopify's plain default template.

Note: this email only fires when a draft order invoice is manually created/sent - a normal
Stripe checkout never triggers it. Low urgency, but done for full brand consistency.

**Status: NOT yet applied to Shopify.** The first paste attempt used `line_items`, which
Shopify's draft-invoice context doesn't expose, so the save was rejected (Shopify kept the old
default template live - nothing broke). This file is the CORRECTED version, using
`subtotal_line_items` + `line.line_price` + guarded `shipping_price`, with the tax row removed
(tax_price is not reliably available in this context). It has NOT been re-tested against
Shopify's live preview yet.

### To apply
1. Shopify admin -> Settings -> Notifications -> Customer notifications -> **Draft order invoice**
   -> **Edit code**.
2. Select all in the "Email body (HTML)" box, paste this file's contents over it.
3. Click **Save**.
4. Click **Preview** - confirm it renders (centered logo, serif-italic headline, line items,
   totals, no error banner). If Shopify shows "Error retrieving email preview", a Liquid
   variable is still wrong - check `subtotal_line_items` fields against what actually renders,
   fix, save, re-preview.
5. Once the preview is clean, use **Send test** to confirm it lands correctly in an inbox.

If this breaks the save again, no harm done - the previous plain-logo template stays live until
a working version is saved.
