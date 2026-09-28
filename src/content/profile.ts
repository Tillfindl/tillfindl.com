/*
 * Everything the site says about Till, in English and German.
 *
 * This is the one source of truth: the page, the JSON-LD for search engines and /llms.txt for
 * AI assistants are all generated from it, so a fact changed here changes everywhere.
 *
 * House rules for the copy: first person, short sentences, no em dashes, nothing private
 * (no phone, address, birth date or personal email), and every Bounceback claim checked
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
};

export const person = {
  name: 'Till Findl',
  givenName: 'Till',
  familyName: 'Findl',
  place: { en: 'Vienna & London', de: 'Wien & London' } satisfies L,
  lede: {
    en: 'Trained as a doctor at UCL. Now building Bounceback, practice software for physiotherapists.',
    de: 'Medizin am UCL in London studiert. Jetzt baue ich Bounceback, Praxissoftware für Physiotherapeut:innen.',
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
  visit: { en: 'Visit', de: 'Zur Website' },
  contact: {
    en: 'The best way to reach me is LinkedIn.',
    de: 'Am besten erreichbar über LinkedIn.',
  },
  forMachines: {
    en: 'For AI assistants and search engines, a plain summary lives at',
    de: 'Für KI-Assistenten und Suchmaschinen gibt es eine Zusammenfassung unter',
  },
  photosLabel: { en: 'Photos', de: 'Fotos' },
} satisfies Record<string, L>;

export interface Venture {
  id: 'bounceback' | 'eigen';
  label: L;
  name: string;
  legalName: string;
  role: L;
  city: L;
  since: number;
  url: string;
  /** A display line set larger than the body, or null. */
  line: L | null;
  body: L[];
}

export const bounceback: Venture = {
  id: 'bounceback',
  label: { en: 'Now', de: 'Jetzt' },
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
      en: 'Physiotherapists are highly trained clinicians, yet much of what surrounds their work has been accepted as good enough for years: clunky software, notes written after hours, a separate card terminal, a PDF of exercises nobody follows up on.',
      de: 'Physiotherapeut:innen sind hochqualifizierte Kliniker:innen. Trotzdem gilt vieles rund um ihre Arbeit seit Jahren als gut genug: umständliche Software, Dokumentation nach Feierabend, ein eigenes Kartenterminal, ein PDF mit Übungen, bei dem niemand nachfragt.',
    },
    {
      en: 'We started with the gap after the appointment: patients filming their home exercises, physios giving feedback between visits. Listening to physios pulled us further, into everything around the session. Bounceback is now practice software, done properly: booking, notes that write themselves, payments on the phone, and Echo, which carries care on between visits. From €0.',
      de: 'Angefangen haben wir bei der Lücke nach dem Termin: Patient:innen filmen ihre Heimübungen, Therapeut:innen geben zwischen den Terminen Feedback. Die Gespräche mit Physios haben uns weitergeführt, zu allem rund um die Behandlung. Heute ist Bounceback Praxissoftware, richtig gemacht: Terminbuchung, Notizen, die sich selbst schreiben, Zahlungen am Handy und Echo, das die Betreuung zwischen den Terminen weiterführt. Ab €0.',
    },
    {
      en: 'I lead a team of four in Vienna, with engineers from MIT and TU Wien.',
      de: 'Ich leite ein vierköpfiges Team in Wien, mit Engineers vom MIT und der TU Wien.',
    },
  ],
};

export const eigen: Venture = {
  id: 'eigen',
  label: { en: 'Also', de: 'Außerdem' },
  name: 'Eigen Running',
  legalName: 'Eigen Running GmbH',
  role: { en: 'Cofounder & Chief of Product', de: 'Mitgründer & Chief of Product' },
  city: { en: 'Zurich', de: 'Zürich' },
  since: 2025,
  url: links.eigen,
  line: null,
  body: [
    {
      en: 'Eigen works out how someone runs from a phone video and a 3D scan of their feet. I built the core biomechanics: turning 2D pose estimation into three-dimensional gait, with perspective correction and detection of ground contact and gait phases. The first product recommends running shoes, grounded in more than 200 peer-reviewed studies, to lower injury risk and get the fit right.',
      de: 'Eigen erkennt aus einem Handyvideo und einem 3D-Scan der Füße, wie jemand läuft. Ich habe die biomechanischen Kernalgorithmen entwickelt: aus 2D-Posenschätzung dreidimensionale Gangmechanik ableiten, mit Perspektivkorrektur und Erkennung von Bodenkontakt und Gangphasen. Das erste Produkt empfiehlt Laufschuhe, gestützt auf über 200 peer-reviewte Studien, um das Verletzungsrisiko zu senken und die Passform zu treffen.',
    },
    {
      en: 'Built with robotics and software engineers at ETH Zurich, and supported by an ETH Zurich jFund grant of CHF 40,000.',
      de: 'Entwickelt mit Robotik- und Softwareingenieuren der ETH Zürich, gefördert durch den ETH Zürich jFund mit CHF 40.000.',
    },
  ],
};

export const medicine = {
  label: { en: 'Background', de: 'Hintergrund' } satisfies L,
  title: { en: 'Medicine', de: 'Medizin' } satisfies L,
  body: [
    {
      en: 'I studied medicine at UCL from 2020 to 2026: three years of science, then three years on the wards, with placements at University College Hospital and the Royal Free, and specialist time at Queen Square (neurology), Great Ormond Street (paediatrics) and Moorfields (ophthalmology).',
      de: 'Von 2020 bis 2026 habe ich am UCL Medizin studiert: drei Jahre Vorklinik, dann drei Jahre auf Station, mit Praktika am University College Hospital und am Royal Free sowie Rotationen am Queen Square (Neurologie), Great Ormond Street (Pädiatrie) und Moorfields (Augenheilkunde).',
    },
    {
      en: 'In my final year I spent a month in a rural GP practice on the Isle of Harris, in the Outer Hebrides, where I also worked on a partly automated way of handling medicine shortages and structured deprescribing.',
      de: 'Im letzten Studienjahr war ich einen Monat in einer Landarztpraxis auf der Isle of Harris in den Äußeren Hebriden. Dort habe ich auch an einem teilautomatisierten Umgang mit Lieferengpässen bei Medikamenten und strukturiertem Deprescribing gearbeitet.',
    },
    {
      en: 'Along the way: an intercalated BSc in Medical Sciences with Global Health, with a thesis on the economics of diabetic retinopathy screening in the age of AI, supervised at the London School of Hygiene & Tropical Medicine; and tutorials for younger students in cardiology, orthopaedics and neurology.',
      de: 'Dazwischen: ein Intercalated BSc in Medical Sciences with Global Health, mit einer Abschlussarbeit zur Wirtschaftlichkeit von Screening auf diabetische Retinopathie im Zeitalter von KI, betreut an der London School of Hygiene & Tropical Medicine; und Tutorien für jüngere Studierende in Kardiologie, Orthopädie und Neurologie.',
    },
    {
      en: 'It started before all of that: my civil service as a paramedic with the Austrian Red Cross in Vienna, through the first months of COVID-19.',
      de: 'Angefangen hat es davor: mit meinem Zivildienst als Rettungssanitäter beim Wiener Roten Kreuz, bis in die ersten Monate von COVID-19.',
    },
  ] satisfies L[],
};

export const principles = {
  label: { en: 'How I work', de: 'Wie ich arbeite' } satisfies L,
  items: [
    {
      title: { en: 'Question “good enough”', de: '„Gut genug“ hinterfragen' },
      body: {
        en: 'Most of what frustrates clinicians was never designed badly. People just stopped asking whether it could be better. That is where I start.',
        de: 'Das meiste, was Kliniker:innen frustriert, wurde nie schlecht entworfen. Es hat nur irgendwann niemand mehr gefragt, ob es besser geht. Dort fange ich an.',
      },
    },
    {
      title: { en: 'Clinician and builder', de: 'Kliniker und Entwickler' },
      body: {
        en: 'I know the problem from the ward and can build the answer myself, from the data pipeline to the screen. Standing in both rooms is where I am most useful.',
        de: 'Ich kenne das Problem von der Station und kann die Lösung selbst bauen, von der Datenpipeline bis zum Bildschirm. Zwischen beiden Welten bin ich am nützlichsten.',
      },
    },
    {
      title: { en: 'Design with intent', de: 'Design mit Absicht' },
      body: {
        en: 'I care how things look and feel, the way Apple or Porsche do: not decoration, but a reason behind every detail. Healthcare software is allowed to be beautiful, and fast.',
        de: 'Mir ist wichtig, wie sich Dinge anfühlen, so wie bei Apple oder Porsche: keine Dekoration, sondern ein Grund hinter jedem Detail. Software im Gesundheitswesen darf schön sein, und schnell.',
      },
    },
    {
      title: { en: 'Build to find out', de: 'Bauen, um es herauszufinden' },
      body: {
        en: 'I would rather make a prototype than debate one. I once turned phone face scans into custom 3D-printed CPAP masks and bench-tested them against industry masks. It never became a company. It taught me a lot.',
        de: 'Ich baue lieber einen Prototyp, als lange darüber zu diskutieren. Einmal habe ich aus Handy-Gesichtsscans maßgefertigte, 3D-gedruckte CPAP-Masken gemacht und sie gegen Industriemasken getestet. Ein Unternehmen ist daraus nie geworden. Gelernt habe ich viel.',
      },
    },
  ] satisfies { title: L; body: L }[],
};

export const outside = {
  label: { en: 'Outside work', de: 'Abseits der Arbeit' } satisfies L,
  facts: [
    {
      en: 'Alpine ski racing at FIS level, Viennese youth champion. Qualified ski instructor.',
      de: 'Alpiner Skirennsport auf FIS-Niveau, Wiener Schüler- und Jugendmeister. Ausgebildeter Skilehrer.',
    },
    { en: 'Ironman Kalmar 2023 in 11:11.', de: 'Ironman Kalmar 2023 in 11:11.' },
    { en: 'Amsterdam Marathon 2024 in 2:59.', de: 'Amsterdam Marathon 2024 in 2:59.' },
    {
      en: 'UCL Ice Hockey A team, BUIHA Division 1.',
      de: 'UCL Ice Hockey A-Team, BUIHA Division 1.',
    },
    { en: 'Photography and film.', de: 'Fotografie und Film.' },
  ] satisfies L[],
};

/** Photo files live in src/assets/photos; alt text describes the picture, captions name the moment. */
export const photos = {
  portrait: {
    file: 'portrait-harris.jpg',
    alt: {
      en: 'Till Findl, portrait outdoors on the Isle of Harris, Scotland',
      de: 'Till Findl, Porträt im Freien auf der Isle of Harris, Schottland',
    },
    caption: { en: 'Isle of Harris', de: 'Isle of Harris' },
  },
  medicine: [
    {
      file: 'ucl-medical-school.jpg',
      alt: {
        en: 'Till in graduation gown at the entrance of the Royal Free and University College Medical School',
        de: 'Till im Talar vor dem Eingang der Royal Free and University College Medical School',
      },
      caption: { en: 'UCL Medical School, 2026', de: 'UCL Medical School, 2026' },
    },
    {
      file: 'ucl-portico.jpg',
      alt: {
        en: 'Till in graduation gown in front of the UCL portico',
        de: 'Till im Talar vor dem Portikus des UCL',
      },
      caption: { en: 'Graduation, 2026', de: 'Abschluss, 2026' },
    },
  ],
  outside: [
    {
      file: 'ironman-swim.jpg',
      alt: { en: 'Till leaving the water at Ironman Kalmar, pulling off his wetsuit', de: 'Till beim Schwimmausstieg beim Ironman Kalmar, zieht den Neoprenanzug aus' },
      caption: { en: 'Ironman Kalmar, out of the water', de: 'Ironman Kalmar, Schwimmausstieg' },
    },
    {
      file: 'ski-giant-slalom.jpg',
      alt: { en: 'Till racing giant slalom, just past a red gate', de: 'Till im Riesentorlauf, knapp hinter einem roten Tor' },
      caption: { en: 'Giant slalom', de: 'Riesentorlauf' },
    },
    {
      file: 'ironman-run.jpg',
      alt: { en: 'Till running at Ironman Kalmar, black and white', de: 'Till beim Laufen beim Ironman Kalmar, schwarz-weiß' },
      caption: { en: 'Ironman Kalmar, the run', de: 'Ironman Kalmar, die Laufstrecke' },
    },
    {
      file: 'pond-hockey.jpg',
      alt: { en: 'Till with an ice hockey stick on a frozen mountain lake', de: 'Till mit Eishockeyschläger auf einem zugefrorenen Bergsee' },
      caption: { en: 'Pond hockey', de: 'Eishockey am See' },
    },
    {
      file: 'ucl-ice-hockey-team.jpg',
      alt: { en: 'Team photo of the UCL Yetis ice hockey team on the ice', de: 'Mannschaftsfoto der UCL Yetis auf dem Eis' },
      caption: { en: 'UCL Yetis', de: 'UCL Yetis' },
    },
    {
      file: 'ice-hockey-sister.jpg',
      alt: { en: 'Till in a UCL ice hockey jersey with his sister after a game, black and white', de: 'Till im UCL-Eishockeytrikot mit seiner Schwester nach einem Spiel, schwarz-weiß' },
      caption: { en: 'With my sister, after a game', de: 'Mit meiner Schwester, nach dem Spiel' },
    },
    {
      file: 'pond-hockey-lake.jpg',
      alt: { en: 'A skater shooting a puck on a frozen lake below snowy mountains', de: 'Ein Eisläufer schießt einen Puck auf einem zugefrorenen See vor verschneiten Bergen' },
      caption: { en: 'Black ice', de: 'Schwarzeis' },
    },
    {
      file: 'summer-austria.jpg',
      alt: { en: 'Till and a friend in lederhosen on a village street in the Austrian mountains', de: 'Till und ein Freund in Lederhosen auf einer Dorfstraße in den österreichischen Bergen' },
      caption: { en: 'Summer at home', de: 'Sommer daheim' },
    },
    {
      file: 'summer-austria-shoulders.jpg',
      alt: { en: 'Till sitting on a friend’s shoulders, both in lederhosen, laughing', de: 'Till sitzt lachend auf den Schultern eines Freundes, beide in Lederhosen' },
      caption: { en: 'Same summer', de: 'Derselbe Sommer' },
    },
  ],
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
  {
    name: 'University College London',
    degree: 'MBBS Medicine',
    years: '2020–2026',
  },
  {
    name: 'University College London',
    degree: 'Intercalated BSc Medical Sciences with Global Health',
    years: '2022–2023',
  },
  {
    name: 'Vienna International School',
    degree: 'International Baccalaureate',
    years: '2019',
  },
];

export const otherPath = (lang: Lang) => (lang === 'en' ? '/de/' : '/');
export const pathFor = (lang: Lang) => (lang === 'en' ? '/' : '/de/');
