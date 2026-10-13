"""
Small MakeHuman toolkit: OBJ / target / mhclo / mhmat loading, proxy fitting,
skin-weight transfer and the binary bundle writer used by the avatar build.
All MakeHuman assets used here are CC0.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
MH = os.path.join(CACHE, 'mh')      # makehuman core data (base mesh, rig, targets)
MHA = os.path.join(CACHE, 'mha')    # makehuman system assets pack (skins, hair, clothes ...)
PH = os.path.join(CACHE, 'ph')      # poly haven fabrics + hdri
OUT = os.path.join(HERE, '..', '..', 'public', 'avatar')
SCALE = 0.1  # MakeHuman units are decimetres


# ---------------------------------------------------------------- readers
def load_obj(path):
    V, VT, faces, groups = [], [], [], []
    cur = None
    for line in open(path, errors='ignore'):
        if line.startswith('v '):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            cur = line.split()[1] if len(line.split()) > 1 else None
        elif line.startswith('f '):
            idx = []
            for tok in line.split()[1:]:
                p = tok.split('/')
                idx.append((int(p[0]) - 1, int(p[1]) - 1 if len(p) > 1 and p[1] else -1))
            faces.append(idx)
            groups.append(cur)
    return np.array(V, np.float64), np.array(VT, np.float64), faces, groups


def load_target(path, n):
    d = np.zeros((n, 3))
    for line in open(path):
        if not line.strip() or line.startswith('#'):
            continue
        p = line.split()
        d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d


def _ints_with_ranges(tokens):
    out, i = [], 0
    while i < len(tokens):
        if i + 2 < len(tokens) and tokens[i + 1] == '-':
            out.extend(range(int(tokens[i]), int(tokens[i + 2]) + 1))
            i += 3
        else:
            out.append(int(tokens[i]))
            i += 1
    return out


def load_mhclo(path):
    meta = {'scales': {}, 'delete': [], 'refs': [], 'dir': os.path.dirname(path)}
    mode = seen = None
    for raw in open(path, errors='ignore'):
        s = raw.strip()
        if not s or s.startswith('#'):
            continue
        p = s.split()
        k = p[0]
        if k == 'verts':
            mode = seen = 'v'
            continue
        if k == 'delete_verts':
            mode = 'd'
            continue
        numeric = k[0].isdigit() or (k[0] == '-' and len(k) > 1)
        if mode != 'd' and seen and numeric:
            if len(p) >= 9:
                meta['refs'].append(([int(x) for x in p[0:3]], [float(x) for x in p[3:6]], [float(x) for x in p[6:9]]))
            else:
                i = int(p[0])
                meta['refs'].append(([i, i, i], [1.0, 0.0, 0.0], [0.0, 0.0, 0.0]))
            continue
        if mode == 'd' and numeric:
            meta['delete'].extend(_ints_with_ranges(p))
            continue
        mode = None
        if k in ('x_scale', 'y_scale', 'z_scale'):
            meta['scales'][k[0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif len(p) > 1:
            meta[k] = p[1]
    return meta


def load_mhmat(path):
    out = {}
    for raw in open(path, errors='ignore'):
        s = raw.strip()
        if not s or s.startswith('#'):
            continue
        p = s.split(None, 1)
        if len(p) == 2:
            out[p[0]] = p[1]
    return out


# ---------------------------------------------------------------- fitting
def fit_proxy(meta, V):
    """MakeHuman proxy fitting: barycentric reference + offset scaled by body measurements."""
    idx = np.array([r[0] for r in meta['refs']])
    w = np.array([r[1] for r in meta['refs']])
    off = np.array([r[2] for r in meta['refs']])
    s = np.ones(3)
    for ax, key in enumerate('xyz'):
        if key in meta['scales']:
            a, b, den = meta['scales'][key]
            s[ax] = abs(V[a][ax] - V[b][ax]) / den
    return (V[idx] * w[..., None]).sum(1) + off * s


def proxy_weights(meta, W):
    """Transfer dense body skin weights (n_base x n_bones) to the proxy vertices."""
    idx = np.array([r[0] for r in meta['refs']])
    w = np.array([r[1] for r in meta['refs']])
    out = (W[idx] * w[..., None]).sum(1)
    return np.clip(out, 0, None)


def top4(W):
    order = np.argsort(-W, axis=1)[:, :4]
    sw = np.take_along_axis(W, order, axis=1)
    s = sw.sum(axis=1, keepdims=True)
    s[s == 0] = 1
    sw = sw / s
    # quantise to bytes that sum to exactly 255
    q = np.floor(sw * 255 + 0.5).astype(np.int32)
    q[:, 0] += 255 - q.sum(axis=1)
    return order.astype(np.uint16), np.clip(q, 0, 255).astype(np.uint8)


def split_uv(faces, VT):
    """Split (vertex, uv) pairs so every render vertex has one uv. Returns src index, uvs, triangles."""
    key, src, uvs, tris = {}, [], [], []
    for f in faces:
        ids = []
        for v, t in f:
            k = (v, t)
            if k not in key:
                key[k] = len(src)
                src.append(v)
                uvs.append(VT[t] if t >= 0 and len(VT) else (0.0, 0.0))
            ids.append(key[k])
        for i in range(1, len(ids) - 1):
            tris.append((ids[0], ids[i], ids[i + 1]))
    return np.array(src), np.array(uvs, np.float32), np.array(tris, np.uint32)


def smooth_normals(verts, faces):
    """Area weighted normals on the unsplit topology (keeps uv seams invisible)."""
    n = np.zeros_like(verts)
    tri = []
    for f in faces:
        ids = [v for v, _ in f]
        for i in range(1, len(ids) - 1):
            tri.append((ids[0], ids[i], ids[i + 1]))
    tri = np.array(tri)
    a, b, c = verts[tri[:, 0]], verts[tri[:, 1]], verts[tri[:, 2]]
    fn = np.cross(b - a, c - a)
    for j in range(3):
        np.add.at(n, tri[:, j], fn)
    l = np.linalg.norm(n, axis=1, keepdims=True)
    l[l == 0] = 1
    return n / l


def components(faces, n_verts):
    """Connected components over shared vertices. Returns a label per face."""
    parent = np.arange(n_verts)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for f in faces:
        r0 = find(f[0][0])
        for v, _ in f[1:]:
            r = find(v)
            if r != r0:
                parent[r] = r0
    return np.array([find(f[0][0]) for f in faces])


# ---------------------------------------------------------------- output
def quant_i16(a):
    m = float(np.abs(a).max())
    scale = m / 32767 if m > 0 else 1.0
    return np.round(a / scale).astype(np.int16), scale


def write_bundle(name, arrays, meta):
    """arrays: key -> (ndarray, kind[, scale]). Writes name.bin + name.json under OUT."""
    blob, layout = bytearray(), {}
    for k, spec in arrays.items():
        arr, kind = spec[0], spec[1]
        b = np.ascontiguousarray(arr).tobytes()
        blob += b'\0' * ((-len(blob)) % 4)
        layout[k] = {'offset': len(blob), 'count': int(arr.size), 'type': kind}
        if len(spec) > 2:
            layout[k]['scale'] = spec[2]
        blob += b
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.bin', 'wb') as f:
        f.write(blob)
    meta['buffers'] = layout
    with open(path + '.json', 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    return len(blob)


# ---------------------------------------------------------------- subdivision
def catmull_clark(faces, n_verts, VT):
    """One Catmull-Clark step on a polygon mesh with face-varying uvs.

    faces: list of [(v, t), ...]. Returns (stencil, new_faces, new_VT) where stencil is
    (rows, cols, vals) mapping old vertex data to new vertex data (linear, so it applies to
    positions, morph targets and skin weights alike) and new_faces again holds (v, t) pairs.
    """
    edge_id, edge_faces, edge_verts = {}, [], []
    for fi, f in enumerate(faces):
        k = len(f)
        for i in range(k):
            a, b = f[i][0], f[(i + 1) % k][0]
            key = (a, b) if a < b else (b, a)
            if key not in edge_id:
                edge_id[key] = len(edge_verts)
                edge_verts.append(key)
                edge_faces.append([])
            edge_faces[edge_id[key]].append(fi)
    F, E = len(faces), len(edge_verts)
    rows, cols, vals = [], [], []

    def add(r, c, v):
        rows.append(r); cols.append(c); vals.append(v)

    # face points
    for fi, f in enumerate(faces):
        for v, _ in f:
            add(n_verts + fi, v, 1.0 / len(f))
    # edge points
    boundary = np.zeros(n_verts, bool)
    for ei, (a, b) in enumerate(edge_verts):
        r = n_verts + F + ei
        fs = edge_faces[ei]
        if len(fs) == 2:
            add(r, a, 0.25); add(r, b, 0.25)
            for fi in fs:
                for v, _ in faces[fi]:
                    add(r, v, 0.25 / len(faces[fi]))
        else:
            add(r, a, 0.5); add(r, b, 0.5)
            boundary[a] = boundary[b] = True
    # vertex points
    v_faces = [[] for _ in range(n_verts)]
    v_edges = [[] for _ in range(n_verts)]
    for fi, f in enumerate(faces):
        for v, _ in f:
            v_faces[v].append(fi)
    for ei, (a, b) in enumerate(edge_verts):
        v_edges[a].append(ei); v_edges[b].append(ei)
    for v in range(n_verts):
        if not v_edges[v]:
            add(v, v, 1.0)
            continue
        if boundary[v]:
            bn = [edge_verts[e][0] + edge_verts[e][1] - v for e in v_edges[v] if len(edge_faces[e]) != 2]
            if len(bn) == 2:
                add(v, v, 0.75); add(v, bn[0], 0.125); add(v, bn[1], 0.125)
            else:
                add(v, v, 1.0)
            continue
        n = len(v_edges[v])
        # Q / n : average of face points
        for fi in v_faces[v]:
            for u, _ in faces[fi]:
                add(v, u, 1.0 / (len(v_faces[v]) * len(faces[fi]) * n))
        # 2R / n : average of edge midpoints
        for e in v_edges[v]:
            a, b = edge_verts[e]
            add(v, a, 1.0 / (n * n)); add(v, b, 1.0 / (n * n))
        add(v, v, (n - 3.0) / n)
    # faces + face-varying uvs (linear)
    new_vt, new_faces = [], []

    def uv(t):
        return VT[t] if t >= 0 and len(VT) else np.zeros(2)

    for fi, f in enumerate(faces):
        k = len(f)
        fuv = np.mean([uv(t) for _, t in f], axis=0)
        new_vt.append(fuv); tf = len(new_vt) - 1
        cuv = []
        for i in range(k):
            new_vt.append(uv(f[i][1])); cuv.append(len(new_vt) - 1)
        euv, eid = [], []
        for i in range(k):
            a, b = f[i][0], f[(i + 1) % k][0]
            key = (a, b) if a < b else (b, a)
            eid.append(n_verts + F + edge_id[key])
            new_vt.append((uv(f[i][1]) + uv(f[(i + 1) % k][1])) / 2); euv.append(len(new_vt) - 1)
        for i in range(k):
            new_faces.append([(f[i][0], cuv[i]), (eid[i], euv[i]), (n_verts + fi, tf), (eid[i - 1], euv[i - 1])])
    stencil = (np.array(rows), np.array(cols), np.array(vals))
    return stencil, new_faces, np.array(new_vt), n_verts + F + E


def apply_stencil(stencil, X, n_new):
    rows, cols, vals = stencil
    out = np.zeros((n_new,) + X.shape[1:], X.dtype if X.dtype.kind == 'f' else np.float64)
    np.add.at(out, rows, (vals.reshape((-1,) + (1,) * (X.ndim - 1))) * X[cols])
    return out


def weld_uv(faces, VT, decimals=5):
    """Merge identical uv entries so split_uv does not create needless duplicates."""
    key, remap, out = {}, {}, []
    for t, uv in enumerate(VT):
        k = (round(float(uv[0]), decimals), round(float(uv[1]), decimals))
        if k not in key:
            key[k] = len(out); out.append(uv)
        remap[t] = key[k]
    return [[(v, remap[t]) for v, t in f] for f in faces], np.array(out)
