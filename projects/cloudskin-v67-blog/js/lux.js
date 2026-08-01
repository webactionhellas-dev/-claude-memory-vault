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
     page-EXIT: fade out on internal navigation for a seamless feel   */
  if (!reduce) {
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
    // clear the veil if restored from bfcache
    addEventListener("pageshow", e => { if (e.persisted) fade.classList.remove("in"); });
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
