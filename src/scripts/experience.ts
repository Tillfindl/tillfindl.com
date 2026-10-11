/*
 * The interactive version's motion.
 *
 * The first scroll is one quick, automatic move from the opening to where the first scene's words
 * begin; scrolling back up from there returns to the top the same way. After that the page goes at
 * the reader's pace. The words are in the normal page flow, so they move exactly with the scroll,
 * and every picture is driven by the phrase passing it (a "cue"), so text and pictures stay in
 * step and something moves for every bit of scrolling. On top of that each scene drifts a little
 * the whole time it is on screen. Only the Personal row still pins, because it moves sideways.
 *
 * Everything is scrubbed by the scroll, so scrolling back plays it in reverse. Lenis smooths the
 * wheel (touch stays native). The hero plays on CSS (Experience.astro) and needs nothing from here
 * until you scroll. Nothing is rotated. With reduced motion nothing here runs and the page reads as
 * a plain page.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis, { type VirtualScrollData } from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger);

/** How smooth the wheel is (Lenis lerp): higher follows the wheel more tightly. */
const LERP = 0.12;
/** How far scrubbed animations trail the scroll, in seconds: just enough to round off a wheel's steps. */
const SCRUB = 0.3;
/** How long the automatic move between the opening and the first scene takes, in seconds. */
const FIRST_MOVE = 0.9;
/** Scrolling up less than this much of a screen from the first scene settles back instead of going to the top. */
const NUDGE = 0.12;
/** After an automatic move, a wheel's leftover momentum is ignored for this long, in milliseconds. */
const QUIET = 450;
/** The trip back to the top: how long the page swooshes out and in, how far (in screens) and how much it blurs. */
const BACK = { out: 0.32, in: 0.5, travel: 0.3, blur: 24 };
/**
 * While a scene scrolls in or out, its picture lags the scroll by these fractions of the distance,
 * so it arrives early and leaves late and there is never an empty screen between scenes. On a phone
 * it only leaves late: arriving early, it would run into the phrases below it.
 */
const GLIDE = { desktop: { in: 0.5, out: 0.25 }, mobile: { in: 0, out: 0.3 } };
/**
 * Where a phrase fades in and out, where its pen underlines are drawn, and the stretch over which it
 * sets its picture moving, as ScrollTrigger [start, end] pairs. On a phone the phrases are read in
 * the lower half of the screen and fade out before they reach the picture in the upper half.
 */
const ZONES = {
  desktop: { in: ['top 96%', 'top 76%'], out: ['bottom 26%', 'bottom 6%'], line: ['top 82%', 'top 60%'], cue: ['top 86%', 'top 42%'] },
  mobile: { in: ['top 99%', 'top 86%'], out: ['bottom 64%', 'bottom 53%'], line: ['top 94%', 'top 76%'], cue: ['top 97%', 'top 60%'] },
};
/**
 * The Personal row glides in ahead of the scroll by this fraction of the distance, on a phone as
 * well: its prints sit in the middle of the screen, and would otherwise arrive only after the dots
 * above it have gone.
 */
const ROW_GLIDE = 0.4;
/** How far the drawing zooms in on the phone once the windows are in it, so its screens can be read. */
const PHONE_ZOOM = { desktop: 1.2, mobile: 1.7 };
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
/** How far each window floats while the scene is on screen, per unit of depth, in drawing units. */
const FLOAT = { x: 5, y: 16 };
/**
 * The pen line as one stroke, then broken in the middle (dash, gap, dash, then nothing). The final
 * gap is longer than the line, so no dash starts at its end, where a round cap would leave a dot.
 */
const WHOLE = '0.5 0 0.5 2';
const BROKEN = '0.3 0.4 0.3 2';

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

/** The current layout's glide and phrase zones (see GLIDE and ZONES). */
let glide = GLIDE.desktop;
let zone = ZONES.desktop;

let lenis: Lenis;
/** Where the first scene has settled: the end of the automatic first move. */
let firstStop = 0;
/** True while the page moves by itself (the first move, the trip back to the top); scrolling waits. */
let moving = false;
/** Until when (performance.now()) a wheel's leftover momentum is ignored after an automatic move. */
let quietUntil = 0;
let settleTimer = 0;

function start() {
  lenis = new Lenis({ lerp: LERP, virtualScroll: intent });
  lenis.on('scroll', () => {
    ScrollTrigger.update();
    watchFirstMove();
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // For checking the scenes in screenshots: jump anywhere without the smoothing.
  Object.assign(window, { __xp: { lenis, gsap, ScrollTrigger } });

  for (const a of $$<HTMLAnchorElement>('a[href="#top"]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      backToTop();
    });
  }

  const dots = new Dots($<HTMLCanvasElement>('.dots'), window.innerWidth < 832 ? 900 : 1500, PEN_RGB);

  // The scenes differ a little between phone and desktop, so they are rebuilt when the layout
  // changes. All of them are made here, in page order, so the Personal pin is measured after
  // everything above it.
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 52rem)', mobile: '(max-width: 51.99rem)' }, (ctx) => {
    const desktop = !!ctx.conditions?.desktop;
    glide = desktop ? GLIDE.desktop : GLIDE.mobile;
    zone = desktop ? ZONES.desktop : ZONES.mobile;
    opening(desktop);
    phrases();
    medicine();
    care(desktop);
    eigen(dots);
    personal();
    ending();
    chrome();
  });

  const measure = () => {
    firstStop = Math.round($('.medicine').getBoundingClientRect().top + lenis.scroll);
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  window.addEventListener('resize', () => dots.resize());
  // The handwriting font changes how tall the text is, so measure again once it has arrived.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- The first move ---------- */

/**
 * Every wheel and touch movement passes through here before Lenis sees it (Lenis's virtualScroll
 * hook; returning false stops it). At the top, the first movement down starts the automatic move to
 * the first scene. With a wheel, a movement up at or above the first scene starts the move back to
 * the top. A touch going up is left to scroll natively (a touch that has started scrolling can no
 * longer be stopped) and settles once it comes to rest (watchFirstMove). While the page moves by
 * itself, input is held.
 */
function intent({ deltaY, event }: VirtualScrollData) {
  const hold = () => {
    if (event.cancelable) event.preventDefault();
    return false;
  };
  if (moving) return hold();
  // A lifted finger may leave the page between the top and the first scene with nothing more to
  // scroll it; check once Lenis has noted the touch has ended.
  if (event.type === 'touchend') window.setTimeout(watchFirstMove, 30);
  if (firstStop <= 0 || deltaY === 0) return true;
  const wheel = event.type === 'wheel';
  if (wheel && performance.now() < quietUntil) return hold();
  const y = lenis.scroll;
  if (deltaY > 0 && y < 2 && (wheel || event.type === 'touchmove')) {
    move(firstStop);
    return hold();
  }
  if (wheel && deltaY > 0 && y < firstStop - 1) {
    move(firstStop);
    return hold();
  }
  if (wheel && deltaY < 0 && y > 0 && y <= firstStop + 1) {
    move(0);
    return hold();
  }
  return true;
}

/**
 * When scrolling comes to rest between the top and the first scene (after a flick, the keyboard or
 * the scrollbar), finish the move in the direction it was going.
 */
function watchFirstMove() {
  if (moving) return;
  window.clearTimeout(settleTimer);
  const y = lenis.scroll;
  if (y <= 1 || y >= firstStop - 1) return;
  const direction = lenis.direction;
  settleTimer = window.setTimeout(() => {
    const now = lenis.scroll;
    if (moving || lenis.isTouching || now <= 1 || now >= firstStop - 1) return;
    const back = direction < 0 && now < firstStop - window.innerHeight * NUDGE;
    move(back ? 0 : firstStop);
  }, 140);
}

/** Moves the page by itself to `target`, easing in and out, with scrolling held until it arrives. */
function move(target: number) {
  moving = true;
  lenis.scrollTo(target, {
    duration: FIRST_MOVE,
    easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    lock: true,
    force: true,
    onComplete: () => {
      moving = false;
      quietUntil = performance.now() + QUIET;
    },
  });
}

/**
 * Back to the top by the most direct route: what is on screen swooshes down with a vertical motion
 * blur, the page jumps to the top while blurred, and the opening slides in sharp again. Only what is
 * on screen moves, and only elements nothing else animates (the scenes' wrappers, the sticky
 * pictures and the phrases), so the blur stays cheap and no scroll animation is disturbed.
 */
function backToTop() {
  if (moving) return;
  moving = true;
  const vh = window.innerHeight;
  const blur = $('#motion-blur feGaussianBlur');
  const fx = { blur: 0 };
  const setBlur = () => blur.setAttribute('stdDeviation', `0 ${fx.blur.toFixed(2)}`);
  const onScreen = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh;
  };
  const leaving = $$('.opening, .scene .visual, .script .phr, .personal, .ending').filter(onScreen);
  const arriving = $$('.opening');
  gsap
    .timeline({
      onComplete: () => {
        gsap.set(arriving, { clearProps: 'transform,filter' });
        moving = false;
      },
    })
    .set(leaving, { filter: 'url(#motion-blur)' })
    .to(leaving, { y: vh * BACK.travel, duration: BACK.out, ease: 'power2.in' }, 0)
    .to(fx, { blur: BACK.blur, duration: BACK.out, ease: 'power2.in', onUpdate: setBlur }, 0)
    .add(() => {
      gsap.set(leaving, { clearProps: 'transform,filter' });
      lenis.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.update();
      gsap.set(arriving, { y: -vh * BACK.travel, filter: 'url(#motion-blur)' });
    })
    .to(arriving, { y: 0, duration: BACK.in, ease: 'power3.out' })
    .to(fx, { blur: 0, duration: BACK.in, ease: 'power3.out', onUpdate: setBlur }, '<');
}

/* ---------- Building blocks ---------- */

/** A timeline scrubbed while `phrase` crosses the screen: the stretch where it sets its picture moving. */
function cue(name: string) {
  const phrase = $(`.phr[data-cue="${name}"]`);
  if (!phrase) throw new Error(`No phrase for cue "${name}"`);
  return gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: phrase, start: zone.cue[0], end: zone.cue[1], scrub: SCRUB } });
}

/** A timeline scrubbed for as long as `scene` is anywhere on screen: for the drift that keeps it alive. */
const drift = (scene: Element) =>
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: SCRUB } });

/**
 * On a wide screen a scene's picture glides in ahead of the scroll and out behind it. The opening,
 * already on screen when the page opens, only glides out.
 */
function glideScene(scene: Element, picture: Element = $('.v-in', scene), arrives = true) {
  if (arrives && glide.in > 0) {
    gsap.fromTo(
      picture,
      { y: () => -glide.in * 0.9 * window.innerHeight },
      { y: 0, ease: 'none', scrollTrigger: { trigger: scene, start: 'top 90%', end: 'top top', scrub: SCRUB, invalidateOnRefresh: true } },
    );
  }
  // yPercent, so it never contends with the glide in, which moves the same element by y.
  if (glide.out > 0) {
    gsap.fromTo(
      picture,
      { yPercent: 0 },
      {
        yPercent: () => glide.out * 100,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { trigger: scene, start: 'bottom bottom', end: 'bottom top', scrub: SCRUB, invalidateOnRefresh: true },
      },
    );
  }
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
 * Every phrase fades in as it comes up, fades out as it leaves, and draws its pen underlines as it
 * arrives, one after another. The fade in is on the phrase and the fade out on its inner element,
 * so the two never drive the same property.
 */
function phrases() {
  for (const phrase of $$('.script .phr')) {
    gsap.fromTo(phrase, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: phrase, start: zone.in[0], end: zone.in[1], scrub: true } });
    gsap.fromTo(
      $('.phr-in', phrase),
      { opacity: 1 },
      { opacity: 0, ease: 'none', scrollTrigger: { trigger: phrase, start: zone.out[0], end: zone.out[1], scrub: true } },
    );
    const lines = $$('.u-line', phrase);
    if (!lines.length) continue;
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: phrase, start: zone.line[0], end: zone.line[1], scrub: true } });
    // Explicit from and to values: GSAP cannot blend a clip path it has to read from the stylesheet.
    lines.forEach((line, i) => tl.fromTo(line, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i * 0.85));
  }
}

/* ---------- The scenes ---------- */

/**
 * 1. The opening plays on CSS. Scrolling only clears it: the notes drift apart and fade, and the
 * print steps back. The elements with CSS animations (the letters, the logo, the print) are left
 * alone, because an animation's fill would override what GSAP writes; their wrappers move. It holds
 * still with CSS (a sticky stage) rather than a pin: a pin wraps the scene in a new element, and
 * moving it restarts its CSS animations, so on a slow load the print would come out twice.
 */
function opening(desktop: boolean) {
  const scene = $('.opening');
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: SCRUB } })
    .fromTo('.o-pen-a p', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '-4vw' : 0, y: desktop ? 0 : '-3vh', opacity: 0, immediateRender: false }, 0)
    .fromTo('.o-pen-b p', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '4vw' : 0, y: desktop ? 0 : '3vh', opacity: 0, immediateRender: false }, 0)
    .fromTo('.eject', { scale: 1, y: 0 }, { scale: 0.9, y: '-4vh', immediateRender: false }, 0)
    .fromTo('.o-head', { opacity: 1 }, { opacity: 0, duration: 0.5, immediateRender: false }, 0);
  glideScene(scene, $('.stage', scene), false);
}

/** 2. Medicine: three dark prints are laid down as the scene comes in, and each develops with its phrase. */
function medicine() {
  const scene = $('.medicine');
  const shots = $$('.mp', scene);
  const polas = shots.map((s) => $('.pola', s));
  glideScene(scene);

  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 95%', end: 'top 30%', scrub: SCRUB } })
    .from(shots, { y: '12vh', opacity: 0, duration: 0.5, stagger: 0.25, ease: 'power2.out' }, 0);
  polas.forEach((pola, i) => {
    const tl = cue(`med-${i + 1}`).add(develop(pola, 0.8), 0);
    write(tl, $$('.pen-cap .ch', pola), 0.6, 0.4);
  });
  // The prints drift at different speeds the whole time the scene is on screen.
  const travel = [6, 10, 4];
  drift(scene).fromTo(polas, { yPercent: (i) => travel[i] }, { yPercent: (i) => -travel[i], duration: 1 }, 0);
}

/**
 * 3 and 4. The wards and Bounceback, as one pen drawing. The doctor and the patient are drawn as the
 * scene comes in, joined by a glowing line. Then each phrase moves it on: the windows pile up around
 * the doctor, the patient walks off, the line loses its glow and breaks, the windows are swept into a
 * phone, and Bounceback plays on its screens. The windows float the whole time.
 */
function care(desktop: boolean) {
  const scene = $('.care');
  const drawing = $('.drawing', scene);
  const figures = $$('.doctor .draw, .patient .draw', scene);
  const patient = $<SVGGElement>('.patient', scene);
  const link = $<SVGPathElement>('.link-line', scene);
  const glow = $<SVGPathElement>('.link-glow', scene);
  const wins = $$<SVGGElement>('.win', scene);
  const phone = $$('.phone > .ink .draw', scene);
  const screens = $$('.ph', scene);
  const noteLines = $$('.note-line', scene);

  undrawn([...figures, ...phone, ...wins.flatMap((w) => $$('.draw', w))]);
  gsap.set([link, glow], { attr: { 'stroke-dasharray': WHOLE, 'stroke-dashoffset': 1 } });
  gsap.set($$('.label', drawing), { opacity: 0 });
  gsap.set([...screens, ...noteLines], { opacity: 0 });
  glideScene(scene);

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

  // Drawn as the scene comes in: the doctor and the patient, then the line between them.
  const enter = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 92%', end: 'top 12%', scrub: SCRUB } });
  drawOn(enter, figures, 0, 0.8);
  enter.to([link, glow], { attr: { 'stroke-dashoffset': 0 }, duration: 0.2, ease: 'power1.inOut' }, 0.8);

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
  // They float the whole time, the nearer ones further, which is what gives the pile its depth.
  const depth = (el: Element) => Number((el.closest('.win') as HTMLElement | null)?.dataset.d ?? 1);
  drift(scene).fromTo(
    $$('.drift', scene),
    { x: (_, el) => -depth(el) * FLOAT.x, y: (_, el) => depth(el) * FLOAT.y },
    { x: (_, el) => depth(el) * FLOAT.x, y: (_, el) => -depth(el) * FLOAT.y, duration: 1 },
    0,
  );

  // "And once patients went home,": the patient walks off and the line loses its glow.
  cue('leave').to(walk, { t: 1, duration: 1, ease: 'power1.inOut', onUpdate: placePatient }, 0).to(glow, { opacity: 0, duration: 0.8 }, 0.1);
  // "they were mostly on their own.": the line breaks.
  cue('break').to(link, { attr: { 'stroke-dasharray': BROKEN }, duration: 1, ease: 'power2.out' }, 0);

  // "So with my team in Vienna I started Bounceback:": the clutter is swept into one phone, the
  // people go with it, and the drawing closes in on the phone so its screens can be read.
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
      scale: desktop ? PHONE_ZOOM.desktop : PHONE_ZOOM.mobile,
      transformOrigin: `${(PHONE_CENTRE.x / 560) * 100}% ${(PHONE_CENTRE.y / 520) * 100}%`,
      duration: 0.5,
      ease: 'power2.inOut',
    },
    0.45,
  );
  sweep.to(screens[0], { opacity: 1, duration: 0.15 }, 0.85);

  // The phone's screens, one after another. A screen comes in on its outer group and leaves on its
  // inner one, because the phrase that brings it is not always the phrase that takes it away.
  const swap = (tl: gsap.core.Timeline, from: number, to: number, at: number) =>
    tl
      .to($('.ph-o', screens[from]), { opacity: 0, x: -10, duration: 0.15 }, at)
      .fromTo(screens[to], { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.15, immediateRender: false }, at + 0.06);
  const a = cue('screens-a');
  swap(a, 0, 1, 0);
  // Filming a set: the figure squats a few times while the recording light blinks.
  a.to('.squat', { scaleY: 0.84, svgOrigin: '280 318', duration: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.2).to(
    '.rec',
    { opacity: 0.2, duration: 0.06, yoyo: true, repeat: 5 },
    0.2,
  );
  swap(a, 1, 2, 0.7);
  const b = cue('screens-b');
  swap(b, 2, 3, 0);
  b.to(noteLines, { opacity: 1, duration: 0.12, stagger: 0.14 }, 0.2);
  swap(b, 3, 4, 0.75);
}

/**
 * 5. Eigen: the run club print develops and a lap is drawn round it; the workshop print is laid down
 * with Max; then the prints give way to the dots: a face, the mask's versions, and the footprint.
 */
function eigen(dots: Dots) {
  const scene = $('.eigen');
  const run = $('.run .pola', scene);
  const work = $('.work .pola', scene);
  const path = $<SVGPathElement>('.route-path', scene);
  const runner = $<SVGCircleElement>('.runner', scene);
  const len = path.getTotalLength();

  gsap.set(path, { attr: { 'stroke-dasharray': `${len} ${len * 2}`, 'stroke-dashoffset': len } });
  gsap.set(['.dots', runner], { opacity: 0 });
  glideScene(scene);

  // The dots are drawn on every frame while the scene is on screen, so they breathe a little and
  // follow whatever the phrases have set; the runner keeps to its place on the lap.
  const state = { gather: 0, variant: 0, morph: 0, route: 0, time: 0 };
  const draw = (t: number) => {
    state.time = t;
    dots.draw(state);
    const p = path.getPointAtLength(len * state.route);
    runner.setAttribute('cx', String(p.x));
    runner.setAttribute('cy', String(p.y));
  };
  ScrollTrigger.create({
    trigger: scene,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? gsap.ticker.add(draw) : gsap.ticker.remove(draw)),
  });

  const first = cue('eigen-1').add(develop(run, 0.8), 0);
  write(first, $$('.pen-cap .ch', run), 0.6, 0.4);
  cue('lap')
    .to(runner, { opacity: 1, duration: 0.05 }, 0)
    .to(path, { attr: { 'stroke-dashoffset': 0 }, duration: 1 }, 0)
    .to(state, { route: 1, duration: 1 }, 0);
  cue('max')
    .from('.work-in', { y: '14vh', opacity: 0, duration: 0.5, ease: 'power2.out' }, 0)
    .add(develop(work, 0.7), 0.3);
  // The prints give way to the dots. Their children move, so nothing else drives those elements.
  cue('masks')
    .to(['.run-in > *', '.work-in > *'], { y: '-110vh', duration: 0.45, ease: 'power3.in', stagger: 0.05 }, 0)
    .to('.dots', { opacity: 1, duration: 0.25 }, 0.3)
    .to(state, { gather: 1, duration: 0.6, ease: 'power2.out' }, 0.35);
  // Quick iterations: the mask flicks through its versions. Then the pivot: the face streams into a footprint.
  cue('iterate').to(state, { variant: 3, duration: 1 }, 0);
  cue('pivot').to(state, { morph: 1, duration: 1, ease: 'power1.inOut' }, 0);
  // The run club print drifts while it is on screen.
  drift(scene).fromTo('.run-in', { yPercent: 5 }, { yPercent: -5, duration: 1 }, 0);
}

/**
 * 6. Personal: the scene pins and scrolling moves a row sideways. Each interest's title is written
 * as it comes in, and each print develops as it crosses the screen. Its photos are fetched and
 * decoded well before it arrives, so nothing stutters on the first pass.
 */
function personal() {
  const scene = $('.personal');
  const track = $('.track', scene);

  const preload = () => {
    for (const img of $$<HTMLImageElement>('img', scene)) {
      img.loading = 'eager';
      img.decode().catch(() => {});
    }
  };
  ScrollTrigger.create({ trigger: scene, start: 'top 400%', end: 'max', once: true, onEnter: preload });

  gsap.fromTo(
    $('.row-stage', scene),
    { y: () => -ROW_GLIDE * 0.9 * window.innerHeight },
    { y: 0, ease: 'none', scrollTrigger: { trigger: scene, start: 'top 90%', end: 'top top', scrub: SCRUB, invalidateOnRefresh: true } },
  );
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top 95%', end: 'top 45%', scrub: SCRUB } })
    .from($$('.p-intro > *', scene), { opacity: 0, duration: 0.6, stagger: 0.3 }, 0);

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const slide = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: { trigger: scene, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: SCRUB, invalidateOnRefresh: true },
  });
  const along = (trigger: Element, start: string, end: string) =>
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, containerAnimation: slide, start, end, scrub: SCRUB } });

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
  // Half the glide: the row of prints above it does not glide out, so the words would run into it.
  if (glide.in > 0) {
    gsap.fromTo(
      $('.end-inner', scene),
      { y: () => -glide.in * 0.5 * 0.9 * window.innerHeight },
      { y: 0, ease: 'none', scrollTrigger: { trigger: scene, start: 'top 90%', end: 'top top', scrub: SCRUB, invalidateOnRefresh: true } },
    );
  }
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
    scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom bottom', scrub: SCRUB },
  });
}

// Last, so the helpers above are defined before anything runs.
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) start();
