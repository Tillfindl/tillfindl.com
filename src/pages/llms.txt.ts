/*
 * /llms.txt: a plain-text summary of Till for AI assistants (the llms.txt convention).
 * The page says little on purpose; this carries the fuller facts, from profile.ts.
 */
import type { APIRoute } from 'astro';
import { facts, links, page, person, SITE_URL } from '../content/profile';

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
    '## In his words',
    '',
    `${page.belief.lead.en} ${page.belief.turn.en.replaceAll('*', '')}`,
    `${page.care.title.en} ${page.care.line.en}`,
    '',
    '## Details',
    '',
    `- Based in: ${facts.place.en}`,
    `- Languages: ${facts.languages.en}`,
    `- Website: ${SITE_URL}/ (Deutsch: ${SITE_URL}/de/)`,
    ...(links.linkedin ? [`- LinkedIn: ${links.linkedin}`] : []),
    '',
    '## Deutsch',
    '',
    `> ${facts.summary.de}`,
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
