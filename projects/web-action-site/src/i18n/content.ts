export type Lang = 'en' | 'el'

export interface Content {
  nav: { services: string; studio: string; contact: string; start: string }
  hero: {
    badge: string
    cosmicHead: string
    cosmicWords: string
    titleA: string
    titleHighlight: string
    subtitle: string
    ctaPrimary: string
    ctaSecondary: string
    scroll: string
  }
  marquee: string[]
  services: {
    eyebrow: string
    heading: string
    items: { key: string; title: string; blurb: string }[]
  }
  showcase: {
    eyebrow: string
    heading: string
    body: string
    topLine: string
    bottomLine: string
    sketchLabel: string
    codeLabel: string
    siteLabel: string
    sketchCaption: string
    codeCaption: string
    siteCaption: string
  }
  studio: {
    eyebrow: string
    heading: string
    body: string
    points: string[]
  }
  contact: {
    eyebrow: string
    title: string
    intro: string
    name: string
    namePh: string
    email: string
    emailPh: string
    company: string
    companyPh: string
    need: string
    details: string
    detailsPh: string
    send: string
    sentTitle: string
    sentBody: string
    sendAnother: string
    emailLabel: string
    locationLabel: string
    location: string
    hoursLabel: string
    hours: string
    needOptions: string[]
  }
  footer: { tagline: string; explore: string; touch: string; rights: string }
}

export const dict: Record<Lang, Content> = {
  en: {
    nav: { services: 'Services', studio: 'Studio', contact: 'Contact', start: 'Start a project' },
    hero: {
      badge: 'Athens · Web & App Studio',
      cosmicHead: 'Web Action',
      cosmicWords: 'Design, Code, Action',
      titleA: 'We build websites that',
      titleHighlight: 'take action.',
      subtitle:
        'Web Action is a design & development studio crafting fast, distinctive websites and apps for ambitious brands, engineered for performance and built to convert.',
      ctaPrimary: 'Start a project',
      ctaSecondary: 'View services',
      scroll: 'Scroll',
    },
    marquee: ['Web Design', 'Web Development', 'Mobile Apps', 'E-commerce', 'UI / UX', 'Branding'],
    services: {
      eyebrow: 'What we do',
      heading: 'A full studio for everything you ship on the web.',
      items: [
        { key: 'design', title: 'Web Design', blurb: 'Distinctive, on-brand interfaces designed pixel by pixel, never templated.' },
        { key: 'dev', title: 'Web Development', blurb: 'Hand-coded, lightning-fast websites on a modern, maintainable stack.' },
        { key: 'apps', title: 'Mobile Apps', blurb: 'Native-feeling cross-platform apps your users will actually keep.' },
        { key: 'ecom', title: 'E-commerce', blurb: 'Storefronts built to convert, from first impression to checkout.' },
      ],
    },
    showcase: {
      eyebrow: 'Our process',
      heading: 'From first sketch to a living website.',
      body: 'Every Web Action build starts on paper, becomes hand-written code, and ends as a fast, distinctive site. No page builders, no recycled themes.',
      topLine: 'No templates.',
      bottomLine: 'Drawn and coded by hand.',
      sketchLabel: 'The sketch',
      codeLabel: 'The code',
      siteLabel: 'The result',
      sketchCaption: 'Every brand starts by hand, with pencil, paper and plenty of iterations.',
      codeCaption: 'Then it becomes clean, hand-written code on a modern, maintainable stack.',
      siteCaption: 'And it ships as a fast, distinctive site, built to convert.',
    },
    studio: {
      eyebrow: 'The Studio',
      heading: 'A studio with a passion for the web',
      body:
        'We’re an Athens-based digital studio, a small team of designers and developers who believe every business worth its name deserves a digital presence worth just as much. We build every project from scratch — no ready-made solutions, no compromises on quality.',
      points: ['Hand-built, never templated', 'Performance as a first principle', 'Clear, honest communication'],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Let’s start something worth shipping.',
      intro: 'Tell us a little about your project. We reply within one business day.',
      name: 'Name',
      namePh: 'Your name',
      email: 'Email',
      emailPh: 'you@company.com',
      company: 'Company',
      companyPh: 'Company / brand',
      need: 'What do you need?',
      details: 'Project details',
      detailsPh: 'Tell us about your goals, timeline and anything else…',
      send: 'Send message',
      sentTitle: 'Message sent',
      sentBody: 'Thanks for reaching out. We’ll be in touch within one business day.',
      sendAnother: 'Send another',
      emailLabel: 'Email',
      locationLabel: 'Studio',
      location: 'Athens, Greece',
      hoursLabel: 'Hours',
      hours: 'Mon–Fri · 09:00–18:00 EET',
      needOptions: ['Web design', 'Web development', 'Mobile app', 'E-commerce', 'Other'],
    },
    footer: {
      tagline: 'A design & development studio building websites and apps that move brands forward.',
      explore: 'Explore',
      touch: 'Get in touch',
      rights: 'All rights reserved.',
    },
  },

  el: {
    nav: { services: 'Υπηρεσίες', studio: 'Το Studio', contact: 'Επικοινωνία', start: 'Ξεκινήστε ένα έργο' },
    hero: {
      badge: 'Αθήνα · Studio για Web & Εφαρμογές',
      cosmicHead: 'Web Action',
      cosmicWords: 'Σχέδιο, Κώδικας, Δράση',
      titleA: 'Φτιάχνουμε ιστοσελίδες',
      titleHighlight: 'που δρουν.',
      subtitle:
        'Η Web Action είναι ένα studio σχεδιασμού & ανάπτυξης που δημιουργεί γρήγορες, ξεχωριστές ιστοσελίδες και εφαρμογές για φιλόδοξες μάρκες, με γνώμονα την ταχύτητα και το αποτέλεσμα.',
      ctaPrimary: 'Ξεκινήστε ένα έργο',
      ctaSecondary: 'Δείτε τις υπηρεσίες',
      scroll: 'Κυλήστε',
    },
    marquee: ['Σχεδιασμός Web', 'Ανάπτυξη Web', 'Εφαρμογές Κινητών', 'E-shop', 'UI / UX', 'Branding'],
    services: {
      eyebrow: 'Τι κάνουμε',
      heading: 'Ένα ολοκληρωμένο studio για ό,τι ανεβάζετε στο web.',
      items: [
        { key: 'design', title: 'Σχεδιασμός Ιστοσελίδων', blurb: 'Ξεχωριστά interfaces, φτιαγμένα στο pixel, ποτέ έτοιμα templates.' },
        { key: 'dev', title: 'Ανάπτυξη Ιστοσελίδων', blurb: 'Αστραπιαία γρήγορες ιστοσελίδες, γραμμένες στο χέρι σε σύγχρονο stack.' },
        { key: 'apps', title: 'Εφαρμογές Κινητών', blurb: 'Cross-platform εφαρμογές με native αίσθηση, που οι χρήστες κρατούν.' },
        { key: 'ecom', title: 'Ηλεκτρονικό Εμπόριο', blurb: 'E-shops φτιαγμένα να πουλάνε, από την πρώτη ματιά μέχρι το ταμείο.' },
      ],
    },
    showcase: {
      eyebrow: 'Η διαδικασία μας',
      heading: 'Από το πρώτο σκίτσο σε ένα website που ζει.',
      body: 'Κάθε έργο της Web Action ξεκινά στο χαρτί, γίνεται κώδικας γραμμένος στο χέρι και καταλήγει σε ένα γρήγορο, ξεχωριστό site. Χωρίς page builders, χωρίς έτοιμα θέματα.',
      topLine: 'Χωρίς έτοιμα templates.',
      bottomLine: 'Σχεδιασμένο και κωδικοποιημένο στο χέρι.',
      sketchLabel: 'Το σκίτσο',
      codeLabel: 'Ο κώδικας',
      siteLabel: 'Το αποτέλεσμα',
      sketchCaption: 'Κάθε ταυτότητα ξεκινά στο χέρι, με μολύβι, χαρτί και πολλές δοκιμές.',
      codeCaption: 'Μετά γίνεται καθαρός κώδικας, γραμμένος στο χέρι σε σύγχρονο stack.',
      siteCaption: 'Και βγαίνει στον αέρα ως ένα γρήγορο, ξεχωριστό site που πουλάει.',
    },
    studio: {
      eyebrow: 'Το Studio',
      heading: 'Ένα studio με πάθος για το web',
      body:
        'Είμαστε ένα digital studio με έδρα την Αθήνα, αποτελούμενο από μια μικρή ομάδα designers και developers που πιστεύει ότι κάθε αξιόλογη επιχείρηση αξίζει μια εξίσου αξιόλογη ψηφιακή παρουσία. Δημιουργούμε κάθε έργο από την αρχή, χωρίς έτοιμες λύσεις και συμβιβασμούς στην ποιότητα.',
      points: ['Φτιαγμένα στο χέρι, ποτέ templates', 'Η ταχύτητα ως αρχή', 'Καθαρή, ειλικρινής επικοινωνία'],
    },
    contact: {
      eyebrow: 'Επικοινωνία',
      title: 'Ας ξεκινήσουμε κάτι που αξίζει να βγει στον αέρα.',
      intro: 'Πείτε μας λίγα λόγια για το έργο σας. Απαντάμε εντός μίας εργάσιμης ημέρας.',
      name: 'Όνομα',
      namePh: 'Το όνομά σας',
      email: 'Email',
      emailPh: 'eseis@etaireia.gr',
      company: 'Εταιρεία',
      companyPh: 'Εταιρεία / μάρκα',
      need: 'Τι χρειάζεστε;',
      details: 'Λεπτομέρειες έργου',
      detailsPh: 'Πείτε μας για τους στόχους, το χρονοδιάγραμμα και ό,τι άλλο…',
      send: 'Αποστολή μηνύματος',
      sentTitle: 'Το μήνυμα στάλθηκε',
      sentBody: 'Ευχαριστούμε που επικοινωνήσατε. Θα σας απαντήσουμε εντός μίας εργάσιμης ημέρας.',
      sendAnother: 'Νέο μήνυμα',
      emailLabel: 'Email',
      locationLabel: 'Έδρα',
      location: 'Αθήνα, Ελλάδα',
      hoursLabel: 'Ώρες',
      hours: 'Δευτ–Παρ · 09:00–18:00 EET',
      needOptions: ['Σχεδιασμός', 'Ανάπτυξη', 'Εφαρμογή', 'E-shop', 'Άλλο'],
    },
    footer: {
      tagline: 'Ένα studio σχεδιασμού & ανάπτυξης που φτιάχνει ιστοσελίδες και εφαρμογές που πάνε τις μάρκες μπροστά.',
      explore: 'Πλοήγηση',
      touch: 'Επικοινωνία',
      rights: 'Με την επιφύλαξη παντός δικαιώματος.',
    },
  },
}
