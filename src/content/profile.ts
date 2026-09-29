/*
 * Everything the site says about Till, in English and German.
 *
 * Two parts: `page` is what the page shows, a name and a few plain lists, and `facts` is the
 * fuller record that only machines read: the JSON-LD for search engines and /llms.txt for AI
 * assistants. The page stays plain: no taglines, no slogans, no sentences about Till.
 *
 * Rules: no em dashes, no race times, nothing private (no phone, address, birth date or personal
 * email).
 */

export type Lang = 'en' | 'de';

/** A piece of text in both languages. */
export type L = Record<Lang, string>;

export const SITE_URL = 'https://tillfindl.com';

export const links = {
  /** Till will send the URL; until then LinkedIn is left out. */
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
  /** One plain line under the title, if the card needs it. */
  about?: L;
  url?: string;
  /** Takes two columns in a three-column grid. */
  wide?: boolean;
}

/** A line of text, optionally a link. Lines under a title are joined with " · ". */
export interface Part {
  text: L;
  url?: string;
}

/** What the page shows: name and portrait, then cards. Plain facts only, no storytelling. */
export const page = {
  portrait: {
    file: 'portrait-harris.jpg',
    alt: { en: 'Till Findl on the Isle of Harris, Scotland', de: 'Till Findl auf der Isle of Harris, Schottland' },
  },
  place: { en: 'Vienna & London', de: 'Wien & London' },
  /** One warm, plain line under the name: what matters to Till, and how he works. */
  intro: {
    en: 'The people around me matter most to me. In my work, I care about doing things properly and getting the details right.',
    de: 'Am wichtigsten sind mir die Menschen um mich herum. In meiner Arbeit ist mir wichtig, Dinge ordentlich zu machen und auf die Details zu achten.',
  },
  sections: {
    work: { en: 'Work', de: 'Arbeit' },
    background: { en: 'Education & experience', de: 'Ausbildung & Erfahrung' },
    hobbies: { en: 'Sports & hobbies', de: 'Sport & Hobbys' },
    contact: { en: 'Contact', de: 'Kontakt' },
  },
  work: [
    {
      title: 'Bounceback',
      detail: { en: 'Cofounder & CEO · Vienna', de: 'Mitgründer & Geschäftsführer · Wien' },
      date: '2024 – now',
      about: {
        en: 'Everything a physiotherapy practice runs on, from booking and notes to payments, and Echo, an app that keeps patients on track between visits.',
        de: 'Alles, womit eine Physiotherapiepraxis arbeitet, von Terminen und Dokumentation bis zu Zahlungen, dazu Echo, eine App, die Patient:innen zwischen den Terminen begleitet.',
      },
      url: links.bounceback,
    },
    {
      title: 'Eigen Running',
      detail: { en: 'Cofounder & Chief of Product · Zurich', de: 'Mitgründer & Chief of Product · Zürich' },
      date: '2025 – now',
      about: {
        en: 'Running shoe recommendations from a 3D foot scan and gait analysis on the iPhone.',
        de: 'Laufschuh-Empfehlungen aus einem 3D-Fußscan und einer Laufanalyse am iPhone.',
      },
      url: links.eigen,
    },
  ] satisfies Card[],
  /** Medical school gets its own card with photos and the details that matter. */
  medicine: {
    title: 'University College London',
    detail: { en: 'MBBS Medicine', de: 'MBBS Medizin' },
    date: '2020 – 2026',
    photos: [
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
    ],
    /** The intercalated degree, shown as part of the medicine card. */
    bsc: {
      title: { en: 'Intercalated BSc Medical Sciences with Global Health', de: 'Intercalated BSc Medical Sciences with Global Health' },
      date: '2022 – 2023',
      thesis: {
        en: 'Thesis: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review',
        de: 'Abschlussarbeit: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review',
      },
    },
  },
  background: [
    { title: 'Vienna International School', detail: { en: 'International Baccalaureate', de: 'International Baccalaureate' }, date: '2019' },
    {
      title: { en: 'Austrian Red Cross', de: 'Österreichisches Rotes Kreuz' },
      detail: { en: 'Paramedic, civil service · Vienna', de: 'Rettungssanitäter, Zivildienst · Wien' },
      date: '2019 – 2020',
    },
  ] satisfies Card[],
  /** Each sport with a photo of Till doing it, and the details underneath. */
  sports: [
    {
      file: 'ski-gate.jpg',
      alt: { en: 'Till racing giant slalom, just past a gate', de: 'Till im Riesentorlauf, knapp hinter einem Tor' },
      position: '75% 50%',
      title: { en: 'Ski racing', de: 'Skirennen' },
      lines: [
        { text: { en: 'FIS races', de: 'FIS-Rennen' } },
        { text: { en: 'Viennese youth champion', de: 'Wiener Jugendmeister' } },
        { text: { en: 'Ski instructor, Landesskilehrer (level 3)', de: 'Landesskilehrer' } },
      ],
    },
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
      file: 'ironman-run.jpg',
      alt: { en: 'Till running, black and white', de: 'Till beim Laufen, schwarz-weiß' },
      title: { en: 'Running', de: 'Laufen' },
      lines: [
        { text: { en: 'Marathons', de: 'Marathons' }, url: links.amsterdamMarathon },
      ],
    },
    {
      file: 'ice-hockey-sister.jpg',
      alt: { en: 'Till in his UCL ice hockey jersey with his sister after a game', de: 'Till im UCL-Eishockeytrikot mit seiner Schwester nach einem Spiel' },
      title: { en: 'Ice hockey', de: 'Eishockey' },
      lines: [{ text: { en: 'UCL Yetis, BUIHA Division 1', de: 'UCL Yetis, BUIHA Division 1' } }],
    },
  ] as { file: string; alt: L; title: L; lines: Part[]; position?: string }[],
  hobbies: [
    { title: { en: 'Photography & film', de: 'Fotografie & Film' }, detail: { en: '', de: '' }, date: '' },
  ] satisfies Card[],
  contact: {
    text: {
      en: 'The best way to reach me is LinkedIn.',
      de: 'Am besten erreichst du mich über LinkedIn.',
    },
    pending: { en: 'LinkedIn link coming soon', de: 'LinkedIn-Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
  },
};

export const text = (t: string | L, lang: Lang) => (typeof t === 'string' ? t : t[lang]);

/** The fuller record, for search engines (JSON-LD) and AI assistants (/llms.txt) only. */
export const facts = {
  summary: {
    en: 'Till Findl is the cofounder and CEO of Bounceback, practice software for physiotherapists, based in Vienna. He studied medicine at University College London (MBBS, 2020 to 2026) and is also cofounder and Chief of Product of Eigen Running in Zurich, which recommends running shoes from a smartphone scan of the feet and running biomechanics.',
    de: 'Till Findl ist Mitgründer und Geschäftsführer von Bounceback, Praxissoftware für Physiotherapeut:innen mit Sitz in Wien. Er hat am University College London Medizin studiert (MBBS, 2020 bis 2026) und ist außerdem Mitgründer und Chief of Product von Eigen Running in Zürich, das Laufschuhe anhand eines Smartphone-Scans der Füße und der Laufbiomechanik empfiehlt.',
  } satisfies L,
  place: { en: 'Vienna & London', de: 'Wien & London' } satisfies L,
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
        'Software for physiotherapy practices in Austria: booking, notes that write themselves, payments on the phone, and Echo, the patient app that keeps patients on track between visits. Free to start (from €0). Team of four in Vienna, with engineers from MIT and TU Wien.',
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
        'Recommends running shoes from a 3D scan of the feet and running biomechanics captured on an iPhone, grounded in more than 200 peer-reviewed studies. Till built the core biomechanics (3D gait from 2D video). Built with engineers at ETH Zurich; backed by an ETH Zurich jFund grant.',
    },
  ],
  background: [
    'MBBS Medicine, University College London, 2020 to 2026. Clinical placements at University College Hospital and the Royal Free, with specialist time at Queen Square (neurology), Great Ormond Street (paediatrics) and Moorfields (ophthalmology).',
    'Intercalated BSc Medical Sciences with Global Health, UCL, 2022 to 2023. Thesis: a scoping review of economic evaluations of diabetic retinopathy screening in the era of AI, supervised at the London School of Hygiene & Tropical Medicine.',
    'Final-year placement in a rural GP practice on the Isle of Harris, Outer Hebrides, including work on handling medicine shortages.',
    'Peer teaching at UCL Medical School in cardiology, orthopaedics and neurology.',
    'Civil service as a paramedic with the Red Cross in Vienna, 2019 to 2020, through the first months of COVID-19.',
    'Side project: custom 3D-printed CPAP masks from smartphone face scans, bench-tested against commercial masks.',
    'International Baccalaureate, Vienna International School, 2019.',
  ],
  outside: [
    'Alpine ski racing at FIS level; Viennese youth champion; ski instructor (Landesskilehrer, level 3).',
    `Triathlon: Ironman Kalmar (${links.ironmanKalmar}), Ironman Tallinn. Several marathons, among them Amsterdam (${links.amsterdamMarathon}).`,
    'Ice hockey for the UCL Yetis (BUIHA Division 1).',
    'Photography and film.',
    'Guitar.',
  ],
  education: [
    { name: 'University College London', degree: 'MBBS Medicine' },
    { name: 'University College London', degree: 'Intercalated BSc Medical Sciences with Global Health' },
    { name: 'Vienna International School', degree: 'International Baccalaureate' },
  ],
};

export const meta = {
  title: {
    en: 'Till Findl · Founder of Bounceback, trained doctor',
    de: 'Till Findl · Gründer von Bounceback, Mediziner',
  } satisfies L,
  description: facts.summary,
};

export const pathFor = (lang: Lang) => (lang === 'en' ? '/' : '/de/');
