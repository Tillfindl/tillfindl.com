/**
 * Realistic line drawings of 3D objects (the real-world act, beats 1–3).
 * Separate from the particle engine: here things are solid forms drawn in
 * thin warm-white lines, like a technical illustration or a product archive.
 *
 * Every line comes from geometry (see shaders.ts): smooth outline curves
 * computed per triangle on the GPU, plus authored detail lines. Solids only
 * hide what's behind them. Everything comes in instanced batches: one
 * drawing, many copies, each with its own transform and presence (0..1).
 */
import * as THREE from 'three'
import { CONTOUR_VERT, DETAIL_VERT, LINE_FRAG, SOLID_FRAG, SOLID_VERT } from './shaders'

export interface Polyline {
  /** xyz per point. */
  pts: number[]
  /** CSS px. Default 1. */
  width?: number
  /** 0..1. Default 1. */
  ink?: number
  closed?: boolean
}

export interface Drawing {
  /** Solid surfaces with smooth normals. Optional (details-only drawings). */
  solid?: THREE.BufferGeometry
  /** Draw the solid's outline curves. Default true when there is a solid. */
  contours?: boolean
  details: Polyline[]
}

export interface LineLook {
  background: string
  ink: string
  /** Distance (model units) where lines start fading, and where they're gone. */
  fogNear: number
  fogFar: number
  /** Outline width, CSS px, for an object at refDist through a 40° lens. */
  contourWidth: number
  refDist: number
  lineGain: number
  /** Fade bands at the screen edges: top, bottom, sides (fractions; 0 = none). */
  edgeFade: [number, number, number]
}

const DEFAULT_LOOK: LineLook = {
  background: '#0B0C0D',
  ink: '#EAEAEA',
  fogNear: 1500,
  fogFar: 7000,
  contourWidth: 2,
  refDist: 1500,
  lineGain: 0.95,
  edgeFade: [0.1, 0.2, 0],
}

export class LineRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  look: LineLook
  readonly uniforms: Record<string, THREE.IUniform>
  readonly solidMaterial: THREE.ShaderMaterial
  readonly contourMaterial: THREE.ShaderMaterial
  readonly detailMaterial: THREE.ShaderMaterial
  private pixelRatio: number
  width = 1
  height = 1

  constructor(canvas: HTMLCanvasElement, look: Partial<LineLook> = {}, pixelRatio = Math.min(2, window.devicePixelRatio || 1)) {
    THREE.ColorManagement.enabled = false
    this.look = { ...DEFAULT_LOOK, ...look }
    this.pixelRatio = pixelRatio
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(pixelRatio)
    const bg = new THREE.Color(this.look.background), ink = new THREE.Color(this.look.ink)
    this.renderer.setClearColor(bg, 1)
    this.uniforms = {
      uBg: { value: new THREE.Vector3(bg.r, bg.g, bg.b) },
      uInk: { value: new THREE.Vector3(ink.r, ink.g, ink.b) },
      uFogNear: { value: this.look.fogNear },
      uFogFar: { value: this.look.fogFar },
      uLineGain: { value: this.look.lineGain },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: pixelRatio },
      uRefK: { value: this.look.refDist * Math.tan(THREE.MathUtils.degToRad(20)) },
      uWidth: { value: this.look.contourWidth },
      uEdgeFade: { value: new THREE.Vector4(...this.look.edgeFade, 0) },
    }
    this.solidMaterial = this.material(SOLID_VERT, SOLID_FRAG, false)
    this.contourMaterial = this.material(CONTOUR_VERT, LINE_FRAG, true)
    this.detailMaterial = this.material(DETAIL_VERT, LINE_FRAG, true)
    const r = canvas.getBoundingClientRect()
    this.resize(r.width || 1, r.height || 1)
  }

  /** A material sharing the renderer's uniforms, with its own presence. */
  material(vert: string, frag: string, line: boolean): THREE.ShaderMaterial {
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { ...this.uniforms, uPresence: { value: 1 } },
      side: THREE.DoubleSide,
    })
    if (line) {
      // Drawn after solids. Ink on paper darkens, so MIN blending (darken) keeps
      // overlaps from adding up, as MAX did for light lines on the dark.
      m.transparent = true
      m.depthWrite = false
      m.depthTest = true
      m.blending = THREE.CustomBlending
      m.blendEquation = THREE.MinEquation
    } else {
      // Pushed back so lines lying on the surface (and outlines, where the
      // surface is steep) always pass the depth test.
      m.polygonOffset = true
      m.polygonOffsetFactor = 2.5
      m.polygonOffsetUnits = 4
    }
    return m
  }

  setLook(look: Partial<LineLook>): void {
    Object.assign(this.look, look)
    const u = this.uniforms
    u.uFogNear.value = this.look.fogNear
    u.uFogFar.value = this.look.fogFar
    u.uLineGain.value = this.look.lineGain
    u.uWidth.value = this.look.contourWidth
    u.uRefK.value = this.look.refDist * Math.tan(THREE.MathUtils.degToRad(20))
    ;(u.uEdgeFade.value as THREE.Vector4).set(...this.look.edgeFade, 0)
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.renderer.setSize(this.width, this.height, false)
    ;(this.uniforms.uResolution.value as THREE.Vector2).set(Math.round(this.width * this.pixelRatio), Math.round(this.height * this.pixelRatio))
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera)
  }

  dispose(): void {
    this.renderer.dispose()
  }
}

// ------------------------------------------------------------------ geometry

/** Screen-space line quads for polylines (4 vertices per segment). */
export function detailGeometry(lines: Polyline[]): THREE.BufferGeometry {
  const start: number[] = [], end: number[] = [], corner: number[] = [], style: number[] = [], index: number[] = []
  let v = 0
  for (const l of lines) {
    const w = l.width ?? 1, ink = l.ink ?? 1
    const P = l.pts
    const n = P.length / 3
    const segs = l.closed ? n : n - 1
    for (let i = 0; i < segs; i++) {
      const a = i * 3, b = ((i + 1) % n) * 3
      for (const [side, which] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) {
        start.push(P[a], P[a + 1], P[a + 2])
        end.push(P[b], P[b + 1], P[b + 2])
        corner.push(side, which)
        style.push(w, ink)
      }
      index.push(v, v + 1, v + 2, v + 2, v + 1, v + 3)
      v += 4
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(start, 3))
  g.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 3))
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2))
  g.setAttribute('aStyle', new THREE.Float32BufferAttribute(style, 2))
  g.setIndex(index)
  return g
}

/** One quad per triangle carrying the triangle's corners and normals, for contour extraction. */
export function contourGeometry(solid: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = solid.getAttribute('position'), nrm = solid.getAttribute('normal')
  const idx = solid.index
  const tris = (idx ? idx.count : pos.count) / 3
  const P = [new Float32Array(tris * 12), new Float32Array(tris * 12), new Float32Array(tris * 12)]
  const N = [new Float32Array(tris * 12), new Float32Array(tris * 12), new Float32Array(tris * 12)]
  const corner = new Float32Array(tris * 8)
  const index = new Uint32Array(tris * 6)
  const C = [-1, 0, 1, 0, -1, 1, 1, 1]
  for (let t = 0; t < tris; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k
      for (let q = 0; q < 4; q++) {
        const o = (t * 4 + q) * 3
        P[k][o] = pos.getX(vi); P[k][o + 1] = pos.getY(vi); P[k][o + 2] = pos.getZ(vi)
        N[k][o] = nrm.getX(vi); N[k][o + 1] = nrm.getY(vi); N[k][o + 2] = nrm.getZ(vi)
      }
    }
    corner.set(C, t * 8)
    const v = t * 4
    index.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], t * 6)
  }
  const g = new THREE.BufferGeometry()
  // `position` is required by three; the shader uses the per-corner attributes.
  g.setAttribute('position', new THREE.BufferAttribute(P[0], 3))
  for (let k = 0; k < 3; k++) {
    g.setAttribute(`aP${k}`, new THREE.BufferAttribute(P[k], 3))
    g.setAttribute(`aN${k}`, new THREE.BufferAttribute(N[k], 3))
  }
  g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2))
  g.setIndex(new THREE.BufferAttribute(index, 1))
  return g
}

// ------------------------------------------------------------------ batches

/**
 * One drawing, many copies: begin(), add(matrix, presence) per copy,
 * commit(). Solid, contours and details share the instance data.
 */
export class Batch {
  private meshes: THREE.InstancedMesh[] = []
  private matrices: THREE.InstancedBufferAttribute
  private presence: THREE.InstancedBufferAttribute
  count = 0

  constructor(r: LineRenderer, drawing: Drawing, readonly capacity: number) {
    this.matrices = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 16), 16)
    this.matrices.setUsage(THREE.DynamicDrawUsage)
    this.presence = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
    this.presence.setUsage(THREE.DynamicDrawUsage)
    const add = (g: THREE.BufferGeometry, m: THREE.ShaderMaterial, order: number) => {
      g.setAttribute('aPresence', this.presence)
      const mesh = new THREE.InstancedMesh(g, m, capacity)
      mesh.instanceMatrix = this.matrices
      mesh.frustumCulled = false
      mesh.count = 0
      mesh.renderOrder = order
      r.scene.add(mesh)
      this.meshes.push(mesh)
    }
    if (drawing.solid) {
      add(drawing.solid.clone(), r.solidMaterial, 0)
      if (drawing.contours !== false) add(contourGeometry(drawing.solid), r.contourMaterial, 1)
    }
    if (drawing.details.length) add(detailGeometry(drawing.details), r.detailMaterial, 1)
  }

  begin(): void {
    this.count = 0
  }

  add(matrix: THREE.Matrix4, presence = 1): void {
    if (this.count >= this.capacity || presence <= 0.004) return
    matrix.toArray(this.matrices.array as Float32Array, this.count * 16)
    this.presence.setX(this.count, presence)
    this.count++
  }

  commit(): void {
    for (const m of this.meshes) m.count = this.count
    this.matrices.needsUpdate = true
    this.presence.needsUpdate = true
  }
}

/**
 * Lines rebuilt every frame (the legs' outlines): preallocated, filled with
 * seg(), drawn with the detail shader.
 */
export class DynamicLines {
  readonly mesh: THREE.Mesh
  private start: Float32Array
  private end: Float32Array
  private style: Float32Array
  private n = 0

  constructor(r: LineRenderer, readonly capacity: number) {
    const g = new THREE.BufferGeometry()
    this.start = new Float32Array(capacity * 12)
    this.end = new Float32Array(capacity * 12)
    this.style = new Float32Array(capacity * 8)
    const corner = new Float32Array(capacity * 8)
    const index = new Uint32Array(capacity * 6)
    for (let i = 0; i < capacity; i++) {
      corner.set([-1, 0, 1, 0, -1, 1, 1, 1], i * 8)
      const v = i * 4
      index.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6)
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.start, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aEnd', new THREE.BufferAttribute(this.end, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aStyle', new THREE.BufferAttribute(this.style, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2))
    g.setIndex(new THREE.BufferAttribute(index, 1))
    this.mesh = new THREE.Mesh(g, r.material(DETAIL_VERT, LINE_FRAG, true))
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 1
    r.scene.add(this.mesh)
  }

  begin(): void {
    this.n = 0
  }

  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number, width: number, ink: number): void {
    if (this.n >= this.capacity || ink <= 0.004) return
    const o = this.n * 12, s = this.n * 8
    for (let q = 0; q < 4; q++) {
      this.start[o + q * 3] = ax; this.start[o + q * 3 + 1] = ay; this.start[o + q * 3 + 2] = az
      this.end[o + q * 3] = bx; this.end[o + q * 3 + 1] = by; this.end[o + q * 3 + 2] = bz
      this.style[s + q * 2] = width; this.style[s + q * 2 + 1] = ink
    }
    this.n++
  }

  commit(): void {
    const g = this.mesh.geometry
    g.setDrawRange(0, this.n * 6)
    for (const k of ['position', 'aEnd', 'aStyle']) {
      const a = g.getAttribute(k) as THREE.BufferAttribute
      a.clearUpdateRanges()
      a.addUpdateRange(0, Math.max(1, this.n * (k === 'aStyle' ? 8 : 12)))
      a.needsUpdate = true
    }
  }
}
