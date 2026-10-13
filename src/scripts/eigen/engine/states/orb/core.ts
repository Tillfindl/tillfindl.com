/**
 * Shared orb maths, ported from thinking-orbs `engine/core`
 * (MIT © 2026 Jakub Antalik, see ACKNOWLEDGEMENTS.md).
 *
 * The one deliberate difference: the reference's `makeProj` returns 2D canvas
 * coordinates (y down, origin top-left). `OrbView` keeps the result in 3D
 * view space (y up, origin at the orb centre, z scaled like x/y), so the
 * orb is a real sphere the engine's camera projects.
 */

export function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f
}

export function frac(x: number): number {
  return x - Math.floor(x)
}

/** Deterministic hash in [0, 1). */
export function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return h - Math.floor(h)
}

/** Value noise on a 2D lattice. */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  let fx = x - xi
  let fy = y - yi
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hashD(xi, yi)
  const b = hashD(xi + 1, yi)
  const c = hashD(xi, yi + 1)
  const d = hashD(xi + 1, yi + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Stable directions on a unit sphere (Fibonacci lattice), written to out. */
export function fibDir(i: number, n: number, out: number[]): number[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (2 * (i + 0.5)) / n
  const rad = Math.sqrt(1 - y * y)
  const a = i * golden
  out[0] = rad * Math.cos(a)
  out[1] = y
  out[2] = rad * Math.sin(a)
  return out
}

/** Shortest signed angular distance, wrapped to (-π, π]. */
export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

/** Dot radii were tuned for a 300 pt frame; sub-linear scaling keeps small orbs legible. */
export function radiusScale(size: number, pow: number): number {
  return (size / 300) ** pow
}

/**
 * Spin (yaw about y) then tilt (about x), then uniform scale. Same maths as
 * the reference's makeProj. After apply(): x/y/z are view-space px, and
 * `zRaw` is the reference's projected z (unscaled), which the depth-shading
 * formulas use.
 */
export class OrbView {
  x = 0
  y = 0
  z = 0
  zRaw = 0
  private st = 0
  private ct = 1
  private sy = 0
  private cyw = 1
  private scale = 1

  set(yaw: number, tilt: number, scale: number): this {
    this.st = Math.sin(tilt)
    this.ct = Math.cos(tilt)
    this.sy = Math.sin(yaw)
    this.cyw = Math.cos(yaw)
    this.scale = scale
    return this
  }

  apply(x: number, y: number, z: number): this {
    const x1 = x * this.cyw + z * this.sy
    const z1 = -x * this.sy + z * this.cyw
    const y1 = y * this.ct - z1 * this.st
    const z2 = y * this.st + z1 * this.ct
    this.x = x1 * this.scale
    this.y = y1 * this.scale
    this.z = z2 * this.scale
    this.zRaw = z2
    return this
  }
}

/**
 * Where a mode writes its output. Slot order equals the reference's dot
 * generation order, so a stable depth sort reproduces its paint order.
 */
export interface OrbSink {
  /** `white` uses the reference's ink convention (0 = full ink on a dark theme). */
  dot(slot: number, x: number, y: number, z: number, r: number, white: number, a: number): void
  line(a: number, b: number, width: number, white: number, alpha: number): void
}

export type OrbOpts = { [key: string]: number | undefined }

export type OrbMode = {
  /** Fixed number of slots the mode writes for these opts. */
  slots(o: OrbOpts): number
  frame(size: number, t: number, o: OrbOpts, sink: OrbSink, view: OrbView): void
}
