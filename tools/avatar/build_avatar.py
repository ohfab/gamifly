#!/usr/bin/env python3
"""
Builds the fitting-room assets in public/avatar from CC0 sources.

  ./fetch_assets.sh          # MakeHuman core data, MakeHuman system assets, Poly Haven fabrics + HDRI
  python3 -I build_avatar.py

Outputs
  body.json/.bin            skinned, morphable body (MakeHuman hm08 base mesh)
  p/<id>.json/.bin          proxies fitted to the body: eyes, brows, lashes, hair, garments, shoes, hats
  tex/*                     skins, eye colours, hair/brow/lash alpha maps, garment ao/normal/detail, fabrics
  env/studio.hdr            Poly Haven studio HDRI
  manifest.json             everything the runtime needs to list and load the above
"""
import json, os, shutil, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mh import (MH, MHA, PH, OUT, SCALE, load_obj, load_target, load_mhclo, load_mhmat, fit_proxy,
                proxy_weights, top4, split_uv, smooth_normals, components, quant_i16, write_bundle,
                catmull_clark, apply_stencil, weld_uv)

TEX = os.path.join(OUT, 'tex')
for d in (OUT, TEX, os.path.join(OUT, 'p'), os.path.join(OUT, 'env')):
    os.makedirs(d, exist_ok=True)
for stale in ('eyes.json', 'eyes.bin'):
    if os.path.exists(os.path.join(OUT, stale)):
        os.remove(os.path.join(OUT, stale))

# ================================================================ body shape
V0, VT, FACES, GROUPS = load_obj(os.path.join(MH, '3dobjs', 'base.obj'))
NV = len(V0)
T = lambda r: load_target(os.path.join(MH, 'targets', r), NV)
F_young = (T('macrodetails/caucasian-female-young.target') + T('macrodetails/african-female-young.target') + T('macrodetails/asian-female-young.target')) / 3
M_young = (T('macrodetails/caucasian-male-young.target') + T('macrodetails/african-male-young.target') + T('macrodetails/asian-male-young.target')) / 3
F_ideal = T('macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target')
M_ideal = T('macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions.target')

# rest: young adult, feminine, idealised proportions at 60 %
REST = V0 + F_young + 0.6 * F_ideal
MORPHS = {
    'masculine': (M_young + 0.6 * M_ideal) - (F_young + 0.6 * F_ideal),
    'heavier': T('macrodetails/universal-female-young-averagemuscle-maxweight.target'),
    'slimmer': T('macrodetails/universal-female-young-averagemuscle-minweight.target'),
    'muscular': T('macrodetails/universal-female-young-maxmuscle-averageweight.target'),
    'taller': T('macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target'),
    'shorter': T('macrodetails/height/female-young-averagemuscle-averageweight-minheight.target'),
    'bust': T('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target'),
    'flat': T('breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target'),
}
MORPH_NAMES = list(MORPHS)

body_faces = [f for f, g in zip(FACES, GROUPS) if g == 'body']
used = sorted({v for f in body_faces for v, _ in f})
GROUND = REST[used][:, 1].min()


def to_m(v):
    out = v * SCALE
    out[..., 1] -= GROUND * SCALE
    return out


# ================================================================ skeleton
skel = json.load(open(os.path.join(MH, 'rigs', 'default.mhskel')))
wts = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))['weights']
bones = skel['bones']
SIDE = lambda names: [n + s for n in names for s in ('.L', '.R')]
KEEP = (['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head']
        + SIDE(['breast', 'clavicle', 'shoulder01', 'upperarm01', 'upperarm02', 'lowerarm01', 'lowerarm02', 'wrist',
                'metacarpal1', 'metacarpal2', 'metacarpal3', 'metacarpal4',
                'finger1-1', 'finger1-2', 'finger1-3', 'finger2-1', 'finger2-2', 'finger2-3', 'finger3-1', 'finger3-2',
                'finger3-3', 'finger4-1', 'finger4-2', 'finger4-3', 'finger5-1', 'finger5-2', 'finger5-3',
                'pelvis', 'upperleg01', 'upperleg02', 'lowerleg01', 'lowerleg02', 'foot',
                'eye', 'orbicularis03', 'orbicularis04']))
BI = {b: i for i, b in enumerate(KEEP)}


def kept(b):
    while b not in BI:
        b = bones[b]['parent']
    return b


def joints(verts, end='head'):
    return np.array([verts[skel['joints'][bones[b][end]]].mean(axis=0) for b in KEEP])


# dense skin weights over the kept bones
W = np.zeros((NV, len(KEEP)), np.float32)
for b, lst in wts.items():
    if b not in bones:
        continue
    k = BI[kept(b)]
    for vi, w in lst:
        W[vi, k] += w

# ================================================================ body bundle
src, UV, tris = split_uv(body_faces, VT)
rest_m = to_m(REST)
rest_n = smooth_normals(REST, body_faces)
arrays = {
    'position': (rest_m[src].astype(np.float32), 'f32'),
    'normal': (rest_n[src].astype(np.float32), 'f32'),
    'uv': (UV, 'f32'),
    'index': (tris.astype(np.uint32), 'u32'),
}
si, sw = top4(W[src])
arrays['skinIndex'] = (si.astype(np.uint8), 'u8')
arrays['skinWeight'] = (sw, 'u8n')
rest_j = to_m(joints(REST))
morph_joints = {}
for n, d in MORPHS.items():
    shaped = REST + d
    q, s = quant_i16((d * SCALE)[src])
    arrays['mp_' + n] = (q, 'i16', s)
    q, s = quant_i16((smooth_normals(shaped, body_faces) - rest_n)[src])
    arrays['mn_' + n] = (q, 'i16', s)
    morph_joints[n] = ((joints(shaped) - joints(REST)) * SCALE).round(5).tolist()


def jp(name):
    return to_m(REST[skel['joints'][name]].mean(axis=0)).round(4).tolist()


landmarks = {
    'eyeL': jp('eye.L____head'), 'eyeR': jp('eye.R____head'), 'chin': jp('jaw____tail'),
    'head': jp('head____head'), 'headTop': jp('head____tail'), 'neck': jp(bones['neck01']['head']),
}
body_meta = {
    'bones': [{'name': b, 'parent': BI[kept(bones[b]['parent'])] if bones[b]['parent'] else -1,
               'pos': rest_j[i].round(5).tolist()} for i, b in enumerate(KEEP)],
    'morphs': MORPH_NAMES, 'morphJoints': morph_joints, 'landmarks': landmarks, 'vertexCount': int(len(src)),
}
size = write_bundle('body', arrays, body_meta)
print('body', len(src), 'verts', len(tris), 'tris', len(KEEP), 'bones', round(size / 1e6, 2), 'MB')

# base vertex -> body render vertices (for hide lists)
base_to_render = [[] for _ in range(NV)]
for r, b in enumerate(src):
    base_to_render[b].append(r)


# ================================================================ proxies
class Proxy:
    """A proxy mesh fitted to the rest body, carrying morph deltas and dense skin weights."""

    def __init__(self, mhclo):
        self.meta = load_mhclo(mhclo)
        v, vt, f, _ = load_obj(os.path.join(self.meta['dir'], self.meta['obj_file']))
        assert len(self.meta['refs']) == len(v), (mhclo, len(self.meta['refs']), len(v))
        self.faces, self.VT = f, vt
        base = fit_proxy(self.meta, REST)
        self.V = to_m(base)
        self.D = {n: (fit_proxy(self.meta, REST + d) - base) * SCALE for n, d in MORPHS.items()}
        self.W = proxy_weights(self.meta, W)
        self.sway = np.zeros(len(v))
        self.delete = set(self.meta['delete'])

    def subset(self, keep_face):
        """Keep the faces for which keep_face(face_index) is true; reindex vertices."""
        faces = [f for i, f in enumerate(self.faces) if keep_face(i)]
        used_v = sorted({v for f in faces for v, _ in f})
        remap = {v: i for i, v in enumerate(used_v)}
        p = Proxy.__new__(Proxy)
        p.meta, p.VT, p.delete = self.meta, self.VT, set(self.delete)
        p.faces = [[(remap[v], t) for v, t in f] for f in faces]
        idx = np.array(used_v)
        p.V, p.W, p.sway = self.V[idx], self.W[idx], self.sway[idx]
        p.D = {n: d[idx] for n, d in self.D.items()}
        return p

    def parts(self):
        """Connected components as (label, face mask, centre, bbox)."""
        lab = components(self.faces, len(self.V))
        out = []
        for L in np.unique(lab):
            vids = sorted({v for f, l in zip(self.faces, lab) if l == L for v, _ in f})
            pts = self.V[vids]
            out.append({'label': L, 'n': len(vids), 'min': pts.min(0), 'max': pts.max(0), 'center': pts.mean(0)})
        return lab, out

    def subdivide(self):
        st, nf, nvt, nn = catmull_clark(self.faces, len(self.V), self.VT)
        self.V = apply_stencil(st, self.V, nn)
        self.D = {n: apply_stencil(st, d, nn) for n, d in self.D.items()}
        self.W = apply_stencil(st, self.W, nn)
        self.sway = apply_stencil(st, self.sway[:, None], nn)[:, 0]
        self.faces, self.VT = weld_uv(nf, nvt)
        return self

    def export(self, pid, hide=(), extra=None, rigid_bone=None, sway=False, normals=True):
        s, uv, tri = split_uv(self.faces, self.VT)
        n = smooth_normals(self.V, self.faces)
        arrays = {
            'position': (self.V[s].astype(np.float32), 'f32'),
            'normal': (n[s].astype(np.float32), 'f32'),
            'uv': (uv, 'f32'),
            'index': (tri.astype(np.uint16 if len(s) < 65536 else np.uint32), 'u16' if len(s) < 65536 else 'u32'),
        }
        if rigid_bone is not None:
            ri = np.zeros((len(s), 4), np.uint8)
            ri[:, 0] = rigid_bone if np.isscalar(rigid_bone) else rigid_bone[s]
            rw = np.zeros((len(s), 4), np.uint8)
            rw[:, 0] = 255
            arrays['skinIndex'], arrays['skinWeight'] = (ri, 'u8'), (rw, 'u8n')
        else:
            si, sw = top4(self.W[s])
            arrays['skinIndex'], arrays['skinWeight'] = (si.astype(np.uint8), 'u8'), (sw, 'u8n')
        for name, d in self.D.items():
            q, sc = quant_i16(d[s])
            arrays['mp_' + name] = (q, 'i16', sc)
        if sway:
            arrays['sway'] = ((np.clip(self.sway[s], 0, 1) * 255).astype(np.uint8), 'u8n')
        hide_r = sorted({r for b in hide for r in base_to_render[b]})
        if hide_r:
            arrays['hide'] = (np.array(hide_r, np.uint16), 'u16')
        meta = {'morphs': MORPH_NAMES, 'vertexCount': int(len(s)),
                'min': self.V.min(0).round(4).tolist(), 'max': self.V.max(0).round(4).tolist()}
        meta.update(extra or {})
        size = write_bundle('p/' + pid, arrays, meta)
        print('  %-18s %6d verts %6d tris %5d hidden %.2f MB' % (pid, len(s), len(tri), len(hide_r), size / 1e6))
        return meta


def assign_deletes(delete, parts):
    """Give each deleted body vertex to the nearest part so parts can be worn separately."""
    out = [set() for _ in parts]
    if not delete:
        return out
    ids = np.array(sorted(delete))
    P = to_m(REST[ids])
    best = np.full(len(ids), np.inf)
    who = np.zeros(len(ids), int)
    for k, p in enumerate(parts):
        for c in range(0, len(ids), 2048):
            d = ((P[c:c + 2048, None, :] - p.V[None, :, :]) ** 2).sum(-1).min(1)
            m = d < best[c:c + 2048]
            best[c:c + 2048][m] = d[m]
            who[c:c + 2048][m] = k
    for i, k in zip(ids, who):
        out[k].add(int(i))
    return out


def split_by(proxy, rules):
    """rules: name -> predicate(part dict). Returns name -> Proxy (components merged per rule)."""
    lab, parts = proxy.parts()
    owner = {}
    for p in parts:
        for name, pred in rules.items():
            if pred(p):
                owner[p['label']] = name
                break
    out = {}
    for name in rules:
        labels = {L for L, nm in owner.items() if nm == name}
        if labels:
            out[name] = proxy.subset(lambda i, labels=labels: lab[i] in labels)
    dels = assign_deletes(proxy.delete, list(out.values()))
    for (name, p), d in zip(out.items(), dels):
        p.delete = d
    return out


# ---------------------------------------------------------------- textures
def pull_push(rgb, alpha):
    """Fill transparent texels with nearby colour (avoids dark/magenta fringes when mipmapping)."""
    levels = [(rgb * alpha[..., None], alpha.copy())]
    while min(levels[-1][1].shape) > 4:
        c, a = levels[-1]
        h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
        c = c[:h, :w].reshape(h // 2, 2, w // 2, 2, -1).sum((1, 3))
        a = a[:h, :w].reshape(h // 2, 2, w // 2, 2).sum((1, 3))
        levels.append((c, a))
    c, a = levels[-1]
    fill = c / np.maximum(a, 1e-6)[..., None]
    for c, a in reversed(levels[:-1]):
        up = np.repeat(np.repeat(fill, 2, 0), 2, 1)
        up = np.pad(up, ((0, a.shape[0] - up.shape[0]), (0, a.shape[1] - up.shape[1]), (0, 0)), mode='edge')
        own = c / np.maximum(a, 1e-6)[..., None]
        k = np.clip(a, 0, 1)[..., None]
        fill = own * k + up * (1 - k)
    return fill


def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def luminance_map(img, mask=None, target=0.8):
    """Grey detail map normalised to a common mean so a tint colour can drive the final colour."""
    a = np.asarray(img.convert('RGB'), np.float32) / 255
    L = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    m = mask if mask is not None else np.ones_like(L, bool)
    mean = float(L[m].mean()) if m.any() else 0.5
    out = np.clip(L * (target / max(mean, 1e-3)), 0, 1)
    gain = 1.0 / float(srgb_to_lin(out[m]).mean()) if m.any() else 1.0
    return out, gain


def save_gray(arr, path, size=None, q=86):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), 'L')
    if size and im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    im.save(path, quality=q, optimize=True)


def save_rgb(im, path, size=None, q=86):
    im = im.convert('RGB')
    if size and im.size[0] != size:
        im = im.resize((size, int(round(im.size[1] * size / im.size[0]))), Image.LANCZOS)
    im.save(path, quality=q, optimize=True)


def alpha_tint_webp(src_png, path, size=None, target=0.62):
    """Hair/brow/lash maps: grey (tintable) colour + alpha, edges padded."""
    im = Image.open(src_png).convert('RGBA')
    if size and im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    alpha = a[..., 3]
    L = a[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    m = alpha > 0.5
    mean = float(L[m].mean()) if m.any() else 0.5
    if mean < 0.03:  # pure black alpha masks: tint uniformly
        L = np.full_like(L, target)
    else:
        L = np.clip(L * (target / mean), 0, 1)
    L = pull_push(L[..., None], alpha)[..., 0]
    gain = 1.0 / float(srgb_to_lin(L[m]).mean()) if m.any() else 1.0
    out = np.dstack([L, L, L, alpha])
    Image.fromarray((out * 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=82, method=6)
    return round(gain, 3)


def uv_mask(proxy, size):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    for f in proxy.faces:
        pts = [(proxy.VT[t][0] * size, (1 - proxy.VT[t][1]) * size) for _, t in f]
        d.polygon(pts, fill=255)
    return np.asarray(m) > 0


def tex(name):
    return 'tex/' + name


manifest = {'version': 1, 'morphs': MORPH_NAMES, 'skins': [], 'eyes': [], 'hair': [], 'brows': [], 'lashes': [],
            'garments': [], 'fabrics': [], 'env': 'env/studio.hdr'}

# ---------------------------------------------------------------- skins
print('skins')
SKINS = [
    ('porcelain', 'Porzellan', 'young_caucasian_female/young_lightskinned_female_diffuse.png', 'young_caucasian_male/young_lightskinned_male_diffuse.png'),
    ('warm', 'Warm', 'young_caucasian_female2/young_lightskinned_female_diffuse2.png', 'young_caucasian_male2/young_lightskinned_male_diffuse2.png'),
    ('olive', 'Oliv', 'young_asian_female/young_lightskinned_female_diffuse3.png', 'young_asian_male/young_lightskinned_male_diffuse3.png'),
    ('deep', 'Tief', 'young_african_female/young_darkskinned_female_diffuse.png', 'young_african_male/young_darkskinned_male_diffuse.png'),
]
for sid, label, f, m in SKINS:
    for sex, p in (('f', f), ('m', m)):
        im = Image.open(os.path.join(MHA, 'skins', p))
        save_rgb(im, os.path.join(TEX, 'skin_%s_%s.jpg' % (sid, sex)), 2048, 88)
    swatch = np.asarray(Image.open(os.path.join(MHA, 'skins', f)).convert('RGB').resize((64, 64)))[20:40, 10:30].reshape(-1, 3).mean(0)
    manifest['skins'].append({'id': sid, 'label': label, 'f': tex('skin_%s_f.jpg' % sid), 'm': tex('skin_%s_m.jpg' % sid),
                              'swatch': '#%02x%02x%02x' % tuple(int(x) for x in swatch)})

# ---------------------------------------------------------------- eyes
print('eyes')
eyes = Proxy(os.path.join(MHA, 'eyes', 'high-poly', 'high-poly.mhclo'))
# the outer shell (cornea) maps to a transparent corner of the iris texture: export it separately
in_corner = lambda f: all(eyes.VT[t][0] > 0.8 and eyes.VT[t][1] < 0.2 for _, t in f)
for name, keep in (('eyes', lambda i: not in_corner(eyes.faces[i])), ('cornea', lambda i: in_corner(eyes.faces[i]))):
    part = eyes.subset(keep)
    part.export(name, rigid_bone=np.where(part.V[:, 0] > 0, BI['eye.L'], BI['eye.R']))
for e in ('brown', 'brownlight', 'green', 'bluegreen', 'blue', 'lightblue', 'deepblue', 'grey', 'ice'):
    save_rgb(Image.open(os.path.join(MHA, 'eyes', 'materials', e + '_eye.png')), os.path.join(TEX, 'eye_%s.jpg' % e), 512, 90)
    c = np.asarray(Image.open(os.path.join(MHA, 'eyes', 'materials', e + '_eye.png')).convert('RGB').resize((64, 64)))
    sw = c[28:36, 6:14].reshape(-1, 3).mean(0)
    manifest['eyes'].append({'id': e, 'tex': tex('eye_%s.jpg' % e), 'swatch': '#%02x%02x%02x' % tuple(int(x) for x in sw)})
manifest['eyeMesh'] = 'p/eyes'
manifest['corneaMesh'] = 'p/cornea'
manifest['eyeCenters'] = {'L': body_meta['bones'][BI['eye.L']]['pos'], 'R': body_meta['bones'][BI['eye.R']]['pos']}

# ---------------------------------------------------------------- brows + lashes
print('brows / lashes')
for kind, ids in (('brows', ['eyebrow001', 'eyebrow006', 'eyebrow010', 'eyebrow012']),
                  ('lashes', ['eyelashes02', 'eyelashes03'])):
    folder = 'eyebrows' if kind == 'brows' else 'eyelashes'
    for i in ids:
        p = Proxy(os.path.join(MHA, folder, i, i + '.mhclo'))
        mat = load_mhmat(os.path.join(MHA, folder, i, i + '.mhmat'))
        gain = alpha_tint_webp(os.path.join(MHA, folder, i, mat['diffuseTexture']), os.path.join(TEX, i + '.webp'), 512,
                               0.55 if kind == 'brows' else 0.35)
        p.export(i)
        manifest[kind].append({'id': i, 'mesh': 'p/' + i, 'tex': tex(i + '.webp'), 'gain': gain})

# ---------------------------------------------------------------- hair
print('hair')
HAIR = [('long01', 'Lang glatt'), ('bob01', 'Bob'), ('bob02', 'Bob kurz'), ('ponytail01', 'Pferdeschwanz'),
        ('braid01', 'Zopf'), ('short02', 'Kurz'), ('short01', 'Kurz texturiert'), ('short04', 'Buzz'),
        ('afro01', 'Afro')]
for hid, label in HAIR:
    p = Proxy(os.path.join(MHA, 'hair', hid, hid + '.mhclo'))
    mat = load_mhmat(os.path.join(MHA, 'hair', hid, hid + '.mhmat'))
    gain = alpha_tint_webp(os.path.join(MHA, 'hair', hid, mat['diffuseTexture']), os.path.join(TEX, 'hair_%s.webp' % hid), 2048)
    long_hair = p.V[:, 1].min() < 1.3
    if long_hair:
        # strands below the neck hang from the upper spine instead of following the arms
        y = p.V[:, 1]
        t = np.clip((1.40 - y) / 0.25, 0, 1)[:, None]
        anchor = np.zeros_like(p.W)
        anchor[:, BI['spine01']] = 1
        p.W = p.W * (1 - t) + anchor * t
        p.sway = np.clip((1.42 - y) / 0.45, 0, 1) ** 1.5
    p.export('hair_' + hid, sway=long_hair)
    manifest['hair'].append({'id': hid, 'label': label, 'mesh': 'p/hair_' + hid, 'tex': tex('hair_%s.webp' % hid),
                             'gain': gain, 'sway': bool(long_hair)})

# ---------------------------------------------------------------- fabrics
print('fabrics')
FABRICS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fabrics.json')))
FABRIC_LOOK = {  # label, roughness, sheen, clearcoat, real tile size in metres (Poly Haven scans are ~27 cm)
    'jersey': ('Jersey', 1.0, 0.35, 0.0, 0.26), 'melange': ('Melange', 1.0, 0.4, 0.0, 0.27), 'poplin': ('Popeline', 0.9, 0.15, 0.0, 0.29),
    'knit': ('Strick', 1.0, 0.6, 0.0, 0.27), 'denim': ('Denim', 1.0, 0.1, 0.0, 0.27), 'wool': ('Wolle', 1.0, 0.35, 0.0, 0.27),
    'satin': ('Satin', 0.55, 0.3, 0.25, 0.26), 'georgette': ('Chiffon', 0.85, 0.5, 0.0, 0.26), 'leather': ('Leder', 0.75, 0.0, 0.35, 0.30),
    'boucle': ('Bouclé', 1.0, 0.7, 0.0, 0.31), 'linen': ('Leinen', 1.0, 0.2, 0.0, 0.27), 'velvet': ('Samt', 1.0, 1.0, 0.0, 0.28),
    'corduroy': ('Cord', 1.0, 0.45, 0.0, 0.27), 'scuba': ('Stretch', 0.8, 0.2, 0.1, 0.28),
}
for key, ph in FABRICS.items():
    d = os.path.join(PH, ph)
    L, gain = luminance_map(Image.open(os.path.join(d, 'diff.jpg')))
    save_gray(L, os.path.join(TEX, 'fab_%s_d.jpg' % key), 1024, 84)
    save_rgb(Image.open(os.path.join(d, 'nor_gl.jpg')), os.path.join(TEX, 'fab_%s_n.jpg' % key), 1024, 88)
    r = np.asarray(Image.open(os.path.join(d, 'rough.jpg')).convert('L'), np.float32) / 255
    save_gray(r, os.path.join(TEX, 'fab_%s_r.jpg' % key), 512, 84)
    label, rough, sheen, coat, tile = FABRIC_LOOK[key]
    manifest['fabrics'].append({'id': key, 'label': label, 'd': tex('fab_%s_d.jpg' % key), 'n': tex('fab_%s_n.jpg' % key),
                                'r': tex('fab_%s_r.jpg' % key), 'gain': round(gain, 3), 'roughness': rough,
                                'sheen': sheen, 'clearcoat': coat, 'tile': tile})

# ---------------------------------------------------------------- garments
print('garments')
WAIST = 0.97


def garment_maps(gid, suit_dir, base, proxy, detail_from_diffuse=False, size=2048):
    """Bake the ao / normal / (optional) detail map of a MakeHuman garment for one part."""
    out = {}
    mat = load_mhmat(os.path.join(suit_dir, base + '.mhmat'))
    mask = uv_mask(proxy, 512)
    if 'aomapTexture' in mat:
        a = np.asarray(Image.open(os.path.join(suit_dir, mat['aomapTexture'])).convert('L').resize((1024, 1024), Image.LANCZOS), np.float32) / 255
        save_gray(a, os.path.join(TEX, 'g_%s_ao.jpg' % gid), 1024, 84)
        out['ao'] = tex('g_%s_ao.jpg' % gid)
    if 'normalmapTexture' in mat:
        save_rgb(Image.open(os.path.join(suit_dir, mat['normalmapTexture'])), os.path.join(TEX, 'g_%s_n.jpg' % gid), size, 88)
        out['normal'] = tex('g_%s_n.jpg' % gid)
    if detail_from_diffuse:
        im = Image.open(os.path.join(suit_dir, mat['diffuseTexture'])).convert('RGB').resize((size, size), Image.LANCZOS)
        big = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).resize((size, size))) > 0
        L, gain = luminance_map(im, big, 0.78)
        save_gray(L, os.path.join(TEX, 'g_%s_d.jpg' % gid), size, 86)
        out['detail'] = tex('g_%s_d.jpg' % gid)
        out['detailGain'] = round(gain, 3)
    return out


def flare(p, y_top, y_hip, y_hem_scale, amount, root='root', sway_from=None):
    """Turn a fitted tube (skirt / coat hem) into a bell: flare outwards and lengthen below the hip."""
    y = p.V[:, 1].copy()
    t = np.clip((y_hip - y) / max(y_hip - y.min(), 1e-3), 0, 1)
    cz = np.median(p.V[(y < y_hip) & (y > y_hip - 0.08), 2]) if np.any((y < y_hip) & (y > y_hip - 0.08)) else 0.0
    new_y = np.where(y < y_hip, y_hip - (y_hip - y) * y_hem_scale, y)
    k = 1 + amount * t ** 1.4
    p.V[:, 0] *= k
    p.V[:, 2] = cz + (p.V[:, 2] - cz) * k
    p.V[:, 1] = new_y
    anchor = np.zeros_like(p.W)
    anchor[:, BI[root]] = 1
    tw = np.clip(t * 1.6, 0, 1)[:, None]
    p.W = p.W * (1 - tw) + anchor * tw
    p.sway = t ** 1.6
    # under a bell the legs stay visible: only hide skin around the hips
    p.delete = {v for v in p.delete if to_m(REST[v])[1] > y_hip - 0.03}
    return p


SUITS = os.path.join(MHA, 'clothes')


def suit(name):
    return Proxy(os.path.join(SUITS, name, name + '.mhclo'))


above = lambda y: (lambda p: p['center'][1] > y)
below = lambda y: (lambda p: p['center'][1] <= y)
anything = lambda p: True

GARMENTS = []  # (id, label, slot, proxy, maps, extra)


def uv_scale(p):
    """Metres of garment surface per uv unit (drives how often the fabric scan repeats)."""
    tri = [(f[0], f[i], f[i + 1]) for f in p.faces for i in range(1, len(f) - 1)]
    v = np.array([[p.V[a[0]] for a in t] for t in tri])
    u = np.array([[p.VT[a[1]] for a in t] for t in tri])
    a3 = np.linalg.norm(np.cross(v[:, 1] - v[:, 0], v[:, 2] - v[:, 0]), axis=1).sum() / 2
    e1, e2 = u[:, 1] - u[:, 0], u[:, 2] - u[:, 0]
    au = np.abs(e1[:, 0] * e2[:, 1] - e1[:, 1] * e2[:, 0]).sum() / 2
    return float(np.sqrt(a3 / max(au, 1e-9)))


def add(gid, label, slot, proxy, maps, fabric, layer, sub=True, sway=False, extra=None):
    if sub:
        proxy.subdivide()
    meta = proxy.export('g_' + gid, hide=proxy.delete, sway=sway)
    entry = {'id': gid, 'label': label, 'slot': slot, 'mesh': 'p/g_' + gid, 'fabric': fabric, 'layer': layer,
             'sway': sway, 'minY': meta['min'][1], 'maxY': meta['max'][1], 'uvScale': round(uv_scale(proxy), 3)}
    entry.update(maps)
    entry.update(extra or {})
    manifest['garments'].append(entry)


d = os.path.join(SUITS, 'female_casualsuit01')
s = split_by(suit('female_casualsuit01'), {'top': above(WAIST), 'bottom': anything})
add('tee', 'T-Shirt', 'top', s['top'], garment_maps('tee', d, 'female_casualsuit01', s['top']), 'jersey', 2)
add('jeans', 'Jeans', 'bottom', s['bottom'], garment_maps('jeans', d, 'female_casualsuit01', s['bottom'], True), 'denim', 1)

d = os.path.join(SUITS, 'female_casualsuit02')
s = split_by(suit('female_casualsuit02'), {'top': lambda p: p['center'][1] > WAIST and p['n'] > 500, 'bottom': anything})
add('shorts', 'Shorts', 'bottom', s['bottom'], garment_maps('shorts', d, 'female_casualsuit02', s['bottom'], True), 'denim', 1)

d = os.path.join(SUITS, 'female_elegantsuit01')
s = split_by(suit('female_elegantsuit01'), {'top': above(WAIST), 'bottom': anything})
add('blouse', 'Bluse', 'top', s['top'], garment_maps('blouse', d, 'female_elegantsuit01', s['top']), 'georgette', 2)
skirt_maps = garment_maps('skirt', d, 'female_elegantsuit01', s['bottom'])
add('pencil', 'Bleistiftrock', 'bottom', s['bottom'], skirt_maps, 'wool', 1)
s = split_by(suit('female_elegantsuit01'), {'top': above(WAIST), 'bottom': anything})
add('skirt', 'A-Linien-Rock', 'bottom', flare(s['bottom'].subdivide(), 0.95, 0.86, 0.9, 0.55), skirt_maps, 'satin', 1,
    sub=False, sway=True)

d = os.path.join(SUITS, 'female_sportsuit01')
s = split_by(suit('female_sportsuit01'), {'top': above(WAIST), 'bottom': anything})
crop_maps = garment_maps('crop', d, 'female_sportsuit01', s['top'])
add('crop', 'Crop-Top', 'top', s['top'], crop_maps, 'scuba', 2)
leg_maps = garment_maps('leggings', d, 'female_sportsuit01', s['bottom'])
add('leggings', 'Leggings', 'bottom', s['bottom'], leg_maps, 'scuba', 1)
# base layer: same sports set, shorts cut at mid thigh
s = split_by(suit('female_sportsuit01'), {'top': above(WAIST), 'bottom': anything})
add('base_top', 'Basis-Top', 'base_top', s['top'], crop_maps, 'scuba', 0)
b = s['bottom']
CUT = 0.66
bs = b.subset(lambda i: min(b.V[v][1] for v, _ in b.faces[i]) >= CUT)
bs.delete = {v for v in b.delete if to_m(REST[v])[1] >= CUT + 0.01}
add('base_bottom', 'Basis-Shorts', 'base_bottom', bs, leg_maps, 'scuba', 0)

d = os.path.join(SUITS, 'male_casualsuit02')
s = split_by(suit('male_casualsuit02'), {'top': above(WAIST), 'bottom': anything})
add('longsleeve', 'Longsleeve', 'top', s['top'], garment_maps('longsleeve', d, 'male_casualsuit02', s['top']), 'melange', 2)

d = os.path.join(SUITS, 'male_casualsuit03')
s = split_by(suit('male_casualsuit03'), {'top': above(WAIST), 'bottom': anything})
add('shirt', 'Hemd', 'top', s['top'], garment_maps('shirt', d, 'male_casualsuit03', s['top']), 'poplin', 2)

d = os.path.join(SUITS, 'male_casualsuit04')
s = split_by(suit('male_casualsuit04'), {'top': above(WAIST), 'bottom': anything})
add('tee_loose', 'T-Shirt weit', 'top', s['top'], garment_maps('tee_loose', d, 'male_casualsuit04', s['top']), 'jersey', 2)

d = os.path.join(SUITS, 'male_casualsuit05')
JACKET = lambda p: (p['n'] > 1000 and p['center'][1] > 0.9) or p['min'][1] > 1.1
s = split_by(suit('male_casualsuit05'), {'jacket': JACKET, 'inner': above(WAIST), 'bottom': anything})
jacket = s['jacket']
jmaps = garment_maps('jacket', d, 'male_casualsuit05', jacket)
add('jacket', 'Jacke', 'outer', jacket, jmaps, 'scuba', 3)
s = split_by(suit('male_casualsuit05'), {'jacket': JACKET, 'rest': anything})
coat = s['jacket'].subdivide()
add('coat', 'Mantel', 'outer', flare(coat, 1.0, 0.9, 2.2, 0.35, root='root'), jmaps, 'wool', 3, sub=False, sway=True)

d = os.path.join(SUITS, 'male_elegantsuit01')
s = split_by(suit('male_elegantsuit01'), {'top': above(WAIST), 'bottom': anything})
add('blazer', 'Anzug-Sakko', 'outer', s['top'], garment_maps('blazer', d, 'male_elegantsuit01', s['top'], True), 'wool', 3, sub=False)
add('trousers', 'Stoffhose', 'bottom', s['bottom'], garment_maps('trousers', d, 'male_elegantsuit01', s['bottom'], True), 'wool', 1)

# dress: fitted tee bodice + long flared skirt in one fabric
s = split_by(suit('female_casualsuit01'), {'top': above(WAIST), 'bottom': anything})
bodice = s['top']
tee_maps = [g for g in manifest['garments'] if g['id'] == 'tee'][0]
tee_maps = {k: tee_maps[k] for k in ('ao', 'normal') if k in tee_maps}
d2 = os.path.join(SUITS, 'female_elegantsuit01')
s2 = split_by(suit('female_elegantsuit01'), {'top': above(WAIST), 'bottom': anything})
skirt = flare(s2['bottom'].subdivide(), 0.95, 0.9, 1.25, 0.7)
bodice.subdivide()
add('dress_bodice', 'Kleid (Oberteil)', 'dress_part', bodice, tee_maps, 'satin', 2, sub=False)
add('dress_skirt', 'Kleid (Rock)', 'dress_part', skirt, skirt_maps, 'satin', 1, sub=False, sway=True)
manifest['dress'] = ['dress_bodice', 'dress_skirt']

# shoes: socks stay neutral, the shoe takes the colour
print('shoes')
SHOES = [('shoes06', 'Sneaker'), ('shoes05', 'Sneaker hell'), ('shoes02', 'Runner'), ('shoes03', 'Boots'),
         ('shoes01', 'Derby'), ('shoes04', 'Loafer')]
for sid, label in SHOES:
    p = suit(sid)
    lift = max(0.0, -float(p.V[:, 1].min()))
    s = split_by(p, {'sock': lambda q: q['n'] < 200 and q['max'][1] > 0.15, 'shoe': anything})
    d = os.path.join(SUITS, sid)
    maps = garment_maps(sid, d, sid, s['shoe'], True, 1024)
    s['shoe'].delete |= s.get('sock', s['shoe']).delete
    add(sid, label, 'shoes', s['shoe'], maps, 'leather', 1, extra={'lift': round(lift, 4)})
    if 'sock' in s:
        s['sock'].delete = set()
        s['sock'].subdivide().export('g_%s_sock' % sid)
        manifest['garments'][-1]['sock'] = 'p/g_%s_sock' % sid

print('hats')
p = suit('fedora01')
add('fedora', 'Fedora', 'hat', p, garment_maps('fedora', os.path.join(SUITS, 'fedora01'), 'fedora', p, True, 1024), 'wool', 4)

# ---------------------------------------------------------------- environment + manifest
shutil.copyfile(os.path.join(PH, 'studio.hdr'), os.path.join(OUT, 'env', 'studio.hdr'))
manifest['bodyMesh'] = 'body'
manifest['credits'] = 'Body, skins, hair, clothes: MakeHuman (CC0). Fabrics, HDRI: Poly Haven (CC0).'
with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=1)
total = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(OUT) for x in fs)
print('total', round(total / 1e6, 1), 'MB')
