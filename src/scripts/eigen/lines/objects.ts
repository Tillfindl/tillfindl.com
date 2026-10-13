/**
 * The other things in the real-world act, drawn in the same line style:
 * the treadmill (with a moving belt) and the catalogue card.
 *
 * Units mm, +y up. The treadmill runs along x (the runner faces +x).
 */
import * as THREE from 'three'
import type { Drawing, Polyline } from './LineRenderer'

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return g
}

/** The twelve edges of a box (the depth test hides the ones at the back). */
function boxEdges(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, width = 1.1, ink = 0.85): Polyline[] {
  const out: Polyline[] = []
  const e = 0.4
  const X = [x0 - e, x1 + e], Y = [y0 - e, y1 + e], Z = [z0 - e, z1 + e]
  for (const y of Y) for (const z of Z) out.push({ pts: [X[0], y, z, X[1], y, z], width, ink })
  for (const x of X) for (const z of Z) out.push({ pts: [x, Y[0], z, x, Y[1], z], width, ink })
  for (const x of X) for (const y of Y) out.push({ pts: [x, y, Z[0], x, y, Z[1]], width, ink })
  return out
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
    for (let i = 0; i < g.index!.count; i++) idx.push(g.index!.getX(i) + off)
    off += p.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  out.setIndex(idx)
  return out
}

// ------------------------------------------------------------------ treadmill

export const BELT = { x0: -1300, x1: 1100, half: 250 }

/** Deck, belt, side rails and frame, drawn by their edges. */
export function treadmillDrawing(): Drawing {
  const { x0, x1, half } = BELT
  const parts: [number, number, number, number, number, number][] = [
    [x0, x1, -70, 0, -half, half], // deck; the belt is its top face
    [x0, x1, -70, 9, half, half + 75], // side rails, a touch above the belt
    [x0, x1, -70, 9, -half - 75, -half],
    [x0 + 40, x1 - 40, -135, -70, -half - 60, half + 60], // frame, set back
  ]
  const details: Polyline[] = []
  for (const p of parts) details.push(...boxEdges(...p))
  return { solid: merge(parts.map((p) => box(...p))), contours: false, details }
}

/** One belt slat line, instanced along the belt. */
export function slatDrawing(): Drawing {
  return { details: [{ pts: [0, 0.6, -BELT.half + 8, 0, 0.6, BELT.half - 8], width: 0.8, ink: 0.35 }] }
}

// ------------------------------------------------------------------ catalogue card

export const TILE = { w: 380, h: 320 }

/** A product card: a thin rounded frame and two short lines for name and price. */
export function tileDrawing(): Drawing {
  const { w, h } = TILE
  const r = 18
  const frame: number[] = []
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (Math.PI / 2) * (i / 8)
      frame.push(cx + r * Math.cos(a), cy + r * Math.sin(a), 0)
    }
  }
  corner(w / 2 - r, h / 2 - r, 0)
  corner(-w / 2 + r, h / 2 - r, Math.PI / 2)
  corner(-w / 2 + r, -h / 2 + r, Math.PI)
  corner(w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2)
  return {
    details: [
      { pts: frame, width: 1, ink: 0.45, closed: true },
      { pts: [-w / 2 + 26, -h / 2 + 56, 0, -w / 2 + 176, -h / 2 + 56, 0], width: 1.6, ink: 0.5 },
      { pts: [-w / 2 + 26, -h / 2 + 32, 0, -w / 2 + 92, -h / 2 + 32, 0], width: 1.6, ink: 0.32 },
    ],
  }
}
