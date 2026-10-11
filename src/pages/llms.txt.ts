/*
 * /llms.txt: a plain-text summary of Till for AI assistants (the llms.txt convention).
 * The facts first, then the page's words in full, both from profile.ts.
 */
import type { APIRoute } from 'astro';
import { facts, links, page, person, SITE_URL, type Lang } from '../content/profile';
import { paragraph } from '../content/phrase';
import { plain } from '../content/rich';

/** The page's scenes as plain text: a heading each, then its words, and the personal items. */
const words = (lang: Lang) => {
  const say = (list: { t: Record<Lang, string> }[]) => plain(paragraph(list.map((p) => p.t[lang])));
  const { script, sections } = page;
  return [
    `### ${sections.medicine[lang]}`,
    '',
    say(script.medicine),
    '',
    say(script.wards),
    '',
    `### ${sections.bounceback[lang]}`,
    '',
    say(script.bounceback),
    '',
    `### ${sections.eigen[lang]}`,
    '',
    say(script.eigen),
    '',
    `### ${sections.personal[lang]}`,
    '',
    plain(paragraph([script.personal[lang]])),
    '',
    ...page.items.map((i) => `- ${i.title[lang]}: ${plain(i.text[lang])}${i.detail ? ` ${plain(i.detail[lang])}` : ''}`),
    '',
    `### ${sections.contact[lang]}`,
    '',
    plain(paragraph([script.contact[lang]])),
    '',
  ];
};

export const GET: APIRoute = () => {
  const text = [
    `# ${person.name}`,
    '',
    `> ${facts.summary.en}`,
    '',
    '## Work',
    '',
    ...facts.ventures.flatMap((v) => [`### ${v.name}: ${v.role.en}, ${v.city}, since ${v.since}`, v.url, '', v.about, '']),
    '## Background',
    '',
    ...facts.background.map((b) => `- ${b}`),
    '',
    '## Outside work',
    '',
    ...facts.outside.map((o) => `- ${o}`),
    '',
    '## Details',
    '',
    `- Based in: ${facts.place.en}`,
    `- Languages: ${facts.languages.en}`,
    `- Website: ${SITE_URL}/ (Deutsch: ${SITE_URL}/de/)`,
    ...(links.linkedin ? [`- LinkedIn: ${links.linkedin}`] : []),
    '',
    `## In his own words (from ${SITE_URL}/)`,
    '',
    page.intro.en,
    '',
    ...words('en'),
    '## Deutsch',
    '',
    `> ${facts.summary.de}`,
    '',
    page.intro.de,
    '',
    ...words('de'),
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
