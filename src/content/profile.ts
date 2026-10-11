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
  /**
   * Shown as a wide instant print in the interactive version, for group photos a square print
   * would cut people off.
   */
  wide?: boolean;
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

/** One phrase of the interactive version's words (see `experience.script`). */
export interface Phrase {
  t: L;
  /** What the phrase sets moving beside it, by name (scripts/experience.ts). */
  cue?: string;
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
  bike: { file: 'bike-sunset.jpg', alt: { en: 'A road bike on a lane in an Alpine valley at sunset', de: 'Ein Rennrad auf einem Weg in einem Alpental bei Sonnenuntergang' } },
  skiPodium: { file: 'ski-podium.jpg', alt: { en: 'Till on top of the podium at a ski race in falling snow', de: 'Till ganz oben am Podest eines Skirennens im Schneefall' } },
  skiCarve: { file: 'ski-carve.jpg', alt: { en: 'A skier in yellow carving a turn in fresh snow', de: 'Ein Skifahrer in Gelb zieht einen Carvingschwung im Neuschnee' } },
  snowcat: { file: 'snowcat.jpg', alt: { en: 'A snowcat among snowy trees in bright sun', de: 'Eine Pistenraupe zwischen verschneiten Bäumen in strahlender Sonne' } },
  transition: {
    file: 'ironman-transition.jpg',
    alt: { en: 'Friends in the transition area before an Ironman, between rows of bikes in morning fog', de: 'Freunde in der Wechselzone vor einem Ironman, zwischen Reihen von Rädern im Morgennebel' },
  },
  yetis: { file: 'yetis-team.jpg', alt: { en: 'The UCL Yetis ice hockey team on the ice, black and white', de: 'Das Eishockeyteam der UCL Yetis auf dem Eis, schwarz-weiß' }, wide: true },
  runClub: { file: 'run-club.jpg', alt: { en: 'The Sunday run club getting ready outside a house in London', de: 'Der Sonntagslauf beim Aufwärmen vor einem Haus in London' } },
  workshop: {
    file: 'workshop.jpg',
    alt: { en: 'Someone in an “Overengineered? absolutely” T-shirt at a workshop bench', de: 'Jemand in einem T-Shirt mit „Overengineered? absolutely“ an einer Werkbank' },
  },
  lofotenCabins: {
    file: 'lofoten-cabins.jpg',
    alt: { en: 'Red fishing cabins below a snowy peak in the Lofoten Islands', de: 'Rote Fischerhütten unter einem verschneiten Gipfel auf den Lofoten' },
  },
  lofotenAurora: { file: 'lofoten-aurora.jpg', alt: { en: 'Northern lights over a snowy peak in the Lofoten Islands', de: 'Nordlicht über einem verschneiten Gipfel auf den Lofoten' } },
  hallstatt: { file: 'hallstatt.jpg', alt: { en: 'Hallstatt in falling snow, with boathouses on the lake', de: 'Hallstatt im Schneefall, mit Bootshäusern am See' } },
  defender: { file: 'defender-river.jpg', alt: { en: 'A white Defender crossing a river below green mountains', de: 'Ein weißer Defender durchquert einen Fluss vor grünen Bergen' } },
  reindeer: { file: 'reindeer.jpg', alt: { en: 'A white reindeer in the snow', de: 'Ein weißes Rentier im Schnee' } },
  dolomites: { file: 'dolomites.jpg', alt: { en: 'Till carrying a friend on his shoulders in a meadow in the Dolomites', de: 'Till trägt einen Freund auf den Schultern, auf einer Wiese in den Dolomiten' } },
  nashville: { file: 'nashville.jpg', alt: { en: 'Till and a friend on Broadway in Nashville at night', de: 'Till und ein Freund nachts auf dem Broadway in Nashville' } },
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
          'On every rotation it annoyed me how much of the day went into software instead of patients: one program for imaging, another for notes, another for prescriptions. And once patients went home, they were mostly on their own.',
          'Auf jeder Rotation hat mich genervt, wie viel vom Tag in Software statt in Patienten ging: ein Programm für die Bildgebung, eines für Notizen, eines für Verschreibungen. Und sobald Patienten nach Hause gingen, waren sie meistens auf sich allein gestellt.',
        ),
        { kind: 'pair', photos: [photos.medSchool, photos.portico] },
      ],
    },
    {
      id: 'bounceback',
      title: { en: 'Bounceback', de: 'Bounceback' },
      blocks: [
        p(
          `So with my team in Vienna I started Bounceback: software for physio practices that keeps patients and their physio connected between appointments, and runs the rest of the practice too. [bounceback.at](${links.bounceback})`,
          `Also habe ich mit meinem Team in Wien Bounceback gegründet: Software für Physiopraxen, die Patienten und Physios zwischen den Terminen verbindet und auf der auch der Rest der Praxis läuft. [bounceback.at](${links.bounceback})`,
        ),
      ],
    },
    {
      id: 'eigen',
      title: { en: 'Eigen', de: 'Eigen' },
      blocks: [
        p(
          `Alongside Bounceback there’s Eigen, which goes back to London. For two years I hosted a Sunday run club in Highbury. Some of my best friends came from it, and so did Max, a robotics engineer from ETH Zurich. Our first project together was custom 3D-printed CPAP masks from smartphone face scans, built in quick iterations. Then we pivoted to running, and that became Eigen: a 3D foot scan and a short running video, matched to the shoes that suit how someone runs. I look after the product and the biomechanics. [eigen-running.com](${links.eigen})`,
          `Neben Bounceback gibt es Eigen, und das geht auf London zurück. Zwei Jahre lang habe ich in Highbury einen Sonntagslauf organisiert. Einige meiner besten Freunde kommen von dort, und auch Max, Robotikingenieur von der ETH Zürich. Unser erstes gemeinsames Projekt waren maßgefertigte, 3D-gedruckte CPAP-Masken aus Smartphone-Gesichtsscans, in schnellen Iterationen gebaut. Dann haben wir auf Laufen umgeschwenkt, und daraus wurde Eigen: ein 3D-Fußscan und ein kurzes Laufvideo, abgeglichen mit den Schuhen, die zum Laufstil passen. Ich kümmere mich um das Produkt und die Biomechanik. [eigen-running.com](${links.eigen})`,
        ),
        { kind: 'photo', photo: photos.nightRun },
      ],
    },
    {
      id: 'personal',
      title: { en: 'Personal', de: 'Privat' },
      blocks: [
        p('What I like doing outside of work.', 'Was ich außerhalb der Arbeit gern mache.'),
        {
          kind: 'items',
          items: [
            {
              title: { en: 'Triathlon', de: 'Triathlon' },
              text: {
                en: 'I hate the swim, but I love riding my bike and running with friends.',
                de: 'Das Schwimmen hasse ich, aber Radfahren und Laufen mit Freunden liebe ich.',
              },
              detail: {
                en: `[Ironman Kalmar](${links.ironmanKalmar}) and Ironman Tallinn, and marathons including [Amsterdam](${links.amsterdamMarathon}).`,
                de: `[Ironman Kalmar](${links.ironmanKalmar}) und Ironman Tallinn, dazu Marathons, darunter [Amsterdam](${links.amsterdamMarathon}).`,
              },
              photo: photos.bike,
            },
            {
              title: { en: 'Ice hockey', de: 'Eishockey' },
              text: {
                en: 'I had the best time of my life with the UCL ice hockey team.',
                de: 'Mit dem Eishockeyteam des UCL hatte ich die beste Zeit meines Lebens.',
              },
              detail: {
                en: 'Played for the UCL Yetis in BUIHA Division 1.',
                de: 'Für die UCL Yetis in der BUIHA Division 1 gespielt.',
              },
              photo: photos.hockey,
            },
            {
              title: { en: 'Skiing', de: 'Skifahren' },
              text: {
                en: 'I grew up on skis, and a race course is still my favourite place on a mountain.',
                de: 'Ich bin auf Skiern aufgewachsen, und eine Rennstrecke ist immer noch mein liebster Platz am Berg.',
              },
              detail: {
                en: 'FIS races and Viennese youth champion; qualified ski instructor (LS2).',
                de: 'FIS-Rennen und Wiener Jugendmeister; ausgebildeter Skilehrer (LS2).',
              },
              photo: photos.ski,
            },
            {
              title: { en: 'Photography and film', de: 'Fotografie und Film' },
              text: {
                en: 'I like having something to look back on from trips and past experiences.',
                de: 'Ich mag es, von Reisen und Erlebnissen etwas zu haben, auf das ich zurückschauen kann.',
              },
              detail: {
                en: 'Sold landscape prints from Austria and Lofoten; now mostly short films of trips with friends.',
                de: 'Landschaftsdrucke aus Österreich und von den Lofoten verkauft; heute vor allem kurze Filme von Reisen mit Freunden.',
              },
              photo: photos.lofotenCabins,
            },
          ],
        },
      ],
    },
  ] satisfies Chapter[],
  contact: {
    title: { en: 'Contact', de: 'Kontakt' },
    text: {
      en: 'If you’d like to contact me, LinkedIn is the easiest way to reach me.',
      de: 'Wenn du mich kontaktieren möchtest, erreichst du mich am einfachsten über LinkedIn.',
    },
    pending: { en: 'Link coming soon', de: 'Link folgt' },
  },
  footer: {
    forMachines: { en: 'Summary for AI assistants', de: 'Zusammenfassung für KI-Assistenten' },
    top: { en: 'Back to top', de: 'Nach oben' },
  },
  /**
   * Words and photos only the interactive version (/v2/) shows: the same words as `chapters`, set
   * as handwritten phrases (`script`), the Polaroid captions, the prints for each personal item,
   * and the labels in its drawings.
   */
  experience: {
    title: { en: 'Till Findl, interactive', de: 'Till Findl, interaktiv' },
    /**
     * The chapters' words, split into the short phrases the interactive version shows one or two at
     * a time, with overlay markup (see phrase.ts): ^big^, _small_, ~underlined~, and " / " where a
     * line breaks. Each list must say exactly what its paragraph says once the markup is taken out;
     * the build stops if it does not (Experience.astro checks it). A `cue` names what the phrase
     * sets moving in the drawing or photos beside it (scripts/experience.ts).
     */
    script: {
      medicine: [
        { cue: 'med-1', t: { en: '^Six years^ of medicine / at ^UCL^,', de: '^Sechs Jahre^ Medizin / am ^UCL^,' } },
        {
          cue: 'med-2',
          t: {
            en: '_with clinical rotations at_ / University College Hospital, / the Royal Free, / Great Ormond Street, / Queen Square and Moorfields,',
            de: '_mit klinischen Rotationen am_ / University College Hospital, / Royal Free, / Great Ormond Street, / Queen Square und Moorfields',
          },
        },
        {
          cue: 'med-3',
          t: { en: '_and a final elective in_ orthopaedics / in ^Kuala Lumpur^.', de: '_und einer abschließenden Famulatur_ / in der Orthopädie / in ^Kuala Lumpur^.' },
        },
      ],
      wards: [
        { cue: 'wards-1', t: { en: '_On every rotation_ / it ^annoyed^ me', de: '_Auf jeder Rotation_ / hat mich ^genervt^,' } },
        {
          cue: 'wards-2',
          t: { en: 'how much of the day / went into ^software^ / _instead of_ patients:', de: 'wie viel vom Tag / in ^Software^ / _statt in_ Patienten ging:' },
        },
        {
          cue: 'wards-3',
          t: {
            en: 'one program for ~imaging~, / another for ~notes~, / another for ~prescriptions~.',
            de: 'ein Programm / für die ~Bildgebung~, / eines für ~Notizen~, / eines für ~Verschreibungen~.',
          },
        },
        { cue: 'leave', t: { en: 'And once patients / went home,', de: 'Und sobald Patienten / nach Hause gingen,' } },
        { cue: 'break', t: { en: 'they were mostly / ^on their own^.', de: 'waren sie meistens / ^auf sich allein^ / gestellt.' } },
      ],
      bounceback: [
        {
          cue: 'sweep',
          t: { en: 'So with my team in ^Vienna^ / I started ^Bounceback^:', de: 'Also habe ich / mit meinem Team in ^Wien^ / ^Bounceback^ gegründet:' },
        },
        {
          cue: 'screens-a',
          t: {
            en: 'software for physio practices / that keeps patients / and their physio ~connected~ / between appointments,',
            de: 'Software für Physiopraxen, / die Patienten und Physios / zwischen den Terminen / ~verbindet~',
          },
        },
        { cue: 'screens-b', t: { en: 'and runs the rest / of the practice too.', de: 'und auf der auch / der Rest der Praxis läuft.' } },
        { t: { en: `_[bounceback.at](${links.bounceback})_`, de: `_[bounceback.at](${links.bounceback})_` } },
      ],
      eigen: [
        {
          cue: 'eigen-1',
          t: { en: 'Alongside Bounceback / there’s ^Eigen^, / _which goes back to_ London.', de: 'Neben Bounceback / gibt es ^Eigen^, / _und das geht auf_ London zurück.' },
        },
        {
          cue: 'lap',
          t: { en: 'For two years I hosted / a ^Sunday run club^ / in Highbury.', de: 'Zwei Jahre lang / habe ich in Highbury / einen ^Sonntagslauf^ / organisiert.' },
        },
        { t: { en: 'Some of my best friends / came from it,', de: 'Einige meiner besten Freunde / kommen von dort,' } },
        {
          cue: 'max',
          t: { en: '_and so did_ ^Max^, / a robotics engineer / from ETH Zurich.', de: '_und auch_ ^Max^, / Robotikingenieur / von der ETH Zürich.' },
        },
        {
          cue: 'masks',
          t: {
            en: 'Our first project together / was custom 3D-printed / ^CPAP masks^ / from smartphone face scans,',
            de: 'Unser erstes gemeinsames / Projekt waren maßgefertigte, / 3D-gedruckte / ^CPAP-Masken^ / aus Smartphone-Gesichtsscans,',
          },
        },
        { cue: 'iterate', t: { en: 'built in ~quick iterations~.', de: 'in ~schnellen~ ~Iterationen~ / gebaut.' } },
        { cue: 'pivot', t: { en: 'Then we ^pivoted^ / to running,', de: 'Dann haben wir auf Laufen / ^umgeschwenkt^,' } },
        {
          t: {
            en: 'and that became ^Eigen^: / a 3D foot scan / and a short running video,',
            de: 'und daraus wurde ^Eigen^: / ein 3D-Fußscan / und ein kurzes Laufvideo,',
          },
        },
        { t: { en: 'matched to the shoes / that suit how someone runs.', de: 'abgeglichen mit den Schuhen, / die zum Laufstil passen.' } },
        { t: { en: 'I look after the ^product^ / and the ^biomechanics^.', de: 'Ich kümmere mich / um das ^Produkt^ / und die ^Biomechanik^.' } },
        { t: { en: `_[eigen-running.com](${links.eigen})_`, de: `_[eigen-running.com](${links.eigen})_` } },
      ],
      personal: { en: 'What I ^like^ doing / outside of work.', de: 'Was ich außerhalb der Arbeit / ^gern^ mache.' },
      contact: {
        en: 'If you’d like to ^contact^ me, / LinkedIn is the easiest way / to reach me.',
        de: 'Wenn du mich ^kontaktieren^ möchtest, / erreichst du mich am einfachsten / über ^LinkedIn^.',
      },
    } satisfies Record<string, Phrase[] | L>,
    /**
     * Written by hand on the bottom strip of the Polaroids, keyed by photo file. Only places and
     * races we are sure of; a print without an entry stays blank.
     */
    captions: {
      'ucl-medical-school.jpg': { en: 'Medical school', de: 'Medical School' },
      'ucl-portico.jpg': { en: 'Graduation ’26', de: 'Abschluss ’26' },
      'theatre-kl.jpg': { en: 'Kuala Lumpur', de: 'Kuala Lumpur' },
      'run-club.jpg': { en: 'Sunday run club', de: 'Sonntagslauf' },
      'ironman-swim.jpg': { en: 'Ironman Kalmar', de: 'Ironman Kalmar' },
      'ironman-transition.jpg': { en: 'Ironman Tallinn', de: 'Ironman Tallinn' },
      'yetis-team.jpg': { en: 'UCL Yetis', de: 'UCL Yetis' },
      'lofoten-cabins.jpg': { en: 'Lofoten', de: 'Lofoten' },
      'lofoten-aurora.jpg': { en: 'Lofoten', de: 'Lofoten' },
      'hallstatt.jpg': { en: 'Hallstatt', de: 'Hallstatt' },
      'dolomites.jpg': { en: 'Dolomites', de: 'Dolomiten' },
      'nashville.jpg': { en: 'Nashville', de: 'Nashville' },
    } as Record<string, L>,
    /** The run club print and the workshop print beside the Eigen phrases. */
    eigenPrints: { run: photos.runClub, workshop: photos.workshop },
    /** The prints for each personal item, in the order of the items in `chapters`. */
    gallery: [
      [photos.transition, photos.bike, photos.run, photos.swim],
      [photos.yetis, photos.hockey, photos.sister],
      [photos.skiCarve, photos.ski, photos.skiPodium, photos.snowcat],
      [photos.lofotenCabins, photos.lofotenAurora, photos.hallstatt, photos.defender, photos.reindeer, photos.dolomites, photos.nashville, photos.summer],
    ] as Photo[][],
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
        'Software combining 2D human pose estimation and 3D point-cloud foot scans to infer gait and foot biomechanics from smartphone data. First application: a personalised iOS running shoe recommendation platform, grounded in evidence from over 200 peer-reviewed studies, to reduce footwear-related injury risk, improve fit and minimise returns. Till developed the core biomechanical algorithms that infer three-dimensional gait mechanics from 2D data (ViTPose), including perspective correction, detection of ground contact and gait phases, and sub-frame kinematic interpolation. Built with engineers at ETH Zurich; backed by an ETH Zurich jFund grant.',
    },
  ],
  background: [
    'MBBS Medicine, University College London, September 2020 to July 2026: a six-year degree with three years of pre-clinical training and three years of full-time clinical rotations across all core specialties. Clinical placements at University College Hospital and the Royal Free, with specialist time at Queen Square (neurology), Great Ormond Street (paediatrics) and Moorfields (ophthalmology).',
    'Orthopaedics elective in Kuala Lumpur, spring and summer 2026, after four days at two eye hospitals in Bangalore.',
    'Custom CPAP mask project, London, 2024 to 2025, as project leader: custom 3D-printed CPAP masks from smartphone 3D facial scans, using an automated scan-to-mask shaping pipeline. The precursor to Eigen.',
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
