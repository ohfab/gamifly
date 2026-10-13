import * as THREE from 'three'
import { loadBundle, loadManifest, loadTexture, type BodyMeta, type GarmentDef, type Manifest } from './assets'
import { corneaMaterial, decalMaterial, eyeMaterial, garmentMaterial, hairMaterial, makeUniforms, skinMaterial, swayState, type AvatarUniforms } from './materials'
import { lowestVertices, morphWeights, Rig } from './rig'
import { DEFAULT_LOOK, type AvatarLook, type BodyShape } from './look'
import type { WornPart } from './map'

export { DEFAULT_LOOK, type AvatarLook }

const LAYER_INFLATE = [0, 0.0012, 0.0042, 0.0085, 0.002]

interface Worn {
  part: WornPart
  def: GarmentDef
  meshes: THREE.SkinnedMesh[]
  uniforms: AvatarUniforms
  hide?: Uint16Array
  state: 'in' | 'on' | 'out'
  t: number
  t0: number
  hidden: boolean
  token: number
}

function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

/** Everything that makes up the fitting-room avatar, independent of React. */
export class AvatarModel {
  group = new THREE.Group()      // turntable
  private inner = new THREE.Group() // ground offset
  manifest!: Manifest
  rig!: Rig
  private body!: THREE.SkinnedMesh
  private bodyU = makeUniforms(0)
  private hideCount!: Uint16Array
  private hideAttr!: THREE.BufferAttribute
  private lowest: number[] = []
  private weights: number[] = []
  private look: AvatarLook = DEFAULT_LOOK
  private face: Record<string, THREE.SkinnedMesh | null> = { eyes: null, cornea: null, hair: null, brows: null, lashes: null }
  private faceKey: Record<string, string> = {}
  private worn = new Map<string, Worn>()
  private token = 0
  private ground = 0
  private lift = 0
  private spin = { prev: 0, vel: 0, twist: 0, twistV: 0, off: new THREE.Vector3(), offV: new THREE.Vector3(), hip: new THREE.Vector3() }
  ready = false
  onChange?: () => void

  constructor() {
    this.group.add(this.inner)
  }

  private initP: Promise<void> | null = null
  init() {
    this.initP ??= this.load()
    this.initP.catch(() => { this.initP = null })
    return this.initP
  }

  private async load() {
    this.manifest = await loadManifest()
    const b = await loadBundle<BodyMeta>(this.manifest.bodyMesh)
    this.rig = new Rig(b.meta as unknown as BodyMeta)
    this.inner.add(this.rig.root)
    const g = b.geometry
    this.hideCount = new Uint16Array(g.attributes.position.count)
    this.hideAttr = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)
    this.hideAttr.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('aHide', this.hideAttr)
    this.lowest = lowestVertices(g)
    const skin = await loadTexture(this.skinPath(this.look))
    this.body = this.skinned(g, skinMaterial(skin, this.bodyU))
    this.body.receiveShadow = true
    this.inner.add(this.body)
    await this.applyFace(this.look)
    this.applyShape(this.look.shape)
    this.ready = true
  }

  private skinned(g: THREE.BufferGeometry, m: THREE.Material) {
    const mesh = new THREE.SkinnedMesh(g, m)
    mesh.bind(this.rig.skeleton, new THREE.Matrix4())
    mesh.frustumCulled = false
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (mesh.morphTargetInfluences && this.weights.length) this.weights.forEach((w, i) => { mesh.morphTargetInfluences![i] = w })
    return mesh
  }

  private skinPath(l: AvatarLook) {
    const s = this.manifest.skins.find((x) => x.id === l.skin) ?? this.manifest.skins[0]
    return l.shape.masculine > 0.5 ? s.m : s.f
  }

  /* ------------------------------------------------------------ look */

  async setLook(l: AvatarLook) {
    const prev = this.look
    this.look = l
    if (!this.ready) return
    if (this.skinPath(prev) !== this.skinPath(l)) {
      const t = await loadTexture(this.skinPath(l))
      ;(this.body.material as THREE.MeshPhysicalMaterial).map = t
    }
    await this.applyFace(l)
    this.applyShape(l.shape)
  }

  private async applyFace(l: AvatarLook) {
    const M = this.manifest
    const hairColor = new THREE.Color(l.hairColor)
    const browColor = hairColor.clone().multiplyScalar(0.7)
    const lashColor = new THREE.Color('#120d0b')
    const jobs: [string, string, () => Promise<THREE.SkinnedMesh>][] = []
    const eye = M.eyes.find((e) => e.id === l.eyes) ?? M.eyes[0]
    jobs.push(['eyes', eye.id, async () => {
      const [b, t] = await Promise.all([loadBundle(M.eyeMesh), loadTexture(eye.tex)])
      const m = this.skinned(b.geometry, eyeMaterial(t, makeUniforms(0)))
      m.castShadow = false
      return m
    }])
    jobs.push(['cornea', 'cornea', async () => {
      const b = await loadBundle(M.corneaMesh)
      const m = this.skinned(b.geometry, corneaMaterial(makeUniforms(0)))
      m.castShadow = false
      m.renderOrder = 4
      return m
    }])
    const hair = M.hair.find((h) => h.id === l.hair)
    if (hair) jobs.push(['hair', hair.id, async () => {
      const [b, t] = await Promise.all([loadBundle(hair.mesh), loadTexture(hair.tex)])
      const m = this.skinned(b.geometry, hairMaterial(t, hairColor, hair.gain, makeUniforms(0.001)))
      m.castShadow = false
      return m
    }])
    const brow = M.brows.find((x) => x.id === l.brows) ?? M.brows[0]
    jobs.push(['brows', brow.id, async () => {
      const [b, t] = await Promise.all([loadBundle(brow.mesh), loadTexture(brow.tex)])
      const m = this.skinned(b.geometry, decalMaterial(t, browColor, brow.gain, makeUniforms(0.0004)))
      m.castShadow = false
      m.renderOrder = 2
      return m
    }])
    const lash = M.lashes[0]
    jobs.push(['lashes', lash.id, async () => {
      const [b, t] = await Promise.all([loadBundle(lash.mesh), loadTexture(lash.tex)])
      const m = this.skinned(b.geometry, decalMaterial(t, lashColor, lash.gain, makeUniforms(0)))
      m.castShadow = false
      m.renderOrder = 3
      return m
    }])
    if (!hair && this.face.hair) { this.dispose(this.face.hair); this.face.hair = null; this.faceKey.hair = '' }
    await Promise.all(jobs.map(async ([slot, key, make]) => {
      if (this.faceKey[slot] === key && this.face[slot]) return
      this.faceKey[slot] = key
      const mesh = await make()
      if (this.faceKey[slot] !== key) { this.dispose(mesh); return }
      if (this.face[slot]) this.dispose(this.face[slot]!)
      this.face[slot] = mesh
      this.inner.add(mesh)
    }))
    // colours can change without a mesh swap
    const tint = (m: THREE.SkinnedMesh | null, c: THREE.Color, gain: number) => {
      if (!m) return
      const mat = m.material as THREE.MeshPhysicalMaterial
      mat.color.copy(c).multiplyScalar(gain)
      if (mat.sheen) mat.sheenColor.copy(c).lerp(new THREE.Color('#ffffff'), 0.35)
    }
    if (hair) tint(this.face.hair, hairColor, hair.gain)
    tint(this.face.brows, browColor, brow.gain)
  }

  private applyShape(s: BodyShape) {
    this.weights = morphWeights(s, this.manifest.morphs)
    this.rig.setShape(this.weights)
    this.inner.traverse((o) => {
      const m = o as THREE.SkinnedMesh
      if (m.isSkinnedMesh && m.morphTargetInfluences) this.weights.forEach((w, i) => { m.morphTargetInfluences![i] = w })
    })
    this.ground = Rig.groundOffset(this.body.geometry, this.weights, this.lowest)
    this.updateLift()
  }

  private updateLift() {
    let lift = 0
    this.worn.forEach((w) => { if (w.state !== 'out' && w.def.lift) lift = Math.max(lift, w.def.lift) })
    this.lift = lift
  }

  /* ------------------------------------------------------------ outfit */

  setOutfit(parts: WornPart[]) {
    if (!this.ready) return
    const M = this.manifest
    const want = new Map<string, WornPart>()
    for (const p of parts) want.set(p.key, p)
    const slots = new Set(parts.map((p) => M.garments.find((g) => g.id === p.def)?.slot))
    const dress = parts.some((p) => p.def.startsWith('dress_'))
    if (!slots.has('top') && !dress) want.set('base:top', { key: 'base:top', def: 'base_top', color: '#15171d', fabric: 'scuba' })
    if (!slots.has('bottom') && !dress) want.set('base:bottom', { key: 'base:bottom', def: 'base_bottom', color: '#15171d', fabric: 'scuba' })

    // remove / restyle
    this.worn.forEach((w, key) => {
      const p = want.get(key)
      if (!p) { if (w.state !== 'out') this.takeOff(w); return }
      if (w.state === 'out') { w.state = 'in'; w.t0 = performance.now() }
      if (p.color !== w.part.color || p.fabric !== w.part.fabric) {
        w.part = p
        this.restyle(w)
      }
    })
    // add
    want.forEach((p, key) => {
      if (this.worn.has(key)) return
      const def = M.garments.find((g) => g.id === p.def)
      if (def) void this.putOn(key, p, def)
    })
  }

  private async material(def: GarmentDef, color: string, fabricId: string, u: AvatarUniforms) {
    const M = this.manifest
    const fab = M.fabrics.find((f) => f.id === fabricId) ?? M.fabrics.find((f) => f.id === def.fabric) ?? M.fabrics[0]
    const [fabD, fabN, fabR, detail, ao, normal] = await Promise.all([
      loadTexture(fab.d, true, true), loadTexture(fab.n, false, true), loadTexture(fab.r, false, true),
      def.detail ? loadTexture(def.detail, true) : undefined,
      def.ao ? loadTexture(def.ao, false) : undefined,
      def.normal ? loadTexture(def.normal, false) : undefined,
    ])
    return garmentMaterial({
      color: new THREE.Color(color), look: fab, fabD, fabN, fabR, repeat: Math.max(1, def.uvScale / fab.tile),
      detail, detailGain: def.detailGain, ao, normal, u,
    })
  }

  private async putOn(key: string, part: WornPart, def: GarmentDef) {
    const token = ++this.token
    const u = makeUniforms(LAYER_INFLATE[def.layer] ?? 0)
    const w: Worn = { part, def, meshes: [], uniforms: u, state: 'in', t: 0, t0: 0, hidden: false, token }
    this.worn.set(key, w)
    const [b, mat] = await Promise.all([loadBundle(def.mesh), this.material(def, part.color, part.fabric, u)])
    if (this.worn.get(key) !== w) return
    w.hide = b.hide
    const mesh = this.skinned(b.geometry, mat)
    w.meshes.push(mesh)
    if (def.sock) {
      const sb = await loadBundle(def.sock)
      const sockMat = await this.material(def, '#e9e6e1', 'jersey', { ...u, uInflate: { value: -0.0035 } })
      if (this.worn.get(key) !== w) { this.dispose(mesh); return }
      w.meshes.push(this.skinned(sb.geometry, sockMat))
    }
    u.uReveal.value = def.minY + this.ground + this.lift - 0.05
    u.uRevealOn.value = 1
    w.meshes.forEach((m) => this.inner.add(m))
    w.t0 = performance.now()
    this.updateLift()
    this.onChange?.()
  }

  private takeOff(w: Worn) {
    w.state = 'out'
    w.t0 = performance.now()
    w.uniforms.uRevealOn.value = 1
    this.hide(w, -1)
    this.updateLift()
  }

  private async restyle(w: Worn) {
    const mat = await this.material(w.def, w.part.color, w.part.fabric, w.uniforms)
    const old = w.meshes[0]?.material as THREE.Material | undefined
    if (w.meshes[0]) w.meshes[0].material = mat
    old?.dispose()
    w.t0 = performance.now()
    w.state = 'in'
    w.uniforms.uRevealOn.value = 1
  }

  private hide(w: Worn, d: 1 | -1) {
    if (!w.hide || w.hidden === (d > 0)) return
    w.hidden = d > 0
    for (const i of w.hide) {
      this.hideCount[i] = Math.max(0, this.hideCount[i] + d)
      ;(this.hideAttr.array as Float32Array)[i] = this.hideCount[i] > 0 ? 1 : 0
    }
    this.hideAttr.needsUpdate = true
  }

  private dispose(m: THREE.SkinnedMesh) {
    m.removeFromParent()
    ;(m.material as THREE.Material).dispose()
  }

  /* ------------------------------------------------------------ per frame */

  update(dt: number, t: number) {
    if (!this.ready) return
    dt = Math.min(dt, 0.05)
    this.rig.update(dt, t)
    const targetY = this.ground + this.lift
    this.inner.position.y += (targetY - this.inner.position.y) * (1 - Math.exp(-dt * 10))

    // garment scan in / out
    this.worn.forEach((w, key) => {
      const span = w.def.maxY - w.def.minY + 0.1
      const base = w.def.minY + this.inner.position.y - 0.05
      const age = (performance.now() - w.t0) / 1000
      if (w.state === 'in' && w.meshes.length) {
        w.t = Math.min(1, age / (0.55 + span * 0.35))
        w.uniforms.uReveal.value = base + ease(w.t) * span
        if (w.t >= 1) { w.state = 'on'; w.uniforms.uReveal.value = 10; w.uniforms.uRevealOn.value = 0; this.hide(w, +1) }
      } else if (w.state === 'out') {
        w.t = Math.max(0, 1 - age / (0.4 + span * 0.25))
        w.uniforms.uReveal.value = base + ease(w.t) * span
        if (w.t <= 0) {
          w.meshes.forEach((m) => this.dispose(m))
          this.worn.delete(key)
        }
      }
    })

    // cloth secondary motion: skirts and long hair lag behind turns and hip sway
    const s = this.spin
    const rot = this.group.rotation.y
    let dr = rot - s.prev
    if (dr > Math.PI) dr -= Math.PI * 2
    if (dr < -Math.PI) dr += Math.PI * 2
    s.prev = rot
    const vel = dr / Math.max(dt, 1e-3)
    s.vel += (vel - s.vel) * 0.3
    const targetTwist = THREE.MathUtils.clamp(-s.vel * 0.09, -0.5, 0.5)
    s.twistV += ((targetTwist - s.twist) * 60 - s.twistV * 7) * dt
    s.twist += s.twistV * dt
    const hip = this.rig.hipOffset
    const hv = hip.clone().sub(s.hip).divideScalar(Math.max(dt, 1e-3))
    s.hip.copy(hip)
    const tgt = hv.multiplyScalar(-0.06)
    s.offV.add(tgt.sub(s.off).multiplyScalar(80 * dt)).multiplyScalar(Math.exp(-dt * 6))
    s.off.addScaledVector(s.offV, dt)
    swayState.uSwayTwist.value = s.twist
    swayState.uSwayOffset.value.copy(s.off)
    swayState.uSwayCenter.value.set(hip.x, 0.9, 0)
  }

  /** world-space height of the head top, for camera framing */
  headTop() { return 1.62 + this.inner.position.y }
}

let shared: AvatarModel | null = null
/** One model per page: moving between the inline and the fullscreen canvas keeps outfit and pose. */
export function sharedAvatar() {
  shared ??= new AvatarModel()
  return shared
}
