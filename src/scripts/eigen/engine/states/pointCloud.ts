/**
 * A static point cloud that slowly spins, shaded by depth the same way the
 * orbs are (radius and ink/alpha grow towards the viewer). Used for the M0
 * dummy morph; the sampled logo/foot clouds (M2) will reuse it.
 */
import type { EngineState, StateFrame, TransitionSpec } from '../types'
import { OrbView } from './orb/core'

export interface CloudLook {
  rBase: number
  rDepth: number
  inkBase: number
  inkDepth: number
  aBase: number
  aDepth: number
}

export interface CloudOptions {
  id: string
  /** xyz per point, roughly within the unit sphere. */
  points: Float32Array
  /** CSS px per unit. */
  scale: number
  /** Yaw at t = 0, rad. */
  yaw?: number
  /** Yaw speed, rad/s. */
  spin?: number
  /** Yaw oscillation amplitude, rad (a gentle turn back and forth). */
  sway?: number
  /** Seconds per sway cycle. Default 9. */
  swayPeriod?: number
  tilt?: number
  look?: Partial<CloudLook>
  /** Per point: 1 = invisible (a parked extra particle riding on this point). */
  hidden?: Uint8Array
  /** Per point 0..1, how lit the source was: scales ink, alpha and radius. */
  tone?: Float32Array
  /**
   * Keeps a settled shape alive: each point circles its home on its own
   * slow Lissajous path, this many CSS px across. The shape itself stays put.
   */
  wander?: number
  /** 0..1: a soft brightness wave that drifts across the shape. */
  shimmer?: number
  /** Unit normals per point (model space), for facing and shade. */
  normals?: Float32Array
  /** 0..1: fade dots whose normal faces away, so a closed shape reads solid. */
  facing?: number
  /** 0..1: live light from the upper left on the normals (for shapes that turn). */
  shade?: number
  /**
   * Depth cue strength. Depth is measured against the shape's horizontal
   * extent (what a turn about y swings towards the viewer), times this gain,
   * so a gentle sway still makes far dots smaller and dimmer. Default 1.
   */
  depthGain?: number
  /** Scale at which the look's radii were tuned: radii follow sqrt(scale / dotScale). */
  dotScale?: number
  drift?: number
  park?: EngineState['park']
  transitionIn?: Partial<TransitionSpec>
  transitionOut?: Partial<TransitionSpec>
}

const DEFAULT_LOOK: CloudLook = { rBase: 0.35, rDepth: 0.85, inkBase: 0.35, inkDepth: 0.65, aBase: 0.3, aDepth: 0.7 }

export interface CloudState extends EngineState {
  scale: number
  /** Yaw at time t, rad. */
  yawAt(t: number): number
  /** View-space positions (xyz per point) at time t, e.g. for slot matching. */
  project(t: number, out?: Float32Array): Float32Array
}

export function cloudState(o: CloudOptions): CloudState {
  const look = { ...DEFAULT_LOOK, ...o.look }
  const pts = o.points
  const hidden = o.hidden
  const tone = o.tone
  const wander = o.wander ?? 0
  const shimmer = o.shimmer ?? 0
  const normals = o.normals
  const facing = normals ? (o.facing ?? 0) : 0
  const shade = normals ? (o.shade ?? 0) : 0
  const nview = new OrbView()
  const count = Math.floor(pts.length / 3)
  let extent = 0
  for (let i = 0; i < count; i++) extent = Math.max(extent, Math.hypot(pts[i * 3], pts[i * 3 + 2]))
  extent = (extent || 1) / (o.depthGain ?? 1)
  const dotScale = o.dotScale
  const view = new OrbView()
  const yaw0 = o.yaw ?? 0
  const spin = o.spin ?? 0.15
  const sway = o.sway ?? 0
  const swayW = (2 * Math.PI) / (o.swayPeriod ?? 9)
  const tilt = o.tilt ?? 0.3

  const state: CloudState = {
    id: o.id,
    count,
    dynamic: spin !== 0 || sway !== 0 || wander !== 0 || shimmer !== 0,
    drift: o.drift ?? 0.6,
    park: o.park,
    scale: o.scale,
    transitionIn: {
      duration: 1.6,
      ease: 'inOutCubic',
      stagger: 'radial',
      staggerAmount: 0.4,
      arc: 0.15,
      ...o.transitionIn,
    },
    transitionOut: o.transitionOut,
    yawAt(t: number) {
      return yaw0 + t * spin + sway * Math.sin(t * swayW)
    },
    project(t: number, out = new Float32Array(count * 3)) {
      view.set(state.yawAt(t), tilt, state.scale)
      for (let i = 0; i < count; i++) {
        view.apply(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2])
        out[i * 3] = view.x
        out[i * 3 + 1] = view.y
        out[i * 3 + 2] = view.z
      }
      return out
    },
    evaluate(t: number, out: StateFrame) {
      view.set(state.yawAt(t), tilt, state.scale)
      if (normals) nview.set(state.yawAt(t), tilt, 1)
      const rs = dotScale ? Math.sqrt(state.scale / dotScale) : 1
      const p = out.pos
      const l = out.look
      const n = Math.min(count, out.capacity)
      for (let i = 0; i < n; i++) {
        const i3 = i * 3
        view.apply(pts[i3], pts[i3 + 1], pts[i3 + 2])
        const depth = Math.min(1, Math.max(0, (view.zRaw / extent + 1) / 2))
        p[i3] = view.x
        p[i3 + 1] = view.y
        p[i3 + 2] = view.z
        if (wander !== 0) {
          // Per-point speeds and phases from a cheap hash of the slot.
          const h = Math.sin(i * 12.9898) * 43758.5453
          const f = h - Math.floor(h)
          p[i3] += wander * 0.5 * Math.sin(t * (0.7 + 0.6 * f) + f * 40)
          p[i3 + 1] += wander * 0.5 * Math.sin(t * (0.9 - 0.4 * f) + f * 90)
        }
        if (hidden && hidden[i]) {
          l[i3] = 0.5
          l[i3 + 1] = 1
          l[i3 + 2] = 0
          continue
        }
        l[i3] = (look.rBase + look.rDepth * depth) * rs
        l[i3 + 1] = look.inkBase + look.inkDepth * depth
        l[i3 + 2] = look.aBase + look.aDepth * depth
        if (normals && (facing !== 0 || shade !== 0)) {
          nview.apply(normals[i3], normals[i3 + 1], normals[i3 + 2])
          if (facing !== 0) {
            const f = Math.min(1, Math.max(0, (nview.z + 0.15) / 0.5))
            l[i3 + 2] *= 1 - facing * (1 - f * f * (3 - 2 * f))
          }
          if (shade !== 0) {
            const lit = Math.max(0, -0.45 * nview.x + 0.55 * nview.y + 0.7 * nview.z) / 0.99
            l[i3 + 1] *= 1 - shade * (1 - lit)
          }
        }
        if (shimmer !== 0) {
          const w = 0.5 + 0.5 * Math.sin(t * 1.1 - view.x * 0.018 + view.y * 0.006)
          l[i3 + 2] *= 1 - shimmer * w
        }
        if (tone) {
          const k = tone[i]
          // Tone shades, it doesn't grey out: depth does the dimming.
          l[i3] *= 0.8 + 0.2 * k
          l[i3 + 1] *= 0.62 + 0.38 * k
          l[i3 + 2] *= 0.6 + 0.4 * k
        }
      }
    },
  }
  return state
}

/**
 * Reorder `points` into slot order from matchSlots(): slot s takes point
 * slots[s]; negative entries become hidden particles riding on their host.
 */
export function applySlots(
  points: Float32Array,
  slots: Int32Array,
  tone?: Float32Array,
  normals?: Float32Array,
): { points: Float32Array; hidden?: Uint8Array; tone?: Float32Array; normals?: Float32Array } {
  const out = new Float32Array(slots.length * 3)
  const toneOut = tone ? new Float32Array(slots.length) : undefined
  const nOut = normals ? new Float32Array(slots.length * 3) : undefined
  let hidden: Uint8Array | undefined
  for (let s = 0; s < slots.length; s++) {
    let p = slots[s]
    if (p < 0) {
      p = -p - 1
      ;(hidden ??= new Uint8Array(slots.length))[s] = 1
    }
    out[s * 3] = points[p * 3]
    out[s * 3 + 1] = points[p * 3 + 1]
    out[s * 3 + 2] = points[p * 3 + 2]
    if (toneOut) toneOut[s] = tone![p]
    if (nOut) for (let k = 0; k < 3; k++) nOut[s * 3 + k] = normals![p * 3 + k]
  }
  return { points: out, hidden, tone: toneOut, normals: nOut }
}

/** Centre and scale that put a cloud on the unit sphere (see normalizeCloud). */
export interface CloudFrame {
  center: [number, number, number]
  /** Units per source unit (e.g. per mm or per image px). */
  unit: number
}

/** Bounding-box centre, and the scale that puts the farthest point at radius 1. */
export function cloudFrame(positions: Float32Array, count = positions.length / 3): CloudFrame {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < count; i++)
    for (let k = 0; k < 3; k++) {
      const v = positions[i * 3 + k]
      if (v < min[k]) min[k] = v
      if (v > max[k]) max[k] = v
    }
  const c: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  let r = 0
  for (let i = 0; i < count; i++)
    r = Math.max(r, Math.hypot(positions[i * 3] - c[0], positions[i * 3 + 1] - c[1], positions[i * 3 + 2] - c[2]))
  return { center: c, unit: r > 0 ? 1 / r : 1 }
}

/**
 * Centre a point cloud and scale it onto the unit sphere. Pass `frame` to
 * reuse another cloud's frame, so clouds drawn in the same source space
 * (the foot and its skeleton) stay registered.
 */
export function normalizeCloud(
  positions: Float32Array,
  count = positions.length / 3,
  frame: CloudFrame = cloudFrame(positions, count),
): { points: Float32Array; frame: CloudFrame } {
  const { center: c, unit } = frame
  const points = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) points[i * 3 + k] = (positions[i * 3 + k] - c[k]) * unit
  return { points, frame }
}

/** Evenly spread points on a unit sphere (Fibonacci lattice). */
export function fibonacciSphere(n: number): Float32Array {
  const out = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out[i * 3] = r * Math.cos(i * golden)
    out[i * 3 + 1] = y
    out[i * 3 + 2] = r * Math.sin(i * golden)
  }
  return out
}

/** Deterministic points on the surface of a cube with half-extent 0.62. */
export function cubeSurface(n: number): Float32Array {
  const out = new Float32Array(n * 3)
  const h = 0.62
  let s = 0x9e3779b9
  const rnd = () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
  for (let i = 0; i < n; i++) {
    const face = i % 6
    const u = (rnd() * 2 - 1) * h
    const v = (rnd() * 2 - 1) * h
    const w = face % 2 ? h : -h
    const axis = face >> 1
    const i3 = i * 3
    out[i3 + axis] = w
    out[i3 + ((axis + 1) % 3)] = u
    out[i3 + ((axis + 2) % 3)] = v
  }
  return out
}
