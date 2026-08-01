import { site } from "@/lib/site";

/** A localized string. Greek is the primary language. */
export type L = { el: string; en: string };

/* ------------------------------------------------------------------ */
/*  STORES: real addresses & phones from greencleaners.gr             */
/*  NOTE: lat/lng are close approximations for the map. Fine-tune the */
/*  coordinates once you confirm the exact storefront positions.      */
/* ------------------------------------------------------------------ */
export type Store = {
  id: string;
  name: L;
  area: L;
  address: L;
  phones: string[];
  coords: { lat: number; lng: number };
  hours: L;
  badge?: L;
};

export const stores: Store[] = [
  {
    id: "paiania",
    name: { el: "Παιανία (Κεντρικό)", en: "Paiania (Head Office)" },
    area: { el: "Παιανία", en: "Paiania" },
    address: {
      el: "1ο χλμ Λεωφ. Παιανίας – Μαρκοπούλου, Παιανία",
      en: "1st km Paiania – Markopoulou Ave., Paiania",
    },
    phones: ["210 6029084"],
    coords: { lat: 37.952, lng: 23.879 },
    hours: { el: "Δευτ–Παρ 08:00–20:00 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:00 · Sat 09:00–15:00" },
    badge: { el: "Κεντρική μονάδα", en: "Main facility" },
  },
  {
    id: "marousi",
    name: { el: "Μαρούσι", en: "Marousi" },
    area: { el: "Μαρούσι", en: "Marousi" },
    address: { el: "Πεντέλης 17, Μαρούσι 151 26", en: "17 Pentelis St., Marousi 151 26" },
    phones: ["210 6126680", "694 0221903"],
    coords: { lat: 38.051, lng: 23.806 },
    hours: { el: "Δευτ–Παρ 08:00–20:30 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:30 · Sat 09:00–15:00" },
  },
  {
    id: "pagkrati",
    name: { el: "Παγκράτι", en: "Pangrati" },
    area: { el: "Παγκράτι", en: "Pangrati" },
    address: {
      el: "Πολυδάμαντος 1 & Πλ. Πλαστήρα 6, Παγκράτι",
      en: "1 Polydamantos & 6 Plastira Sq., Pangrati",
    },
    phones: ["210 6995850"],
    coords: { lat: 37.968, lng: 23.751 },
    hours: { el: "Δευτ–Παρ 08:00–20:30 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:30 · Sat 09:00–15:00" },
    badge: { el: "Νέο κατάστημα", en: "New store" },
  },
  {
    id: "spata",
    name: { el: "Σπάτα", en: "Spata" },
    area: { el: "Σπάτα", en: "Spata" },
    address: { el: "Δημάρχου Χρ. Μπέκα 177, Σπάτα", en: "177 Dimarchou Chr. Beka St., Spata" },
    phones: ["210 6635920"],
    coords: { lat: 37.964, lng: 23.917 },
    hours: { el: "Δευτ–Παρ 08:00–20:00 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:00 · Sat 09:00–15:00" },
  },
  {
    id: "nea-makri",
    name: { el: "Νέα Μάκρη", en: "Nea Makri" },
    area: { el: "Νέα Μάκρη", en: "Nea Makri" },
    address: { el: "Λεωφ. Μαραθώνος 103, Νέα Μάκρη", en: "103 Marathonos Ave., Nea Makri" },
    phones: ["229 4114037"],
    coords: { lat: 38.087, lng: 23.977 },
    hours: { el: "Δευτ–Παρ 08:00–20:00 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:00 · Sat 09:00–15:00" },
  },
  {
    id: "doukissis-plakentias",
    name: { el: "Δουκίσσης Πλακεντίας", en: "Doukissis Plakentias" },
    area: { el: "Χαλάνδρι", en: "Halandri" },
    address: { el: "Ηρακλείτου 14-16, Δουκίσσης Πλακεντίας", en: "14-16 Irakleitou St., Doukissis Plakentias" },
    phones: ["213 0416410"],
    coords: { lat: 38.033, lng: 23.833 },
    hours: { el: "Δευτ–Παρ 08:00–20:30 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:30 · Sat 09:00–15:00" },
  },
  {
    id: "rafina",
    name: { el: "Ραφήνα", en: "Rafina" },
    area: { el: "Ραφήνα", en: "Rafina" },
    address: { el: "Λεωφ. Μαραθώνος 220, Ραφήνα", en: "220 Marathonos Ave., Rafina" },
    phones: ["229 4075713"],
    coords: { lat: 38.019, lng: 24.001 },
    hours: { el: "Δευτ–Παρ 08:00–20:00 · Σάβ 09:00–15:00", en: "Mon–Fri 08:00–20:00 · Sat 09:00–15:00" },
    badge: { el: "Νέο πρατήριο", en: "New branch" },
  },
];

/* ------------------------------------------------------------------ */
/*  SERVICES                                                          */
/* ------------------------------------------------------------------ */
export type Service = {
  id: string;
  icon: string; // lucide-react icon name
  title: L;
  short: L;
  description: L;
  featured?: boolean;
};

export const services: Service[] = [
  {
    id: "dry-cleaning",
    icon: "Shirt",
    title: { el: "Οικολογικό Στεγνό Καθάρισμα", en: "Ecological Dry Cleaning" },
    short: {
      el: "Με διαλύτη K.W.L., φιλικό προς το ύφασμα και το περιβάλλον.",
      en: "Using the K.W.L. solvent, gentle on fabric and the environment.",
    },
    description: {
      el: "Βαθύς και ασφαλής καθαρισμός για κοστούμια, παλτό και ευαίσθητα υφάσματα με τον οικολογικό διαλύτη K.W.L. Χωρίς έντονες οσμές, χωρίς φθορά των ινών και με αψεγάδιαστο φινίρισμα.",
      en: "Deep, safe cleaning for suits, coats and delicate fabrics using the K.W.L. ecological solvent. No harsh odours, no damage to the fibres and an impeccable finish.",
    },
    featured: true,
  },
  {
    id: "laundry",
    icon: "WashingMachine",
    title: { el: "Πλύσιμο & Σιδέρωμα", en: "Laundry & Pressing" },
    short: {
      el: "Καθημερινά ρούχα, πουκάμισα και λευκά είδη.",
      en: "Everyday garments, shirts and linens.",
    },
    description: {
      el: "Επαγγελματικό πλύσιμο και σιδέρωμα με απόλυτη προσοχή στη λεπτομέρεια. Τα πουκάμισά σας επιστρέφουν τραγανά, με σταθερές πιέτες και έτοιμα να φορεθούν.",
      en: "Professional laundering and pressing with meticulous attention to detail. Your shirts return crisp, with sharp creases and ready to wear.",
    },
    featured: true,
  },
  {
    id: "blankets",
    icon: "BedDouble",
    title: { el: "Κουβέρτες & Παπλώματα", en: "Blankets & Comforters" },
    short: {
      el: "Ατομικό πλύσιμο και υγιεινή απολύμανση.",
      en: "Individual washing and hygienic disinfection.",
    },
    description: {
      el: "Κάθε κουβέρτα και πάπλωμα πλένεται ξεχωριστά και απολυμαίνεται, ποτέ μαζί με είδη άλλων πελατών. Επιστρέφει φουσκωτό, φρέσκο και απολύτως υγιεινό για όλη την οικογένεια.",
      en: "Every blanket and comforter is washed separately and disinfected, never together with other customers' items. It returns plump, fresh and perfectly hygienic for the whole family.",
    },
    featured: true,
  },
  {
    id: "carpets",
    icon: "Layers",
    title: { el: "Χαλιά & Δωρεάν Φύλαξη", en: "Carpets & Free Storage" },
    short: {
      el: "Καθαρισμός εις βάθος και φύλαξη για όλη τη σεζόν.",
      en: "Deep cleaning and full-season storage.",
    },
    description: {
      el: "Επαγγελματικός καθαρισμός χαλιών με σεβασμό στο πέλος και τα χρώματα. Και επειδή ο χώρος σας έχει αξία, φυλάσσουμε τα χαλιά σας δωρεάν για ολόκληρη τη σεζόν.",
      en: "Professional carpet cleaning that respects the pile and the colours. And because your space matters, we store your carpets free of charge for the entire season.",
    },
    featured: true,
  },
  {
    id: "wedding",
    icon: "Crown",
    title: { el: "Νυφικά & Βαπτιστικά", en: "Wedding & Christening Gowns" },
    short: {
      el: "Καθαρισμός και συντήρηση κειμηλίου.",
      en: "Cleaning and heirloom preservation.",
    },
    description: {
      el: "Το νυφικό σας αποτελεί ανάμνηση ζωής. Το καθαρίζουμε με εξειδικευμένες τεχνικές και το συσκευάζουμε για μακροχρόνια συντήρηση, ώστε να παραμείνει λαμπερό για χρόνια.",
      en: "Your wedding dress is a lifelong memory. We clean it with specialist techniques and box it for long-term preservation, so it remains radiant for years to come.",
    },
    featured: true,
  },
  {
    id: "leather",
    icon: "Feather",
    title: { el: "Δέρμα & Γούνα", en: "Leather & Fur" },
    short: {
      el: "Καθαρισμός, βαφή και αναζωογόνηση.",
      en: "Cleaning, dyeing and restoration.",
    },
    description: {
      el: "Δερμάτινα και γούνινα είδη που απαιτούν εξειδικευμένη μεταχείριση. Τα καθαρίζουμε, τα βάφουμε και τα αναζωογονούμε, επαναφέροντας την υφή και τη λάμψη της πρώτης ημέρας.",
      en: "Leather and fur pieces that require specialist treatment. We clean, re-dye and restore them, bringing back the texture and lustre of day one.",
    },
    featured: true,
  },
  {
    id: "waterproofing",
    icon: "Umbrella",
    title: { el: "Αδιαβροχοποίηση", en: "Waterproofing" },
    short: {
      el: "Προστασία για παλτό, μπουφάν και υποδήματα.",
      en: "Protection for coats, jackets and footwear.",
    },
    description: {
      el: "Προστατευτική επεξεργασία που απωθεί νερό και λεκέδες, παρατείνοντας τη διάρκεια ζωής των αγαπημένων σας ρούχων χωρίς να αλλοιώνει το ύφασμα.",
      en: "A protective treatment that repels water and stains, extending the life of your favourite garments without altering the fabric.",
    },
  },
  {
    id: "storage",
    icon: "Archive",
    title: { el: "Δωρεάν Εποχιακή Φύλαξη", en: "Free Seasonal Storage" },
    short: {
      el: "Κερδίστε χώρο· εμείς φυλάσσουμε τα ρούχα σας.",
      en: "Reclaim space while we store your garments.",
    },
    description: {
      el: "Καθαρίστε τα χειμερινά ή τα καλοκαιρινά σας ρούχα και αφήστε τα σε εμάς. Τα φυλάσσουμε καθαρά και προστατευμένα για όλη τη σεζόν, χωρίς καμία χρέωση.",
      en: "Have your winter or summer wardrobe cleaned and leave it with us. We keep it clean and protected for the entire season, at no charge.",
    },
  },
  {
    id: "hospitality",
    icon: "Hotel",
    title: { el: "Airbnb & Ξενοδοχεία", en: "Airbnb & Hotels" },
    short: {
      el: "Λευκά είδη σε σταθερά, γρήγορα προγράμματα.",
      en: "Linens on reliable, fast schedules.",
    },
    description: {
      el: "Σταθερή ποιότητα και απόλυτη συνέπεια για επαγγελματίες της φιλοξενίας. Σεντόνια, πετσέτες και λευκά είδη πάντα έτοιμα, με προγραμματισμένη παραλαβή και παράδοση.",
      en: "Consistent quality and complete reliability for hospitality professionals. Sheets, towels and linens always ready, with scheduled pickup and delivery.",
    },
  },
  {
    id: "pickup",
    icon: "Truck",
    title: { el: "Δωρεάν Παραλαβή & Παράδοση", en: "Free Pickup & Delivery" },
    short: {
      el: "Από τον χώρο σας, χωρίς χρέωση.*",
      en: "From your premises, free of charge.*",
    },
    description: {
      el: "Κλείστε ραντεβού και ένας συνεργάτης μας επισκέπτεται τον χώρο σας. Δωρεάν παραλαβή και παράδοση για παραγγελίες άνω των 35€, σε όλη την περιοχή εξυπηρέτησης.",
      en: "Book an appointment and a member of our team visits your premises. Free pickup and delivery for orders over 35€, across our entire service area.",
    },
  },
];

export const featuredServices = services.filter((s) => s.featured);

/* ------------------------------------------------------------------ */
/*  USPs / trust pillars                                              */
/* ------------------------------------------------------------------ */
export const pillars: { icon: string; title: L; text: L }[] = [
  {
    icon: "Leaf",
    title: { el: "Οικολογική Τεχνολογία", en: "Green Technology" },
    text: {
      el: "Διαλύτης K.W.L., φιλικός προς το περιβάλλον και την υγεία σας.",
      en: "The K.W.L. solvent, kind to the environment and to your health.",
    },
  },
  {
    icon: "ShieldCheck",
    title: { el: "Υγιεινή ανά Πελάτη", en: "Per-Customer Hygiene" },
    text: {
      el: "Κουβέρτες και παπλώματα πλένονται ξεχωριστά και απολυμαίνονται.",
      en: "Blankets and comforters are washed separately and disinfected.",
    },
  },
  {
    icon: "Archive",
    title: { el: "Δωρεάν Φύλαξη", en: "Free Storage" },
    text: {
      el: "Ρούχα και χαλιά φυλάσσονται δωρεάν για όλη τη σεζόν.",
      en: "Clothes and carpets are stored free for the whole season.",
    },
  },
  {
    icon: "Truck",
    title: { el: "Παραλαβή στον Χώρο σας", en: "Doorstep Pickup" },
    text: {
      el: "Δωρεάν παραλαβή και παράδοση για παραγγελίες άνω των 35€.",
      en: "Free pickup and delivery for orders over 35€.",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  HOW IT WORKS                                                      */
/* ------------------------------------------------------------------ */
export const howItWorks: { icon: string; title: L; text: L }[] = [
  {
    icon: "CalendarCheck",
    title: { el: "Κλείνετε ραντεβού", en: "Book an appointment" },
    text: {
      el: "Online, τηλεφωνικά ή με ένα μήνυμα στο WhatsApp, σε 60 δευτερόλεπτα.",
      en: "Online, by phone or with a WhatsApp message, in 60 seconds.",
    },
  },
  {
    icon: "Truck",
    title: { el: "Παραλαμβάνουμε", en: "We collect" },
    text: {
      el: "Ένας συνεργάτης μας παραλαμβάνει τα ρούχα σας από τον χώρο σας.",
      en: "A member of our team collects your items from your premises.",
    },
  },
  {
    icon: "Sparkles",
    title: { el: "Καθαρίζουμε με φροντίδα", en: "We clean with care" },
    text: {
      el: "Οικολογικός καθαρισμός, λεπτομερής έλεγχος ποιότητας και άψογο φινίρισμα.",
      en: "Ecological cleaning, detailed quality control and a flawless finish.",
    },
  },
  {
    icon: "PackageCheck",
    title: { el: "Παραδίδουμε", en: "We deliver" },
    text: {
      el: "Επιστρέφουμε τα ρούχα σας καθαρά, σιδερωμένα και έτοιμα να φορεθούν.",
      en: "We return your items clean, pressed and ready to wear.",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  PRICING  (indicative, confirmed at the store)                     */
/* ------------------------------------------------------------------ */
export type PriceItem = { name: L; price: string; unit?: L };
export type PriceCategory = { id: string; title: L; note?: L; items: PriceItem[] };

export const pricing: PriceCategory[] = [
  {
    id: "garments",
    title: { el: "Ρούχα & Κοστούμια", en: "Garments & Suits" },
    items: [
      { name: { el: "Πουκάμισο (πλύσιμο & σιδέρωμα)", en: "Shirt (wash & press)" }, price: "2,50€" },
      { name: { el: "Παντελόνι", en: "Trousers" }, price: "4,50€" },
      { name: { el: "Σακάκι", en: "Jacket" }, price: "6,00€" },
      { name: { el: "Κοστούμι (2 τεμάχια)", en: "Suit (2 pieces)" }, price: "10,00€" },
      { name: { el: "Φόρεμα", en: "Dress" }, price: "από 8,00€" },
      { name: { el: "Παλτό", en: "Coat" }, price: "από 12,00€" },
      { name: { el: "Φούστα", en: "Skirt" }, price: "5,00€" },
      { name: { el: "Γραβάτα", en: "Tie" }, price: "3,00€" },
    ],
  },
  {
    id: "home",
    title: { el: "Οικιακά Είδη", en: "Home Textiles" },
    note: {
      el: "Ατομικό πλύσιμο και απολύμανση για κάθε τεμάχιο.",
      en: "Individual washing and disinfection for every item.",
    },
    items: [
      { name: { el: "Κουβέρτα μονή", en: "Single blanket" }, price: "9,00€" },
      { name: { el: "Κουβέρτα διπλή", en: "Double blanket" }, price: "13,00€" },
      { name: { el: "Πάπλωμα μονό", en: "Single comforter" }, price: "12,00€" },
      { name: { el: "Πάπλωμα διπλό", en: "Double comforter" }, price: "16,00€" },
      { name: { el: "Κουρτίνες", en: "Curtains" }, price: "6,00€", unit: { el: "/ κιλό", en: "/ kg" } },
    ],
  },
  {
    id: "carpets",
    title: { el: "Χαλιά", en: "Carpets" },
    note: {
      el: "Περιλαμβάνει δωρεάν φύλαξη για όλη τη σεζόν.",
      en: "Includes free storage for the whole season.",
    },
    items: [
      { name: { el: "Μηχανοποίητο χαλί", en: "Machine-made carpet" }, price: "5,00€", unit: { el: "/ m²", en: "/ m²" } },
      { name: { el: "Χειροποίητο / μάλλινο", en: "Handmade / wool" }, price: "από 8,00€", unit: { el: "/ m²", en: "/ m²" } },
      { name: { el: "Φλοκάτη", en: "Flokati rug" }, price: "9,00€", unit: { el: "/ m²", en: "/ m²" } },
    ],
  },
  {
    id: "special",
    title: { el: "Εξειδικευμένα", en: "Specialised" },
    items: [
      { name: { el: "Νυφικό (καθαρισμός & συσκευασία)", en: "Wedding dress (clean & box)" }, price: "από 60,00€" },
      { name: { el: "Δερμάτινο μπουφάν", en: "Leather jacket" }, price: "από 30,00€" },
      { name: { el: "Γούνα", en: "Fur coat" }, price: "από 45,00€" },
      { name: { el: "Αδιαβροχοποίηση", en: "Waterproofing" }, price: "από 8,00€" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  TESTIMONIALS                                                       */
/*                                                                     */
/*  ⚠ PLACEHOLDER CONTENT. These are sample reviews, NOT real Google   */
/*  reviews. Replace each entry below with genuine reviews from your   */
/*  Google Business Profile (reviewer name, rating, text). Then set    */
/*  the figures in `reviewsMeta` to your real Google rating & count.   */
/* ------------------------------------------------------------------ */
export type Testimonial = { name: string; area: L; rating: number; quote: L };

export const testimonials: Testimonial[] = [
  {
    name: "Ελένη Παπαδοπούλου",
    area: { el: "Μαρούσι", en: "Marousi" },
    rating: 5,
    quote: {
      el: "Εμπιστεύτηκα το νυφικό μου με αγωνία και μου το επέστρεψαν άψογο, σε εξαιρετική συσκευασία. Άριστη εξυπηρέτηση και πραγματικό επαγγελματισμό.",
      en: "I entrusted them with my wedding dress and it came back flawless, beautifully boxed. Excellent service and genuine professionalism.",
    },
  },
  {
    name: "Γιώργος Αντωνίου",
    area: { el: "Παγκράτι", en: "Pangrati" },
    rating: 5,
    quote: {
      el: "Η δωρεάν παραλαβή από τον χώρο μου είναι εξαιρετικά βολική. Τα πουκάμισα επιστρέφουν τέλεια σιδερωμένα και πάντα στην ώρα τους.",
      en: "The free pickup from my home is exceptionally convenient. My shirts come back perfectly pressed and always on time.",
    },
  },
  {
    name: "Μαρία Κωνσταντίνου",
    area: { el: "Παιανία", en: "Paiania" },
    rating: 5,
    quote: {
      el: "Εμπιστεύομαι τα παπλώματα της οικογένειας μόνο εδώ. Το γεγονός ότι πλένονται ξεχωριστά και απολυμαίνονται μου δίνει απόλυτη σιγουριά.",
      en: "I trust the family's comforters only here. The fact that they are washed separately and disinfected gives me complete peace of mind.",
    },
  },
  {
    name: "Δημήτρης Βλάχος",
    area: { el: "Ραφήνα", en: "Rafina" },
    rating: 5,
    quote: {
      el: "Διαχειρίζομαι δύο Airbnb και η συνέπειά τους είναι ανεκτίμητη. Καθαρά λευκά είδη, στην ώρα τους, κάθε φορά.",
      en: "I manage two Airbnb properties and their reliability is invaluable. Clean linens, on time, every single time.",
    },
  },
  {
    name: "Σοφία Νικολάου",
    area: { el: "Σπάτα", en: "Spata" },
    rating: 5,
    quote: {
      el: "Καθάρισαν ένα δερμάτινο που το θεωρούσα χαμένο και το επανέφεραν στην αρχική του κατάσταση. Επαγγελματίες με τεχνογνωσία.",
      en: "They cleaned a leather jacket I had given up on and restored it to its original condition. True professionals with real expertise.",
    },
  },
  {
    name: "Κώστας Δημητρίου",
    area: { el: "Νέα Μάκρη", en: "Nea Makri" },
    rating: 5,
    quote: {
      el: "Φυλάσσουν τα χειμερινά μου ρούχα δωρεάν όλο το καλοκαίρι και κερδίζω πολύτιμο χώρο στο σπίτι. Έξυπνη, premium υπηρεσία.",
      en: "They store my winter clothes free of charge all summer and I gain valuable space at home. A smart, premium service.",
    },
  },
];

/**
 * Google reviews summary shown above the testimonials.
 * Set `rating` and `count` to your real Google figures, and `url` to your
 * Google Business Profile / Maps listing. While `count` is 0, the numeric
 * summary is hidden and only the "read our reviews" link is shown.
 */
export const reviewsMeta = {
  rating: 0,
  count: 0,
  url: "https://www.google.com/maps/search/?api=1&query=Green+Cleaners+%CE%9A%CE%B1%CE%B8%CE%B1%CF%81%CE%B9%CF%83%CF%84%CE%AE%CF%81%CE%B9%CE%B1+%CE%A0%CE%B1%CE%B9%CE%B1%CE%BD%CE%AF%CE%B1",
};

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
export const faqs: { q: L; a: L }[] = [
  {
    q: { el: "Πόσο γρήγορα θα είναι έτοιμα τα ρούχα μου;", en: "How quickly will my items be ready?" },
    a: {
      el: "Τα περισσότερα είδη είναι έτοιμα εντός 48 ωρών. Για επείγουσες παραδόσεις, ενημερώστε μας στο κατάστημα ή σημειώστε το στη φόρμα του ραντεβού.",
      en: "Most items are ready within 48 hours. For urgent turnaround, let us know in store or note it in the booking form.",
    },
  },
  {
    q: { el: "Τι είναι ο οικολογικός διαλύτης K.W.L.;", en: "What is the K.W.L. ecological solvent?" },
    a: {
      el: "Πρόκειται για έναν σύγχρονο διαλύτη, φιλικό προς το περιβάλλον και το δέρμα, που καθαρίζει εις βάθος χωρίς έντονες οσμές ή φθορά των υφασμάτων.",
      en: "It is a modern solvent, friendly to the environment and to the skin, that cleans deeply without harsh odours or damage to fabrics.",
    },
  },
  {
    q: { el: "Πώς λειτουργεί η δωρεάν παραλαβή και παράδοση;", en: "How does free pickup and delivery work?" },
    a: {
      el: "Κλείνετε ραντεβού και επισκεπτόμαστε τον χώρο σας. Η υπηρεσία παρέχεται δωρεάν για παραγγελίες άνω των 35€ εντός της περιοχής εξυπηρέτησης.",
      en: "You book an appointment and we visit your premises. The service is provided free of charge for orders over 35€ within our service area.",
    },
  },
  {
    q: { el: "Είναι πράγματι δωρεάν η φύλαξη;", en: "Is the storage really free?" },
    a: {
      el: "Μάλιστα. Καθαρίζουμε τα εποχιακά σας ρούχα ή χαλιά και τα φυλάσσουμε καθαρά και προστατευμένα για όλη τη σεζόν, χωρίς καμία χρέωση.",
      en: "Yes. We clean your seasonal clothes or carpets and store them clean and protected for the whole season, at no charge.",
    },
  },
  {
    q: { el: "Καθαρίζετε νυφικά και δερμάτινα;", en: "Do you clean wedding dresses and leather?" },
    a: {
      el: "Βεβαίως. Διαθέτουμε εξειδικευμένες υπηρεσίες για νυφικά, δερμάτινα, γούνες και αδιαβροχοποίηση, με κατάλληλη μεταχείριση για κάθε υλικό.",
      en: "Of course. We offer specialist services for wedding dresses, leather, fur and waterproofing, with appropriate care for each material.",
    },
  },
  {
    q: { el: "Εξυπηρετείτε επιχειρήσεις και Airbnb;", en: "Do you serve businesses and Airbnb?" },
    a: {
      el: "Μάλιστα, με προγραμματισμένη παραλαβή και παράδοση και σταθερή ποιότητα για ξενοδοχεία, Airbnb και επαγγελματίες της φιλοξενίας.",
      en: "Yes, with scheduled pickup and delivery and consistent quality for hotels, Airbnb and hospitality professionals.",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Quick contact constants re-export                                  */
/* ------------------------------------------------------------------ */
export const contact = {
  phone: site.bookingPhone,
  whatsapp: site.whatsapp,
  email: site.email,
};
