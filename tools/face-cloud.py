"""Head scan → stippled point cloud (EGPC), plus a modelled full-face CPAP mask fitted to it.

    python3 tools/face-cloud.py LeePerrySmith.glb public/eigen 7500

The head is the three.js example scan (examples/models/gltf/LeePerrySmith/LeePerrySmith.glb, by
Lee Perry-Smith / Infinite Realities, CC BY 3.0; see ACKNOWLEDGEMENTS.md); it is not kept in the
repo. Needs numpy, scipy, trimesh and rtree. The slow steps (which surfaces can be seen, ambient
occlusion) are cached next to the output, so delete those .npy/.npz files after changing them.
Writes face.bin (the head, stippled by shading: more and darker dots where the form turns from the
light or folds in) and cpap.bin (cushion, shell, frame, elbow, hose, headgear), in the head's units.
"""
import sys, struct, numpy as np, trimesh

rng = np.random.default_rng(3)
src, out = sys.argv[1], sys.argv[2]
m = trimesh.load(src, force='mesh')

# ---------- the head, cropped below the chin, with a soft edge at the neck
NECK_CUT = -1.75
keep = m.triangles_center[:, 1] > NECK_CUT
m.update_faces(keep)
m.remove_unreferenced_vertices()
import os
VIS = f'{out}/visible.npy'
if os.path.exists(VIS):
    vis = np.load(VIS)
else:
    g = rng.normal(size=(48, 3)); g /= np.linalg.norm(g, axis=1, keepdims=True)
    cen = m.triangles_center; fn = m.face_normals
    vis = np.zeros(len(cen), bool)
    for d in g:
        sel = np.where((fn @ d > 0.1) & ~vis)[0]
        if not len(sel): continue
        hit = m.ray.intersects_any(cen[sel] + fn[sel] * 0.01, np.tile(d, (len(sel), 1)))
        vis[sel[~hit]] = True
    np.save(VIS, vis)
print('visible triangles', vis.sum(), 'of', len(vis))
m.update_faces(vis)
m.remove_unreferenced_vertices()
v, f, vn = m.vertices, m.faces, m.vertex_normals

# Ambient occlusion per vertex: how much of the hemisphere over it the head itself hides.
def ambient(nrays=40):
    dirs = rng.normal(size=(nrays, 3)); dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    occ = np.zeros(len(v))
    for d in dirs:
        facing = vn @ d
        sel = np.where(facing > 0.05)[0]
        o = v[sel] + vn[sel] * 0.01 + d * 0.005
        hit = m.ray.intersects_any(o, np.tile(d, (len(sel), 1)))
        occ[sel] += hit * facing[sel]
        # Normalise by the cosine-weighted hemisphere.
    norm = np.zeros(len(v))
    for d in dirs:
        norm += np.clip(vn @ d, 0, None)
    return 1 - occ / np.maximum(norm, 1e-6)

CACHE = f'{out}/face-cache.npz'
if os.path.exists(CACHE):
    c = np.load(CACHE); ao = c['ao']
else:
    ao = ambient(); np.savez(CACHE, ao=ao)
L = np.array([-0.45, 0.55, 0.7]); L /= np.linalg.norm(L)
lam = np.clip(vn @ L, 0, 1)
light = 0.5 * lam + 0.5 * ao ** 1.5
# Creases (the lip line, the eyelids, the nostrils, the folds beside the nose): where the surface
# folds in, from the Laplacian along the normal, relative to the local edge length.
nb = m.vertex_neighbors
lap = np.zeros(len(v)); el = np.zeros(len(v))
for i, ns in enumerate(nb):
    if not ns: continue
    q = v[ns]; lap[i] = ((q.mean(0) - v[i]) @ vn[i]); el[i] = np.linalg.norm(q - v[i], axis=1).mean()
crease = lap / np.maximum(el, 1e-6)
for _ in range(2):
    crease = np.array([crease[[i] + list(ns)].mean() if ns else crease[i] for i, ns in enumerate(nb)])
crease = np.clip(crease / np.percentile(np.abs(crease), 97), -1, 1)
dark_v = np.clip(1 - light + 0.55 * np.clip(crease, 0, 1) - 0.2 * np.clip(-crease, 0, 1), 0, 1)
# Fewer dots on the back of the head, which the face never turns far enough to show.
front_v = np.clip(vn[:, 2] + 0.45, 0.25, 1)
# Fade out towards the neck cut.
fade_v = np.clip((v[:, 1] - NECK_CUT) / 0.9, 0, 1) * front_v

tri = v[f]
area = 0.5 * np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
dark_f = dark_v[f].mean(1)
fade_f = fade_v[f].mean(1)
dens_f = (0.1 + 2.6 * dark_f ** 2.2) * (0.15 + 0.85 * fade_f)

def sample(weights, n):
    p = weights / weights.sum()
    idx = rng.choice(len(weights), size=n, p=p)
    r1, r2 = rng.random(n), rng.random(n)
    s = np.sqrt(r1)
    a, b, c = 1 - s, s * (1 - r2), s * r2
    t = tri[idx]
    pts = t[:, 0] * a[:, None] + t[:, 1] * b[:, None] + t[:, 2] * c[:, None]
    nn = vn[f[idx, 0]] * a[:, None] + vn[f[idx, 1]] * b[:, None] + vn[f[idx, 2]] * c[:, None]
    nn /= np.linalg.norm(nn, axis=1, keepdims=True)
    dk = dark_v[f[idx, 0]] * a + dark_v[f[idx, 1]] * b + dark_v[f[idx, 2]] * c
    fd = fade_v[f[idx, 0]] * a + fade_v[f[idx, 1]] * b + fade_v[f[idx, 2]] * c
    return pts, nn, dk, fd

def thin(pts, radius, target):
    """Dart throwing: keep a point only if no kept point lies within its radius (radius per point)."""
    from scipy.spatial import cKDTree
    order = rng.permutation(len(pts))
    tree = cKDTree(pts)
    taken = np.zeros(len(pts), bool); blocked = np.zeros(len(pts), bool)
    for i in order:
        if blocked[i]: continue
        taken[i] = True
        for j in tree.query_ball_point(pts[i], radius[i]):
            blocked[j] = True
    return np.where(taken)[0]

N_FACE = int(sys.argv[3]) if len(sys.argv) > 3 else 7000
FC = f'{out}/face-points-{N_FACE}.npz'
if os.path.exists(FC):
    c = np.load(FC); face_p, face_n, face_t = c['p'], c['n'], c['t']
else:
  cand, cn, cd, cf = sample(area * dens_f, N_FACE * 8)
  dens_c = (0.1 + 2.6 * cd ** 2.2) * (0.15 + 0.85 * cf)
  lo_r, hi_r = 0.005, 0.5
  for _ in range(18):
      r0 = (lo_r + hi_r) / 2
      k = thin(cand, r0 / np.sqrt(dens_c), N_FACE)
      if len(k) > N_FACE: lo_r = r0
      else: hi_r = r0
  k = k[:N_FACE]
  face_p, face_n = cand[k], cn[k]
  face_t = np.clip(0.3 + 0.7 * cd[k], 0, 1) * (0.4 + 0.6 * cf[k])
  np.savez(FC, p=face_p, n=face_n, t=face_t)
print('face points', len(face_p))

# ---------- landmarks (from the midline profile: nose tip, nasal bridge, lips, chin)
def surface_z(x, y):
    o = np.array([[x, y, 10.0]]); d = np.array([[0, 0, -1.0]])
    loc, _, tri_i = m.ray.intersects_location(o, d, multiple_hits=False)
    if not len(loc): return None, None
    return loc[0], m.face_normals[tri_i[0]]

# ---------- the CPAP mask (a full-face mask: nose and mouth), in head units (1 unit ≈ 48 mm)
parts = []   # (points, normals, tone)
def add(p, n, t):
    p = np.asarray(p, float); n = np.asarray(n, float)
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    parts.append((p, n, np.full(len(p), t) if np.isscalar(t) else np.asarray(t)))

# The cushion's seal on the face, seen from the front: a rounded pear, narrow over the nasal bridge,
# widest beside the mouth, round under the lower lip (like a modern full-face mask).
TOP, BOTTOM = 1.52, -0.1
def seal_xy(u):
    a = 2 * np.pi * u
    y = (TOP + BOTTOM) / 2 + (TOP - BOTTOM) / 2 * np.cos(a)
    yn = (TOP - y) / (TOP - BOTTOM)             # 0 top … 1 bottom
    half = 0.2 + 0.86 * np.sin(np.pi * np.clip(yn * 0.78 + 0.12, 0, 1)) ** 0.85
    sa = np.sin(a)
    x = half * np.sign(sa) * np.abs(sa) ** 0.75
    return x, y

NU = 200
U = np.linspace(0, 1, NU, endpoint=False)
rim, rim_n = [], []
for u in U:
    x, y = seal_xy(u)
    p, n = surface_z(x, y)
    rim.append(p); rim_n.append(n)
rim, rim_n = np.array(rim), np.array(rim_n)
def smooth_loop(a, k=6):
    out = a.copy()
    for _ in range(k):
        out = (np.roll(out, 1, 0) + 2 * out + np.roll(out, -1, 0)) / 4
    return out
rim = smooth_loop(rim, 6); rim_n = smooth_loop(rim_n, 10)
rim_n /= np.linalg.norm(rim_n, axis=1, keepdims=True)

# Cushion: a soft silicone tube on the rim, about 6 mm round.
R_CUSH = 0.12
cush_c = rim + rim_n * R_CUSH
tang = np.roll(cush_c, -1, 0) - np.roll(cush_c, 1, 0); tang /= np.linalg.norm(tang, axis=1, keepdims=True)
side = np.cross(tang, rim_n)
pts, nrm = [], []
for i in range(NU):
    for k, a in enumerate(np.linspace(0, 2 * np.pi, 6, endpoint=False)):
        d = np.cos(a + (i % 2) * 0.5) * rim_n[i] + np.sin(a + (i % 2) * 0.5) * side[i]
        pts.append(cush_c[i] + R_CUSH * d); nrm.append(d)
add(pts, nrm, 0.8)

# Shell: a clear dome from the cushion to the elbow port in front of the mouth and nose.
C = np.array([0.0, 0.62, 2.98])
lip = cush_c + rim_n * R_CUSH
def shell_at(u_i, s):
    R0 = lip[u_i % NU]
    Q = np.array([R0[0] * 0.95, R0[1] + (C[1] - R0[1]) * 0.15, C[2] - 0.1])
    return (1 - s) ** 2 * R0 + 2 * s * (1 - s) * Q + s ** 2 * C
cen_dome = np.array([0, 0.7, 1.7])
# Even, sparse dots over the dome (clear plastic), by dart throwing on candidates.
cand = np.array([shell_at(int(rng.integers(NU)), np.sqrt(rng.random()) * 0.92 + 0.04) for _ in range(9000)])
from scipy.spatial import cKDTree
keep = []
tree = None
taken = np.zeros(len(cand), bool); blocked = np.zeros(len(cand), bool)
tr = cKDTree(cand)
for i in range(len(cand)):
    if blocked[i]: continue
    taken[i] = True
    for j in tr.query_ball_point(cand[i], 0.075): blocked[j] = True
sh = cand[taken]
sh = sh[np.linalg.norm(sh[:, :2] - C[:2], axis=1) > 0.26]
add(sh, sh - cen_dome, 0.45)
# The frame: a firm band across the dome, two edge lines, and its arms out to the headgear clips.
for s_ in (0.2, 0.27):
    rr = np.array([shell_at(i, s_) for i in range(0, NU, 2)])
    add(rr, rr - cen_dome, 0.95)
# The port's collar round the elbow.
a_ = np.linspace(0, 2 * np.pi, 40, endpoint=False)
col = C + np.stack([0.27 * np.cos(a_), 0.27 * np.sin(a_), np.zeros_like(a_) - 0.04], 1)
add(col, col - cen_dome, 0.95)

# Tubes: rings of dots round a path.
def tube(path, radius, ring_every, per_ring, tone, twist=0.0):
    path = np.asarray(path)
    tg = np.gradient(path, axis=0); tg /= np.linalg.norm(tg, axis=1, keepdims=True)
    ref = np.array([1.0, 0, 0])
    acc, nn = [], []
    for k, i in enumerate(range(0, len(path), ring_every)):
        a1 = np.cross(tg[i], ref); a1 /= np.linalg.norm(a1); a2 = np.cross(tg[i], a1)
        for a in np.linspace(0, 2 * np.pi, per_ring, endpoint=False) + k * twist:
            d = np.cos(a) * a1 + np.sin(a) * a2
            acc.append(path[i] + radius * d); nn.append(d)
    add(acc, nn, tone)

# Elbow: out of the port, bending down; then the swivel, then the corrugated hose.
t = np.linspace(0, 1, 24)
ang = t * np.pi / 2
elbow = np.stack([np.zeros_like(t), C[1] - 0.4 * (1 - np.cos(ang)), C[2] + 0.4 * np.sin(ang)], 1)
tube(elbow, 0.19, 2, 14, 0.9, 0.2)
end = elbow[-1]
tube(np.array([end + [0, -0.03 * k, 0] for k in range(3)]), 0.23, 1, 18, 1.0)
t = np.linspace(0, 1, 90)
hose = np.stack([0.7 * t ** 1.6, end[1] - 0.12 - 2.7 * t, end[2] + 0.5 * np.sin(np.pi * t * 0.7)], 1)
tube(hose, 0.2, 3, 14, 0.62, 0.22)

# Headgear: straps from the frame's sides round the head, the lower ones below the ears to the nape,
# the upper ones over the cheekbones and above the ears to the crown.
def strap(clip_y, back, width, tone, cut_z):
    fr = np.array([shell_at(i, 0.23) for i in range(NU)])
    l = fr[np.argmin(np.abs(fr[:, 1] - clip_y) + (fr[:, 0] > 0) * 9)]
    r = fr[np.argmin(np.abs(fr[:, 1] - clip_y) + (fr[:, 0] < 0) * 9)]
    nplane = np.cross(r - l, back - l); nplane /= np.linalg.norm(nplane)
    sec = m.section(plane_origin=l, plane_normal=nplane)
    if sec is None:
        print('no section'); return
    pts = np.asarray(sec.vertices)
    pts = pts[pts[:, 2] < cut_z]
    cen = np.array([0.0, back[1], 0.1])
    ang = np.arctan2(pts[:, 0] - cen[0], -(pts[:, 2] - cen[2]))
    pts = pts[np.argsort(ang)]
    # Even spacing along the strap.
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    sam = np.arange(0, seg[-1], 0.07)
    pts = np.stack([np.interp(sam, seg, pts[:, k]) for k in range(3)], 1)
    od = pts - cen; od /= np.linalg.norm(od, axis=1, keepdims=True)
    acc, nn, tt = [], [], []
    for p_, o_ in zip(pts, od):
        q = p_ + o_ * 0.06
        for w, tn in ((-width / 2, tone), (width / 2, tone)):
            acc.append(q + nplane * w); nn.append(o_); tt.append(tn)
    add(acc, nn, np.array(tt))
    # The strap's run from the clip on the frame back to the skin.
    for c in (l, r):
        near = pts[np.argmin(np.linalg.norm(pts - c, axis=1))]
        for s_ in np.linspace(0, 1, 12):
            q = c + (near - c) * s_
            add([q + nplane * width / 2, q - nplane * width / 2], [c - cen_dome] * 2, tone)
    print('strap', len(pts))

strap(0.25, np.array([0, -0.4, -2.0]), 0.34, 0.75, 1.55)
strap(1.12, np.array([0, 2.55, -1.75]), 0.3, 0.75, 1.75)

mask_p = np.concatenate([p for p, _, _ in parts])
mask_n = np.concatenate([n for _, n, _ in parts])
mask_t = np.concatenate([t for _, _, t in parts])
print('mask points', len(mask_p))

def write(path, p, n, t):
    p = p.astype(np.float32); n = n.astype(np.float32); t = t.astype(np.float32)
    mn, mx = p.min(0), p.max(0)
    hdr = struct.pack('<4I6f', 0x43504745, 1, len(p), 3, *mn, *mx)
    with open(path, 'wb') as fh:
        fh.write(hdr); fh.write(p.tobytes()); fh.write(n.tobytes()); fh.write(t.tobytes())
write(f'{out}/face.bin', face_p, face_n, face_t)
write(f'{out}/cpap.bin', mask_p, mask_n, mask_t)
np.savez(f'{out}/cloud.npz', face_p=face_p, face_n=face_n, face_t=face_t, mask_p=mask_p, mask_n=mask_n, mask_t=mask_t)
