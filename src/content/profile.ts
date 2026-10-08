/*
 * Everything the site says about Till, in English and German.
 *
 * Two parts: `page` is what the page shows, and `facts` is the fuller record that only machines
 * read: the JSON-LD for search engines and /llms.txt for AI assistants.
 *
 * Wording rules: one "I" sentence at the top, everything else verb-first or plain nouns. State
 * facts, never prove them (no test results, no counts as a flex). No company names in the intro.
 * Never call Till an engineer; "dad", not "father". No em dashes, no race times, nothing private
 * (no phone, address, birth date or email).
 */

export type Lang = 'en' | 'de';

/** A piece of text in both languages. */
export type L = Record<Lang, string>;

export const SITE_URL = 'https://tillfindl.com';

export const links = {
  /** Till will send the URL; until then the LinkedIn buttons are left out. */
  linkedin: null as string | null,
  bounceback: 'https://bounceback.at/',
  eigen: 'https://www.eigen-running.com',
  ironmanKalmar: 'https://www.endurance-data.com/de/ergebnis/898/1616-till-findl/',
  amsterdamMarathon: 'https://sporthive.com/events/s/7250456063290378496/race/7250456063290379008/bib/21040',
};

export const person = {
  name: 'Till Findl',
  givenName: 'Till',
  familyName: 'Findl',
};

export interface Card {
  /** A name that stays the same in both languages, or one per language. */
  title: string | L;
  detail: L;
  date: string;
  /** Short plain lines under the title, verb-first or nouns, no "I". */
  lines?: L[];
  url?: string;
}

/** A line of text, optionally a link. Lines under a title are joined with " · ". */
export interface Part {
  text: L;
  url?: string;
}

/** A photo shown as its own card. The description is never shown; screen readers and search engines read it. */
export interface Photo {
  file: string;
  alt: L;
  /** Which part of the photo to keep when the card crops it (CSS object-position). */
  position?: string;
}

/** What the page shows, top to bottom. */
export const page = {
  portrait: {
    file: 'portrait-harris.jpg',
    alt: { en: 'Till Findl on the Isle of Harris, Scotland', de: 'Till Findl auf der Isle of Harris, Schottland' },
  } satisfies Photo,
  place: { en: 'Vienna', de: 'Wien' },
  /** The one sentence about Till: plain, Max-style, no company names. */
  intro: {
    en: 'I studied medicine at UCL in London and now work on software for physiotherapy and running, mostly applying AI and computer vision to how people move and recover.',
    de: 'Ich habe am UCL in London Medizin studiert und arbeite heute an Software für Physiotherapie und Laufsport, vor allem mit KI und Computer Vision rund um Bewegung und Rehabilitation.',
  },
  sections: {
    work: { en: 'Work', de: 'Arbeit' },
    medicine: { en: 'Medicine', de: 'Medizin' },
    sports: { en: 'Sport', de: 'Sport' },
    hobbies: { en: 'Other things', de: 'Sonst noch' },
    contact: { en: 'Contact', de: 'Kontakt' },
  },
  work: [
    {
      title: 'Bounceback',
      detail: { en: 'Cofounder & CEO · Vienna', de: 'Mitgründer & Geschäftsführer · Wien' },
      date: '2024 – now',
      lines: [
        {
          en: 'Practice software for physiotherapists, designed around home exercise adherence.',
          de: 'Praxissoftware für Physiotherapeut:innen, ausgerichtet auf das Dranbleiben bei Heimübungen.',
        },
        {
          en: 'Patients record their exercises and get feedback between appointments; notes, booking and payments run in the same app.',
          de: 'Patient:innen filmen ihre Übungen und bekommen zwischen den Terminen Feedback; Dokumentation, Termine und Zahlungen laufen in derselben App.',
        },
      ],
      url: links.bounceback,
    },
    {
      title: 'Eigen Running',
      detail: { en: 'Cofounder & Chief of Product · Zurich', de: 'Mitgründer & Chief of Product · Zürich' },
      date: '2025 – now',
      lines: [
        {
          en: 'Running shoe recommendations from a phone video and a 3D foot scan.',
          de: 'Laufschuh-Empfehlungen aus einem Handyvideo und einem 3D-Fußscan.',
        },
        {
          en: 'Developed the gait and foot biomechanics behind them.',
          de: 'Entwicklung der Gang- und Fußbiomechanik dahinter.',
        },
      ],
      url: links.eigen,
    },
  ] satisfies Card[],
  /** Two photos between Work and Medicine, no text. */
  photoPair: [
    {
      file: 'night-run.jpg',
      alt: { en: 'Till after an evening run in London', de: 'Till nach einem Abendlauf in London' },
      position: '50% 35%',
    },
    {
      file: 'with-dad.jpg',
      alt: { en: 'Till and his dad in London at night', de: 'Till und sein Papa abends in London' },
    },
  ] satisfies Photo[],
  medicine: {
    ucl: {
      title: 'University College London',
      detail: { en: 'MBBS Medicine', de: 'MBBS Medizin' },
      date: '2020 – 2026',
      lines: [
        {
          en: 'Clinical years at University College Hospital and the Royal Free, with specialist placements at Queen Square, Great Ormond Street and Moorfields Eye Hospital.',
          de: 'Klinische Jahre am University College Hospital und am Royal Free, mit Rotationen am Queen Square, Great Ormond Street und Moorfields Eye Hospital.',
        },
      ],
    } satisfies Card,
    bsc: {
      title: { en: 'Intercalated BSc Medical Sciences with Global Health', de: 'Intercalated BSc Medical Sciences with Global Health' },
      date: '2022 – 2023',
      thesis: {
        en: 'Thesis: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review',
        de: 'Abschlussarbeit: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review',
      },
    },
    graduation: [
      {
        file: 'ucl-medical-school.jpg',
        alt: {
          en: 'Till in graduation gown at the entrance of the Royal Free and University College Medical School',
          de: 'Till im Talar vor dem Eingang der Royal Free and University College Medical School',
        },
      },
      {
        file: 'ucl-portico.jpg',
        alt: { en: 'Till in graduation gown in front of the UCL portico', de: 'Till im Talar vor dem Portikus des UCL' },
      },
    ] satisfies Photo[],
    elective: {
      title: { en: 'Orthopaedics elective', de: 'Famulatur Orthopädie' },
      detail: { en: 'Kuala Lumpur · spring and summer', de: 'Kuala Lumpur · Frühling und Sommer' },
      date: '2026',
    } satisfies Card,
    electivePhoto: {
      file: 'theatre-kl.jpg',
      alt: { en: 'Till with the surgical team in an orthopaedic theatre in Kuala Lumpur', de: 'Till mit dem OP-Team in einem orthopädischen OP in Kuala Lumpur' },
    } satisfies Photo,
    other: [
      { title: 'Vienna International School', detail: { en: 'International Baccalaureate', de: 'International Baccalaureate' }, date: '2019' },
      {
        title: { en: 'Austrian Red Cross', de: 'Österreichisches Rotes Kreuz' },
        detail: { en: 'Paramedic, civil service · Vienna', de: 'Rettungssanitäter, Zivildienst · Wien' },
        date: '2019 – 2020',
      },
    ] satisfies Card[],
  },
  /** Each sport with a photo of Till doing it, and the facts underneath. */
  sports: [
    {
      file: 'ironman-swim.jpg',
      alt: { en: 'Till leaving the water at Ironman Kalmar', de: 'Till beim Schwimmausstieg beim Ironman Kalmar' },
      title: { en: 'Triathlon', de: 'Triathlon' },
      lines: [
        { text: { en: 'Ironman Kalmar', de: 'Ironman Kalmar' }, url: links.ironmanKalmar },
        { text: { en: 'Ironman Tallinn', de: 'Ironman Tallinn' } },
      ],
    },
    {
      file: 'ski-gate.jpg',
      alt: { en: 'Till racing giant slalom, just past a gate', de: 'Till im Riesentorlauf, knapp hinter einem Tor' },
      position: '75% 50%',
      title: { en: 'Ski racing', de: 'Skirennen' },
      lines: [
        { text: { en: 'FIS races', de: 'FIS-Rennen' } },
        { text: { en: 'Viennese youth champion', de: 'Wiener Jugendmeister' } },
        { text: { en: 'Landesskilehrer (level 3)', de: 'Landesskilehrer' } },
      ],
    },
    {
      file: 'hockey-fisheye.jpg',
      alt: { en: 'Till in the UCL Yetis locker room before a game', de: 'Till in der Kabine der UCL Yetis vor einem Spiel' },
      title: { en: 'Ice hockey', de: 'Eishockey' },
      lines: [{ text: { en: 'UCL Yetis, BUIHA Division 1', de: 'UCL Yetis, BUIHA Division 1' } }],
    },
    {
      file: 'ironman-run.jpg',
      alt: { en: 'Till running, black and white', de: 'Till beim Laufen, schwarz-weiß' },
      title: { en: 'Running', de: 'Laufen' },
      lines: [
        { text: { en: 'Marathons', de: 'Marathons' }, url: links.amsterdamMarathon },
        { text: { en: 'Hosted a run club in London', de: 'Lauftreff in London geleitet' } },
      ],
    },
  ] as (Photo & { title: L; lines: Part[] })[],
  hobbies: [
    { title: { en: 'Photography & film', de: 'Fotografie & Film' }, detail: { en: '', de: '' }, date: '' },
    { title: { en: 'Philosophy', de: 'Philosophie' }, detail: { en: '', de: '' }, date: '' },
    { title: { en: 'Dancing', de: 'Tanzen' }, detail: { en: '', de: '' }, date: '' },
    {
      title: { en: 'DIY projects', de: 'DIY-Projekte' },
      detail: {
        en: 'FPV drones from age 13, 3D printing, custom-fitted CPAP masks from phone face scans',
        de: 'FPV-Drohnen seit 13, 3D-Druck, maßgefertigte CPAP-Masken aus Handy-Gesichtsscans',
      },
      date: '',
    },
  ] satisfies Card[],
  /** A last row of photos before Contact, no text. */
  photoRow: [
    { file: 'friends.jpg', alt: { en: 'Till with friends on a night out in London', de: 'Till mit Freunden an einem Abend in London' } },
    {
      file: 'ice-hockey-sister.jpg',
      alt: { en: 'Till in his UCL ice hockey jersey with his sister after a game', de: 'Till im UCL-Eishockeytrikot mit seiner Schwester nach einem Spiel' },
    },
    {
      file: 'summer-austria.jpg',
      alt: { en: 'Till and a friend in lederhosen in the Austrian mountains', de: 'Till und ein Freund in Lederhosen in den österreichischen Bergen' },
    },
  ] satisfies Photo[],
  contact: {
    text: { en: 'LinkedIn is the easiest way to reach me.', de: 'Am einfachsten erreichst du mich über LinkedIn.' },
    pending: { en: 'Link coming soon', de: 'Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
  },
};

export const text = (t: string | L, lang: Lang) => (typeof t === 'string' ? t : t[lang]);

/** The fuller record, for search engines (JSON-LD) and AI assistants (/llms.txt) only. */
export const facts = {
  summary: {
    en: 'Till Findl studied medicine at University College London (MBBS, 2020 to 2026) and lives in Vienna. He is cofounder and CEO of Bounceback, AI-powered practice software for physiotherapists in Germany, Austria and Switzerland, and cofounder and Chief of Product of Eigen Running in Zurich, which recommends running shoes from a phone video and a 3D scan of the feet.',
    de: 'Till Findl hat am University College London Medizin studiert (MBBS, 2020 bis 2026) und lebt in Wien. Er ist Mitgründer und Geschäftsführer von Bounceback, KI-gestützter Praxissoftware für Physiotherapeut:innen in Deutschland, Österreich und der Schweiz, und Mitgründer und Chief of Product von Eigen Running in Zürich, das Laufschuhe anhand eines Handyvideos und eines 3D-Fußscans empfiehlt.',
  } satisfies L,
  place: { en: 'Vienna', de: 'Wien' } satisfies L,
  languages: {
    en: 'German (native), English (bilingual), Spanish (conversational)',
    de: 'Deutsch (Muttersprache), Englisch (zweisprachig), Spanisch (Grundkenntnisse)',
  } satisfies L,
  ventures: [
    {
      name: 'Bounceback',
      legalName: 'Bounceback GmbH',
      url: links.bounceback,
      role: { en: 'Cofounder & CEO', de: 'Mitgründer & Geschäftsführer' },
      city: 'Vienna',
      country: 'AT',
      since: 2024,
      about:
        'AI-powered software for physiotherapy practices in the DACH region (Germany, Austria, Switzerland), designed around home exercise adherence: Echo, the patient app, lets patients record their exercises and get feedback between appointments; notes, booking and payments run in the same app. Team of four in Vienna.',
    },
    {
      name: 'Eigen Running',
      legalName: 'Eigen Running GmbH',
      url: links.eigen,
      role: { en: 'Cofounder & Chief of Product', de: 'Mitgründer & Chief of Product' },
      city: 'Zurich',
      country: 'CH',
      since: 2025,
      about:
        'Recommends running shoes from a phone video and a 3D scan of the feet, grounded in more than 200 peer-reviewed studies. Till developed the core gait and foot biomechanics. Built with engineers at ETH Zurich; backed by an ETH Zurich jFund grant.',
    },
  ],
  background: [
    'MBBS Medicine, University College London, 2020 to 2026. Clinical placements at University College Hospital and the Royal Free, with specialist time at Queen Square (neurology), Great Ormond Street (paediatrics) and Moorfields (ophthalmology).',
    'Orthopaedics elective in Kuala Lumpur, spring and summer 2026.',
    'Intercalated BSc Medical Sciences with Global Health, UCL, 2022 to 2023. Thesis: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review.',
    'Civil service as a paramedic with the Red Cross in Vienna, 2019 to 2020.',
    'International Baccalaureate, Vienna International School, 2019.',
  ],
  outside: [
    'Triathlon: Ironman Kalmar, Ironman Tallinn.',
    'Ski racing: FIS races, Viennese youth champion, Landesskilehrer (state ski instructor, level 3).',
    'Ice hockey for the UCL Yetis (BUIHA Division 1).',
    'Running: several marathons, among them Amsterdam; hosted a run club in London for years.',
    'Photography and film, philosophy, dancing.',
    'DIY projects: FPV drones from age 13, 3D printing, custom-fitted CPAP masks from phone face scans.',
  ],
  education: [
    { name: 'University College London', degree: 'MBBS Medicine' },
    { name: 'University College London', degree: 'Intercalated BSc Medical Sciences with Global Health' },
    { name: 'Vienna International School', degree: 'International Baccalaureate' },
  ],
};

export const meta = {
  title: { en: 'Till Findl', de: 'Till Findl' } satisfies L,
  description: facts.summary,
};

export const pathFor = (lang: Lang) => (lang === 'en' ? '/' : '/de/');
