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

/** One thing in the personal section: a photo, a short title, what Till loves about it, and the proof. */
export interface Item {
  title: L;
  text: L;
  detail: L;
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
        p(
          'Six years of medicine at UCL, with clinical rotations at University College Hospital, the Royal Free, Great Ormond Street, Queen Square and Moorfields, and a final elective in orthopaedics in Kuala Lumpur.',
          'Sechs Jahre Medizin am UCL, mit klinischen Rotationen am University College Hospital, Royal Free, Great Ormond Street, Queen Square und Moorfields und einer abschließenden Famulatur in der Orthopädie in Kuala Lumpur.',
        ),
        { kind: 'photo', photo: photos.theatre },
        p(
          'Across those rotations, the same thing kept bothering me: a lot of the day went into software instead of patients, with one program for imaging, another for notes and another for prescriptions. And once patients went home, they were mostly on their own.',
          'Auf all diesen Rotationen hat mich dasselbe gestört. Man verbrachte einen großen Teil des Tages mit Software statt mit Patienten: ein Programm für die Bildgebung, eines für die Notizen, eines für Verschreibungen. Und sobald Patienten nach Hause gingen, waren sie meistens auf sich allein gestellt.',
        ),
        { kind: 'pair', photos: [photos.medSchool, photos.portico] },
      ],
    },
    {
      id: 'bounceback',
      title: { en: 'Bounceback', de: 'Bounceback' },
      blocks: [
        p(
          `So with my team in Vienna I built Bounceback, with remote rehab at its core: patients follow their programme in an app, film their sets at home and get feedback from their physio between appointments. The rest of the practice runs on it too, from notes that write themselves during the session to booking and payments, all from one phone, with the AI running on our own hardware in Germany. [bounceback.at](${links.bounceback})`,
          `Also habe ich mit meinem Team in Wien Bounceback gebaut, mit Remote-Reha im Kern: Patienten folgen ihrem Programm in einer App, filmen ihre Übungen zu Hause und bekommen zwischen den Terminen Feedback von ihrem Physio. Auch der Rest der Praxis läuft darüber, von Notizen, die sich während der Behandlung selbst schreiben, bis zu Terminbuchung und Bezahlung, alles von einem Handy aus und mit der KI auf unserer eigenen Hardware in Deutschland. [bounceback.at](${links.bounceback})`,
        ),
      ],
    },
    {
      id: 'eigen',
      title: { en: 'Eigen', de: 'Eigen' },
      blocks: [
        p(
          `Alongside Bounceback there’s Eigen, which goes back to London. For two years I hosted a Sunday run club in Highbury. Some of my best friends came from it, and so did Max, a robotics engineer from ETH Zurich. Our first project together was custom CPAP masks made from a 3D face scan on a phone, built in quick iterations. Then we pivoted to running, and that became Eigen: a 3D foot scan and a short running video, matched to the shoes that suit how someone runs. I look after the product and the biomechanics. [eigen-running.com](${links.eigen})`,
          `Neben Bounceback gibt es Eigen, und das geht auf London zurück. Zwei Jahre lang habe ich in Highbury einen Sonntagslauf organisiert. Einige meiner besten Freunde kommen von dort, und auch Max, Robotikingenieur von der ETH Zürich. Unser erstes gemeinsames Projekt waren maßgefertigte CPAP-Masken aus einem 3D-Gesichtsscan mit dem Handy, in schnellen Iterationen gebaut. Dann haben wir auf Laufen umgeschwenkt, und daraus wurde Eigen: ein 3D-Fußscan und ein kurzes Laufvideo, abgeglichen mit den Schuhen, die zum Laufstil passen. Ich kümmere mich um das Produkt und die Biomechanik. [eigen-running.com](${links.eigen})`,
        ),
        { kind: 'photo', photo: photos.nightRun },
      ],
    },
    {
      id: 'personal',
      title: { en: 'Personal', de: 'Privat' },
      blocks: [
        p('Outside work, it’s mostly sport and film.', 'Abseits der Arbeit dreht sich das meiste um Sport und Film.'),
        {
          kind: 'items',
          items: [
            {
              title: { en: 'Triathlon', de: 'Triathlon' },
              text: {
                en: 'Long swims, rides and runs are how I switch off.',
                de: 'Lange Schwimm-, Rad- und Laufeinheiten sind meine Art abzuschalten.',
              },
              detail: {
                en: `[Ironman Kalmar](${links.ironmanKalmar}) and Ironman Tallinn, and marathons including [Amsterdam](${links.amsterdamMarathon}).`,
                de: `[Ironman Kalmar](${links.ironmanKalmar}) und Ironman Tallinn, dazu Marathons, darunter [Amsterdam](${links.amsterdamMarathon}).`,
              },
              photo: photos.swim,
            },
            {
              title: { en: 'Skiing', de: 'Skifahren' },
              text: {
                en: 'I grew up on skis, and a race course is still my favourite place on a mountain.',
                de: 'Ich bin auf Skiern aufgewachsen, und eine Rennstrecke ist immer noch mein liebster Platz am Berg.',
              },
              detail: {
                en: 'FIS races and Viennese youth champion; now a qualified ski instructor (LS2).',
                de: 'FIS-Rennen und Wiener Jugendmeister; heute ausgebildeter Skilehrer (LS2).',
              },
              photo: photos.ski,
            },
            {
              title: { en: 'Ice hockey', de: 'Eishockey' },
              text: {
                en: 'I love the speed of it, and the team in the locker room.',
                de: 'Ich liebe das Tempo und das Team in der Kabine.',
              },
              detail: {
                en: 'Played for the UCL Yetis in BUIHA Division 1.',
                de: 'Für die UCL Yetis in der BUIHA Division 1 gespielt.',
              },
              photo: photos.hockey,
            },
            {
              title: { en: 'Photography and film', de: 'Fotografie und Film' },
              text: {
                en: 'I like capturing places and the people I’m there with.',
                de: 'Ich halte gern Orte fest und die Menschen, mit denen ich dort bin.',
              },
              detail: {
                en: 'Sold landscape prints from Austria and Lofoten; now mostly short films of trips with friends.',
                de: 'Landschaftsdrucke aus Österreich und von den Lofoten verkauft; heute vor allem kurze Filme von Reisen mit Freunden.',
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
    text: {
      en: 'If you’d like to talk about any of this, LinkedIn is the easiest way to reach me.',
      de: 'Wenn du über etwas davon reden möchtest, erreichst du mich am einfachsten über LinkedIn.',
    },
    pending: { en: 'Link coming soon', de: 'Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
    top: { en: 'Back to top', de: 'Nach oben' },
  },
  /**
   * Words only the interactive version (/v2/) shows: its hints and the labels on its props (the
   * hospital wheel, the software windows, the phone). The story itself comes from `chapters`.
   */
  experience: {
    title: { en: 'Till Findl, interactive', de: 'Till Findl, interaktiv' },
    scroll: { en: 'Scroll', de: 'Scrollen' },
    drag: { en: 'Drag', de: 'Ziehen' },
    /** Written by hand on the bottom strip of the Polaroids, keyed by photo file. */
    captions: {
      'ucl-medical-school.jpg': { en: 'Medical school', de: 'Medical School' },
      'ucl-portico.jpg': { en: 'UCL', de: 'UCL' },
      'theatre-kl.jpg': { en: 'Kuala Lumpur', de: 'Kuala Lumpur' },
      'night-run.jpg': { en: 'London', de: 'London' },
    } as Record<string, L>,
    next: { en: 'Next', de: 'Weiter' },
    rotations: ['University College Hospital', 'Royal Free', 'Great Ormond Street', 'Queen Square', 'Moorfields', 'Kuala Lumpur'],
    windows: [
      { en: 'Imaging', de: 'Bildgebung' },
      { en: 'Notes', de: 'Notizen' },
      { en: 'Prescriptions', de: 'Verschreibungen' },
    ],
    phone: {
      programme: { en: 'Today’s programme', de: 'Heutiges Programm' },
      exercises: [
        { en: 'Split squats', de: 'Ausfallschritte' },
        { en: 'Calf raises', de: 'Wadenheben' },
        { en: 'Side plank', de: 'Seitstütz' },
      ],
      sets: { en: '3 × 10', de: '3 × 10' },
      recording: { en: 'Recording set 2', de: 'Satz 2 wird aufgenommen' },
      physio: { en: 'Your physio', de: 'Dein Physio' },
      feedback: { en: 'Nice depth. Keep the knee over your second toe.', de: 'Schöne Tiefe. Das Knie über der zweiten Zehe halten.' },
      note: { en: 'Session note', de: 'Behandlungsnotiz' },
      noteLines: [
        { en: 'Knee pain on stairs, improving.', de: 'Knieschmerz beim Stiegensteigen, besser.' },
        { en: 'Quadriceps 4/5, full range.', de: 'Quadrizeps 4/5, volle Beweglichkeit.' },
        { en: 'Progress to single-leg work.', de: 'Weiter mit einbeinigen Übungen.' },
      ],
      paid: { en: 'Paid', de: 'Bezahlt' },
    },
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
