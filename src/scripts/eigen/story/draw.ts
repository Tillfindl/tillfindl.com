/**
 * Overlay drawing (2D canvas, CSS px): measurement lines are thin pen-blue
 * strokes with small numerals. Particles are geometry; lines are
 * measurements.
 */
/** The site's ballpoint blue. */
export const INK = '47,51,148'
export const FONT = "'Inter Variable', Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif"

export type P2 = [number, number]

/** Counts what was actually drawn this frame (the host hides an empty overlay). */
export const overlayStats = { drawn: 0 }

export function stroke(ctx: CanvasRenderingContext2D, pts: P2[], alpha: number, width = 1, closed = false, dash?: number[]): void {
  if (alpha <= 0.003 || pts.length < 2) return
  overlayStats.drawn++
  ctx.save()
  ctx.strokeStyle = `rgba(${INK},${Math.min(1, alpha)})`
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  if (closed) ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.003) return
  overlayStats.drawn++
  ctx.fillStyle = `rgba(${INK},${Math.min(1, alpha)})`
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, width = 1): void {
  if (alpha <= 0.003) return
  overlayStats.drawn++
  ctx.strokeStyle = `rgba(${INK},${Math.min(1, alpha)})`
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  alpha: number,
  o: { size?: number; weight?: number; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; spacing?: number; halo?: boolean; font?: string } = {},
): void {
  if (alpha <= 0.003) return
  overlayStats.drawn++
  ctx.save()
  ctx.fillStyle = `rgba(${INK},${Math.min(1, alpha)})`
  ctx.font = `${o.weight ?? 500} ${o.size ?? 12}px ${o.font ?? FONT}`
  ctx.textAlign = o.align ?? 'center'
  ctx.textBaseline = o.baseline ?? 'middle'
  // Tabular numerals so live values don't jitter.
  ;(ctx as CanvasRenderingContext2D & { fontVariantNumeric?: string }).fontVariantNumeric = 'tabular-nums'
  if (o.spacing != null) (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${o.spacing}px`
  if (o.halo !== false) {
    // A soft background edge so numerals stay legible over dots and lines.
    ctx.strokeStyle = `rgba(240,240,237,${Math.min(0.9, alpha)})`
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeText(text, x, y)
  }
  ctx.fillText(text, x, y)
  ctx.restore()
}

const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/**
 * A dimension: witness ticks at both ends and the measured line between,
 * growing out from its middle as `grow` goes 0 → 1.
 */
export function dimension(ctx: CanvasRenderingContext2D, a: P2, b: P2, grow: number, alpha: number, tick = 5): void {
  if (grow <= 0 || alpha <= 0.003) return
  const m = mix(a, b, 0.5)
  const A = mix(m, a, grow), B = mix(m, b, grow)
  stroke(ctx, [A, B], alpha, 1)
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L, ny = dx / L
  if (grow > 0.98) {
    for (const p of [a, b]) stroke(ctx, [[p[0] - nx * tick, p[1] - ny * tick], [p[0] + nx * tick, p[1] + ny * tick]], alpha, 1)
  }
}

export { mix }
