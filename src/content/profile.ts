/*
 * Everything the site says about Till, in English and German.
 *
 * `page` is what the page shows: a short opening, then chapters to read, with photos set into
 * the text. `facts` is the fuller record for machines (JSON-LD for search engines, /llms.txt
 * for AI assistants).
 *
 * Voice: plain and observational, told through what Till saw and did (Alain de Botton is the
 * reference). Facts, never proof: no test results, no counts as a flex. Never call Till an
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
    en: 'I studied medicine at UCL in London and now work on software for physiotherapy and running.',
    de: 'Ich habe am UCL in London Medizin studiert und arbeite heute an Software für Physiotherapie und Laufsport.',
  },
  chaptersLabel: { en: 'Chapters', de: 'Kapitel' },
  chapters: [
    {
      id: 'start',
      title: { en: 'How it started', de: 'Wie es angefangen hat' },
      blocks: [
        p(
          'At thirteen I was ordering drone parts from China, soldering speed controllers to motors and cutting frames out of aluminium. FPV drones weren’t a thing yet. Most of mine ended up crashed somewhere in the mountains or in a park in Vienna. A GoPro on top turned the crashing into filming, and filming into photography. By sixteen I was selling landscape prints, mostly from long, cold trips through the Austrian countryside and up to the Lofoten Islands.',
          'Mit dreizehn habe ich Drohnenteile aus China bestellt, Motorregler an Motoren gelötet und Rahmen aus Aluminium gesägt. FPV-Drohnen kannte damals kaum jemand. Die meisten von meinen sind irgendwo in den Bergen oder in einem Wiener Park abgestürzt. Mit einer GoPro obendrauf wurde aus dem Abstürzen Filmen, und aus dem Filmen Fotografie. Mit sechzehn habe ich Landschaftsfotos als Drucke verkauft, meistens von langen, kalten Touren durchs österreichische Land und hinauf zu den Lofoten.',
        ),
        p(
          'My dad is an eye surgeon. He needed videos to show patients what would happen in theatre, so they’d feel calmer about it, and I started filming his operations. Standing in operating theatres with a camera is how I got curious about how hospitals work, and eventually about medicine.',
          'Mein Papa ist Augenchirurg. Er brauchte Videos, um Patient:innen zu zeigen, was im OP passiert, damit sie ruhiger hineingehen, und so habe ich angefangen, seine Operationen zu filmen. Mit der Kamera im OP zu stehen hat mich neugierig darauf gemacht, wie Spitäler funktionieren, und irgendwann auf die Medizin.',
        ),
        { kind: 'photo', photo: photos.dad },
      ],
    },
    {
      id: 'half',
      title: { en: 'Half', de: 'Halb' },
      blocks: [
        p(
          'For most of school, and the first two years of medical school, I gave about half. If it went well, I felt clever. If it didn’t, I could tell myself I hadn’t really tried. It took me a while to see that for what it was: fear of failure.',
          'Den Großteil der Schulzeit und die ersten zwei Jahre des Medizinstudiums habe ich ungefähr die Hälfte gegeben. Lief es gut, fühlte ich mich schlau. Lief es nicht, konnte ich mir sagen, dass ich es ja nicht wirklich versucht hatte. Es hat eine Weile gedauert, bis ich gesehen habe, was das war: Angst vor dem Scheitern.',
        ),
        p(
          'At the end of second year, a week and a half before an exam, I was revising neurology and found it fascinating. I also realised I had no time left to enjoy it, because I hadn’t engaged all year. The thought that stuck: what if I get to the end and I’ve half-assed the whole thing?',
          'Am Ende des zweiten Jahres, eineinhalb Wochen vor einer Prüfung, habe ich Neurologie gelernt und fand es faszinierend. Gleichzeitig war klar, dass keine Zeit mehr blieb, es zu genießen, weil ich mich das ganze Jahr nicht darauf eingelassen hatte. Der Gedanke, der hängen geblieben ist: Was, wenn ich am Ende merke, dass ich alles nur halbherzig gemacht habe?',
        ),
        p(
          'The next year I ended up in Global Health, a degree I hadn’t chosen. I gave it everything anyway, learned more than in any year before and got on well with the people teaching me. I missed a First by a couple of percent, as essays aren’t my strength. I was still alive, still me, still happy. The fear went, and it hasn’t come back. Since then the only question is where to put the hundred percent.',
          'Im Jahr darauf bin ich in Global Health gelandet, einem Studium, das ich mir nicht ausgesucht hatte. Ich habe trotzdem alles gegeben, mehr gelernt als in jedem Jahr davor und mich gut mit den Lehrenden verstanden. Die Bestnote habe ich um ein paar Prozent verpasst, Essays sind nicht meine Stärke. Ich war immer noch am Leben, immer noch ich, immer noch glücklich. Die Angst war weg und ist nicht zurückgekommen. Seitdem ist die einzige Frage, wo die hundert Prozent hingehen.',
        ),
        { kind: 'pair', photos: [photos.medSchool, photos.portico] },
      ],
    },
    {
      id: 'sundays',
      title: { en: 'Sunday mornings', de: 'Sonntagmorgen' },
      blocks: [
        p(
          'For two years in Highbury there was a run every Sunday morning, winter included. No name, usually five to eight people, and people brought people. We ran all over London and I barbecued afterwards. I can’t cook well, but I can barbecue very well.',
          'Zwei Jahre lang gab es in Highbury jeden Sonntagmorgen einen Lauf, auch im Winter. Kein Name, meistens fünf bis acht Leute, und Leute haben Leute mitgebracht. Wir sind quer durch London gelaufen, und danach habe ich gegrillt. Kochen kann ich nicht gut, grillen dafür sehr.',
        ),
        { kind: 'photo', photo: photos.nightRun },
        p(
          'A small group that meets every week gets to know each other properly, because the conversations carry on from one Sunday to the next. That’s where I got into philosophy, from talking rather than from a book. Mine is roughly Camus and *The Myth of Sisyphus*: see how absurd things are, and live fully anyway. Some of my best friends came from that run, and so did Max, a robotics engineer from ETH Zurich and now my cofounder at Eigen.',
          'Eine kleine Gruppe, die sich jede Woche trifft, lernt sich richtig kennen, weil die Gespräche von einem Sonntag zum nächsten weitergehen. Dort bin ich zur Philosophie gekommen, durchs Reden und nicht durch ein Buch. Meine ist ungefähr Camus und *Der Mythos des Sisyphos*: sehen, wie absurd vieles ist, und trotzdem voll leben. Einige meiner besten Freunde kommen aus dieser Laufgruppe, und auch Max, Robotikingenieur von der ETH Zürich und heute mein Mitgründer bei Eigen.',
        ),
      ],
    },
    {
      id: 'wards',
      title: { en: 'What I saw on the wards', de: 'Was ich auf Station gesehen habe' },
      blocks: [
        p(
          'Systems that don’t talk to each other: one program for imaging, another for notes, another for prescriptions. Typing instead of looking at the patient. And once patients go home, they are mostly on their own, worried, with exercises that most of them don’t do and many do wrong.',
          'Systeme, die nicht miteinander reden: ein Programm für die Bildgebung, eines für die Notizen, eines für Verschreibungen. Tippen, statt die Patientin anzusehen. Und sobald Patient:innen nach Hause gehen, sind sie meistens auf sich allein gestellt, besorgt, mit Übungen, die die meisten nicht machen und viele falsch.',
        ),
        p(
          'As a doctor you might make ten thousand people’s lives twenty percent better over a career. Software that makes good care easier to reach might only make things one percent better, but for ten million people. That arithmetic is why I work on software.',
          'Als Ärztin oder Arzt macht man vielleicht zehntausend Menschen das Leben über eine Karriere um zwanzig Prozent besser. Software, die gute Versorgung leichter erreichbar macht, verbessert vielleicht nur um ein Prozent, aber für zehn Millionen Menschen. Diese Rechnung ist der Grund, warum ich an Software arbeite.',
        ),
      ],
    },
    {
      id: 'bounceback',
      title: { en: 'Bounceback', de: 'Bounceback' },
      blocks: [
        p(
          'It started as video feedback on home exercises: patients film their sets, and physios answer between appointments. Most corrections repeat, so they become reusable feedback, and the system learns each physio’s corrections over time. Why make the repetitive part the biggest part of the job? It grew into the whole practice: booking straight into notes, notes written by an AI that listens in, payments, and the care between visits, all running on one phone. Physios in Austria use it, and it grows every week. [bounceback.at](https://bounceback.at/)',
          'Angefangen hat es mit Video-Feedback für Heimübungen: Patient:innen filmen ihre Sätze, Physiotherapeut:innen antworten zwischen den Terminen. Die meisten Korrekturen wiederholen sich, also werden sie zu wiederverwendbarem Feedback, und das System lernt mit der Zeit die Korrekturen jeder Therapeutin. Warum sollte der repetitive Teil der größte Teil der Arbeit sein? Daraus ist die ganze Praxis geworden: Terminbuchung direkt in die Dokumentation, Notizen, die eine KI beim Zuhören schreibt, Zahlungen und die Betreuung zwischen den Terminen, alles auf einem Handy. Physiotherapeut:innen in Österreich arbeiten damit, und es wächst jede Woche. [bounceback.at](https://bounceback.at/)',
        ),
      ],
    },
    {
      id: 'eigen',
      title: { en: 'Eigen', de: 'Eigen' },
      blocks: [
        p(
          'Max and I first built a prototype that used the iPhone’s Face ID camera to scan faces for custom CPAP masks. Patents got in the way, so the scanning moved to feet. Eigen combines a 3D foot scan with a short running video to recommend shoes that fit how someone actually runs, which also means fewer returns. [eigen-running.com](https://www.eigen-running.com)',
          'Max und ich haben zuerst einen Prototyp gebaut, der mit der Face-ID-Kamera des iPhones Gesichter für maßgefertigte CPAP-Masken scannt. Patente kamen in die Quere, also ist das Scannen zu den Füßen gewandert. Eigen kombiniert einen 3D-Fußscan mit einem kurzen Laufvideo und empfiehlt Schuhe, die dazu passen, wie jemand wirklich läuft, was auch weniger Retouren bedeutet. [eigen-running.com](https://www.eigen-running.com)',
        ),
      ],
    },
    {
      id: 'bangalore',
      title: { en: 'Bangalore', de: 'Bangalore' },
      blocks: [
        p(
          'Before an orthopaedics elective in Kuala Lumpur this year, I spent four days in two eye hospitals in Bangalore. They ran several patients in the same theatre, with very short turnarounds, about a tenth of the waste of a Western cataract theatre, and the same infection rates as in the UK. Much of the surgery was cross-subsidised for people who couldn’t pay. Some of our rules turn out to be habits rather than evidence.',
          'Vor einer Famulatur in der Orthopädie in Kuala Lumpur dieses Jahr war ich vier Tage in zwei Augenkliniken in Bangalore. Dort wurden mehrere Patient:innen im selben OP operiert, mit sehr kurzen Wechselzeiten, etwa einem Zehntel des Abfalls eines westlichen Katarakt-OPs und denselben Infektionsraten wie in Großbritannien. Ein großer Teil der Operationen war quersubventioniert für Menschen, die nicht zahlen konnten. Manche unserer Regeln sind eher Gewohnheit als Evidenz.',
        ),
        { kind: 'photo', photo: photos.theatre },
        p(
          'It changed something at Bounceback. In low- and middle-income countries, through NGOs and partners, it costs €1 per physio per month. Clinical software is usually priced for rich countries, while the places with the fewest physios need it most. If it costs us almost nothing, why gatekeep it?',
          'Das hat bei Bounceback etwas verändert. In Ländern mit niedrigem und mittlerem Einkommen kostet es über NGOs und Partner €1 pro Physiotherapeut:in und Monat. Klinische Software ist meistens für reiche Länder bepreist, während die Orte mit den wenigsten Physiotherapeut:innen sie am dringendsten brauchen. Wenn es uns fast nichts kostet, warum sollten wir es zurückhalten?',
        ),
      ],
    },
    {
      id: 'ai',
      title: { en: 'On AI', de: 'Über KI' },
      blocks: [
        p(
          'Most conversations about AI in medicine are about replacing doctors. That’s a real and complicated question, with good and bad sides, and I find it interesting. But it skips the present. In 2026, AI can already take over note-taking, summaries and simple, guideline-based reasoning. Healthcare’s problems right now are too few staff, too many patients and too much documentation, and the way processes run inside even big hospitals would shock most people.',
          'Die meisten Gespräche über KI in der Medizin drehen sich darum, Ärzt:innen zu ersetzen. Das ist eine echte und komplizierte Frage, mit guten und schlechten Seiten, und ich finde sie spannend. Aber sie überspringt die Gegenwart. 2026 kann KI schon Dokumentation, Zusammenfassungen und einfaches, leitlinienbasiertes Denken übernehmen. Die Probleme im Gesundheitswesen sind gerade zu wenig Personal, zu viele Patient:innen und zu viel Dokumentation, und wie Abläufe selbst in großen Spitälern laufen, würde die meisten schockieren.',
        ),
        p(
          'The money flows towards replacing clinicians, when making them twice as efficient is possible today. The human part of medicine will matter for a very long time, maybe always. Good AI gives it more room.',
          'Das Geld fließt ins Ersetzen von Kliniker:innen, obwohl es heute schon möglich ist, sie doppelt so effizient zu machen. Der menschliche Teil der Medizin wird sehr lange wichtig bleiben, vielleicht immer. Gute KI gibt ihm mehr Raum.',
        ),
      ],
    },
    {
      id: 'outside',
      title: { en: 'Outside', de: 'Draußen' },
      blocks: [
        p(
          `Triathlon ([Ironman Kalmar](${links.ironmanKalmar}), Ironman Tallinn), [marathons](${links.amsterdamMarathon}), ice hockey for the UCL Yetis, and ski racing as a kid: FIS races, Viennese youth champion, and now ski instructor (LS2). I dance whenever there’s music, and I film almost everything: small edits of trips and friends that we still watch years later.`,
          `Triathlon ([Ironman Kalmar](${links.ironmanKalmar}), Ironman Tallinn), [Marathons](${links.amsterdamMarathon}), Eishockey für die UCL Yetis und als Kind Skirennen: FIS-Rennen, Wiener Jugendmeister und heute Skilehrer (LS2). Ich tanze, sobald Musik läuft, und filme fast alles: kleine Edits von Reisen und Freunden, die wir uns Jahre später noch anschauen.`,
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
