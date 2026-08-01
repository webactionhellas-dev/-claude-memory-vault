/* ============================================================
   i18n — English + Greek (el). The Greek is ORIGINAL professional
   copy written natively for a luxury Mykonos estate, not a literal
   translation. No em dashes anywhere (client preference).
   English stays the default; visitors switch with the nav toggle.
   Text lives here; images / icons / numbers stay in lib/data.ts and
   are merged by index or villa id in the components.
   ============================================================ */

export type Locale = "en" | "el";
export const LOCALES: Locale[] = ["en", "el"];
export const DEFAULT_LOCALE: Locale = "en";

const en = {
  nav: {
    thalassa: "Villa Thalassa",
    anemos: "Villa Anemos",
    experiences: "Experiences",
    gallery: "Gallery",
    about: "About",
  },
  cta: {
    bookNow: "Book Now",
    bookYourStay: "Book Your Stay",
    reserveStay: "Reserve Your Stay",
    discoverEstate: "Discover the Estate",
    enquire: "Enquire",
    whatsappUs: "WhatsApp Us",
  },
  a11y: { openMenu: "Open menu", closeMenu: "Close menu", language: "Language" },
  hero: { eyebrow: "Mykonos · Kastro · The Cyclades", line1: "Your Private", line2: "Sunset" },
  welcome: {
    eyebrow: "Welcome",
    titleTop: "Experience Mykonos",
    titleAccent: "like never before",
    para1:
      "Villa Anemos and Villa Thalassa are two premium estates carved into the whitewashed heights of Kastro. Minimalist, elegant and unmistakably Cycladic. Discover quiet coves, panoramic horizons and private spaces crafted for true serenity.",
    para2:
      "This is not a hotel. It is your own corner of the island: staffed, private and entirely yours, from the first espresso to the last glass beneath the stars.",
    statValue: "180°",
    statLabel: "Panorama of Delos and Mykonos Town",
    trust: [
      "Built 2022",
      "Kastro · Prime Mykonos",
      "180° Sunset Views",
      "Private Chef & Concierge",
      "Helipad Access",
    ],
  },
  villasSection: {
    eyebrow: "The Villas",
    title: "Two estates. One unforgettable island.",
    subtitle:
      "Choose the grandeur of Thalassa or the intimacy of Anemos. Both perched in Kastro, both facing the same untouchable sunset.",
  },
  villaUnits: { bedrooms: "bedrooms", guests: "guests", baths: "baths" },
  villaCommon: { fullAmenities: "Full amenities", exploreVilla: "Explore the Villa", enquire: "Enquire" },
  villas: {
    thalassa: {
      name: "Villa Thalassa",
      subtitle: "The Sea Estate · Kastro",
      meaning: "Thalassa, the sea itself",
      poolLength: "Private infinity pool",
      story:
        "The flagship of the estate. Five hundred square metres of whitewashed calm perched above Kastro, where every room is written around a 180° horizon of Delos, the Aegean and the old town. Days dissolve from espresso on cool stone to a last glass of Assyrtiko as the sun falls into the sea.",
      highlights: [
        "180° panoramic views of Delos & Mykonos Town",
        "Large private infinity pool with extra-comfort sunbeds",
        "Outdoor firepit lounge & al-fresco dining area",
        "Open-plan living across three levels",
      ],
      amenities: [
        "Private infinity pool",
        "Outdoor & indoor lounge and dining area",
        "Outdoor firepit lounge",
        "Air conditioning",
        "Private parking area",
        "Starlink internet access",
        "JBL sound equipment",
        "Flat-screen smart TVs",
        "Yoga mats",
        "PlayStation 5",
        "BBQ",
        "Baby cot (prior notice, no charge)",
        "High chair (prior notice, no charge)",
      ],
      galleryTags: ["The estate at dusk", "Sea view", "Master suite", "Infinity pool", "Kastro views", "Living space"],
      tagline: "Five hundred square metres of whitewashed calm, built around the horizon.",
      longStory: [
        "Villa Thalassa is the flagship of the estate: five hundred square metres of light, stone and sea, perched on the highest shoulder of Kastro. Every one of its eight suites is composed around the same 180° horizon of Delos, the open Aegean and the lights of the old town.",
        "Days here have a rhythm of their own. Espresso on cool morning stone, long lunches by the pool, an afternoon dissolving into the infinity pool, and a last glass of Assyrtiko beside the firepit as the sun falls into the water.",
        "Behind the calm is a full house team: a private chef, daily housekeeping and a concierge who arranges everything before you think to ask. It is not a rental. It is your own address on Mykonos.",
      ],
      spaces: [
        { name: "The Infinity Pool", detail: "A large infinity pool with extra-comfort sunbeds and a sitting lounge." },
        { name: "The Firepit", detail: "An outdoor firepit lounge and al-fresco dining area." },
        { name: "Eight Bedrooms", detail: "En-suite bedrooms across three levels, most with sea views." },
        { name: "Open-Plan Living", detail: "High-ceiling living and dining opening onto the pool." },
      ],
    },
    anemos: {
      name: "Villa Anemos",
      subtitle: "The Wind Residence · Kastro",
      meaning: "Anemos, the island wind",
      poolLength: "Private infinity pool",
      story:
        "Intimate, luminous, effortlessly private. Two hundred and sixty square metres of pure Cycladic architecture that catches the meltemi and the light in equal measure. Anemos is the residence for the family and the few, closer, warmer, with the same untouchable sunset.",
      highlights: [
        "180° sea & sunset views over Kastro",
        "Private infinity pool & outdoor lounge area",
        "Indoor fireplace & minimalist Cycladic interiors",
        "Natural rock elements & whitewashed accents",
      ],
      amenities: [
        "Private infinity pool",
        "Outdoor sitting & lounge area",
        "Private parking area",
        "Indoor fireplace",
        "Air conditioning",
        "Starlink internet access",
        "JBL sound equipment",
        "Flat-screen smart TVs",
        "Yoga mats",
        "PlayStation 5",
        "BBQ",
        "Baby cot (prior notice, no charge)",
        "High chair (prior notice, no charge)",
      ],
      galleryTags: ["Infinity pool", "The residence", "Whitewashed calm", "Sea view", "Pool at dusk", "Living space"],
      tagline: "Intimate, luminous and effortlessly private, for the family and the few.",
      longStory: [
        "Villa Anemos is the estate at its most intimate: two hundred and sixty square metres of pure Cycladic architecture that catches the meltemi and the morning light in equal measure. Six luminous suites, whitewashed and calm, open onto the same untouchable sunset as its sister.",
        "It is the house for the family and the few. Closer, warmer, easier, yet with nothing given up: a private infinity pool, an al-fresco pergola for long dinners under the stars, and Mykonos Town a few minutes down the hill.",
        "With a concierge on call around the clock and daily housekeeping, Anemos feels less like a stay and more like slipping into a life you never want to leave.",
      ],
      spaces: [
        { name: "The Infinity Pool", detail: "A private infinity pool with an outdoor sitting and lounge area." },
        { name: "Six Bedrooms", detail: "Double bedrooms across three levels, several sea-view en-suites." },
        { name: "The Fireplace", detail: "An indoor fireplace among whitewashed, minimalist interiors." },
        { name: "Open-Plan Living", detail: "Living and dining opening directly onto the pool." },
      ],
    },
  },
  experiencesSection: {
    eyebrow: "Signature Experiences",
    title: "Every desire, quietly arranged",
    subtitle:
      "A dedicated concierge turns the whole island into an extension of your villa. If you can imagine it, it is already being prepared.",
    cta: "Speak with your concierge",
  },
  experiences: [
    { title: "Private Chef & Sommelier", copy: "A Michelin-trained chef designs your menu around the morning's catch and the estate's cellar, served wherever the light is best." },
    { title: "Yacht & Catamaran Charters", copy: "Step from the villa to a private yacht for Delos, Rhenia's turquoise coves, or a champagne sunset cruise around the caldera." },
    { title: "Helicopter & Jet Transfers", copy: "Skip the crowds. Direct helipad transfers from Athens, Santorini or the airport land you at the door in minutes." },
    { title: "In-Villa Wellness", copy: "Sunrise yoga on the terrace, a spa therapist, sauna and cold plunge, a private wellness ritual without leaving home." },
    { title: "24/7 Concierge", copy: "A dedicated host anticipates everything: reservations at Scorpios & Nammos, VIP tables, security, and the impossible made simple." },
    { title: "Events & Celebrations", copy: "Proposals, milestone dinners, intimate weddings, designed and staged against the most photographed sunset in the Cyclades." },
    { title: "Chauffeur & Fleet", copy: "A private driver and curated fleet, from open-top jeeps to a Mercedes S-Class, on standby throughout your stay." },
    { title: "Curated Nights", copy: "Resident DJs, live bouzouki, mixologists and floating breakfasts, the island's energy, staged privately for you." },
  ],
  servicesSection: {
    eyebrow: "Services",
    title: "Services & Concierge",
    subtitle: "Included and on-request, arranged by your dedicated host.",
  },
  services: [
    "Pack & Unpack", "Security", "Babysitting", "Catering", "Events", "Airport Transfers",
    "Helipad", "Private Chef", "Concierge Services", "Car Rentals", "Yacht Rentals",
    "Massage Sessions", "Yoga & Pilates Sessions", "Laundry Services",
  ],
  galleryHome: {
    eyebrow: "The Gallery",
    title: "Moments that sell themselves",
    note: "A living wall of the estate: sunsets, interiors, drone frames and lifestyle moments. Tap any frame to open it full-screen.",
  },
  galleryTags: [
    "Villa Thalassa", "Cycladic light", "Villa Anemos", "Golden hour", "Whitewashed", "Above the Aegean",
    "Kastro", "Light & stone", "Island dusk", "Villa Anemos", "Sea & sky", "Mykonos",
  ],
  instagram: {
    eyebrow: "Moments · The Journal",
    title: "Live from the island",
    note: "Feed auto-populates from the Instagram Graph API when configured.",
  },
  location: {
    eyebrow: "Location and Views",
    title: "Perched in Kastro, above the whole of Mykonos",
    subtitle:
      "Faros Armenistis, Fanari. A headland of 180° horizons facing Delos, the old town and the open Aegean. Close to everything, above it all.",
    nearTitle: "Minutes from the island's best",
    points: [
      { label: "Mykonos Town (Chora)", value: "6 min drive" },
      { label: "Mykonos Airport (JMK)", value: "10 min drive" },
      { label: "Old Port and marina", value: "8 min drive" },
      { label: "Scorpios and Nammos", value: "15 min drive" },
    ],
  },
  testimonialsSection: { eyebrow: "Guest Stories" },
  testimonials: [
    { quote: "The most beautiful place we have ever stayed. The sunset from Thalassa's rooftop is something we still talk about a year later.", author: "The Al-Rashid Family", origin: "Dubai · 10 nights, Villa Thalassa" },
    { quote: "Flawless from the helicopter transfer to the private chef. It felt less like a rental and more like owning a piece of Mykonos.", author: "Sophia & Laurent", origin: "Paris · Anniversary, Villa Anemos" },
    { quote: "We hosted twelve for a milestone birthday. Every request was met before we asked. Genuinely Aman-level service.", author: "James H.", origin: "London · Private celebration" },
  ],
  closing: {
    eyebrow: "Reservations Open",
    titlePre: "Your private sunset is",
    titleAccent: "waiting",
    subtitle: "Limited availability each season. Tell us your dates and let our concierge craft the rest.",
  },
  pages: {
    experiences: {
      eyebrow: "The Estate",
      title: "Experiences & Services",
      subtitle: "",
    },
    gallery: {
      eyebrow: "The Estate",
      title: "Gallery",
      subtitle: "Every corner of Villa Thalassa and Villa Anemos, in full.",
    },
  },
  villaPage: {
    horizonPre: "A house built around",
    horizonAccent: "the horizon",
    spacesEyebrow: "The Spaces",
    galleryEyebrow: "Gallery",
    everyCornerOf: "Every corner of",
    amenitiesEyebrow: "Amenities",
    everythingPre: "Everything,",
    everythingAccent: "included",
    includedWithStay: "Included with every stay",
    locationEyebrow: "Location",
    kastroMykonos: "Kastro, Mykonos",
    reservePre: "Reserve",
    reserveSubtitle: "Tell us your dates and let our concierge craft the rest.",
    greekReg: "Greek Tourism Reg. · AMA",
    discover: "Discover",
    servicesSubtitle: "Everything the estate offers, included or arranged on request.",
    includedServices: ["Daily housekeeping", "Private parking area"],
  },
  aboutPage: {
    valuesEyebrow: "What We Stand For",
    valuesTitle: "Quietly obsessed with the details",
    estatesEyebrow: "The Estates",
    estatesTitle: "Two houses, one horizon",
    explore: "Explore",
    comeStay: "Come and stay with us",
    eyebrow: "Our Story",
    title: "A private corner of Mykonos",
    lede: "Aegean House began with a simple conviction: that the most beautiful part of the island should be lived in, not just looked at.",
    story: [
      "In 2022 we completed two estates on the headland of Kastro, Faros Armenistis, where the land falls away toward Delos and the open sea. Villa Thalassa and Villa Anemos were built to the same standard and the same view, one grand, one intimate, both unmistakably Cycladic.",
      "Everything since has been about the stay itself. A private chef who cooks around the day's catch, a concierge who knows which table, which captain, which beach and when. Helicopter transfers that skip the crowds. Details handled before they become requests.",
      "We keep the calendar deliberately quiet. A limited number of guests each season means every arrival is personal, and every departure is the beginning of the next booking.",
    ],
    values: [
      { title: "Architecture", copy: "Minimalist Cycladic design in stone, lime and light, framing the horizon from every room." },
      { title: "Service", copy: "A full private team, discreet and anticipatory, at Aman-level standards." },
      { title: "Privacy", copy: "Two gated estates, staffed and entirely your own, above the noise of the island." },
      { title: "Location", copy: "The Kastro headland, minutes from Mykonos Town yet a world apart." },
    ],
    statLabels: ["Private estates", "Combined living space", "Guests hosted", "Aegean views"],
  },
  footer: {
    tagline:
      "Two private Cycladic estates above Kastro: Villa Thalassa and Villa Anemos. Redefining luxury on Mykonos since 2022.",
    explore: "Explore",
    contact: "Contact",
    rights: "© {year} {name}. All rights reserved.",
    location: "Mykonos · Kastro · The Cyclades",
  },
};

const el: typeof en = {
  nav: {
    thalassa: "Βίλα Θάλασσα",
    anemos: "Βίλα Άνεμος",
    experiences: "Εμπειρίες",
    gallery: "Φωτογραφίες",
    about: "Το Κτήμα",
  },
  cta: {
    bookNow: "Κράτηση",
    bookYourStay: "Κλείστε τη Διαμονή σας",
    reserveStay: "Κλείστε τη Διαμονή σας",
    discoverEstate: "Ανακαλύψτε το Κτήμα",
    enquire: "Επικοινωνία",
    whatsappUs: "Γράψτε μας στο WhatsApp",
  },
  a11y: { openMenu: "Άνοιγμα μενού", closeMenu: "Κλείσιμο μενού", language: "Γλώσσα" },
  hero: { eyebrow: "Μύκονος · Κάστρο · Κυκλάδες", line1: "Το Δικό σας", line2: "Ηλιοβασίλεμα" },
  welcome: {
    eyebrow: "Καλωσορίσατε",
    titleTop: "Ζήστε τη Μύκονο",
    titleAccent: "όπως ποτέ άλλοτε",
    para1:
      "Η Βίλα Άνεμος και η Βίλα Θάλασσα είναι δύο ιδιωτικές κατοικίες υψηλών προδιαγραφών, σμιλεμένες στις ασβεστωμένες πλαγιές του Κάστρου. Μινιμαλιστικές, κομψές, αναμφισβήτητα κυκλαδίτικες. Ανακαλύψτε ήσυχους όρμους, πανοραμικούς ορίζοντες και ιδιωτικούς χώρους σχεδιασμένους για απόλυτη γαλήνη.",
    para2:
      "Δεν πρόκειται για ξενοδοχείο. Είναι η δική σας γωνιά του νησιού: πλήρως επανδρωμένη, ιδιωτική και εξ ολοκλήρου δική σας, από τον πρώτο espresso ως το τελευταίο ποτήρι κάτω από τα αστέρια.",
    statValue: "180°",
    statLabel: "Πανόραμα της Δήλου και της Χώρας",
    trust: [
      "Κατασκευή 2022",
      "Κάστρο · Προνομιακή Μύκονος",
      "Θέα Ηλιοβασιλέματος 180°",
      "Ιδιωτικός Σεφ & Concierge",
      "Πρόσβαση Ελικοδρομίου",
    ],
  },
  villasSection: {
    eyebrow: "Οι Βίλες",
    title: "Δύο κατοικίες. Ένα αξέχαστο νησί.",
    subtitle:
      "Επιλέξτε τη μεγαλοπρέπεια της Θάλασσας ή την οικειότητα του Ανέμου. Και οι δύο ψηλά στο Κάστρο, και οι δύο αντικρίζουν το ίδιο ανέγγιχτο ηλιοβασίλεμα.",
  },
  villaUnits: { bedrooms: "υπνοδωμάτια", guests: "επισκέπτες", baths: "μπάνια" },
  villaCommon: { fullAmenities: "Πλήρεις παροχές", exploreVilla: "Ανακαλύψτε τη Βίλα", enquire: "Επικοινωνία" },
  villas: {
    thalassa: {
      name: "Βίλα Θάλασσα",
      subtitle: "Το Κτήμα της Θάλασσας · Κάστρο",
      meaning: "Θάλασσα, η ίδια η θάλασσα",
      poolLength: "Ιδιωτική πισίνα υπερχείλισης",
      story:
        "Το διαμάντι του κτήματος. Πεντακόσια τετραγωνικά μέτρα ασβεστωμένης γαλήνης, ψηλά πάνω από το Κάστρο, όπου κάθε δωμάτιο είναι γραμμένο γύρω από έναν ορίζοντα 180° με τη Δήλο, το Αιγαίο και την παλιά πόλη. Οι μέρες λιώνουν από τον espresso στην κρύα πέτρα ως το τελευταίο ποτήρι Ασύρτικο, καθώς ο ήλιος βυθίζεται στη θάλασσα.",
      highlights: [
        "Πανοραμική θέα 180° προς Δήλο και Χώρα",
        "Μεγάλη ιδιωτική πισίνα υπερχείλισης με άνετες ξαπλώστρες",
        "Υπαίθριο lounge με τζάκι φωτιάς και χώρος για φαγητό",
        "Ενιαίοι χώροι διαβίωσης σε τρία επίπεδα",
      ],
      amenities: [
        "Ιδιωτική πισίνα υπερχείλισης",
        "Υπαίθριος και εσωτερικός χώρος καθιστικού και φαγητού",
        "Υπαίθριο lounge με τζάκι φωτιάς",
        "Κλιματισμός",
        "Ιδιωτικός χώρος στάθμευσης",
        "Πρόσβαση στο ίντερνετ μέσω Starlink",
        "Ηχητικός εξοπλισμός JBL",
        "Έξυπνες τηλεοράσεις επίπεδης οθόνης",
        "Στρώματα γιόγκα",
        "PlayStation 5",
        "Ψησταριά BBQ",
        "Βρεφική κούνια (κατόπιν ειδοποίησης, χωρίς χρέωση)",
        "Καρεκλάκι φαγητού (κατόπιν ειδοποίησης, χωρίς χρέωση)",
      ],
      galleryTags: ["Το κτήμα στο σούρουπο", "Θέα στη θάλασσα", "Κύρια σουίτα", "Πισίνα υπερχείλισης", "Θέα στο Κάστρο", "Χώρος καθιστικού"],
      tagline: "Πεντακόσια τετραγωνικά μέτρα ασβεστωμένης γαλήνης, χτισμένα γύρω από τον ορίζοντα.",
      longStory: [
        "Η Βίλα Θάλασσα είναι το διαμάντι του κτήματος: πεντακόσια τετραγωνικά μέτρα φωτός, πέτρας και θάλασσας, στο ψηλότερο σημείο του Κάστρου. Καθεμία από τις οκτώ σουίτες της είναι σχεδιασμένη γύρω από τον ίδιο ορίζοντα 180° με τη Δήλο, το ανοιχτό Αιγαίο και τα φώτα της παλιάς πόλης.",
        "Οι μέρες εδώ έχουν τον δικό τους ρυθμό. Espresso στη δροσερή πρωινή πέτρα, μεσημέρια δίπλα στην πισίνα, ένα απόγευμα που λιώνει μέσα στην πισίνα υπερχείλισης, και ένα τελευταίο ποτήρι Ασύρτικο δίπλα στο τζάκι φωτιάς καθώς ο ήλιος πέφτει στο νερό.",
        "Πίσω από τη γαλήνη υπάρχει μια πλήρης ομάδα: ιδιωτικός σεφ, καθημερινή καθαριότητα και ένας concierge που τα κανονίζει όλα πριν καν το σκεφτείτε. Δεν είναι ενοικίαση. Είναι η δική σας διεύθυνση στη Μύκονο.",
      ],
      spaces: [
        { name: "Η Πισίνα Υπερχείλισης", detail: "Μια μεγάλη πισίνα υπερχείλισης με άνετες ξαπλώστρες και χώρο καθιστικού." },
        { name: "Το Τζάκι Φωτιάς", detail: "Ένα υπαίθριο lounge με τζάκι φωτιάς και χώρος για φαγητό σε εξωτερικό χώρο." },
        { name: "Οκτώ Υπνοδωμάτια", detail: "Υπνοδωμάτια με ιδιωτικό μπάνιο σε τρία επίπεδα, τα περισσότερα με θέα στη θάλασσα." },
        { name: "Ενιαίοι Χώροι", detail: "Σαλόνι και τραπεζαρία με ψηλά ταβάνια που ανοίγουν στην πισίνα." },
      ],
    },
    anemos: {
      name: "Βίλα Άνεμος",
      subtitle: "Η Κατοικία του Ανέμου · Κάστρο",
      meaning: "Άνεμος, ο άνεμος του νησιού",
      poolLength: "Ιδιωτική πισίνα υπερχείλισης",
      story:
        "Οικεία, φωτεινή, απόλυτα ιδιωτική. Διακόσια εξήντα τετραγωνικά μέτρα καθαρής κυκλαδίτικης αρχιτεκτονικής που πιάνει το μελτέμι και το φως εξίσου. Ο Άνεμος είναι η κατοικία για την οικογένεια και τους λίγους: πιο κοντινή, πιο ζεστή, με το ίδιο ανέγγιχτο ηλιοβασίλεμα.",
      highlights: [
        "Θέα 180° στη θάλασσα και το ηλιοβασίλεμα πάνω από το Κάστρο",
        "Ιδιωτική πισίνα υπερχείλισης και υπαίθριος χώρος χαλάρωσης",
        "Εσωτερικό τζάκι και μινιμαλιστικοί κυκλαδίτικοι χώροι",
        "Φυσικά στοιχεία βράχου και ασβεστωμένες πινελιές",
      ],
      amenities: [
        "Ιδιωτική πισίνα υπερχείλισης",
        "Υπαίθριος χώρος καθιστικού και χαλάρωσης",
        "Ιδιωτικός χώρος στάθμευσης",
        "Εσωτερικό τζάκι",
        "Κλιματισμός",
        "Πρόσβαση στο ίντερνετ μέσω Starlink",
        "Ηχητικός εξοπλισμός JBL",
        "Έξυπνες τηλεοράσεις επίπεδης οθόνης",
        "Στρώματα γιόγκα",
        "PlayStation 5",
        "Ψησταριά BBQ",
        "Βρεφική κούνια (κατόπιν ειδοποίησης, χωρίς χρέωση)",
        "Καρεκλάκι φαγητού (κατόπιν ειδοποίησης, χωρίς χρέωση)",
      ],
      galleryTags: ["Ιδιωτική πισίνα", "Η κατοικία", "Ασβεστωμένη γαλήνη", "Θέα στη θάλασσα", "Πισίνα στο σούρουπο", "Χώρος καθιστικού"],
      tagline: "Οικεία, φωτεινή και απόλυτα ιδιωτική, για την οικογένεια και τους λίγους.",
      longStory: [
        "Η Βίλα Άνεμος είναι το κτήμα στην πιο οικεία του εκδοχή: διακόσια εξήντα τετραγωνικά μέτρα καθαρής κυκλαδίτικης αρχιτεκτονικής που πιάνει το μελτέμι και το πρωινό φως εξίσου. Έξι φωτεινές σουίτες, ασβεστωμένες και ήρεμες, ανοίγουν στο ίδιο ανέγγιχτο ηλιοβασίλεμα με την αδελφή της.",
        "Είναι το σπίτι για την οικογένεια και τους λίγους. Πιο κοντινό, πιο ζεστό, πιο άνετο, χωρίς όμως καμία έκπτωση: ιδιωτική πισίνα υπερχείλισης, μια πέργκολα για μεγάλα δείπνα κάτω από τα αστέρια, και η Χώρα λίγα λεπτά πιο κάτω.",
        "Με έναν concierge σε ετοιμότητα όλο το εικοσιτετράωρο και καθημερινή καθαριότητα, ο Άνεμος μοιάζει λιγότερο με διαμονή και περισσότερο με μια ζωή που δεν θέλεις ποτέ να αφήσεις.",
      ],
      spaces: [
        { name: "Η Πισίνα Υπερχείλισης", detail: "Μια ιδιωτική πισίνα υπερχείλισης με υπαίθριο χώρο καθιστικού και χαλάρωσης." },
        { name: "Έξι Υπνοδωμάτια", detail: "Δίκλινα υπνοδωμάτια σε τρία επίπεδα, αρκετά με ιδιωτικό μπάνιο και θέα στη θάλασσα." },
        { name: "Το Τζάκι", detail: "Ένα εσωτερικό τζάκι ανάμεσα σε ασβεστωμένους, μινιμαλιστικούς χώρους." },
        { name: "Ενιαίοι Χώροι", detail: "Σαλόνι και τραπεζαρία που ανοίγουν απευθείας στην πισίνα." },
      ],
    },
  },
  experiencesSection: {
    eyebrow: "Χαρακτηριστικές Εμπειρίες",
    title: "Κάθε επιθυμία, διακριτικά φροντισμένη",
    subtitle:
      "Ένας αποκλειστικός concierge μετατρέπει όλο το νησί σε προέκταση της βίλας σας. Ό,τι κι αν φανταστείτε, ήδη ετοιμάζεται.",
    cta: "Μιλήστε με τον concierge σας",
  },
  experiences: [
    { title: "Ιδιωτικός Σεφ & Sommelier", copy: "Ένας σεφ εκπαιδευμένος σε κουζίνες Michelin σχεδιάζει το μενού σας γύρω από την ψαριά της ημέρας και την κάβα του κτήματος, σερβιρισμένο εκεί όπου το φως είναι καλύτερο." },
    { title: "Ναυλώσεις Σκαφών & Καταμαράν", copy: "Περάστε από τη βίλα σε ιδιωτικό σκάφος για τη Δήλο, τους τιρκουάζ όρμους της Ρήνειας ή μια κρουαζιέρα με σαμπάνια στο ηλιοβασίλεμα." },
    { title: "Μεταφορές με Ελικόπτερο & Τζετ", copy: "Αποφύγετε τον συνωστισμό. Απευθείας μεταφορές με ελικόπτερο από Αθήνα, Σαντορίνη ή το αεροδρόμιο σας φέρνουν στην πόρτα σε λίγα λεπτά." },
    { title: "Ευεξία στη Βίλα", copy: "Γιόγκα στην ανατολή στη βεράντα, θεραπευτής σπα, σάουνα και παγωμένη βουτιά: μια ιδιωτική τελετουργία ευεξίας χωρίς να φύγετε από το σπίτι." },
    { title: "Concierge 24/7", copy: "Ένας αποκλειστικός οικοδεσπότης προβλέπει τα πάντα: κρατήσεις σε Scorpios και Nammos, VIP τραπέζια, ασφάλεια, και το αδύνατο γίνεται απλό." },
    { title: "Εκδηλώσεις & Γιορτές", copy: "Προτάσεις γάμου, δείπνα-ορόσημα, ιδιωτικοί γάμοι, σχεδιασμένοι με φόντο το πιο φωτογραφημένο ηλιοβασίλεμα των Κυκλάδων." },
    { title: "Οδηγός & Στόλος", copy: "Ιδιωτικός οδηγός και επιμελημένος στόλος, από ανοιχτά τζιπ ως μια Mercedes S-Class, σε ετοιμότητα καθ' όλη τη διαμονή σας." },
    { title: "Επιμελημένες Βραδιές", copy: "DJ, ζωντανό μπουζούκι, mixologists και πλωτά πρωινά: η ενέργεια του νησιού, στημένη ιδιωτικά για εσάς." },
  ],
  servicesSection: {
    eyebrow: "Υπηρεσίες",
    title: "Υπηρεσίες & Concierge",
    subtitle: "Παροχές και κατόπιν αιτήματος, οργανωμένες από τον αποκλειστικό σας οικοδεσπότη.",
  },
  services: [
    "Τακτοποίηση Αποσκευών", "Ασφάλεια", "Φύλαξη Παιδιών", "Catering", "Εκδηλώσεις", "Μεταφορές Αεροδρομίου",
    "Ελικοδρόμιο", "Ιδιωτικός Σεφ", "Υπηρεσίες Concierge", "Ενοικίαση Αυτοκινήτων", "Ενοικίαση Σκαφών",
    "Συνεδρίες Μασάζ", "Συνεδρίες Γιόγκα & Pilates", "Υπηρεσίες Πλυντηρίου",
  ],
  galleryHome: {
    eyebrow: "Η Συλλογή",
    title: "Στιγμές που μιλούν από μόνες τους",
    note: "Ένας ζωντανός τοίχος του κτήματος: ηλιοβασιλέματα, εσωτερικοί χώροι, εναέριες λήψεις και στιγμές ζωής. Πατήστε οποιαδήποτε εικόνα για να ανοίξει σε πλήρη οθόνη.",
  },
  galleryTags: [
    "Βίλα Θάλασσα", "Κυκλαδίτικο φως", "Βίλα Άνεμος", "Χρυσή ώρα", "Ασβεστωμένο λευκό", "Πάνω από το Αιγαίο",
    "Κάστρο", "Φως και πέτρα", "Σούρουπο στο νησί", "Βίλα Άνεμος", "Θάλασσα και ουρανός", "Μύκονος",
  ],
  instagram: {
    eyebrow: "Στιγμές · Το Ημερολόγιο",
    title: "Ζωντανά από το νησί",
    note: "Η ροή ενημερώνεται αυτόματα από το Instagram Graph API όταν ρυθμιστεί.",
  },
  location: {
    eyebrow: "Τοποθεσία και Θέα",
    title: "Ψηλά στο Κάστρο, πάνω από όλη τη Μύκονο",
    subtitle:
      "Φάρος Αρμενιστής, Φανάρι. Ένα ακρωτήρι με ορίζοντες 180° που κοιτάζει τη Δήλο, την παλιά πόλη και το ανοιχτό Αιγαίο. Κοντά σε όλα, πάνω από όλα.",
    nearTitle: "Λίγα λεπτά από τα καλύτερα του νησιού",
    points: [
      { label: "Χώρα Μυκόνου", value: "6 λεπτά με αυτοκίνητο" },
      { label: "Αεροδρόμιο Μυκόνου (JMK)", value: "10 λεπτά με αυτοκίνητο" },
      { label: "Παλιό Λιμάνι και μαρίνα", value: "8 λεπτά με αυτοκίνητο" },
      { label: "Scorpios και Nammos", value: "15 λεπτά με αυτοκίνητο" },
    ],
  },
  testimonialsSection: { eyebrow: "Ιστορίες Επισκεπτών" },
  testimonials: [
    { quote: "Το πιο όμορφο μέρος που έχουμε μείνει ποτέ. Το ηλιοβασίλεμα από τη βεράντα της Θάλασσας είναι κάτι για το οποίο μιλάμε ακόμη, έναν χρόνο μετά.", author: "Η Οικογένεια Al-Rashid", origin: "Ντουμπάι · 10 βράδια, Βίλα Θάλασσα" },
    { quote: "Άψογα όλα, από τη μεταφορά με ελικόπτερο ως τον ιδιωτικό σεφ. Ένιωσες λιγότερο σαν ενοικίαση και περισσότερο σαν να έχεις ένα κομμάτι της Μυκόνου δικό σου.", author: "Sophia & Laurent", origin: "Παρίσι · Επέτειος, Βίλα Άνεμος" },
    { quote: "Φιλοξενήσαμε δώδεκα άτομα για γενέθλια-ορόσημο. Κάθε αίτημα ικανοποιήθηκε πριν καν το ζητήσουμε. Πραγματικά εξυπηρέτηση επιπέδου Aman.", author: "James H.", origin: "Λονδίνο · Ιδιωτική γιορτή" },
  ],
  closing: {
    eyebrow: "Κρατήσεις Ανοιχτές",
    titlePre: "Το ιδιωτικό σας ηλιοβασίλεμα",
    titleAccent: "σας περιμένει",
    subtitle: "Περιορισμένη διαθεσιμότητα κάθε σεζόν. Πείτε μας τις ημερομηνίες σας και αφήστε τον concierge να φροντίσει τα υπόλοιπα.",
  },
  pages: {
    experiences: {
      eyebrow: "Το Κτήμα",
      title: "Εμπειρίες & Υπηρεσίες",
      subtitle: "",
    },
    gallery: {
      eyebrow: "Το Κτήμα",
      title: "Συλλογή",
      subtitle: "Κάθε γωνιά της Βίλας Θάλασσα και της Βίλας Άνεμος, με κάθε λεπτομέρεια.",
    },
  },
  villaPage: {
    horizonPre: "Ένα σπίτι χτισμένο γύρω από",
    horizonAccent: "τον ορίζοντα",
    spacesEyebrow: "Οι Χώροι",
    galleryEyebrow: "Συλλογή",
    everyCornerOf: "Ανακαλύψτε τη",
    amenitiesEyebrow: "Παροχές",
    everythingPre: "Τα πάντα,",
    everythingAccent: "συμπεριλαμβάνονται",
    includedWithStay: "Περιλαμβάνονται σε κάθε διαμονή",
    locationEyebrow: "Τοποθεσία",
    kastroMykonos: "Κάστρο, Μύκονος",
    reservePre: "Κλείστε τη",
    reserveSubtitle: "Πείτε μας τις ημερομηνίες σας και αφήστε τον concierge να φροντίσει τα υπόλοιπα.",
    greekReg: "Μητρώο Ελληνικού Τουρισμού · ΜΗΤΕ",
    discover: "Ανακαλύψτε τη",
    servicesSubtitle: "Ό,τι προσφέρει το κτήμα, περιλαμβανόμενο ή κατόπιν αιτήματος.",
    includedServices: ["Καθημερινή καθαριότητα", "Ιδιωτικός χώρος στάθμευσης"],
  },
  aboutPage: {
    valuesEyebrow: "Οι Αξίες μας",
    valuesTitle: "Διακριτικά αφοσιωμένοι στη λεπτομέρεια",
    estatesEyebrow: "Οι Κατοικίες",
    estatesTitle: "Δύο σπίτια, ένας ορίζοντας",
    explore: "Ανακαλύψτε",
    comeStay: "Ελάτε να μείνετε μαζί μας",
    eyebrow: "Η Ιστορία μας",
    title: "Μια ιδιωτική γωνιά της Μυκόνου",
    lede: "Οι Aegean House ξεκίνησαν με μια απλή πεποίθηση: ότι το πιο όμορφο κομμάτι του νησιού πρέπει να βιώνεται, όχι απλώς να το κοιτάς.",
    story: [
      "Το 2022 ολοκληρώσαμε δύο κατοικίες στο ακρωτήρι του Κάστρου, στον Φάρο Αρμενιστή, εκεί όπου η γη κατηφορίζει προς τη Δήλο και το ανοιχτό πέλαγος. Η Βίλα Θάλασσα και η Βίλα Άνεμος χτίστηκαν με τις ίδιες προδιαγραφές και την ίδια θέα: η μία μεγαλοπρεπής, η άλλη οικεία, και οι δύο αναμφισβήτητα κυκλαδίτικες.",
      "Έκτοτε, τα πάντα αφορούν την ίδια τη διαμονή. Έναν ιδιωτικό σεφ που μαγειρεύει γύρω από την ψαριά της ημέρας, έναν concierge που ξέρει ποιο τραπέζι, ποιον καπετάνιο, ποια παραλία και πότε. Μεταφορές με ελικόπτερο που αποφεύγουν τον συνωστισμό. Λεπτομέρειες φροντισμένες πριν γίνουν αιτήματα.",
      "Κρατάμε το ημερολόγιο σκόπιμα ήσυχο. Ένας περιορισμένος αριθμός επισκεπτών κάθε σεζόν σημαίνει πως κάθε άφιξη είναι προσωπική, και κάθε αναχώρηση η αρχή της επόμενης κράτησης.",
    ],
    values: [
      { title: "Αρχιτεκτονική", copy: "Μινιμαλιστικός κυκλαδίτικος σχεδιασμός σε πέτρα, ασβέστη και φως, που πλαισιώνει τον ορίζοντα από κάθε δωμάτιο." },
      { title: "Εξυπηρέτηση", copy: "Μια πλήρης ιδιωτική ομάδα, διακριτική και προνοητική, σε προδιαγραφές επιπέδου Aman." },
      { title: "Ιδιωτικότητα", copy: "Δύο περιφραγμένες κατοικίες, επανδρωμένες και εξ ολοκλήρου δικές σας, πάνω από τη βοή του νησιού." },
      { title: "Τοποθεσία", copy: "Το ακρωτήρι του Κάστρου, λίγα λεπτά από τη Χώρα και όμως έναν κόσμο μακριά." },
    ],
    statLabels: ["Ιδιωτικές κατοικίες", "Συνολικός χώρος διαβίωσης", "Επισκέπτες που φιλοξενήθηκαν", "Θέα στο Αιγαίο"],
  },
  footer: {
    tagline:
      "Δύο ιδιωτικές κυκλαδίτικες κατοικίες πάνω από το Κάστρο: η Βίλα Θάλασσα και η Βίλα Άνεμος. Επαναπροσδιορίζουμε την πολυτέλεια στη Μύκονο από το 2022.",
    explore: "Εξερεύνηση",
    contact: "Επικοινωνία",
    rights: "© {year} {name}. Με επιφύλαξη παντός δικαιώματος.",
    location: "Μύκονος · Κάστρο · Κυκλάδες",
  },
};

export type Dict = typeof en;
export const dict: Record<Locale, Dict> = { en, el };

/** Ordered nav entries for the given locale (labels localized, hrefs stable). */
export function navFor(locale: Locale) {
  const n = dict[locale].nav;
  return [
    { label: n.thalassa, href: "/villas/thalassa" },
    { label: n.anemos, href: "/villas/anemos" },
    { label: n.experiences, href: "/experiences" },
    { label: n.gallery, href: "/gallery" },
    { label: n.about, href: "/about" },
  ];
}
