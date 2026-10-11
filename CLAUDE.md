# Working on tillfindl.com

Till's personal website: one page, told as scenes you scroll through, in ballpoint on white paper.
Read `README.md` for the stack (Astro, static output, GitHub Pages on the custom domain) and the
layout of the repo. There is only this interactive version; the old plain one-pager is gone, by
Till's choice, so never bring it back or keep anything in step with it.

## Each round

1. Start from the latest `main` (`git pull`), then branch.
2. Make the change. Keep it to what was asked; feedback on spacing means spacing, not a redesign.
3. `npm run check` and `npm run build` must both pass.
4. **Look at it** before showing it (see the checks below), at phone sizes (393×852 @2x, and a
   small phone, 331×716), a tablet (820×1180) and desktop (1280×800, 1440×900). Zoom into details
   (alignment, wrapping, edges that clip, prints overlapping) and fix what you see.
5. Build the self-contained preview (`npm run preview:single`, writes `preview/`) and republish
   the preview artifact Till is watching ("Till Findl, interactive", the same link every round,
   never a new one unless asked).
6. Commit with a plain message (what changed and why), push, open a PR and merge it, unless Till
   says otherwise. A merge to `main` is live on tillfindl.com a minute or two later.
7. Tell Till what changed in plain terms (scenes, look, feel), not in code.

## Conventions

- Static only: no server, no client framework. Plain `.astro` components with scoped `<style>`;
  the motion lives in `src/scripts/experience.ts`. GSAP and Lenis are bundled, never loaded from a
  CDN; no third-party trackers or scripts without asking, fonts self-hosted, images through
  `astro:assets`.
- All copy lives in `src/content/profile.ts`, in English and German together; never hard-code
  text in a component. The page's words are the phrases in `page.script` (overlay markup in
  `content/phrase.ts`: `^big^`, `_small_`, `~underlined~`, " / " for a line break); the plain page
  (no JavaScript or reduced motion), `/de/` and `/llms.txt` are made from them, the JSON-LD from
  `facts`.
- Copy rules: first person, plain sentences, no em dashes, no grades or tool lists. Anything about
  Bounceback is checked against its product facts (the `the-why` skill); never claim insurance
  billing. Nothing private: no phone, address, birth date, or third parties named without their
  OK. The one public contact is LinkedIn (`links.linkedin`); no email, by Till's choice.
- Register: understated and real, like Aimé Leon Dore. Relaxed means calm, never cheerful: no
  "fun", "hard problems", "passionate", "people first", no taglines, slogans or networking
  pitches, and none of the personal-site templates ("I thrive at the intersection of"). The work
  and the technical detail carry the weight; the words stay plain.
- Write for a stranger or an AI assistant who has never heard of Till or Bounceback: explain
  what things are, in the order they happened, and let one sentence lead into the next. Say what
  problem a thing was for (the wards' computers, home exercises in physio, CPAP masks that fit
  badly and leak, running shoes picked by brand), plainly, then what it is.
- Till's own register, not anyone else's: never imitate a reference site or author. Say what the
  thing is and the one or two details that are interesting in themselves, then stop. No lessons
  ("it taught me"), no rhetorical questions, no story arc, no feelings narrated, and no lines that
  sound like a CV or a "two truths and a lie" game. The one exception is a single dry joke just
  before Contact (`script.joke`), Till's own wish: properly funny, never "safe" or about the swim.
  Where Till has his own wording (the `till-voice` skill holds his product sentences), use it.
  When Till pushes back, change what he pointed at, proportionally; don't swing to the opposite.
- The story, in order: the opening line (Till's own wording, keep it as written); Medicine (UCL,
  the rotations, the elective); what annoyed him on every rotation, said plainly as to a friend,
  leading into Bounceback (the team in Vienna, home exercises in physio, then what Bounceback is,
  no feature list, no hardware); Eigen (side projects in London, the Highbury run club, Max, the
  CPAP masks, the pivot, what Eigen does, Till's part); Personal; the joke; Contact. No dad, no
  dancing, Global Health not featured. State facts, never prove them (no test results, no counts
  as a flex). Never call Till an engineer. "Dad", not "father". German says "Physios" and
  "Patienten", no ":innen" forms. Races are named, never timed. Words Till has ruled out: founder
  (as a label), doctor (as a label for himself), "building".
- Personal is a set of `items`: a short title, one sentence on what Till likes about it, the proof
  in smaller writing where there is some (leave it out rather than list things), and a row of
  prints. No "as a kid", no age-by-age storylines.
- The look is white paper and ballpoint blue (`#2f3394`, Mynerve in capitals): all text is in the
  pen apart from "Till Findl" and the button, and illustrations are pen drawings
  (`WardsDrawing.astro`), never pop-ups or cards. Every photo is a realistic instant print at true
  proportions that develops from dark film: Polaroid 600 (88 × 107 mm frame, 79 mm square image),
  or a wide print (108 × 86 mm, 99 × 62 mm image) for group photos marked `wide`. Each print is its
  own stacking context (`isolation: isolate`), so its film layers never show through a print laid
  over it. Never rotate photos, no cursor effects, no buttons or scroll hint in the hero. Captions
  name a place or race only when it is certain. Reveal text by words, letters or phrases, never by
  split lines. Keep designed lines short enough not to wrap on a desktop at any width (900 px up).
- Motion: it has to feel smooth on a phone first. Scrolling is the browser's own and is never taken
  over: no automatic moves, no snapping, no touch listeners that are not passive (Lenis smooths the
  wheel on a desktop only, `pointer: fine`). Every scroll animation is `scrub: true`, with no lag.
  Medicine pairs each phrase with its own print, which scrolls with its phrase a little slower
  (`LAG`) and develops as it comes up; nothing drops in or is laid down. The other scenes are a
  sticky picture with the phrases scrolling past in the normal flow; a picture changes only when a
  phrase passes it (`data-cue` and `cue()`), and between scenes the pictures leave and arrive with
  the page. Sticky, never a pin (the Personal row is a sticky stage moved by its section's
  progress, with the section's extra height in `--row`). The opening holds briefly on a desktop
  (a sticky stage, because a pin re-wraps the element and restarts its CSS animations) and not at
  all on a phone, where the first swipe simply scrolls it away. Per-phrase `space` gives a pause
  (`more`) or keeps a phrase with the next (`less`). Nothing that moves or changes while scrolling
  may use a live SVG filter, `mix-blend-mode` or an animated CSS `filter`: develop a print by
  fading plain layers (`.chem`, `.cast`, with `will-change: opacity`). Canvas drawing happens only
  when its picture changes. Photos are fetched and decoded in the background after the hero. No
  element is driven by two scroll animations (use an inner wrapper, like `.phr-in`, `.pp-in` and
  `.ph-o`), and when two close phrases change the same thing (the phone's screens), the later one
  waits for the earlier to finish. Animate clip paths with explicit from and to values; don't
  animate x or y on an element centred with the CSS `translate` property, or opacity on an element
  with a CSS animation. Letters.astro's and phrase.ts's spans are reached only through `:global`.
  Pen strokes that draw on use `pathLength="1"` and a gap longer than the stroke. Back to top
  swooshes with a blur (along the scroll on a desktop, a plain CSS blur on a phone).
- On a phone: the sticky picture is a panel of 42% of the screen at the top (paper behind it, a
  short soft edge that is solid for its first quarter), so the words get more than half the
  screen, and they start just under it; text never lies over a picture. A phrase reads as one
  sentence that wraps to the width (designed line breaks are for the desktop column), set from the
  left, with 20 px side margins. Reading text is at least 18 px (phrases about 28 to 30 px, small
  words 0.72 of that, scene labels 18 px), and the longest big word must fit an indented line in
  both languages; make a long German word underlined rather than big. The phone's screens in the
  drawing are written large enough to read once it has zoomed in.
- Checks: jump to exact points (`window.__xp.scrollTo(y)`; `window.__xp.y` is where the page is)
  and capture the start, middle and end of every cue, each Medicine pair and every hand-over
  between scenes, on a phone (emulated as a touch device, so Lenis is off), a small phone, a tablet
  and a desktop, in both languages, and with reduced motion (it must read as a plain page).
  Measure smoothness: fling through the page with real touch events on a phone at 4× CPU
  throttling and record the frame times, long tasks and any non-passive touch or wheel listeners
  (there must be none). Run the blank-frame scan (every quarter screen, measure how much differs
  from the paper), check there is no text under 18 px, nothing past the screen edges and no
  designed line wrapping on a desktop, that every phone screen in the drawing shows and never two
  at once, and that the photos are loaded before the Personal row moves on a throttled connection.
  Time the opening from the self-contained preview too (about two seconds, playing once).
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
