/**
 * The face's, the mask's and the foot's point clouds (EGPC, engine/pointcloud.ts), served from public/eigen and fetched once,
 * only when the Eigen scene comes near.
 */
import { decodePointCloud, type PointCloud } from '../engine'

const CLOUDS = {
  face: '/eigen/face.bin',
  cpap: '/eigen/cpap.bin',
  foot: '/eigen/foot.bin',
  'foot-lo': '/eigen/foot-lo.bin',
  'foot-skeleton': '/eigen/foot-skeleton.bin',
} as const

export type CloudName = keyof typeof CLOUDS

const bytes = new Map<string, Promise<ArrayBuffer>>()
function fetchBytes(url: string): Promise<ArrayBuffer> {
  let p = bytes.get(url)
  // The self-contained preview (tools/preview.mjs) carries the files inline, base64 by file name.
  const inline = (window as { __EIGEN_ASSETS?: Record<string, string> }).__EIGEN_ASSETS?.[url.split('/').pop()!]
  if (!p && inline) {
    const raw = atob(inline)
    const out = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
    p = Promise.resolve(out.buffer)
    bytes.set(url, p)
  }
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`eigen: ${url} → HTTP ${r.status}`)
      return r.arrayBuffer()
    })
    bytes.set(url, p)
  }
  return p
}

export async function cloud(name: CloudName): Promise<PointCloud> {
  return decodePointCloud((await fetchBytes(CLOUDS[name])).slice(0))
}
