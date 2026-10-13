/**
 * Core types for the Eigen particle engine.
 *
 * Coordinate system: view space in CSS pixels, origin at the centre of the
 * stage, +x right, +y up, +z towards the viewer. The engine's orthographic
 * camera maps x/y straight to the screen; z only drives draw order.
 */

export type EaseName =
  | 'linear'
  | 'inCubic'
  | 'outCubic'
  | 'inOutCubic'
  | 'outQuart'
  | 'inOutQuart'
  | 'outExpo'
  | 'inOutExpo'
  | 'inOutSine'

export type StaggerMode = 'none' | 'seed' | 'radial' | 'axis'

export interface TransitionSpec {
  /** Seconds of engine-clock time. */
  duration: number
  ease: EaseName
  stagger: StaggerMode
  /** Fraction of the transition spent spreading start times (0..0.9). Default 0.35. */
  staggerAmount?: number
  /** Reverse the stagger order (outer-first for radial, far end first for axis). */
  staggerInvert?: boolean
  /** Axis for `stagger: 'axis'`, view space. Default [1, 0, 0]. */
  axis?: [number, number, number]
  /** Sideways swing of each particle's path, as a fraction of its travel. Default 0.12. */
  arc?: number
}

export type HapticType = 'light' | 'medium' | 'rigid' | 'success'

export interface HapticCue {
  /** Seconds after the state starts entering. */
  at: number
  type: HapticType
}

/**
 * Line segments between two particle slots. The engine resolves endpoints
 * from the particles' current (morphed) positions, so lines stay attached
 * to the geometry through transitions.
 */
export interface LineList {
  a: Uint16Array
  b: Uint16Array
  /** Per line: width (CSS px), ink (0..1), alpha. */
  look: Float32Array
  count: number
}

/**
 * The buffers a state writes into. `pos` and `look` are the engine's GPU
 * attribute arrays, so writing them is zero-copy.
 */
export interface StateFrame {
  readonly capacity: number
  /** xyz per slot, view space, CSS px. */
  pos: Float32Array
  /** Per slot: radius (CSS px), ink (0 = background, 1 = full ink), alpha. */
  look: Float32Array
  lines: LineList
}

/**
 * One state of the single particle system. Particles keep their slot index
 * across states, which is what makes a morph identity-preserving.
 *
 * This merges the gameplan's `targets | (t) => targets` and `idle(t)` into
 * one `evaluate(t)`: for the orb states the idle motion *is* the geometry,
 * so there is nothing to layer on top.
 */
export interface EngineState {
  readonly id: string
  /** Slots [0, count) are written by evaluate(); the engine parks the rest. */
  readonly count: number
  /** When true, evaluate() depends on t and runs every frame the state is visible. */
  readonly dynamic: boolean
  /** Pure function of engine time t (seconds). Must write slots [0, count). */
  evaluate(t: number, out: StateFrame): void
  /** Where unused particles rest, invisible. Default: a 2 px cluster at the origin. */
  park?: { center: [number, number, number]; radius: number }
  /** Amplitude (CSS px) of the shader's ambient drift. Orbs use 0. */
  drift?: number
  transitionIn: TransitionSpec
  /**
   * Applied on top of the target's transitionIn when morphing away from this
   * state (e.g. the logo dissolving edges-first whatever comes next).
   */
  transitionOut?: Partial<TransitionSpec>
  haptics?: HapticCue[]
}

export const DEFAULT_TRANSITION: TransitionSpec = {
  duration: 1.2,
  ease: 'inOutCubic',
  stagger: 'seed',
  staggerAmount: 0.35,
  arc: 0.12,
}
