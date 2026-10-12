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
  ("it taught me"), no rhetorical questions, no story arc, no feelings narrated, no lines that
  sound like a CV or a "two truths and a lie" game, and nothing that sounds put on ("mostly out of
  curiosity"). No jokes: a dry line before Contact was tried and dropped, by Till's choice.
  Where Till has his own wording (the `till-voice` skill holds his product sentences), use it.
  When Till pushes back, change what he pointed at, proportionally; don't swing to the opposite.
- The story, in order: the opening line (Till's own wording, keep it as written); Medicine (UCL,
  the rotations, the elective); what annoyed him on every rotation, said plainly as to a friend,
  leading into Bounceback (the team in Vienna, home exercises in physio, then what Bounceback is,
  no feature list, no hardware); Eigen (the run club in Highbury, Max, the CPAP masks, the pivot,
  what Eigen does, Till's part), kept short: a line for each, explaining only what a stranger needs,
  by Till's choice; Personal; Contact. No dad, no dancing, Global Health not featured. State facts, never prove them (no test results, no counts
  as a flex). Never call Till an engineer. "Dad", not "father". German says "Physios" and
  "Patienten", no ":innen" forms. Races are named, never timed. Words Till has ruled out: founder
  (as a label), doctor (as a label for himself), "building".
- Personal is a set of `items`: a short title, one sentence on what Till likes about it, the proof
  in smaller writing where there is some (leave it out rather than list things), and its prints.
  The items zigzag down the page, words on one side and prints on the other, alternating; never a
  sideways row. No "as a kid", no age-by-age storylines.
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
  (`LAG`) and develops as it comes up; nothing drops in or is laid down. On a desktop the wards,
  Bounceback and Eigen are a sticky picture with the phrases scrolling past in the normal flow; a
  picture changes only while its phrase is being read (`data-cue` and `cue()`, a phrase's top from
  78% to 40% of the screen), never as soon as the phrase appears. On a phone only the wards drawing
  stays (see below). Both are built from the same ordered steps (`wardsSteps()`, the Eigen cues), so
  the picture always matches its phrase. Sticky, never a pin. The opening holds briefly on a desktop
  (a sticky stage, because a pin re-wraps the element and restarts its CSS animations) and not at
  all on a phone, where the first swipe simply scrolls it away. Triggers are measured again when
  the page's height really changes (`watchHeight()`), so a window resized after load never makes
  a picture change for the wrong phrase. Per-phrase `space` gives a pause
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
- On a phone the page is a zigzag going down, and nothing is cut off. Medicine and Eigen pair each
  cued phrase with its own picture just above it (`.shot`, chosen in `SHOTS`), alternately on the
  left and the right: the run club print with its lap, the workshop print, and a canvas for each of
  the dots' two stages. The wards and Bounceback are one drawing that animates as one, never a
  strip of repeated panels (Till found those popping up again and again): it scrolls in with its
  first phrase and stays near the top, and each phrase comes up with the finger and rests just
  beneath it (a sticky `.phr-in` inside its `.phr`, which is as tall as the phrase plus the stretch
  it rests for), fading as the next one closes on it, so one is read at a time and none ever
  passes under the drawing (a band the words slide under was tried and dropped). A phrase plays
  its step as it comes to rest (`restCue()`); the triggers are the `.phr` boxes, never the sticky
  part. The drawing closes in on its phone until the phone reaches a little below it
  (`--phone-fill`), where Bounceback's phrases rest lower, and the last phrase leaves with the
  drawing. Phrases are far apart (about a quarter of a screen), so they are read one at a
  time. A phrase reads as one sentence that wraps to the width (designed line breaks are for the
  desktop column), set from the left, with 20 px side margins. Reading text is at least 18 px
  (phrases about 28 to 30 px, small words 0.72 of that, scene labels 18 px), and the longest big
  word must fit an indented line in both languages; make a long German word underlined rather than
  big. The phone's screens in the drawing are written large enough to read in a close-up.
- Checks: jump to exact points (`window.__xp.scrollTo(y)`; `window.__xp.y` is where the page is)
  and capture the start, middle and end of every cue, each Medicine pair and every hand-over
  between scenes, on a phone (emulated as a touch device, so Lenis is off), a small phone, a tablet
  and a desktop, in both languages, and with reduced motion (it must read as a plain page). For
  every cued phrase, capture the moment it sits mid-screen (on a phone, for the wards and
  Bounceback, the moment it comes to rest under the drawing, and the moment before) and check the
  picture shows that phrase's step, not the next one, and that only one resting phrase can be read
  at a time.
  Measure smoothness: fling through the page with real touch events on a phone at 4× CPU
  throttling and record the frame times, long tasks and any non-passive touch or wheel listeners
  (there must be none). Run the blank-frame scan (every quarter screen, measure how much differs
  from the paper), check there is no text under 18 px, nothing past the screen edges and no
  designed line wrapping on a desktop, that every phone screen in the drawing shows and never two
  at once in one drawing, and that the photos are loaded before they scroll in on a throttled
  connection.
  Time the opening from the self-contained preview too (about two seconds, playing once).
- Comments explain intent and the non-obvious, in full sentences, British spelling. Don't narrate.
- `README.md` stays current in the same commit as the change it describes.
- `public/CNAME` must keep holding `tillfindl.com`, or the custom domain drops off on deploy.
