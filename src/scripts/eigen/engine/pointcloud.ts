/**
 * Point-cloud binary format (.bin), written by tools/sample.ts and loaded
 * by the engine. Little-endian:
 *
 *   0  u32  magic 'EGPC' (0x43504745)
 *   4  u32  version (1)
 *   8  u32  count
 *  12  u32  flags (bit 0: normals, bit 1: tone)
 *  16  f32×6 bounds min xyz, max xyz (source units, e.g. mm)
 *  40  f32×3·count positions
 *      f32×3·count normals (if flagged)
 *      f32×count   tone 0..1 (if flagged): how lit the source was there
 */

export interface PointCloud {
  count: number
  positions: Float32Array
  normals?: Float32Array
  /** Per point 0..1; scales ink, alpha and radius. */
  tone?: Float32Array
  min: [number, number, number]
  max: [number, number, number]
}

const MAGIC = 0x43504745
const HEADER = 40

export function encodePointCloud(pc: PointCloud): ArrayBuffer {
  const n = pc.count
  const hasN = !!pc.normals
  const hasT = !!pc.tone
  const buf = new ArrayBuffer(HEADER + n * 12 * (hasN ? 2 : 1) + (hasT ? n * 4 : 0))
  const dv = new DataView(buf)
  dv.setUint32(0, MAGIC, true)
  dv.setUint32(4, 1, true)
  dv.setUint32(8, n, true)
  dv.setUint32(12, (hasN ? 1 : 0) | (hasT ? 2 : 0), true)
  for (let k = 0; k < 3; k++) {
    dv.setFloat32(16 + k * 4, pc.min[k], true)
    dv.setFloat32(28 + k * 4, pc.max[k], true)
  }
  new Float32Array(buf, HEADER, n * 3).set(pc.positions.subarray(0, n * 3))
  if (hasN) new Float32Array(buf, HEADER + n * 12, n * 3).set(pc.normals!.subarray(0, n * 3))
  if (hasT) new Float32Array(buf, HEADER + n * 12 * (hasN ? 2 : 1), n).set(pc.tone!.subarray(0, n))
  return buf
}

export function decodePointCloud(buf: ArrayBuffer): PointCloud {
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('eigen-motion: not an EGPC point cloud')
  const version = dv.getUint32(4, true)
  if (version !== 1) throw new Error(`eigen-motion: unsupported point cloud version ${version}`)
  const count = dv.getUint32(8, true)
  const flags = dv.getUint32(12, true)
  const hasN = (flags & 1) === 1
  const hasT = (flags & 2) === 2
  const min: [number, number, number] = [dv.getFloat32(16, true), dv.getFloat32(20, true), dv.getFloat32(24, true)]
  const max: [number, number, number] = [dv.getFloat32(28, true), dv.getFloat32(32, true), dv.getFloat32(36, true)]
  // Copy so the arrays are 4-byte aligned regardless of how the buffer was sliced.
  const positions = new Float32Array(buf.slice(HEADER, HEADER + count * 12))
  const normals = hasN ? new Float32Array(buf.slice(HEADER + count * 12, HEADER + count * 24)) : undefined
  const t0 = HEADER + count * 12 * (hasN ? 2 : 1)
  const tone = hasT ? new Float32Array(buf.slice(t0, t0 + count * 4)) : undefined
  return { count, positions, normals, tone, min, max }
}

export async function loadPointCloud(url: string): Promise<PointCloud> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`eigen-motion: ${url} → HTTP ${res.status}`)
  return decodePointCloud(await res.arrayBuffer())
}
