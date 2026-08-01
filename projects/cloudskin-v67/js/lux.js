/* ============================================================
   CLOUDSKIN - lux motion layer
   Custom cursor, magnetic buttons, and blur/opacity page
   transitions. Loaded on every page (defer). Every effect is
   guarded for touch + reduced-motion so it never degrades the
   base experience and always stays at 60fps.
   ============================================================ */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- page-enter is handled by CSS (main animation) ----------
     page-EXIT: fade out on internal navigation for a seamless feel.
     DESKTOP ONLY (finePointer): on touch the fade veil caused a white screen over the
     hero when tapping BACK (mobile browsers freeze the bfcache-restored page until the
     first touch, leaving the veil stuck) and added a needless 340ms delay before every
     tap navigated. Mobile now navigates instantly with no veil element at all.   */
  if (!reduce && finePointer) {
    const fade = document.createElement("div");
    fade.className = "page-fade";
    document.body.appendChild(fade);
    document.addEventListener("click", e => {
      // never hijack clicks on interactive controls (quick-add / cloud-add buttons, form fields)
      if (e.target.closest("button, input, select, textarea, label")) return;
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const target = a.getAttribute("target");
      if (target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // only intercept same-origin, in-site .html links
      if (/^https?:\/\//i.test(href) && !href.includes(location.host)) return;
      if (!/\.html(\?|#|$)/.test(href) && !href.endsWith("/")) return;
      e.preventDefault();
      fade.classList.add("in");
      setTimeout(() => { location.href = href; }, 340);
    });
    // The exit veil must NEVER survive into the back-forward cache. If it does, tapping
    // BACK restores a page with the white veil still up over the hero, and mobile browsers
    // freeze the restored page until the first touch, so it looks stuck (a white screen that
    // only clears when you tap). Clearing it in pagehide, before the page is frozen into
    // bfcache, keeps the restored snapshot clean; the unconditional pageshow clear is a
    // belt-and-suspenders for any normal restore.
    addEventListener("pagehide", () => { fade.classList.remove("in"); });
    addEventListener("pageshow", () => { fade.classList.remove("in"); });
  }

  /* ---------- magnetic elements (work with or without custom cursor) ---------- */
  if (finePointer && !reduce) {
    $$("[data-magnetic]").forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(mx * strength).toFixed(1)}px, ${(my * strength).toFixed(1)}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* custom cursor intentionally removed - the native cursor stays visible and
     turns into a pointer/hand on clickable elements (browser default). */
})();
