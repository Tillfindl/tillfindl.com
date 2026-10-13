/**
 * Morph maths: from/to buffers, per-particle stagger, easing, arc and drift.
 *
 * The GPU runs this per particle in the vertex shader. The CPU mirror below
 * computes the same thing for the few places that need a particle's actual
 * position (depth sorting, line endpoints, mid-transition snapshots).
 * Keep the two in sync: `MORPH_GLSL` is the shader half of this file.
 */
import type { EaseName, StaggerMode, TransitionSpec } from './types'

export const EASE_NAMES: EaseName[] = [
  'linear',
  'inCubic',
  'outCubic',
  'inOutCubic',
  'outQuart',
  'inOutQuart',
  'outExpo',
  'inOutExpo',
  'inOutSine',
]

export const STAGGER_MODES: StaggerMode[] = ['none', 'seed', 'radial', 'axis']

export function ease(id: number, x: number): number {
  switch (id) {
    case 1:
      return x * x * x
    case 2:
      return 1 - (1 - x) ** 3
    case 3:
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
    case 4:
      return 1 - (1 - x) ** 4
    case 5:
      return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2
    case 6:
      return x >= 1 ? 1 : 1 - 2 ** (-10 * x)
    case 7:
      if (x <= 0) return 0
      if (x >= 1) return 1
      return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2
    case 8:
      return -(Math.cos(Math.PI * x) - 1) / 2
    default:
      return x
  }
}

/** Resolved per-frame morph parameters, shared by CPU mirror and shader uniforms. */
export interface MorphParams {
  /** Raw transition progress 0..1. */
  m: number
  ease: number
  staggerMode: number
  staggerAmount: number
  staggerInvert: boolean
  axis: [number, number, number]
  /** Normaliser for radial/axis stagger (CSS px). */
  staggerNorm: number
  arc: number
  driftFrom: number
  driftTo: number
  time: number
}

export function resolveMorphParams(spec: TransitionSpec, m: number): MorphParams {
  const mode = STAGGER_MODES.indexOf(spec.stagger)
  const axis = spec.axis ?? [1, 0, 0]
  const al = Math.hypot(axis[0], axis[1], axis[2]) || 1
  return {
    m,
    ease: Math.max(0, EASE_NAMES.indexOf(spec.ease)),
    staggerMode: mode,
    staggerAmount: mode <= 0 ? 0 : Math.min(0.9, Math.max(0, spec.staggerAmount ?? 0.35)),
    staggerInvert: !!spec.staggerInvert,
    axis: [axis[0] / al, axis[1] / al, axis[2] / al],
    staggerNorm: 1,
    arc: spec.arc ?? 0.12,
    driftFrom: 0,
    driftTo: 0,
    time: 0,
  }
}

/** Deterministic per-slot seed in [0, 1). */
export function slotSeed(i: number): number {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return h - Math.floor(h)
}

function fract(x: number): number {
  return x - Math.floor(x)
}

/** Per-particle eased progress. */
export function particleProgress(P: MorphParams, seed: number, fx: number, fy: number, fz: number): number {
  const S = P.staggerAmount
  let d = 0
  if (P.staggerMode === 1) d = seed
  else if (P.staggerMode === 2) d = Math.min(1, Math.sqrt(fx * fx + fy * fy + fz * fz) / P.staggerNorm)
  else if (P.staggerMode === 3)
    d = Math.min(1, Math.max(0, ((fx * P.axis[0] + fy * P.axis[1] + fz * P.axis[2]) / P.staggerNorm + 1) / 2))
  if (P.staggerInvert) d = 1 - d
  const x = Math.min(1, Math.max(0, (P.m - d * S) / Math.max(1e-5, 1 - S)))
  return ease(P.ease, x)
}

/**
 * Morphed position of one slot, written to out[0..2]. `from`/`to` are xyz
 * arrays and `i3` the slot's offset into them.
 */
export function morphPosition(
  P: MorphParams,
  p: number,
  seed: number,
  from: Float32Array,
  to: Float32Array,
  i3: number,
  out: Float32Array | number[],
): void {
  const fx = from[i3], fy = from[i3 + 1], fz = from[i3 + 2]
  const tx = to[i3], ty = to[i3 + 1], tz = to[i3 + 2]
  let x = fx + (tx - fx) * p
  let y = fy + (ty - fy) * p
  let z = fz + (tz - fz) * p
  if (P.arc !== 0 && p > 0 && p < 1) {
    const dx = tx - fx, dy = ty - fy, dz = tz - fz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const k = Math.sin(Math.PI * p) * P.arc * dist
    const th = 6.283185307179586 * fract(seed * 7.123)
    const cz = 2 * fract(seed * 3.717) - 1
    const rr = Math.sqrt(Math.max(0, 1 - cz * cz))
    x += rr * Math.cos(th) * k
    y += rr * Math.sin(th) * k
    z += cz * k
  }
  const amp = P.driftFrom + (P.driftTo - P.driftFrom) * p
  if (amp !== 0) {
    const t = P.time
    x += amp * Math.sin(t * 0.63 + seed * 61.3)
    y += amp * Math.sin(t * 0.71 + seed * 23.9)
    z += amp * Math.sin(t * 0.57 + seed * 47.1)
  }
  out[0] = x
  out[1] = y
  out[2] = z
}

/** GLSL half of this file. Uniform names match MorphParams. */
export const MORPH_GLSL = /* glsl */ `
uniform float uMorph;
uniform int uEase;
uniform int uStaggerMode;
uniform float uStaggerAmount;
uniform float uStaggerInvert;
uniform vec3 uStaggerAxis;
uniform float uStaggerNorm;
uniform float uArc;
uniform float uDriftFrom;
uniform float uDriftTo;
uniform float uTime;

float easeFn(int id, float x) {
  if (id == 1) return x * x * x;
  if (id == 2) { float u = 1.0 - x; return 1.0 - u * u * u; }
  if (id == 3) { if (x < 0.5) return 4.0 * x * x * x; float u = -2.0 * x + 2.0; return 1.0 - u * u * u / 2.0; }
  if (id == 4) { float u = 1.0 - x; return 1.0 - u * u * u * u; }
  if (id == 5) { if (x < 0.5) return 8.0 * x * x * x * x; float u = -2.0 * x + 2.0; return 1.0 - u * u * u * u / 2.0; }
  if (id == 6) return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
  if (id == 7) {
    if (x <= 0.0) return 0.0;
    if (x >= 1.0) return 1.0;
    return x < 0.5 ? pow(2.0, 20.0 * x - 10.0) / 2.0 : (2.0 - pow(2.0, -20.0 * x + 10.0)) / 2.0;
  }
  if (id == 8) return -(cos(3.141592653589793 * x) - 1.0) / 2.0;
  return x;
}

float particleProgress(float seed, vec3 from) {
  float S = uStaggerAmount;
  float d = 0.0;
  if (uStaggerMode == 1) d = seed;
  else if (uStaggerMode == 2) d = min(1.0, length(from) / uStaggerNorm);
  else if (uStaggerMode == 3) d = clamp((dot(from, uStaggerAxis) / uStaggerNorm + 1.0) / 2.0, 0.0, 1.0);
  if (uStaggerInvert > 0.5) d = 1.0 - d;
  float x = clamp((uMorph - d * S) / max(1e-5, 1.0 - S), 0.0, 1.0);
  return easeFn(uEase, x);
}

vec3 morphPosition(vec3 from, vec3 to, float p, float seed) {
  vec3 pos = mix(from, to, p);
  if (uArc != 0.0 && p > 0.0 && p < 1.0) {
    float k = sin(3.141592653589793 * p) * uArc * length(to - from);
    float th = 6.283185307179586 * fract(seed * 7.123);
    float cz = 2.0 * fract(seed * 3.717) - 1.0;
    float rr = sqrt(max(0.0, 1.0 - cz * cz));
    pos += vec3(rr * cos(th), rr * sin(th), cz) * k;
  }
  float amp = mix(uDriftFrom, uDriftTo, p);
  if (amp != 0.0) {
    pos += amp * vec3(sin(uTime * 0.63 + seed * 61.3), sin(uTime * 0.71 + seed * 23.9), sin(uTime * 0.57 + seed * 47.1));
  }
  return pos;
}
`
