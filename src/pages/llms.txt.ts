/*
 * /llms.txt: a plain-text summary of Till for AI assistants (the llms.txt convention).
 * The facts first, then the page's chapters in full, both from profile.ts.
 */
import type { APIRoute } from 'astro';
import { facts, links, page, person, SITE_URL, type Lang } from '../content/profile';
import { plain } from '../content/rich';

/** The page's sections as plain text: a heading each, then its paragraphs and items. Photos are left out. */
const chapters = (lang: Lang) =>
  page.chapters.flatMap((c) => [
    `### ${c.title[lang]}`,
    '',
    ...c.blocks.flatMap((b) => {
      if (b.kind === 'p') return [plain(b.text[lang]), ''];
      if (b.kind === 'items') return [...b.items.map((i) => `- ${i.title[lang]}: ${plain(i.text[lang])} ${plain(i.detail[lang])}`), ''];
      return [];
    }),
  ]);

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
    ...chapters('en'),
    '## Deutsch',
    '',
    `> ${facts.summary.de}`,
    '',
    page.intro.de,
    '',
    ...chapters('de'),
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
