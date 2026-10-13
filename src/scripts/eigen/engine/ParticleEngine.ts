import * as THREE from 'three'
import { Clock } from './clock'
import {
  ease,
  morphPosition,
  particleProgress,
  resolveMorphParams,
  slotSeed,
  type MorphParams,
} from './morph'
import { LINES_FRAG, LINES_VERT, POINTS_FRAG, POINTS_VERT } from './shaders'
import { DEFAULT_TRANSITION, type EngineState, type LineList, type StateFrame, type TransitionSpec } from './types'

/** Max line segments a single state may emit per frame. */
export const MAX_LINES_PER_STATE = 4096
const MAX_HISTORY = 64
const SORT_BUCKETS = 4096

export interface EngineOptions {
  canvas: HTMLCanvasElement
  /** Particle budget. 12k to start, 20k max per the gameplan. */
  count?: number
  /** Defaults to min(devicePixelRatio, 2), the same cap Thinking Orbs uses. */
  pixelRatio?: number
  background?: string
  ink?: string
  clock?: Clock
  /** Needed only when another canvas reads this one back (compare page). */
  preserveDrawingBuffer?: boolean
  /** Clear to transparent instead of the background, to draw over other layers. */
  transparent?: boolean
}

export interface EngineStats {
  particles: number
  /** Slots written by the visible states. */
  active: number
  /** Particles actually drawn (visible, depth-sorted). */
  drawn: number
  lines: number
  /** CPU time of the last render() call, ms. */
  cpuMs: number
  /** Bytes uploaded to the GPU in the last frame. */
  uploadBytes: number
  to: string
  from: string
  /** Raw progress of the current transition, 0..1. */
  progress: number
}

type Source =
  | { kind: 'state'; state: EngineState }
  | { kind: 'snapshot'; pos: Float32Array; look: Float32Array; count: number; label: string }

interface Transition {
  from: Source
  to: EngineState
  toSource: Source
  t0: number
  spec: TransitionSpec
  staggerNorm?: number
}

interface Buffer {
  pos: THREE.BufferAttribute
  look: THREE.BufferAttribute
  frame: StateFrame
  key: object | null
  count: number
  lastT: number
}

function makeLineList(): LineList {
  return {
    a: new Uint16Array(MAX_LINES_PER_STATE),
    b: new Uint16Array(MAX_LINES_PER_STATE),
    look: new Float32Array(MAX_LINES_PER_STATE * 3),
    count: 0,
  }
}

function sourceKey(s: Source): object {
  return s.kind === 'state' ? s.state : s
}

function sourceLabel(s: Source): string {
  return s.kind === 'state' ? s.state.id : s.label
}

/**
 * One THREE.Points (one draw call) holding every particle, plus one line
 * mesh. Particles are never created or destroyed: states write into fixed
 * slots and the unused slots are parked, invisible.
 */
export class ParticleEngine {
  readonly clock: Clock
  readonly count: number
  readonly renderer: THREE.WebGLRenderer
  readonly stats: EngineStats

  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e5, 1e5)
  private states = new Map<string, EngineState>()
  private history: Transition[] = []
  private bound: Transition | null = null

  private geometry = new THREE.BufferGeometry()
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private index: THREE.BufferAttribute
  private seeds: Float32Array
  private fromBuf: Buffer
  private toBuf: Buffer

  private lineGeometry = new THREE.BufferGeometry()
  private lineMaterial: THREE.ShaderMaterial
  private lineMesh: THREE.Mesh
  private lineStart: THREE.BufferAttribute
  private lineEnd: THREE.BufferAttribute
  private lineLook: THREE.BufferAttribute

  private params: MorphParams = resolveMorphParams(DEFAULT_TRANSITION, 1)
  private zs: Float32Array
  private sortTmp: Uint32Array
  private sortOut: Uint32Array
  private bucketCounts = new Uint32Array(SORT_BUCKETS + 1)
  private tmp3 = new Float32Array(3)
  private pixelRatio: number
  private width = 1
  private height = 1
  private offset: [number, number] = [0, 0]
  private transparent: boolean

  constructor(opts: EngineOptions) {
    // Colours are authored in sRGB and blended in sRGB, like a 2D canvas.
    // Turning colour management off keeps three from converting anything.
    THREE.ColorManagement.enabled = false

    this.count = Math.max(1, Math.min(65535, Math.floor(opts.count ?? 12000)))
    this.clock = opts.clock ?? new Clock()
    this.pixelRatio = opts.pixelRatio ?? Math.min(2, window.devicePixelRatio || 1)

    this.transparent = !!opts.transparent
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      alpha: this.transparent,
      premultipliedAlpha: true,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setClearColor(new THREE.Color(opts.background ?? '#0B0C0D'), this.transparent ? 0 : 1)

    const N = this.count
    this.seeds = new Float32Array(N)
    for (let i = 0; i < N; i++) this.seeds[i] = slotSeed(i)
    this.zs = new Float32Array(N)
    this.sortTmp = new Uint32Array(N)
    this.sortOut = new Uint32Array(N)

    this.fromBuf = this.makeBuffer()
    this.toBuf = this.makeBuffer()
    const g = this.geometry
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))
    g.setAttribute('aFromPos', this.fromBuf.pos)
    g.setAttribute('aFromLook', this.fromBuf.look)
    g.setAttribute('position', this.toBuf.pos)
    g.setAttribute('aToLook', this.toBuf.look)
    this.index = new THREE.BufferAttribute(N <= 65535 ? new Uint16Array(N) : new Uint32Array(N), 1)
    this.index.setUsage(THREE.DynamicDrawUsage)
    g.setIndex(this.index)
    g.setDrawRange(0, 0)

    const ink = new THREE.Color(opts.ink ?? '#EAEAEA')
    this.material = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
      uniforms: {
        uPixelRatio: { value: this.pixelRatio },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uInk: { value: new THREE.Vector3(ink.r, ink.g, ink.b) },
        uMorph: { value: 1 },
        uEase: { value: 0 },
        uStaggerMode: { value: 0 },
        uStaggerAmount: { value: 0 },
        uStaggerInvert: { value: 0 },
        uStaggerAxis: { value: new THREE.Vector3(1, 0, 0) },
        uStaggerNorm: { value: 1 },
        uArc: { value: 0 },
        uDriftFrom: { value: 0 },
        uDriftTo: { value: 0 },
        uTime: { value: 0 },
      },
    })
    this.points = new THREE.Points(g, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 1

    // Lines: 4 vertices per segment, expanded to a quad in the shader.
    const L = MAX_LINES_PER_STATE * 2
    const lg = this.lineGeometry
    this.lineStart = new THREE.BufferAttribute(new Float32Array(L * 12), 3).setUsage(THREE.DynamicDrawUsage)
    this.lineEnd = new THREE.BufferAttribute(new Float32Array(L * 12), 3).setUsage(THREE.DynamicDrawUsage)
    this.lineLook = new THREE.BufferAttribute(new Float32Array(L * 12), 3).setUsage(THREE.DynamicDrawUsage)
    const corner = new Float32Array(L * 8)
    const lidx = new Uint32Array(L * 6)
    for (let j = 0; j < L; j++) {
      corner.set([-1, 0, 1, 0, -1, 1, 1, 1], j * 8)
      const v = j * 4
      lidx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], j * 6)
    }
    lg.setAttribute('position', this.lineStart)
    lg.setAttribute('aEnd', this.lineEnd)
    lg.setAttribute('aLook', this.lineLook)
    lg.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2))
    lg.setIndex(new THREE.BufferAttribute(lidx, 1))
    lg.setDrawRange(0, 0)
    this.lineMaterial = new THREE.ShaderMaterial({
      vertexShader: LINES_VERT,
      fragmentShader: LINES_FRAG,
      transparent: true,
      // Quad winding flips with line direction; never cull.
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
      uniforms: {
        uPixelRatio: { value: this.pixelRatio },
        uResolution: this.material.uniforms.uResolution,
        uInk: this.material.uniforms.uInk,
      },
    })
    this.lineMesh = new THREE.Mesh(lg, this.lineMaterial)
    this.lineMesh.frustumCulled = false
    this.lineMesh.renderOrder = 0

    this.scene.add(this.lineMesh, this.points)

    this.stats = {
      particles: N,
      active: 0,
      drawn: 0,
      lines: 0,
      cpuMs: 0,
      uploadBytes: 0,
      to: '',
      from: '',
      progress: 1,
    }
    const rect = opts.canvas.getBoundingClientRect()
    this.resize(rect.width || 1, rect.height || 1)
  }

  // ---------------------------------------------------------------- states

  register(...states: EngineState[]): this {
    for (const s of states) this.states.set(s.id, s)
    return this
  }

  get(id: string): EngineState {
    const s = this.states.get(id)
    if (!s) throw new Error(`eigen-motion: unknown state "${id}"`)
    return s
  }

  get stateIds(): string[] {
    return [...this.states.keys()]
  }

  /** Forget all recorded transitions (scrubbing back no longer replays them). */
  reset(): void {
    this.history = []
    this.bound = null
    this.invalidate()
  }

  /** Cut to a state with no transition. */
  setState(id: string): void {
    const state = this.get(id)
    this.pruneFuture()
    this.push({ kind: 'state', state }, state, { ...DEFAULT_TRANSITION, duration: 0 })
  }

  /**
   * Morph from whatever is on screen now to `id`. If a transition is still
   * running, its current mix is frozen into a snapshot and becomes the
   * starting point, so particles never jump.
   */
  transitionTo(id: string, override?: Partial<TransitionSpec>): void {
    const state = this.get(id)
    const t = this.clock.t
    this.pruneFuture()
    const cur = this.recordAt(t)
    let from: Source
    if (!cur) from = { kind: 'state', state }
    else if (this.progressOf(cur, t) >= 1) from = { kind: 'state', state: cur.to }
    else {
      this.sync(t)
      from = this.snapshot(`${sourceLabel(cur.from)}→${cur.to.id}`)
    }
    // Leaving a state mid-morph still uses the exit style of the state we were heading to.
    const out = cur && cur.to !== state ? cur.to.transitionOut : undefined
    this.push(from, state, { ...DEFAULT_TRANSITION, ...state.transitionIn, ...out, ...override })
  }

  /** Transition currently on screen, for debug UIs. */
  get current(): { from: string; to: string; t0: number; duration: number } | null {
    const r = this.recordAt(this.clock.t)
    return r ? { from: sourceLabel(r.from), to: r.to.id, t0: r.t0, duration: r.spec.duration } : null
  }

  /** Every recorded transition, oldest first, for scrub timelines. */
  get timeline(): { t0: number; duration: number; to: string }[] {
    return this.history.map((r) => ({ t0: r.t0, duration: r.spec.duration, to: r.to.id }))
  }

  /** Force re-evaluation of the bound states (after reconfiguring one). */
  invalidate(): void {
    this.fromBuf.key = null
    this.toBuf.key = null
  }

  // ---------------------------------------------------------------- output

  setInk(hex: string): void {
    const c = new THREE.Color(hex)
    ;(this.material.uniforms.uInk.value as THREE.Vector3).set(c.r, c.g, c.b)
  }

  setBackground(hex: string): void {
    this.renderer.setClearColor(new THREE.Color(hex), this.transparent ? 0 : 1)
  }

  /**
   * Where the view-space origin sits on the stage, in CSS px from the centre
   * (+x right, +y up). States stay centred on the origin; this moves them.
   */
  setViewOffset(dx: number, dy: number): void {
    this.offset = [dx, dy]
    this.resize(this.width, this.height)
  }

  /** Stage size in CSS px. The camera maps 1 world unit to 1 CSS px. */
  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.renderer.setSize(this.width, this.height, false)
    const c = this.camera
    const [dx, dy] = this.offset
    c.left = -this.width / 2 - dx
    c.right = this.width / 2 - dx
    c.top = this.height / 2 - dy
    c.bottom = -this.height / 2 - dy
    c.updateProjectionMatrix()
    // Exactly the drawing buffer, so shader pixel maths lines up with real pixels.
    this.renderer.getDrawingBufferSize(this.material.uniforms.uResolution.value as THREE.Vector2)
  }

  /** Evaluate everything at clock.t and draw. Call once per frame after clock.tick(). */
  render(): void {
    const start = performance.now()
    this.stats.uploadBytes = 0
    this.sync(this.clock.t)
    this.sortAndLines()
    this.renderer.render(this.scene, this.camera)
    this.stats.cpuMs = performance.now() - start
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.lineGeometry.dispose()
    this.lineMaterial.dispose()
    this.renderer.dispose()
  }

  // ---------------------------------------------------------------- internals

  private makeBuffer(): Buffer {
    const N = this.count
    const pos = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage)
    const look = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage)
    return {
      pos,
      look,
      frame: { capacity: N, pos: pos.array as Float32Array, look: look.array as Float32Array, lines: makeLineList() },
      key: null,
      count: 0,
      lastT: NaN,
    }
  }

  private push(from: Source, to: EngineState, spec: TransitionSpec): void {
    this.history.push({ from, to, toSource: { kind: 'state', state: to }, t0: this.clock.t, spec })
    if (this.history.length > MAX_HISTORY) this.history.shift()
  }

  /** Scrubbing back and then acting discards the old future, like an undo branch. */
  private pruneFuture(): void {
    const t = this.clock.t
    while (this.history.length && this.history[this.history.length - 1].t0 > t) this.history.pop()
  }

  private recordAt(t: number): Transition | null {
    const h = this.history
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t0 <= t) return h[i]
    return h[0] ?? null
  }

  private progressOf(r: Transition, t: number): number {
    return r.spec.duration <= 0 ? 1 : Math.min(1, Math.max(0, (t - r.t0) / r.spec.duration))
  }

  /** Bring the from/to buffers and morph uniforms up to date for time t. */
  private sync(t: number): void {
    const rec = this.recordAt(t)
    const s = this.stats
    if (!rec) {
      this.params.m = 1
      s.to = s.from = ''
      return
    }
    if (rec !== this.bound) {
      this.bound = rec
      this.invalidate()
    }
    const m = this.progressOf(rec, t)
    this.fill(this.toBuf, rec.toSource, t)
    if (m < 1) this.fill(this.fromBuf, rec.from, t)

    const P = resolveMorphParams(rec.spec, m)
    P.time = t
    P.driftFrom = rec.from.kind === 'state' ? (rec.from.state.drift ?? 0) : 0
    P.driftTo = rec.to.drift ?? 0
    // Measured from the from-buffer, so only once it holds this record's source.
    if (rec.staggerNorm == null && m < 1) rec.staggerNorm = this.staggerNorm(P)
    P.staggerNorm = rec.staggerNorm ?? 1
    this.params = P

    const u = this.material.uniforms
    u.uMorph.value = m
    u.uEase.value = P.ease
    u.uStaggerMode.value = P.staggerMode
    u.uStaggerAmount.value = P.staggerAmount
    u.uStaggerInvert.value = P.staggerInvert ? 1 : 0
    ;(u.uStaggerAxis.value as THREE.Vector3).set(P.axis[0], P.axis[1], P.axis[2])
    u.uStaggerNorm.value = P.staggerNorm
    u.uArc.value = P.arc
    u.uDriftFrom.value = P.driftFrom
    u.uDriftTo.value = P.driftTo
    u.uTime.value = t

    s.to = rec.to.id
    s.from = sourceLabel(rec.from)
    s.progress = m
  }

  private fill(buf: Buffer, src: Source, t: number): void {
    const key = sourceKey(src)
    const fresh = buf.key !== key
    const dynamic = src.kind === 'state' && src.state.dynamic
    if (!fresh && (!dynamic || buf.lastT === t)) return

    const f = buf.frame
    if (src.kind === 'snapshot') {
      f.pos.set(src.pos)
      f.look.set(src.look)
      f.lines.count = 0
      buf.count = src.count
    } else {
      const st = src.state
      if (fresh) this.park(f, st)
      f.lines.count = 0
      st.evaluate(t, f)
      buf.count = st.count
    }
    const n = fresh ? this.count : buf.count
    for (const attr of [buf.pos, buf.look]) {
      attr.clearUpdateRanges()
      if (!fresh) attr.addUpdateRange(0, n * 3)
      attr.needsUpdate = true
    }
    this.stats.uploadBytes += n * 3 * 4 * 2
    buf.key = key
    buf.lastT = t
  }

  /** Put every slot a state doesn't use at rest inside it, invisible. */
  private park(f: StateFrame, st: EngineState): void {
    const c = st.park?.center ?? [0, 0, 0]
    const r = st.park?.radius ?? 2
    const N = this.count
    for (let i = st.count; i < N; i++) {
      const s = this.seeds[i]
      const th = 6.283185307179586 * ((s * 7.123) % 1)
      const cz = 2 * ((s * 3.717) % 1) - 1
      const rr = Math.sqrt(Math.max(0, 1 - cz * cz))
      const d = r * ((s * 13.37) % 1)
      const i3 = i * 3
      f.pos[i3] = c[0] + rr * Math.cos(th) * d
      f.pos[i3 + 1] = c[1] + rr * Math.sin(th) * d
      f.pos[i3 + 2] = c[2] + cz * d
      f.look[i3] = 0.5
      f.look[i3 + 1] = 1
      f.look[i3 + 2] = 0
    }
  }

  private staggerNorm(P: MorphParams): number {
    if (P.staggerMode < 2) return 1
    const pos = this.fromBuf.frame.pos
    const n = this.fromBuf.count
    let max = 0
    for (let i = 0; i < n; i++) {
      const i3 = i * 3
      const v =
        P.staggerMode === 2
          ? Math.sqrt(pos[i3] * pos[i3] + pos[i3 + 1] * pos[i3 + 1] + pos[i3 + 2] * pos[i3 + 2])
          : Math.abs(pos[i3] * P.axis[0] + pos[i3 + 1] * P.axis[1] + pos[i3 + 2] * P.axis[2])
      if (v > max) max = v
    }
    return max > 1e-3 ? max : 1
  }

  /** Snapshot of the current mix (CPU mirror of the shader). */
  private snapshot(label: string): Source {
    const N = this.count
    const P = this.params
    const fp = this.fromBuf.frame.pos, tp = this.toBuf.frame.pos
    const fl = this.fromBuf.frame.look, tl = this.toBuf.frame.look
    const pos = new Float32Array(N * 3)
    const look = new Float32Array(N * 3)
    const o = this.tmp3
    for (let i = 0; i < N; i++) {
      const i3 = i * 3
      const p = particleProgress(P, this.seeds[i], fp[i3], fp[i3 + 1], fp[i3 + 2])
      morphPosition(P, p, this.seeds[i], fp, tp, i3, o)
      pos[i3] = o[0]
      pos[i3 + 1] = o[1]
      pos[i3 + 2] = o[2]
      for (let k = 0; k < 3; k++) look[i3 + k] = fl[i3 + k] + (tl[i3 + k] - fl[i3 + k]) * p
    }
    return { kind: 'snapshot', pos, look, count: Math.max(this.fromBuf.count, this.toBuf.count), label }
  }

  /** Depth-sort visible particles far→near (the reference's painter order) and build line quads. */
  private sortAndLines(): void {
    const P = this.params
    const m = P.m
    const s = this.stats
    const fp = this.fromBuf.frame.pos, tp = this.toBuf.frame.pos
    const fl = this.fromBuf.frame.look, tl = this.toBuf.frame.look
    const seeds = this.seeds
    const zs = this.zs
    const settled = m >= 1
    const active = !this.bound ? 0 : settled ? this.toBuf.count : Math.max(this.fromBuf.count, this.toBuf.count)
    const fastSettled = settled && P.driftTo === 0

    // Collect visible slots and their depth.
    const tmp = this.sortTmp
    let k = 0
    let zmin = Infinity, zmax = -Infinity
    for (let i = 0; i < active; i++) {
      const i3 = i * 3
      let a: number, z: number
      if (fastSettled) {
        a = tl[i3 + 2]
        if (a < 0.02) continue
        z = tp[i3 + 2]
      } else {
        const p = settled ? 1 : particleProgress(P, seeds[i], fp[i3], fp[i3 + 1], fp[i3 + 2])
        a = fl[i3 + 2] + (tl[i3 + 2] - fl[i3 + 2]) * p
        if (a < 0.02) continue
        // Sort key only: the straight-line z, without the shader's arc and
        // drift (trig per particle was most of the frame on phones).
        z = fp[i3 + 2] + (tp[i3 + 2] - fp[i3 + 2]) * p
      }
      zs[i] = z
      tmp[k++] = i
      if (z < zmin) zmin = z
      if (z > zmax) zmax = z
    }

    // Stable bucket sort, then an insertion pass to make it exact.
    const out = this.sortOut
    if (k > 0 && zmax - zmin > 1e-9) {
      const B = Math.min(SORT_BUCKETS, k)
      const counts = this.bucketCounts
      counts.fill(0, 0, B + 1)
      const scale = (B - 1) / (zmax - zmin)
      for (let j = 0; j < k; j++) counts[((zs[tmp[j]] - zmin) * scale + 1) | 0]++
      for (let b = 1; b <= B; b++) counts[b] += counts[b - 1]
      for (let j = 0; j < k; j++) {
        const i = tmp[j]
        out[counts[((zs[i] - zmin) * scale) | 0]++] = i
      }
      for (let j = 1; j < k; j++) {
        const v = out[j]
        const zv = zs[v]
        let q = j - 1
        while (q >= 0 && zs[out[q]] > zv) {
          out[q + 1] = out[q]
          q--
        }
        out[q + 1] = v
      }
    } else {
      out.set(tmp.subarray(0, k))
    }
    const idx = this.index.array as Uint16Array | Uint32Array
    for (let j = 0; j < k; j++) idx[j] = out[j]
    this.index.clearUpdateRanges()
    this.index.addUpdateRange(0, Math.max(1, k))
    this.index.needsUpdate = true
    this.geometry.setDrawRange(0, k)
    s.active = active
    s.drawn = k
    s.uploadBytes += k * idx.BYTES_PER_ELEMENT

    // Lines: from-state lines fade out, to-state lines fade in; endpoints follow their particles.
    let L = 0
    if (this.bound) {
      const M = ease(P.ease, m)
      if (!settled) L = this.emitLines(this.fromBuf.frame.lines, 1 - M, L)
      L = this.emitLines(this.toBuf.frame.lines, settled ? 1 : M, L)
    }
    this.lineGeometry.setDrawRange(0, L * 6)
    for (const attr of [this.lineStart, this.lineEnd, this.lineLook]) {
      attr.clearUpdateRanges()
      attr.addUpdateRange(0, Math.max(1, L * 12))
      attr.needsUpdate = true
    }
    s.lines = L
    s.uploadBytes += L * 12 * 4 * 3
  }

  private endpoint(slot: number, out: Float32Array): void {
    const P = this.params
    const fp = this.fromBuf.frame.pos, tp = this.toBuf.frame.pos
    const i3 = slot * 3
    const p = P.m >= 1 ? 1 : particleProgress(P, this.seeds[slot], fp[i3], fp[i3 + 1], fp[i3 + 2])
    morphPosition(P, p, this.seeds[slot], fp, tp, i3, out)
  }

  private lineA = new Float32Array(3)
  private lineB = new Float32Array(3)

  private emitLines(list: LineList, weight: number, L: number): number {
    if (weight <= 0) return L
    const cap = MAX_LINES_PER_STATE * 2
    const sp = this.lineStart.array as Float32Array
    const ep = this.lineEnd.array as Float32Array
    const lk = this.lineLook.array as Float32Array
    const A = this.lineA, Bv = this.lineB
    for (let j = 0; j < list.count && L < cap; j++) {
      this.endpoint(list.a[j], A)
      this.endpoint(list.b[j], Bv)
      const w = list.look[j * 3], ink = list.look[j * 3 + 1], alpha = list.look[j * 3 + 2] * weight
      const base = L * 12
      for (let v = 0; v < 4; v++) {
        const o = base + v * 3
        sp[o] = A[0]; sp[o + 1] = A[1]; sp[o + 2] = A[2]
        ep[o] = Bv[0]; ep[o + 1] = Bv[1]; ep[o + 2] = Bv[2]
        lk[o] = w; lk[o + 1] = ink; lk[o + 2] = alpha
      }
      L++
    }
    return L
  }
}
