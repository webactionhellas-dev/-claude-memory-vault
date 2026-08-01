/* ============================================================
   DIONYSSOS — interactions
   Header state · scroll reveals · soft parallax · gallery drag
   mobile menu · sticky action bar · date guards
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header: solid after leaving the hero ---------- */
  var header = document.getElementById("header");
  var stickybar = document.getElementById("stickybar");

  function onScroll() {
    var passed = window.scrollY > window.innerHeight * 0.72;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
    if (stickybar) stickybar.classList.toggle("is-on", passed);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- soft parallax on full-bleed images ---------- */
  var pxSections = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  if (pxSections.length && !reduceMotion) {
    var ticking = false;
    function parallax() {
      pxSections.forEach(function (sec) {
        var rect = sec.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        var progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        var img = sec.querySelector("img.bg");
        if (img) img.style.transform = "translateY(" + (progress * -7) + "%)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    parallax();
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var menuClose = document.getElementById("menuClose");
  var overlay = document.getElementById("menuOverlay");

  function setMenu(open) {
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (menuBtn && overlay) {
    menuBtn.addEventListener("click", function () { setMenu(true); });
    menuClose.addEventListener("click", function () { setMenu(false); });
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- gallery: drag to scroll ---------- */
  var strip = document.getElementById("galleryStrip");
  if (strip) {
    var isDown = false, startX = 0, scrollLeft = 0;
    strip.addEventListener("pointerdown", function (e) {
      isDown = true;
      startX = e.clientX;
      scrollLeft = strip.scrollLeft;
      strip.classList.add("is-dragging");
      strip.setPointerCapture(e.pointerId);
    });
    strip.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      strip.scrollLeft = scrollLeft - (e.clientX - startX);
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      strip.addEventListener(ev, function () {
        isDown = false;
        strip.classList.remove("is-dragging");
      });
    });
  }

  /* ---------- booking dates: sensible guards ---------- */
  var checkin = document.getElementById("checkin");
  var checkout = document.getElementById("checkout");
  if (checkin && checkout) {
    function iso(d) {
      var p = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }
    var today = new Date();
    var tomorrow = new Date(today.getTime() + 864e5);
    checkin.min = iso(today);
    checkout.min = iso(tomorrow);
    checkin.value = iso(today);
    checkout.value = iso(tomorrow);
    checkin.addEventListener("change", function () {
      var next = new Date(new Date(checkin.value).getTime() + 864e5);
      checkout.min = iso(next);
      if (checkout.value <= checkin.value) checkout.value = iso(next);
    });
  }
})();
