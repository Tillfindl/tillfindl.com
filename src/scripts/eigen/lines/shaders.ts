/**
 * Shaders for the line-drawing renderer (see LineRenderer.ts).
 *
 * Lines come from geometry, not from pixels, so they are smooth and hold
 * still while things move:
 *  - Solids draw in the background colour, writing depth (pushed back a
 *    little with polygon offset) so lines behind them are hidden.
 *  - Contours: for every triangle, the vertex shader finds where the
 *    surface turns away from the eye (n · v = 0, interpolated across the
 *    triangle) and draws that short segment as an anti-aliased quad. Put
 *    together they are smooth outline curves, recomputed on the GPU per
 *    frame, per instance.
 *  - Details (seams, edges of flat faces, the belt slats) are authored
 *    polylines drawn the same way.
 * All lines are round-capped capsules composited with a MIN blend (a
 * "darken", for pen ink on paper), so where segments meet or cross nothing
 * gets darker. They
 * fade with distance and towards the screen edges.
 */

const INSTANCE = /* glsl */ `
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = m * instanceMatrix;
  #endif
  mat4 mv = viewMatrix * m;
  float presence = uPresence;
  #ifdef USE_INSTANCING
    presence *= aPresence;
  #endif
`

/** Screen-space capsule for a segment a–b (view space), shared by contours and details. */
const QUAD = /* glsl */ `
uniform float uPixelRatio;
uniform vec2 uResolution;
uniform float uRefK;
varying vec2 vSeg;   // (along, across) in device px, relative to the segment
varying float vLen;  // segment length, device px
varying float vHalf;
varying float vInk;
varying float vViewZ;

void emitQuad(vec3 a, vec3 b, vec2 corner, float widthCss, float ink) {
  vec4 c0 = projectionMatrix * vec4(a, 1.0);
  vec4 c1 = projectionMatrix * vec4(b, 1.0);
  vec2 halfRes = uResolution * 0.5;
  vec2 s0 = c0.xy / c0.w, s1 = c1.xy / c1.w;
  vec2 d = (s1 - s0) * halfRes;
  float len = length(d);
  vec2 dir = len > 1e-5 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  vec3 p = corner.y < 0.5 ? a : b;
  // Width follows the object's size on screen (distance and lens), gently.
  float scale = uRefK * projectionMatrix[1][1] / max(1.0, -p.z);
  float w = widthCss * clamp(pow(scale, 0.4), 0.65, 1.25) * uPixelRatio;
  float h = max(w, 1.0) * 0.5;
  float ext = h + 1.0;
  vec4 c = corner.y < 0.5 ? c0 : c1;
  float along = corner.y < 0.5 ? -ext : ext;
  c.xy += (n * corner.x * ext + dir * along) / halfRes * c.w;
  gl_Position = c;
  vSeg = vec2(corner.y < 0.5 ? -ext : len + ext, corner.x * ext);
  vLen = len;
  vHalf = h;
  vInk = ink * min(1.0, w);
  vViewZ = -p.z;
}
`

export const SOLID_VERT = /* glsl */ `
attribute float aPresence;
uniform float uPresence;
void main() {
  ${INSTANCE}
  gl_Position = projectionMatrix * mv * vec4(position, 1.0);
}
`

export const SOLID_FRAG = /* glsl */ `
uniform vec3 uBg;
void main() {
  gl_FragColor = vec4(uBg, 1.0);
}
`

export const CONTOUR_VERT = /* glsl */ `
attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aN0;
attribute vec3 aN1;
attribute vec3 aN2;
attribute vec2 aCorner;
attribute float aPresence;
uniform float uPresence;
uniform float uWidth;
${QUAD}

void main() {
  ${INSTANCE}
  mat3 nm = mat3(mv);
  vec3 P0 = (mv * vec4(aP0, 1.0)).xyz;
  vec3 P1 = (mv * vec4(aP1, 1.0)).xyz;
  vec3 P2 = (mv * vec4(aP2, 1.0)).xyz;
  float d0 = dot(normalize(nm * aN0), normalize(-P0));
  float d1 = dot(normalize(nm * aN1), normalize(-P1));
  float d2 = dot(normalize(nm * aN2), normalize(-P2));
  vec3 A = vec3(0.0), B = vec3(0.0);
  float k = 0.0;
  if (d0 * d1 < 0.0) { A = mix(P0, P1, d0 / (d0 - d1)); k = 1.0; }
  if (d1 * d2 < 0.0) {
    vec3 X = mix(P1, P2, d1 / (d1 - d2));
    if (k < 0.5) A = X; else B = X;
    k += 1.0;
  }
  if (d2 * d0 < 0.0) {
    vec3 X = mix(P2, P0, d2 / (d2 - d0));
    if (k < 0.5) A = X; else B = X;
    k += 1.0;
  }
  if (k < 1.5 || presence < 0.004) {
    // No contour through this triangle: collapse the quad.
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    vSeg = vec2(0.0); vLen = 0.0; vHalf = 0.0; vInk = 0.0; vViewZ = 0.0;
    return;
  }
  emitQuad(A, B, aCorner, uWidth, presence);
}
`

export const DETAIL_VERT = /* glsl */ `
attribute vec3 aEnd;
attribute vec2 aCorner;
attribute vec2 aStyle; // width (CSS px), ink
attribute float aPresence;
uniform float uPresence;
${QUAD}

void main() {
  ${INSTANCE}
  vec3 a = (mv * vec4(position, 1.0)).xyz;
  vec3 b = (mv * vec4(aEnd, 1.0)).xyz;
  emitQuad(a, b, aCorner, aStyle.x, aStyle.y * presence);
}
`

export const LINE_FRAG = /* glsl */ `
uniform vec3 uInk;
uniform vec3 uBg;
uniform float uFogNear;
uniform float uFogFar;
uniform float uLineGain;
uniform vec2 uResolution;
uniform vec4 uEdgeFade; // top, bottom, left/right fade bands (fractions of the screen)
varying vec2 vSeg;
varying float vLen;
varying float vHalf;
varying float vInk;
varying float vViewZ;
void main() {
  // Distance to the segment (a capsule: round ends, so joints are seamless).
  float t = clamp(vSeg.x, 0.0, vLen);
  float dist = length(vec2(vSeg.x - t, vSeg.y));
  float cov = clamp(vHalf + 0.5 - dist, 0.0, 1.0);
  float f = 1.0 - smoothstep(uFogNear, uFogFar, vViewZ);
  // Lines soften towards the edges of the screen.
  vec2 q = gl_FragCoord.xy / uResolution;
  float edge = smoothstep(0.0, uEdgeFade.x, 1.0 - q.y) * smoothstep(0.0, uEdgeFade.y, q.y)
    * (uEdgeFade.z > 0.0 ? smoothstep(0.0, uEdgeFade.z, q.x) * smoothstep(0.0, uEdgeFade.z, 1.0 - q.x) : 1.0);
  float a = cov * vInk * f * edge * uLineGain;
  if (a < 0.003) discard;
  // Opaque "darken": overlapping ink lines never add up (blended with MIN).
  gl_FragColor = vec4(mix(uBg, uInk, a), 1.0);
}
`
