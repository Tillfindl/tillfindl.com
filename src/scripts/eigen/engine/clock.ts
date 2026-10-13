/**
 * The single engine clock. Every visual (particles, lines, overlays, video,
 * story progress) is a pure function of `clock.t`, so pausing here freezes
 * everything in one place.
 *
 * Pausing is reference-counted by reason ('hold', 'hidden', 'debug', ...)
 * so a finger hold and a backgrounded app can't un-pause each other.
 */
export class Clock {
  /** Engine time in seconds. */
  t = 0
  /** Slow-mo / fast-forward multiplier. */
  timeScale = 1
  /** Largest dt (s) a single tick may advance, so a stalled tab doesn't jump. */
  maxStep = 0.1

  private holds = new Set<string>()
  private lastNow = -1
  private listeners = new Set<(paused: boolean) => void>()

  get paused(): boolean {
    return this.holds.size > 0
  }

  isHeld(reason: string): boolean {
    return this.holds.has(reason)
  }

  hold(reason = 'hold'): void {
    const was = this.paused
    this.holds.add(reason)
    if (!was) this.emit()
  }

  release(reason = 'hold'): void {
    const was = this.paused
    this.holds.delete(reason)
    if (was && !this.paused) this.emit()
  }

  toggle(reason = 'debug'): void {
    if (this.holds.has(reason)) this.release(reason)
    else this.hold(reason)
  }

  /** Advance from a rAF timestamp (ms). Returns the engine-time delta applied. */
  tick(nowMs: number): number {
    if (this.lastNow < 0) {
      this.lastNow = nowMs
      return 0
    }
    const dt = Math.min(this.maxStep, Math.max(0, (nowMs - this.lastNow) / 1000))
    this.lastNow = nowMs
    if (this.paused) return 0
    const d = dt * this.timeScale
    this.t += d
    return d
  }

  seek(t: number): void {
    this.t = Math.max(0, t)
  }

  step(dt: number): void {
    this.seek(this.t + dt)
  }

  onPauseChange(fn: (paused: boolean) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.paused)
  }
}

/** Hold the clock while the page is hidden (app backgrounded). Returns a disposer. */
export function pauseWhenHidden(clock: Clock): () => void {
  const onVis = () => {
    if (document.visibilityState === 'hidden') clock.hold('hidden')
    else clock.release('hidden')
  }
  document.addEventListener('visibilitychange', onVis)
  onVis()
  return () => document.removeEventListener('visibilitychange', onVis)
}
