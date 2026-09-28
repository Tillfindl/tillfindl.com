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

export interface Row {
  /** A name that stays the same in both languages, or one per language. */
  title: string | L;
  detail: L;
  date: string;
  url?: string;
}

/** What the page says: a name, a portrait and a few plain lists. Nothing else. */
export const page = {
  /** A close crop of the Harris portrait, for the small round photo by the name. */
  portrait: {
    file: 'portrait-face.jpg',
    alt: { en: 'Till Findl', de: 'Till Findl' },
  },
  sections: {
    work: { en: 'Work', de: 'Arbeit' },
    education: { en: 'Education', de: 'Ausbildung' },
    experience: { en: 'Experience', de: 'Erfahrung' },
    sport: { en: 'Sport', de: 'Sport' },
  },
  work: [
    {
      title: 'Bounceback',
      detail: { en: 'Cofounder & CEO · Vienna', de: 'Mitgründer & Geschäftsführer · Wien' },
      date: '2024–',
      url: links.bounceback,
    },
    {
      title: 'Eigen Running',
      detail: { en: 'Cofounder & Chief of Product · Zurich', de: 'Mitgründer & Chief of Product · Zürich' },
      date: '2025–',
      url: links.eigen,
    },
  ] satisfies Row[],
  education: [
    {
      title: 'University College London',
      detail: { en: 'MBBS Medicine', de: 'MBBS Medizin' },
      date: '2020–2026',
    },
    {
      title: 'University College London',
      detail: { en: 'BSc Medical Sciences with Global Health', de: 'BSc Medical Sciences with Global Health' },
      date: '2022–2023',
    },
    {
      title: 'Vienna International School',
      detail: { en: 'International Baccalaureate', de: 'International Baccalaureate' },
      date: '2019',
    },
  ] satisfies Row[],
  experience: [
    {
      title: 'Austrian Red Cross',
      detail: { en: 'Paramedic, civil service · Vienna', de: 'Rettungssanitäter, Zivildienst · Wien' },
      date: '2019–2020',
    },
  ] satisfies Row[],
  sport: [
    { title: 'Ironman Tallinn', detail: { en: '', de: '' }, date: '2026' },
    { title: 'Amsterdam Marathon', detail: { en: '', de: '' }, date: '2024', url: links.amsterdamMarathon },
    { title: 'Ironman Kalmar', detail: { en: '', de: '' }, date: '2023', url: links.ironmanKalmar },
    { title: { en: 'Ice hockey', de: 'Eishockey' }, detail: { en: 'UCL', de: 'UCL' }, date: '' },
    { title: { en: 'Alpine ski racing', de: 'Alpiner Skirennsport' }, detail: { en: 'FIS', de: 'FIS' }, date: '' },
  ] satisfies Row[],
  photos: [
    { file: 'ski-giant-slalom.jpg', alt: { en: 'Giant slalom race', de: 'Riesentorlauf' } },
    { file: 'ironman-run.jpg', alt: { en: 'Running at Ironman Kalmar', de: 'Laufen beim Ironman Kalmar' } },
    { file: 'pond-hockey.jpg', alt: { en: 'Ice hockey on a frozen lake', de: 'Eishockey auf einem zugefrorenen See' } },
  ],
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
  },
};

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
        'Practice software for physiotherapists in Austria: booking, notes that write themselves, payments on the phone, and Echo, the patient app for the time between visits. Free to start (from €0). Team of four in Vienna, with engineers from MIT and TU Wien.',
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
    'Alpine ski racing at FIS level; Viennese youth champion; qualified ski instructor.',
    `Ironman Kalmar 2023 (${links.ironmanKalmar}), Ironman Tallinn 2026, Amsterdam Marathon 2024 (${links.amsterdamMarathon}).`,
    'Ice hockey for UCL (BUIHA Division 1).',
    'Photography and film.',
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
