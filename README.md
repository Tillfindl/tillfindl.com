# tillfindl.com

The personal website of Till Findl, built with [Astro](https://astro.build), hosted on GitHub
Pages at [tillfindl.com](https://tillfindl.com). The domain is registered on Cloudflare.

One page in English (`/`) and German (`/de/`), told as scenes you scroll through, on white paper
with everything written in ballpoint blue (Mynerve, in capitals) apart from the name and the one
button. Scrolling is the browser's own, so the page always moves exactly with the finger. The words
are short handwritten phrases with big and small words (`content/phrase.ts`). Medicine pairs each
phrase with its own print, which scrolls past beside it a little slower than the words. The other
scenes keep a picture in place that changes as each phrase passes it: on a wide screen beside the
phrases, on a phone as a panel at the top with the phrases coming up below it and slipping under
its soft edge. Every photo is a realistic instant print (`components/Polaroid.astro`) that comes out
of a pen-sketched camera or develops from dark film. The wards and Bounceback are one pen drawing
(`components/WardsDrawing.astro`): a doctor swamped by software windows, a patient who walks off,
and the phone the windows are swept into. Eigen has the run club and workshop prints and a dot
morph on a canvas, Personal a row of prints that moves sideways, and a dry line comes before
Contact. The opening plays on CSS alone, so it starts before the script arrives; after that GSAP
ScrollTrigger ties everything to the scroll position, and on a desktop Lenis smooths the mouse wheel
(it is never loaded on a touch screen). With reduced motion turned on, or without JavaScript, it
reads as a plain page made from the same phrases. The fuller facts go to search engines (JSON-LD)
and AI assistants (`/llms.txt`, which also carries the page's words), generated from the same file.

## Working on it

Needs Node 22.12 or newer (see `.nvmrc`).

```sh
npm install
npm run dev       # local server with live reload at http://localhost:4321
npm run check     # type-check the .astro and .ts files
npm run build     # build the static site into dist/
npm run preview   # serve the built dist/ locally
node tools/preview.mjs   # self-contained preview of the site, into preview/
```

## How it is laid out

```
src/
  content/profile.ts    `page`: what the page shows, in English and German: the phrases
                        (`script`), the prints and captions, the personal items, the drawings'
                        labels. `facts`: the fuller record, read only by search engines and AI
  content/phrase.ts     The phrase markup (big, small, underlined, line breaks), and `paragraph`,
                        which turns a list of phrases back into plain text
  content/rich.ts       [label](url) links, as safe HTML
  content/jsonld.ts     Structured data (schema.org Person) built from the profile
  content/images.ts     Looks up photos in src/assets/photos by file name
  pages/index.astro     "/" (English); pages/de/index.astro is "/de/" (German); both render Experience
  pages/llms.txt.ts     "/llms.txt": a plain summary for AI assistants, built from the profile
  pages/404.astro       The not-found page
  components/           Experience (the scenes), Polaroid, WardsDrawing (the pen drawing),
                        Letters (text split into letters at build time)
  scripts/              experience.ts (the motion), dots.ts (the dot morph)
  layouts/Base.astro    The HTML shell: <head>, language alternates, social card, JSON-LD
  styles/global.css     Design tokens (colour, type, spacing) and base styles
  assets/photos/        Photos; the build resizes them and strips their metadata
public/                 Copied as-is: CNAME (the custom domain), favicon, robots.txt
tools/preview.mjs       Turns the build into one self-contained file for sharing drafts
astro.config.mjs        Site URL, languages, sitemap
.github/workflows/      deploy.yml publishes main to GitHub Pages; check.yml checks pull requests
```

### Changing things

- **Words:** edit the phrases in `page.script` in `src/content/profile.ts`. The page, the German
  page, the plain page and `/llms.txt` all follow. Before adding a sentence, ask whether it could go
  in `facts` instead.
- **Photos:** drop the file into `src/assets/photos/`, add it to `photos` in the profile with alt
  text in both languages, and use it: as a Medicine phrase's `print`, in an item's `prints`, or as
  one of the Eigen prints. A caption goes in `captions`, a square crop in `CROP` in Experience.astro.
- **The look:** the page's sizes and spacing are named variables at the top of Experience.astro's
  staged styles (and again for phones); colours and the spacing scale are tokens in
  `src/styles/global.css`.

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
