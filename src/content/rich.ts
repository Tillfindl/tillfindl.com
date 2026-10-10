/*
 * The little inline markup the chapters use, turned into safe HTML: [label](url) becomes an
 * underlined link, and *text* becomes italics. Everything else is escaped.
 */

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function rich(text: string): string {
  return escape(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => `<a href="${url}" rel="noopener">${label}</a>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** The same text without markup, for /llms.txt. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)').replace(/\*([^*]+)\*/g, '$1');
}
