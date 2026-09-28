/*
 * Everything the site says about Till, in English and German.
 *
 * Two parts: `page` is the little the page itself says (one idea per screen, and elegance is in
 * what it leaves out), and `facts` is the fuller record that only machines read: the JSON-LD for
 * search engines and /llms.txt for AI assistants. Keep the page short; put detail in facts.
 *
 * Copy rules: first person, short sentences, no em dashes, no race times, nothing private (no
 * phone, address, birth date or personal email). Words between *asterisks* are set in the italic
 * serif, at most one phrase per screen.
 */

export type Lang = 'en' | 'de';

/** A piece of text in both languages. */
export type L = Record<Lang, string>;

export const SITE_URL = 'https://tillfindl.com';

export const links = {
  /** Till will send the URL; until then the LinkedIn buttons say it is coming. */
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

/** What the page says, screen by screen. */
export const page = {
  nav: {
    hello: { en: 'Say hello', de: 'Hallo sagen' },
  },
  hero: {
    photo: 'portrait-harris.jpg',
    alt: {
      en: 'Till Findl on the Isle of Harris, Scotland',
      de: 'Till Findl auf der Isle of Harris, Schottland',
    },
    title: { en: 'Till Findl.', de: 'Till Findl.' },
    line: { en: 'Doctor turned founder. Vienna and London.', de: 'Mediziner, jetzt Gründer. Wien und London.' },
  },
  belief: {
    lead: {
      en: 'Clinicians are some of the most highly trained people there are.',
      de: 'Kliniker:innen gehören zu den bestausgebildeten Menschen überhaupt.',
    },
    turn: {
      en: 'Most of their tools were only ever *good enough.*',
      de: 'Ihre Werkzeuge waren meist nur *gut genug.*',
    },
  },
  building: {
    title: { en: 'What I’m building.', de: 'Woran ich baue.' },
    items: [
      {
        name: 'Bounceback',
        url: links.bounceback,
        line: {
          en: 'Practice software for physiotherapists. Done properly, from €0.',
          de: 'Praxissoftware für Physiotherapeut:innen. Richtig gemacht, ab €0.',
        },
        role: { en: 'Cofounder & CEO · Vienna', de: 'Mitgründer & Geschäftsführer · Wien' },
      },
      {
        name: 'Eigen',
        url: links.eigen,
        line: { en: 'A better way to choose running shoes.', de: 'Ein besserer Weg, Laufschuhe zu wählen.' },
        role: { en: 'Cofounder & Chief of Product · Zurich', de: 'Mitgründer & Chief of Product · Zürich' },
      },
    ],
  },
  care: {
    title: { en: 'Care is a design problem.', de: 'Versorgung ist eine Designfrage.' },
    line: {
      en: 'Six years of medicine at UCL. Before that, a paramedic in Vienna. I build from what I saw.',
      de: 'Sechs Jahre Medizin am UCL. Davor Rettungssanitäter in Wien. Ich baue aus dem, was ich gesehen habe.',
    },
  },
  offClock: {
    title: { en: 'Off the clock.', de: 'Nach Feierabend.' },
    line: {
      en: 'Ski racing, triathlon, ice hockey. Always training for something.',
      de: 'Skirennen, Triathlon, Eishockey. Immer im Training für irgendwas.',
    },
    photos: [
      {
        file: 'ski-giant-slalom.jpg',
        alt: { en: 'Till racing giant slalom, just past a red gate', de: 'Till im Riesentorlauf, knapp hinter einem roten Tor' },
      },
      {
        file: 'ironman-run.jpg',
        alt: { en: 'Till running at Ironman Kalmar, black and white', de: 'Till beim Laufen beim Ironman Kalmar, schwarz-weiß' },
      },
      {
        file: 'pond-hockey.jpg',
        alt: { en: 'Till with an ice hockey stick on a frozen mountain lake', de: 'Till mit Eishockeyschläger auf einem zugefrorenen Bergsee' },
      },
    ],
    races: [
      { name: { en: 'Ironman Kalmar', de: 'Ironman Kalmar' }, year: 2023, url: links.ironmanKalmar },
      { name: { en: 'Amsterdam Marathon', de: 'Amsterdam Marathon' }, year: 2024, url: links.amsterdamMarathon },
      { name: { en: 'Ironman Tallinn', de: 'Ironman Tallinn' }, year: 2026, url: null },
    ],
  },
  closing: {
    photo: 'pond-hockey-lake.jpg',
    alt: {
      en: 'A skater on a frozen lake below snowy mountains',
      de: 'Ein Eisläufer auf einem zugefrorenen See vor verschneiten Bergen',
    },
    title: { en: 'Building something in healthcare?', de: 'Du baust etwas im Gesundheitswesen?' },
    line: { en: 'I’d like to hear about it.', de: 'Ich würde gern davon hören.' },
    cta: { en: 'Write to me on LinkedIn', de: 'Schreib mir auf LinkedIn' },
    pending: { en: 'LinkedIn link coming soon', de: 'LinkedIn-Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
  },
  skip: { en: 'Skip to content', de: 'Zum Inhalt' },
} as const;

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

/** Splits text on *asterisks* into plain and italic runs. */
export function runs(text: string): { text: string; em: boolean }[] {
  return text.split('*').map((t, i) => ({ text: t, em: i % 2 === 1 })).filter((r) => r.text);
}
