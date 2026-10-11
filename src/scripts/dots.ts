/*
 * The Eigen scene's dots: a loose cloud gathers into a face with a mask outline (the CPAP masks),
 * the mask flicks through a few shapes (the quick iterations), then the dots stream into a
 * footprint (the pivot to running). The shapes are plain geometry made here. The picture is a
 * pure function of the state passed to `draw`, so scrolling back simply plays it in reverse.
 */

export interface DotState {
  /** 0: scattered cloud, 1: gathered into the face. */
  gather: number;
  /** 0 to MASKS.length - 1: which mask shape is showing; fractions blend between neighbours. */
  variant: number;
  /** 0: face, 1: footprint. */
  morph: number;
}

type Pt = { x: number; y: number; z: number };

/** Dot radius at the back and the front of a shape, in CSS pixels at a 900px tall canvas. */
const R_BACK = 0.9;
const R_FRONT = 2.6;
/** The dot count those radii are for. With fewer dots each is larger, so a shape is as solid. */
const R_COUNT = 1500;
/** How much of the morph is spent staggering dots from top to bottom, so they stream rather than jump. */
const STAGGER = 0.45;
/**
 * How many shades the dots are drawn in. Dots of one shade are filled together as one path, so a
 * frame is a few fills instead of one per dot, which a phone's processor would struggle with.
 */
const SHADES = 12;

/** The head: an ellipse in unit space (y grows downwards). */
const HEAD = { cx: 0, cy: 0.02, rx: 0.25, ry: 0.34 };

/** Mask shapes for the iterations: half-width at the cheeks, top (nose bridge) and bottom (chin) y, roundness. */
const MASKS = [
  { w: 0.15, top: -0.02, bottom: 0.2, round: 0.35 },
  { w: 0.12, top: -0.06, bottom: 0.17, round: 0.7 },
  { w: 0.17, top: 0.0, bottom: 0.24, round: 0.2 },
  { w: 0.14, top: -0.04, bottom: 0.21, round: 0.5 },
];

/** The footprint, toes up: heel, arch and forefoot ellipses, then the five toes. */
const FOOT = [
  { cx: 0.0, cy: 0.27, rx: 0.095, ry: 0.115 },
  { cx: 0.035, cy: 0.09, rx: 0.075, ry: 0.15 },
  { cx: 0.005, cy: -0.11, rx: 0.13, ry: 0.105 },
  { cx: -0.078, cy: -0.262, rx: 0.05, ry: 0.058 },
  { cx: -0.006, cy: -0.283, rx: 0.034, ry: 0.04 },
  { cx: 0.052, cy: -0.273, rx: 0.031, ry: 0.036 },
  { cx: 0.1, cy: -0.252, rx: 0.028, ry: 0.032 },
  { cx: 0.14, cy: -0.22, rx: 0.024, ry: 0.028 },
];
/** The footprint leans a little, like a real step. */
const FOOT_TILT = -0.12;

/** A small seeded random generator, so every visit draws the same shapes. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ellipse = (e: { cx: number; cy: number; rx: number; ry: number }, x: number, y: number) =>
  ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2;

function sample(count: number, rnd: () => number, inside: (x: number, y: number) => number | null): Pt[] {
  const pts: Pt[] = [];
  while (pts.length < count) {
    const x = rnd() - 0.5;
    const y = rnd() - 0.5;
    const z = inside(x, y);
    if (z !== null) pts.push({ x, y, z });
  }
  // Top to bottom, so the same index sits at a similar height in every shape and dots stream.
  return pts.sort((a, b) => a.y - b.y || a.x - b.x);
}

function maskAt(v: number) {
  const i = Math.max(0, Math.min(MASKS.length - 1, Math.floor(v)));
  const j = Math.min(MASKS.length - 1, i + 1);
  // Snap quickly from one shape to the next, so it reads as separate versions rather than a blend.
  const f = v - i;
  const t = f < 0.7 ? 0 : (f - 0.7) / 0.3;
  const a = MASKS[i];
  const b = MASKS[j];
  return {
    w: a.w + (b.w - a.w) * t,
    top: a.top + (b.top - a.top) * t,
    bottom: a.bottom + (b.bottom - a.bottom) * t,
    round: a.round + (b.round - a.round) * t,
  };
}

function inMask(m: ReturnType<typeof maskAt>, x: number, y: number) {
  if (y < m.top || y > m.bottom) return false;
  const t = (y - m.top) / (m.bottom - m.top);
  // Narrow at the nose bridge, full width across the cheeks, rounding off at the chin.
  const half = m.w * Math.min(1, 0.25 + t * 1.4) * (t > 0.75 ? 1 - ((t - 0.75) / 0.25) ** 2 * m.round : 1);
  return Math.abs(x) <= half;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export class Dots {
  private ctx: CanvasRenderingContext2D;
  private scatter: Pt[];
  private face: Pt[];
  private foot: Pt[];
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** What was drawn last, so an unchanged picture is not drawn again. */
  private drawn = '';
  /** How much larger each dot is than R_BACK and R_FRONT say, for the number of dots. */
  private grain: number;

  /**
   * `ink` is the dots' colour as space-separated RGB, e.g. '47 51 148'. `maxDpr` caps the canvas's
   * pixel density: soft dots look the same at less, and a smaller canvas costs less to draw.
   */
  constructor(
    private canvas: HTMLCanvasElement,
    count: number,
    private ink = '23 22 20',
    private maxDpr = 2,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.grain = Math.sqrt(R_COUNT / count);
    const rnd = random(7);
    this.scatter = sample(count, rnd, (x, y) => {
      const r = Math.hypot(x, y);
      return r < 0.5 ? 0.2 + rnd() * 0.5 : null;
    });
    this.face = sample(count, rnd, (x, y) => {
      const f = ellipse(HEAD, x, y);
      return f <= 1 ? Math.sqrt(1 - f) : null;
    });
    const c = Math.cos(FOOT_TILT);
    const s = Math.sin(FOOT_TILT);
    this.foot = sample(count, rnd, (x, y) => {
      const u = x * c + y * s;
      const v = -x * s + y * c;
      let best = Infinity;
      for (const e of FOOT) best = Math.min(best, ellipse(e, u, v));
      return best <= 1 ? Math.sqrt(1 - best) : null;
    });
    this.resize();
  }

  /** Matches the canvas to its size on screen; nothing happens if that has not changed (a phone's address bar resizes the window often). */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.drawn = '';
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  /** Draws the dots for `state`; if that is what is already on the canvas, nothing happens. */
  draw(state: DotState) {
    const key = `${state.gather} ${state.variant} ${state.morph}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const size = Math.min(this.w, this.h) * 0.92;
    const cx = this.w / 2;
    const cy = this.h / 2;
    const scale = (size / 900) * this.grain;
    const mask = maskAt(state.variant);
    const showMask = clamp01(state.gather * 1.4 - 0.4) * (1 - clamp01(state.morph * 3));
    const n = this.face.length;
    const shades = Array.from({ length: SHADES + 1 }, () => new Path2D());
    const used = new Array<boolean>(SHADES + 1).fill(false);

    for (let i = 0; i < n; i++) {
      const delay = i / n;
      const g = smooth(clamp01((state.gather - delay * STAGGER) / (1 - STAGGER)));
      const m = smooth(clamp01((state.morph - delay * STAGGER) / (1 - STAGGER)));
      const a = this.scatter[i];
      const f = this.face[i];
      const o = this.foot[i];
      let x = a.x + (f.x - a.x) * g;
      let y = a.y + (f.y - a.y) * g;
      let z = a.z + (f.z - a.z) * g;
      x += (o.x - x) * m;
      y += (o.y - y) * m;
      z += (o.z - z) * m;

      let r = (R_BACK + (R_FRONT - R_BACK) * z) * scale;
      let alpha = 0.22 + 0.7 * z;
      if (showMask > 0 && inMask(mask, f.x, f.y)) {
        r *= 1 + 0.5 * showMask;
        alpha = Math.min(1, alpha + 0.3 * showMask);
      }
      const k = Math.round(alpha * SHADES);
      const px = cx + x * size;
      const py = cy + y * size;
      r = Math.max(0.6, r);
      shades[k].moveTo(px + r, py);
      shades[k].arc(px, py, r, 0, Math.PI * 2);
      used[k] = true;
    }
    for (let k = 0; k <= SHADES; k++) {
      if (!used[k]) continue;
      ctx.fillStyle = `rgb(${this.ink} / ${k / SHADES})`;
      ctx.fill(shades[k]);
    }

    if (showMask > 0.02) this.outline(mask, cx, cy, size, showMask);
  }

  /** The mask's edge as a thin line over the dots. */
  private outline(m: ReturnType<typeof maskAt>, cx: number, cy: number, size: number, alpha: number) {
    const { ctx } = this;
    const steps = 40;
    ctx.beginPath();
    for (let k = 0; k <= steps * 2; k++) {
      // Down the right side, then back up the left.
      const right = k <= steps;
      const t = right ? k / steps : 2 - k / steps;
      const y = m.top + (m.bottom - m.top) * t;
      const half = m.w * Math.min(1, 0.25 + t * 1.4) * (t > 0.75 ? 1 - ((t - 0.75) / 0.25) ** 2 * m.round : 1);
      const px = cx + (right ? half : -half) * size;
      const py = cy + y * size;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgb(${this.ink} / ${0.85 * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
