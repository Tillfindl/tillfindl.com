# tillfindl.com

The personal website of Till Findl: a small one-page site built with [Astro](https://astro.build),
hosted on GitHub Pages at [tillfindl.com](https://tillfindl.com). The domain is registered on
Cloudflare.

A short personal page in English (`/`) and German (`/de/`): name, one line about what Till does,
portrait and buttons, then three plain sections (medicine, Bounceback, Eigen) with photos set into
the text, a personal section of interests with a photo each, and contact at the end, on warm
off-white paper. Each section is a small
label beside a reading column, so the whole page shares two edges. The fuller facts go to search engines
(JSON-LD) and AI assistants (`/llms.txt`, which also carries the page text), generated from the
same file.

### The interactive version

`/v2/` (and `/de/v2/`) is a second, interactive version of the same page to compare against: the
same words and photos staged as full-screen scenes that play as you scroll (smooth scrolling with
Lenis, scenes pinned and scrubbed with GSAP ScrollTrigger, a dot morph on a canvas, a stack of
prints to throw through). It is kept out of search results (`noindex`, not in the sitemap). With
reduced motion turned on, or without JavaScript, it reads as a plain page.

## Working on it

Needs Node 22.12 or newer (see `.nvmrc`).

```sh
npm install
npm run dev       # local server with live reload at http://localhost:4321
npm run check     # type-check the .astro and .ts files
npm run build     # build the static site into dist/
npm run preview   # serve the built dist/ locally
node tools/preview.mjs             # self-contained preview of the main page, into preview/
node tools/preview.mjs --page v2   # the same for the interactive version, into preview-v2/
```

## How it is laid out

```
src/
  content/profile.ts    `page`: the sections the page shows (paragraphs and photos),
                        in English and German. `facts`: the fuller record, read only by search
                        engines and AI assistants
  content/rich.ts       The small markup paragraphs may use: [label](url) links and *italics*
  content/jsonld.ts     Structured data (schema.org Person) built from the profile
  content/images.ts     Looks up photos in src/assets/photos by file name
  pages/index.astro     "/" (English); pages/de/index.astro is "/de/" (German); both render Page
  pages/llms.txt.ts     "/llms.txt": a plain summary for AI assistants, built from the profile
  pages/404.astro       The not-found page
  components/           Page (intro and contact), Chapter (one section's label, text and photos), Footer
  components/v2/        Experience: the interactive version's scenes (pages/v2, pages/de/v2)
  scripts/              experience.ts (the interactive version's motion), dots.ts (its dot morph)
  layouts/Base.astro    The HTML shell: <head>, language alternates, social card, JSON-LD
  styles/global.css     Design tokens (colour, type, spacing) and base styles
  assets/photos/        Photos; the build resizes them and strips their metadata
public/                 Copied as-is: CNAME (the custom domain), favicon, robots.txt
astro.config.mjs        Site URL, languages, sitemap
.github/workflows/      deploy.yml publishes main to GitHub Pages; check.yml checks pull requests
```

### Changing things

- **Words:** edit `src/content/profile.ts`. The page, the German page, the structured data and
  `/llms.txt` all follow. Before adding a sentence to the page, ask whether it could go in `facts`.
- **Photos:** drop the file into `src/assets/photos/`, add it to `photos` in the profile with alt
  text in both languages, and place it in a section. A landscape `photo` fills the text column,
  an upright one takes half of it, and a `pair` sets two halves side by side. In the personal
  section, each of the `items` has its own photo, title and line.
- **The look:** colours, type sizes, the 8px spacing scale and the column widths are tokens at
  the top of `src/styles/global.css`.

Keep private details out of the repo: no phone number, home address, birth date or personal email.

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages. Nothing else to run.

### One-time setup

1. **GitHub Pages.** In the repo, Settings → Pages → Build and deployment → Source:
   **GitHub Actions**. Under Custom domain enter `tillfindl.com` and save. Once the certificate is
   issued (can take up to an hour or so), tick **Enforce HTTPS**.
2. **Cloudflare DNS** for `tillfindl.com`, with the proxy **off** (grey cloud, "DNS only"), so
   GitHub can issue the HTTPS certificate:

   | Type  | Name  | Content                 |
   | ----- | ----- | ----------------------- |
   | A     | `@`   | `185.199.108.153`       |
   | A     | `@`   | `185.199.109.153`       |
   | A     | `@`   | `185.199.110.153`       |
   | A     | `@`   | `185.199.111.153`       |
   | AAAA  | `@`   | `2606:50c0:8000::153`   |
   | AAAA  | `@`   | `2606:50c0:8001::153`   |
   | AAAA  | `@`   | `2606:50c0:8002::153`   |
   | AAAA  | `@`   | `2606:50c0:8003::153`   |
   | CNAME | `www` | `tillfindl.github.io`   |

   GitHub then redirects `www.tillfindl.com` to `tillfindl.com` on its own.
3. **Optional, recommended:** verify the domain for your GitHub account (GitHub → Settings → Pages →
   Add a domain), which adds a TXT record in Cloudflare and stops anyone else claiming the domain
   on GitHub Pages.
