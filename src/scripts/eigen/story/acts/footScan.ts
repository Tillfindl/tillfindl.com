/**
 * "We map your feet in 3D": the measurement geometry, attached to the foot.
 * Anchors are found once on the foot's own points (heel, toe tip, the ball's
 * two sides, the arch's underside), then projected
 * every frame with the foot's own turn, so the lines stay on the foot as it
 * rotates, and on the skeleton it becomes.
 *
 * Also the phone: a real phone's form in dots (rounded slab, camera module,
 * lenses) that passes slowly beneath the foot, its cameras turned up at the
 * sole, while the foot's points come in.
 */
import { FOOT_MOTION, normalizeCloud, OrbView, type CloudFrame, type CloudState, type PointCloud } from '../../engine'
import { dimension, INK, label, overlayStats, stroke, type P2 } from '../draw'
import { clamp01, outCubic, smooth, toScreen, type Stage } from '../stage'

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1))
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

export interface Measure {
  length: [V3, V3]
  width: [V3, V3]
  arch: V3[]
  centre: V3
  /** Heel to toe, model units. */
  len: number
}

/** Find the measurement anchors on the foot's points (model space, unit sphere). */
export function footMeasure(pc: PointCloud, frame: CloudFrame): Measure {
  const { points } = normalizeCloud(pc.positions, pc.count, frame)
  const n = pc.count
  const P = (i: number): V3 => [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]]
  let ymin = Infinity, ymax = -Infinity
  for (let i = 0; i < n; i++) (ymin = Math.min(ymin, points[i * 3 + 1])), (ymax = Math.max(ymax, points[i * 3 + 1]))
  const low = ymin + (ymax - ymin) * 0.42
  // Toe tip: furthest to the lower left. Heel: furthest right among the lower part.
  let toe = 0, heel = 0, bt = Infinity, bh = -Infinity
  for (let i = 0; i < n; i++) {
    const [x, y] = [points[i * 3], points[i * 3 + 1]]
    if (x + 0.55 * y < bt) (bt = x + 0.55 * y), (toe = i)
    if (y < low && x - 0.15 * y > bh) (bh = x - 0.15 * y), (heel = i)
  }
  const H = P(heel), T = P(toe)
  const d = sub(T, H)
  const len = Math.hypot(d[0], d[1], d[2])
  const dh = mul(d, 1 / len)
  const up: V3 = [0, 1, 0]
  // Across the foot (horizontal, perpendicular to its length), and up from the sole.
  const w = norm(cross(dh, up))
  const e = norm(sub(up, mul(dh, dot3(up, dh))))
  const along = (p: V3) => dot3(sub(p, H), dh) / len
  const height = (p: V3) => dot3(sub(p, H), e) / len
  // Only the foot itself (below the ankle), not the leg above it.
  const slab = (u: number, half: number, maxH = 0.34) => {
    const out: V3[] = []
    for (let i = 0; i < n; i++) {
      const p = P(i)
      if (Math.abs(along(p) - u) < half && height(p) < maxH) out.push(p)
    }
    return out
  }
  // Length: heel to toe tip, set off below the sole.
  const off = mul(e, -0.12)
  const length: [V3, V3] = [add(H, off), add(T, off)]
  // Width: across the ball, low on the foot.
  const ball = slab(0.72, 0.035, 0.16)
  let wa = ball[0] ?? H, wb = ball[0] ?? T
  for (const p of ball) {
    if (dot3(p, w) < dot3(wa, w)) wa = p
    if (dot3(p, w) > dot3(wb, w)) wb = p
  }
  const bh2 = (dot3(wa, e) + dot3(wb, e)) / 2
  const flat = (p: V3): V3 => add(p, mul(e, bh2 - dot3(p, e)))
  const width: [V3, V3] = [flat(wa), flat(wb)]
  // Arch: a clean curve on the near side, from the heel's contact to the ball's, lifting under the midfoot.
  const near = w[2] >= 0 ? w : mul(w, -1)
  const half = Math.abs(dot3(sub(wb, wa), w)) / 2
  const hc = add(H, mul(d, 0.12)), bc = add(H, mul(d, 0.7))
  const arch: V3[] = []
  for (let k = 0; k <= 24; k++) {
    const s = k / 24
    const lift = 0.1 * len * Math.sin(Math.PI * s) ** 1.3
    arch.push(add(add(add(hc, mul(sub(bc, hc), s)), mul(e, lift + 0.02 * len)), mul(near, half * 0.85)))
  }
  let centre: V3 = [0, 0, 0]
  for (let i = 0; i < n; i++) centre = add(centre, P(i))
  return { length, width, arch, centre: mul(centre, 1 / n), len }
}

/** A phone's form as dots (mm, phone frame: x across, y along, z out of the screen). */
interface PhoneDot {
  p: V3
  /** Base brightness 0..1. */
  ink: number
  /** Which way the dot's surface faces (phone frame), for dimming the far side. */
  n: V3
}

function phoneDots(): PhoneDot[] {
  const W = 71.5, H = 147, T = 7.8, R = 11
  const out: PhoneDot[] = []
  // A rounded rectangle's outline, evenly spaced.
  const outline = (w: number, h: number, r: number, step: number, at: (x: number, y: number) => void) => {
    const straight = [w - 2 * r, h - 2 * r]
    const per = 2 * straight[0] + 2 * straight[1] + 2 * Math.PI * r
    const n = Math.round(per / step)
    for (let k = 0; k < n; k++) {
      let d = (k / n) * per
      const seg: [number, number, number, number, number][] = [
        // straight runs (x0, y0, dx, dy, length) and corners handled below
        [-w / 2 + r, -h / 2, 1, 0, straight[0]],
        [w / 2, -h / 2 + r, 0, 1, straight[1]],
        [w / 2 - r, h / 2, -1, 0, straight[0]],
        [-w / 2, h / 2 - r, 0, -1, straight[1]],
      ]
      const corners: [number, number, number][] = [
        [w / 2 - r, -h / 2 + r, -Math.PI / 2],
        [w / 2 - r, h / 2 - r, 0],
        [-w / 2 + r, h / 2 - r, Math.PI / 2],
        [-w / 2 + r, -h / 2 + r, Math.PI],
      ]
      for (let q = 0; q < 4; q++) {
        const [x0, y0, dx, dy, L] = seg[q]
        if (d < L) {
          at(x0 + dx * d, y0 + dy * d)
          break
        }
        d -= L
        const arc = (Math.PI / 2) * r
        if (d < arc) {
          const [cx, cy, a0] = corners[q]
          const a = a0 + d / r
          at(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          break
        }
        d -= arc
      }
    }
  }
  // The slab: front and back edges bright, the band between fainter.
  outline(W, H, R, 2.3, (x, y) => {
    const r = Math.hypot(x, y) || 1
    out.push({ p: [x, y, T / 2], ink: 0.9, n: [x / r, y / r, 0.6] })
    out.push({ p: [x, y, -T / 2], ink: 0.95, n: [x / r, y / r, -0.6] })
  })
  outline(W, H, R, 3.4, (x, y) => {
    const r = Math.hypot(x, y) || 1
    out.push({ p: [x, y, 0], ink: 0.55, n: [x / r, y / r, 0] })
  })
  // The back: a sparse, even field of dots so it reads as a surface.
  for (let y = -H / 2 + 8; y <= H / 2 - 8; y += 7.5)
    for (let x = -W / 2 + 7; x <= W / 2 - 7; x += 7.5) {
      if (x < -W / 2 + 40 && y > H / 2 - 42) continue
      out.push({ p: [x, y, -T / 2], ink: 0.32, n: [0, 0, -1] })
    }
  // The camera module on the back, top left, raised a little, with three lenses and a flash.
  const bx = -W / 2 + 6 + 16, by = H / 2 - 6 - 16, bz = -T / 2 - 1.6
  outline(32, 32, 8, 1.9, (x, y) => out.push({ p: [bx + x, by + y, bz], ink: 0.95, n: [0, 0, -1] }))
  for (const [lx, ly] of [[-7.5, 7.5], [-7.5, -7.5], [7.5, 0]]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      out.push({ p: [bx + lx + Math.cos(a) * 5.4, by + ly + Math.sin(a) * 5.4, bz - 1], ink: 1, n: [0, 0, -1] })
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      out.push({ p: [bx + lx + Math.cos(a) * 2.2, by + ly + Math.sin(a) * 2.2, bz - 1], ink: 0.7, n: [0, 0, -1] })
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    out.push({ p: [bx + 7.5 + Math.cos(a) * 1.8, by + 10 + Math.sin(a) * 1.8, bz], ink: 0.8, n: [0, 0, -1] })
  }
  // The screen side: the display's edge, faint.
  outline(W - 5, H - 5, R - 2, 3.2, (x, y) => out.push({ p: [x, y, T / 2 + 0.2], ink: 0.4, n: [0, 0, 1] }))
  return out
}

/** Draws the phone pass and the measurements for one foot state. */
export class FootOverlay {
  private view = new OrbView()
  private dots = phoneDots()

  constructor(
    private s: Stage,
    private m: Measure,
    private foot: CloudState,
    /** The labels' font family (default: the story's Inter). */
    private font?: string,
  ) {}

  private proj(t: number, p: V3): P2 & { z?: number } {
    this.view.set(this.foot.yawAt(t), FOOT_MOTION.tilt, this.foot.scale)
    this.view.apply(p[0], p[1], p[2])
    return toScreen(this.s, this.view.x, this.view.y)
  }

  /**
   * The phone passing slowly beneath the foot, heel to toe, as `k` goes
   * 0 → 1: its back (cameras) turned up at the sole and a little towards
   * us, turning slowly as it goes.
   */
  phone(t: number, k: number, alpha: number): void {
    if (alpha <= 0.003) return
    const ctx = this.s.overlay
    const F = this.foot.scale
    // Real size against the foot: 268 mm heel to toe.
    const mm = (this.m.len * F) / 268
    // Just below the sole, in front of the foot; heel (right) to toe (left).
    const [la, lb] = [this.proj(t, this.m.length[0]), this.proj(t, this.m.length[1])]
    const sole = Math.max(la[1], lb[1])
    const e = k
    const cx = this.s.width / 2 + F * (0.36 - 0.72 * e)
    const cy = sole + mm * 14
    // Orientation: length along the foot, back facing up and towards us; a slow turn.
    const phi = 0.78
    const psi = -0.55 + 1.1 * e
    const roll = 0.12 * Math.sin(Math.PI * e)
    const axes: [V3, V3, V3] = [
      [0, Math.sin(phi), -Math.cos(phi)], // phone x (across)
      [1, 0, 0], // phone y (along)
      [0, -Math.cos(phi), -Math.sin(phi)], // phone z (out of the screen; the back faces up)
    ]
    const cps = Math.cos(psi), sps = Math.sin(psi), cr = Math.cos(roll), sr = Math.sin(roll)
    const rot = (v: V3): V3 => {
      // roll about the phone's length, then yaw about the vertical
      const x1 = v[0], y1 = v[1] * cr - v[2] * sr, z1 = v[1] * sr + v[2] * cr
      return [x1 * cps + z1 * sps, y1, -x1 * sps + z1 * cps]
    }
    const A = axes.map(rot) as [V3, V3, V3]
    const toView = (p: V3): V3 => [
      A[0][0] * p[0] + A[1][0] * p[1] + A[2][0] * p[2],
      A[0][1] * p[0] + A[1][1] * p[1] + A[2][1] * p[2],
      A[0][2] * p[0] + A[1][2] * p[1] + A[2][2] * p[2],
    ]
    overlayStats.drawn++
    ctx.save()
    for (const d of this.dots) {
      const v = toView(d.p)
      const n = toView(d.n)
      // Towards us (+z) is brighter and larger; surfaces facing away fade.
      const depth = Math.min(1, Math.max(0, v[2] / 50 + 0.5))
      const facing = Math.min(1, Math.max(0.25, (n[2] + 0.35) / 0.8))
      const a = alpha * d.ink * facing * (0.55 + 0.45 * depth)
      if (a < 0.02) continue
      const r = (0.75 + 0.5 * depth) * Math.min(1.25, Math.sqrt(mm))
      ctx.fillStyle = `rgba(${INK},${a.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(cx + v[0] * mm, cy - v[1] * mm, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /**
   * Measurements: length and width in mm, and the arch. Each grows in at its
   * own time (`at`, seconds into the screen); all fade as `out` goes 0 → 1.
   */
  /**
   * `pace`: how long each line takes to draw and each label to fade in (s). Given, the lines also
   * ease in and out instead of shooting out and slowing down (the story's quick default).
   */
  measures(t: number, local: number, at: [number, number, number], out: number, pace?: { draw: number; fade: number }): void {
    const ctx = this.s.overlay
    const keep = 1 - out
    const g = (a: number) => (pace ? smooth(a, a + pace.draw, local) : outCubic(a, a + 0.38, local))
    const al = (a: number) => smooth(a, a + (pace ? pace.fade : 0.25), local) * keep
    const M = this.m
    const W = this.s.width
    const clampX = (x: number) => Math.min(W - 48, Math.max(48, x))
    const C = this.proj(t, M.centre)
    // Plain text on the dark: no halo round the letters.
    const text = { size: 14, weight: 620, halo: false, font: this.font }
    // Length, with its label set off away from the foot.
    const [la, lb] = [this.proj(t, M.length[0]), this.proj(t, M.length[1])]
    dimension(ctx, la, lb, g(at[0]), 0.9 * al(at[0]), 5)
    const lm: P2 = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2]
    let nx = -(lb[1] - la[1]), ny = lb[0] - la[0]
    const nl = Math.hypot(nx, ny) || 1
    ;(nx /= nl), (ny /= nl)
    if (nx * (lm[0] - C[0]) + ny * (lm[1] - C[1]) < 0) (nx = -nx), (ny = -ny)
    label(ctx, '268.4 mm', clampX(lm[0] + nx * 19), lm[1] + ny * 19, al(at[0] + 0.15), text)
    // Width, labelled beside its outer end.
    const [wa, wb] = [this.proj(t, M.width[0]), this.proj(t, M.width[1])]
    dimension(ctx, wa, wb, g(at[1]), 0.9 * al(at[1]), 4)
    const wl = wa[1] < wb[1] ? wa : wb
    label(ctx, '103.7 mm', clampX(wl[0] - 10), wl[1] - 19, al(at[1] + 0.15), text)
    // The arch.
    const arch = M.arch.map((p) => this.proj(t, p))
    const n = Math.max(2, Math.round(arch.length * clamp01(g(at[2]))))
    stroke(ctx, arch.slice(0, n), 0.9 * al(at[2]), 1.2)
    const am = arch[Math.floor(arch.length / 2)]
    label(ctx, 'Arch', am[0], am[1] - 15, al(at[2] + 0.2), { size: 13, weight: 620, spacing: 0.3, halo: false, font: this.font })
  }
}
