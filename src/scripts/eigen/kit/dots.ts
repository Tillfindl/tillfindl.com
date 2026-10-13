/**
 * Eigen's dots for the site, in pen on paper, in any element: a face for the CPAP masks, a full-face
 * mask that settles onto it, and the foot scan that the face streams into at the pivot.
 *
 * The scan is the onboarding's (eigen-motion's kit/scan.ts), on repeat: a sparse foot, filling in
 * heel to toe while a phone passes slowly beneath it; as the phone reaches the toes the foot
 * becomes its skeleton, and length, width and arch come in one after another. Then the
 * measurements go, the skeleton flows back into the sparse foot and it scans again.
 *
 * The face is a real head scan (public/eigen/face.bin, stippled by its shading: tools/face-cloud.py)
 * and the mask is modelled on it (cpap.bin): cushion, clear shell, frame, elbow, hose and headgear.
 * The face and its mask share their dots' order with the foot, so the pivot moves each dot a short
 * way. It stops drawing while off screen or paused.
 */
import {
  applySlots,
  cloudFrame,
  cloudState,
  Clock,
  footState,
  matchSlots,
  normalizeCloud,
  ParticleEngine,
  skeletonState,
  voidState,
  type CloudState,
  type EngineState,
  type PointCloud,
  type StateFrame,
  type TransitionSpec,
} from '../engine'
import { overlayStats } from '../story/draw'
import { FootOverlay, footMeasure } from '../story/acts/footScan'
import { smooth, type Stage } from '../story/stage'
import { cloud } from './assets'

export type DotsMode = 'void' | 'face' | 'mask' | 'scan'

export interface DotsOptions {
  /** Dot colour. */
  ink: string
  /** Font family for the measurements. */
  font?: string
  /** Device pixels per CSS pixel to draw at (fewer on a phone, where each frame costs more). */
  pixelRatio?: number
}

export interface Dots {
  /** Shows the empty paper, the face, the face with its mask settling on, or the scan on repeat. */
  show(mode: DotsMode): void
  pause(): void
  play(): void
  destroy(): void
}

/** The story's foot size, × the layout size. */
const FOOT_SIZE = 1.42
/** The head's size against the layout size, and how far its centre sits above the stage's. */
const FACE = { size: 1.62, lift: 0.08 }
/** The face's three-quarter view: its yaw, how far it turns either way, and how slowly. */
const FACE_MOTION = { yaw: -0.52, tilt: 0.05, spin: 0, sway: 0.16, swayPeriod: 13, drift: 0.2, depthGain: 1.6 }
/** How the face's dots look: depth makes them smaller and fainter towards the back. */
const FACE_LOOK = { rBase: 0.78, rDepth: 0.9, inkBase: 0.9, inkDepth: 0.1, aBase: 0.8, aDepth: 0.2 }
/** How far in front of the face the mask's dots wait (model units), so they settle back onto it. */
const MASK_OFFSET = 0.5
/** Seconds after the face starts gathering that the mask starts to settle, and how long it takes. */
const MASK_AFTER = 1.5
const MASK_SETTLE = 1.6
/**
 * One scan, in seconds from its start. The sparse foot gathers and, from that same moment, fills
 * in heel to toe; the fill ends as the phone reaches the toes and the skeleton takes over.
 */
const SCAN = {
  gather: 1.6,
  fill: [0, 4.45] as [number, number],
  soft: 0.15,
  phone: [0, 5.0] as [number, number],
  phoneRange: [-0.075, 1.22] as [number, number],
  skeleton: 4.5,
  xray: 1.8,
  measure: [4.5, 5.3, 6.1] as [number, number, number],
  measurePace: { draw: 1.8, fade: 1.2 },
  out: [10.0, 10.4] as [number, number],
}
/** The foot's turn, left to right: from this yaw, at this speed (rad/s). */
const FOOT_YAW = { from: -0.52, speed: 0.12 }
const turnOf = (t0: number) => (t: number) => FOOT_YAW.from + FOOT_YAW.speed * (t - t0)
/** Heel → toe in the foot picture's frame (upper right to lower left), as the scan sweeps. */
const HEEL_TO_TOE = [-0.86, -0.51] as const

/**
 * The foot being scanned: the sparse foot, filling in to the dense one heel to toe as a front
 * passes (`frontAt(t)`: 0 at the heel … 1 + soft past the toes).
 */
function scanningState(lo: CloudState, hi: CloudState, along: Float32Array, frontAt: (t: number) => number): EngineState {
  const n = Math.min(lo.count, hi.count, along.length)
  const frame = (): StateFrame => ({
    capacity: n,
    pos: new Float32Array(n * 3),
    look: new Float32Array(n * 3),
    lines: { a: new Uint16Array(4), b: new Uint16Array(4), look: new Float32Array(12), count: 0 },
  })
  const A = frame(), B = frame()
  return {
    id: 'scanning',
    count: n,
    dynamic: true,
    drift: hi.drift,
    park: hi.park,
    transitionIn: hi.transitionIn,
    transitionOut: hi.transitionOut,
    evaluate(t: number, out: StateFrame) {
      lo.evaluate(t, A)
      hi.evaluate(t, B)
      const f = frontAt(t)
      const m = Math.min(n, out.capacity)
      for (let s = 0; s < m; s++) {
        const k = Math.min(1, Math.max(0, (f - along[s]) / SCAN.soft))
        const q = 1 - (1 - k) ** 3
        for (let j = s * 3; j < s * 3 + 3; j++) {
          out.pos[j] = A.pos[j] + (B.pos[j] - A.pos[j]) * q
          out.look[j] = A.look[j] + (B.look[j] - A.look[j]) * q
        }
      }
    },
  }
}

/**
 * The face with and without its mask, in one slot order matched against `ref` (the scan's first
 * state), so the pivot is short. Without the mask, the mask's dots wait hidden in front of the face.
 */
function faceStates(head: PointCloud, mask: PointCloud, scale: number, ref: EngineState): [CloudState, CloudState] {
  const n = head.count + mask.count
  const join = (a?: Float32Array, b?: Float32Array) => {
    if (!a || !b) return undefined
    const out = new Float32Array(a.length + b.length)
    out.set(a)
    out.set(b, a.length)
    return out
  }
  const positions = join(head.positions, mask.positions)!
  const { points } = normalizeCloud(positions, n, cloudFrame(head.positions, head.count))
  const opts = {
    scale,
    dotScale: 300 * FACE.size,
    ...FACE_MOTION,
    look: FACE_LOOK,
    facing: 0.55,
    transitionIn: { duration: 1.6, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.4, arc: 0.12 },
  } as const
  // Matched in view space at the start, like the engine's own shapes.
  const base = cloudState({ id: 'match', points, ...opts })
  const frame: StateFrame = {
    capacity: Math.max(n, ref.count),
    pos: new Float32Array(Math.max(n, ref.count) * 3),
    look: new Float32Array(Math.max(n, ref.count) * 3),
    lines: { a: new Uint16Array(4), b: new Uint16Array(4), look: new Float32Array(12), count: 0 },
  }
  ref.evaluate(0, frame)
  const slots = matchSlots(frame.pos, ref.count, base.project(0), n, { dims: 3 })
  const placed = applySlots(points, slots, join(head.tone, mask.tone), join(head.normals, mask.normals))
  const masked = cloudState({ id: 'mask', ...opts, ...placed, transitionIn: { duration: MASK_SETTLE, ease: 'outCubic', stagger: 'seed', staggerAmount: 0.3, arc: 0 } })
  // The bare face: the mask's dots hidden, a little in front of where they settle.
  const bare = new Float32Array(placed.points)
  const hidden = new Uint8Array(slots.length)
  for (let s = 0; s < slots.length; s++) {
    const p = slots[s] < 0 ? -slots[s] - 1 : slots[s]
    if (slots[s] < 0 || placed.hidden?.[s]) hidden[s] = 1
    if (p >= head.count) {
      hidden[s] = 1
      bare[s * 3 + 2] += MASK_OFFSET
    }
  }
  const face = cloudState({ id: 'face', ...opts, ...placed, points: bare, hidden })
  return [face, masked]
}

interface Loaded {
  face: PointCloud
  cpap: PointCloud
  foot: PointCloud
  footLo: PointCloud
  skeleton: PointCloud
}

let shared: Promise<Loaded> | null = null
const load = (): Promise<Loaded> =>
  (shared ??= Promise.all([cloud('face'), cloud('cpap'), cloud('foot'), cloud('foot-lo'), cloud('foot-skeleton')]).then(
    ([face, cpap, foot, footLo, skeleton]) => ({ face, cpap, foot, footLo, skeleton }),
  ))

export function mountDots(el: HTMLElement, o: DotsOptions): Dots {
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  const canvas = document.createElement('canvas')
  const layer = document.createElement('canvas')
  for (const c of [canvas, layer]) {
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none'
    el.append(c)
  }
  const ctx = layer.getContext('2d')!
  const clock = new Clock()
  clock.hold('offscreen')
  const engine = new ParticleEngine({ canvas, count: 12000, clock, ink: o.ink, transparent: true, pixelRatio: o.pixelRatio })
  const stage = { clock, width: 1, height: 1, centerY: 0.5, orb: 1, overlay: ctx } as Stage

  let assets: Loaded | null = null
  let overlay: FootOverlay | null = null
  let mode: DotsMode = 'void'
  /** When the current scan started (clock time) and how many of its cues have run. */
  let t0 = 0
  let fired = 0
  /** When the face last started to gather, for its mask to follow. */
  let faceAt = -Infinity
  const turn = { lo: turnOf(0), hi: turnOf(0), skeleton: turnOf(0) }

  const build = () => {
    const r = el.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    engine.resize(w, h)
    engine.setViewOffset(0, h / 2 - Math.round(h * 0.45))
    const dpr = o.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2)
    layer.width = Math.round(w * dpr)
    layer.height = Math.round(h * dpr)
    // As in the story: the foot sits a little above the middle, with room below for the phone.
    const S = Math.round(Math.min(w * 0.4, h * 0.29))
    Object.assign(stage, { width: w, height: h, centerY: Math.round(h * 0.45), orb: S })
    engine.register(voidState('void'))
    if (assets) {
      const a = assets
      const frame = cloudFrame(a.foot.positions, a.foot.count)
      const F = S * FOOT_SIZE
      const hi = footState(a.foot, { size: F, frame })
      const lo = footState(a.footLo, { size: F, ref: hi, frame, detail: 'lo' })
      const skeleton = skeletonState(a.skeleton, { size: F, ref: hi, frame })
      lo.yawAt = (t) => turn.lo(t)
      hi.yawAt = (t) => turn.hi(t)
      skeleton.yawAt = (t) => turn.skeleton(t)
      // Each dense dot's place along the foot, heel (0) to toe (1): when the scan's front reaches it.
      const { points } = normalizeCloud(a.foot.positions, a.foot.count, frame)
      const along = new Float32Array(a.foot.count)
      let u0 = Infinity, u1 = -Infinity
      for (let i = 0; i < a.foot.count; i++) {
        along[i] = HEEL_TO_TOE[0] * points[i * 3] + HEEL_TO_TOE[1] * points[i * 3 + 1]
        u0 = Math.min(u0, along[i])
        u1 = Math.max(u1, along[i])
      }
      for (let i = 0; i < along.length; i++) along[i] = (along[i] - u0) / (u1 - u0 || 1)
      const [f0, f1] = SCAN.fill
      const frontAt = (t: number) => (1 + SCAN.soft) * Math.min(1, Math.max(0, (t - t0 - f0) / (f1 - f0)))
      const scanning = scanningState(lo, hi, along, frontAt)
      const [face, masked] = faceStates(a.face, a.cpap, S * FACE.size, scanning)
      engine.register(scanning, skeleton, face, masked)
      overlay = new FootOverlay(stage, footMeasure(a.foot, frame), hi, o.font)
    }
    engine.invalidate()
  }

  const go = (id: string, spec?: Partial<TransitionSpec>) => engine.transitionTo(id, spec)
  const cues: { at: number; run: () => void }[] = [
    {
      at: 0,
      run: () => {
        // A new scan: the sparse and dense foot turn from here (the skeleton keeps its turn).
        turn.lo = turn.hi = turnOf(t0)
        go('scanning', { duration: SCAN.gather, ease: 'inOutCubic', stagger: 'seed', staggerAmount: 0.35, arc: 0.12 })
      },
    },
    {
      at: SCAN.skeleton,
      run: () => {
        turn.skeleton = turn.hi
        go('skeleton', { duration: SCAN.xray, ease: 'inOutSine', stagger: 'seed', staggerAmount: 0.6, arc: 0.03 })
      },
    },
  ]

  /** Brings the engine to the mode, once the shapes are there. */
  const apply = () => {
    if (!assets) return
    if (mode === 'void') go('void', { duration: 0.8 })
    else if (mode === 'face' || mode === 'mask') {
      go('face')
      faceAt = clock.t
    } else {
      t0 = clock.t
      fired = 0
    }
  }

  const dots: Dots = {
    show(next) {
      if (next === mode) return
      // Face to mask straight away when the face is already there.
      const wasFace = mode === 'face'
      mode = next
      if (wasFace && next === 'mask' && assets) {
        faceAt = clock.t - MASK_AFTER
        return
      }
      apply()
    },
    pause: () => clock.hold('kit'),
    play: () => clock.release('kit'),
    destroy() {
      stopped = true
      ro.disconnect()
      io.disconnect()
      engine.dispose()
      canvas.remove()
      layer.remove()
    },
  }

  build()
  engine.setState('void')
  load().then((a) => {
    assets = a
    build()
    apply()
  })

  const ro = new ResizeObserver(() => build())
  ro.observe(el)
  let visible = false
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) clock.release('offscreen')
    else clock.hold('offscreen')
  })
  io.observe(el)
  let stopped = false
  let drawn = true
  let masked = false
  const frame = (now: number) => {
    if (stopped) return
    clock.tick(now)
    if (assets && mode === 'mask' && !masked && clock.t - faceAt >= MASK_AFTER) {
      masked = true
      go('mask')
    }
    if (mode !== 'mask') masked = false
    let local = -1
    if (assets && mode === 'scan') {
      local = clock.t - t0
      if (local >= SCAN.out[1]) {
        t0 += SCAN.out[1]
        fired = 0
        local = clock.t - t0
      }
      while (fired < cues.length && cues[fired].at <= local) cues[fired++].run()
    }
    if (visible && !clock.paused) {
      const dpr = layer.width / Math.max(1, stage.width)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (drawn) ctx.clearRect(0, 0, layer.width, layer.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      overlayStats.drawn = 0
      if (overlay && local >= 0) {
        const t = clock.t
        const [p0, p1] = SCAN.phone
        const [k0, k1] = SCAN.phoneRange
        const k = k0 + (k1 - k0) * Math.min(1, Math.max(0, (local - p0) / (p1 - p0)))
        overlay.phone(t, k, smooth(p0, p0 + 0.45, local) * (1 - smooth(p1 - 0.45, p1, local)))
        overlay.measures(t, local, SCAN.measure, smooth(SCAN.out[0], SCAN.out[1], local), SCAN.measurePace)
      }
      drawn = overlayStats.drawn > 0
      engine.render()
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  return dots
}
