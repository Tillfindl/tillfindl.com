/*
 * Turns the built site (dist/) into a self-contained preview for sharing drafts: every page with
 * its styles, script, fonts and photos inlined, so it opens anywhere, a claude.ai artifact
 * included. Run `npm run build` first.
 *
 *   node tools/preview.mjs [outDir]   → outDir/index.html (English), de.html, llms.txt; default preview/
 *
 * index.html is written as a page body (no <html>/<head>) because the artifact host wraps it in
 * its own document; de.html is a full document, served as it is.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const out = resolve(process.argv[2] ?? join(DIST, '..', 'preview'));
/**
 * The photo width inlined for each <img>: the site only shows photos as Polaroid prints, never
 * wider than about 28rem, so this is sharp on a phone and keeps the file light.
 */
const PHOTO_WIDTH = 800;

const mime = { woff2: 'font/woff2', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const dataUri = (path) => `data:${mime[path.split('.').pop()]};base64,${readFileSync(join(DIST, path)).toString('base64')}`;

function inline(html) {
  // Styles, with their fonts as data URIs.
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
    const css = readFileSync(join(DIST, href), 'utf8').replace(/url\((\/_astro\/[^)]+)\)/g, (_, u) => `url(${dataUri(u)})`);
    return `<style>${css}</style>`;
  });
  // The page's script (one bundled module). Eigen's animations are a chunk it imports when the
  // scene comes near; here that chunk runs up front from its own inline module and hands over its
  // exports, and the point clouds it fetches ride along as base64 (kit/assets.ts reads them).
  html = html.replace(/<script type="module" src="([^"]+)"><\/script>/g, (_, src) => {
    let js = readFileSync(join(DIST, src), 'utf8');
    let eigen = '';
    js = js.replace(/import\(`\.\/(eigen\.[\w-]+\.js)`\)/, (_, chunk) => {
      const code = readFileSync(join(DIST, '_astro', chunk), 'utf8').replace(/export\{([^}]*)\};?\s*$/, (_, list) => {
        const pairs = list.split(',').map((e) => e.split(' as ')).map(([local, name]) => `${name ?? local}:${local}`);
        return `window.__eigenKit={${pairs.join(',')}};`;
      });
      const bins = Object.fromEntries(['face', 'cpap', 'foot', 'foot-lo', 'foot-skeleton'].map((n) => [`${n}.bin`, readFileSync(join(DIST, 'eigen', `${n}.bin`)).toString('base64')]));
      eigen = `<script>window.__EIGEN_ASSETS=${JSON.stringify(bins)};</script><script type="module">${code}</script>`;
      return 'Promise.resolve(window.__eigenKit)';
    });
    return `${eigen}<script type="module">${js}</script>`;
  });
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
  return html
    .replaceAll('href="/de/"', 'href="de.html"')
    .replaceAll('href="/"', 'href="./"')
    .replace(/href="\/llms\.txt"/g, 'href="llms.txt"')
    .replace(/href="\/favicon\.svg"/g, `href="${dataUri('/favicon.svg')}"`);
}

/** The artifact host supplies the document shell: keep the title, styles and body content. */
function asBody(html) {
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  // The artifact's name in the gallery: the site, not the page's search title.
  const styles = head.match(/<style>[\s\S]*?<\/style>/g).join('\n');
  return `<title>Till Findl, interactive</title>\n${styles}\n${body}\n`;
}

mkdirSync(out, { recursive: true });
const source = (lang) => join(DIST, ...(lang === 'de' ? ['de'] : []), 'index.html');
writeFileSync(join(out, 'index.html'), asBody(inline(readFileSync(source('en'), 'utf8'))));
writeFileSync(join(out, 'de.html'), inline(readFileSync(source('de'), 'utf8')));
writeFileSync(join(out, 'llms.txt'), readFileSync(join(DIST, 'llms.txt')));
for (const f of ['index.html', 'de.html']) console.log(`${join(out, f)}: ${(readFileSync(join(out, f)).length / 1024 / 1024).toFixed(1)} MB`);
