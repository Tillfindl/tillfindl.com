/**
 * Eigen's running store as a line drawing in any element, on repeat: legs running in their shoes on
 * a treadmill with a moving belt, five shoes in front of it. Ported from eigen-motion's kit, held
 * in the store beat, and drawn in pen on paper. It stops drawing while off screen or paused.
 */
import * as THREE from 'three'
import { Clock } from '../engine'
import { LineRenderer } from '../lines/LineRenderer'
import { RealWorld, TO_STORE, type Plan } from '../lines/scenes'

export interface LinesOptions {
  background: string
  ink: string
  /** Device pixels per CSS pixel to draw at. */
  pixelRatio?: number
}

export interface Lines {
  pause(): void
  play(): void
  destroy(): void
}

/** The store as it stands: the wall left long ago, the catalogue never reached. */
const STORE: Plan = { leave: -TO_STORE, morph: Infinity }

export function mountLines(el: HTMLElement, o: LinesOptions): Lines {
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  el.append(canvas)
  const lr = new LineRenderer(canvas, { background: o.background, ink: o.ink }, o.pixelRatio)
  const camera = new THREE.PerspectiveCamera(34, 1, 10, 20000)
  const world = new RealWorld(lr, camera)
  const clock = new Clock()
  // The canvas is opaque, so it is drawn at least once (and after a resize) even while paused,
  // never left blank.
  let drawn = false
  const resize = () => {
    const r = el.getBoundingClientRect()
    lr.resize(Math.max(1, r.width), Math.max(1, r.height))
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height)
    camera.updateProjectionMatrix()
    drawn = false
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(el)
  let visible = false
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) clock.release('offscreen')
    else clock.hold('offscreen')
  })
  io.observe(el)
  clock.hold('offscreen')
  let stopped = false
  const frame = (now: number) => {
    if (stopped) return
    clock.tick(now)
    if (visible && (!clock.paused || !drawn)) {
      world.frame(clock.t, STORE)
      lr.render(camera)
      drawn = true
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  return {
    pause: () => clock.hold('kit'),
    play: () => clock.release('kit'),
    destroy() {
      stopped = true
      ro.disconnect()
      io.disconnect()
      lr.dispose()
      canvas.remove()
    },
  }
}
