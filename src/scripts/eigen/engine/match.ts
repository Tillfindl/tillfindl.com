/**
 * Slot matching: decide which point of a cloud goes into which particle slot
 * so that a morph from a reference state (usually the hero orb) moves every
 * particle a short distance. The engine keeps slot identity across states,
 * so this is what turns a random shuffle into a readable morph.
 *
 * Greedy nearest-unclaimed through a uniform grid, then a local 2-opt pass
 * that swaps pairs whenever that shortens their combined (squared) travel.
 */

export interface MatchOptions {
  /** 2 matches in the view plane (flat targets like the logo), 3 in view space. */
  dims?: 2 | 3
  /** Swap passes after the greedy assignment. Default 3. */
  passes?: number
  seed?: number
}

/**
 * `ref` holds the reference state's view-space positions (xyz per slot,
 * `refCount` slots). `pts` holds the cloud's points in the same view space
 * (`n` points). Returns, per slot, the index of the point that goes there.
 *
 * - Slots [0, refCount) get their nearest point. If the cloud has fewer
 *   points than the reference, the slots left over get `-(host + 1)`: a
 *   hidden particle parked on point `host`, so it flies in and fades out
 *   instead of collapsing to the centre.
 * - Points the reference had no slot for go to slots [refCount, n) in their
 *   original order; they emerge from the reference's park.
 */
export function matchSlots(ref: Float32Array, refCount: number, pts: Float32Array, n: number, o: MatchOptions = {}): Int32Array {
  const dims = o.dims ?? 3
  const count = Math.max(refCount, n)
  const out = new Int32Array(count).fill(-1)
  if (!refCount || !n) {
    for (let i = 0; i < n; i++) out[i] = i
    return out
  }

  // Match from the smaller set into the larger one.
  const refIsSmall = refCount <= n
  const small = refIsSmall ? ref : pts
  const large = refIsSmall ? pts : ref
  const ns = refIsSmall ? refCount : n
  const nl = refIsSmall ? n : refCount

  const grid = new Grid(large, nl, dims)
  const claimOf = new Int32Array(nl).fill(-1) // large index → small index
  const pick = new Int32Array(ns) // small index → large index

  // Greedy, in a seeded random order so no region is systematically served last.
  const order = new Int32Array(ns)
  for (let i = 0; i < ns; i++) order[i] = i
  let s = (o.seed ?? 1) >>> 0 || 1
  for (let i = ns - 1; i > 0; i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    const j = (s >>> 0) % (i + 1)
    const t = order[i]; order[i] = order[j]; order[j] = t
  }
  for (let k = 0; k < ns; k++) {
    const a = order[k]
    const q = grid.nearest(small[a * 3], small[a * 3 + 1], dims === 3 ? small[a * 3 + 2] : 0)
    pick[a] = q
    claimOf[q] = a
    grid.remove(q)
  }

  // 2-opt: a (at pa) and b (at pb) trade targets when that is shorter overall.
  const d2 = (A: Float32Array, i: number, B: Float32Array, j: number) => {
    const dx = A[i * 3] - B[j * 3], dy = A[i * 3 + 1] - B[j * 3 + 1]
    const dz = dims === 3 ? A[i * 3 + 2] - B[j * 3 + 2] : 0
    return dx * dx + dy * dy + dz * dz
  }
  const full = new Grid(large, nl, dims)
  const near: number[] = []
  for (let pass = 0; pass < (o.passes ?? 3); pass++) {
    let swaps = 0
    for (let a = 0; a < ns; a++) {
      near.length = 0
      full.neighbours(small[a * 3], small[a * 3 + 1], dims === 3 ? small[a * 3 + 2] : 0, near)
      for (const q of near) {
        const b = claimOf[q]
        const pa = pick[a]
        if (q === pa) continue
        const before = d2(small, a, large, pa) + (b >= 0 ? d2(small, b, large, q) : 0)
        const after = d2(small, a, large, q) + (b >= 0 ? d2(small, b, large, pa) : 0)
        if (after < before - 1e-9) {
          pick[a] = q
          claimOf[q] = a
          claimOf[pa] = b
          if (b >= 0) pick[b] = pa
          swaps++
        }
      }
    }
    if (!swaps) break
  }

  if (refIsSmall) {
    // Reference slots take their matched point; the rest follow in order.
    for (let slot = 0; slot < refCount; slot++) out[slot] = pick[slot]
    let slot = refCount
    for (let p = 0; p < n; p++) if (claimOf[p] < 0) out[slot++] = p
  } else {
    // Every point has a reference slot; unclaimed slots hide on their nearest point.
    for (let p = 0; p < n; p++) out[pick[p]] = p
    const pg = new Grid(pts, n, dims)
    for (let slot = 0; slot < refCount; slot++) {
      if (out[slot] >= 0) continue
      const host = pg.nearest(ref[slot * 3], ref[slot * 3 + 1], dims === 3 ? ref[slot * 3 + 2] : 0)
      out[slot] = -(host + 1)
    }
  }
  return out
}

/** Sum of per-slot travel distances for a matching (for tests and tuning). */
export function matchCost(ref: Float32Array, refCount: number, pts: Float32Array, slots: Int32Array, dims: 2 | 3 = 3): number {
  let sum = 0
  for (let s = 0; s < Math.min(refCount, slots.length); s++) {
    const p = slots[s] < 0 ? -slots[s] - 1 : slots[s]
    const dx = ref[s * 3] - pts[p * 3], dy = ref[s * 3 + 1] - pts[p * 3 + 1]
    const dz = dims === 3 ? ref[s * 3 + 2] - pts[p * 3 + 2] : 0
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  return sum
}

/** Uniform grid over a point set with removal, for nearest-unclaimed queries. */
class Grid {
  private cell: number
  private min: [number, number, number]
  private dim: [number, number, number]
  private start: Int32Array
  private len: Int32Array
  private items: Int32Array
  private where: Int32Array

  constructor(
    private p: Float32Array,
    n: number,
    private dims: 2 | 3,
  ) {
    const min: [number, number, number] = [Infinity, Infinity, dims === 3 ? Infinity : 0]
    const max: [number, number, number] = [-Infinity, -Infinity, dims === 3 ? -Infinity : 0]
    for (let i = 0; i < n; i++)
      for (let k = 0; k < dims; k++) {
        const v = p[i * 3 + k]
        if (v < min[k]) min[k] = v
        if (v > max[k]) max[k] = v
      }
    let vol = 1
    for (let k = 0; k < dims; k++) vol *= Math.max(1e-6, max[k] - min[k])
    // About two points per cell.
    this.cell = Math.max(1e-6, (vol / Math.max(1, n / 2)) ** (1 / dims))
    this.min = min
    this.dim = [1, 1, 1]
    for (let k = 0; k < dims; k++) this.dim[k] = Math.max(1, Math.min(512, Math.ceil((max[k] - min[k]) / this.cell) + 1))
    const cells = this.dim[0] * this.dim[1] * this.dim[2]
    this.start = new Int32Array(cells + 1)
    this.len = new Int32Array(cells)
    this.items = new Int32Array(n)
    this.where = new Int32Array(n)
    const ids = new Int32Array(n)
    for (let i = 0; i < n; i++) {
      ids[i] = this.cellOf(p[i * 3], p[i * 3 + 1], dims === 3 ? p[i * 3 + 2] : 0)
      this.start[ids[i] + 1]++
    }
    for (let c = 0; c < cells; c++) this.start[c + 1] += this.start[c]
    for (let i = 0; i < n; i++) {
      const c = ids[i]
      const at = this.start[c] + this.len[c]++
      this.items[at] = i
      this.where[i] = at
    }
  }

  private coord(v: number, k: number): number {
    return Math.max(0, Math.min(this.dim[k] - 1, Math.floor((v - this.min[k]) / this.cell)))
  }

  private cellOf(x: number, y: number, z: number): number {
    return (this.coord(z, 2) * this.dim[1] + this.coord(y, 1)) * this.dim[0] + this.coord(x, 0)
  }

  remove(i: number): void {
    const p = this.p
    const c = this.cellOf(p[i * 3], p[i * 3 + 1], this.dims === 3 ? p[i * 3 + 2] : 0)
    const at = this.where[i]
    const last = this.start[c] + --this.len[c]
    const j = this.items[last]
    this.items[at] = j
    this.where[j] = at
    this.items[last] = i
    this.where[i] = last
  }

  /** Nearest remaining point, searching shells of cells outwards. */
  nearest(x: number, y: number, z: number): number {
    const cx = this.coord(x, 0), cy = this.coord(y, 1), cz = this.coord(z, 2)
    const [dx, dy, dz] = this.dim
    const maxR = Math.max(dx, dy, dz)
    let best = -1, bestD = Infinity
    const p = this.p
    for (let r = 0; r <= maxR; r++) {
      const z0 = Math.max(0, cz - r), z1 = Math.min(dz - 1, cz + r)
      const y0 = Math.max(0, cy - r), y1 = Math.min(dy - 1, cy + r)
      const x0 = Math.max(0, cx - r), x1 = Math.min(dx - 1, cx + r)
      for (let gz = z0; gz <= z1; gz++)
        for (let gy = y0; gy <= y1; gy++) {
          const onShellYZ = Math.abs(gz - cz) === r || Math.abs(gy - cy) === r
          for (let gx = x0; gx <= x1; gx += onShellYZ || x1 === x0 ? 1 : Math.max(1, x1 - x0)) {
            if (!onShellYZ && Math.abs(gx - cx) !== r) continue
            const c = (gz * dy + gy) * dx + gx
            for (let at = this.start[c], end = at + this.len[c]; at < end; at++) {
              const i = this.items[at]
              const ex = p[i * 3] - x, ey = p[i * 3 + 1] - y, ez = this.dims === 3 ? p[i * 3 + 2] - z : 0
              const d = ex * ex + ey * ey + ez * ez
              if (d < bestD) {
                bestD = d
                best = i
              }
            }
          }
        }
      // Anything in shell r+1 is at least r cells away.
      if (best >= 0 && bestD <= (r * this.cell) ** 2) break
    }
    return best
  }

  /** Points in the 3×3(×3) block of cells around a position. */
  neighbours(x: number, y: number, z: number, out: number[]): void {
    const cx = this.coord(x, 0), cy = this.coord(y, 1), cz = this.coord(z, 2)
    const [dx, dy, dz] = this.dim
    for (let gz = Math.max(0, cz - 1); gz <= Math.min(dz - 1, cz + 1); gz++)
      for (let gy = Math.max(0, cy - 1); gy <= Math.min(dy - 1, cy + 1); gy++)
        for (let gx = Math.max(0, cx - 1); gx <= Math.min(dx - 1, cx + 1); gx++) {
          const c = (gz * dy + gy) * dx + gx
          for (let at = this.start[c], end = at + this.len[c]; at < end; at++) out.push(this.items[at])
        }
  }
}
