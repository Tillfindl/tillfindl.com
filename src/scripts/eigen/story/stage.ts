/**
 * What the foot scan's overlay needs from the story's stage: its size, where its visual centre is,
 * and the 2D overlay it draws the phone and the measurements on (ported from eigen-motion, where it
 * is shared by every act of the onboarding).
 */
import type { Clock } from '../engine'

export interface Stage {
  clock: Clock
  /** Stage size, CSS px. */
  width: number
  height: number
  /** The visuals' centre, CSS px from the top. */
  centerY: number
  /** Layout size for the orbs (the same number the engine's orb states get). */
  orb: number
  /** 2D overlay, already scaled for the device pixel ratio (draw in CSS px). */
  overlay: CanvasRenderingContext2D
}

/** Screen position (CSS px, from the stage's top left) of engine view-space x, y. */
export function toScreen(s: Stage, x: number, y: number): [number, number] {
  return [s.width / 2 + x, s.centerY - y]
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const outCubic = (a: number, b: number, x: number) => 1 - (1 - clamp01((x - a) / (b - a))) ** 3
