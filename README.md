# tillfindl.com

The personal website of Till Findl: a small one-page site built with [Astro](https://astro.build),
hosted on GitHub Pages at [tillfindl.com](https://tillfindl.com). The domain is registered on
Cloudflare.

Right now it shows a "coming soon" page while the real site is designed.

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
public/                 Copied as-is to the site root
  CNAME                 The custom domain GitHub Pages serves (tillfindl.com)
  favicon.svg
  robots.txt
src/
  pages/                One file per URL: index.astro is "/", 404.astro is the not-found page
  layouts/Base.astro    The shared HTML shell: <head>, meta tags, global styles
  components/           Pieces of the page (sections, cards, the coming-soon holder)
  styles/global.css     Design tokens (colour, type, spacing) and base styles
astro.config.mjs        Astro settings, including the site URL
.github/workflows/
  deploy.yml            Builds and publishes to GitHub Pages on every push to main
  check.yml             Type-checks and builds every pull request
```

Images that need optimising go in `src/assets/` and are imported from components; files that must
keep their exact name and URL (a CV PDF, say) go in `public/`.

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
