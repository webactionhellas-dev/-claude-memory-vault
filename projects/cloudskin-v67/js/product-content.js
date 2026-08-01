/* ============================================================
   CLOUDSKIN - canonical product-page copy (single source of truth).
   Used by BOTH js/product.js (renders the PDP, falls back to this)
   and js/studio.js (shows these as the editable defaults in the
   Content Studio). Owner edits are stored as overrides in Supabase
   (keys: product.<handle>.desc / .features / .fabric / .fit.type /
   .fit.copy, and the shared pdp.care / pdp.fit.trailing / pdp.shipping
   / pdp.shipline). This file stays the safety fallback - if an
   override is blank or the DB is unreachable, the page shows this text.
   ============================================================ */
window.CLOUDSKIN_PDP = {
  /* shared across every product */
  CARE: [
    "Wash by hand / cool wash under 30°C",
    "Do not bleach",
    "Line dry in the shape",
    "Do not iron",
    "Do not dry clean"
  ],
  FIT_TRAILING: "True to size; between sizes, size up for an easy line or stay true for support.",
  SHIPPING: "Complimentary worldwide shipping. Free 30-day returns on all unworn items with tags.",
  SHIPLINE: "Complimentary worldwide shipping & returns - Ships in 1-2 days",

  /* per-product copy, keyed by product handle (title added for the Studio picker) */
  PRODUCTS: {
    "the-signature-bra": {
      title: "Signature Bra",
      desc: "A timeless sports bra designed for movement, comfort, and support. Crafted from our signature sculpting fabric, it offers a smooth, supportive fit with a soft second-skin feel. The racerback silhouette and breathable mesh detail provide comfort and freedom of movement whether you're on court, in the gym, or on the go.",
      features: ["Soft, sculpting performance fabric", "Medium to high support", "Breathable mesh detail", "Racerback design", "Removable padding", "Sweat-wicking and quick-drying"],
      fit: ["Compressive", "Designed for a sculpting, compressive fit with medium to high support, offering a secure second-skin feel during movement."],
      fabric: "75% Nylon, 25% Lycra"
    },
    "the-signature-skirtt": {
      title: "Signature Skirt",
      desc: "Where performance meets refined design. The Signature Skirt combines a flattering silhouette with lightweight layered detailing for a refined, feminine look. Featuring a supportive waistband and built-in inner shorts with discreet side pockets, it delivers comfort, coverage, and functionality through every movement.",
      features: ["Supportive high-rise waistband", "Lightweight layered skirt design", "Built-in inner shorts", "Side pockets for balls and small essentials", "Four-way stretch", "Sweat-wicking and quick-drying"],
      fit: ["Compressive", "Designed with a sculpting, compressive waistband for a secure fit, while the flowing skirt provides a flattering silhouette."],
      fabric: "Waistband & inner shorts: 75% Nylon, 25% Lycra"
    },
    "the-foundation-tank": {
      title: "Foundation Tank",
      desc: "A modern essential designed for performance, comfort, and everyday wear. The Foundation Tank features a built-in shelf bra for medium support and a sculpting silhouette that contours the body. Removable cups provide customizable coverage, while the soft, stretchy fabric delivers comfort throughout the day.",
      features: ["Soft, sculpting performance fabric", "Built-in shelf bra with medium support", "Removable padding", "Smooth, second-skin feel", "Four-way stretch", "Sweat-wicking and quick-drying"],
      fit: ["Sculpting", "Designed with a sculpting fit and moderate compression that naturally contours to the body."],
      fabric: "75% Nylon, 25% Lycra"
    },
    "the-sculpt-bra": {
      title: "Sculpt Bra",
      desc: "Designed for support without compromise. The Sculpt Bra delivers high support with a smooth, sculpting fit that feels secure through every movement. Featuring built-in padded cups, a supportive racerback silhouette, and breathable perforated detailing, it is designed for training, court sessions, and everyday wear.",
      features: ["High support", "Built-in padded cups", "Racerback design", "Breathable perforated back panel", "Sweat-wicking and quick-drying"],
      fit: ["Compressive", "Designed for a supportive, compressive fit that provides high support and a secure feel during movement."],
      fabric: "75% Nylon, 25% Spandex"
    },
    "the-court-skirt": {
      title: "Court Skirt",
      desc: "A modern court essential designed for performance, comfort and everyday wear. The Court Skirt combines a lightweight silhouette with a supportive waistband for a flattering fit that moves effortlessly with you. Built-in inner shorts provide coverage and confidence, while silicone grip tabs help keep them in place through every movement.",
      features: ["Lightweight fabric", "Supportive elastic waistband", "Built-in shorts", "Silicone grip tabs", "Four-way stretch", "Sweat-wicking and quick-drying"],
      fit: ["Sculpting", "Designed with a supportive waistband and a sculpting fit that flatters the body while allowing unrestricted movement."],
      fabric: "Outer: 90% Nylon, 10% Elastane · Inner: 87% Nylon, 13% Elastane"
    },
    "the-club-skirt": {
      title: "Club Skirt",
      desc: "Effortless style meets everyday performance. The Club Skirt features a lightweight textured mesh outer layer with built-in inner shorts for confident coverage and all-day comfort. Designed with a sculpting fit and flexible stretch, it moves naturally with you while maintaining a flattering silhouette.",
      features: ["Lightweight textured mesh outer layer", "Sculpting fit with comfortable stretch", "Built-in inner shorts", "Side pockets for balls and small essentials", "Four-way stretch", "Sweat-wicking and quick-drying", "Soft, breathable feel"],
      fit: ["Sculpting", "Designed with a sculpting fit and flexible stretch that flatters the body while allowing unrestricted movement."],
      fabric: "Waistband & inner shorts: 75% Nylon, 25% Spandex · Outer lining: 90% Nylon, 10% Spandex"
    },
    "the-club-quarter-zip": {
      title: "Club Quarter Zip",
      desc: "A lightweight layer designed to move effortlessly with you. The Club Quarter Zip features a streamlined silhouette with breathable performance fabric for all-day comfort on and off the court. Finished with a quarter-zip neckline and subtle textured mesh detailing, it delivers lightweight coverage with an elevated, court-inspired look.",
      features: ["Lightweight fabric", "Breathable textured mesh detailing", "Quarter-zip neckline", "Slim fit silhouette", "Four-way stretch", "Moisture-wicking and quick-drying"],
      fit: ["Slim", "Designed for a slim, body-skimming fit that offers lightweight coverage and unrestricted movement."],
      fabric: "75% Nylon, 25% Spandex"
    },
    "the-flow-dress": {
      title: "Flow Dress",
      desc: "Effortless movement meets elevated performance. The Flow Dress features a sculpting bodice with comfortable stretch, a supportive compressive waistband, and a lightweight flowing skirt that moves beautifully with every step. Finished with a breathable racerback design and paired with separate bike shorts featuring side pockets, it delivers comfort, confidence, and versatility on and off the court.",
      features: ["Sculpting bodice with comfortable stretch", "Compressive waistband for a secure fit", "Lightweight flowing skirt", "Breathable mesh back", "Separate bike shorts with side pockets", "Moisture-wicking and quick-drying"],
      fit: ["Sculpting", "Designed with a sculpting bodice, a compressive waistband, and a lightweight skirt."],
      fabric: "Top: 75% Nylon, 25% Lycra · Skirt: 90% Polyester, 10% Spandex · Shorts: 75% Nylon, 25% Spandex"
    },
    "the-elevate-cropped-jacket": {
      title: "Elevate Cropped Jacket",
      desc: "Elevated style meets effortless versatility. The Elevate Cropped Jacket features a modern cropped silhouette with relaxed batwing sleeves for an effortless drape and freedom of movement. An adjustable drawcord hem and collar let you customise the fit, while single button closures at the collar and hem create a clean, contemporary finish. Elastic cuffs complete the design, the perfect lightweight layer for training, travel, and everyday wear.",
      features: ["Relaxed batwing sleeves", "Cropped silhouette", "Adjustable drawcord hem and collar", "Single button closure at collar and hem", "Elastic cuffs", "Lightweight construction", "Designed for layering and movement"],
      fit: ["Relaxed", "Designed with a relaxed silhouette, batwing sleeves, and adjustable details for effortless layering and all-day comfort."],
      fabric: "87% Nylon, 13% Elastane"
    },
    "the-elevate-cropped-jacket-copy": {
      title: "Drift Cropped Jacket",
      desc: "A lightweight layer designed for movement and everyday versatility. The Drift Cropped Jacket features a relaxed cropped silhouette with a full front zip for effortless layering on and off the court. Adjustable drawcords at the hem allow for a customizable fit, while elastic cuffs and functional side pockets combine comfort with everyday practicality.",
      features: ["Relaxed cropped silhouette", "Full front zip closure", "Adjustable drawcord hem", "Functional side pockets", "Elastic cuffs", "Four-way stretch", "Designed for layering and movement"],
      fit: ["Relaxed", "Designed with a relaxed fit and an adjustable drawcord hem for a customizable silhouette and effortless comfort."],
      fabric: "75% Nylon, 25% Spandex"
    },
    "the-performance-tee": {
      title: "Performance Tee",
      desc: "Built for movement, designed for everyday performance. The Performance Tee features a streamlined, body-hugging silhouette that delivers a clean, athletic look without restricting movement. Lightweight and quick-drying, it's finished with a signature metallic back detail for a refined performance aesthetic. Designed for training, court sessions, the gym, and everyday wear.",
      features: ["Lightweight performance fabric", "Quick-drying", "Breathable construction", "Slim, body-hugging fit", "Signature metallic back detail", "Designed for training and everyday movement"],
      fit: ["Slim", "Designed with a slim, body-hugging fit that contours naturally to the body for a clean, athletic silhouette."],
      fabric: "100% Polyester"
    },
    "the-performance-tank": {
      title: "Performance Tank",
      desc: "Built for movement, designed for everyday performance. The Performance Tank features a streamlined, body-hugging silhouette that delivers unrestricted movement with a clean, athletic look. Lightweight and quick-drying, it's designed to keep you comfortable through training, court sessions, gym workouts, and everyday wear.",
      features: ["Lightweight performance fabric", "Quick-drying", "Breathable construction", "Slim, body-hugging fit", "Suitable for on and off the court", "Designed for training and everyday movement"],
      fit: ["Slim", "Designed with a slim, body-hugging fit that contours naturally to the body for a clean, athletic silhouette."],
      fabric: "100% Polyester"
    },
    "the-form-bra": {
      title: "Form Bra",
      desc: "Effortless support, elevated comfort. Designed to move with you, the Form Bra combines a clean, flattering silhouette with built-in support for all-day confidence. Featuring built-in padded cups and a supportive design, it provides medium support for training, court sessions, studio workouts, and everyday wear.",
      features: ["Medium support", "Built-in padded cups", "Soft-touch fabric", "Four-way stretch", "Sweat-wicking and quick-drying"],
      fit: ["Sculpting", "Designed with a sculpting, body-contouring fit and moderate compression for supportive everyday comfort."],
      fabric: "75% Nylon, 25% Lycra"
    },
    "the-ace-dress": {
      title: "Ace Dress",
      desc: "A refined court-to-club silhouette designed for performance and everyday wear. The Ace Dress features a sculpting fit that contours the body to create a flattering, feminine silhouette. Finished with contrast piping, a structured high neckline, and a front zip closure, it delivers a polished look with effortless versatility on and off the court.",
      features: ["Sculpting silhouette", "Built-in bra with removable cups", "Built-in shorts with side pockets", "Contrast piping detailing", "High neckline with front zip closure", "Four-way stretch fabric"],
      fit: ["Sculpting", "Designed to contour the body with a sculpting fit that creates shape while allowing comfortable movement."],
      fabric: "Outer: 80% Polyester, 20% Elastane · Inner: 80% Polyester, 20% Elastane"
    },
    "the-performance-shorts": {
      title: "Performance Shorts",
      desc: "Built for movement, designed for everyday performance. The Performance Shorts feature a streamlined athletic silhouette with a lightweight feel for unrestricted movement. An elastic waistband with an adjustable drawcord provides a secure, comfortable fit, while functional side pockets add everyday practicality. Quick-drying and breathable, they're designed for training, court sessions, gym workouts, and everyday wear.",
      features: ["Lightweight performance fabric", "Elastic waistband with adjustable drawcord", "Functional side pockets", "Slim athletic fit", "Quick-drying", "Breathable construction"],
      fit: ["Athletic", "Designed with a slim, athletic fit through the leg and a comfortable elastic waistband for unrestricted movement."],
      fabric: "90% Nylon, 10% Spandex"
    }
  }
};
