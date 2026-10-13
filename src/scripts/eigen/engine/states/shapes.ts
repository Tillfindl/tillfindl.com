/**
 * The sampled shapes of the story: the Eigen wordmark, the foot (high and
 * low resolution) and its skeleton, the standing runner, and the shoes.
 *
 * They all share the orbs' way of reading as 3D: each is a real volume that
 * keeps turning a little, and dots further back are smaller and dimmer.
 * They move less than the orbs (those are thinking; these are states).
 *
 * Each is slot-matched against a reference state so morphs move every
 * particle a short way: shapes against the hero orb, the skeleton and the
 * low-res foot against the foot, shoe styles against the trainer.
 */
import { matchSlots } from '../match'
import type { PointCloud } from '../pointcloud'
import type { EngineState, StateFrame } from '../types'
import { applySlots, cloudState, normalizeCloud, type CloudFrame, type CloudOptions, type CloudState } from './pointCloud'

export interface ShapeOptions {
  id?: string
  /** Layout size in CSS px, the same number the orbs get. */
  size: number
  /** State to slot-match against, evaluated at `refT`. */
  ref?: EngineState
  refT?: number
  /** Source frame shared with sibling clouds (foot and skeleton, shoe styles). */
  frame?: CloudFrame
}

/** Build a cloud whose slot order follows `ref` (see matchSlots). */
export function matchedCloud(opts: CloudOptions, ref: EngineState | undefined, dims: 2 | 3, refT = 0): CloudState {
  if (!ref) return cloudState(opts)
  const base = cloudState(opts)
  const n = base.count
  const cap = Math.max(n, ref.count)
  const frame: StateFrame = {
    capacity: cap,
    pos: new Float32Array(cap * 3),
    look: new Float32Array(cap * 3),
    lines: { a: new Uint16Array(4096), b: new Uint16Array(4096), look: new Float32Array(4096 * 3), count: 0 },
  }
  ref.evaluate(refT, frame)
  const slots = matchSlots(frame.pos, ref.count, base.project(0), n, { dims })
  return cloudState({ ...opts, ...applySlots(opts.points, slots, opts.tone, opts.normals) })
}

/** Radii below are tuned at a 300 px layout; they grow with sqrt(size). */
const TUNED = 300

// ------------------------------------------------------------------ wordmark

/** Logo width relative to the orb's layout size (the wordmark is about 3:1). */
export const LOGO_SCALE = 0.7

/**
 * The wordmark as a thin slab of dots that sways slowly, so the far end of
 * the word gets smaller and dimmer; the dots keep wandering in the letters.
 */
export function logoState(pc: PointCloud, o: ShapeOptions): CloudState {
  const { points } = normalizeCloud(pc.positions, pc.count)
  // Give the flat letters some thickness.
  for (let i = 0; i < pc.count; i++) {
    const h = Math.sin(i * 78.233) * 43758.5453
    points[i * 3 + 2] = (h - Math.floor(h) - 0.5) * 0.08
  }
  return matchedCloud(
    {
      id: o.id ?? 'logo',
      points,
      scale: o.size * LOGO_SCALE,
      dotScale: TUNED * LOGO_SCALE,
      spin: 0,
      sway: 0.32,
      swayPeriod: 11,
      tilt: 0.06,
      drift: 0,
      depthGain: 1.6,
      wander: 2,
      shimmer: 0.15,
      look: { rBase: 1.05, rDepth: 0.75, inkBase: 0.72, inkDepth: 0.28, aBase: 0.68, aDepth: 0.32 },
      transitionIn: { duration: 1.4, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.35, arc: 0.12 },
      transitionOut: { duration: 1.2, ease: 'inOutCubic', stagger: 'radial', staggerInvert: true, staggerAmount: 0.4, arc: 0.12 },
    },
    o.ref,
    2,
    o.refT,
  )
}

// ------------------------------------------------------------------ foot

export const FOOT_SCALE = 0.85
export type FootDetail = 'hi' | 'lo'

const FOOT_LOOK = { rBase: 0.6, rDepth: 0.85, inkBase: 0.86, inkDepth: 0.14, aBase: 0.7, aDepth: 0.3 }
/** The foot's (and skeleton's) turn: overlays that follow the foot use the same. */
export const FOOT_MOTION = { yaw: 0, tilt: 0.04, spin: 0, sway: 0.42, swayPeriod: 10, drift: 0.3, depthGain: 2 }
/** The near surface carries the form; the far side stays as a faint echo. */
const FOOT_SURFACE = { facing: 0.45, shade: 0.2 }

/**
 * The foot in the reference picture's pose, as a closed volume (every part
 * a round tube) that turns slowly back and forth. `hi` is the dense point
 * cloud, `lo` a sparse one with the same dots (hi only adds dots). The morph in sweeps
 * heel first.
 */
export function footState(pc: PointCloud, o: ShapeOptions & { detail?: FootDetail }): CloudState {
  const lo = o.detail === 'lo'
  const { points } = normalizeCloud(pc.positions, pc.count, o.frame)
  return matchedCloud(
    {
      id: o.id ?? (lo ? 'foot-lo' : 'foot'),
      points,
      tone: pc.tone,
      normals: pc.normals,
      ...FOOT_SURFACE,
      scale: o.size * FOOT_SCALE,
      dotScale: TUNED * FOOT_SCALE,
      ...FOOT_MOTION,
      // Same dots at both resolutions: going hi-res only adds dots, as a scan fills in.
      look: FOOT_LOOK,
      transitionIn: {
        duration: 1.8,
        ease: 'inOutCubic',
        stagger: 'axis',
        // Heel (upper right in the picture) to toes (lower left).
        axis: [-0.86, -0.51, 0],
        staggerAmount: 0.45,
        arc: 0.2,
      },
      transitionOut: { duration: 0.9, ease: 'inOutCubic', stagger: 'radial', staggerAmount: 0.35, arc: 0.12 },
    },
    o.ref,
    3,
    o.refT,
  )
}

/**
 * The foot's bones in the same pose, frame and motion (pass the foot's
 * `frame`), matched against the foot so foot ↔ skeleton reads as an x-ray.
 */
export function skeletonState(pc: PointCloud, o: ShapeOptions): CloudState {
  const { points } = normalizeCloud(pc.positions, pc.count, o.frame)
  const xray = { duration: 1.4, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.4, arc: 0.04 } as const
  return matchedCloud(
    {
      id: o.id ?? 'skeleton',
      points,
      tone: pc.tone,
      normals: pc.normals,
      ...FOOT_SURFACE,
      scale: o.size * FOOT_SCALE,
      dotScale: TUNED * FOOT_SCALE,
      ...FOOT_MOTION,
      look: { rBase: 0.7, rDepth: 0.95, inkBase: 0.92, inkDepth: 0.08, aBase: 0.76, aDepth: 0.24 },
      transitionIn: xray,
      transitionOut: xray,
    },
    o.ref,
    3,
    o.refT,
  )
}

// ------------------------------------------------------------------ runner

export const RUNNER_SCALE = 0.95

/**
 * The standing runner from the reference photo's real silhouette (hands on
 * hips), a closed round volume turning slowly to one side and back.
 */
export function runnerState(pc: PointCloud, o: ShapeOptions): CloudState {
  const { points } = normalizeCloud(pc.positions, pc.count, o.frame)
  return matchedCloud(
    {
      id: o.id ?? 'runner',
      points,
      tone: pc.tone,
      normals: pc.normals,
      shade: 0.15,
      scale: o.size * RUNNER_SCALE,
      dotScale: TUNED * RUNNER_SCALE,
      yaw: 0.12,
      tilt: 0.05,
      spin: 0,
      sway: 0.35,
      swayPeriod: 12,
      drift: 0.3,
      depthGain: 1.6,
      look: { rBase: 0.95, rDepth: 1.2, inkBase: 0.82, inkDepth: 0.18, aBase: 0.7, aDepth: 0.3 },
      transitionIn: { duration: 1.8, ease: 'inOutCubic', stagger: 'axis', axis: [0, -1, 0], staggerAmount: 0.45, arc: 0.15 },
      transitionOut: { duration: 1.1, ease: 'inOutCubic', stagger: 'radial', staggerAmount: 0.35, arc: 0.12 },
    },
    o.ref,
    3,
    o.refT,
  )
}

// ------------------------------------------------------------------ shoes

export type ShoeVariant = 'trainer' | 'cushion' | 'racer' | 'worn' | 'pair'
export const SHOE_STYLES: ShoeVariant[] = ['trainer', 'cushion', 'racer']
export const SHOE_VARIANTS: ShoeVariant[] = [...SHOE_STYLES, 'worn', 'pair']
export const SHOE_SCALE = 0.8

/**
 * A running shoe (tools/shoes.ts) on a slow turntable. The three styles
 * share one frame (pass the trainer's) and match each other, so switching
 * style only moves what differs. `worn` (a shoe with its leg) and `pair`
 * sway instead of spinning, like someone standing.
 */
export function shoeState(pc: PointCloud, variant: ShoeVariant, o: ShapeOptions): CloudState {
  const { points } = normalizeCloud(pc.positions, pc.count, o.frame)
  const worn = variant === 'worn' || variant === 'pair'
  return matchedCloud(
    {
      id: o.id ?? `shoe-${variant}`,
      points,
      normals: pc.normals,
      tone: pc.tone,
      scale: o.size * (worn ? SHOE_SCALE * 1.05 : SHOE_SCALE),
      dotScale: TUNED * SHOE_SCALE,
      ...(worn ? { yaw: -0.6, tilt: 0.12, spin: 0, sway: 0.45, swayPeriod: 11 } : { yaw: -0.5, tilt: 0.28, spin: 0.3 }),
      drift: 0.2,
      depthGain: 1.2,
      facing: 0.35,
      shade: 0.15,
      look: { rBase: 0.8, rDepth: 1.05, inkBase: 0.8, inkDepth: 0.2, aBase: 0.66, aDepth: 0.34 },
      transitionIn: { duration: 1.6, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.4, arc: 0.15 },
    },
    o.ref,
    3,
    o.refT,
  )
}
