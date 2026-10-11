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
  Personal. Medicine names the rotations; what annoyed him on every rotation, said plainly as to a
  friend (never pitch-like), leads into Bounceback, which says the idea in one sentence, no feature
  list, no hardware (check claims against the `the-why` product facts);
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
  says the same words as the main page. Its phrases (`page.experience.script`) are the chapters'
  paragraphs split into short handwritten lines with overlay markup (`content/phrase.ts`: `^big^`,
  `_small_`, `~underlined~`, " / " for a line break); the build stops if a phrase list, markup
  stripped, no longer matches its paragraph, so change the wording in both places together. Keep
  designed lines short enough not to wrap on a desktop (check every width; on a phone a long line
  wraps into balanced halves). Only phrases, drawing labels, Polaroid captions and photo rows live
  in `page.experience`. Its look is white paper and ballpoint blue (`#2f3394`, Mynerve in capitals):
  all text is in the pen, apart from "Till Findl" and the button, and illustrations are pen drawings
  (`WardsDrawing.astro`), never pop-ups or cards. Every photo is a realistic instant print at true
  proportions that develops from dark film: Polaroid 600 (88 × 107 mm frame, 79 mm square image), or
  a wide print (108 × 86 mm, 99 × 62 mm image) for group photos marked `wide`. Never rotate photos,
  no cursor effects, no buttons or scroll hint in the hero. Captions name a place or race only when
  it is certain. Reveal text by words, letters or phrases, never by split lines.
- Motion in `/v2/`: it has to feel smooth on a phone first. Scrolling is the browser's own and is
  never taken over: no automatic moves, no snapping, no touch listeners that are not passive (Lenis
  smooths the wheel on a desktop only, `pointer: fine`). Everything moves at one speed: every
  scroll animation is `scrub: true`, with no lag, glides or ambient drift. Each scene is a sticky
  picture with its phrases scrolling past in the normal flow; a picture changes only when a phrase
  passes it (`data-cue` and `cue()`), and between scenes the pictures leave and arrive with the page.
  Sticky, never a pin (the Personal row is a sticky stage moved by its section's progress, with the
  section's extra height in `--row`); the opening holds with a sticky stage too, because a pin
  re-wraps the element and restarts its CSS animations. Nothing that moves or changes while
  scrolling may use a live SVG filter (feTurbulence, feDisplacementMap, blur), `mix-blend-mode`, or
  an animated CSS `filter`: develop a print by fading plain layers (`.chem`, `.cast`, with
  `will-change: opacity`). Canvas drawing happens only when its picture changes. Photos are fetched
  and decoded in the background after the hero, never as they scroll in. No element is driven by two
  scroll animations (use an inner wrapper, like `.phr-in` and `.ph-o`), and when two close phrases
  change the same thing (the phone's screens), the later one waits for the earlier to finish.
  Animate clip paths with explicit from and to values; don't animate x or y on an element centred
  with the CSS `translate` property, or opacity on an element with a CSS animation; animate a
  wrapper instead. Letters.astro's and phrase.ts's spans are reached only through `:global`. Pen
  strokes that draw on use `pathLength="1"` and a gap longer than the stroke. Back to top swooshes
  with a blur (along the scroll on a desktop, a plain CSS blur on a phone), never scrolling back
  through the page.
- `/v2/` on a phone: the picture is a panel in the top half (`--panel`, paper behind it, a soft
  lower edge) and the phrases come up below it and slip under that edge, so text never lies over a
  picture; the next scene's panel pushes the last one away. Prints that belong together lie on top
  of one another in the panel, each laid down with its own phrase, captions left readable. Reading
  text is at least 18 px on a phone (phrases about 26 to 28 px, small words 0.72 of that, scene
  labels 18 px), with 20 px side margins; the phone's screens in the drawing are written large
  enough to read once it has zoomed in.
- Check `/v2/` by jumping to exact points (`window.__xp.scrollTo(y)`; `window.__xp.y` is where the
  page is) and capturing the start, middle and end of every cue and every hand-over between scenes,
  on a phone (emulated as a touch device, so Lenis is off), a small phone, a tablet and a desktop,
  in both languages, and with reduced motion (it must read as a plain page). Measure smoothness:
  fling through the page with real touch events on a phone at 4× CPU throttling and record the
  frame times, long tasks and any non-passive touch or wheel listeners (there must be none). Run the
  blank-frame scan (every quarter screen, measure how much differs from the paper), check there is
  no text under 18 px and no horizontal overflow, and that the Personal row's photos are loaded
  before it moves on a throttled connection. Time the opening from the self-contained preview too
  (about two seconds, playing once). Publish it as its own preview (`node tools/preview.mjs --page
  v2`), separate from the main one.
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
