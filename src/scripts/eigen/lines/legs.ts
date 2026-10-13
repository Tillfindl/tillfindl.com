/**
 * A pair of running lower legs, drawn as smooth outlines.
 *
 * Anatomy: each leg is a loft along a centreline from hip through knee to
 * ankle (the knee is a rounded bend, not a hinge). The cross-section is
 * wider front-to-back where muscles are (quadriceps and hamstrings, the
 * calf), flat over the shin, narrow at the Achilles, with a small patella.
 *
 * Motion: sagittal joint angles over the gait cycle, shaped after published
 * running kinematics (hip flexion/extension, knee flexion with its stance
 * dip and big swing flexion, ankle dorsi/plantarflexion). The hip height is
 * solved so the stance foot's sole sits on the belt, with a short flight
 * phase between steps. The belt runs at the stance foot's speed.
 *
 * Outlines are found every frame on the CPU (where the surface turns away
 * from the eye, interpolated per triangle); the legs fade towards the top,
 * like a cropped shot.
 */
import * as THREE from 'three'
import { DynamicLines, type LineRenderer } from './LineRenderer'
import { shoeShape, type ShoeDesign } from './shoe'

const THIGH = 440
const SHANK = 440
/** Seconds per stride (two steps): about 170 steps a minute. */
export const STRIDE_PERIOD = 0.72
const STANCE = 0.36

/** Periodic Catmull-Rom through [phase, value] keys (phase 0..1, last key at 1 == first). */
function periodic(keys: [number, number][]): (p: number) => number {
  const K = keys.slice(0, -1)
  const n = K.length
  return (p) => {
    p = ((p % 1) + 1) % 1
    let i = n - 1
    for (let k = 0; k < n; k++) if (K[k][0] <= p) i = k
    const at = (k: number) => {
      const j = ((k % n) + n) % n
      const wrap = Math.floor(k / n)
      return [K[j][0] + wrap, K[j][1]] as [number, number]
    }
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const t = (p - p1[0]) / (p2[0] - p1[0])
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]), m2 = (p3[1] - p1[1]) / (p3[0] - p1[0])
    const h = p2[0] - p1[0], t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * h * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * h * m2
  }
}

// Joint angles in degrees over one stride (0 = initial contact, toe-off at 0.36).
const HIP = periodic([[0, 30], [0.08, 27], [0.18, 16], [0.28, 3], [0.36, -6], [0.44, -10], [0.52, -2], [0.62, 16], [0.72, 32], [0.82, 40], [0.9, 37], [1, 30]])
const KNEE = periodic([[0, 20], [0.1, 36], [0.16, 40], [0.26, 30], [0.36, 20], [0.46, 50], [0.56, 84], [0.65, 102], [0.73, 96], [0.81, 72], [0.9, 32], [0.96, 21], [1, 20]])
const ANKLE = periodic([[0, 4], [0.1, 14], [0.2, 18], [0.3, 6], [0.36, -18], [0.44, -22], [0.54, -10], [0.66, 0], [0.8, 4], [0.92, 6], [1, 4]])
const PELVIC_TILT = 10
const rad = THREE.MathUtils.degToRad

/** Knee and ankle relative to the hip (sagittal plane), and the foot's pitch (rad, toe up +). */
function pose(p: number) {
  const at = rad(HIP(p) - PELVIC_TILT)
  const as = at - rad(KNEE(p))
  const knee = new THREE.Vector2(Math.sin(at) * THIGH, -Math.cos(at) * THIGH)
  const ankle = knee.clone().add(new THREE.Vector2(Math.sin(as) * SHANK, -Math.cos(as) * SHANK))
  return { knee, ankle, pitch: as + rad(ANKLE(p)) }
}

/** Cross-section radii along the leg (s = 0 hip, ~0.5 knee, 1 ankle), mm. */
function keys(k: [number, number][]): (s: number) => number {
  return (s) => {
    if (s <= k[0][0]) return k[0][1]
    for (let i = 0; i < k.length - 1; i++)
      if (s <= k[i + 1][0]) {
        const t = (s - k[i][0]) / (k[i + 1][0] - k[i][0])
        return k[i][1] + (k[i + 1][1] - k[i][1]) * (t * t * (3 - 2 * t))
      }
    return k[k.length - 1][1]
  }
}
const R_ANT = keys([[0, 80], [0.1, 78], [0.25, 70], [0.4, 58], [0.47, 52], [0.5, 56], [0.54, 49], [0.62, 43], [0.72, 37], [0.85, 31], [0.95, 28], [1, 28]])
const R_POST = keys([[0, 78], [0.1, 76], [0.25, 66], [0.4, 54], [0.47, 47], [0.5, 46], [0.55, 52], [0.63, 61], [0.71, 56], [0.8, 40], [0.9, 27], [1, 26]])
const R_LAT = keys([[0, 88], [0.1, 84], [0.25, 72], [0.4, 58], [0.5, 52], [0.6, 54], [0.7, 47], [0.85, 34], [1, 30]])

/** Where a leg's joints are (world mm): for tracking overlays. */
export interface LegJoints {
  hip: THREE.Vector3
  knee: THREE.Vector3
  ankle: THREE.Vector3
  heel: THREE.Vector3
  toe: THREE.Vector3
}

interface Fit {
  ankle: THREE.Vector3
  sole: THREE.Vector3[]
  /** Hip height above the belt over the stride (200 samples). */
  hipY: Float32Array
}

export class Legs {
  private solid: THREE.Mesh
  private lines: DynamicLines
  private pos: Float32Array
  private nrm: Float32Array
  private geo = new THREE.BufferGeometry()
  private readonly NU = 72
  private readonly NV = 28
  private fits = new Map<ShoeDesign, Fit>()
  private centre: THREE.Vector3[] = []
  /** Shoe matrices, near leg first. */
  readonly shoes = [new THREE.Matrix4(), new THREE.Matrix4()]
  presence = 1
  /** Belt speed that matches the stance foot (mm/s). */
  readonly beltSpeed: number
  /** Legs fade out between these heights (mm), like a cropped shot. */
  fade: [number, number] = [520, 820]

  constructor(r: LineRenderer) {
    const verts = 2 * (this.NU + 1) * (this.NV + 1)
    this.pos = new Float32Array(verts * 3)
    this.nrm = new Float32Array(verts * 3)
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage))
    const idx: number[] = []
    for (let leg = 0; leg < 2; leg++) {
      const o = leg * (this.NU + 1) * (this.NV + 1)
      for (let i = 0; i < this.NU; i++)
        for (let j = 0; j < this.NV; j++) {
          const a = o + i * (this.NV + 1) + j
          idx.push(a, a + this.NV + 1, a + this.NV + 2, a, a + this.NV + 2, a + 1)
        }
    }
    this.geo.setIndex(idx)
    this.solid = new THREE.Mesh(this.geo, r.solidMaterial)
    this.solid.frustumCulled = false
    r.scene.add(this.solid)
    this.lines = new DynamicLines(r, 6000)
    const a = pose(0).ankle, b = pose(STANCE).ankle
    this.beltSpeed = (a.x - b.x) / (STANCE * STRIDE_PERIOD)
    for (let i = 0; i <= this.NU; i++) this.centre.push(new THREE.Vector3())
  }

  private fit(d: ShoeDesign): Fit {
    let f = this.fits.get(d)
    if (f) return f
    const S = shoeShape(d)
    const sole: THREE.Vector3[] = []
    for (let i = 0; i <= 24; i++) sole.push(new THREE.Vector3((i / 24) * S.length, S.yb(i / 24), 0))
    const ankle = new THREE.Vector3(0.24 * S.length, S.ym(0.24) + 46, 0)
    // Lowest point of a leg's sole relative to the hip at phase p.
    const low = (p: number) => {
      const q = pose(p)
      const rot = new THREE.Matrix4().makeRotationZ(q.pitch)
      let m = Infinity
      for (const s of sole) m = Math.min(m, s.clone().sub(ankle).applyMatrix4(rot).y + q.ankle.y)
      return m
    }
    const n = 200
    const raw = new Float32Array(n)
    const need = (p: number) => (p < STANCE ? -low(p) : -low(p - 0.5))
    const takeoffA = need(STANCE - 1e-4), landB = -low(0), takeoffB = -low(STANCE - 1e-4), landA = -low(0)
    for (let i = 0; i < n; i++) {
      const p = i / n
      if (p < STANCE || (p >= 0.5 && p < 0.5 + STANCE)) raw[i] = need(p < 0.5 ? p : p)
      else {
        // Flight: a short arc between take-off and landing.
        const [a, b, p0] = p < 0.5 ? [takeoffA, landB, STANCE] : [takeoffB, landA, 0.5 + STANCE]
        const s = (p - p0) / (0.5 - STANCE)
        raw[i] = a + (b - a) * s + 4 * 14 * s * (1 - s)
      }
    }
    // Smooth (wrapping) so the body never jerks at contact.
    const hipY = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let acc = 0, w = 0
      for (let k = -4; k <= 4; k++) {
        const g = Math.exp(-(k * k) / 8)
        acc += raw[(i + k + n) % n] * g
        w += g
      }
      hipY[i] = acc / w
    }
    f = { ankle, sole, hipY }
    this.fits.set(d, f)
    return f
  }

  /**
   * Joint positions (near leg first) at running phase `phase`, hip at x =
   * hipX, without posing the drawing: a pure function, for tracking.
   */
  jointsAt(phase: number, hipX: number, design: ShoeDesign): [LegJoints, LegJoints] {
    const f = this.fit(design)
    const n = f.hipY.length
    const pf = (((phase % 1) + 1) % 1) * n
    const i0 = Math.floor(pf), w = pf - i0
    const hipY = f.hipY[i0 % n] * (1 - w) + f.hipY[(i0 + 1) % n] * w
    const out = [0, 1].map((leg) => {
      const q = pose(phase + leg * 0.5)
      const z = leg === 0 ? 92 : -92
      const A = new THREE.Vector3(hipX + q.ankle.x, hipY + q.ankle.y, z)
      const m = new THREE.Matrix4()
        .makeTranslation(A.x, A.y, A.z)
        .multiply(new THREE.Matrix4().makeRotationZ(q.pitch))
        .multiply(new THREE.Matrix4().makeTranslation(-f.ankle.x, -f.ankle.y, 0))
      return {
        hip: new THREE.Vector3(hipX, hipY, z),
        knee: new THREE.Vector3(hipX + q.knee.x, hipY + q.knee.y, z),
        ankle: A,
        heel: f.sole[0].clone().applyMatrix4(m),
        toe: f.sole[f.sole.length - 1].clone().applyMatrix4(m),
      }
    })
    return [out[0], out[1]]
  }

  /** Pose both legs at running phase `phase` (strides), hip at x = hipX; camera for the outlines. */
  update(phase: number, hipX: number, design: ShoeDesign, camera: THREE.Camera): void {
    const f = this.fit(design)
    const n = f.hipY.length
    const pf = (((phase % 1) + 1) % 1) * n
    const i0 = Math.floor(pf), w = pf - i0
    const hipY = f.hipY[i0 % n] * (1 - w) + f.hipY[(i0 + 1) % n] * w
    for (let leg = 0; leg < 2; leg++) {
      const p = phase + leg * 0.5
      const q = pose(p)
      const z = leg === 0 ? 92 : -92
      const H = new THREE.Vector3(hipX, hipY, z)
      const K = new THREE.Vector3(hipX + q.knee.x, hipY + q.knee.y, z)
      const A = new THREE.Vector3(hipX + q.ankle.x, hipY + q.ankle.y, z)
      this.loft(leg, H, K, A)
      this.shoes[leg]
        .makeTranslation(A.x, A.y, A.z)
        .multiply(new THREE.Matrix4().makeRotationZ(q.pitch))
        .multiply(new THREE.Matrix4().makeTranslation(-f.ankle.x, -f.ankle.y, 0))
    }
    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.normal.needsUpdate = true
    this.solid.visible = this.presence > 0.004
    this.outlines(camera)
  }

  /** The leg surface: a loft along hip → rounded knee → ankle. */
  private loft(leg: number, H: THREE.Vector3, K: THREE.Vector3, A: THREE.Vector3): void {
    const dt = K.clone().sub(H).normalize(), ds = A.clone().sub(K).normalize()
    const r = 60
    const k0 = K.clone().addScaledVector(dt, -r), k1 = K.clone().addScaledVector(ds, r)
    // Centreline samples by arc length: straight thigh, a quadratic bend, straight shank.
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) pts.push(H.clone().lerp(k0, i / 20))
    for (let i = 1; i <= 12; i++) {
      const t = i / 12
      pts.push(k0.clone().multiplyScalar((1 - t) ** 2).addScaledVector(K, 2 * t * (1 - t)).addScaledVector(k1, t * t))
    }
    for (let i = 1; i <= 20; i++) pts.push(k1.clone().lerp(A, i / 20))
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]))
    const L = cum[cum.length - 1]
    let seg = 0
    for (let i = 0; i <= this.NU; i++) {
      const target = (i / this.NU) * L
      while (seg < pts.length - 2 && cum[seg + 1] < target) seg++
      const t = (target - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg])
      this.centre[i].copy(pts[seg]).lerp(pts[seg + 1], t)
    }
    const o = leg * (this.NU + 1) * (this.NV + 1)
    const tan = new THREE.Vector3(), ant = new THREE.Vector3()
    for (let i = 0; i <= this.NU; i++) {
      const s = i / this.NU
      const a = this.centre[Math.max(0, i - 1)], b = this.centre[Math.min(this.NU, i + 1)]
      tan.subVectors(b, a).normalize()
      // Anterior: in the sagittal plane, perpendicular to the leg, facing forward.
      ant.set(-tan.y, tan.x, 0)
      const ra = R_ANT(s), rp = R_POST(s), rl = R_LAT(s)
      const C = this.centre[i]
      for (let j = 0; j <= this.NV; j++) {
        const phi = (2 * Math.PI * j) / this.NV
        const c = Math.cos(phi), sn = Math.sin(phi)
        const rr = c >= 0 ? ra : rp
        const k = (o + i * (this.NV + 1) + j) * 3
        this.pos[k] = C.x + ant.x * c * rr
        this.pos[k + 1] = C.y + ant.y * c * rr
        this.pos[k + 2] = C.z + sn * rl
      }
    }
    // Normals from the grid (central differences), pointing outward.
    const P = this.pos
    const get = (i: number, j: number, out: THREE.Vector3) => {
      const k = (o + Math.min(this.NU, Math.max(0, i)) * (this.NV + 1) + ((j + this.NV) % this.NV)) * 3
      return out.set(P[k], P[k + 1], P[k + 2])
    }
    const du = new THREE.Vector3(), dv = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), nrm = new THREE.Vector3()
    for (let i = 0; i <= this.NU; i++)
      for (let j = 0; j <= this.NV; j++) {
        du.subVectors(get(i + 1, j, a), get(i - 1, j, b))
        dv.subVectors(get(i, j + 1, a), get(i, j - 1, b))
        nrm.crossVectors(du, dv).normalize()
        get(i, j, a)
        if (nrm.dot(a.sub(this.centre[i])) < 0) nrm.negate()
        const k = (o + i * (this.NV + 1) + j) * 3
        this.nrm[k] = nrm.x
        this.nrm[k + 1] = nrm.y
        this.nrm[k + 2] = nrm.z
      }
  }

  /** Outline curves (n · v = 0, interpolated per triangle) and a sock cuff. */
  private outlines(camera: THREE.Camera): void {
    const L = this.lines
    L.begin()
    if (this.presence <= 0.004) return L.commit()
    const eye = camera.getWorldPosition(new THREE.Vector3())
    const P = this.pos, N = this.nrm
    const nv = this.NV + 1
    const count = P.length / 3
    const d = new Float32Array(count)
    for (let v = 0; v < count; v++) {
      const k = v * 3
      const ex = eye.x - P[k], ey = eye.y - P[k + 1], ez = eye.z - P[k + 2]
      d[v] = (N[k] * ex + N[k + 1] * ey + N[k + 2] * ez) / Math.hypot(ex, ey, ez)
    }
    const [f0, f1] = this.fade
    const ink = (y: number) => this.presence * (1 - Math.min(1, Math.max(0, (y - f0) / (f1 - f0))))
    const cross = (a: number, b: number, out: number[]) => {
      const t = d[a] / (d[a] - d[b])
      out.push(P[a * 3] + (P[b * 3] - P[a * 3]) * t, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t)
    }
    const tri = (a: number, b: number, c: number) => {
      const pts: number[] = []
      if (d[a] * d[b] < 0) cross(a, b, pts)
      if (d[b] * d[c] < 0) cross(b, c, pts)
      if (d[c] * d[a] < 0) cross(c, a, pts)
      if (pts.length < 6) return
      const y = (pts[1] + pts[4]) / 2
      L.seg(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], 2.1, ink(y))
    }
    for (let leg = 0; leg < 2; leg++) {
      const o = leg * (this.NU + 1) * nv
      for (let i = 0; i < this.NU; i++)
        for (let j = 0; j < this.NV; j++) {
          const a = o + i * nv + j
          tri(a, a + nv, a + nv + 1)
          tri(a, a + nv + 1, a + 1)
        }
      // Sock cuff: a ring just above the ankle.
      const i = Math.round(this.NU * 0.86)
      for (let j = 0; j < this.NV; j++) {
        const a = (o + i * nv + j) * 3, b = (o + i * nv + j + 1) * 3
        const lift = 0.8
        L.seg(
          P[a] + N[a] * lift, P[a + 1] + N[a + 1] * lift, P[a + 2] + N[a + 2] * lift,
          P[b] + N[b] * lift, P[b + 1] + N[b + 1] * lift, P[b + 2] + N[b + 2] * lift,
          1.35, ink(P[a + 1]) * 0.8,
        )
      }
    }
    L.commit()
  }
}
