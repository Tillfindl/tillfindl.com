/**
 * Bounceback orbs, web runtime: every icon as the same few hundred dots, and a
 * morph from any state to any other. No dependencies, no WebGL: a 2D canvas
 * draws the dots, so it runs anywhere a browser does (Angular included).
 *
 * The maths here is the reference for the Swift and Kotlin runtimes
 * (orbs/ios, orbs/android); orbs/SPEC.md describes it and orbs/golden.json
 * pins it. Change one, change all three and rerun the golden tests.
 */

// ------------------------------------------------------------------ data

export interface OrbMotion {
  part: number
  type: 'spin' | 'keys' | 'wave'
  // spin
  axis?: number[]
  speed?: number
  // spin, keys
  pivot?: number[]
  phase?: number
  // keys: rows of [t, dx, dy, dz, rz, scale, alpha], t in seconds within the period
  period?: number
  keys?: number[][]
  // wave
  amp?: number
  freq?: number
  x0?: number
  len?: number
}

export interface OrbShapeData {
  id: string
  kind: 'weave' | 'rubik' | 'points'
  /** xyz per dot, unit space × 1000. */
  p?: number[]
  /** Per dot, /100: 100 is a bright strand dot, 0 a faint ghost dot, above 100 bolder, below 0 hidden. */
  tone?: number[]
  /** Per dot motion part. */
  part?: number[]
  /** Depth normaliser (unit space): view z at ±depth reads as fully near / far. */
  depth?: number
  yaw?: number
  tilt?: number
  sway?: number
  swayPeriod?: number
  spin?: number
  /** Ink and alpha times this (clamped when drawn), so every icon reads about as bright. Default 1. */
  brightness?: number
  motions?: OrbMotion[]
}

export interface OrbData {
  format: 'bounceback-orbs'
  version: number
  count: number
  shapes: OrbShapeData[]
}

// ------------------------------------------------------------------ constants

/** Unit space to px: the orb's radius is this fraction of the frame size. */
export const UNIT_SCALE = 0.38
/** Dot radii are tuned for a 300 px frame and scale with (size / 300)^0.6. */
export const RADIUS_REF = 300
export const RADIUS_POW = 0.6
/** Smallest dot drawn, px. */
export const RADIUS_MIN = 0.3
/** Morph timing: seconds, and the share of it spent staggering start times. */
export const MORPH_DURATION = 1.2
export const MORPH_STAGGER = 0.35
/** Sideways swing of each dot's path, as a fraction of its travel. */
export const MORPH_ARC = 0.12
/** The weaving orb's speed (the thinking-orbs 64 preset). */
export const WEAVE_SPEED = 1.625
/** The solving orb: speed (half the thinking-orbs 64 preset's, so it turns calmly), radius against the weaving orb's, and its lattice. */
export const RUBIK_SPEED = 0.9
export const RUBIK_RADIUS = 0.82 / 0.76
export const RUBIK_RINGS = 14
export const RUBIK_LON = 34
/** Quarter turns in one scramble, seconds (orb time) per turn, and the rest once solved. */
export const RUBIK_MOVES = 14
export const RUBIK_SLOT = 0.42
export const RUBIK_REST = 1.2

// ------------------------------------------------------------------ frames

/** A state's output: unit view-space xyz, and per dot radius (px at 300), ink and alpha. */
export interface OrbFrame {
  pos: Float64Array
  look: Float64Array
}

export function newFrame(n: number): OrbFrame {
  return { pos: new Float64Array(n * 3), look: new Float64Array(n * 3) }
}

function fract(x: number): number {
  return x - Math.floor(x)
}

/** Deterministic per-dot seed in [0, 1). */
export function seedOf(i: number): number {
  return fract(Math.sin(i * 12.9898 + 78.233) * 43758.5453)
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

function smooth(x: number): number {
  return x * x * (3 - 2 * x)
}

/**
 * The two looks of the weaving orb, mixed by tone: a faint ghost dot (tone 0)
 * and a bright strand dot (tone 1), both nearer = bigger and brighter. Tone
 * above 1 is a bolder dot; below 0, a hidden one.
 */
function writeLook(look: Float64Array, i: number, depth: number, tone: number, alpha: number): void {
  if (tone < 0) {
    // A hidden dot: it only travels with morphs, fading out where it lands.
    look[i * 3] = 0.8
    look[i * 3 + 1] = 0.22
    look[i * 3 + 2] = 0
    return
  }
  const d = clamp01(depth)
  look[i * 3] = 0.8 + (1.2 + 1.8 * d - 0.8) * tone
  look[i * 3 + 1] = 0.22 + (0.45 + 0.45 * d - 0.22) * tone
  look[i * 3 + 2] = (0.1 + 0.22 * d + (0.45 + 0.55 * d - 0.1 - 0.22 * d) * tone) * alpha
}

// ------------------------------------------------------------------ states

/** Yaw about y, then tilt about x (the thinking-orbs camera). */
class View {
  private sy = 0
  private cy = 1
  private st = 0
  private ct = 1
  set(yaw: number, tilt: number): void {
    this.sy = Math.sin(yaw)
    this.cy = Math.cos(yaw)
    this.st = Math.sin(tilt)
    this.ct = Math.cos(tilt)
  }
  apply(x: number, y: number, z: number, out: Float64Array, i: number): void {
    const x1 = x * this.cy + z * this.sy
    const z1 = -x * this.sy + z * this.cy
    out[i * 3] = x1
    out[i * 3 + 1] = y * this.ct - z1 * this.st
    out[i * 3 + 2] = y * this.st + z1 * this.ct
  }
}

/** The weaving orb: three strands plaiting around a faint ghost sphere. */
function evaluateWeave(n: number, t: number, out: OrbFrame, view: View): void {
  const T = t * WEAVE_SPEED
  view.set(T * 0.4, 0.3)
  const strandN = 52
  const ghostN = n - 3 * strandN
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < ghostN; i++) {
    const y = 1 - (2 * (i + 0.5)) / ghostN
    const rad = Math.sqrt(1 - y * y)
    view.apply(rad * Math.cos(i * golden), y, rad * Math.sin(i * golden), out.pos, i)
    writeLook(out.look, i, (out.pos[i * 3 + 2] + 1) / 2, 0, 1)
  }
  let slot = ghostN
  for (let s = 0; s < 3; s++) {
    const phase = (s / 3) * 2 * Math.PI
    for (let i = 0; i < strandN; i++) {
      const u = (fract(i / strandN + T * 0.045) * 2 - 1) * 0.96
      const surf = Math.sqrt(Math.max(0, 1 - u * u))
      const endFade = Math.min(1, (1 - Math.abs(u)) / 0.1)
      const a = u * Math.PI * 3 + phase
      const weave = 1 + 0.075 * Math.sin(u * Math.PI * 6 + phase * 2 + T * 0.8)
      const rr = surf * weave
      view.apply(Math.cos(a) * rr, u * weave, Math.sin(a) * rr, out.pos, slot)
      writeLook(out.look, slot, (out.pos[slot * 3 + 2] + 1) / 2, 1, endFade)
      slot++
    }
  }
}

/** Deterministic hash in [0, 1), the thinking-orbs one. */
function hashD(a: number, b: number): number {
  return fract(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)
}

/** The scramble: a quarter turn of one slab (-1..-0.5, …, 0.5..1) about one axis per move. */
const RUBIK_MOVE_LIST = Array.from({ length: RUBIK_MOVES }, (_, i) => {
  const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3))
  const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4))
  const dir = hashD(i, 7.7) < 0.5 ? 1 : -1
  return { axis, lo, hi: lo + 0.5, ang: (dir * Math.PI) / 2 }
})
const rubikAmount = new Float64Array(RUBIK_MOVES)

/**
 * The solving orb: a dotted globe cut into slabs that scramble in quarter
 * turns, then un-turn in reverse and click back solved. Each move eases out
 * over 70% of its slot; the slab turning brightens a little.
 */
function evaluateRubik(n: number, t: number, out: OrbFrame, view: View): void {
  const T = t * RUBIK_SPEED
  view.set(T * 0.55, 0.35 + 0.1 * Math.sin(T * 0.9))
  const count = RUBIK_MOVES
  const cyc = 2 * count * RUBIK_SLOT + RUBIK_REST
  const tc = T % cyc
  rubikAmount.fill(0)
  let active = -1
  if (tc < 2 * count * RUBIK_SLOT) {
    const slot = Math.floor(tc / RUBIK_SLOT)
    const p = (tc - slot * RUBIK_SLOT) / RUBIK_SLOT
    const ep = 1 - (1 - Math.min(1, p / 0.7)) ** 3
    if (slot < count) {
      for (let i = 0; i < slot; i++) rubikAmount[i] = 1
      rubikAmount[slot] = ep
      active = slot
    } else {
      const u = 2 * count - 1 - slot
      for (let i = 0; i < u; i++) rubikAmount[i] = 1
      rubikAmount[u] = 1 - ep
      active = u
    }
  }
  const R = RUBIK_RADIUS
  let k = 0
  for (let li = 0; li <= RUBIK_RINGS && k < n; li++) {
    const lat = -Math.PI / 2 + (li / RUBIK_RINGS) * Math.PI
    const cosLat = Math.cos(lat)
    const ring = Math.max(1, Math.round(Math.abs(cosLat) * RUBIK_LON))
    for (let lj = 0; lj < ring && k < n; lj++) {
      const lon = (lj / ring) * 2 * Math.PI
      let x = cosLat * Math.cos(lon), y = Math.sin(lat), z = cosLat * Math.sin(lon)
      let inActive = false
      for (let i = 0; i < count; i++) {
        if (rubikAmount[i] <= 0) continue
        const mv = RUBIK_MOVE_LIST[i]
        const coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z
        if (coord < mv.lo || coord >= mv.hi) continue
        if (i === active) inActive = true
        const a = mv.ang * rubikAmount[i]
        const ca = Math.cos(a), sa = Math.sin(a)
        if (mv.axis === 0) [y, z] = [y * ca - z * sa, y * sa + z * ca]
        else if (mv.axis === 1) [x, z] = [x * ca + z * sa, -x * sa + z * ca]
        else [x, y] = [x * ca - y * sa, x * sa + y * ca]
      }
      view.apply(x * R, y * R, z * R, out.pos, k)
      const d = clamp01((out.pos[k * 3 + 2] / R + 1) / 2)
      const on = inActive ? 1 : 0
      out.look[k * 3] = 0.6 + 1.7 * d + 0.3 * on
      out.look[k * 3 + 1] = 0.38 + 0.54 * d + 0.14 * on
      out.look[k * 3 + 2] = 1
      k++
    }
  }
  // Any slots the lattice leaves over rest invisibly at the centre.
  for (; k < n; k++) {
    out.pos.fill(0, k * 3, k * 3 + 3)
    out.look[k * 3] = 0.6
    out.look[k * 3 + 1] = 0.38
    out.look[k * 3 + 2] = 0
  }
}

interface Shape {
  data: OrbShapeData
  p: Float64Array
  tone: Float64Array
  part: Uint8Array
  /** Motions per part, in order. */
  motions: OrbMotion[][]
}

function prepare(s: OrbShapeData, n: number): Shape {
  const p = new Float64Array(n * 3)
  const tone = new Float64Array(n)
  const part = new Uint8Array(n)
  if (s.kind === 'points') {
    for (let i = 0; i < n * 3; i++) p[i] = (s.p![i] ?? 0) / 1000
    for (let i = 0; i < n; i++) {
      tone[i] = (s.tone?.[i] ?? 100) / 100
      part[i] = s.part?.[i] ?? 0
    }
  }
  const motions: OrbMotion[][] = []
  for (const m of s.motions ?? []) (motions[m.part] ??= []).push(m)
  return { data: s, p, tone, part, motions }
}

/** Keyframe values at time t: [dx, dy, dz, rz, scale, alpha]. Smoothstep between keys; loops. */
function keyValues(m: OrbMotion, t: number, out: number[]): void {
  const keys = m.keys!
  const period = m.period!
  const tau = fract((t + (m.phase ?? 0)) / period) * period
  let k = keys.length - 1
  for (let j = 0; j < keys.length - 1; j++)
    if (tau < keys[j + 1][0]) {
      k = j
      break
    }
  const a = keys[k]
  const b = k + 1 < keys.length ? keys[k + 1] : keys[0]
  const tb = k + 1 < keys.length ? b[0] : period
  const f = smooth(clamp01(tb > a[0] ? (tau - a[0]) / (tb - a[0]) : 0))
  for (let c = 0; c < 6; c++) out[c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f
}

const kv = [0, 0, 0, 0, 1, 1]

function evaluateShape(sh: Shape, n: number, t: number, out: OrbFrame, view: View): void {
  const d = sh.data
  const sway = d.sway ?? 0
  const yaw = (d.yaw ?? 0) + (d.spin ?? 0) * t + sway * Math.sin((2 * Math.PI * t) / (d.swayPeriod ?? 9))
  view.set(yaw, d.tilt ?? 0.3)
  const depthRef = d.depth ?? 1
  const bright = d.brightness ?? 1
  for (let i = 0; i < n; i++) {
    let x = sh.p[i * 3], y = sh.p[i * 3 + 1], z = sh.p[i * 3 + 2]
    let alpha = 1
    for (const m of sh.motions[sh.part[i]] ?? []) {
      if (m.type === 'spin') {
        const [px, py, pz] = m.pivot ?? [0, 0, 0]
        const [ax, ay, az] = m.axis!
        const ang = m.speed! * t + (m.phase ?? 0)
        const c = Math.cos(ang), s = Math.sin(ang)
        const qx = x - px, qy = y - py, qz = z - pz
        const dot = ax * qx + ay * qy + az * qz
        // Rodrigues: q cos + (a × q) sin + a (a·q)(1 − cos).
        x = px + qx * c + (ay * qz - az * qy) * s + ax * dot * (1 - c)
        y = py + qy * c + (az * qx - ax * qz) * s + ay * dot * (1 - c)
        z = pz + qz * c + (ax * qy - ay * qx) * s + az * dot * (1 - c)
      } else if (m.type === 'keys') {
        keyValues(m, t, kv)
        const [px, py, pz] = m.pivot ?? [0, 0, 0]
        const qx = (x - px) * kv[4], qy = (y - py) * kv[4], qz = (z - pz) * kv[4]
        const c = Math.cos(kv[3]), s = Math.sin(kv[3])
        x = px + qx * c - qy * s + kv[0]
        y = py + qx * s + qy * c + kv[1]
        z = pz + qz + kv[2]
        alpha *= kv[5]
      } else if (m.type === 'wave') {
        const w = clamp01((x - m.x0!) / m.len!)
        z += m.amp! * w * Math.sin(m.freq! * (x - m.x0!) - m.speed! * t)
      }
    }
    view.apply(x, y, z, out.pos, i)
    writeLook(out.look, i, (out.pos[i * 3 + 2] / depthRef + 1) / 2, sh.tone[i], alpha)
    out.look[i * 3 + 1] *= bright
    out.look[i * 3 + 2] *= bright
  }
}

// ------------------------------------------------------------------ core

/**
 * The state machine: which state is showing, and the morph into it. Every
 * output is a function of the time you pass in, so pausing your clock
 * freezes the dots and replaying it replays them.
 */
export class OrbCore {
  readonly count: number
  readonly ids: string[]
  private shapes: Shape[]
  private view = new View()
  private fromFrame: OrbFrame
  private toFrame: OrbFrame
  private outFrame: OrbFrame
  /** Frozen start of the current morph, when it interrupted another. */
  private snapshot: OrbFrame | null = null
  private fromIndex = 0
  private toIndex = 0
  private t0 = -Infinity
  private duration = MORPH_DURATION

  constructor(data: OrbData, initial?: string) {
    if (data.format !== 'bounceback-orbs') throw new Error('bounceback-orbs: not an orbs file')
    this.count = data.count
    this.shapes = data.shapes.map((s) => prepare(s, data.count))
    this.ids = data.shapes.map((s) => s.id)
    this.fromFrame = newFrame(this.count)
    this.toFrame = newFrame(this.count)
    this.outFrame = newFrame(this.count)
    this.toIndex = this.fromIndex = Math.max(0, initial ? this.ids.indexOf(initial) : 0)
  }

  /** The state shown (or being morphed to). */
  get state(): string {
    return this.ids[this.toIndex]
  }

  /** Show a state at once, no morph. */
  set(id: string): void {
    const k = this.index(id)
    this.fromIndex = this.toIndex = k
    this.snapshot = null
    this.t0 = -Infinity
  }

  /**
   * Morph to a state, starting at time t. Morphing mid-morph starts from
   * where the dots are, so nothing jumps.
   */
  to(id: string, t: number, duration = MORPH_DURATION): void {
    const k = this.index(id)
    if (this.progress(t) < 1) {
      const f = this.frame(t)
      this.snapshot ??= newFrame(this.count)
      this.snapshot.pos.set(f.pos)
      this.snapshot.look.set(f.look)
    } else {
      this.snapshot = null
      this.fromIndex = this.toIndex
    }
    this.toIndex = k
    this.t0 = t
    this.duration = duration
  }

  /** Raw morph progress 0..1 at time t. */
  progress(t: number): number {
    return clamp01((t - this.t0) / this.duration)
  }

  /** Evaluate one state on its own at time t. */
  evaluate(id: string | number, t: number, out: OrbFrame): OrbFrame {
    const sh = this.shapes[typeof id === 'number' ? id : this.index(id)]
    if (sh.data.kind === 'weave') evaluateWeave(this.count, t, out, this.view)
    else if (sh.data.kind === 'rubik') evaluateRubik(this.count, t, out, this.view)
    else evaluateShape(sh, this.count, t, out, this.view)
    return out
  }

  /** The dots at time t: unit view-space positions and looks. */
  frame(t: number): OrbFrame {
    const n = this.count
    const out = this.outFrame
    const m = this.progress(t)
    this.evaluate(this.toIndex, t, this.toFrame)
    if (m >= 1) {
      out.pos.set(this.toFrame.pos)
      out.look.set(this.toFrame.look)
      return out
    }
    const from = this.snapshot ?? this.evaluate(this.fromIndex, t, this.fromFrame)
    const S = MORPH_STAGGER
    for (let i = 0; i < n; i++) {
      const seed = seedOf(i)
      const p = easeInOutCubic(clamp01((m - seed * S) / (1 - S)))
      const i3 = i * 3
      const fx = from.pos[i3], fy = from.pos[i3 + 1], fz = from.pos[i3 + 2]
      const tx = this.toFrame.pos[i3], ty = this.toFrame.pos[i3 + 1], tz = this.toFrame.pos[i3 + 2]
      let x = fx + (tx - fx) * p
      let y = fy + (ty - fy) * p
      let z = fz + (tz - fz) * p
      if (p > 0 && p < 1) {
        const k = Math.sin(Math.PI * p) * MORPH_ARC * Math.hypot(tx - fx, ty - fy, tz - fz)
        const th = 2 * Math.PI * fract(seed * 7.123)
        const cz = 2 * fract(seed * 3.717) - 1
        const rr = Math.sqrt(Math.max(0, 1 - cz * cz))
        x += rr * Math.cos(th) * k
        y += rr * Math.sin(th) * k
        z += cz * k
      }
      out.pos[i3] = x
      out.pos[i3 + 1] = y
      out.pos[i3 + 2] = z
      for (let c = 0; c < 3; c++) out.look[i3 + c] = from.look[i3 + c] + (this.toFrame.look[i3 + c] - from.look[i3 + c]) * p
    }
    return out
  }

  private index(id: string): number {
    const k = this.ids.indexOf(id)
    if (k < 0) throw new Error(`bounceback-orbs: no state "${id}"`)
    return k
  }
}

// ------------------------------------------------------------------ drawing

export interface DrawOptions {
  /** The orb's frame size in px (CSS px on the web, pt on iOS, dp on Android). */
  size: number
  /** Centre in px. */
  cx: number
  cy: number
  /** Ink colour, [r, g, b] 0..255. Default off-white. */
  ink?: [number, number, number]
}

export const INK: [number, number, number] = [234, 234, 234]
export const BACKGROUND = '#090A0B'

/**
 * Dots in paint order (far to near) as px: x, y, radius, then colour
 * (r, g, b 0..255, alpha 0..1). Shared by every renderer; skips invisible dots.
 */
export function layout(f: OrbFrame, o: DrawOptions, order: Int32Array, out: Float64Array): number {
  const n = order.length
  for (let i = 0; i < n; i++) order[i] = i
  // Stable sort by depth, far first.
  order.sort((a, b) => f.pos[a * 3 + 2] - f.pos[b * 3 + 2] || a - b)
  const unit = o.size * UNIT_SCALE
  const rs = (o.size / RADIUS_REF) ** RADIUS_POW
  const ink = o.ink ?? INK
  let k = 0
  for (let j = 0; j < n; j++) {
    const i = order[j]
    const a = f.look[i * 3 + 2]
    if (a < 0.02) continue
    const v = clamp01(f.look[i * 3 + 1])
    out[k * 7] = o.cx + f.pos[i * 3] * unit
    out[k * 7 + 1] = o.cy - f.pos[i * 3 + 1] * unit
    out[k * 7 + 2] = Math.max(RADIUS_MIN, f.look[i * 3] * rs)
    out[k * 7 + 3] = ink[0] * v
    out[k * 7 + 4] = ink[1] * v
    out[k * 7 + 5] = ink[2] * v
    out[k * 7 + 6] = Math.min(1, a)
    k++
  }
  return k
}

/** Canvas 2D renderer. `ctx` is already scaled to CSS px. */
export class OrbPainter {
  readonly core: OrbCore
  private order: Int32Array
  private dots: Float64Array
  constructor(core: OrbCore) {
    this.core = core
    this.order = new Int32Array(core.count)
    this.dots = new Float64Array(core.count * 7)
  }
  draw(ctx: CanvasRenderingContext2D, t: number, o: DrawOptions): void {
    const k = layout(this.core.frame(t), o, this.order, this.dots)
    const D = this.dots
    for (let j = 0; j < k; j++) {
      ctx.fillStyle = `rgba(${D[j * 7 + 3] | 0},${D[j * 7 + 4] | 0},${D[j * 7 + 5] | 0},${D[j * 7 + 6].toFixed(3)})`
      ctx.beginPath()
      ctx.arc(D[j * 7], D[j * 7 + 1], D[j * 7 + 2], 0, 2 * Math.PI)
      ctx.fill()
    }
  }
}

// ------------------------------------------------------------------ element

/**
 * `<bounceback-orb state="house">`: fills its box, morphs whenever `state`
 * changes. Load the data once with `BouncebackOrb.use(data)` (or set
 * `src="orbs.json"` on an element). Attributes: `state`, `size` (px,
 * default 0.8 × the box's smaller side), `background` (default transparent),
 * `ink` (hex). In Angular, add CUSTOM_ELEMENTS_SCHEMA and bind
 * `[attr.state]`.
 */
// A plain class stands in where there is no DOM (tests, server rendering).
const ElementBase = (typeof HTMLElement !== 'undefined' ? HTMLElement : class {}) as typeof HTMLElement

export class BouncebackOrb extends ElementBase {
  static observedAttributes = ['state', 'size', 'background', 'ink', 'src']
  private static shared: Promise<OrbData> | null = null

  /** Use one data set for every element on the page. */
  static use(data: OrbData | Promise<OrbData>): void {
    BouncebackOrb.shared = Promise.resolve(data)
  }

  private canvas = document.createElement('canvas')
  private core: OrbCore | null = null
  private painter: OrbPainter | null = null
  private raf = 0
  private observer = new ResizeObserver(() => this.fit())
  private cssW = 0
  private cssH = 0
  private dpr = 1
  private start = performance.now()

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = ':host{display:block;position:relative}canvas{position:absolute;inset:0;width:100%;height:100%}'
    root.append(style, this.canvas)
  }

  connectedCallback(): void {
    this.observer.observe(this)
    this.load()
    // Under Angular's zone.js, a frame loop started inside the zone would run
    // change detection every frame; start it in the root zone instead.
    const zone = (globalThis as { Zone?: { root: { run(fn: () => void): void } } }).Zone
    if (zone) zone.root.run(() => (this.raf = requestAnimationFrame(this.tick)))
    else this.raf = requestAnimationFrame(this.tick)
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
    cancelAnimationFrame(this.raf)
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'src' && value && value !== old) {
      this.core = null
      this.load()
    }
    if (name === 'state' && value && this.core && value !== this.core.state) this.core.to(value, this.now())
  }

  private now(): number {
    return (performance.now() - this.start) / 1000
  }

  private async load(): Promise<void> {
    const src = this.getAttribute('src')
    const data = await (src ? fetch(src).then((r) => r.json() as Promise<OrbData>) : BouncebackOrb.shared)
    if (!data) return
    this.core = new OrbCore(data, this.getAttribute('state') ?? undefined)
    this.painter = new OrbPainter(this.core)
  }

  private fit(): void {
    this.dpr = Math.min(3, devicePixelRatio || 1)
    this.cssW = this.clientWidth
    this.cssH = this.clientHeight
    this.canvas.width = Math.round(this.cssW * this.dpr)
    this.canvas.height = Math.round(this.cssH * this.dpr)
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick)
    const ctx = this.canvas.getContext('2d')
    if (!ctx || !this.painter) return
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const bg = this.getAttribute('background')
    if (bg) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, this.cssW, this.cssH)
    } else ctx.clearRect(0, 0, this.cssW, this.cssH)
    const size = Number(this.getAttribute('size')) || 0.8 * Math.min(this.cssW, this.cssH)
    this.painter.draw(ctx, this.now(), { size, cx: this.cssW / 2, cy: this.cssH / 2, ink: hexRgb(this.getAttribute('ink')) })
  }
}

function hexRgb(hex: string | null): [number, number, number] | undefined {
  const m = hex?.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : undefined
}

/** Registers `<bounceback-orb>` (safe to call twice). */
export function defineBouncebackOrb(tag = 'bounceback-orb'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, BouncebackOrb)
}
