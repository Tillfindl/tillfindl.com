/*
 * The interactive version's motion.
 *
 * Scrolling is the browser's own. Nothing takes it over, so the page always moves exactly with the
 * finger and the browser can scroll on its own thread; on a phone or tablet nothing here even
 * listens to touches. Lenis only smooths a mouse wheel's steps on a desktop.
 *
 * Every animation is tied straight to the scroll position (scrub: true), with no lag. The words and
 * pictures are in the normal page flow and move with the page, together. They are uncovered by
 * wipes as they come in at the bottom of the screen (words from the left, prints from their side,
 * the scene names across their width), so everything is whole by the time it is read and nothing
 * is waited for. In Medicine each phrase has its own print beside it. On a desktop the wards,
 * Bounceback and Eigen are a sticky picture that changes only while one of its phrases passes it (a
 * "cue"). On a phone the wards drawing stays too, near the top, and each phrase comes up to rest
 * just under it, fading as the next arrives, while Eigen's cued phrases each have their own panel
 * above them (a "shot"), playing that phrase's step as it comes up the screen. Personal zigzags down
 * the page. Scrolling back plays it all in reverse.
 *
 * The opening plays on CSS and needs nothing from here until you scroll, when it is cleared within
 * a quarter of a screen. Nothing is rotated. With reduced motion nothing here runs and the page
 * reads as a plain page.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger);

/** How smooth a mouse wheel is on a desktop (Lenis lerp): higher follows the wheel more tightly. */
const LERP = 0.16;
/**
 * The trip back to the top: how long the page swooshes out and in, how far (in screens), and how
 * much it blurs, along the scroll with a wheel and as a plain blur on a phone (in pixels).
 */
const BACK = { out: 0.32, in: 0.5, travel: 0.3, blur: 24, phoneBlur: 6 };
/** How far the first scroll goes (in screens) before the opening has cleared. */
const OPENING_OUT = 0.25;

type Range = [string, string];
/**
 * Where words are wiped in, where a phrase is wiped out again (on a desktop, near the top) and where
 * its pen underlines are drawn, as ScrollTrigger [start, end] pairs. Everything is uncovered while
 * it comes in at the bottom of the screen, so it is whole by the time it is read; nothing is waited
 * for. On a desktop, also the stretch over which a phrase sets its picture moving, while it is read.
 */
const ZONES: { desktop: { in: Range; out: Range; line: Range; cue: Range }; mobile: { in: Range; line: Range } } = {
  desktop: { in: ['top 100%', 'top 84%'], out: ['bottom 24%', 'bottom 6%'], line: ['top 90%', 'top 74%'], cue: ['top 78%', 'top 40%'] },
  mobile: { in: ['top 100%', 'top 84%'], line: ['top 92%', 'top 76%'] },
};
/** Where a print is uncovered and develops: from its top at the bottom of the screen to 60% up. */
const PRINT_ZONE: Range = ['top 100%', 'top 60%'];
/**
 * The room a wipe's clip leaves round what it uncovers (top, right, bottom, left, in % of the
 * element's box), so the parts that poke out of it are never cut: big letters and underlines, a
 * print's shadow, the lap round the run club print.
 */
const PAD = { text: [12, 6, 26, 6], print: [12, 16, 28, 16], lap: [16, 18, 28, 18] } satisfies Record<string, Pad>;
/**
 * On a phone, the stretch over which an Eigen panel plays its step: from when it is half on screen
 * until its middle reaches the middle of the screen, so it has finished by the time its phrase is read.
 */
const SHOT_ZONE: Range = ['center 85%', 'center 45%'];
/**
 * On a phone, the stretch over which a phrase of the wards and Bounceback plays its step in the
 * drawing: from when it has come this far up the screen (the phrase before it has faded by then)
 * until it has rested under the drawing for this much more scrolling, in screen heights.
 */
const REST_FROM = 'top 68%';
const REST_AFTER = 0.12;
/**
 * How close the next phrase comes below a resting one (in screen heights) as that one fades: it
 * starts fading at the first distance and has gone by the second.
 */
const REST_FADE = [0.2, 0.04] as const;
/** How far the desktop drawing zooms in on its phone, so the screens can be read. */
const PHONE_ZOOM = 1.2;
/**
 * How many dots make the face and the footprint, and the pixel density they are drawn at: fewer and
 * softer on a phone, where each frame costs more and three canvases share the scene.
 */
const DOTS = { desktop: { count: 1500, dpr: 2 }, mobile: { count: 650, dpr: 1.5 } };
/** How long after the page has loaded (the hero has settled by then) every photo is fetched, in ms. */
const PRELOAD_AFTER = 2500;
/** The ballpoint blue, as RGB for the dots' canvas. */
const PEN_RGB = '47 51 148';

/* Points in the wards drawing (WardsDrawing.astro), in its 560 × 520 units. */
/** Where the windows are swept to: the middle of the phone. */
const PHONE_CENTRE = { x: 280, y: 256 };
/** The phone's top and height with a little margin, which the phone's close-up fits. */
const PHONE_BOX = { top: 96, height: 320 };
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

/** The current layout's phrase zones (see ZONES). */
let zone: { in: Range; line: Range } = ZONES.desktop;
/** Every dot canvas, made once each, so a layout change does not sample its shapes again. */
const dotCanvases = new Map<HTMLCanvasElement, Dots>();

/** Only on a desktop with a mouse or trackpad. */
let lenis: Lenis | undefined;
/** True while the page goes back to the top by itself. */
let moving = false;

function start() {
  // The address bar showing and hiding on a phone resizes the window; that must not re-measure
  // everything mid-scroll.
  ScrollTrigger.config({ ignoreMobileResize: true });
  // A wheel moves in steps, so on a desktop Lenis smooths them. Touch scrolling is smooth already,
  // and Lenis would add touch listeners the browser has to wait for before it may scroll, so on a
  // phone or tablet it is never created.
  if (window.matchMedia('(pointer: fine)').matches) {
    const smooth = new Lenis({ lerp: LERP });
    smooth.on('scroll', () => ScrollTrigger.update());
    gsap.ticker.add((t) => smooth.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis = smooth;
  }
  // For checking the scenes in screenshots: jump anywhere, with or without Lenis.
  Object.assign(window, {
    __xp: {
      lenis,
      gsap,
      ScrollTrigger,
      scrollTo: jump,
      get y() {
        return lenis ? lenis.scroll : window.scrollY;
      },
    },
  });

  for (const a of $$<HTMLAnchorElement>('a[href="#top"]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      backToTop();
    });
  }

  // The scenes differ between phone and desktop, so they are rebuilt when the layout changes. All
  // of them are made here, in page order.
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 52rem)', mobile: '(max-width: 51.99rem)' }, (ctx) => {
    const desktop = !!ctx.conditions?.desktop;
    zone = desktop ? ZONES.desktop : ZONES.mobile;
    opening(desktop);
    phrases(desktop);
    headings();
    medicine(desktop);
    care(desktop);
    eigen(desktop);
    personal();
    ending();
    chrome();
  });

  window.addEventListener('resize', () => {
    for (const dots of dotCanvases.values()) dots.resize();
  });
  // The handwriting font changes how tall the text is, so measure again once it has arrived.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  watchHeight();
  preloadPhotos();
}

/**
 * Measures every trigger again whenever the page's height really changes, for instance when the
 * window it sits in is resized after it has loaded; otherwise pictures would change for the wrong
 * phrase. A phone's address bar showing or hiding does not change it (the page is sized in svh), so
 * scrolling is never interrupted by a re-measure.
 */
function watchHeight() {
  const main = $('.xp main');
  let height = main.offsetHeight;
  let timer = 0;
  new ResizeObserver(() => {
    if (Math.abs(main.offsetHeight - height) < 2) return;
    height = main.offsetHeight;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(main);
}

/** The dots for `canvas`, made the first time they are asked for. */
function dotsFor(canvas: HTMLCanvasElement, { count, dpr }: { count: number; dpr: number }) {
  let dots = dotCanvases.get(canvas);
  if (!dots) {
    dots = new Dots(canvas, count, PEN_RGB, dpr);
    dotCanvases.set(canvas, dots);
  }
  dots.resize();
  return dots;
}

/** Jumps straight to `y`, with no smoothing. */
function jump(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'instant' });
  ScrollTrigger.update();
}

/**
 * Every photo on the page is fetched and decoded in the background once the hero has settled, a few
 * at a time, so none is decoded while it scrolls into view. Photos only the other layout shows (in
 * a hidden picture) are left alone.
 */
function preloadPhotos() {
  const queue = $$<HTMLImageElement>('.xp img').filter((img) => img.offsetParent !== null);
  const worker = async () => {
    for (let img = queue.shift(); img; img = queue.shift()) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  };
  const run = () => window.setTimeout(() => Promise.all([worker(), worker(), worker()]), PRELOAD_AFTER);
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

/**
 * Back to the top by the most direct route: what is on screen swooshes down and blurs, the page
 * jumps to the top while blurred, and the opening slides in sharp again. With a wheel the blur runs
 * along the scroll only (an SVG filter); on a phone it is a plain CSS blur, which costs far less.
 * Only what is on screen moves, and only elements nothing else animates (the scenes' wrappers, the
 * sticky pictures and the phrases), so no scroll animation is disturbed.
 */
function backToTop() {
  if (moving) return;
  moving = true;
  const vh = window.innerHeight;
  const alongScroll = !!lenis;
  const node = $('#motion-blur feGaussianBlur');
  const fx = { blur: 0 };
  const blur = (targets: Element[], amount: number, vars: gsap.TweenVars) =>
    alongScroll
      ? gsap.to(fx, { blur: amount * BACK.blur, ...vars, onUpdate: () => node.setAttribute('stdDeviation', `0 ${fx.blur.toFixed(2)}`) })
      : gsap.to(targets, { filter: `blur(${amount * BACK.phoneBlur}px)`, ...vars });
  const onScreen = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh;
  };
  const leaving = $$('.opening, .pairs .pair, .scene .visual, .script .phr, .script .shot, .p-intro, .topic, .ending').filter(onScreen);
  const arriving = $$('.opening');
  gsap
    .timeline({
      onComplete: () => {
        gsap.set(arriving, { clearProps: 'transform,filter' });
        moving = false;
      },
    })
    .set(leaving, { filter: alongScroll ? 'url(#motion-blur)' : 'blur(0px)' })
    .to(leaving, { y: vh * BACK.travel, duration: BACK.out, ease: 'power2.in' }, 0)
    .add(blur(leaving, 1, { duration: BACK.out, ease: 'power2.in' }), 0)
    .add(() => {
      gsap.set(leaving, { clearProps: 'transform,filter' });
      jump(0);
      gsap.set(arriving, { y: -vh * BACK.travel, filter: alongScroll ? 'url(#motion-blur)' : `blur(${BACK.phoneBlur}px)` });
    })
    .to(arriving, { y: 0, duration: BACK.in, ease: 'power3.out' })
    .add(blur(arriving, 0, { duration: BACK.in, ease: 'power3.out' }), '<');
}

/* ---------- Building blocks ---------- */

/** On a desktop, a timeline scrubbed while `phrase` is read: the stretch where it sets its picture moving. */
function cue(name: string) {
  const phrase = $(`.phr[data-cue="${name}"]`);
  if (!phrase) throw new Error(`No phrase for cue "${name}"`);
  const [start, end] = ZONES.desktop.cue;
  return gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: phrase, start, end, scrub: true } });
}

/** Where a phrase that rests under a picture on a phone comes to rest: its sticky top, in pixels. */
const restLine = (inner: Element) => parseFloat(getComputedStyle(inner).top);

/**
 * On a phone, a timeline scrubbed while `name`'s phrase comes up to rest under the picture
 * (REST_FROM, REST_AFTER). The phrase's own box (`.phr`) is the trigger, never its sticky inner
 * part, whose place depends on the scroll.
 */
function restCue(name: string) {
  const phrase = $(`.phr[data-cue="${name}"]`);
  if (!phrase) throw new Error(`No phrase for cue "${name}"`);
  const inner = $('.phr-in', phrase);
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: phrase, start: REST_FROM, end: () => `top ${restLine(inner) - REST_AFTER * window.innerHeight}px`, scrub: true },
  });
}

/** On a phone, a timeline scrubbed while the panel `shot` comes up the screen (SHOT_ZONE). */
const shotTimeline = (shot: Element) =>
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: shot, start: SHOT_ZONE[0], end: SHOT_ZONE[1], scrub: true } });

/** One step of a picture: its name (the cue of the phrase it goes with) and what it adds to a timeline. */
type Step = [name: string, build: (tl: gsap.core.Timeline) => void];

/** Writes letters between `at` and `at + dur`, one after another, as a pen would. */
function write(tl: gsap.core.Timeline, chars: Element[], at: number, dur: number) {
  if (!chars.length) return;
  const step = dur / (chars.length + 1);
  tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: step * 2, stagger: step, ease: 'none' }, at);
}

/**
 * Develops a Polaroid over `dur`: the dark film clears, the picture comes through flat and cool,
 * then the veil lifts and its colour arrives. Only opacity changes (Polaroid.astro), so it costs
 * nothing to draw. Returns a timeline to add to a scene.
 */
function develop(pola: Element, dur: number) {
  return gsap
    .timeline()
    .fromTo($('.chem', pola), { opacity: 1 }, { opacity: 0, duration: dur * 0.6, ease: 'power2.in' }, 0)
    .fromTo($('.cast', pola), { opacity: 0.6 }, { opacity: 0, duration: dur * 0.6, ease: 'sine.inOut' }, dur * 0.4);
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

/** Room round an element for a clip (see PAD), and the edge a wipe starts from or ends at. */
type Pad = [top: number, right: number, bottom: number, left: number];
type Side = 'left' | 'right' | 'top' | 'bottom';

/**
 * A clip that shows all of an element, with `pad` of room round it, or, given a side, none of it:
 * the clip shut against the outer edge of the room on that side, where a wipe from that side starts
 * or a wipe towards it ends. The values are always written out in full, because GSAP cannot blend
 * a clip path it has to read from the stylesheet.
 */
function clip([pt, pr, pb, pl]: Pad, side?: Side) {
  const [t, r, b, l] = [pt, pr, pb, pl].map((v) => `${-v}%`);
  if (side === 'left') return `inset(${t} ${100 + pl}% ${b} ${l})`;
  if (side === 'right') return `inset(${t} ${r} ${b} ${100 + pr}%)`;
  if (side === 'top') return `inset(${t} ${r} ${100 + pt}% ${l})`;
  if (side === 'bottom') return `inset(${100 + pb}% ${r} ${b} ${l})`;
  return `inset(${t} ${r} ${b} ${l})`;
}

/** Uncovers `el` from its `from` edge between `at` and `at + dur`. */
function wipeIn(tl: gsap.core.Timeline, el: Element, from: Side, pad: Pad, at: number, dur: number) {
  tl.fromTo(el, { clipPath: clip(pad, from) }, { clipPath: clip(pad), duration: dur, ease: 'power2.out' }, at);
}

/** Covers `el` up again towards its `toward` edge between `at` and `at + dur`. */
function wipeOut(tl: gsap.core.Timeline, el: Element, toward: Side, pad: Pad, at: number, dur: number) {
  tl.fromTo(el, { clipPath: clip(pad) }, { clipPath: clip(pad, toward), duration: dur, ease: 'power2.in', immediateRender: false }, at);
}

/**
 * Uncovers a print from its `from` edge between `at` and `at + dur`, by sliding the paper cover in
 * `wrap` (`.cover`, see the styles) away towards the opposite edge. Only the cover moves, so the
 * photo under it is never repainted.
 */
function uncover(tl: gsap.core.Timeline, wrap: Element, from: Side, at: number, dur: number) {
  const away = { left: { xPercent: 101 }, right: { xPercent: -101 }, top: { yPercent: 101 }, bottom: { yPercent: -101 } }[from];
  tl.fromTo($('.cover', wrap), { x: 0, y: 0, xPercent: 0, yPercent: 0 }, { ...away, duration: dur, ease: 'power2.out' }, at);
}

/** A timeline scrubbed while `trigger` moves through `range`. */
const scrubbed = (trigger: Element, [start, end]: Range) =>
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, start, end, scrub: true } });

/* ---------- Around every scene ---------- */

/** The progress line along the top, and the name in the corner once the opening has gone. */
function chrome() {
  const bar = $('.progress');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    refreshPriority: -2,
    onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
  });
  const hudName = $('.hud-name');
  gsap.set(hudName, { autoAlpha: 0 });
  ScrollTrigger.create({
    start: () => window.innerHeight * OPENING_OUT,
    refreshPriority: -2,
    onEnter: () => gsap.to(hudName, { autoAlpha: 1, duration: 0.4 }),
    onLeaveBack: () => gsap.to(hudName, { autoAlpha: 0, duration: 0.3 }),
  });
}

/**
 * Every phrase is wiped in from the left as it comes in at the bottom of the screen: on a desktop
 * line by line, each as its line arrives, and on a phone as one block, by sliding its paper cover
 * away (cheaper on a phone than a moving clip). Its pen underlines are drawn just after. On a
 * desktop it is wiped out again towards the right as it leaves at the top. The wipes in and out
 * drive different elements (the lines, the phrase's body), so no element is driven by two scroll
 * animations; the resting phrases on a phone fade on their own inner part.
 */
function phrases(desktop: boolean) {
  for (const phrase of $$('.script .phr, .pairs .phr')) {
    const body = phrase.querySelector('.phr-w');
    if (!body) continue;
    if (desktop) {
      for (const ln of $$('.ln', body)) wipeIn(scrubbed(ln, zone.in), ln, 'left', PAD.text, 0, 1);
      wipeOut(scrubbed(phrase, ZONES.desktop.out), body, 'right', PAD.text, 0, 1);
    } else {
      uncover(scrubbed(phrase, zone.in), body, 'left', 0, 1);
    }
    const lines = $$('.u-line', phrase);
    if (!lines.length) continue;
    const tl = scrubbed(phrase, zone.line);
    // Explicit from and to values: GSAP cannot blend a clip path it has to read from the stylesheet.
    lines.forEach((line, i) => tl.fromTo(line, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i * 0.85));
  }
}

/**
 * Each scene's name is wiped in across its width as it comes in, and its pen line drawn under it
 * just after. The trigger is the heading, never its inner part, which rests (is sticky) on a phone.
 */
function headings() {
  for (const name of $$('.h-name')) {
    const tl = scrubbed(name.closest('h2') ?? name, zone.in);
    wipeIn(tl, name, 'left', PAD.text, 0, 0.7);
    tl.fromTo($('.h-line', name), { clipPath: 'inset(-50% 100% -50% 0%)' }, { clipPath: 'inset(-50% 0% -50% 0%)', duration: 0.5 }, 0.5);
  }
}

/* ---------- The scenes ---------- */

/**
 * 1. The opening plays on CSS, and is cleared quickly by the first scroll, on a desktop and a phone
 * alike: within OPENING_OUT of a screen the two halves of the note slide out to their sides, the
 * portrait is covered up from the bottom (its paper cover slides up over it) and the name fades. The elements with CSS animations (the letters,
 * the logo, the print) are left alone, because an animation's fill would override what GSAP writes;
 * their wrappers move.
 */
function opening(desktop: boolean) {
  const out = desktop ? '-12vw' : '-45vw';
  gsap
    .timeline({
      defaults: { ease: 'power2.in' },
      scrollTrigger: { trigger: '.opening', start: 'top top', end: () => `+=${window.innerHeight * OPENING_OUT}`, scrub: true, invalidateOnRefresh: true },
    })
    .fromTo('.o-pen-a p', { x: 0, opacity: 1 }, { x: out, opacity: 0, immediateRender: false }, 0)
    .fromTo('.o-pen-b p', { x: 0, opacity: 1 }, { x: out.replace('-', ''), opacity: 0, immediateRender: false }, 0)
    .fromTo('.o-print .cover', { x: 0, xPercent: 0, yPercent: 101 }, { yPercent: 0, immediateRender: false }, 0)
    .fromTo('.o-head', { opacity: 1 }, { opacity: 0, duration: 0.6, ease: 'none', immediateRender: false }, 0);
}

/**
 * 2. Medicine: each phrase with its own print. The print is uncovered from its outer side as it
 * comes up the screen (from the right when it sits on the right, and so on), develops, and has its
 * caption written last. It moves with its phrase: nothing lags, drops in or is laid down.
 */
function medicine(desktop: boolean) {
  for (const pair of $$('.medicine .pair')) {
    const print = $('.pp-in', pair);
    const pola = $('.pola', print);
    // A print sits on the right on a desktop and on the left on a phone, the other way round in a
    // flipped pair.
    const right = desktop !== pair.classList.contains('flip');
    const tl = scrubbed(print, PRINT_ZONE);
    uncover(tl, print, right ? 'right' : 'left', 0, 0.45);
    tl.add(develop(pola, 0.8), 0.1);
    write(tl, $$('.pen-cap .ch', pola), 0.75, 0.25);
  }
}

/**
 * The wards drawing inside `root`, readied to be drawn on, and the steps that move it on, in order:
 * the doctor and the patient are drawn, joined by a glowing line; the windows pile up around the
 * doctor; the patient walks off; the line loses its glow and breaks; the windows are swept into a
 * phone and the drawing closes in on it (by `zoom.scale`, about `zoom.origin`); and Bounceback plays
 * on its screens.
 */
function wardsSteps(root: ParentNode, zoom: { scale: number; origin: string }): Step[] {
  const drawing = $<SVGSVGElement>('.drawing', root);
  const figures = $$('.doctor .draw, .patient .draw', drawing);
  const people = $$('.doctor, .patient, .link', drawing);
  const patient = $<SVGGElement>('.patient', drawing);
  const link = $<SVGPathElement>('.link-line', drawing);
  const glows = $$<SVGPathElement>('.link-glow', drawing);
  const wins = $$<SVGGElement>('.win', drawing);
  const phone = $$('.phone > .ink .draw', drawing);
  const screens = $$('.ph', drawing);
  const noteLines = $$('.note-line', drawing);

  undrawn([...figures, ...phone, ...wins.flatMap((w) => $$('.draw', w))]);
  gsap.set([link, ...glows], { attr: { 'stroke-dasharray': WHOLE, 'stroke-dashoffset': 1 } });
  gsap.set($$('.label', drawing), { opacity: 0 });
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
    for (const path of [link, ...glows]) path.setAttribute('d', d);
  };
  placePatient();

  // The windows pile up with the phrases. The three on "one program for imaging, another for notes,
  // another for prescriptions" come in with those words, in that order.
  const pile = (name: string) => (tl: gsap.core.Timeline) => {
    const own = wins.filter((w) => w.dataset.cue === name);
    if (name === 'wards-3') own.sort((a, b) => Number(a.dataset.k) - Number(b.dataset.k));
    own.forEach((w, i) => {
      const at = i / own.length;
      drawOn(tl, $$('.draw', w), at, 1 / own.length);
      tl.to($('.label', w), { opacity: 1, duration: 0.3 / own.length }, at + 0.6 / own.length);
    });
  };

  // The phone's screens, one after another. A screen comes in on its outer group and leaves on its
  // inner one, because the phrase that brings it is not always the phrase that takes it away. Each
  // phrase's first change waits until the one before has finished its last, even when two phrases
  // are close together, so every screen is seen and two never show at once.
  const swap = (tl: gsap.core.Timeline, from: number, to: number, at: number) =>
    tl
      .to($('.ph-o', screens[from]), { opacity: 0, x: -10, duration: 0.15 }, at)
      .fromTo(screens[to], { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.15, immediateRender: false }, at + 0.06);

  return [
    [
      'enter',
      (tl) => {
        drawOn(tl, figures, 0, 0.8);
        tl.to([link, ...glows], { attr: { 'stroke-dashoffset': 0 }, duration: 0.2, ease: 'power1.inOut' }, 0.8);
      },
    ],
    ['wards-1', pile('wards-1')],
    ['wards-2', pile('wards-2')],
    ['wards-3', pile('wards-3')],
    // "And once patients went home,": the patient walks off and the line loses its glow.
    ['leave', (tl) => tl.to(walk, { t: 1, duration: 1, ease: 'power1.inOut', onUpdate: placePatient }, 0).to(glows, { opacity: 0, duration: 0.8 }, 0.1)],
    // "they were mostly on their own.": the line breaks.
    ['break', (tl) => tl.to(link, { attr: { 'stroke-dasharray': BROKEN }, duration: 1, ease: 'power2.out' }, 0)],
    // "So I put together a team in Vienna,": the clutter is swept into one phone, the people go with
    // it, and the drawing closes in on the phone.
    [
      'sweep',
      (tl) => {
        wins.forEach((w, i) => {
          const cx = Number(w.dataset.cx);
          const cy = Number(w.dataset.cy);
          tl.fromTo(
            w,
            { x: 0, y: 0, scale: 1, svgOrigin: `${cx} ${cy}` },
            { x: PHONE_CENTRE.x - cx, y: PHONE_CENTRE.y - cy, scale: 0.12, svgOrigin: `${cx} ${cy}`, duration: 0.5, ease: 'power3.in', immediateRender: false },
            i * 0.02,
          ).to(w, { opacity: 0, duration: 0.2 }, 0.38 + i * 0.02);
        });
        tl.to(people, { opacity: 0, duration: 0.35 }, 0);
        drawOn(tl, phone, 0.35, 0.45);
        tl.to(drawing, { scale: zoom.scale, transformOrigin: zoom.origin, duration: 0.5, ease: 'power2.inOut' }, 0.45);
      },
    ],
    // "and we started with physio, where recovery depends on the exercises patients do at home.":
    // the phone shows the day's exercises.
    ['home', (tl) => tl.to(screens[0], { opacity: 1, duration: 0.15 }, 0.2)],
    [
      'screens-a',
      (tl) => {
        swap(tl, 0, 1, 0.3);
        // Filming a set: the figure squats a few times while the recording light blinks.
        tl.to($('.squat', drawing), { scaleY: 0.84, svgOrigin: '280 318', duration: 0.05, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.44).to(
          $('.rec', drawing),
          { opacity: 0.2, duration: 0.035, yoyo: true, repeat: 5 },
          0.44,
        );
        swap(tl, 1, 2, 0.8);
      },
    ],
    [
      'screens-b',
      (tl) => {
        swap(tl, 2, 3, 0.3);
        tl.to(noteLines, { opacity: 1, duration: 0.08, stagger: 0.1 }, 0.46);
        swap(tl, 3, 4, 0.85);
      },
    ],
  ];
}

/**
 * 3 and 4. The wards and Bounceback, as one pen drawing that stays in place while its phrases pass.
 * The people are drawn as the scene comes in, and each phrase plays its step: on a desktop while it
 * is read beside the drawing, on a phone as it comes up to rest beneath it. On a phone the phrase
 * resting there fades as the next one closes on it, so only one is read at a time and none ever
 * passes under the drawing; there the drawing closes in further on its phone, which then reaches a
 * little below it (`--phone-fill`), and Bounceback's phrases rest that much lower.
 */
function care(desktop: boolean) {
  const scene = $('.care');
  const visual = $('.visual', scene);
  const enter = (end: string) =>
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 92%', end, scrub: true } });
  if (desktop) {
    const zoom = { scale: PHONE_ZOOM, origin: `${(PHONE_CENTRE.x / 560) * 100}% ${(PHONE_CENTRE.y / 520) * 100}%` };
    for (const [name, build] of wardsSteps(visual, zoom)) build(name === 'enter' ? enter('top 12%') : cue(name));
    return;
  }
  // The phone fills `fill` times the drawing's height, its top staying at the drawing's top: the
  // origin is the point a scale about which leaves the phone's top edge where the drawing's is.
  const fill = parseFloat(getComputedStyle(scene).getPropertyValue('--phone-fill')) || 1;
  const scale = (fill * 520) / PHONE_BOX.height;
  const originY = (PHONE_BOX.top * scale) / (scale - 1);
  const zoom = { scale, origin: `${(PHONE_CENTRE.x / 560) * 100}% ${(originY / 520) * 100}%` };
  for (const [name, build] of wardsSteps(visual, zoom)) build(name === 'enter' ? enter('top 40%') : restCue(name));

  const slots = $$('.script .phr', scene);
  slots.slice(0, -1).forEach((slot, i) => {
    const inner = $('.phr-in', slot);
    // Measured from where the phrase rests: its sticky top plus its height.
    const at = (k: number) => () => `top ${restLine(inner) + inner.offsetHeight + k * window.innerHeight}px`;
    gsap.fromTo(
      inner,
      { opacity: 1 },
      { opacity: 0, ease: 'none', scrollTrigger: { trigger: slots[i + 1], start: at(REST_FADE[0]), end: at(REST_FADE[1]), scrub: true } },
    );
  });
}

/** Readies the lap round the run club print in `root`, and returns the step that draws it, with its runner. */
function lap(root: ParentNode) {
  const path = $<SVGPathElement>('.route-path', root);
  const runner = $<SVGCircleElement>('.runner', root);
  const len = path.getTotalLength();
  gsap.set(path, { attr: { 'stroke-dasharray': `${len} ${len * 2}`, 'stroke-dashoffset': len } });
  gsap.set(runner, { opacity: 0 });
  const at = { route: 0 };
  // The runner keeps to its place on the lap.
  const place = () => {
    const p = path.getPointAtLength(len * at.route);
    runner.setAttribute('cx', String(p.x));
    runner.setAttribute('cy', String(p.y));
  };
  return (tl: gsap.core.Timeline, start: number, dur: number) =>
    tl
      .to(runner, { opacity: 1, duration: 0.05 }, start)
      .to(path, { attr: { 'stroke-dashoffset': 0 }, duration: dur }, start)
      .to(at, { route: 1, duration: dur, onUpdate: place }, start);
}

/**
 * 5. Eigen: the run club print is uncovered, develops and has a lap drawn round it; at "where I met
 * Max" it is wiped away as the workshop print is uncovered in its place, just as big; then that
 * gives way to the dots: a face for the CPAP masks with their custom versions, and the footprint.
 * On a desktop the prints share one sticky picture; on a phone each has its own panel above its
 * phrase, uncovered from its side, and the dots a canvas for each of their two stages.
 */
function eigen(desktop: boolean) {
  const scene = $('.eigen');
  if (!desktop) {
    for (const shot of $$('.shot', scene)) {
      const tl = shotTimeline(shot);
      const pola = shot.querySelector('.pola');
      if (pola) uncover(scrubbed(shot, zone.in), shot, shot.dataset.side === 'r' ? 'right' : 'left', 0, 1);
      if (shot.dataset.kind === 'run' && pola) {
        tl.add(develop(pola, 0.6), 0);
        write(tl, $$('.pen-cap .ch', pola), 0.45, 0.3);
        lap(shot)(tl, 0.35, 0.65);
      } else if (shot.dataset.kind === 'work' && pola) {
        tl.add(develop(pola, 1), 0);
      } else if (shot.dataset.kind === 'dots') {
        const dots = dotsFor($<HTMLCanvasElement>('canvas', shot), DOTS.mobile);
        const masks = shot.dataset.cue === 'masks';
        const state = { gather: masks ? 0 : 1, variant: masks ? 0 : 3, morph: 0 };
        const draw = () => dots.draw(state);
        draw();
        // The face gathers and its mask flicks through the custom versions; then, on the pivot, the
        // face streams into a footprint.
        if (masks) tl.to(state, { gather: 1, duration: 0.55, ease: 'power2.out', onUpdate: draw }, 0).to(state, { variant: 3, duration: 0.45, onUpdate: draw }, 0.55);
        else tl.to(state, { morph: 1, duration: 1, ease: 'power1.inOut', onUpdate: draw }, 0);
      }
    }
    return;
  }

  const visual = $('.visual', scene);
  const run = $('.run .pola', visual);
  const work = $('.work .pola', visual);
  const canvas = $<HTMLCanvasElement>('.dots', visual);
  const dots = dotsFor(canvas, DOTS.desktop);
  const drawLap = lap(visual);
  gsap.set(canvas, { opacity: 0 });

  // While the scene is on screen and the dots are showing, they follow whatever the phrases have
  // set; Dots only draws when that has changed, so dots at rest cost nothing.
  const state = { gather: 0, variant: 0, morph: 0 };
  const draw = () => {
    if (Number(gsap.getProperty(canvas, 'opacity')) > 0) dots.draw(state);
  };
  ScrollTrigger.create({
    trigger: scene,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? gsap.ticker.add(draw) : gsap.ticker.remove(draw)),
  });

  // Each print is uncovered on its inner wrapper and covered up again on its outer one, so no
  // element is driven by two scroll animations. The run club print comes in from the right,
  // develops, and has its lap drawn round it.
  const first = cue('lap');
  wipeIn(first, $('.run-in', visual), 'right', PAD.lap, 0, 0.35);
  first.add(develop(run, 0.6), 0.1);
  write(first, $$('.pen-cap .ch', run), 0.5, 0.3);
  drawLap(first, 0.35, 0.65);
  // Where Max comes in, the run club print and its lap are wiped away to the left as the workshop
  // print is uncovered from the right in the same place, and develops.
  const max = cue('max');
  wipeOut(max, $('.run', visual), 'left', PAD.lap, 0, 0.45);
  wipeIn(max, $('.work-in', visual), 'right', PAD.print, 0, 0.45);
  max.add(develop(work, 0.6), 0.2);
  // The workshop print is wiped away upwards, and a face gathers from the dots, its mask flicking
  // through the custom versions.
  const masks = cue('masks');
  wipeOut(masks, $('.work', visual), 'top', PAD.print, 0, 0.3);
  masks
    .to(canvas, { opacity: 1, duration: 0.18 }, 0.2)
    .to(state, { gather: 1, duration: 0.4, ease: 'power2.out' }, 0.24)
    .to(state, { variant: 3, duration: 0.36 }, 0.64);
  // The pivot: the face streams into a footprint.
  cue('pivot').to(state, { morph: 1, duration: 1, ease: 'power1.inOut' }, 0);
}

/**
 * 6. Personal: one interest after another, zigzagging down the page. Its title, its line and its
 * proof are wiped in as they come in, and each print is uncovered from the bottom and develops as it
 * comes up the screen. The words and the prints move together with the page: nothing is sticky and
 * nothing lags.
 */
function personal() {
  const scene = $('.personal');
  for (const el of $$('.p-intro .lead, .t-text h3, .t-text .love, .t-text .detail', scene)) {
    wipeIn(scrubbed(el, zone.in), el, 'left', PAD.text, 0, 1);
  }
  for (const gp of $$('.gp', scene)) {
    const pola = $('.pola', gp);
    const tl = scrubbed(gp, PRINT_ZONE);
    uncover(tl, $('.gp-in', gp), 'bottom', 0, 0.45);
    tl.add(develop(pola, 0.8), 0.1);
    write(tl, $$('.pen-cap .ch', pola), 0.75, 0.25);
  }
}

/** 7. Ending: the contact line is written in ballpoint, and the name rises as a wordmark along the bottom. */
function ending() {
  const scene = $('.ending');
  gsap.fromTo(
    $$('.contact-line .ch', scene),
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.1,
      stagger: 0.022,
      ease: 'none',
      scrollTrigger: { trigger: scene, start: 'top 60%', toggleActions: 'play none none reverse' },
    },
  );
  gsap.from($$('.wordmark .c', scene), {
    yPercent: 100,
    ease: 'none',
    stagger: 0.05,
    scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
}

// Last, so the helpers above are defined before anything runs.
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) start();
