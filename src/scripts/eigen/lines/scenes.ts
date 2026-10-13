/**
 * The real-world act as one continuous sequence, a function of time and of
 * when each beat is left (the story decides that: a tap, or auto-advance).
 * Every beat flows into the next; nothing cuts.
 *
 *   wall       An archive wall of shoes, drifting steadily through depth.
 *   → store    Leaving the wall, it turns straight into the store: the rest of
 *              the wall falls away while five shoes from its lower rows glide
 *              down into a row in front of a treadmill; legs start running.
 *   store      The treadmill and the five.
 *   → online   The five glide into five catalogue cards as the view moves;
 *              cards appear around them and the catalogue scrolls.
 */
import * as THREE from 'three'
import { Legs, STRIDE_PERIOD } from './legs'
import { Batch, type LineRenderer } from './LineRenderer'
import { BELT, slatDrawing, TILE, tileDrawing, treadmillDrawing } from './objects'
import { designCrowd, shoeDrawing, shoeShape, type ShoeDesign } from './shoe'

/** When each beat is left (seconds on the act's timeline). */
export interface Plan {
  /** The wall starts turning into the store. */
  leave: number
  /** The store starts turning into the catalogue (at least TO_STORE after `leave`). */
  morph: number
}
/** Seconds the wall takes to become the store (it always plays out). */
export const TO_STORE = 1.1
/** Seconds the store takes to become the catalogue. */
export const TO_CATALOGUE = 1.4

/** The playground's loop: a plan with the story's default timing. */
export const DEFAULT_PLAN: Plan = { leave: 4.2, morph: 9.2 }
export const TOTAL = 15.5
export const SCENES = [
  { id: 'wall', start: 0 },
  { id: 'store', start: DEFAULT_PLAN.leave },
  { id: 'catalogue', start: DEFAULT_PLAN.morph },
] as const

/** Copy, as an optional overlay in the playground (the story sets its own). */
const COPY: [number, number, string][] = [
  [0.2, 4.0, 'The right running shoe is hard to find.'],
  [4.5, 9.0, 'In a store, you’re limited to what they stock.'],
  [9.6, 15.0, 'Online, you have the opposite problem.'],
]

export interface FrameInfo {
  scene: string
  t: number
  copy: { text: string; alpha: number } | null
}

// ------------------------------------------------------------------ helpers

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** Ease in-out (quintic smootherstep): gentle starts and stops. */
const ease = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * t * (t * (t * 6 - 15) + 10)
}
/** Ease in-out (cubic): quicker off the mark, for the snappy hand-overs. */
const ease3 = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function hash(a: number, b: number, c = 0): number {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return h - Math.floor(h)
}

interface Pose {
  pos: THREE.Vector3
  rot: THREE.Quaternion
}
const Y = new THREE.Vector3(0, 1, 0)
const qYaw = (a: number) => new THREE.Quaternion().setFromAxisAngle(Y, a)
function mix(a: Pose, b: Pose, t: number): Pose {
  return { pos: a.pos.clone().lerp(b.pos, t), rot: a.rot.clone().slerp(b.rot, t) }
}

/**
 * Fades at the screen's top and bottom (fractions of its height) per view:
 * the busy wall and catalogue fade further in, so they don't crowd the bars
 * and the words.
 */
const EDGE: Record<'wall' | 'store' | 'catalogue', [number, number, number]> = {
  wall: [0.15, 0.28, 0],
  store: [0.1, 0.2, 0],
  catalogue: [0.15, 0.28, 0],
}
const edgeMix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

/** A wall shoe picked to go down to the treadmill. */
interface Pick {
  i: number
  j: number
  design: number
}

export class RealWorld {
  readonly designs: ShoeDesign[]
  private shoes: Batch[]
  /** The same shoes as lighter meshes, for when they're small on screen. */
  private shoesLo: Batch[]
  private centre: THREE.Vector3[]
  private tread: Batch
  private slats: Batch
  private tiles: Batch
  private legs: Legs
  private v = new THREE.Vector3()
  private baseGain: number
  /** The wall's camera while the store takes over, and the store's (for picking). */
  private wallCam = new THREE.PerspectiveCamera(40, 1, 10, 20000)
  private storeCam = new THREE.PerspectiveCamera(34, 1, 10, 20000)
  /** The five picked when the wall was left (cached by that time). */
  private picked: { at: number; picks: Pick[] } | null = null
  /** Extra fade (0..1) on top of the act's own, for a host that cuts between times. */
  fade = 1

  constructor(
    private r: LineRenderer,
    private camera: THREE.PerspectiveCamera,
  ) {
    this.designs = designCrowd(14)
    this.shoes = this.designs.map((d) => new Batch(r, shoeDrawing(d), 24))
    this.shoesLo = this.designs.map((d) => new Batch(r, shoeDrawing(d, 0.5), 96))
    // Shoe origin is at the heel on the ground; this recentres it.
    this.centre = this.designs.map((d) => {
      const S = shoeShape(d)
      return new THREE.Vector3(-S.length / 2, -(S.ym(0.3) + S.hu(0.3) * 0.6) / 2, 0)
    })
    this.tread = new Batch(r, treadmillDrawing(), 1)
    this.slats = new Batch(r, slatDrawing(), 60)
    this.tiles = new Batch(r, tileDrawing(), 80)
    this.legs = new Legs(r)
    this.baseGain = r.look.lineGain
  }

  private get batches(): Batch[] {
    return [...this.shoes, ...this.shoesLo, this.tread, this.slats, this.tiles]
  }

  /**
   * Draw the act at `time`. With a plan (the story), time runs on and the
   * plan says when each beat was left; without one (the playground) it loops
   * over the default plan, fading up from black and back down.
   */
  frame(time: number, plan?: Plan): FrameInfo {
    const loop = !plan
    const p = plan ?? DEFAULT_PLAN
    const t = loop ? ((time % TOTAL) + TOTAL) % TOTAL : time
    const gain = loop ? smooth(0, 0.35, t) * (1 - smooth(TOTAL - 0.8, TOTAL - 0.1, t)) : 1
    this.r.setLook({ lineGain: this.baseGain * gain * this.fade })
    for (const b of this.batches) b.begin()
    this.legs.presence = 0
    let scene = 'wall'
    if (t < p.leave) this.wall(t)
    else if (t < p.morph || t - p.leave < TO_STORE) {
      const u = t - p.leave
      scene = 'store'
      if (u < TO_STORE) this.toStore(t, u, p.leave)
      else this.store(t, p.leave)
    } else ((scene = 'catalogue'), this.catalogue(t, t - p.morph, p.leave))
    if (this.legs.presence <= 0) this.legs.update(0, 0, this.designs[0], this.camera)
    for (const b of this.batches) b.commit()
    let copy: FrameInfo['copy'] = null
    for (const [a, b, text] of COPY)
      if (t >= a - 0.4 && t <= b + 0.4) copy = { text, alpha: smooth(a - 0.4, a + 0.2, t) * (1 - smooth(b - 0.2, b + 0.4, t)) }
    return { scene, t, copy }
  }

  /** Draw nothing (the host is showing something else on the same renderer). */
  clear(): void {
    for (const b of this.batches) (b.begin(), b.commit())
    this.legs.presence = 0
    this.legs.update(0, 0, this.designs[0], this.camera)
  }

  /** Draw a shoe (pose of its centre); `hi` picks the full mesh, else the light one. */
  private shoe(design: number, p: Pose, presence: number, scale = 1, hi = true): void {
    if (presence <= 0.004) return
    const m = new THREE.Matrix4().compose(p.pos, p.rot, new THREE.Vector3(scale, scale, scale))
    m.multiply(new THREE.Matrix4().makeTranslation(this.centre[design]))
    ;(hi ? this.shoes : this.shoesLo)[design].add(m, presence)
  }

  private look(pos: THREE.Vector3, target: THREE.Vector3, tanHalf: number, c = this.camera): void {
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanHalf))
    const aspect = this.r.width / this.r.height
    if (c.fov !== fov || c.aspect !== aspect) ((c.fov = fov), (c.aspect = aspect), c.updateProjectionMatrix())
    c.position.copy(pos)
    c.lookAt(target)
    c.updateMatrixWorld()
    c.matrixWorldInverse.copy(c.matrixWorld).invert()
  }

  /**
   * Each view is a vertical field of view plus the width its subject needs
   * (both as tan of the half-angle). On a narrow screen (a phone held
   * upright) the view widens until that width fits; on wider screens it
   * keeps its field of view and simply shows more at the sides.
   */
  private fit(fov: number, halfWidth: number): number {
    const aspect = this.r.width / this.r.height
    return Math.max(Math.tan(THREE.MathUtils.degToRad(fov / 2)), halfWidth / aspect)
  }
  private static readonly VIEW = {
    wall: [40, 0.17],
    store: [34, 0.17],
    catalogue: [34, 0.235],
  } as const
  private tanOf(view: keyof typeof RealWorld.VIEW): number {
    const [fov, halfWidth] = RealWorld.VIEW[view]
    return this.fit(fov, halfWidth)
  }

  /** Whether a sphere (world) is at least partly in view of `c`. */
  private onScreen(p: THREE.Vector3, radius: number, c = this.camera): boolean {
    this.v.copy(p).applyMatrix4(c.matrixWorldInverse)
    const z = -this.v.z
    if (z < c.near - radius) return false
    const ty = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)), tx = ty * c.aspect
    return Math.abs(this.v.x) - radius * 1.1 < z * tx && Math.abs(this.v.y) - radius * 1.1 < z * ty
  }

  private screen(p: THREE.Vector3, c = this.camera): { x: number; y: number } {
    this.v.copy(p).project(c)
    return { x: ((this.v.x + 1) / 2) * this.r.width, y: ((1 - this.v.y) / 2) * this.r.height }
  }

  // ---------------------------------------------------------------- wall

  private static readonly W = THREE.MathUtils.degToRad(52)
  private static readonly SA = 420
  private static readonly SB = 250
  /** Camera speed along the wall, mm/s. */
  private static readonly SPEED = 140

  private at(a: number, b: number): THREE.Vector3 {
    const W = RealWorld.W
    return new THREE.Vector3(Math.cos(W) * a, b, -Math.sin(W) * a)
  }
  private static readonly OUT = new THREE.Vector3(Math.sin(RealWorld.W), 0, Math.cos(RealWorld.W))

  private wallCamera(a: number, c = this.camera): void {
    this.look(this.at(a, 60).addScaledVector(RealWorld.OUT, 1000), this.at(a + 2100, -30), this.tanOf('wall'), c)
  }

  private wallDesign(i: number, j: number): number {
    return 5 + Math.floor(hash(i + 7, j - 3, 2) * (this.designs.length - 5))
  }
  private wallPose(i: number, j: number): Pose {
    return { pos: this.at(i * RealWorld.SA, j * RealWorld.SB), rot: qYaw(RealWorld.W + Math.PI) }
  }

  /** Every wall cell in view of `c` (a = how far along the camera is). */
  private cells(a: number, c: THREE.PerspectiveCamera, fogFar: number, each: (i: number, j: number, dist: number) => void): void {
    const { SA, SB } = RealWorld
    for (let i = Math.floor((a - 1200) / SA); i <= Math.ceil((a + 8400) / SA); i++)
      for (let j = -7; j <= 7; j++) {
        const pos = this.at(i * SA, j * SB)
        if (!this.onScreen(pos, 190, c)) continue
        const dist = pos.distanceTo(c.position)
        if (dist <= fogFar) each(i, j, dist)
      }
  }

  private wall(t: number): void {
    this.r.setLook({ fogNear: 1600, fogFar: 7400, edgeFade: EDGE.wall })
    const a = RealWorld.SPEED * t
    this.wallCamera(a)
    this.cells(a, this.camera, 7400, (i, j, dist) => this.shoe(this.wallDesign(i, j), this.wallPose(i, j), 1, 1, dist < 3000))
  }

  // ---------------------------------------------------------------- wall → store

  /** The store's view, raised a little (150 mm) so the scene sits a bit lower on screen. */
  private static readonly STORE_CAM = { pos: new THREE.Vector3(0, 772 + 150, 3811), target: new THREE.Vector3(0, 100 + 150, 0) }
  private storeCamera(c = this.camera): void {
    this.look(RealWorld.STORE_CAM.pos, RealWorld.STORE_CAM.target, this.tanOf('store'), c)
  }

  /** Where the five stand in front of the treadmill, left to right. */
  private rowSlot(c: number): THREE.Vector3 {
    return new THREE.Vector3(-360 + c * 180, -83, 520)
  }
  private static readonly ROW_ROT = qYaw(-1.25)
  /** The row's faint shoes: the middle one (on the runner's feet) and the rightmost. */
  private static readonly FAINT = [2, 4]

  /** The wall camera, slowing to a stop over the first moments of the hand-over. */
  private static readonly STOP = 0.35
  private wallAt(leave: number, u: number): number {
    const s = Math.min(u, RealWorld.STOP)
    return RealWorld.SPEED * (leave + s - (s * s) / (2 * RealWorld.STOP))
  }

  /**
   * The five that go down to the treadmill: one of the wall's lower rows,
   * the one nearest where the row will stand on screen, its five shoes
   * nearest the middle, so each has only a short way to go.
   */
  private picks(leave: number): Pick[] {
    if (this.picked?.at === leave) return this.picked.picks
    const wc = this.wallCam
    this.wallCamera(this.wallAt(leave, 0), wc)
    this.storeCamera(this.storeCam)
    const W = this.r.width, H = this.r.height
    const targets = [0, 1, 2, 3, 4].map((c) => this.screen(this.rowSlot(c), this.storeCam))
    const rowY = targets.reduce((s, p) => s + p.y, 0) / 5
    const rows = new Map<number, (Pick & { x: number; y: number })[]>()
    this.cells(this.wallAt(leave, 0), wc, 7400, (i, j, dist) => {
      if (dist > 3600) return
      const s = this.screen(this.wallPose(i, j).pos, wc)
      if (s.x < W * 0.05 || s.x > W * 0.95 || s.y < H * 0.3) return
      if (!rows.has(j)) rows.set(j, [])
      rows.get(j)!.push({ i, j, design: this.wallDesign(i, j), x: s.x, y: s.y })
    })
    let best: (Pick & { x: number; y: number })[] = []
    let bestCost = Infinity
    for (const row of rows.values()) {
      if (row.length < Math.min(5, best.length + 1)) continue
      const y = row.reduce((a, p) => a + p.y, 0) / row.length
      const cost = Math.abs(y - rowY) - (row.length >= 5 ? 1e4 : 0)
      if (cost < bestCost) ((bestCost = cost), (best = row))
    }
    const picks = best
      .sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))
      .slice(0, 5)
      .sort((a, b) => a.x - b.x)
      .map(({ i, j, design }) => ({ i, j, design }))
    this.picked = { at: leave, picks }
    return picks
  }

  /** Designs of the five in the row (left to right), for the store and the catalogue. */
  private rowDesigns(leave: number): number[] {
    const d = this.picks(leave).map((p) => p.design)
    // Should the wall ever offer fewer than five, fill in with other designs.
    for (let k = 0; d.length < 5; k++) d.push(1 + (k % 4))
    return d
  }

  /**
   * The hand-over: rendered through the store's camera from the first frame.
   * The wall is carried across in the old camera's frame (same place and
   * size on screen through the change of lens), so nothing jumps; it falls
   * away while the five glide down into the row.
   */
  private toStore(t: number, u: number, leave: number): void {
    const wc = this.wallCam
    const a = this.wallAt(leave, u)
    this.wallCamera(a, wc)
    this.storeCamera()
    const k = this.tanOf('wall') / this.tanOf('store')
    // Fog carried across with the lens change, then eased to the store's.
    const fe = ease(0.15, 0.9, u)
    this.r.setLook({ fogNear: lerp(1600 * k, 3000, fe), fogFar: lerp(7400 * k, 8000, fe), edgeFade: edgeMix(EDGE.wall, EDGE.store, fe) })
    const cam = this.camera
    const inv = wc.quaternion.clone().invert()
    // A pose seen by the wall camera → the same place on screen for the store camera.
    const carry = (p: Pose): Pose => {
      const c = p.pos.clone().applyMatrix4(wc.matrixWorldInverse)
      c.z *= k
      return { pos: c.applyMatrix4(cam.matrixWorld), rot: cam.quaternion.clone().multiply(inv.clone().multiply(p.rot)) }
    }
    const picks = this.picks(leave)
    const chosen = new Set(picks.map((p) => `${p.i},${p.j}`))
    // The rest of the wall falls away, quickly, a little staggered.
    this.cells(a, wc, 7400, (i, j, dist) => {
      if (chosen.has(`${i},${j}`)) return
      const st = 0.18 * hash(i, j, 5)
      const out = ease3(st, st + 0.3, u)
      this.shoe(this.wallDesign(i, j), carry(this.wallPose(i, j)), 1 - out, 1, dist < 3000)
    })
    // The five glide down into the row.
    const designs = this.rowDesigns(leave)
    const onFeet = smooth(0.62, 1.05, u)
    picks.forEach((p, c) => {
      const e = ease3(0.02 + 0.035 * c, 0.84 + 0.035 * c, u)
      const pose = mix(carry(this.wallPose(p.i, p.j)), { pos: this.rowSlot(c), rot: RealWorld.ROW_ROT }, e)
      pose.pos.y += Math.sin(Math.PI * e) * 45
      this.shoe(p.design, pose, 1 - (RealWorld.FAINT.includes(c) ? 0.75 * onFeet : 0))
    })
    for (let c = picks.length; c < 5; c++) this.shoe(designs[c], { pos: this.rowSlot(c), rot: RealWorld.ROW_ROT }, smooth(0.4, 0.9, u))
    this.treadmill(t, smooth(0.3, 0.8, u))
    this.runLegs(t, onFeet, designs[2])
  }

  private store(t: number, leave: number): void {
    this.storeCamera()
    this.r.setLook({ fogNear: 3000, fogFar: 8000, edgeFade: EDGE.store })
    const designs = this.rowDesigns(leave)
    // The middle one is on the runner's feet; its place in the row stays faint, and so does the last one's.
    for (let c = 0; c < 5; c++) this.shoe(designs[c], { pos: this.rowSlot(c), rot: RealWorld.ROW_ROT }, RealWorld.FAINT.includes(c) ? 0.25 : 1)
    this.treadmill(t, 1)
    this.runLegs(t, 1, designs[2])
  }

  /** The store's runner (legs and belt together) runs at this share of the gait's own pace. */
  private static readonly RUN_PACE = 0.8

  private treadmill(time: number, presence: number): void {
    if (presence <= 0.004) return
    const t = time * RealWorld.RUN_PACE
    this.tread.add(new THREE.Matrix4(), presence)
    const spacing = 60, span = BELT.x1 - BELT.x0
    for (let i = 0; i < Math.floor(span / spacing); i++) {
      const x = BELT.x0 + ((((i * spacing - this.legs.beltSpeed * t) % span) + span) % span)
      // Slats fade in and out at the ends of the belt instead of popping round.
      const ends = smooth(0, 180, Math.min(x - BELT.x0, BELT.x1 - x))
      this.slats.add(new THREE.Matrix4().makeTranslation(x, 0, 0), presence * ends)
    }
  }

  private runLegs(time: number, presence: number, design: number): void {
    if (presence <= 0.004) return
    this.legs.presence = presence
    this.legs.update((time * RealWorld.RUN_PACE) / STRIDE_PERIOD, -40, this.designs[design], this.camera)
    for (const m of this.legs.shoes) this.shoes[design].add(m, presence)
  }

  // ---------------------------------------------------------------- store → catalogue

  private static readonly TILT = THREE.MathUtils.degToRad(30)
  /** The five cards the store shoes become (row, col), left to right as they stood. */
  private static readonly FIVE: [number, number][] = [[0, -1], [1, -1], [0, 0], [1, 1], [0, 1]]

  /** `m`: seconds since the morph began. */
  private catalogue(t: number, m: number, leave: number): void {
    const store = RealWorld.STORE_CAM
    const cat = { pos: new THREE.Vector3(0, 300, 3000), target: new THREE.Vector3(0, 380, 0) }
    const cm = ease3(0, TO_CATALOGUE, m)
    this.look(store.pos.clone().lerp(cat.pos, cm), store.target.clone().lerp(cat.target, cm), lerp(this.tanOf('store'), this.tanOf('catalogue'), cm))
    this.r.setLook({ fogNear: lerp(3000, 2600, cm), fogFar: lerp(8000, 8600, cm), edgeFade: edgeMix(EDGE.store, EDGE.catalogue, cm) })
    const designs = this.rowDesigns(leave)

    // The store fades out while the view moves.
    const storeOut = 1 - smooth(0, 0.6, m)
    this.treadmill(t, storeOut)
    this.runLegs(t, storeOut, designs[2])

    // The catalogue plane: rises gently and recedes.
    const up = new THREE.Vector3(0, Math.cos(RealWorld.TILT), -Math.sin(RealWorld.TILT))
    const normal = new THREE.Vector3(0, Math.sin(RealWorld.TILT), Math.cos(RealWorld.TILT))
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), up, normal)
    const cardRot = new THREE.Quaternion().setFromRotationMatrix(basis)
    const origin = new THREE.Vector3(0, -80, 200)
    const px = TILE.w * 1.07, py = TILE.h * 1.1
    // Scroll: eases in, then runs on steadily.
    const v = 200, a0 = 0.9, a1 = a0 + 1.1
    const u = clamp01((m - a0) / (a1 - a0))
    const scroll = v * (a1 - a0) * (u * u * u - (u * u * u * u) / 2) + v * Math.max(0, m - a1)
    const cardAt = (row: number, col: number) => origin.clone().add(new THREE.Vector3(col * px, 0, 0)).addScaledVector(up, row * py - scroll)

    // The five: from the treadmill row into their cards.
    const five = RealWorld.FIVE
    for (let c = 0; c < 5; c++) {
      const e = ease3(0.08 + 0.04 * c, 1.1 + 0.04 * c, m)
      const [row, col] = five[c]
      const from: Pose = { pos: this.rowSlot(c), rot: RealWorld.ROW_ROT }
      const to: Pose = { pos: cardAt(row, col).addScaledVector(normal, 26), rot: cardRot }
      const dim = RealWorld.FAINT.includes(c) ? lerp(0.25, 1, smooth(0, 0.5, m)) : 1
      this.shoe(designs[c], mix(from, to, e), dim)
    }
    // Every other card: appears around the five, nearest first.
    const r0 = Math.floor((scroll - 900) / py), r1 = Math.ceil((scroll + 6400) / py)
    for (let row = r0; row <= r1; row++)
      for (let col = -2; col <= 2; col++) {
        const P = cardAt(row, col)
        const isFive = five.findIndex(([r, c]) => r === row && c === col)
        const dist = Math.min(...five.map(([r, c]) => Math.hypot(r - row, c - col)))
        const t0 = isFive >= 0 ? 0.75 : 0.85 + 0.13 * dist
        const appear = smooth(t0, t0 + 0.5, m)
        if (appear <= 0) continue
        if (!this.onScreen(P, 260)) continue
        this.tiles.add(new THREE.Matrix4().makeTranslation(P.x, P.y, P.z).multiply(basis), appear)
        if (isFive >= 0) continue
        const design = 5 + Math.floor(hash(row, col, 5) * (this.designs.length - 5))
        this.shoe(design, { pos: P.clone().addScaledVector(normal, 26), rot: cardRot }, appear, lerp(0.85, 1, appear), false)
      }
  }
}
