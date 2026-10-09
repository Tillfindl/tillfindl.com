# Working on tillfindl.com

Till's personal website: a calm one-pager to read. Read `README.md` for the stack (Astro, static
output, GitHub Pages on the custom domain) and the layout of the repo.

## Each round

1. Start from the latest `main` (`git pull`), then branch.
2. Make the change. Keep it to what was asked; feedback on spacing means spacing, not a redesign.
3. `npm run check` and `npm run build` must both pass.
4. **Look at it** before showing it: `npm run preview`, then screenshot with Playwright at phone
   sizes (393×852 @2x, and a small phone, 331×716), a tablet (820×1180) and desktop (1280×800,
   1440×900). Photos fade in as they come into view, so scroll through before capturing, and
   capture the viewport at each chapter (full-page captures of a page this long come out
   garbled). Zoom into details (alignment, wrapping, edges that clip) and fix what you see.
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
- Copy rules: first person, plain sentences, no em dashes, no grades or tool lists. Anything about
  Bounceback is checked against its product facts (the `the-why` skill); never claim insurance
  billing. Nothing private: no phone, address, birth date, or third parties named without their
  OK. The one public contact is LinkedIn (`links.linkedin`); no email, by Till's choice.
- Register: understated and real, like Aimé Leon Dore. Relaxed means calm, never cheerful: no
  "fun", "hard problems", "passionate", "people first", no taglines, slogans or networking
  pitches, and none of the personal-site templates ("I thrive at the intersection of"). The work
  and the technical detail carry the weight; the words stay plain.
- Write for a stranger or an AI assistant who has never heard of Till or Bounceback: explain
  what things are, in the order they happened, and let one sentence lead into the next.
- The page is read, not scanned: short chapters in the spirit of Alain de Botton, observational
  and plain, told through what Till saw and did, one thought leading into the next. Keep Till's
  own words and phrases where he gives them. State facts, never prove them (no test results, no
  "lab-level", no counts as a flex). No company names in the intro. Never call Till an engineer.
  "Dad", not "father". If a line describes Till's personality rather than showing it, cut it.
- A personal page, not a CV or a keynote: name, place and buttons beside a medium portrait
  (never full-bleed), then the chapters, with the chapter list beside them on a wide screen. No
  cards: experiences, schooling and hobbies are told in the text, and the detail that does not
  fit goes in `facts`. Leave out tools, placements and dates wherever they are not needed.
- Photos sit inside the chapters with no visible captions; the alt text is for screen readers
  and search engines only. Upright photos hang in the margin, landscape ones run across, and the
  sport photos close the last chapter as a strip (see `Chapter.astro`).
- Races are named in the text, not listed with dates, and link to their result pages; no race
  times. The /llms.txt link in the footer is the ground colour on purpose. Words Till has ruled
  out: founder (as a label), doctor (as a label for himself), "building".
- Colours, type sizes and spacing are tokens in `src/styles/global.css`. Use the tokens; a change
  to the look should be a one-number change there.
- The site works on a phone first: 16px side gutter at least, no horizontal page scroll (the
  photo strip may scroll sideways on its own), readable without zooming. Dark only. It respects
  `prefers-reduced-motion`: the lights stand still and photos show without fading in.
- Keep it fast: no third-party trackers or scripts without asking, fonts self-hosted if added,
  images through `astro:assets`.
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
