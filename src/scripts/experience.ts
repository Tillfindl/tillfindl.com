/*
 * The interactive version's motion. Smooth scrolling (Lenis) drives GSAP ScrollTrigger timelines.
 * Most scenes have two: an entrance, scrubbed while the scene scrolls into view so its content is
 * already arriving before it fills the screen, and a pinned timeline that plays the scene itself.
 * Both are scrubbed, so scrolling back plays them in reverse. Nothing fades out at the end of a pin:
 * each scene scrolls away whole while the next one arrives, so no screen is ever blank. The hero
 * plays on CSS (Experience.astro) and needs nothing from here until you scroll. Nothing is rotated.
 * With reduced motion nothing here runs and the page reads as a plain page.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** How long each pinned scene lasts, in screen heights of scrolling. The opening's hold is set in CSS (--hold). */
const LENGTH = { medicine: 2, care: 4, eigen: 3.5 };
/** A scene's entrance starts when its top is this far down the screen, and ends as its pin begins. */
const ENTER = 'top 90%';
/**
 * While a scene scrolls in or out, its content lags the scroll by these fractions of the distance,
 * so it arrives early and leaves late and there is never an empty screen between scenes. Leaving
 * glides less, so a scene has gone by the time the next one pins. None on a phone, where the scenes
 * fill the whole screen and would overlap.
 */
const GLIDE = { desktop: { in: 0.5, out: 0.25 }, mobile: { in: 0, out: 0 } };
/** How far the drawing zooms in on the phone once the windows are in it, so its screens can be read. */
const PHONE_ZOOM = { desktop: 1.2, mobile: 1.7 };
/** How far the scrubbed animation lags behind the scroll, in seconds; the lag is what makes it feel smooth. */
const SCRUB = 1;
/** How faint the wards sentence is before it is read: the pen line, barely there. */
const UNREAD = 0.22;
/** The ballpoint blue, as RGB for the dots' canvas. */
const PEN_RGB = '47 51 148';
/**
 * The film's finished look and the flat, dark picture it develops from. Both use the same filter
 * functions in the same order, so GSAP can blend between them.
 */
const FILM = 'contrast(1.04) saturate(0.8) sepia(0.14) brightness(1.03)';
const RAW = 'contrast(0.5) saturate(0) sepia(0) brightness(0.55)';

/* Points in the wards drawing (WardsDrawing.astro), in its 560 × 520 units. */
/** Where the windows are swept to: the middle of the phone. */
const PHONE_CENTRE = { x: 280, y: 256 };
/** The connection's two ends: the doctor's side and the patient's. */
const LINK_FROM = { x: 236, y: 318 };
const LINK_TO = { x: 334, y: 318 };
/** How high the connection arches between them. */
const LINK_ARCH = 22;
/** The patient's feet, which stay on the ground as they walk off into the distance. */
const FEET = { x: 380, y: 466 };
/** Where the patient ends up, and how small they are by then. */
const WALK = { x: 130, y: -40, scale: 0.55 };
/**
 * The pen line as one stroke, then broken in the middle (dash, gap, dash, then nothing). The final
 * gap is longer than the line, so no dash starts at its end, where a round cap would leave a dot.
 */
const WHOLE = '0.5 0 0.5 2';
const BROKEN = '0.3 0.4 0.3 2';

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

/** The current layout's glide (see GLIDE). */
let glide = GLIDE.desktop;

function start() {
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // For checking the scenes in screenshots: jump anywhere without the smoothing.
  Object.assign(window, { __xp: { lenis, gsap, ScrollTrigger } });

  for (const a of $$<HTMLAnchorElement>('a[href="#top"]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo(0, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    });
  }

  const dots = new Dots($<HTMLCanvasElement>('.dots'), window.innerWidth < 832 ? 900 : 1500, PEN_RGB);

  // The scenes differ a little between phone and desktop, so they are rebuilt when the layout
  // changes. All of them are made here, in page order, so each pin is measured after the ones above it.
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 52rem)', mobile: '(max-width: 51.99rem)' }, (ctx) => {
    const desktop = !!ctx.conditions?.desktop;
    glide = desktop ? GLIDE.desktop : GLIDE.mobile;
    opening(desktop);
    medicine();
    care(desktop);
    eigen(dots);
    personal();
    ending();
    chrome();
  });

  window.addEventListener('resize', () => dots.resize());
  // The handwriting font changes how tall the text is, so measure again once it has arrived.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- Building blocks ---------- */

/** What moves when a scene glides in or out: everything in it. */
const content = (scene: Element) => $(':scope > .stage, :scope > .row-stage, :scope > .end-inner', scene);

/**
 * A timeline scrubbed while `scene` scrolls into view, ending as its pin begins. Its content glides
 * in, by `share` of the usual amount.
 */
const entrance = (scene: Element, share = 1) =>
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: ENTER, end: 'top top', scrub: SCRUB, invalidateOnRefresh: true } })
    .fromTo(content(scene), { y: () => -glide.in * share * 0.9 * window.innerHeight }, { y: 0, duration: 1 }, 0);

/**
 * Once `scene`'s pin is over, its content glides out more slowly than the page scrolls. It moves by
 * yPercent, so it never contends with the entrance, which moves the same element by y.
 */
function exit(scene: Element) {
  const spacer = scene.parentElement?.classList.contains('pin-spacer') ? scene.parentElement : scene;
  gsap.fromTo(
    content(scene),
    { yPercent: 0 },
    { yPercent: () => glide.out * 100, ease: 'none', immediateRender: false, scrollTrigger: { trigger: spacer, start: 'bottom bottom', end: 'bottom top', scrub: SCRUB, invalidateOnRefresh: true } },
  );
}

/**
 * A timeline that pins `scene` for `length` screen heights, scrubbed by the scroll. It lasts exactly
 * 1, so a position in it is the fraction of the pin where that moment happens.
 */
const pinned = (scene: Element, length: number, extra: ScrollTrigger.Vars = {}) =>
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: scene, start: 'top top', end: `+=${length * 100}%`, pin: true, scrub: SCRUB, ...extra },
    })
    .set({}, {}, 1);

/** Splits running text into words for a reveal. Words, not lines: lines would be fixed at the width they were split at. */
const words = (target: string | Element) => SplitText.create(target, { type: 'words' }).words;

/** Splits a heading into letters, keeping words whole so lines still wrap between them. */
const letters = (target: Element) => SplitText.create(target, { type: 'words,chars' }).chars;

/** Brings words in one after another between `at` and `at + dur`. */
function reveal(tl: gsap.core.Timeline, w: Element[], at: number, dur: number) {
  if (!w.length) return;
  tl.from(w, { opacity: 0, y: '0.35em', duration: dur * 0.3, stagger: (dur * 0.7) / w.length, ease: 'power2.out' }, at);
}

/** Writes letters between `at` and `at + dur`, one after another, as a pen would. */
function write(tl: gsap.core.Timeline, chars: Element[], at: number, dur: number) {
  if (!chars.length) return;
  const step = dur / (chars.length + 1);
  tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: step * 2, stagger: step, ease: 'none' }, at);
}

/**
 * Develops a Polaroid over `dur`: the dark film clears, the picture comes through flat and cool,
 * then its colour and contrast arrive. Returns a timeline to add to a scene.
 */
function develop(pola: Element, dur: number) {
  return gsap
    .timeline()
    .fromTo($('.chem', pola), { opacity: 1 }, { opacity: 0, duration: dur * 0.8, ease: 'power2.in' }, 0)
    .fromTo($('img', pola), { filter: RAW }, { filter: FILM, duration: dur, ease: 'power1.inOut' }, 0)
    .fromTo($('.cast', pola), { opacity: 0 }, { opacity: 0.5, duration: dur * 0.4, ease: 'sine.out' }, dur * 0.1)
    .to($('.cast', pola), { opacity: 0, duration: dur * 0.5, ease: 'sine.inOut' }, dur * 0.5);
}

/**
 * Readies pen strokes (pathLength 1) to be drawn on, and hides what they will fill with paper. The
 * gap is twice the stroke, so no dash starts at its end, where a round cap would leave a dot.
 */
function undrawn(strokes: Element[]) {
  gsap.set(strokes, { attr: { 'stroke-dasharray': '1 2', 'stroke-dashoffset': 1 } });
  gsap.set(
    strokes.filter((s) => s.classList.contains('paper')),
    { fillOpacity: 0 },
  );
}

/** Draws pen strokes on between `at` and `at + dur`, filling their paper as each one closes. */
function drawOn(tl: gsap.core.Timeline, strokes: Element[], at: number, dur: number) {
  if (!strokes.length) return;
  const each = Math.min(dur, (dur * 2) / (strokes.length + 1));
  const stagger = strokes.length > 1 ? (dur - each) / (strokes.length - 1) : 0;
  strokes.forEach((s, i) => {
    tl.to(s, { attr: { 'stroke-dashoffset': 0 }, duration: each, ease: 'power1.inOut' }, at + i * stagger);
    if (s.classList.contains('paper')) tl.to(s, { fillOpacity: 1, duration: each * 0.6 }, at + i * stagger + each * 0.4);
  });
}

/* ---------- Around every scene ---------- */

/** The progress line along the top, the scene name in the corner, and the name in the corner once the opening has gone. */
function chrome() {
  const bar = $('.progress');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    refreshPriority: -2,
    onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
  });
  const name = $('.scene-name');
  for (const scene of $$('[data-scene]')) {
    // A pinned scene lasts as long as its pin spacer, not just its own screen height.
    const spacer = scene.parentElement?.classList.contains('pin-spacer') ? scene.parentElement : scene;
    ScrollTrigger.create({
      trigger: spacer,
      start: 'top 55%',
      end: 'bottom 55%',
      refreshPriority: -2,
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.fromTo(name, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
        name.textContent = scene.dataset.scene ?? '';
      },
    });
  }
  const hudName = $('.hud-name');
  gsap.set(hudName, { autoAlpha: 0 });
  ScrollTrigger.create({
    start: () => window.innerHeight * 0.5,
    refreshPriority: -2,
    onEnter: () => gsap.to(hudName, { autoAlpha: 1, duration: 0.4 }),
    onLeaveBack: () => gsap.to(hudName, { autoAlpha: 0, duration: 0.3 }),
  });
}

/* ---------- The scenes ---------- */

/**
 * 1. The opening plays on CSS. Scrolling only clears it: the notes drift apart and fade, and the
 * print steps back. The elements with CSS animations (the letters, the logo, the hint, the print)
 * are left alone, because an animation's fill would override what GSAP writes; their wrappers move.
 * It holds still with CSS (a sticky stage) rather than a pin: a pin wraps the scene in a new element,
 * and moving it restarts its CSS animations, so on a slow load the print would come out twice.
 */
function opening(desktop: boolean) {
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.opening', start: 'top top', end: 'bottom bottom', scrub: SCRUB } })
    .fromTo('.o-pen-a p', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '-4vw' : 0, y: desktop ? 0 : '-3vh', opacity: 0, immediateRender: false }, 0)
    .fromTo('.o-pen-b p', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '4vw' : 0, y: desktop ? 0 : '3vh', opacity: 0, immediateRender: false }, 0)
    .fromTo('.eject', { scale: 1, y: 0 }, { scale: 0.9, y: '-4vh', immediateRender: false }, 0)
    .fromTo(['.o-head', '.hint span'], { opacity: 1 }, { opacity: 0, duration: 0.5, immediateRender: false }, 0);
  exit($('.opening'));
}

/** 2. Medicine: the paragraph and three dark prints arrive as it scrolls in; pinned, they develop one by one. */
function medicine() {
  const scene = $('.medicine');
  const lead = words('.med-text .lead');
  const shots = $$('.medicine .mp');
  const polas = shots.map((s) => $('.pola', s));
  const captions = polas.map((p) => $$('.pen-cap .ch', p));

  const enter = entrance(scene).from('.med-text .label', { opacity: 0, y: 16, duration: 0.3 }, 0);
  reveal(enter, lead, 0.1, 0.8);
  // Laid down one after another.
  enter.from(shots, { y: '25vh', opacity: 0, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0.15);

  const tl = pinned(scene, LENGTH.medicine);
  polas.forEach((p, i) => {
    tl.add(develop(p, 0.42), i * 0.27);
    write(tl, captions[i], 0.3 + i * 0.27, 0.14);
  });
  exit(scene);
}

/**
 * 3 and 4. The wards and Bounceback, as one pen drawing. The doctor and the patient are drawn as the
 * scene scrolls in, joined by a glowing line. Pinned: the sentence is read, software windows draw
 * themselves in around the doctor at different depths, the patient walks off and the line loses its
 * glow and breaks; then the windows are swept into a phone, and Bounceback plays on its screens.
 */
function care(desktop: boolean) {
  const scene = $('.care');
  const mainWords = $$('.reading .main .word');
  const endWords = $$('.reading .end .word');
  const figures = $$('.doctor .draw, .patient .draw');
  const patient = $<SVGGElement>('.patient');
  const link = $<SVGPathElement>('.link-line');
  const glow = $<SVGPathElement>('.link-glow');
  const wins = $$<SVGGElement>('.win');
  const phone = $$('.phone > .ink .draw');
  const screens = $$('.ph');
  const noteLines = $$('.note-line');
  const bb1 = words('.bb1');
  const bb2 = words('.bb2');

  gsap.set([...mainWords, ...endWords], { opacity: UNREAD });
  undrawn([...figures, ...phone, ...wins.flatMap((w) => $$('.draw', w))]);
  gsap.set([link, glow], { attr: { 'stroke-dasharray': WHOLE, 'stroke-dashoffset': 1 } });
  gsap.set($$('.label', scene.querySelector('.drawing')!), { opacity: 0 });
  gsap.set([...screens, ...noteLines], { opacity: 0 });

  // The patient walks off, getting smaller with their feet on the ground, and the line follows them.
  const walk = { t: 0 };
  const placePatient = () => {
    const s = 1 - (1 - WALK.scale) * walk.t;
    const fx = FEET.x + WALK.x * walk.t;
    const fy = FEET.y + WALK.y * walk.t;
    patient.setAttribute('transform', `translate(${fx} ${fy}) scale(${s}) translate(${-FEET.x} ${-FEET.y})`);
    const ex = fx + (LINK_TO.x - FEET.x) * s;
    const ey = fy + (LINK_TO.y - FEET.y) * s;
    const dx = ex - LINK_FROM.x;
    const dy = ey - LINK_FROM.y;
    const c = (k: number) => `${LINK_FROM.x + dx * k} ${LINK_FROM.y + dy * k - LINK_ARCH}`;
    const d = `M${LINK_FROM.x} ${LINK_FROM.y} C${c(1 / 3)} ${c(2 / 3)} ${ex} ${ey}`;
    link.setAttribute('d', d);
    glow.setAttribute('d', d);
  };
  placePatient();

  const enter = entrance(scene);
  drawOn(enter, figures, 0.05, 0.75);
  enter.to([link, glow], { attr: { 'stroke-dashoffset': 0 }, duration: 0.2, ease: 'power1.inOut' }, 0.8);

  const tl = pinned(scene, LENGTH.care, { invalidateOnRefresh: true });

  // The sentence is read while the windows multiply: each draws itself in, and they drift apart,
  // the nearer ones further, which is what gives the pile its depth.
  tl.to(mainWords, { opacity: 1, duration: 0.01, stagger: 0.27 / mainWords.length }, 0);
  wins.forEach((w, i) => {
    const at = 0.02 + i * 0.024;
    drawOn(tl, $$('.draw', w), at, 0.05);
    tl.to($('.label', w), { opacity: 1, duration: 0.02 }, at + 0.03);
    tl.fromTo(w, { y: 0 }, { y: -Number(w.dataset.d) * 30, duration: 0.44 - at }, at);
  });

  // "And once patients went home, they were mostly on their own."
  tl.to(endWords, { opacity: 1, duration: 0.01, stagger: 0.06 / endWords.length }, 0.29)
    .to(walk, { t: 1, duration: 0.12, ease: 'power1.inOut', onUpdate: placePatient }, 0.3)
    .to(glow, { opacity: 0, duration: 0.09 }, 0.31)
    .to(link, { attr: { 'stroke-dasharray': BROKEN }, duration: 0.08, ease: 'power2.out' }, 0.35);

  // The clutter is swept into one phone, and the people go with it.
  wins.forEach((w, i) => {
    const cx = Number(w.dataset.cx);
    const cy = Number(w.dataset.cy);
    tl.fromTo(
      w,
      { x: 0, y: -Number(w.dataset.d) * 30, scale: 1, svgOrigin: `${cx} ${cy}` },
      { x: PHONE_CENTRE.x - cx, y: PHONE_CENTRE.y - cy, scale: 0.12, svgOrigin: `${cx} ${cy}`, duration: 0.08, ease: 'power3.in', immediateRender: false },
      0.44 + i * 0.005,
    ).to(w, { opacity: 0, duration: 0.03 }, 0.49 + i * 0.005);
  });
  tl.to('.wards-text', { opacity: 0, y: -30, duration: 0.05 }, 0.44).to(['.doctor', '.patient', '.link'], { opacity: 0, duration: 0.06 }, 0.44);
  drawOn(tl, phone, 0.47, 0.08);
  tl.to(
    '.drawing',
    {
      scale: desktop ? PHONE_ZOOM.desktop : PHONE_ZOOM.mobile,
      transformOrigin: `${(PHONE_CENTRE.x / 560) * 100}% ${(PHONE_CENTRE.y / 520) * 100}%`,
      duration: 0.08,
      ease: 'power2.inOut',
    },
    0.48,
  );
  tl.to(screens[0], { opacity: 1, duration: 0.03 }, 0.53);

  tl.from('.bb-text .label', { opacity: 0, y: 16, duration: 0.03 }, 0.55);
  reveal(tl, bb1, 0.56, 0.07);

  // The phone's screens, one after another.
  const swap = (from: number, to: number, at: number) =>
    tl.to(screens[from], { opacity: 0, x: -10, duration: 0.025 }, at).fromTo(screens[to], { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.025 }, at + 0.01);
  swap(0, 1, 0.63);
  // Filming a set: the figure squats a few times while the recording light blinks.
  tl.to('.squat', { scaleY: 0.84, svgOrigin: '280 318', duration: 0.012, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.645).to(
    '.rec',
    { opacity: 0.2, duration: 0.008, yoyo: true, repeat: 5 },
    0.645,
  );
  swap(1, 2, 0.7);
  if (!desktop) tl.to('.bb1', { opacity: 0, y: -16, duration: 0.03 }, 0.73);
  reveal(tl, bb2, 0.75, 0.07);
  swap(2, 3, 0.77);
  tl.to(noteLines, { opacity: 1, duration: 0.025, stagger: 0.03 }, 0.8);
  swap(3, 4, 0.93);
  exit(scene);
}

/** 5. Eigen: the run club print develops while a lap is drawn round it, then the dots: face, mask versions, footprint. */
function eigen(dots: Dots) {
  const scene = $('.eigen');
  const pola = $('.run .pola');
  const caption = $$('.pen-cap .ch', pola);
  const path = $<SVGPathElement>('.route-path');
  const runner = $<SVGCircleElement>('.runner');
  const len = path.getTotalLength();
  const e1 = words('.e1');
  const e2 = words('.e2');
  const e3 = words('.e3');

  gsap.set(caption, { opacity: 0 });
  gsap.set(path, { attr: { 'stroke-dasharray': `${len} ${len * 2}`, 'stroke-dashoffset': len } });
  gsap.set(['.dots', runner], { opacity: 0 });

  const state = { gather: 0, variant: 0, morph: 0, route: 0, time: 0 };
  const draw = () => {
    dots.draw(state);
    const p = path.getPointAtLength(len * state.route);
    runner.setAttribute('cx', String(p.x));
    runner.setAttribute('cy', String(p.y));
  };
  // While the scene is on screen the dots breathe a little.
  const breathe = (t: number) => {
    state.time = t;
    dots.draw(state);
  };

  const enter = entrance(scene)
    .from('.run-in', { y: '25vh', opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.15)
    .from('.eigen-text .label', { opacity: 0, y: 16, duration: 0.3 }, 0);
  reveal(enter, e1, 0.1, 0.8);

  const tl = pinned(scene, LENGTH.eigen, {
    onToggle: (self) => (self.isActive ? gsap.ticker.add(breathe) : gsap.ticker.remove(breathe)),
  });
  tl.eventCallback('onUpdate', draw);
  tl.add(develop(pola, 0.24), 0)
    .to(runner, { opacity: 1, duration: 0.02 }, 0.04)
    .to(path, { attr: { 'stroke-dashoffset': 0 }, duration: 0.3 }, 0.04)
    .to(state, { route: 1, duration: 0.3 }, 0.04);
  write(tl, caption, 0.2, 0.08);
  // The run gives way to the dots. Its children move, so the entrance keeps the wrapper to itself.
  tl.to('.run-in > *', { y: '-120vh', duration: 0.12, ease: 'power3.in' }, 0.36)
    .to('.e1', { opacity: 0, duration: 0.04 }, 0.37)
    .to('.dots', { opacity: 1, duration: 0.04 }, 0.4)
    .to(state, { gather: 1, duration: 0.12, ease: 'power2.out' }, 0.4);
  reveal(tl, e2, 0.45, 0.08);
  // Quick iterations: the mask flicks through its versions. Then the pivot: the face streams into a footprint.
  tl.to(state, { variant: 3, duration: 0.18 }, 0.5)
    .to('.e2', { opacity: 0, duration: 0.04 }, 0.69)
    .to(state, { morph: 1, duration: 0.22, ease: 'power1.inOut' }, 0.7);
  reveal(tl, e3, 0.76, 0.1);
  draw();
  exit(scene);
}

/**
 * 6. Personal: the scene pins and scrolling moves a row sideways. Each interest's title is written
 * as it comes in, and each print develops as it crosses the screen.
 */
function personal() {
  const scene = $('.personal');
  const track = $('.track');
  const lead = words('.p-intro .lead');

  const enter = entrance(scene).from('.p-intro .label', { opacity: 0, y: 16, duration: 0.3 }, 0);
  reveal(enter, lead, 0.1, 0.8);

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const slide = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: { trigger: scene, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: SCRUB, invalidateOnRefresh: true },
  });
  const along = (trigger: Element, start: string, end: string) =>
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, containerAnimation: slide, start, end, scrub: SCRUB } });

  for (const h of $$('.g-text h3')) write(along(h, 'left 95%', 'left 60%'), letters(h), 0, 1);
  // Each print has developed by the time it is a little way in, so the last ones finish too.
  for (const pola of $$('.gp .pola')) {
    const chars = $$('.pen-cap .ch', pola);
    gsap.set(chars, { opacity: 0 });
    const tl = along(pola, 'left 100%', 'right 88%').add(develop(pola, 1), 0);
    write(tl, chars, 0.75, 0.25);
  }
  // No glide out: the ending is the bottom of the page, so the row would still lie over it there.
}

/** 7. Ending: the contact line is written in ballpoint, and the name rises as a wordmark along the bottom. */
function ending() {
  // Half the glide: the row of prints above it does not glide out, so the words would run into it.
  entrance($('.ending'), 0.5);
  gsap.fromTo(
    $$('.contact-line .ch'),
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.1,
      stagger: 0.022,
      ease: 'none',
      scrollTrigger: { trigger: '.ending', start: 'top 60%', toggleActions: 'play none none reverse' },
    },
  );
  gsap.from('.wordmark .c', {
    yPercent: 100,
    ease: 'none',
    stagger: 0.05,
    scrollTrigger: { trigger: '.ending', start: 'top bottom', end: 'bottom bottom', scrub: SCRUB },
  });
}

// Last, so the helpers above are defined before anything runs.
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) start();
