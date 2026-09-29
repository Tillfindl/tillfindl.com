# Working on tillfindl.com

Till's personal website: a calm, small one-pager. Read `README.md` for the stack (Astro, static
output, GitHub Pages on the custom domain) and the layout of the repo.

## Each round

1. Start from the latest `main` (`git pull`), then branch.
2. Make the change. Keep it to what was asked; feedback on spacing means spacing, not a redesign.
3. `npm run check` and `npm run build` must both pass.
4. **Look at it** before showing it: `npm run preview`, then screenshot with Playwright at phone
   sizes (393×852 @2x, and a small phone, 331×716) and desktop (1440×900), in dark and light.
   Zoom into details (alignment, wrapping, edges that clip) and fix what you see.
5. Build the self-contained preview (`npm run preview:single`, writes `preview/`) and republish
   the preview artifact Till is watching (same link every round, never a new one unless asked).
6. Commit with a plain message (what changed and why), push, open a PR and merge it, unless Till
   says otherwise. A merge to `main` is live on tillfindl.com a minute or two later.
7. Tell Till what changed in plain terms (sections, look, feel), not in code.

## Conventions

- Static only: no server, no client framework unless a feature truly needs one. Prefer plain
  `.astro` components with scoped `<style>`; add a small `<script>` only where interaction needs it.
- All copy lives in `src/content/profile.ts`, in English and German together; never hard-code
  text in a component. The page, `/de/`, the JSON-LD and `/llms.txt` are generated from it.
- Copy rules: first person, short sentences, no em dashes, no grades or tool lists. Anything about
  Bounceback is checked against its product facts (the `the-why` skill); never claim insurance
  billing. Nothing private: no phone, address, birth date, personal email, or third parties named
  without their OK.
- A normal personal website: name, place and buttons beside a medium portrait (never
  full-bleed), then sections of cards. Facts only: no intro paragraph, no storytelling lines
  ("grew up on skis", "I like making things"), no taglines, slogans or calls to network. If a
  line describes Till's personality rather than stating a fact, cut it.
- Sports show a photo of Till doing each sport, with the details underneath; races are grouped
  by sport (triathlon, running), not listed with dates. The /llms.txt link in the footer is the
  ground colour on purpose. Words Till
  has ruled out: founder (as a label), doctor, "building". Detail belongs in `facts`.
- No race times on the site; race names link to their result pages.
- Colours, type sizes and spacing are tokens in `src/styles/global.css`. Use the tokens; a change
  to the look should be a one-number change there.
- The site works on a phone first: 16px side gutter at least, no horizontal scroll, readable
  without zooming. It respects `prefers-color-scheme` and `prefers-reduced-motion`.
- Keep it fast: no third-party trackers or scripts without asking, fonts self-hosted if added,
  images through `astro:assets`.
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
