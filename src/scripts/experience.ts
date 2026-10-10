/*
 * The interactive version's motion. Smooth scrolling (Lenis) drives GSAP ScrollTrigger timelines,
 * one per scene: each scene pins while its timeline plays, scrubbed by the scroll position, so
 * scrolling back plays it in reverse. Three gestures carry the page: a Polaroid coming out of the
 * camera's slot, Polaroids developing from dark film, and ballpoint handwriting being written.
 * Nothing is rotated. With reduced motion nothing here runs and the page reads as a plain page.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import Lenis from 'lenis';
import { Dots } from './dots';

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable);

/** How long each pinned scene lasts, in screen heights of scrolling. */
const LENGTH = { opening: 0.9, medicine: 4.5, care: 5.5, eigen: 5.5 };
/** How far the scrubbed animation lags behind the scroll, in seconds; the lag is what makes it feel smooth. */
const SCRUB = 1;
const INK = '#141413';
/** Unread words in the wards scene, and wheel entries away from the front. */
const UNREAD = '#c9c8c2';
const FADED = '#b3b2ac';
/** The ballpoint blue, as RGB for the dots' canvas. */
const PEN_RGB = '47 51 148';
/**
 * The film's finished look and the flat, dark picture it develops from. Both use the same filter
 * functions in the same order, so GSAP can blend between them.
 */
const FILM = 'contrast(1.04) saturate(0.8) sepia(0.14) brightness(1.03)';
const RAW = 'contrast(0.5) saturate(0) sepia(0) brightness(0.55)';

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
  const dots = new Dots($<HTMLCanvasElement>('.dots'), window.innerWidth < 832 ? 900 : 1500, PEN_RGB);

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

/* ---------- The three gestures ---------- */

/** Splits handwriting into characters, so it can be written one letter at a time. Words stay whole, so lines wrap naturally. */
const letters = (el: Element | null) => (el ? SplitText.create(el, { type: 'words,chars' }).chars : []);

/** Splits running text into words for a reveal. Words, not lines: lines would be fixed at the width they were split at. */
const words = (sel: string) => SplitText.create(sel, { type: 'words' }).words;

/** Writes letters into a timeline between `at` and `at + dur`, one after another, as a pen would. */
function write(tl: gsap.core.Timeline, chars: Element[], at: number, dur: number) {
  if (!chars.length) return;
  const step = dur / (chars.length + 1);
  tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: step * 2, stagger: step, ease: 'none' }, at);
}

/** Puts a Polaroid back to fresh, undeveloped film. */
function fresh(pola: Element) {
  gsap.set($('.chem', pola), { opacity: 1 });
  gsap.set($('.cast', pola), { opacity: 0 });
  gsap.set($('img', pola), { filter: RAW });
}

/**
 * Develops a Polaroid over `dur`: the dark film clears, the picture comes through flat and cool,
 * then its colour and contrast arrive. Returns a timeline to play on its own or add to a scene.
 */
function develop(pola: Element, dur: number) {
  return gsap
    .timeline()
    .to($('.chem', pola), { opacity: 0, duration: dur * 0.8, ease: 'power2.in' }, 0)
    .to($('img', pola), { filter: FILM, duration: dur, ease: 'power1.inOut' }, 0)
    .to($('.cast', pola), { opacity: 0.5, duration: dur * 0.4, ease: 'sine.out' }, dur * 0.1)
    .to($('.cast', pola), { opacity: 0, duration: dur * 0.5, ease: 'sine.inOut' }, dur * 0.5);
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

/** A ballpoint-blue dot that follows the pointer, grows over links and says "Drag" over the Polaroids. */
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
      gsap.to(el, { width: size, height: size, margin: -size / 2, opacity: drag ? 1 : 0.25, duration: 0.35, ease: 'expo.out' });
      gsap.to(label, { opacity: drag ? 1 : 0, duration: 0.2 });
    });
    t.addEventListener('pointerleave', () => {
      gsap.to(el, { width: 14, height: 14, margin: -7, opacity: 1, duration: 0.35, ease: 'expo.out' });
      gsap.to(label, { opacity: 0, duration: 0.2 });
    });
  }
}

/* ---------- The scenes ---------- */

/** 1. The portrait comes out of the slot and develops while the note is written either side of it. */
function opening(desktop: boolean) {
  const scene = $('.opening');
  const pola = $('.opening .pola');
  const slot = $('.slot');
  const noteA = letters($('.o-pen-a .pen'));
  const noteB = letters($('.o-pen-b .pen'));
  const foot = $$('.o-foot > *');

  fresh(pola);
  gsap.set(pola, { yPercent: -101 });
  gsap.set(slot, { scaleX: 0 });
  gsap.set([...noteA, ...noteB], { opacity: 0 });
  gsap.set(['.logo', ...foot], { opacity: 0, y: 12 });

  gsap
    .timeline({ delay: 0.3 })
    .to(slot, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, 0)
    .to('.logo', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.1)
    // The camera's motor pushes the print out at a steady pace, easing off at the end.
    .to(pola, { yPercent: 0, duration: 1.5, ease: 'sine.inOut' }, 0.55)
    .to(slot, { opacity: 0, duration: 0.6 }, 2.2)
    .add(develop(pola, 4.5), 1.7)
    .to(noteA, { opacity: 1, duration: 0.12, stagger: 0.045, ease: 'none' }, 2.1)
    .to(noteB, { opacity: 1, duration: 0.12, stagger: 0.045, ease: 'none' }, '>-0.05')
    .to(foot, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1 }, '>-0.3');

  // fromTo, so scrolling back to the top restores the resting state, not a frame of the load animation.
  gsap
    .timeline({
      defaults: { ease: 'none', immediateRender: false },
      scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.opening * 100}%`, pin: true, scrub: SCRUB },
    })
    .fromTo('.o-pen-a', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '-5vw' : 0, y: desktop ? 0 : '-3vh', opacity: 0 }, 0)
    .fromTo('.o-pen-b', { x: 0, y: 0, opacity: 1 }, { x: desktop ? '5vw' : 0, y: desktop ? 0 : '3vh', opacity: 0 }, 0)
    // The wrapper inside, not .o-photo: GSAP would take over .o-photo's CSS translate, which centres it.
    .fromTo('.eject', { scale: 1, y: 0 }, { scale: 0.88, y: '-5vh' }, 0)
    .fromTo(['.o-head', '.o-foot'], { opacity: 1 }, { opacity: 0, duration: 0.4 }, 0);
}

/** 2. Medicine: the lead and the wheel of rotations, then three Polaroids are laid down and develop. */
function medicine() {
  const scene = $('.medicine');
  const lead = words('.med-text .lead');
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
      li.style.opacity = String(Math.max(0, Math.cos(angle) * 1.6 - 0.6));
      li.style.color = Math.abs(-i * step + turn) < step / 2 ? INK : FADED;
    });
  };
  wheel();

  const shots = $$('.medicine .mp');
  const polas = shots.map((s) => $('.pola', s));
  const captions = polas.map((p) => letters($('.pen-cap', p)));
  polas.forEach(fresh);
  gsap.set(captions.flat(), { opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: wheel,
    scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.medicine * 100}%`, pin: true, scrub: SCRUB },
  });
  tl.from('.med-text .label', { opacity: 0, y: 20, duration: 0.04 }, 0)
    .from(lead, { opacity: 0, y: '0.35em', duration: 0.03, stagger: 0.12 / lead.length, ease: 'power2.out' }, 0.01)
    .from('.wheel', { opacity: 0, duration: 0.05 }, 0.02)
    .to(ul, { rotationX: (items.length - 1) * step, duration: 0.34, ease: 'power1.inOut' }, 0.04)
    .to(['.med-text', '.wheel'], { opacity: 0, y: -50, duration: 0.08 }, 0.42)
    // The prints are laid down one by one, still dark, and develop in turn.
    .from(shots, { y: '75vh', duration: 0.1, stagger: 0.06, ease: 'power3.out' }, 0.44);
  polas.forEach((p, i) => {
    tl.add(develop(p, 0.2), 0.5 + i * 0.08);
    write(tl, captions[i], 0.64 + i * 0.08, 0.06);
  });
  tl.to({}, { duration: 0.06 });
}

/** 3 and 4. Words turn to ink, software windows pile up, fold into a phone, and Bounceback plays on it. */
function care(desktop: boolean) {
  const scene = $('.care');
  const stage = $('.stage', scene);
  const mainWords = $$('.reading .main .word');
  const endWords = $$('.reading .end .word');
  const wins = $$('.win');
  const phone = $('.phone');
  const screens = $$('.ph');
  const noteLines = $$('.note-line span');
  const bb1 = words('.bb1');
  const bb2 = words('.bb2');

  gsap.set([...mainWords, ...endWords], { color: UNREAD });
  gsap.set(wins, { opacity: 0, scale: 0.6, y: 30 });
  gsap.set(phone, { opacity: 0, scale: 0.2 });
  gsap.set(screens.slice(1), { opacity: 0, x: 24 });

  // Each window flies to the middle of the screen, where the phone appears.
  const toCentre = (axis: 'x' | 'y') => (i: number) => {
    const box = stage.getBoundingClientRect();
    const r = wins[i].getBoundingClientRect();
    return axis === 'x' ? box.left + box.width / 2 - (r.left + r.width / 2) : box.top + box.height / 2 - (r.top + r.height / 2);
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: scene, start: 'top top', end: `+=${LENGTH.care * 100}%`, pin: true, scrub: SCRUB, invalidateOnRefresh: true },
  });
  tl.to(mainWords, { color: INK, duration: 0.01, stagger: 0.27 / mainWords.length }, 0)
    .to(wins, { opacity: 1, scale: 1, y: 0, duration: 0.04, stagger: 0.026, ease: 'back.out(2)' }, 0.03)
    .to(endWords, { color: INK, duration: 0.01, stagger: 0.06 / endWords.length }, 0.3)
    // The clutter folds into one phone.
    .to(wins, { x: toCentre('x'), y: toCentre('y'), scale: 0.12, opacity: 0, duration: 0.1, stagger: 0.006, ease: 'power3.in' }, 0.39)
    .to('.wards-text', { opacity: 0, y: -40, duration: 0.06 }, 0.4)
    .to(phone, { opacity: 1, scale: 1, duration: 0.09, ease: 'back.out(1.4)' }, 0.45);

  if (desktop) tl.to(phone, { x: '18vw', duration: 0.07, ease: 'power2.inOut' }, 0.55);
  tl.from('.bb-text .label', { opacity: 0, y: 20, duration: 0.04 }, 0.56)
    .from(bb1, { opacity: 0, y: '0.35em', duration: 0.02, stagger: 0.07 / bb1.length, ease: 'power2.out' }, 0.57);

  // The phone's screens, one after another.
  const swap = (from: number, to: number, at: number) =>
    tl.to(screens[from], { opacity: 0, x: -24, duration: 0.03 }, at).to(screens[to], { opacity: 1, x: 0, duration: 0.03 }, at + 0.01);
  swap(0, 1, 0.63);
  swap(1, 2, 0.7);
  if (!desktop) tl.to('.bb1', { opacity: 0, y: -20, duration: 0.03 }, 0.74);
  tl.from(bb2, { opacity: 0, y: '0.35em', duration: 0.02, stagger: 0.07 / bb2.length, ease: 'power2.out' }, 0.76);
  swap(2, 3, 0.77);
  tl.fromTo(noteLines, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.04, stagger: 0.035 }, 0.8);
  swap(3, 4, 0.92);
  tl.to({}, { duration: 0.05 });
}

/** 5. Eigen: the run club Polaroid develops while a lap is drawn round it, then the dots: face, mask versions, footprint. */
function eigen(dots: Dots) {
  const scene = $('.eigen');
  const run = $('.run');
  const pola = $('.run .pola');
  const caption = letters($('.pen-cap', pola));
  const path = $<SVGPathElement>('.route-path');
  const runner = $<SVGCircleElement>('.runner');
  const len = path.getTotalLength();
  const e1 = words('.e1');
  const e2 = words('.e2');
  const e3 = words('.e3');

  fresh(pola);
  gsap.set(caption, { opacity: 0 });
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
  const reveal = (w: Element[], at: number) =>
    tl.from(w, { opacity: 0, y: '0.35em', duration: 0.02, stagger: 0.08 / w.length, ease: 'power2.out' }, at);

  tl.from(run, { y: '70vh', duration: 0.1, ease: 'power3.out' }, 0.02)
    .add(develop(pola, 0.22), 0.08)
    .from('.eigen-text .label', { opacity: 0, y: 20, duration: 0.04 }, 0.04);
  reveal(e1, 0.05);
  write(tl, caption, 0.26, 0.05);
  tl.to(runner, { opacity: 1, duration: 0.02 }, 0.12)
    .to(path, { strokeDashoffset: 0, duration: 0.22 }, 0.12)
    .to(state, { route: 1, duration: 0.22 }, 0.12)
    // The run gives way to the dots.
    .to(run, { y: '-130vh', duration: 0.1, ease: 'power3.in' }, 0.38)
    .to(e1, { opacity: 0, duration: 0.04 }, 0.37)
    .to('.dots', { opacity: 1, duration: 0.04 }, 0.4)
    .to(state, { gather: 1, duration: 0.12, ease: 'power2.out' }, 0.4);
  reveal(e2, 0.46);
  // Quick iterations: the mask flicks through its versions. Then the pivot: the face streams into a footprint.
  tl.to(state, { variant: 3, duration: 0.16 }, 0.5)
    .to(e2, { opacity: 0, duration: 0.04 }, 0.66)
    .to(state, { morph: 1, duration: 0.2, ease: 'power1.inOut' }, 0.67);
  reveal(e3, 0.72);
  tl.to({}, { duration: 0.1 });
  draw();
}

/** 6. Personal: throw the top Polaroid away to reveal the next; each develops when it first reaches the top. */
function personal() {
  const cards = $$('.card');
  const polas = cards.map((c) => $('.pola', c));
  const titles = polas.map((p) => letters($('.pen-cap', p)));
  const caps = $$('.cap');
  const now = $('.count .now');
  const n = cards.length;
  /** Front to back: indexes into `cards`. */
  const order = cards.map((_, i) => i);
  const developed = new Set<number>();
  /** A throw needs to travel this far, or move this fast (px per second), to send the print away. */
  const THROW_DISTANCE = 110;
  const THROW_SPEED = 800;
  let busy = false;
  let drag: Draggable | undefined;

  polas.forEach(fresh);
  gsap.set(titles.flat(), { opacity: 0 });

  const developTop = () => {
    const i = order[0];
    if (developed.has(i)) return;
    developed.add(i);
    develop(polas[i], 2.4);
    gsap.to(titles[i], { opacity: 1, duration: 0.12, stagger: 0.05, ease: 'none', delay: 1.4 });
  };

  const layout = (animate = true) => {
    order.forEach((idx, k) => {
      gsap.to(cards[idx], {
        zIndex: n - k,
        x: 0,
        y: k * 9,
        scale: 1 - k * 0.03,
        opacity: 1,
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
      x: dir * window.innerWidth * 0.7,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        order.push(order.shift()!);
        gsap.set(card, { zIndex: 0 });
        showCaption(order[0]);
        layout();
        developTop();
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
      },
      onDragEnd(this: Draggable) {
        if (Math.abs(this.x) > THROW_DISTANCE || Math.abs(speed) > THROW_SPEED) throwCard(Math.sign(this.x || speed));
        else gsap.to(card, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
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

  // The prints are dealt onto the table as the section comes into view, and the top one develops.
  gsap.from(cards, {
    y: (i) => 260 + i * 60,
    opacity: 0,
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.personal', start: 'top 70%', toggleActions: 'play none none reverse', refreshPriority: -1 },
  });
  ScrollTrigger.create({ trigger: '.personal', start: 'top 40%', once: true, refreshPriority: -1, onEnter: developTop });
  const lead = words('.personal .lead');
  gsap.from([...lead, '.personal .deck-intro .label'], {
    opacity: 0,
    y: '0.35em',
    duration: 0.7,
    ease: 'expo.out',
    stagger: 0.025,
    scrollTrigger: { trigger: '.personal', start: 'top 70%', toggleActions: 'play none none reverse', refreshPriority: -1 },
  });
}

/** 7. Ending: the contact line is written in ballpoint, and the name rises as a wordmark along the bottom. */
function ending() {
  const chars = letters($('.contact-line'));
  gsap.fromTo(
    chars,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.1,
      stagger: 0.022,
      ease: 'none',
      scrollTrigger: { trigger: '.ending', start: 'top 60%', toggleActions: 'play none none reverse', refreshPriority: -1 },
    },
  );
  gsap.from('.wordmark .c', {
    yPercent: 100,
    ease: 'none',
    stagger: 0.05,
    scrollTrigger: { trigger: '.ending', start: 'top bottom', end: 'bottom bottom', scrub: SCRUB, refreshPriority: -1 },
  });
}
