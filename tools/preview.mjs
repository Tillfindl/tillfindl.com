/*
 * Turns the built site (dist/) into a self-contained preview for sharing drafts: every page with
 * its styles, script, fonts and photos inlined, so it opens anywhere, a claude.ai artifact
 * included. Run `npm run build` first.
 *
 *   node tools/preview.mjs [outDir]              → outDir/index.html (English), de.html, llms.txt
 *   node tools/preview.mjs --page v2 [outDir]    → the interactive version (/v2/), default preview-v2/
 *
 * index.html is written as a page body (no <html>/<head>) because the artifact host wraps it in
 * its own document; de.html is a full document, served as it is.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const args = process.argv.slice(2);
const pageFlag = args.indexOf('--page');
/** Which page to build: '' for the main page, or a route such as 'v2'. */
const PAGE = pageFlag >= 0 ? args.splice(pageFlag, 2)[1] : '';
const out = resolve(args[0] ?? join(DIST, '..', PAGE ? `preview-${PAGE}` : 'preview'));
/**
 * The photo width inlined for each <img>: sharp on a phone, small enough to keep the file light.
 * The interactive version shows photos full screen, so it carries bigger ones.
 */
const PHOTO_WIDTH = PAGE ? 1600 : 1080;

const mime = { woff2: 'font/woff2', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const dataUri = (path) => `data:${mime[path.split('.').pop()]};base64,${readFileSync(join(DIST, path)).toString('base64')}`;

function inline(html) {
  // Styles, with their fonts as data URIs.
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
    const css = readFileSync(join(DIST, href), 'utf8').replace(/url\((\/_astro\/[^)]+)\)/g, (_, u) => `url(${dataUri(u)})`);
    return `<style>${css}</style>`;
  });
  // The page's script (one bundled module, no imports).
  html = html.replace(/<script type="module" src="([^"]+)"><\/script>/g, (_, src) => `<script type="module">${readFileSync(join(DIST, src), 'utf8')}</script>`);
  // Photos: one variant each instead of the whole srcset.
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const set = tag.match(/srcset="([^"]+)"/)?.[1];
    let pick = tag.match(/src="([^"]+)"/)[1];
    if (set) {
      const options = set.split(',').map((s) => s.trim().split(' ')).map(([u, w]) => [u, parseInt(w)]);
      options.sort((a, b) => a[1] - b[1]);
      pick = (options.filter(([, w]) => w <= PHOTO_WIDTH).pop() ?? options[0])[0];
    }
    return tag
      .replace(/\s(srcset|sizes)="[^"]*"/g, '')
      .replace(/src="[^"]+"/, `src="${dataUri(pick)}"`)
      .replace(/\sloading="lazy"/, ' loading="eager"');
  });
  // Fonts referenced from styles Astro already inlined.
  html = html.replace(/url\((\/_astro\/[^)]+)\)/g, (_, u) => `url(${dataUri(u)})`);
  // Links between the two languages and to the summary, as files next to each other.
  const base = PAGE ? `/${PAGE}/` : '/';
  return html
    .replaceAll(`href="/de${base}"`, 'href="de.html"')
    .replaceAll(`href="${base}"`, 'href="./"')
    .replace(/href="\/llms\.txt"/g, 'href="llms.txt"')
    .replace(/href="\/favicon\.svg"/g, `href="${dataUri('/favicon.svg')}"`);
}

/** The artifact host supplies the document shell: keep the title, styles and body content. */
function asBody(html) {
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  // The artifact's name in the gallery: the site, not the page's search title.
  const styles = head.match(/<style>[\s\S]*?<\/style>/g).join('\n');
  return `<title>${PAGE ? 'Till Findl, interactive' : 'tillfindl.com'}</title>\n${styles}\n${body}\n`;
}

mkdirSync(out, { recursive: true });
const source = (lang) => join(DIST, ...(lang === 'de' ? ['de'] : []), ...(PAGE ? [PAGE] : []), 'index.html');
writeFileSync(join(out, 'index.html'), asBody(inline(readFileSync(source('en'), 'utf8'))));
writeFileSync(join(out, 'de.html'), inline(readFileSync(source('de'), 'utf8')));
writeFileSync(join(out, 'llms.txt'), readFileSync(join(DIST, 'llms.txt')));
for (const f of ['index.html', 'de.html']) console.log(`${join(out, f)}: ${(readFileSync(join(out, f)).length / 1024 / 1024).toFixed(1)} MB`);
