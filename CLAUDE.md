# Working on tillfindl.com

Till's personal website: a calm, short one-pager. Read `README.md` for the stack (Astro, static
output, GitHub Pages on the custom domain) and the layout of the repo.

## Each round

1. Start from the latest `main` (`git pull`), then branch.
2. Make the change. Keep it to what was asked; feedback on spacing means spacing, not a redesign.
3. `npm run check` and `npm run build` must both pass.
4. **Look at it** before showing it: `npm run preview`, then screenshot with Playwright at phone
   sizes (393×852 @2x, and a small phone, 331×716), a tablet (820×1180) and desktop (1280×800,
   1440×900). Photos fade in as they come into view, so scroll through before capturing, and
   capture the viewport at each section (full-page captures of long pages can come out
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
- Till's own register, not anyone else's: never imitate a reference site or author (Max's site,
  Alain de Botton). Say what the thing is and the one or two details that are interesting in
  themselves, then stop. No lessons ("it taught me"), no rhetorical questions, no closing
  one-liners, no story arc, no feelings narrated. Don't stack short feature sentences either;
  let one sentence lead into the next. Plain section titles (Bounceback, Medicine). Where Till
  has his own wording for something (the `till-voice` skill holds his product sentences), use it.
  When Till pushes back, change what he pointed at, proportionally; don't swing to the opposite.
- Professional, with the why: the line under the name is Till's own wording, so keep it as
  written. Then Medicine (UCL on its own line, the elective separate), Bounceback, Eigen and
  Personal. Medicine names the rotations; what he kept noticing across them leads into
  Bounceback, which leads with remote rehab (check claims against the `the-why` product facts);
  the Highbury run club leads to Max, the CPAP masks (quick iterations), the pivot and Eigen. Storytelling is fine only while the reader doesn't notice it: no
  "that's where I met", no set-ups and pay-offs. No dad, no dancing, Global Health not featured. State facts, never prove them (no test results, no "lab-level", no
  counts as a flex). Never call Till an engineer. "Dad", not "father". German says
  "Physios" and "Patienten", no ":innen" forms.
- A personal page, not a CV or a keynote: portrait, name, one line and buttons, then short
  sections and contact. About 250 words in all. No cards: experiences, schooling and hobbies are told in the text, and the
  detail that does not fit goes in `facts`. Leave out tools, placements and dates wherever they
  are not needed.
- The look is warm paper: off-white ground, near-black ink, grey labels, hairlines. No lights,
  glow or animation; the photos carry the colour.
- Layout, as a professional designer would set it: every part of the page is a `.row` (a small
  grey label column and a 36rem text column, about 65 characters a line), so everything shares
  two edges. Every gap comes from the 8px spacing scale in `global.css`, and gaps inside a group
  stay at most a third of the gap between sections (label to text 8px, paragraphs 16px, photos
  32px, sections 96px, 64px on a phone). Below 52rem it is one centred reading column.
- Photos sit inside the sections with no visible captions; the alt text is for screen readers
  and search engines only. Two sizes only: landscape fills the text column, upright and pairs
  take half each. Personal is a set of `items` (sports and interests one by one), each with its
  photo, a short title, one sentence on what Till loves about it, then the proof of level in
  grey, two to a row (see `Chapter.astro`). No "as a kid", no age-by-age storylines. One small
  corner radius.
- Each section leads into the next (the wards into "So … I built Bounceback", "Alongside
  Bounceback there's Eigen", "Outside work …"), and contact closes the page. Links are underlined
  text, never arrows. Name technology generically ("a 3D face scan on a phone", never "Face ID").
- Races are named in the text, not listed with dates, and link to their result pages; no race
  times. The /llms.txt link in the footer is the ground colour on purpose. Words Till has ruled
  out: founder (as a label), doctor (as a label for himself), "building".
- Colours, type sizes and spacing are tokens in `src/styles/global.css`. Use the tokens; a change
  to the look should be a one-number change there.
- The site works on a phone first: 24px side margins, no horizontal scroll, readable without
  zooming. Light only, and nothing moves.
- Keep it fast: no third-party trackers or scripts without asking, fonts self-hosted if added,
  images through `astro:assets`. The main page has no script libraries; GSAP and Lenis are
  bundled for the interactive version (`/v2/`) only, never loaded from a CDN.
- The interactive version (`/v2/`, `components/v2/Experience.astro`, `scripts/experience.ts`)
  uses the same words from `profile.ts`; only its drawing labels, Polaroid captions and photo rows
  live in `page.experience`. Its look is white paper and ballpoint blue (`#2f3394`, Mynerve in
  capitals): all text is in the pen, apart from "Till Findl" and the button, and illustrations are
  pen drawings (`WardsDrawing.astro`), never pop-ups or cards. Every photo is a realistic Polaroid
  600 print at true proportions (88 × 107 mm frame, 79 mm square image) that develops from dark
  film. Never rotate photos, no cursor effects, no buttons in the hero. Captions name a place only
  when it is certain. Reveal text by words or letters, never by lines (split lines break oddly when
  the width changes).
- Motion in `/v2/`: every scene is scrubbed by the scroll, so scrolling back reverses it. No blank
  screens: nothing fades out at the end of a pin, and on desktop content glides in early and out
  late (`GLIDE`). The opening plays on CSS so it starts before the script; it holds with a sticky
  stage, not a pin, because a pin re-wraps the element and restarts its CSS animations. Animate
  clip paths with explicit from and to values; don't animate x or y on an element centred with the
  CSS `translate` property (GSAP takes it over), and don't animate opacity on an element with a CSS
  animation (its fill wins); animate a wrapper instead. Letters.astro's spans are another
  component's, so styles reach them only through `:global`. Pen strokes that draw on use
  `pathLength="1"` and a gap longer than the stroke, so no round cap leaves a dot at the end.
- Check `/v2/` by jumping to exact points inside each pinned scene
  (`window.__xp.lenis.scrollTo(y, { immediate: true })`) and capturing several moments of every
  transition, on a phone, a small phone and a desktop, in both languages, and with reduced motion
  (it must read as a plain page). Scan for blank frames: step every quarter screen through the page
  and measure how much of each frame differs from the paper; look at the emptiest ones. Time the
  opening from the self-contained preview too (it should settle in about two seconds and play only
  once). Publish it as its own preview (`node tools/preview.mjs --page v2`), separate from the main one.
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
