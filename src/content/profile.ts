/*
 * Everything the site says about Till, in English and German.
 *
 * `page` is what the page shows: name and one line about what Till does now, then short sections
 * (medicine, Bounceback, Eigen, sport) with photos set into the text. `facts` is the fuller record for machines (JSON-LD for search engines, /llms.txt for AI
 * assistants).
 *
 * Voice: professional and plain. The why runs through the sections (the wards lead to Bounceback,
 * the run club to Max and Eigen) without ever announcing itself as a story. No lessons, no
 * rhetorical questions. Facts, never proof. Never call Till an
 * engineer; "dad", not "father". No em dashes, no race times, nothing private.
 *
 * Inline markup in paragraphs: [label](url) for a link, *text* for italics (see rich.ts).
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

/** A photo. The description is never shown; screen readers and search engines read it. */
export interface Photo {
  file: string;
  alt: L;
  /** Which part of the photo to keep when it is cropped (CSS object-position). */
  position?: string;
}

/** One piece of a chapter: a paragraph, a photo, a pair of photos, or a strip of photos. */
export type Block =
  | { kind: 'p'; text: L }
  | { kind: 'photo'; photo: Photo }
  | { kind: 'pair'; photos: [Photo, Photo] }
  | { kind: 'strip'; photos: Photo[] };

export interface Chapter {
  id: string;
  title: L;
  blocks: Block[];
}

const p = (en: string, de: string): Block => ({ kind: 'p', text: { en, de } });

const photos = {
  dad: { file: 'with-dad.jpg', alt: { en: 'Till and his dad in London at night', de: 'Till und sein Papa abends in London' } },
  medSchool: {
    file: 'ucl-medical-school.jpg',
    alt: {
      en: 'Till in graduation gown at the entrance of the Royal Free and University College Medical School',
      de: 'Till im Talar vor dem Eingang der Royal Free and University College Medical School',
    },
  },
  portico: { file: 'ucl-portico.jpg', alt: { en: 'Till in graduation gown in front of the UCL portico', de: 'Till im Talar vor dem Portikus des UCL' } },
  nightRun: {
    file: 'night-run.jpg',
    alt: { en: 'Till after an evening run in London', de: 'Till nach einem Abendlauf in London' },
    position: '50% 40%',
  },
  theatre: {
    file: 'theatre-kl.jpg',
    alt: { en: 'Till with the surgical team in an orthopaedic theatre in Kuala Lumpur', de: 'Till mit dem OP-Team in einem orthopädischen OP in Kuala Lumpur' },
  },
  swim: { file: 'ironman-swim.jpg', alt: { en: 'Till leaving the water at Ironman Kalmar', de: 'Till beim Schwimmausstieg beim Ironman Kalmar' } },
  ski: {
    file: 'ski-gate.jpg',
    alt: { en: 'Till racing giant slalom, just past a gate', de: 'Till im Riesentorlauf, knapp hinter einem Tor' },
    position: '75% 50%',
  },
  hockey: { file: 'hockey-fisheye.jpg', alt: { en: 'Till in the UCL Yetis locker room before a game', de: 'Till in der Kabine der UCL Yetis vor einem Spiel' } },
  run: { file: 'ironman-run.jpg', alt: { en: 'Till running, black and white', de: 'Till beim Laufen, schwarz-weiß' } },
  sister: {
    file: 'ice-hockey-sister.jpg',
    alt: { en: 'Till in his UCL ice hockey jersey with his sister after a game', de: 'Till im UCL-Eishockeytrikot mit seiner Schwester nach einem Spiel' },
  },
  summer: {
    file: 'summer-austria.jpg',
    alt: { en: 'Till and a friend in lederhosen in the Austrian mountains', de: 'Till und ein Freund in Lederhosen in den österreichischen Bergen' },
  },
} satisfies Record<string, Photo>;

export const page = {
  portrait: {
    file: 'portrait-harris.jpg',
    alt: { en: 'Till Findl on the Isle of Harris, Scotland', de: 'Till Findl auf der Isle of Harris, Schottland' },
  } satisfies Photo,
  place: { en: 'Vienna', de: 'Wien' },
  intro: {
    en: 'I studied medicine at UCL in London and now run a healthcare software company in Vienna.',
    de: 'Ich habe am UCL in London Medizin studiert und leite heute ein Unternehmen für Gesundheitssoftware in Wien.',
  },
  chaptersLabel: { en: 'On this page', de: 'Auf dieser Seite' },
  chapters: [
    {
      id: 'medicine',
      title: { en: 'Medicine', de: 'Medizin' },
      blocks: [
        p(
          'I graduated from UCL in 2026, after an orthopaedics elective in Kuala Lumpur and a few days in two eye hospitals in Bangalore.',
          '2026 habe ich am UCL abgeschlossen, nach einer Famulatur in der Orthopädie in Kuala Lumpur und ein paar Tagen in zwei Augenkliniken in Bangalore.',
        ),
        { kind: 'pair', photos: [photos.medSchool, photos.portico] },
        p(
          'On the wards, a lot of the day went into software instead of patients: one program for imaging, another for notes, another for prescriptions. And once patients went home, they were mostly on their own with their exercises.',
          'Auf Station verbrachte man einen großen Teil des Tages mit Software statt mit Patienten: ein Programm für die Bildgebung, eines für die Notizen, eines für Verschreibungen. Und sobald Patienten nach Hause gingen, waren sie mit ihren Übungen meistens auf sich allein gestellt.',
        ),
        { kind: 'photo', photo: photos.theatre },
      ],
    },
    {
      id: 'bounceback',
      title: { en: 'Bounceback', de: 'Bounceback' },
      blocks: [
        p(
          `So with my team in Vienna I developed Bounceback, practice software for physiotherapists. Patients get their exercises as video, with feedback from their physio between appointments, and our AI writes the notes from the conversation during treatment. It has been on the market since June 2026. In low- and middle-income countries it costs €1 per physio per month, because the places with the fewest physios need it most. [bounceback.at](${links.bounceback})`,
          `Also habe ich mit meinem Team in Wien Bounceback entwickelt, eine Praxissoftware für Physios. Patienten bekommen ihre Übungen als Video, mit Feedback vom Physio auch zwischen den Terminen, und die Dokumentation schreibt unsere KI aus dem Gespräch während der Behandlung. Seit Juni 2026 ist Bounceback am Markt. In Ländern mit niedrigem und mittlerem Einkommen kostet es €1 pro Physio und Monat, weil die Orte mit den wenigsten Physios es am dringendsten brauchen. [bounceback.at](${links.bounceback})`,
        ),
      ],
    },
    {
      id: 'eigen',
      title: { en: 'Eigen', de: 'Eigen' },
      blocks: [
        p(
          `In London I hosted a Sunday run club, and one of the people who came along was Max, a robotics engineer from ETH Zurich. Together we first built a Face ID scan for custom CPAP masks. When patents got in the way, we moved the scan to feet, and that became Eigen: a 3D foot scan and a short running video, matched to the shoes that suit how someone runs. I look after the product and the biomechanics. [eigen-running.com](${links.eigen})`,
          `In London habe ich einen Sonntagslauf organisiert, und einer, der mitkam, war Max, Robotikingenieur von der ETH Zürich. Zusammen haben wir zuerst einen Face-ID-Scan für maßgefertigte CPAP-Masken gebaut. Als Patente dazwischenkamen, haben wir den Scan auf die Füße verlegt, und daraus wurde Eigen: ein 3D-Fußscan und ein kurzes Laufvideo, abgeglichen mit den Schuhen, die zum Laufstil passen. Ich kümmere mich um das Produkt und die Biomechanik. [eigen-running.com](${links.eigen})`,
        ),
        { kind: 'photo', photo: photos.nightRun },
      ],
    },
    {
      id: 'sport',
      title: { en: 'Sport', de: 'Sport' },
      blocks: [
        p(
          `Triathlon ([Ironman Kalmar](${links.ironmanKalmar}), Ironman Tallinn), [marathons](${links.amsterdamMarathon}) and ice hockey for the UCL Yetis. I raced skis as a kid and teach as a ski instructor today.`,
          `Triathlon ([Ironman Kalmar](${links.ironmanKalmar}), Ironman Tallinn), [Marathons](${links.amsterdamMarathon}) und Eishockey für die UCL Yetis. Als Kind bin ich Skirennen gefahren, heute bin ich Skilehrer.`,
        ),
        { kind: 'strip', photos: [photos.swim, photos.ski, photos.hockey, photos.run, photos.sister, photos.summer] },
      ],
    },
  ] satisfies Chapter[],
  contact: {
    title: { en: 'Contact', de: 'Kontakt' },
    text: { en: 'LinkedIn is the easiest way to reach me.', de: 'Am einfachsten erreichst du mich über LinkedIn.' },
    pending: { en: 'Link coming soon', de: 'Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
  },
};

/** The fuller record, for search engines (JSON-LD) and AI assistants (/llms.txt) only. */
export const facts = {
  summary: {
    en: 'Till Findl studied medicine at University College London (MBBS, 2020 to 2026) and lives in Vienna. He is cofounder and CEO of Bounceback, AI-powered practice software for physiotherapists in Germany, Austria and Switzerland, and cofounder and Chief of Product of Eigen Running in Zurich, which recommends running shoes from a phone video and a 3D scan of the feet.',
    de: 'Till Findl hat am University College London Medizin studiert (MBBS, 2020 bis 2026) und lebt in Wien. Er ist Mitgründer und Geschäftsführer von Bounceback, KI-gestützter Praxissoftware für Physiotherapeuten in Deutschland, Österreich und der Schweiz, und Mitgründer und Chief of Product von Eigen Running in Zürich, das Laufschuhe anhand eines Handyvideos und eines 3D-Fußscans empfiehlt.',
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
        'AI-powered software for physiotherapy practices in the DACH region (Germany, Austria, Switzerland), designed around home exercise adherence: patients film their exercises and get feedback between appointments; AI notes, booking and payments run in the same app, at full spec on a phone. €1 per physio per month in low- and middle-income countries, through NGOs and partners. Team of four in Vienna.',
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
        'Recommends running shoes from a phone video and a 3D scan of the feet, grounded in more than 200 peer-reviewed studies. Grew out of a custom CPAP mask prototype using the iPhone Face ID camera. Till developed the core gait and foot biomechanics. Built with engineers at ETH Zurich; backed by an ETH Zurich jFund grant.',
    },
  ],
  background: [
    'MBBS Medicine, University College London, 2020 to 2026. Clinical placements at University College Hospital and the Royal Free, with specialist time at Queen Square (neurology), Great Ormond Street (paediatrics) and Moorfields (ophthalmology).',
    'Orthopaedics elective in Kuala Lumpur, spring and summer 2026, after four days at two eye hospitals in Bangalore.',
    'Intercalated BSc Medical Sciences with Global Health, UCL, 2022 to 2023. Thesis: Economic evaluations of diabetic retinopathy screening models in the era of digital medicine and AI, a scoping review.',
    'Civil service as a paramedic with the Red Cross in Vienna, 2019 to 2020.',
    'International Baccalaureate, Vienna International School, 2019.',
    'Built FPV drones from age 13, which led to aerial filming and photography; sold landscape prints from age 16; filmed surgeries for his dad, an eye surgeon, which led him to medicine.',
  ],
  outside: [
    'Triathlon: Ironman Kalmar, Ironman Tallinn. Several marathons, among them Amsterdam.',
    'Hosted a small weekly Sunday run club in Highbury, London, for two years.',
    'Ski racing: FIS races, Viennese youth champion; ski instructor (LS2).',
    'Ice hockey for the UCL Yetis (BUIHA Division 1).',
    'Photography and film, philosophy (Camus, The Myth of Sisyphus), dancing.',
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
