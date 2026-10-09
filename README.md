# tillfindl.com

The personal website of Till Findl: a small one-page site built with [Astro](https://astro.build),
hosted on GitHub Pages at [tillfindl.com](https://tillfindl.com). The domain is registered on
Cloudflare.

A short personal page in English (`/`) and German (`/de/`): name, one line about what Till does,
portrait and buttons, then four plain sections (medicine, Bounceback, Eigen, sport) with photos
set into the text, and contact at the end. On a wide screen a list of the sections stays
beside the text and marks how far the reader has got. The fuller facts go to search engines
(JSON-LD) and AI assistants (`/llms.txt`, which also carries the page text), generated from the
same file.

## Working on it

Needs Node 22.12 or newer (see `.nvmrc`).

```sh
npm install
npm run dev       # local server with live reload at http://localhost:4321
npm run check     # type-check the .astro and .ts files
npm run build     # build the static site into dist/
npm run preview   # serve the built dist/ locally
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
  components/           Page (name, section list, contact), Chapter (one section's text and photos), Footer
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
  text in both languages, and place it in a section. A `photo` block that is upright hangs in the
  margin beside the paragraph before it (from a tablet up); a landscape one runs across text and
  margin. A `pair` sets two side by side, a `strip` runs a row out to the edges of the screen.
- **The look:** tokens at the top of `src/styles/global.css`.

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
