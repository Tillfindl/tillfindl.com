/**
 * Running shoes as simple, smooth line drawings, built on the side profile
 * traced from the reference photo (assets/src/shoe-profile.json).
 *
 * Solids (their outlines become the lines): a rounded midsole that flares a
 * little to the ground, and an upper arching over the foot with a clean
 * collar opening. Drawn detail, only a few flowing lines: the collar edge,
 * the midsole top, the outsole, the lacing panel (no laces), a toe cap and
 * a heel counter, and one optional midsole line. No logos, nothing
 * brand-like.
 *
 * Units mm. +x heel → toe, +y up, +z the shoe's lateral side.
 */
import * as THREE from 'three'
import profile from '../assets/shoe-profile.json'
import type { Drawing, Polyline } from './LineRenderer'

export interface ShoeDesign {
  name: string
  /** Midsole height scale; heelBoost adds at the heel only. */
  stack: number
  heelBoost: number
  /** Midsole widening towards the ground. */
  flare: number
  /** Extra toe lift (mm). */
  spring: number
  /** Upper height scale. */
  upper: number
  /** 0 = pointed toe, 1 = round and blunt. */
  blunt: number
  /** Collar height at the ankle dip (mm above the midsole). */
  collar: number
  /** Toe cap seam height, fraction of the upper. */
  toecap: number
  midsoleLine: 'none' | 'wave' | 'step'
  plate: boolean
}

export const BASE_DESIGN: ShoeDesign = {
  name: 'daily',
  stack: 0.72,
  heelBoost: 0,
  flare: 0.06,
  spring: 0,
  upper: 1,
  blunt: 0.35,
  collar: 46,
  toecap: 0.3,
  midsoleLine: 'wave',
  plate: false,
}

/** Five clearly different shoes (the running store), then a seeded crowd. */
export const STORE_DESIGNS: ShoeDesign[] = [
  { ...BASE_DESIGN },
  { ...BASE_DESIGN, name: 'cushion', stack: 0.9, heelBoost: 0.06, flare: 0.1, spring: 3, upper: 0.95, blunt: 0.75, midsoleLine: 'none', collar: 44 },
  { ...BASE_DESIGN, name: 'racer', stack: 0.95, heelBoost: 0.1, flare: 0.12, spring: 7, upper: 0.86, blunt: 0.15, midsoleLine: 'step', plate: true, collar: 40 },
  { ...BASE_DESIGN, name: 'trail', stack: 0.62, flare: 0.04, spring: 2, upper: 1.05, blunt: 0.6, collar: 52, midsoleLine: 'none', toecap: 0.4 },
  { ...BASE_DESIGN, name: 'stability', stack: 0.8, heelBoost: 0.04, flare: 0.08, upper: 1.02, blunt: 0.5, midsoleLine: 'step', collar: 50 },
]

export function designCrowd(n: number, seed = 5): ShoeDesign[] {
  let s = seed >>> 0 || 1
  const r = () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 4294967296
  }
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)]
  const out: ShoeDesign[] = [...STORE_DESIGNS]
  while (out.length < n) {
    out.push({
      name: `crowd-${out.length}`,
      stack: 0.6 + r() * 0.35,
      heelBoost: r() * 0.1,
      flare: 0.03 + r() * 0.1,
      spring: r() * 7,
      upper: 0.86 + r() * 0.2,
      blunt: r(),
      collar: 40 + r() * 14,
      toecap: 0.24 + r() * 0.16,
      midsoleLine: pick(['none', 'wave', 'step'] as const),
      plate: r() < 0.15,
    })
  }
  return out
}

// ------------------------------------------------------------------ profile

const LEN = 290
const P = profile as { s: number[]; top: number[]; midsole: number[]; bottom: number[] }

/** Gaussian smoothing of a profile curve (no kinks from the tracing). */
function soften(a: number[], sigma: number): number[] {
  const n = a.length, out = new Array<number>(n)
  const r = Math.ceil(sigma * 3)
  for (let i = 0; i < n; i++) {
    let acc = 0, w = 0
    for (let k = -r; k <= r; k++) {
      const j = Math.min(n - 1, Math.max(0, i + k))
      const g = Math.exp(-(k * k) / (2 * sigma * sigma))
      acc += a[j] * g
      w += g
    }
    out[i] = acc / w
  }
  return out
}

/** The top line, with the photo's pull-loop spike at the heel softened into the counter. */
const TOP = (() => {
  const t = P.top.slice(), n = t.length, from = Math.floor(n * 0.85)
  for (let i = from; i < n; i++) t[i] = Math.min(t[i], t[from] + 0.01)
  return soften(t, 2)
})()
const MID = soften(P.midsole, 2)
const BOT = soften(P.bottom, 2)

/** Catmull-Rom through the stations; u = 0 heel, 1 toe (the photo runs toe → heel). */
function sampleProfile(arr: number[], u: number): number {
  const n = arr.length
  const f = Math.min(n - 1.0001, Math.max(0, (1 - u) * (n - 1)))
  const i = Math.floor(f), t = f - i
  const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(n - 1, i + 2)]
  const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  return v * LEN
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface ShoeShape {
  length: number
  plan(u: number): number
  yb(u: number): number
  ym(u: number): number
  hu(u: number): number
  /** A point on the upper: u heel → toe, th 0 lateral edge → 0.5 top → 1 medial edge. */
  upper(u: number, th: number): THREE.Vector3
  /** A point on the midsole side: h 0 ground → 1 top, side +1 lateral / −1 medial. */
  midsole(u: number, h: number, side: number): THREE.Vector3
  /** Collar height (above the midsole) at u. */
  collar(u: number): number
  /** The collar opening as a half-width in th around the top line (0 where closed). */
  halfOpen(u: number): number
}

export const THROAT = 0.4

export function shoeShape(d: ShoeDesign): ShoeShape {
  const plan0 = (u: number) => 35 + 5 * smooth(0, 0.14, u) - 5 * smooth(0.18, 0.4, u) + 14 * smooth(0.38, 0.66, u) - 4 * smooth(0.7, 0.9, u)
  const tip = 0.3 - 0.1 * d.blunt
  const plan = (u: number) => {
    const heel = u < 0.22 ? Math.sqrt(Math.max(0, 1 - (1 - u / 0.22) ** 2)) : 1
    const toe = u > 1 - tip ? Math.max(0, 1 - ((u - (1 - tip)) / tip) ** (2 - 0.6 * d.blunt)) ** 0.5 : 1
    return plan0(u) * heel * toe
  }
  const yb = (u: number) => sampleProfile(BOT, u) + d.spring * smooth(0.6, 1, u) ** 2
  const thick = (u: number) => (sampleProfile(MID, u) - sampleProfile(BOT, u)) * (d.stack + d.heelBoost * smooth(0.5, 0, u))
  const ym = (u: number) => yb(u) + thick(u)
  // The upper keeps its real height when the stack is lower.
  const hu = (u: number) => Math.max(3, (sampleProfile(TOP, u) - sampleProfile(MID, u)) * d.upper)
  const upper = (u: number, th: number) => {
    const t = Math.PI * th
    const back = smooth(0.2, 0, u)
    const y = hu(u) * Math.sin(t) ** 0.8
    return new THREE.Vector3(u * LEN - back * 0.03 * y, ym(u) + y, plan(u) * 0.95 * Math.cos(t))
  }
  // Heel and toe are bevelled: the underside rounds up into the ends
  // (a quarter ellipse), so the sole has no vertical cut at either end.
  const bevel = (u: number) => {
    const ell = (x: number) => (x >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - x) ** 2)))
    return ell(u / 0.07) * ell((1 - u) / 0.05)
  }
  const midsole = (u: number, h: number, side: number) => {
    const w = plan(u) * (1.04 + d.flare * (1 - h) ** 2)
    return new THREE.Vector3(u * LEN, ym(u) - (1 - h) * (ym(u) - yb(u)) * bevel(u), side * w)
  }
  // The collar opening: round the heel counter, down past the ankle, and
  // closing in a round U at the throat (no corner where it meets the top).
  const halfOpen = (u: number) => {
    if (u >= THROAT) return 0
    const heel = d.collar - 6 + 14 * smooth(0.3, 0, u)
    const back = 0.5 - Math.asin(Math.min(1, heel / hu(u)) ** (1 / 0.8)) / Math.PI
    const uc = THROAT - 0.13
    return u <= uc ? back : back * Math.sqrt(Math.max(0, 1 - ((u - uc) / (THROAT - uc)) ** 2))
  }
  const collar = (u: number) => hu(u) * Math.sin(Math.PI * (0.5 - halfOpen(u))) ** 0.8
  return { length: LEN, plan, yb, ym, hu, upper, midsole, collar, halfOpen }
}

// ------------------------------------------------------------------ meshing

/**
 * Indexed parametric grid over [0,1]². Normals come from the surface's own
 * formula (finite differences), not from the mesh, so outlines computed from
 * them are smooth curves rather than following the facets. The mesh normals
 * only orient them, and stand in where the surface pinches to a point.
 * `wrapV`: v is periodic (a closed section).
 */
function grid(nu: number, nv: number, f: (u: number, v: number) => THREE.Vector3, wrapV = false): THREE.BufferGeometry {
  const pos: number[] = []
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const p = f(i / nu, j / nv)
      pos.push(p.x, p.y, p.z)
    }
  const idx: number[] = []
  const at = (i: number, j: number) => i * (nv + 1) + j
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) idx.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute
  const e = 1e-3
  const du = new THREE.Vector3(), dv = new THREE.Vector3(), n = new THREE.Vector3(), mesh = new THREE.Vector3()
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv
      du.subVectors(f(Math.min(1, u + e), v), f(Math.max(0, u - e), v))
      const v0 = wrapV ? v - e : Math.max(0, v - e), v1 = wrapV ? v + e : Math.min(1, v + e)
      dv.subVectors(f(u, v1), f(u, v0))
      n.crossVectors(du, dv)
      const k = at(i, j)
      mesh.fromBufferAttribute(nrm, k)
      if (n.lengthSq() < 1e-6 * du.lengthSq() * dv.lengthSq() || mesh.lengthSq() < 0.5) continue
      n.normalize()
      if (n.dot(mesh) < 0) n.negate()
      nrm.setXYZ(k, n.x, n.y, n.z)
    }
  if (wrapV)
    // The seam's two copies of each vertex get the same normal.
    for (let i = 0; i <= nu; i++) {
      mesh.fromBufferAttribute(nrm, at(i, 0))
      nrm.setXYZ(at(i, nv), mesh.x, mesh.y, mesh.z)
    }
  return g
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = []
  let off = 0
  for (const g of parts) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i))
      nrm.push(n.getX(i), n.getY(i), n.getZ(i))
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off)
    else for (let i = 0; i < p.count; i++) idx.push(i + off)
    off += p.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  out.setIndex(idx)
  return out
}

// ------------------------------------------------------------------ the drawing

/**
 * `detail` 1 is the full mesh; 0.5 a lighter one for shoes small on screen
 * (half the rows each way; the outlines differ by well under a pixel there).
 */
export function shoeDrawing(d: ShoeDesign, detail = 1): Drawing {
  const n = (k: number, even = false) => (even ? 2 * Math.max(2, Math.round((k * detail) / 2)) : Math.max(4, Math.round(k * detail)))
  const S = shoeShape(d)
  const solids: THREE.BufferGeometry[] = []
  const lines: Polyline[] = []

  // Midsole: a rounded section (a soft squircle), closed at both ends.
  solids.push(
    grid(
      n(72),
      n(22),
      (u, a) => {
        const phi = 2 * Math.PI * a
        const c = Math.cos(phi), s = Math.sin(phi)
        const zc = Math.sign(c) * Math.abs(c) ** 0.7
        const yc = Math.sign(s) * Math.abs(s) ** 0.7
        const p = S.midsole(u, (yc + 1) / 2, 1)
        return new THREE.Vector3(p.x, p.y, zc * Math.abs(p.z))
      },
      true,
    ),
  )

  // Height fraction on the upper -> th (lateral side th < 0.5).
  const thAt = (frac: number, side: number) => {
    const t = Math.asin(Math.min(1, Math.max(0, frac)) ** (1 / 0.8)) / Math.PI
    return side > 0 ? t : 1 - t
  }
  // Upper: in front of the throat one piece over the top; behind it the two
  // sides, each running from the sole up to the collar, so the opening is a
  // clean edge of the mesh rather than a cut through it. The rows meet
  // exactly at the throat (no cracks). Rows bunch up at both ends of the
  // back part, where the heel and the throat curve most.
  const across = n(24, true)
  solids.push(grid(n(48), across, (u, th) => S.upper(THROAT + (1 - THROAT) * u, th)))
  const backU = (x: number) => THROAT * (x - (0.6 * Math.sin(2 * Math.PI * x)) / (2 * Math.PI))
  for (const side of [1, -1]) {
    solids.push(
      grid(n(40), across / 2, (x, v) => {
        const u = backU(x)
        const th = v * (0.5 - S.halfOpen(u))
        return S.upper(u, side > 0 ? th : 1 - th)
      }),
    )
  }

  // ---------------------------------------------------------------- details
  const lift = 0.5
  // A curve on the upper, sampled finely and lifted a hair off the surface.
  const onUpper = (f: (s: number) => [number, number], n = 48): number[] => {
    const out: number[] = []
    for (let i = 0; i <= n; i++) {
      const [u, th] = f(i / n)
      const p = S.upper(u, th)
      const q = S.upper(Math.min(1, u + 1e-3), th), r = S.upper(u, Math.min(1, th + 1e-3))
      const nrm = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(r, p)).normalize()
      if (nrm.dot(new THREE.Vector3(0, p.y - S.ym(u) - S.hu(u) * 0.3, p.z)) < 0) nrm.negate()
      p.addScaledVector(nrm, lift)
      out.push(p.x, p.y, p.z)
    }
    return out
  }
  const onMidsole = (f: (s: number) => [number, number], side: number, n = 56): number[] => {
    const out: number[] = []
    for (let i = 0; i <= n; i++) {
      const [u, h] = f(i / n)
      const p = S.midsole(u, h, side)
      p.z += side * lift
      out.push(p.x, p.y, p.z)
    }
    return out
  }
  // Collar edge: one closed loop round the opening, sampled densely where it
  // turns (the heel and the throat).
  const collarPts: number[] = []
  const N = 160
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const side = s < 0.5 ? 1 : -1
    const u = backU(s < 0.5 ? 1 - s / 0.5 : (s - 0.5) / 0.5)
    const p = S.upper(u, 0.5 - side * S.halfOpen(u))
    collarPts.push(p.x, p.y + 0.4, p.z)
  }
  lines.push({ pts: collarPts, width: 1.7, ink: 1 })

  // Lacing panel: two edges along the top, joined round the vamp. No laces.
  const panel: number[] = []
  const e1 = 0.72
  const pw = 0.13
  // Where the panel's edges meet the collar opening.
  let lo = THROAT - 0.13, hi = THROAT
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2
    if (S.halfOpen(m) > pw) lo = m
    else hi = m
  }
  const u0 = hi
  for (let i = 0; i <= 40; i++) {
    const s = i / 40
    panel.push(...onUpper(() => [u0 + (e1 - u0) * (1 - s), 0.5 - pw], 0).slice(0, 3))
  }
  for (let i = 1; i <= 16; i++) {
    const a = Math.PI * (i / 16)
    panel.push(...onUpper(() => [e1 + 0.035 * Math.sin(a), 0.5 - pw * Math.cos(a)], 0).slice(0, 3))
  }
  for (let i = 1; i <= 40; i++) {
    const s = i / 40
    panel.push(...onUpper(() => [e1 - (e1 - u0) * s, 0.5 + pw], 0).slice(0, 3))
  }
  lines.push({ pts: panel, width: 1.4, ink: 0.9 })

  for (const side of [1, -1]) {
    // Midsole top edge and the outsole line.
    lines.push({ pts: onMidsole((s) => [0.012 + 0.976 * s, 0.97], side), width: 1.5, ink: 0.95 })
    lines.push({ pts: onMidsole((s) => [0.02 + 0.96 * s, 0.14], side), width: 1.15, ink: 0.6 })
    if (d.midsoleLine === 'wave')
      lines.push({ pts: onMidsole((s) => [0.08 + 0.78 * s, 0.5 + 0.12 * Math.sin(s * Math.PI * 1.4 + 0.3)], side), width: 1.15, ink: 0.7 })
    if (d.midsoleLine === 'step')
      lines.push({ pts: onMidsole((s) => [0.05 + 0.7 * s, 0.62 - 0.24 * smooth(0.35, 0.7, s)], side), width: 1.15, ink: 0.7 })
    if (d.plate) lines.push({ pts: onMidsole((s) => [0.16 + 0.76 * s, 0.46 + 0.08 * smooth(0.5, 1, s)], side), width: 1.4, ink: 0.85 })
    // Toe cap and heel counter.
    lines.push({ pts: onUpper((s) => { const u = 0.62 + 0.38 * s; return [u, thAt(d.toecap + 0.22 * smooth(0.86, 1, u), side)] }), width: 1.3, ink: 0.85 })
    lines.push({ pts: onUpper((s) => { const u = 0.3 - 0.27 * s; return [u, thAt(0.06 + 0.66 * smooth(0, 1, s) * (S.collar(Math.max(u, 0.05)) / S.hu(u)), side)] }), width: 1.3, ink: 0.85 })
  }
  return { solid: merge(solids), details: lines }
}
