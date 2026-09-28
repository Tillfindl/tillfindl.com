/*
 * /llms.txt: a plain-text summary of Till for AI assistants (the llms.txt convention).
 * Generated from profile.ts, in the page's own order, so it always says the same as the page.
 */
import type { APIRoute } from 'astro';
import { closing, education, links, person, SITE_URL, story, type Block, type Lang } from '../content/profile';

function block(b: Block, lang: Lang): string {
  switch (b.kind) {
    case 'story':
      return [`### ${b.title[lang]} (${b.eyebrow[lang]})`, '', ...b.body.map((p) => p[lang])].join('\n');
    case 'venture': {
      const since = lang === 'en' ? 'since' : 'seit';
      const head = `### ${b.name}: ${b.role[lang]}, ${b.city[lang]}, ${since} ${b.since}`;
      return [head, b.url, '', ...(b.line ? [b.line[lang], ''] : []), b.body.map((p) => p[lang]).join('\n\n')].join('\n');
    }
    case 'list':
      return [`### ${b.title[lang]}`, '', ...b.body.map((p) => p[lang]), '', ...b.items.map((i) => `- ${i.text[lang]}${i.href ? ` (${i.href})` : ''}`)].join('\n');
    case 'photo':
      return '';
  }
}

const storyText = (lang: Lang) =>
  story
    .map((b) => block(b, lang))
    .filter(Boolean)
    .join('\n\n');

export const GET: APIRoute = () => {
  const text = [
    `# ${person.name}`,
    '',
    `> ${person.summary.en}`,
    '',
    person.lede.en,
    '',
    '## Links',
    '',
    `- Website (English): ${SITE_URL}/`,
    `- Website (Deutsch): ${SITE_URL}/de/`,
    `- Bounceback: ${links.bounceback}`,
    `- Eigen Running: ${links.eigen}`,
    ...(links.linkedin ? [`- LinkedIn: ${links.linkedin}`] : []),
    '',
    '## Education',
    '',
    ...education.map((e) => `- ${e.degree}, ${e.name} (${e.years})`),
    '',
    '## Story',
    '',
    storyText('en'),
    '',
    closing.title.en,
    '',
    `Based in: ${person.place.en}`,
    `Languages: ${person.languages.en}`,
    '',
    '---',
    '',
    '# Deutsch',
    '',
    `> ${person.summary.de}`,
    '',
    person.lede.de,
    '',
    storyText('de'),
    '',
    closing.title.de,
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
