/*
 * Everything the site says about Till, in English and German.
 *
 * This is the one source of truth: the page, the JSON-LD for search engines and /llms.txt for
 * AI assistants are all generated from it, so a fact changed here changes everywhere.
 *
 * The page is a story told in blocks, read in the order of `story` below. Each block has a
 * `span` (its width on the 12-column desktop grid; phones stack everything in one column).
 *
 * House rules for the copy: first person, short sentences, no em dashes, no race times, nothing
 * private (no phone, address, birth date or personal email), and every Bounceback claim checked
 * against the product facts before it goes in.
 */

export type Lang = 'en' | 'de';

/** A piece of text in both languages. */
export type L = Record<Lang, string>;

export const SITE_URL = 'https://tillfindl.com';

export const links = {
  /** Till will send the URL; until then the LinkedIn links are left out. */
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
  place: { en: 'Vienna & London', de: 'Wien & London' } satisfies L,
  lede: {
    en: 'I trained as a doctor in London. Now I build software for the people who look after patients.',
    de: 'Ich habe in London Medizin studiert. Heute baue ich Software für die Menschen, die sich um Patient:innen kümmern.',
  } satisfies L,
  /** One neutral paragraph, used for meta descriptions, JSON-LD and the top of llms.txt. */
  summary: {
    en: 'Till Findl is the cofounder and CEO of Bounceback, practice software for physiotherapists, based in Vienna. He studied medicine at University College London (MBBS, 2020 to 2026) and is also cofounder and Chief of Product of Eigen Running in Zurich, which analyses running biomechanics from a smartphone.',
    de: 'Till Findl ist Mitgründer und Geschäftsführer von Bounceback, Praxissoftware für Physiotherapeut:innen mit Sitz in Wien. Er hat am University College London Medizin studiert (MBBS, 2020 bis 2026) und ist außerdem Mitgründer und Chief of Product von Eigen Running in Zürich, das Laufbiomechanik mit dem Smartphone analysiert.',
  } satisfies L,
  languages: {
    en: 'German (native), English (bilingual), Spanish (conversational)',
    de: 'Deutsch (Muttersprache), Englisch (zweisprachig), Spanisch (Grundkenntnisse)',
  } satisfies L,
};

/** Small interface strings. */
export const ui = {
  skip: { en: 'Skip to content', de: 'Zum Inhalt' },
  langName: { en: 'English', de: 'Deutsch' },
  forMachines: {
    en: 'For AI assistants and search engines, a plain summary lives at',
    de: 'Für KI-Assistenten und Suchmaschinen gibt es eine Zusammenfassung unter',
  },
  basedIn: { en: 'Based in', de: 'Zuhause in' },
  languages: { en: 'Languages', de: 'Sprachen' },
} satisfies Record<string, L>;

export const photos = {
  portrait: {
    file: 'portrait-harris.jpg',
    alt: {
      en: 'Till Findl, portrait outdoors on the Isle of Harris, Scotland',
      de: 'Till Findl, Porträt im Freien auf der Isle of Harris, Schottland',
    },
  },
};

/** Width of a block on the 12-column desktop grid. */
export type Span = 4 | 5 | 6 | 7 | 8 | 12;

export interface StoryBlock {
  kind: 'story';
  span: Span;
  /** Small monospaced line above the title: when and where. */
  eyebrow: L;
  title: L;
  body: L[];
}

export interface PhotoBlock {
  kind: 'photo';
  span: Span;
  file: string;
  alt: L;
  caption?: L;
  /** Spans two rows, beside two stacked text blocks. */
  tall?: boolean;
}

export interface VentureBlock {
  kind: 'venture';
  span: Span;
  eyebrow: L;
  name: string;
  legalName: string;
  role: L;
  city: L;
  since: number;
  url: string;
  /** Set large, the line the block stands on. */
  line?: L;
  body: L[];
}

export interface ListBlock {
  kind: 'list';
  span: Span;
  tall?: boolean;
  eyebrow: L;
  title: L;
  body: L[];
  items: { text: L; href?: string }[];
}

export type Block = StoryBlock | PhotoBlock | VentureBlock | ListBlock;

export const bounceback: VentureBlock = {
  kind: 'venture',
  span: 12,
  eyebrow: { en: 'Now · Vienna', de: 'Jetzt · Wien' },
  name: 'Bounceback',
  legalName: 'Bounceback GmbH',
  role: { en: 'Cofounder & CEO', de: 'Mitgründer & Geschäftsführer' },
  city: { en: 'Vienna', de: 'Wien' },
  since: 2024,
  url: links.bounceback,
  line: {
    en: 'Physiotherapy deserves a higher standard than it has been given.',
    de: 'Physiotherapie verdient einen höheren Standard, als sie bekommen hat.',
  },
  body: [
    {
      en: 'Physios are highly trained clinicians, working with tools that were accepted as good enough years ago. We started with the time between appointments, where most of the recovery happens, and kept going: booking, notes that write themselves, payments on the phone, and Echo, which keeps patients on track between visits.',
      de: 'Physiotherapeut:innen sind hochqualifizierte Kliniker:innen und arbeiten mit Werkzeugen, die vor Jahren als gut genug galten. Wir haben bei der Zeit zwischen den Terminen angefangen, in der der Großteil der Genesung passiert, und weitergemacht: Terminbuchung, Notizen, die sich selbst schreiben, Zahlungen am Handy und Echo, das Patient:innen zwischen den Terminen begleitet.',
    },
    {
      en: 'Practice software, done properly. From €0. Built by a team of four in Vienna.',
      de: 'Praxissoftware, richtig gemacht. Ab €0. Gebaut von einem vierköpfigen Team in Wien.',
    },
  ],
};

export const eigen: VentureBlock = {
  kind: 'venture',
  span: 7,
  eyebrow: { en: 'Also · Zurich', de: 'Außerdem · Zürich' },
  name: 'Eigen Running',
  legalName: 'Eigen Running GmbH',
  role: { en: 'Cofounder & Chief of Product', de: 'Mitgründer & Chief of Product' },
  city: { en: 'Zurich', de: 'Zürich' },
  since: 2025,
  url: links.eigen,
  body: [
    {
      en: 'How you run, read from a phone video and a 3D scan of your feet. I built the biomechanics that turn flat video into three-dimensional gait. The first product finds running shoes that suit how you actually run, grounded in more than 200 studies.',
      de: 'Wie du läufst, erkannt aus einem Handyvideo und einem 3D-Scan deiner Füße. Ich habe die Biomechanik gebaut, die aus flachem Video dreidimensionale Gangmuster macht. Das erste Produkt findet Laufschuhe, die zu deinem Laufstil passen, gestützt auf über 200 Studien.',
    },
    {
      en: 'Built with engineers at ETH Zurich and backed by an ETH Zurich jFund grant.',
      de: 'Entwickelt mit Ingenieuren der ETH Zürich und gefördert durch den ETH Zürich jFund.',
    },
  ],
};

/** The page, in reading order. */
export const story: Block[] = [
  {
    kind: 'story',
    span: 5,
    eyebrow: { en: '2019 · Vienna', de: '2019 · Wien' },
    title: { en: 'It started in an ambulance.', de: 'Angefangen hat es im Rettungswagen.' },
    body: [
      {
        en: 'Before university I did my civil service as a paramedic with the Red Cross, through the first months of COVID-19. It showed me early how much good care depends on everything around the clinician.',
        de: 'Vor dem Studium war ich Zivildiener beim Roten Kreuz, als Rettungssanitäter, bis in die ersten Monate von COVID-19. Da habe ich früh gesehen, wie sehr gute Versorgung von allem rund um die Behandelnden abhängt.',
      },
    ],
  },
  {
    kind: 'story',
    span: 7,
    eyebrow: { en: '2020–2026 · London', de: '2020–2026 · London' },
    title: { en: 'Six years of medicine at UCL.', de: 'Sechs Jahre Medizin am UCL.' },
    body: [
      {
        en: 'Three years of science, then three on the wards: University College Hospital and the Royal Free, with time at Queen Square, Great Ormond Street and Moorfields. Along the way I taught younger students in cardiology, orthopaedics and neurology.',
        de: 'Drei Jahre Vorklinik, dann drei Jahre auf Station: University College Hospital und Royal Free, mit Rotationen am Queen Square, Great Ormond Street und Moorfields. Nebenbei habe ich jüngere Studierende in Kardiologie, Orthopädie und Neurologie unterrichtet.',
      },
    ],
  },
  {
    kind: 'photo',
    span: 4,
    tall: true,
    file: 'ucl-medical-school.jpg',
    alt: {
      en: 'Till in graduation gown at the entrance of the Royal Free and University College Medical School',
      de: 'Till im Talar vor dem Eingang der Royal Free and University College Medical School',
    },
    caption: { en: 'UCL Medical School, 2026', de: 'UCL Medical School, 2026' },
  },
  {
    kind: 'story',
    span: 8,
    eyebrow: { en: '2022–2023 · London', de: '2022–2023 · London' },
    title: { en: 'A year on what care is worth.', de: 'Ein Jahr über den Wert von Versorgung.' },
    body: [
      {
        en: 'An intercalated degree in Global Health. My thesis asked what AI screening for diabetic eye disease is really worth, supervised at the London School of Hygiene & Tropical Medicine.',
        de: 'Ein Zusatzstudium in Global Health. Meine Abschlussarbeit hat gefragt, was KI-gestütztes Screening auf diabetische Augenerkrankungen wirklich wert ist, betreut an der London School of Hygiene & Tropical Medicine.',
      },
    ],
  },
  {
    kind: 'story',
    span: 8,
    eyebrow: { en: 'Final year · Isle of Harris', de: 'Letztes Jahr · Isle of Harris' },
    title: { en: 'The last month, on an island.', de: 'Der letzte Monat, auf einer Insel.' },
    body: [
      {
        en: 'My final placement was a rural GP practice in the Outer Hebrides. Between clinics I worked on a simpler, partly automated way for the practice to handle medicine shortages.',
        de: 'Mein letztes Praktikum war eine Landarztpraxis auf den Äußeren Hebriden. Zwischen den Sprechstunden habe ich an einem einfacheren, teilautomatisierten Umgang mit Lieferengpässen bei Medikamenten gearbeitet.',
      },
    ],
  },
  {
    kind: 'story',
    span: 12,
    eyebrow: { en: 'On the side', de: 'Nebenbei' },
    title: { en: 'I build things to find out.', de: 'Ich baue Dinge, um es herauszufinden.' },
    body: [
      {
        en: 'Once it was custom CPAP masks, shaped from a phone scan of a face, 3D-printed and bench-tested against the ones on the market. It never became a company. It did teach me to build first and argue later.',
        de: 'Einmal waren es maßgefertigte CPAP-Masken, geformt aus einem Handyscan des Gesichts, 3D-gedruckt und gegen die Masken am Markt getestet. Ein Unternehmen ist daraus nie geworden. Aber ich habe gelernt, zuerst zu bauen und dann zu diskutieren.',
      },
    ],
  },
  bounceback,
  eigen,
  {
    kind: 'story',
    span: 5,
    eyebrow: { en: 'How I work', de: 'Wie ich arbeite' },
    title: { en: 'Question “good enough”.', de: '„Gut genug“ hinterfragen.' },
    body: [
      {
        en: 'Most of what frustrates clinicians was never designed badly. Nobody went back to ask whether it could be better. That is where I start.',
        de: 'Das meiste, was Kliniker:innen frustriert, wurde nie schlecht entworfen. Es hat nur niemand mehr gefragt, ob es besser geht. Dort fange ich an.',
      },
    ],
  },
  {
    kind: 'story',
    span: 6,
    eyebrow: { en: 'How I work', de: 'Wie ich arbeite' },
    title: { en: 'Both sides of the problem.', de: 'Beide Seiten des Problems.' },
    body: [
      {
        en: 'I know the ward and I can build the software. My best work happens where the two meet.',
        de: 'Ich kenne die Station und kann die Software bauen. Meine beste Arbeit entsteht dort, wo beides zusammenkommt.',
      },
    ],
  },
  {
    kind: 'story',
    span: 6,
    eyebrow: { en: 'How I work', de: 'Wie ich arbeite' },
    title: { en: 'Care in the details.', de: 'Sorgfalt im Detail.' },
    body: [
      {
        en: 'I think about design the way Apple or Porsche do: nothing for decoration, a reason behind every detail. Tools for clinicians deserve that too.',
        de: 'Ich denke über Design wie Apple oder Porsche: nichts zur Dekoration, ein Grund hinter jedem Detail. Werkzeuge für Kliniker:innen verdienen das auch.',
      },
    ],
  },
  {
    kind: 'list',
    span: 4,
    tall: true,
    eyebrow: { en: 'Away from the desk', de: 'Abseits vom Schreibtisch' },
    title: { en: 'Always training for something.', de: 'Immer im Training für irgendwas.' },
    body: [
      {
        en: 'I grew up ski racing in Austria and have been chasing a start line ever since.',
        de: 'Ich bin in Österreich mit Skirennen aufgewachsen und stehe seitdem immer wieder an einer Startlinie.',
      },
    ],
    items: [
      { text: { en: 'Alpine ski racing, FIS level. Viennese youth champion. Ski instructor.', de: 'Alpiner Skirennsport auf FIS-Niveau. Wiener Jugendmeister. Skilehrer.' } },
      { text: { en: 'Ironman Kalmar, 2023', de: 'Ironman Kalmar, 2023' }, href: links.ironmanKalmar },
      { text: { en: 'Amsterdam Marathon, 2024', de: 'Amsterdam Marathon, 2024' }, href: links.amsterdamMarathon },
      { text: { en: 'Ironman Tallinn, 2026', de: 'Ironman Tallinn, 2026' } },
      { text: { en: 'Ice hockey for UCL', de: 'Eishockey für das UCL' } },
      { text: { en: 'Photography and film', de: 'Fotografie und Film' } },
    ],
  },
  {
    kind: 'photo',
    span: 8,
    file: 'ski-giant-slalom.jpg',
    alt: { en: 'Till racing giant slalom, just past a red gate', de: 'Till im Riesentorlauf, knapp hinter einem roten Tor' },
    caption: { en: 'Giant slalom', de: 'Riesentorlauf' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'ironman-swim.jpg',
    alt: { en: 'Till leaving the water at Ironman Kalmar, pulling off his wetsuit', de: 'Till beim Schwimmausstieg beim Ironman Kalmar, zieht den Neoprenanzug aus' },
    caption: { en: 'Ironman Kalmar', de: 'Ironman Kalmar' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'pond-hockey.jpg',
    alt: { en: 'Till with an ice hockey stick on a frozen mountain lake', de: 'Till mit Eishockeyschläger auf einem zugefrorenen Bergsee' },
    caption: { en: 'Black ice', de: 'Schwarzeis' },
  },
  {
    kind: 'photo',
    span: 8,
    file: 'ucl-ice-hockey-team.jpg',
    alt: { en: 'Team photo of the UCL Yetis ice hockey team on the ice', de: 'Mannschaftsfoto der UCL Yetis auf dem Eis' },
    caption: { en: 'UCL Yetis', de: 'UCL Yetis' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'ironman-run.jpg',
    alt: { en: 'Till running at Ironman Kalmar, black and white', de: 'Till beim Laufen beim Ironman Kalmar, schwarz-weiß' },
    caption: { en: 'The run', de: 'Die Laufstrecke' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'ice-hockey-sister.jpg',
    alt: { en: 'Till in a UCL ice hockey jersey with his sister after a game, black and white', de: 'Till im UCL-Eishockeytrikot mit seiner Schwester nach einem Spiel, schwarz-weiß' },
    caption: { en: 'With my sister, after a game', de: 'Mit meiner Schwester, nach dem Spiel' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'summer-austria.jpg',
    alt: { en: 'Till and a friend in lederhosen on a village street in the Austrian mountains', de: 'Till und ein Freund in Lederhosen auf einer Dorfstraße in den österreichischen Bergen' },
    caption: { en: 'Summer at home', de: 'Sommer daheim' },
  },
  {
    kind: 'photo',
    span: 4,
    file: 'pond-hockey-lake.jpg',
    alt: { en: 'A skater shooting a puck on a frozen lake below snowy mountains', de: 'Ein Eisläufer schießt einen Puck auf einem zugefrorenen See vor verschneiten Bergen' },
    caption: { en: 'Same lake', de: 'Derselbe See' },
  },
];

/** The last block: an invitation, not a sales line. */
export const closing = {
  title: {
    en: 'If you are building something in healthcare, or thinking about it, I would like to hear from you.',
    de: 'Wenn du etwas im Gesundheitswesen baust oder darüber nachdenkst, würde ich gern von dir hören.',
  } satisfies L,
  cta: { en: 'Write to me on LinkedIn', de: 'Schreib mir auf LinkedIn' } satisfies L,
  pending: { en: 'LinkedIn link coming soon', de: 'LinkedIn-Link folgt' } satisfies L,
};

/** Page titles and descriptions per language. */
export const meta = {
  title: {
    en: 'Till Findl · Founder of Bounceback, trained doctor',
    de: 'Till Findl · Gründer von Bounceback, Mediziner',
  } satisfies L,
  description: person.summary,
};

/** Education, for JSON-LD and llms.txt. */
export const education = [
  { name: 'University College London', degree: 'MBBS Medicine', years: '2020–2026' },
  { name: 'University College London', degree: 'Intercalated BSc Medical Sciences with Global Health', years: '2022–2023' },
  { name: 'Vienna International School', degree: 'International Baccalaureate', years: '2019' },
];

export const pathFor = (lang: Lang) => (lang === 'en' ? '/' : '/de/');
