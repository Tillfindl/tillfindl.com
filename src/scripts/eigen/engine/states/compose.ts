/**
 * States built from other states, for the story: nothing on screen (void),
 * an expanding invisible shell (the orb opening like an aperture), a state
 * moved to another place, a state breaking into fragments, and several
 * states side by side in one set of slots.
 *
 * All keep slot identity: a wrapper writes the same slots its inner state
 * does, so morphing between a state and its wrapped version only moves what
 * the wrapper changes.
 */
import { matchSlots } from '../match'
import type { EngineState, StateFrame, TransitionSpec } from '../types'
import { fibonacciSphere } from './pointCloud'

function scratch(cap: number): StateFrame {
  return {
    capacity: cap,
    pos: new Float32Array(cap * 3),
    look: new Float32Array(cap * 3),
    lines: { a: new Uint16Array(4096), b: new Uint16Array(4096), look: new Float32Array(4096 * 3), count: 0 },
  }
}

/** Cheap per-slot hash in [0, 1). */
function hash(i: number, k = 0): number {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return h - Math.floor(h)
}

/** Nothing on screen: every particle parked, invisible, at the centre. */
export function voidState(id = 'void', transitionIn?: Partial<TransitionSpec>): EngineState {
  return {
    id,
    count: 0,
    dynamic: false,
    drift: 0,
    park: { center: [0, 0, 0], radius: 2 },
    transitionIn: { duration: 0.8, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.3, arc: 0.08, ...transitionIn },
    evaluate() {},
  }
}

/**
 * An invisible shell far out: morphing to it sends every particle outward,
 * fading, like an aperture opening.
 */
export function shellState(id: string, count: number, radius: number, transitionIn?: Partial<TransitionSpec>): EngineState {
  // Directions shuffled per slot, so whatever order a state fills its slots
  // in, the particles scatter outward in every direction.
  const fib = fibonacciSphere(count)
  const pts = new Float32Array(count * 3)
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => hash(a, 11) - hash(b, 11))
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) pts[i * 3 + k] = fib[order[i] * 3 + k]
  return {
    id,
    count,
    dynamic: false,
    drift: 0,
    transitionIn: { duration: 1, ease: 'inCubic', stagger: 'radial', staggerAmount: 0.3, arc: 0.05, ...transitionIn },
    evaluate(_t: number, out: StateFrame) {
      const n = Math.min(count, out.capacity)
      for (let i = 0; i < n; i++) {
        const i3 = i * 3
        const r = radius * (0.85 + 0.3 * hash(i, 3))
        out.pos[i3] = pts[i3] * r
        out.pos[i3 + 1] = pts[i3 + 1] * r
        out.pos[i3 + 2] = pts[i3 + 2] * r
        out.look[i3] = 0.8
        out.look[i3 + 1] = 1
        out.look[i3 + 2] = 0
      }
    },
  }
}

export interface Placement {
  /** View-space offset, CSS px. */
  offset?: [number, number, number]
  /** Multiplies alpha. */
  alpha?: number
}

/** A state drawn somewhere else on the stage (and optionally dimmer). */
export function placedState(id: string, inner: EngineState, p: Placement, transitionIn?: Partial<TransitionSpec>): EngineState {
  const [ox, oy, oz] = p.offset ?? [0, 0, 0]
  const alpha = p.alpha ?? 1
  return {
    id,
    get count() {
      return inner.count
    },
    dynamic: inner.dynamic,
    drift: inner.drift,
    // Spare particles rest at the inner state's park (the engine's default: the origin), moved with it.
    park: ((k) => ({ center: [k.center[0] + ox, k.center[1] + oy, k.center[2] + oz] as [number, number, number], radius: k.radius }))(
      inner.park ?? { center: [0, 0, 0], radius: 2 },
    ),
    transitionIn: { ...inner.transitionIn, ...transitionIn },
    transitionOut: inner.transitionOut,
    evaluate(t: number, out: StateFrame) {
      inner.evaluate(t, out)
      const n = Math.min(inner.count, out.capacity)
      for (let i = 0; i < n; i++) {
        out.pos[i * 3] += ox
        out.pos[i * 3 + 1] += oy
        out.pos[i * 3 + 2] += oz
        out.look[i * 3 + 2] *= alpha
      }
    },
  }
}

export interface ScatterOptions {
  /** Fraction of the dots that have come loose (0..1). */
  fraction: number
  /** How far a loose dot drifts from its place, CSS px. */
  distance: number
  /** Loose dots start near here first (view space), then spread from it. */
  from?: [number, number]
  /** Radius of the starting region, CSS px (with `from`). */
  reach?: number
  seed?: number
}

/**
 * The inner state with some of its dots come loose: they drift out from
 * their places, smaller and dimmer, and keep floating. Which dots come
 * loose first is decided by distance from `from`, so fragmenting spreads
 * from where something hit. Morphing inner → scattered only moves those.
 */
export function scatteredState(id: string, inner: EngineState, o: ScatterOptions, transitionIn?: Partial<TransitionSpec>): EngineState {
  const seed = o.seed ?? 1
  let order: Float32Array | null = null
  return {
    id,
    get count() {
      return inner.count
    },
    dynamic: true,
    drift: inner.drift,
    park: inner.park,
    transitionIn: { duration: 0.7, ease: 'outCubic', stagger: 'seed', staggerAmount: 0.3, arc: 0.3, ...transitionIn },
    transitionOut: inner.transitionOut,
    evaluate(t: number, out: StateFrame) {
      inner.evaluate(t, out)
      const n = Math.min(inner.count, out.capacity)
      if (!order || order.length < n) {
        // Rank per slot: nearer `from` comes loose first (with some noise).
        order = new Float32Array(n)
        const [fx, fy] = o.from ?? [0, 0]
        const reach = o.reach ?? 1e9
        for (let i = 0; i < n; i++) {
          const d = o.from ? Math.hypot(inner.count ? out.pos[i * 3] - fx : 0, out.pos[i * 3 + 1] - fy) / reach : 0
          order[i] = 0.55 * Math.min(2, d) / 2 + 0.45 * hash(i, seed)
        }
      }
      for (let i = 0; i < n; i++) {
        if (order[i] > o.fraction) continue
        const i3 = i * 3
        const a = hash(i, seed + 1) * Math.PI * 2, b = Math.acos(2 * hash(i, seed + 2) - 1)
        const r = o.distance * (0.35 + 0.65 * hash(i, seed + 3))
        const w = 0.35 + 0.4 * hash(i, seed + 4)
        const f = hash(i, seed + 5) * 40
        out.pos[i3] += r * Math.sin(b) * Math.cos(a) + 3 * Math.sin(t * w + f)
        out.pos[i3 + 1] += r * Math.cos(b) + 3 * Math.sin(t * w * 1.3 + f * 2)
        out.pos[i3 + 2] += r * Math.sin(b) * Math.sin(a)
        out.look[i3] *= 0.8
        out.look[i3 + 2] *= 0.75
      }
    },
  }
}

export interface Part {
  state: EngineState
  offset?: [number, number, number]
  alpha?: number
  /** Alpha over time (multiplies `alpha`), e.g. a part that follows the others in a moment later. */
  alphaAt?: (t: number) => number
  /**
   * How far the part has come out (0..1) over time: at 0 its points wait,
   * invisible, at `rest`; they spread out to their places (and up to full
   * alpha) as it goes to 1. A part can so burst out after the others.
   */
  enterAt?: (t: number) => number
  /** Only these slots of the part (e.g. a subsample); default all. */
  pick?: Int32Array
  /** Hidden parts rest invisibly at `rest` (default the origin). */
  hidden?: boolean
  rest?: [number, number, number]
}

/**
 * Several states side by side in one set of slots (e.g. three shoes).
 * Pass `ref` to order the slots against another state, so morphing from it
 * moves every particle a short way.
 */
export function compositeState(
  id: string,
  parts: Part[],
  o: {
    ref?: EngineState
    refT?: number
    /** Reuse another composite's slot order (same parts, other placements), so morphs between them are short. */
    order?: Int32Array
    transitionIn?: Partial<TransitionSpec>
    drift?: number
  } = {},
): EngineState & { parts: Part[]; order: Int32Array | null } {
  const sizes = parts.map((p) => (p.pick ? p.pick.length : p.state.count))
  const total = sizes.reduce((a, b) => a + b, 0)
  const cap = Math.max(total, ...parts.map((p) => p.state.count))
  const tmp = scratch(cap)
  const all = scratch(Math.max(total, 1))
  let order: Int32Array | null = o.order ?? null

  const writeAll = (t: number, f: StateFrame) => {
    let base = 0
    for (const part of parts) {
      tmp.lines.count = 0
      part.state.evaluate(t, tmp)
      const [ox, oy, oz] = part.offset ?? [0, 0, 0]
      const [rx, ry, rz] = part.rest ?? [0, 0, 0]
      const e = part.enterAt ? Math.min(1, Math.max(0, part.enterAt(t))) : 1
      const a = (part.alpha ?? 1) * (part.alphaAt ? part.alphaAt(t) : 1) * e
      const m = part.pick ? part.pick.length : part.state.count
      for (let j = 0; j < m; j++) {
        const i = part.pick ? part.pick[j] : j
        const s3 = i * 3, d3 = (base + j) * 3
        if (part.hidden) {
          const h = hash(base + j, 9)
          f.pos[d3] = rx + (h - 0.5) * 6
          f.pos[d3 + 1] = ry + (hash(base + j, 10) - 0.5) * 6
          f.pos[d3 + 2] = rz
          f.look[d3] = tmp.look[s3]
          f.look[d3 + 1] = tmp.look[s3 + 1]
          f.look[d3 + 2] = 0
        } else {
          f.pos[d3] = rx + (tmp.pos[s3] + ox - rx) * e
          f.pos[d3 + 1] = ry + (tmp.pos[s3 + 1] + oy - ry) * e
          f.pos[d3 + 2] = rz + (tmp.pos[s3 + 2] + oz - rz) * e
          f.look[d3] = tmp.look[s3]
          f.look[d3 + 1] = tmp.look[s3 + 1]
          f.look[d3 + 2] = tmp.look[s3 + 2] * a
        }
      }
      base += m
    }
  }

  const state: EngineState & { parts: Part[]; count: number; order: Int32Array | null } = {
    id,
    parts,
    get order() {
      return order
    },
    count: order ? order.length : total,
    dynamic: parts.some((p) => p.state.dynamic || !!p.alphaAt || !!p.enterAt),
    drift: o.drift ?? 0,
    transitionIn: { ...COMPOSITE_IN, ...o.transitionIn },
    evaluate(t: number, out: StateFrame) {
      if (!order) return writeAll(t, out)
      writeAll(t, all)
      const n = Math.min(order.length, out.capacity)
      for (let s = 0; s < n; s++) {
        let p = order[s]
        const hidden = p < 0
        if (hidden) p = -p - 1
        const s3 = s * 3, p3 = p * 3
        out.pos[s3] = all.pos[p3]
        out.pos[s3 + 1] = all.pos[p3 + 1]
        out.pos[s3 + 2] = all.pos[p3 + 2]
        out.look[s3] = all.look[p3]
        out.look[s3 + 1] = all.look[p3 + 1]
        out.look[s3 + 2] = hidden ? 0 : all.look[p3 + 2]
      }
    },
  }

  if (o.ref && !order) {
    const ref = scratch(Math.max(o.ref.count, total))
    o.ref.evaluate(o.refT ?? 0, ref)
    writeAll(0, all)
    order = matchSlots(ref.pos, o.ref.count, all.pos, total, { dims: 3 })
    state.count = order.length
  }
  return state
}

const COMPOSITE_IN: TransitionSpec = { duration: 1.6, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.35, arc: 0.15 }

/** Every k-th-ish slot: a deterministic subsample of n slots out of count. */
export function subsample(count: number, n: number, seed = 7): Int32Array {
  if (n >= count) return Int32Array.from({ length: count }, (_, i) => i)
  const idx = Array.from({ length: count }, (_, i) => i).sort((a, b) => hash(a, seed) - hash(b, seed))
  return Int32Array.from(idx.slice(0, n).sort((a, b) => a - b))
}
