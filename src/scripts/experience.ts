/*
 * The interactive version's motion. Smooth scrolling (Lenis) drives GSAP ScrollTrigger timelines,
 * one per scene: each scene pins while its timeline plays, scrubbed by the scroll position, so
 * scrolling back plays it in reverse. With reduced motion nothing here runs and the page reads as
 * a plain page (see Experience.astro).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import Lenis from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable);

/** How long each pinned scene lasts, in screen heights of scrolling. */
const LENGTH = { opening: 1.1, medicine: 4.5, care: 6.5, eigen: 5.5 };
/** How far the scrubbed animation lags behind the scroll, in seconds; the lag is what makes it feel smooth. */
const SCRUB = 1;
/** Colours the scenes move between. */
const PAPER = '#f3f0e8';
const DARK = '#121110';
const INK = '#171614';
/** Unread words in the wards scene, before they turn to ink. */
const UNREAD = '#c8c2b5';

/*
 * Clip shapes are always animated with explicit start and end values: browsers shorten repeated
 * inset values when reporting them ("inset(30% 34% round 14px)"), which would pair the wrong
 * numbers if GSAP read the start from the page.
 */
const clip = (t: number, r: number, b: number, l: number, round = 0) => `inset(${t}% ${r}% ${b}% ${l}% round ${round}px)`;

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  document.fonts.ready.then(start);
}

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

  cursor();
  const dots = new Dots($<HTMLCanvasElement>('.dots'), window.innerWidth < 832 ? 900 : 1500);

  // The pinned scenes differ a little between phone and desktop; they are rebuilt when the layout changes.
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 52rem)', mobile: '(max-width: 51.99rem)' }, (ctx) => {
    const desktop = !!ctx.conditions?.desktop;
    opening(desktop);
    medicine();
    care(desktop);
    eigen(dots);
  });
  personal();
  ending();
  chrome();

  window.addEventListener('resize', () => dots.resize());
  ScrollTrigger.refresh();
}

/** The progress line along the top and the scene name in the corner. */
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
}

/** A dot that follows the pointer, grows over links and says "Drag" over the photo stack. */
function cursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const el = $('.cursor');
  const label = $('span', el);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  for (const t of $$('[data-cursor]')) {
    const drag = t.dataset.cursor === 'drag';
    const size = drag ? 84 : 44;
    t.addEventListener('pointerenter', () => {
      gsap.to(el, { width: size, height: size, margin: -size / 2, duration: 0.35, ease: 'expo.out' });
      gsap.to(label, { opacity: drag ? 1 : 0, duration: 0.2 });
    });
    t.addEventListener('pointerleave', () => {
      gsap.to(el, { width: 14, height: 14, margin: -7, duration: 0.35, ease: 'expo.out' });
      gsap.to(label, { opacity: 0, duration: 0.2 });
    });
  }
}

/** 1. The name parts as you scroll, the portrait rises between them; on load the letters slide up. */
function opening(desktop: boolean) {
  const scene = $('.opening');
  const chars = $$('.opening .c');
  const [w1, w2] = $$('.opening .w');
  const portrait = $('.portrait');
  gsap.set(portrait, { rotation: -5 });

  gsap
    .timeline({ delay: 0.1 })
    .from(chars, { yPercent: 120, duration: 1.2, ease: 'expo.out', stagger: 0.045 })
    .from(portrait, { opacity: 0, scale: 0.6, rotation: -14, duration: 1.4, ease: 'expo.out' }, 0.25)
    .from('.intro-wrap', { opacity: 0, y: 30, duration: 1, ease: 'expo.out' }, 0.7)
    .from('.hint', { opacity: 0, duration: 0.8 }, 1);

  // Letters thicken as the pointer passes over them (Archivo's weight axis).
  const name = $('.opening .name');
  const weights = chars.map(() => ({ w: 600 }));
  const apply = () => chars.forEach((c, i) => (c.style.fontVariationSettings = `'wght' ${weights[i].w.toFixed(0)}`));
  name.addEventListener('pointermove', (e) => {
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      gsap.to(weights[i], { w: 600 + 300 * Math.max(0, 1 - d / 260), duration: 0.4, overwrite: true, onUpdate: apply });
    });
  });
  name.addEventListener('pointerleave', () => {
    gsap.to(weights, { w: 600, duration: 0.8, ease: 'expo.out', onUpdate: apply });
  });

  // The portrait tilts towards the pointer.
  const rx = gsap.quickTo(portrait, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(portrait, 'rotationY', { duration: 0.6, ease: 'power3' });
  scene.addEventListener('pointermove', (e) => {
    rx(((e.clientY / window.innerHeight) - 0.5) * -14);
    ry(((e.clientX / window.innerWidth) - 0.5) * 18);
  });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.opening * 100}%`, pin: true, scrub: SCRUB },
  });
  if (desktop) {
    tl.to(w1, { x: '-14vw' }, 0).to(w2, { x: '14vw' }, 0);
  } else {
    tl.to(w1, { yPercent: -45 }, 0).to(w2, { yPercent: 45 }, 0);
  }
  // fromTo, so scrolling back to the top restores the resting state, not a frame of the load animation.
  tl.fromTo(portrait, { scale: 1, rotation: -5 }, { scale: desktop ? 1.35 : 1.15, rotation: 0, ease: 'power2.inOut', immediateRender: false }, 0)
    .fromTo('.hint', { opacity: 1 }, { opacity: 0, duration: 0.15, immediateRender: false }, 0)
    .to('.intro-wrap', { y: -40, opacity: 0, duration: 0.3 }, 0.7)
    .to('.opening .name', { opacity: 0.12, duration: 0.3 }, 0.7);
}

/** 2. Medicine: the lead, the wheel of rotations, the theatre photo filling the screen, the prints. */
function medicine() {
  const scene = $('.medicine');
  const lead = SplitText.create('.med-text .lead', { type: 'lines', mask: 'lines' });
  const ul = $('.wheel ul');
  const items = $$('.wheel li');
  const step = 26;
  const radius = () => Math.max(160, ul.clientHeight * 0.42);
  const placeItems = () => items.forEach((li, i) => (li.style.transform = `rotateX(${-i * step}deg) translateZ(${radius()}px)`));
  placeItems();
  ScrollTrigger.addEventListener('refreshInit', placeItems);
  const wheel = () => {
    const turn = Number(gsap.getProperty(ul, 'rotationX'));
    items.forEach((li, i) => {
      const angle = ((-i * step + turn) * Math.PI) / 180;
      const facing = Math.cos(angle);
      li.style.opacity = String(Math.max(0, facing * 1.6 - 0.6));
      li.style.color = Math.abs(-i * step + turn) < step / 2 ? INK : '#a8a296';
    });
  };
  wheel();

  const theatre = $('.theatre');
  const theatreImg = $('img', theatre);
  const prints = $$('.prints img');

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: wheel,
    scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.medicine * 100}%`, pin: true, scrub: SCRUB },
  });
  tl.from('.med-text .label', { opacity: 0, y: 20, duration: 0.05 }, 0)
    .from(lead.lines, { yPercent: 105, duration: 0.08, stagger: 0.012, ease: 'power3.out' }, 0.01)
    .from('.wheel', { opacity: 0, duration: 0.05 }, 0.02)
    .to(ul, { rotationX: (items.length - 1) * step, duration: 0.38, ease: 'power1.inOut' }, 0.04)
    .to('.bigword', { xPercent: -45, duration: 0.6 }, 0)
    .fromTo(theatre, { clipPath: clip(50, 50, 50, 50, 14) }, { clipPath: clip(30, 34, 30, 34, 14), duration: 0.05, ease: 'power2.out' }, 0.42)
    .fromTo(
      theatre,
      { clipPath: clip(30, 34, 30, 34, 14) },
      { clipPath: clip(0, 0, 0, 0, 0), duration: 0.2, ease: 'power2.inOut', immediateRender: false },
      0.47,
    )
    .fromTo(theatreImg, { scale: 1.45 }, { scale: 1.04, duration: 0.45 }, 0.42)
    .to(['.med-text', '.wheel'], { opacity: 0, y: -60, duration: 0.12 }, 0.47)
    .fromTo(
      prints,
      { y: '-120vh', rotation: (i) => (i ? 34 : -30) },
      { y: 0, rotation: (i) => (i ? 6 : -7), duration: 0.16, stagger: 0.07, ease: 'power3.out' },
      0.72,
    )
    .to({}, { duration: 0.06 });
}

/** 3 and 4. Words turn to ink, software windows pile up, fold into a phone, Bounceback plays on it. */
function care(desktop: boolean) {
  const scene = $('.care');
  const stage = $('.stage', scene);
  const mainWords = $$('.reading .main .word');
  const endWords = $$('.reading .end .word');
  const wins = $$('.win');
  const phone = $('.phone');
  const screens = $$('.ph');
  const noteLines = $$('.note-line span');
  const bbLines = SplitText.create('.bb1', { type: 'lines', mask: 'lines' });
  const bb2Lines = SplitText.create('.bb2', { type: 'lines', mask: 'lines' });

  gsap.set([...mainWords, ...endWords], { color: UNREAD });
  gsap.set(wins, { opacity: 0, scale: 0.5, y: 40 });
  gsap.set(phone, { opacity: 0, scale: 0.12, rotation: -24 });
  gsap.set(screens.slice(1), { opacity: 0, x: 24 });

  // Each window flies to the middle of the screen, where the phone appears.
  const toCentre = (axis: 'x' | 'y') => (i: number) => {
    const w = wins[i];
    const box = stage.getBoundingClientRect();
    const r = w.getBoundingClientRect();
    return axis === 'x' ? box.left + box.width / 2 - (r.left + r.width / 2) : box.top + box.height / 2 - (r.top + r.height / 2);
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.care * 100}%`, pin: true, scrub: SCRUB, invalidateOnRefresh: true },
  });
  tl.to(mainWords, { color: INK, duration: 0.01, stagger: 0.27 / mainWords.length }, 0)
    .to(wins, { opacity: 1, scale: 1, y: 0, duration: 0.04, stagger: 0.026, ease: 'back.out(2.2)' }, 0.03)
    .to(endWords, { color: INK, duration: 0.01, stagger: 0.06 / endWords.length }, 0.3)
    // The clutter folds into one phone, and the room goes dark.
    .to(wins, { x: toCentre('x'), y: toCentre('y'), scale: 0.12, rotation: 0, opacity: 0, duration: 0.1, stagger: 0.006, ease: 'power3.in' }, 0.39)
    .to('.wards-text', { opacity: 0, y: -40, duration: 0.06 }, 0.4)
    // Dark spreads out from the phone in a circle; once it covers the screen the page itself turns dark.
    .fromTo('.care .wipe', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 0.1, ease: 'power2.in' }, 0.42)
    .fromTo('.xp-bg', { backgroundColor: PAPER }, { backgroundColor: DARK, duration: 0.001 }, 0.52)
    .to(phone, { opacity: 1, scale: 1, rotation: 0, duration: 0.09, ease: 'back.out(1.6)' }, 0.45);

  if (desktop) tl.to(phone, { x: '18vw', duration: 0.07, ease: 'power2.inOut' }, 0.55);
  tl.from('.bb-text .label', { opacity: 0, y: 20, duration: 0.04 }, 0.56)
    .from(bbLines.lines, { yPercent: 105, duration: 0.06, stagger: 0.01, ease: 'power3.out' }, 0.57);

  // The phone's screens, one after another.
  const swap = (from: number, to: number, at: number) =>
    tl.to(screens[from], { opacity: 0, x: -24, duration: 0.03 }, at).to(screens[to], { opacity: 1, x: 0, duration: 0.03 }, at + 0.01);
  swap(0, 1, 0.63);
  swap(1, 2, 0.7);
  if (!desktop) tl.to('.bb1', { opacity: 0, y: -20, duration: 0.03 }, 0.74);
  tl.from(bb2Lines.lines, { yPercent: 105, duration: 0.06, stagger: 0.01, ease: 'power3.out' }, 0.76);
  swap(2, 3, 0.77);
  tl.fromTo(noteLines, { clipPath: clip(0, 100, 0, 0) }, { clipPath: clip(0, 0, 0, 0), duration: 0.04, stagger: 0.035 }, 0.8);
  swap(3, 4, 0.92);
  tl.to({}, { duration: 0.05 });

  // The phone tilts towards the pointer.
  const rx = gsap.quickTo(phone, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(phone, 'rotationY', { duration: 0.6, ease: 'power3' });
  scene.addEventListener('pointermove', (e) => {
    rx(((e.clientY / window.innerHeight) - 0.5) * -12);
    ry(((e.clientX / window.innerWidth) - 0.5) * 22);
  });
}

/** 5. Eigen: back to paper, the run photo and its route, then the dots: face, mask versions, footprint. */
function eigen(dots: Dots) {
  const scene = $('.eigen');
  const run = $('.run');
  const runImg = $('img', run);
  const path = $<SVGPathElement>('.route-path');
  const runner = $<SVGCircleElement>('.runner');
  const len = path.getTotalLength();
  const e1 = SplitText.create('.e1', { type: 'lines', mask: 'lines' });
  const e2 = SplitText.create('.e2', { type: 'lines', mask: 'lines' });
  const e3 = SplitText.create('.e3', { type: 'lines', mask: 'lines' });

  gsap.set(path, { strokeDasharray: `${len} ${len}`, strokeDashoffset: len });
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

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: draw,
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: `+=${LENGTH.eigen * 100}%`,
      pin: true,
      scrub: SCRUB,
      onToggle: (self) => (self.isActive ? gsap.ticker.add(breathe) : gsap.ticker.remove(breathe)),
    },
  });

  // The page turns back to paper under a dark cover, which then shrinks away in a circle. Just
  // after 0, so building the timeline doesn't repaint the page before anyone gets here.
  tl.fromTo('.xp-bg', { backgroundColor: DARK }, { backgroundColor: PAPER, duration: 0.001, immediateRender: false }, 0.001)
    .fromTo('.eigen .wipe', { clipPath: 'circle(75% at 70% 50%)' }, { clipPath: 'circle(0% at 70% 50%)', duration: 0.07, ease: 'power2.inOut' }, 0.001)
    .fromTo(run, { clipPath: clip(100, 0, 0, 0, 16) }, { clipPath: clip(0, 0, 0, 0, 16), duration: 0.12, ease: 'power3.inOut' }, 0.04)
    .fromTo(runImg, { yPercent: -12 }, { yPercent: 0, duration: 0.36 }, 0.04)
    .from('.eigen-text .label', { opacity: 0, y: 20, duration: 0.04 }, 0.06)
    .from(e1.lines, { yPercent: 105, duration: 0.07, stagger: 0.012, ease: 'power3.out' }, 0.07)
    .to(runner, { opacity: 1, duration: 0.02 }, 0.12)
    .to(path, { strokeDashoffset: 0, duration: 0.22 }, 0.12)
    .to(state, { route: 1, duration: 0.22 }, 0.12)
    // The run gives way to the dots.
    .fromTo(
      run,
      { clipPath: clip(0, 0, 0, 0, 16) },
      { clipPath: clip(0, 0, 100, 0, 16), duration: 0.08, ease: 'power3.in', immediateRender: false },
      0.36,
    )
    .to(['.route', runner], { opacity: 0, duration: 0.05 }, 0.36)
    .to(e1.lines, { yPercent: -105, duration: 0.05, stagger: 0.006, ease: 'power3.in' }, 0.37)
    .to('.dots', { opacity: 1, duration: 0.04 }, 0.38)
    .to(state, { gather: 1, duration: 0.12, ease: 'power2.out' }, 0.38)
    .from(e2.lines, { yPercent: 105, duration: 0.06, stagger: 0.012, ease: 'power3.out' }, 0.44)
    // Quick iterations: the mask flicks through its versions.
    .to(state, { variant: 3, duration: 0.16 }, 0.5)
    // The pivot: the face streams into a footprint.
    .to(e2.lines, { yPercent: -105, duration: 0.05, stagger: 0.006, ease: 'power3.in' }, 0.66)
    .to(state, { morph: 1, duration: 0.2, ease: 'power1.inOut' }, 0.67)
    .from(e3.lines, { yPercent: 105, duration: 0.07, stagger: 0.012, ease: 'power3.out' }, 0.72)
    .to({}, { duration: 0.1 });
  draw();
}

/** 6. Personal: throw the top print away to reveal the next one; the stack cycles. */
function personal() {
  const cards = $$('.card');
  const caps = $$('.cap');
  const now = $('.count .now');
  const n = cards.length;
  /** Front to back: indexes into `cards`. */
  const order = cards.map((_, i) => i);
  const tilt = [0, -4, 5, -2, 3];
  /** A throw needs to travel this far, or move this fast (px per second), to send the print away. */
  const THROW_DISTANCE = 110;
  const THROW_SPEED = 800;
  let busy = false;
  let drag: Draggable | undefined;

  const layout = (animate = true) => {
    order.forEach((idx, k) => {
      gsap.to(cards[idx], {
        zIndex: n - k,
        x: 0,
        y: k * 10,
        rotation: tilt[k % tilt.length],
        scale: 1 - k * 0.035,
        duration: animate ? 0.8 : 0,
        ease: 'expo.out',
      });
    });
    now.textContent = String(order[0] + 1);
    arm();
  };

  const showCaption = (i: number) => {
    const old = caps.find((c) => c.style.visibility !== 'hidden');
    if (old && old !== caps[i]) gsap.to(old, { autoAlpha: 0, y: -16, duration: 0.3, ease: 'power2.in' });
    gsap.fromTo(caps[i], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'expo.out' });
  };

  const throwCard = (dir: number) => {
    if (busy) return;
    busy = true;
    const card = cards[order[0]];
    gsap.to(card, {
      x: dir * window.innerWidth * 0.75,
      y: '+=80',
      rotation: dir * 32,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        order.push(order.shift()!);
        gsap.set(card, { zIndex: 0 });
        showCaption(order[0]);
        layout();
        busy = false;
      },
    });
  };

  // Only the front print can be dragged.
  const arm = () => {
    drag?.kill();
    const card = cards[order[0]];
    let lastX = 0;
    let lastT = 0;
    let speed = 0;
    [drag] = Draggable.create(card, {
      type: 'x',
      onPress() {
        lastX = 0;
        lastT = performance.now();
        speed = 0;
      },
      onDrag(this: Draggable) {
        const t = performance.now();
        speed = ((this.x - lastX) / Math.max(1, t - lastT)) * 1000;
        lastX = this.x;
        lastT = t;
        gsap.set(card, { rotation: this.x * 0.06 });
      },
      onDragEnd(this: Draggable) {
        if (Math.abs(this.x) > THROW_DISTANCE || Math.abs(speed) > THROW_SPEED) throwCard(Math.sign(this.x || speed));
        else gsap.to(card, { x: 0, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
      },
    });
  };

  caps.forEach((c, i) => gsap.set(c, { autoAlpha: i === 0 ? 1 : 0 }));
  layout(false);
  $('.next').addEventListener('click', () => throwCard(-1));
  window.addEventListener('keydown', (e) => {
    const deck = $('.deck').getBoundingClientRect();
    if (deck.top > window.innerHeight * 0.5 || deck.bottom < window.innerHeight * 0.5) return;
    if (e.key === 'ArrowRight') throwCard(1);
    if (e.key === 'ArrowLeft') throwCard(-1);
  });

  // The prints are dealt onto the table as the section comes into view.
  gsap.from(cards, {
    x: (i) => (i % 2 ? 1 : -1) * window.innerWidth * 0.5,
    y: (i) => 200 + i * 60,
    rotation: (i) => (i % 2 ? 40 : -40),
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.personal', start: 'top 70%', toggleActions: 'play none none reverse', refreshPriority: -1 },
  });
  const lead = SplitText.create('.personal .lead', { type: 'lines', mask: 'lines' });
  gsap.from([...lead.lines, '.personal .deck-intro .label'], {
    yPercent: 105,
    opacity: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.06,
    scrollTrigger: { trigger: '.personal', start: 'top 70%', toggleActions: 'play none none reverse', refreshPriority: -1 },
  });
}

/** 7. Ending: the contact line sets, the name rises as a wordmark along the bottom. */
function ending() {
  const words = SplitText.create('.contact-line', { type: 'words', mask: 'words' });
  gsap.from(words.words, {
    yPercent: 110,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.03,
    scrollTrigger: { trigger: '.ending', start: 'top 60%', toggleActions: 'play none none reverse', refreshPriority: -1 },
  });
  gsap.from('.wordmark .c', {
    yPercent: 100,
    ease: 'none',
    stagger: 0.05,
    scrollTrigger: { trigger: '.ending', start: 'top bottom', end: 'bottom bottom', scrub: SCRUB, refreshPriority: -1 },
  });
}
