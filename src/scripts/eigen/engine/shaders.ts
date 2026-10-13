import { MORPH_GLSL } from './morph'

/**
 * Points: one draw call for every particle. Depth is carried by radius and
 * ink/alpha computed per state (the Thinking Orbs trick), not by lighting.
 * Dots are anti-aliased discs sized in CSS px, blended in sRGB space with
 * source-over, which is what a 2D canvas does. On the site they are pen ink on
 * paper, so a dimmer dot is a fainter one.
 */
export const POINTS_VERT = /* glsl */ `
attribute float aSeed;
attribute vec3 aFromPos;
attribute vec3 aFromLook;
attribute vec3 aToLook;

uniform float uPixelRatio;
uniform vec2 uResolution; // device px
uniform vec3 uInk;

varying vec4 vColor;
varying vec2 vCenter;  // device px, window coordinates
varying float vRadius; // device px

${MORPH_GLSL}

void main() {
  float p = particleProgress(aSeed, aFromPos);
  vec3 pos = morphPosition(aFromPos, position, p, aSeed);
  vec3 look = mix(aFromLook, aToLook, p);

  vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_Position = clip;
  vCenter = (clip.xy / clip.w * 0.5 + 0.5) * uResolution;
  vRadius = max(look.x, 0.0) * uPixelRatio;
  // Sprite covers every pixel whose square can touch the disc.
  gl_PointSize = 2.0 * vRadius + 3.0;

  float a = look.z < 0.02 ? 0.0 : look.z;
  // On paper a dot's brightness is how much ink it carries: its opacity, not a darker colour.
  vColor = vec4(uInk, a * clamp(look.y, 0.0, 1.0));
}
`

/**
 * Coverage is the area of the pixel square inside the disc: exact across
 * each of 8 sub-rows, and only computed for edge pixels. This is what CPU
 * canvas rasterisers (Skia, CoreGraphics) approximate, and it keeps tiny
 * dots (under a device pixel) at their true ink weight.
 */
export const POINTS_FRAG = /* glsl */ `
varying vec4 vColor;
varying vec2 vCenter;
varying float vRadius;

float discCoverage(vec2 q, float r) {
  float d = length(q);
  if (d <= r - 0.7072) return 1.0;
  if (d >= r + 0.7072) return 0.0;
  float acc = 0.0;
  float r2 = r * r;
  for (int k = 0; k < 8; k++) {
    float y = q.y - 0.5 + (float(k) + 0.5) * 0.125;
    float h2 = r2 - y * y;
    if (h2 > 0.0) {
      float h = sqrt(h2);
      acc += clamp(min(q.x + 0.5, h) - max(q.x - 0.5, -h), 0.0, 1.0);
    }
  }
  return acc * 0.125;
}

void main() {
  float a = vColor.a * discCoverage(gl_FragCoord.xy - vCenter, vRadius);
  if (a <= 0.001) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}
`

/**
 * Lines: screen-space quads with analytic AA, so widths below 1 CSS px
 * (the orb's constellation edges are 0.6-0.8 px) render like canvas strokes.
 * Endpoints arrive already morphed from the CPU.
 */
export const LINES_VERT = /* glsl */ `
attribute vec3 aEnd;
attribute vec2 aCorner; // x: side (-1 / 1), y: which endpoint (0 / 1)
attribute vec3 aLook;   // width (CSS px), ink, alpha

uniform float uPixelRatio;
uniform vec2 uResolution; // device px
uniform vec3 uInk;

varying vec4 vColor;
varying float vDist;
varying float vHalf;

void main() {
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
  vec2 halfRes = uResolution * 0.5;
  vec2 d = (c1.xy - c0.xy) * halfRes;
  float len = length(d);
  vec2 n = len > 1e-6 ? vec2(-d.y, d.x) / len : vec2(0.0, 1.0);

  float w = aLook.x * uPixelRatio;
  float h = max(w, 1.0) * 0.5;
  float cover = min(1.0, w);
  float ext = h + 1.0;

  vec4 c = mix(c0, c1, aCorner.y);
  c.xy += n * aCorner.x * ext / halfRes;
  gl_Position = c;

  vDist = aCorner.x * ext;
  vHalf = h;
  float a = aLook.z < 0.02 ? 0.0 : aLook.z;
  vColor = vec4(uInk, a * cover * clamp(aLook.y, 0.0, 1.0));
}
`

export const LINES_FRAG = /* glsl */ `
varying vec4 vColor;
varying float vDist;
varying float vHalf;

void main() {
  float cov = clamp(vHalf - abs(vDist) + 0.5, 0.0, 1.0);
  float a = vColor.a * cov;
  if (a <= 0.001) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}
`
