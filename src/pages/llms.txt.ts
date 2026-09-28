/*
 * /llms.txt: a plain-text summary of Till for AI assistants (the llms.txt convention).
 * Generated from profile.ts so it always says the same as the page.
 */
import type { APIRoute } from 'astro';
import { bounceback, education, eigen, links, medicine, outside, person, principles, SITE_URL, type Lang } from '../content/profile';

const section = (lang: Lang) => {
  const venture = (v: typeof bounceback) =>
    [`### ${v.name}: ${v.role[lang]}, ${v.city[lang]}, ${lang === 'en' ? 'since' : 'seit'} ${v.since}`, v.url, '', ...(v.line ? [v.line[lang], ''] : []), v.body.map((p) => p[lang]).join('\n\n')].join('\n');

  return [
    `## ${lang === 'en' ? 'Work' : 'Arbeit'}`,
    '',
    venture(bounceback),
    '',
    venture(eigen),
    '',
    `## ${medicine.title[lang]}`,
    '',
    medicine.body.map((p) => p[lang]).join('\n\n'),
    '',
    `## ${principles.label[lang]}`,
    '',
    ...principles.items.map((i) => `- ${i.title[lang]}: ${i.body[lang]}`),
    '',
    `## ${outside.label[lang]}`,
    '',
    ...outside.facts.map((f) => `- ${f[lang]}`),
    '',
    `${lang === 'en' ? 'Based in' : 'Zuhause in'}: ${person.place[lang]}`,
    `${lang === 'en' ? 'Languages' : 'Sprachen'}: ${person.languages[lang]}`,
  ].join('\n');
};

export const GET: APIRoute = () => {
  const text = [
    `# ${person.name}`,
    '',
    `> ${person.summary.en}`,
    '',
    `${person.lede.en}`,
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
    section('en'),
    '',
    '---',
    '',
    '# Deutsch',
    '',
    `> ${person.summary.de}`,
    '',
    section('de'),
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
