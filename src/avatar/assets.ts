import * as THREE from 'three'

/** Asset manifest written by tools/avatar/build_avatar.py */
export interface SkinDef { id: string; label: string; f: string; m: string; swatch: string }
export interface EyeDef { id: string; tex: string; swatch: string }
export interface HairDef { id: string; label: string; mesh: string; tex: string; gain: number; sway: boolean }
export interface DecalDef { id: string; mesh: string; tex: string; gain: number }
export interface FabricDef { id: string; label: string; d: string; n: string; r: string; gain: number; roughness: number; sheen: number; clearcoat: number; tile: number }
export type GarmentSlot = 'top' | 'bottom' | 'outer' | 'shoes' | 'hat' | 'base_top' | 'base_bottom' | 'dress_part'
export interface GarmentDef {
  id: string; label: string; slot: GarmentSlot; mesh: string; fabric: string; layer: number; sway: boolean
  minY: number; maxY: number; uvScale: number; ao?: string; normal?: string; detail?: string; detailGain?: number
  lift?: number; sock?: string
}
export interface Manifest {
  version: number; morphs: string[]; skins: SkinDef[]; eyes: EyeDef[]; hair: HairDef[]; brows: DecalDef[]; lashes: DecalDef[]
  garments: GarmentDef[]; fabrics: FabricDef[]; env: string; eyeMesh: string; corneaMesh: string; bodyMesh: string; dress: string[]
  eyeCenters: { L: number[]; R: number[] }; credits: string
}

export interface BoneDef { name: string; parent: number; pos: [number, number, number] }
export interface BodyMeta {
  bones: BoneDef[]; morphs: string[]; morphJoints: Record<string, [number, number, number][]>
  landmarks: Record<string, [number, number, number]>; vertexCount: number
}
interface BufferSpec { offset: number; count: number; type: string; scale?: number }
export interface Bundle<M = Record<string, unknown>> { meta: M & { morphs: string[] }; geometry: THREE.BufferGeometry; hide?: Uint16Array }

export const AVATAR_BASE = `${import.meta.env.BASE_URL}avatar/`
const url = (p: string) => AVATAR_BASE + p

let manifestP: Promise<Manifest> | null = null
export function loadManifest() {
  manifestP ??= fetch(url('manifest.json')).then((r) => {
    if (!r.ok) throw new Error('manifest ' + r.status)
    return r.json() as Promise<Manifest>
  })
  return manifestP
}

/* ---------------------------------------------------------------- binary bundles */

function view(buf: ArrayBuffer, s: BufferSpec) {
  switch (s.type) {
    case 'f32': return new Float32Array(buf, s.offset, s.count)
    case 'u32': return new Uint32Array(buf, s.offset, s.count)
    case 'u16': return new Uint16Array(buf, s.offset, s.count)
    case 'u8': case 'u8n': return new Uint8Array(buf, s.offset, s.count)
    case 'i16': {
      const q = new Int16Array(buf, s.offset, s.count)
      const out = new Float32Array(s.count)
      const k = s.scale ?? 1
      for (let i = 0; i < q.length; i++) out[i] = q[i] * k
      return out
    }
    default: throw new Error('unknown buffer type ' + s.type)
  }
}

const bundles = new Map<string, Promise<Bundle>>()
const progress = { loaded: 0, listeners: new Set<(n: number) => void>() }
export function onAvatarBytes(fn: (n: number) => void) {
  progress.listeners.add(fn)
  return () => { progress.listeners.delete(fn) }
}
function tick(n: number) {
  progress.loaded += n
  progress.listeners.forEach((f) => f(progress.loaded))
}

/** Loads <name>.json + <name>.bin and turns them into a skinned, morphable BufferGeometry. */
export function loadBundle<M = Record<string, unknown>>(name: string): Promise<Bundle<M>> {
  let p = bundles.get(name)
  if (!p) {
    p = (async () => {
      const [meta, bin] = await Promise.all([
        fetch(url(name + '.json')).then((r) => r.json()),
        fetch(url(name + '.bin')).then((r) => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer() }),
      ])
      tick(bin.byteLength)
      const B = meta.buffers as Record<string, BufferSpec>
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(view(bin, B.position), 3))
      g.setAttribute('normal', new THREE.BufferAttribute(view(bin, B.normal), 3))
      g.setAttribute('uv', new THREE.BufferAttribute(view(bin, B.uv), 2))
      g.setIndex(new THREE.BufferAttribute(view(bin, B.index), 1))
      g.setAttribute('skinIndex', new THREE.BufferAttribute(view(bin, B.skinIndex), 4))
      g.setAttribute('skinWeight', new THREE.BufferAttribute(view(bin, B.skinWeight), 4, true))
      const morphs: string[] = meta.morphs ?? []
      const mp = morphs.filter((m) => B['mp_' + m]).map((m) => new THREE.BufferAttribute(view(bin, B['mp_' + m]), 3))
      const mn = morphs.filter((m) => B['mn_' + m]).map((m) => new THREE.BufferAttribute(view(bin, B['mn_' + m]), 3))
      if (mp.length) g.morphAttributes.position = mp
      if (mn.length === mp.length && mn.length) g.morphAttributes.normal = mn
      g.morphTargetsRelative = true
      const n = g.attributes.position.count
      g.setAttribute('aSway', B.sway ? new THREE.BufferAttribute(view(bin, B.sway), 1, true) : new THREE.BufferAttribute(new Uint8Array(n), 1, true))
      g.computeBoundingSphere()
      g.boundingSphere!.radius += 0.4 // posed / morphed bodies grow beyond the rest bounds
      const hide = B.hide ? (view(bin, B.hide) as Uint16Array) : undefined
      return { meta, geometry: g, hide }
    })()
    bundles.set(name, p)
    p.catch(() => bundles.delete(name))
  }
  return p as Promise<Bundle<M>>
}

/* ---------------------------------------------------------------- textures */

const loader = new THREE.TextureLoader()
const textures = new Map<string, Promise<THREE.Texture>>()
export function loadTexture(path: string, color = true, repeat = false): Promise<THREE.Texture> {
  const key = `${path}|${color}|${repeat}`
  let p = textures.get(key)
  if (!p) {
    p = new Promise<THREE.Texture>((res, rej) => loader.load(url(path), (t) => {
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.anisotropy = 8
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.flipY = true
      res(t)
    }, undefined, rej))
    textures.set(key, p)
    p.catch(() => textures.delete(key))
  }
  return p
}

/** A 1x1 texture used where a material expects a map that the asset does not have. */
export function solidTexture(r: number, g: number, b: number, color = false) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1)
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}
export const FLAT_NORMAL = solidTexture(128, 128, 255)
export const WHITE = solidTexture(255, 255, 255, true)

export const assetUrl = url
