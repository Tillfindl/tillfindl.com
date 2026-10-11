/*
 * The interactive version's motion.
 *
 * Scrolling is the browser's own. Nothing takes it over, so the page always moves exactly with the
 * finger and the browser can scroll on its own thread; on a phone or tablet nothing here even
 * listens to touches. Lenis only smooths a mouse wheel's steps on a desktop.
 *
 * Every animation is tied straight to the scroll position (scrub: true), with no lag. The words are
 * in the normal page flow and move with the page. In Medicine each phrase has its own print beside
 * it, which scrolls past a little slower than the words. The other scenes are a sticky picture that
 * changes only while one of its phrases passes it (a "cue"); between scenes the pictures leave and
 * arrive with the page. The Personal row is sticky too, and moves sideways by as much as its section
 * has scrolled. Scrolling back plays it all in reverse.
 *
 * The hero plays on CSS and needs nothing from here until you scroll. Nothing is rotated. With
 * reduced motion nothing here runs and the page reads as a plain page.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger);

/** How smooth a mouse wheel is on a desktop (Lenis lerp): higher follows the wheel more tightly. */
const LERP = 0.12;
/**
 * The trip back to the top: how long the page swooshes out and in, how far (in screens), and how
 * much it blurs, along the scroll with a wheel and as a plain blur on a phone (in pixels).
 */
const BACK = { out: 0.32, in: 0.5, travel: 0.3, blur: 24, phoneBlur: 6 };

type Range = [string, string];
/**
 * Where a phrase fades in and out, where its pen underlines are drawn, and the stretch over which it
 * sets its picture moving, as ScrollTrigger [start, end] pairs. On a phone the phrases come up from
 * the bottom of the screen and slip under the soft lower edge of the picture panel, so they need no
 * fades, and a phrase sets its picture moving while it crosses the lower half.
 */
const ZONES: { desktop: { in: Range; out: Range; line: Range; cue: Range }; mobile: { line: Range; cue: Range } } = {
  desktop: { in: ['top 96%', 'top 76%'], out: ['bottom 26%', 'bottom 6%'], line: ['top 82%', 'top 60%'], cue: ['top 86%', 'top 42%'] },
  mobile: { line: ['top 92%', 'top 72%'], cue: ['top 90%', 'top 62%'] },
};
/**
 * How far a Medicine print lags its phrase, in screen heights either way: it starts this much
 * higher and ends this much lower, so it moves a little slower than the words. Less on a phone,
 * where the print sits just above its phrase.
 */
const LAG = { desktop: 0.1, mobile: 0.03 };
/** How far the drawing zooms in on its phone, so the screens can be read (on a phone, at most). */
const PHONE_ZOOM = { desktop: 1.2, mobile: 1.9 };
/** On a phone, the zoomed-in phone fills at most this much of the picture panel's height. */
const PHONE_FILL = 0.9;
/** How many dots make the face and the footprint: fewer on a phone, where each frame costs more. */
const DOTS = { desktop: 1500, mobile: 650 };
/** How long after the page has loaded (the hero has settled by then) every photo is fetched, in ms. */
const PRELOAD_AFTER = 2500;
/** The ballpoint blue, as RGB for the dots' canvas. */
const PEN_RGB = '47 51 148';

/* Points in the wards drawing (WardsDrawing.astro), in its 560 × 520 units. */
/** Where the windows are swept to: the middle of the phone. */
const PHONE_CENTRE = { x: 280, y: 256 };
/** How tall the phone is. */
const PHONE_HEIGHT = 304;
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
let zone: { line: Range; cue: Range } = ZONES.desktop;

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

  const desktopQuery = '(min-width: 52rem)';
  const dots = new Dots($<HTMLCanvasElement>('.dots'), window.matchMedia(desktopQuery).matches ? DOTS.desktop : DOTS.mobile, PEN_RGB);

  // The Personal section is as much taller than the screen as its row is wider, set before
  // anything is measured.
  sizeRow();
  ScrollTrigger.addEventListener('refreshInit', sizeRow);

  // The scenes differ a little between phone and desktop, so they are rebuilt when the layout
  // changes. All of them are made here, in page order.
  const mm = gsap.matchMedia();
  mm.add({ desktop: desktopQuery, mobile: '(max-width: 51.99rem)' }, (ctx) => {
    const desktop = !!ctx.conditions?.desktop;
    zone = desktop ? ZONES.desktop : ZONES.mobile;
    opening(desktop);
    phrases(desktop);
    medicine(desktop);
    care(desktop);
    eigen(dots);
    personal();
    ending();
    chrome();
  });

  window.addEventListener('resize', () => dots.resize());
  // The handwriting font changes how tall the text is, so measure again once it has arrived.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  preloadPhotos();
}

/** Jumps straight to `y`, with no smoothing. */
function jump(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'instant' });
  ScrollTrigger.update();
}

/**
 * Every photo on the page is fetched and decoded in the background once the hero has settled, a few
 * at a time, so none is decoded while it scrolls into view.
 */
function preloadPhotos() {
  const queue = $$<HTMLImageElement>('.xp img');
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
  const leaving = $$('.opening, .pairs .pair, .scene .visual, .script .phr, .personal, .ending').filter(onScreen);
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

/** A timeline scrubbed while `phrase` crosses the screen: the stretch where it sets its picture moving. */
function cue(name: string) {
  const phrase = $(`.phr[data-cue="${name}"]`);
  if (!phrase) throw new Error(`No phrase for cue "${name}"`);
  return gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: phrase, start: zone.cue[0], end: zone.cue[1], scrub: true } });
}

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
    start: () => window.innerHeight * 0.5,
    refreshPriority: -2,
    onEnter: () => gsap.to(hudName, { autoAlpha: 1, duration: 0.4 }),
    onLeaveBack: () => gsap.to(hudName, { autoAlpha: 0, duration: 0.3 }),
  });
}

/**
 * Every phrase draws its pen underlines as it arrives, one after another. On a desktop, where the
 * phrases lie over the pictures, they also fade in as they come up and out as they leave; the fade
 * in is on the phrase and the fade out on its inner element, so the two never drive the same
 * property.
 */
function phrases(desktop: boolean) {
  for (const phrase of $$('.script .phr')) {
    if (desktop) {
      const { in: fadeIn, out: fadeOut } = ZONES.desktop;
      gsap.fromTo(phrase, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: phrase, start: fadeIn[0], end: fadeIn[1], scrub: true } });
      gsap.fromTo(
        $('.phr-in', phrase),
        { opacity: 1 },
        { opacity: 0, ease: 'none', scrollTrigger: { trigger: phrase, start: fadeOut[0], end: fadeOut[1], scrub: true } },
      );
    }
    const lines = $$('.u-line', phrase);
    if (!lines.length) continue;
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: phrase, start: zone.line[0], end: zone.line[1], scrub: true } });
    // Explicit from and to values: GSAP cannot blend a clip path it has to read from the stylesheet.
    lines.forEach((line, i) => tl.fromTo(line, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i * 0.85));
  }
}

/* ---------- The scenes ---------- */

/**
 * 1. The opening plays on CSS. On a desktop it holds briefly while scrolling clears it: the notes
 * drift apart and fade, and the print steps back. On a phone it does not hold, so the first swipe
 * simply scrolls it away. The elements with CSS animations (the letters, the logo, the print) are
 * left alone, because an animation's fill would override what GSAP writes; their wrappers move.
 */
function opening(desktop: boolean) {
  if (!desktop) return;
  const scene = $('.opening');
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: true } })
    .fromTo('.o-pen-a p', { x: 0, opacity: 1 }, { x: '-4vw', opacity: 0, immediateRender: false }, 0)
    .fromTo('.o-pen-b p', { x: 0, opacity: 1 }, { x: '4vw', opacity: 0, immediateRender: false }, 0)
    .fromTo('.eject', { scale: 1, y: 0 }, { scale: 0.9, y: '-4vh', immediateRender: false }, 0)
    .fromTo('.o-head', { opacity: 1 }, { opacity: 0, duration: 0.5, immediateRender: false }, 0);
}

/**
 * 2. Medicine: each phrase with its own print. The print scrolls past with its phrase but a little
 * slower (LAG), develops as it comes up the screen, and has its caption written last. Nothing is
 * laid down or pinned: the pairs simply go by with the page.
 */
function medicine(desktop: boolean) {
  const lag = desktop ? LAG.desktop : LAG.mobile;
  for (const pair of $$('.medicine .pair')) {
    const print = $('.pp-in', pair);
    const pola = $('.pola', print);
    gsap.fromTo(
      print,
      { y: () => -lag * window.innerHeight },
      { y: () => lag * window.innerHeight, ease: 'none', scrollTrigger: { trigger: pair, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } },
    );
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: print, start: 'top 95%', end: 'top 45%', scrub: true } });
    tl.add(develop(pola, 0.8), 0);
    write(tl, $$('.pen-cap .ch', pola), 0.65, 0.35);
  }
}

/**
 * 3 and 4. The wards and Bounceback, as one pen drawing. The doctor and the patient are drawn as the
 * scene comes in, joined by a glowing line. Then each phrase moves it on: the windows pile up around
 * the doctor, the patient walks off, the line loses its glow and breaks, the windows are swept into a
 * phone, and Bounceback plays on its screens.
 */
function care(desktop: boolean) {
  const scene = $('.care');
  const drawing = $('.drawing', scene);
  const figures = $$('.doctor .draw, .patient .draw', scene);
  const patient = $<SVGGElement>('.patient', scene);
  const link = $<SVGPathElement>('.link-line', scene);
  const glows = $$<SVGPathElement>('.link-glow', scene);
  const wins = $$<SVGGElement>('.win', scene);
  const phone = $$('.phone > .ink .draw', scene);
  const screens = $$('.ph', scene);
  const noteLines = $$('.note-line', scene);

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

  // Drawn as the scene comes in: the doctor and the patient, then the line between them.
  const enter = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 92%', end: 'top 12%', scrub: true } });
  drawOn(enter, figures, 0, 0.8);
  enter.to([link, ...glows], { attr: { 'stroke-dashoffset': 0 }, duration: 0.2, ease: 'power1.inOut' }, 0.8);

  // The windows pile up with the phrases. The three on "one program for imaging, another for notes,
  // another for prescriptions" come in with those words, in that order.
  for (const name of ['wards-1', 'wards-2', 'wards-3']) {
    const own = wins.filter((w) => w.dataset.cue === name);
    if (name === 'wards-3') own.sort((a, b) => Number(a.dataset.k) - Number(b.dataset.k));
    const tl = cue(name);
    own.forEach((w, i) => {
      const at = i / own.length;
      drawOn(tl, $$('.draw', w), at, 1 / own.length);
      tl.to($('.label', w), { opacity: 1, duration: 0.3 / own.length }, at + 0.6 / own.length);
    });
  }

  // "And once patients went home,": the patient walks off and the line loses its glow.
  cue('leave').to(walk, { t: 1, duration: 1, ease: 'power1.inOut', onUpdate: placePatient }, 0).to(glows, { opacity: 0, duration: 0.8 }, 0.1);
  // "they were mostly on their own.": the line breaks.
  cue('break').to(link, { attr: { 'stroke-dasharray': BROKEN }, duration: 1, ease: 'power2.out' }, 0);

  // "So with my team in Vienna I started Bounceback:": the clutter is swept into one phone, the
  // people go with it, and the drawing closes in on the phone so its screens can be read. On a
  // phone it closes in as far as the picture panel allows.
  const panel = $('.visual', scene).clientHeight;
  const phonePx = (PHONE_HEIGHT / 560) * (drawing.parentElement?.clientWidth ?? 560);
  const zoom = desktop ? PHONE_ZOOM.desktop : Math.min(PHONE_ZOOM.mobile, (panel * PHONE_FILL) / phonePx);
  const sweep = cue('sweep');
  wins.forEach((w, i) => {
    const cx = Number(w.dataset.cx);
    const cy = Number(w.dataset.cy);
    sweep
      .fromTo(
        w,
        { x: 0, y: 0, scale: 1, svgOrigin: `${cx} ${cy}` },
        { x: PHONE_CENTRE.x - cx, y: PHONE_CENTRE.y - cy, scale: 0.12, svgOrigin: `${cx} ${cy}`, duration: 0.5, ease: 'power3.in', immediateRender: false },
        i * 0.02,
      )
      .to(w, { opacity: 0, duration: 0.2 }, 0.38 + i * 0.02);
  });
  sweep.to(['.doctor', '.patient', '.link'], { opacity: 0, duration: 0.35 }, 0);
  drawOn(sweep, phone, 0.35, 0.45);
  sweep.to(
    drawing,
    {
      scale: zoom,
      transformOrigin: `${(PHONE_CENTRE.x / 560) * 100}% ${(PHONE_CENTRE.y / 520) * 100}%`,
      duration: 0.5,
      ease: 'power2.inOut',
    },
    0.45,
  );
  // "and we started with physio, where recovery depends on the exercises patients do at home.":
  // the phone shows the day's exercises.
  cue('home').to(screens[0], { opacity: 1, duration: 0.15 }, 0.2);

  // The phone's screens, one after another. A screen comes in on its outer group and leaves on its
  // inner one, because the phrase that brings it is not always the phrase that takes it away. Each
  // phrase's first change waits until the one before has finished its last, even when two phrases
  // are close together, so every screen is seen and two never show at once.
  const swap = (tl: gsap.core.Timeline, from: number, to: number, at: number) =>
    tl
      .to($('.ph-o', screens[from]), { opacity: 0, x: -10, duration: 0.15 }, at)
      .fromTo(screens[to], { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.15, immediateRender: false }, at + 0.06);
  const a = cue('screens-a');
  swap(a, 0, 1, 0.3);
  // Filming a set: the figure squats a few times while the recording light blinks.
  a.to('.squat', { scaleY: 0.84, svgOrigin: '280 318', duration: 0.05, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.44).to(
    '.rec',
    { opacity: 0.2, duration: 0.035, yoyo: true, repeat: 5 },
    0.44,
  );
  swap(a, 1, 2, 0.7);
  const b = cue('screens-b');
  swap(b, 2, 3, 0.3);
  b.to(noteLines, { opacity: 1, duration: 0.08, stagger: 0.1 }, 0.46);
  swap(b, 3, 4, 0.85);
}

/**
 * 5. Eigen: the run club print develops and a lap is drawn round it; the workshop print comes in
 * over its corner with Max; then the prints give way to the dots: a face for the CPAP masks, the
 * custom versions, and the footprint.
 */
function eigen(dots: Dots) {
  const scene = $('.eigen');
  const run = $('.run .pola', scene);
  const work = $('.work .pola', scene);
  const canvas = $('.dots', scene);
  const path = $<SVGPathElement>('.route-path', scene);
  const runner = $<SVGCircleElement>('.runner', scene);
  const len = path.getTotalLength();

  gsap.set(path, { attr: { 'stroke-dasharray': `${len} ${len * 2}`, 'stroke-dashoffset': len } });
  gsap.set([canvas, runner], { opacity: 0 });

  // While the scene is on screen and the dots are showing, they follow whatever the phrases have
  // set; Dots only draws when that has changed, so dots at rest cost nothing.
  const state = { gather: 0, variant: 0, morph: 0, route: 0 };
  const draw = () => {
    if (Number(gsap.getProperty(canvas, 'opacity')) > 0) dots.draw(state);
  };
  ScrollTrigger.create({
    trigger: scene,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? gsap.ticker.add(draw) : gsap.ticker.remove(draw)),
  });
  // The runner keeps to its place on the lap.
  const placeRunner = () => {
    const p = path.getPointAtLength(len * state.route);
    runner.setAttribute('cx', String(p.x));
    runner.setAttribute('cy', String(p.y));
  };

  const first = cue('eigen-1').add(develop(run, 0.8), 0);
  write(first, $$('.pen-cap .ch', run), 0.6, 0.4);
  cue('lap')
    .to(runner, { opacity: 1, duration: 0.05 }, 0)
    .to(path, { attr: { 'stroke-dashoffset': 0 }, duration: 1 }, 0)
    .to(state, { route: 1, duration: 1, onUpdate: placeRunner }, 0);
  // The workshop print comes in where it lies, and develops.
  cue('max').fromTo('.work-in', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0).add(develop(work, 0.7), 0.3);
  // The prints give way to the dots. Their children move, so nothing else drives those elements.
  cue('masks')
    .to(['.run-in > *', '.work-in > *'], { y: '-110vh', duration: 0.45, ease: 'power3.in', stagger: 0.05 }, 0)
    .to(canvas, { opacity: 1, duration: 0.25 }, 0.3)
    .to(state, { gather: 1, duration: 0.6, ease: 'power2.out' }, 0.35);
  // Quick iterations: the mask flicks through its versions. Then the pivot: the face streams into a footprint.
  cue('iterate').to(state, { variant: 3, duration: 1 }, 0);
  cue('pivot').to(state, { morph: 1, duration: 1, ease: 'power1.inOut' }, 0);
}

/** How far the Personal row moves sideways. */
const rowDistance = () => Math.max(0, $('.personal .track').scrollWidth - window.innerWidth);
/** The Personal section is this much taller than the screen, so moving the row takes that much scrolling. */
const sizeRow = () => $('.personal').style.setProperty('--row', `${rowDistance()}px`);

/**
 * 6. Personal: the row stays on screen (a sticky stage) and moves sideways by as much as the section
 * has scrolled. Each interest's title is written as it comes in, and each print develops as it
 * crosses the screen.
 */
function personal() {
  const scene = $('.personal');
  const track = $('.track', scene);

  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 95%', end: 'top 45%', scrub: true } })
    .from($$('.p-intro > *', scene), { opacity: 0, duration: 0.6, stagger: 0.3 }, 0);

  const slide = gsap.to(track, {
    x: () => -rowDistance(),
    ease: 'none',
    scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
  });
  const along = (trigger: Element, start: string, end: string) =>
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, containerAnimation: slide, start, end, scrub: true } });

  for (const h of $$('.g-text h3', scene)) write(along(h, 'left 95%', 'left 60%'), $$('.ch', h), 0, 1);
  // Each print has developed by the time it is a little way in, so the last ones finish too.
  for (const pola of $$('.gp .pola', scene)) {
    const tl = along(pola, 'left 100%', 'right 88%').add(develop(pola, 1), 0);
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
