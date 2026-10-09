/*
 * Everything the site says about Till, in English and German.
 *
 * `page` is what the page shows: name and one line about what Till does now, then short sections
 * (medicine, Bounceback, Eigen) with photos set into the text, and a personal section of items.
 * `facts` is the fuller record for machines (JSON-LD for search engines, /llms.txt for AI
 * assistants).
 *
 * Voice: professional and plain. The why runs through the sections (the wards lead to Bounceback,
 * the run club to Max and Eigen) without ever announcing itself as a story. No lessons, no
 * rhetorical questions. Facts, never proof. Never call Till an engineer; "dad", not "father". No
 * em dashes, no race times, nothing private.
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

/** One thing in the personal section: a photo, a short title and one line. */
export interface Item {
  title: L;
  text: L;
  photo: Photo;
}

/** One piece of a section: a paragraph, a photo, a pair of photos, or a grid of personal items. */
export type Block =
  | { kind: 'p'; text: L }
  | { kind: 'photo'; photo: Photo }
  | { kind: 'pair'; photos: [Photo, Photo] }
  | { kind: 'items'; items: Item[] };

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
  /** Till's own wording; keep it as written. */
  intro: {
    en: 'Studied medicine at UCL. Now I build the software physiotherapy runs on, from Vienna.',
    de: 'Medizin am UCL studiert. Heute baue ich aus Wien die Software, auf der Physiotherapie läuft.',
  },
  chapters: [
    {
      id: 'medicine',
      title: { en: 'Medicine', de: 'Medizin' },
      blocks: [
        p('Six years of medicine at UCL in London.', 'Sechs Jahre Medizin am UCL in London.'),
        { kind: 'pair', photos: [photos.medSchool, photos.portico] },
        p(
          'An orthopaedics elective in Kuala Lumpur, and a few days in two eye hospitals in Bangalore.',
          'Eine Famulatur in der Orthopädie in Kuala Lumpur und ein paar Tage in zwei Augenkliniken in Bangalore.',
        ),
        { kind: 'photo', photo: photos.theatre },
        p(
          'On the wards, a lot of the day went into software instead of patients: one program for imaging, another for notes, another for prescriptions. And once patients went home, they were mostly on their own.',
          'Auf Station verbrachte man einen großen Teil des Tages mit Software statt mit Patienten: ein Programm für die Bildgebung, eines für die Notizen, eines für Verschreibungen. Und sobald Patienten nach Hause gingen, waren sie meistens auf sich allein gestellt.',
        ),
      ],
    },
    {
      id: 'bounceback',
      title: { en: 'Bounceback', de: 'Bounceback' },
      blocks: [
        p(
          `So with my team in Vienna I built Bounceback, one system for the whole physiotherapy practice. Its AI writes the notes during treatment and helps physios answer their patients’ exercise videos between appointments, learning their corrections as it goes. Booking and payments sit in the same app, and all of it runs on a phone. [bounceback.at](${links.bounceback})`,
          `Also habe ich mit meinem Team in Wien Bounceback gebaut, ein System für die ganze Physiotherapiepraxis. Die KI schreibt die Dokumentation während der Behandlung und hilft Physios, die Übungsvideos ihrer Patienten zwischen den Terminen zu beantworten, und lernt dabei ihre Korrekturen. Terminbuchung und Bezahlung laufen in derselben App, alles auf einem Handy. [bounceback.at](${links.bounceback})`,
        ),
      ],
    },
    {
      id: 'eigen',
      title: { en: 'Eigen', de: 'Eigen' },
      blocks: [
        p(
          `During my time in London I hosted a Sunday run club in Highbury for two years. Some of my best friends came from it, and so did Max, a robotics engineer from ETH Zurich. Our first project together was a Face ID scan for custom CPAP masks, built in quick iterations. Then we pivoted to running, and that became Eigen: a 3D foot scan and a short running video, matched to the shoes that suit how someone runs. I look after the product and the biomechanics. [eigen-running.com](${links.eigen})`,
          `In meiner Zeit in London habe ich zwei Jahre lang einen Sonntagslauf in Highbury organisiert. Einige meiner besten Freunde kommen von dort, und auch Max, Robotikingenieur von der ETH Zürich. Unser erstes gemeinsames Projekt war ein Face-ID-Scan für maßgefertigte CPAP-Masken, in schnellen Iterationen gebaut. Dann haben wir auf Laufen umgeschwenkt, und daraus wurde Eigen: ein 3D-Fußscan und ein kurzes Laufvideo, abgeglichen mit den Schuhen, die zum Laufstil passen. Ich kümmere mich um das Produkt und die Biomechanik. [eigen-running.com](${links.eigen})`,
        ),
        { kind: 'photo', photo: photos.nightRun },
      ],
    },
    {
      id: 'personal',
      title: { en: 'Personal', de: 'Privat' },
      blocks: [
        {
          kind: 'items',
          items: [
            {
              title: { en: 'Triathlon', de: 'Triathlon' },
              text: {
                en: `[Ironman Kalmar](${links.ironmanKalmar}) and Ironman Tallinn, with [marathons](${links.amsterdamMarathon}) in between.`,
                de: `[Ironman Kalmar](${links.ironmanKalmar}) und Ironman Tallinn, dazwischen [Marathons](${links.amsterdamMarathon}).`,
              },
              photo: photos.swim,
            },
            {
              title: { en: 'Skiing', de: 'Skifahren' },
              text: {
                en: 'FIS races and Viennese youth champion as a kid. Ski instructor (LS2) today.',
                de: 'Als Kind FIS-Rennen und Wiener Jugendmeister. Heute Skilehrer (LS2).',
              },
              photo: photos.ski,
            },
            {
              title: { en: 'Ice hockey', de: 'Eishockey' },
              text: {
                en: 'Played for the UCL Yetis in BUIHA Division 1.',
                de: 'Für die UCL Yetis in der BUIHA Division 1 gespielt.',
              },
              photo: photos.hockey,
            },
            {
              title: { en: 'Photography and film', de: 'Fotografie und Film' },
              text: {
                en: 'FPV drones at thirteen, landscape prints at sixteen. Now mostly short films of trips with friends.',
                de: 'Mit dreizehn FPV-Drohnen, mit sechzehn Landschaftsdrucke. Heute vor allem kurze Filme von Reisen mit Freunden.',
              },
              photo: photos.summer,
            },
          ],
        },
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
