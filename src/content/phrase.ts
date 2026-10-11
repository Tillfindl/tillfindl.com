/*
 * The overlay markup of the interactive version's phrases (`page.experience.script`), turned into
 * safe HTML. On top of the chapters' [label](url) links:
 *
 *   ^words^   written big: the words that carry the phrase
 *   _words_   written small: the connecting words
 *   ~words~   underlined in pen as the phrase arrives
 *   " / "     a line break (a space either side, so the slashes in a link are never taken for one)
 *
 * `strip` gives back the plain words, so a phrase list can be checked against the paragraph it
 * stands for (`checkScript`), and the two versions of the page never say different things.
 */
import { escape } from './rich';

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const BREAK = ' / ';
const STYLE = /(\^[^^]+\^|_[^_]+_|~[^~]+~)/;
/** Stands in for a link while the rest of the markup is read, so nothing inside a link is touched. */
const HELD = /\u0000(\d+)\u0000/;

/** Swaps each link for a placeholder, returning the text and the links it held. */
function hold(text: string) {
  const links: { label: string; url: string; raw: string }[] = [];
  const t = text.replace(LINK, (raw, label: string, url: string) => {
    links.push({ label, url, raw });
    return `\u0000${links.length - 1}\u0000`;
  });
  return { t, links };
}

/** The phrase as plain words, with its links left as [label](url), the form the chapters use. */
export function strip(text: string): string {
  const { t, links } = hold(text);
  return t
    .split(BREAK)
    .join(' ')
    .replace(/[\^_~]/g, '')
    .replace(new RegExp(HELD, 'g'), (_, i: string) => links[Number(i)].raw);
}

/** Stops the build on markup that would show up as stray characters on the page. */
function validate(text: string) {
  const { t } = hold(text);
  for (const mark of ['^', '_', '~']) {
    if (t.split(mark).length % 2 === 0) throw new Error(`Unpaired "${mark}" in phrase: ${text}`);
  }
  if (t.startsWith(BREAK.trimStart()) || t.endsWith(BREAK.trimEnd())) throw new Error(`Phrase starts or ends with a line break: ${text}`);
}

/**
 * The phrase as HTML: each designed line is a span (`.ln`), set as its own block on the staged page,
 * so a line too long for a narrow screen wraps into balanced halves on its own; between the spans is
 * a space, so the plain page reads them as one sentence. With `letters`, every character is wrapped
 * in a span numbered by `--i` (words stay whole, so lines still wrap between them), so it can be
 * written one letter at a time.
 */
export function phraseHtml(text: string, { letters = false } = {}): string {
  validate(text);
  const { t, links } = hold(text);
  let n = 0;
  const words = (s: string) =>
    letters
      ? s
          .split(/( +)/)
          .map((w) => (w.trim() ? `<span class="wd">${[...w].map((c) => `<span class="ch" style="--i:${n++}">${escape(c)}</span>`).join('')}</span>` : w))
          .join('')
      : escape(s);
  const inner = (s: string) =>
    s
      .split(HELD)
      .map((part, k) => {
        if (k % 2 === 0) return words(part);
        const link = links[Number(part)];
        return `<a href="${escape(link.url)}" rel="noopener">${words(link.label)}</a>`;
      })
      .join('');
  const line = (s: string) =>
    s
      .split(STYLE)
      .map((part) => {
        if (part.startsWith('^')) return `<span class="big">${inner(part.slice(1, -1))}</span>`;
        if (part.startsWith('_')) return `<span class="sm">${inner(part.slice(1, -1))}</span>`;
        if (part.startsWith('~')) return `<span class="u">${inner(part.slice(1, -1))}<i class="u-line" aria-hidden="true"></i></span>`;
        return inner(part);
      })
      .join('');
  return t
    .split(BREAK)
    .map((s) => `<span class="ln">${line(s)}</span>`)
    .join(' ');
}

/** Stops the build if a list of phrases no longer says exactly what its paragraph says. */
export function checkScript(name: string, phrases: string[], paragraph: string) {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const said = norm(phrases.map(strip).join(' '));
  if (said !== norm(paragraph)) {
    throw new Error(`The /v2/ phrases for "${name}" no longer match their paragraph in profile.ts.\n  phrases:   ${said}\n  paragraph: ${norm(paragraph)}`);
  }
}
