import * as THREE from 'three'
import type { BodyMeta } from './assets'

/**
 * Skeleton for the MakeHuman body. Bones are world aligned in the rest pose (identity rotations), which keeps
 * reshaping simple: a morph only moves joint positions, so the inverse bind matrices are plain translations.
 */

import type { BodyShape } from './look'
export { DEFAULT_SHAPE, type BodyShape } from './look'

export function morphWeights(s: BodyShape, morphs: string[]) {
  const w: Record<string, number> = {
    masculine: s.masculine, heavier: Math.max(0, s.weight), slimmer: Math.max(0, -s.weight), muscular: s.muscle,
    taller: Math.max(0, s.height), shorter: Math.max(0, -s.height),
    bust: Math.max(0, s.bust) * (1 - s.masculine), flat: Math.max(0, -s.bust) * (1 - s.masculine),
  }
  return morphs.map((m) => w[m] ?? 0)
}

/* ---------------------------------------------------------------- poses */

export interface Side { down: number; fwd: number; roll: number; elbow: number; twist: number; wrist: number; curl: number; legFwd: number; legOut: number; knee: number; foot: number }
export interface Pose {
  L: Side; R: Side
  hipX: number; hipTilt: number; hipTurn: number
  spineFwd: number; spineSide: number; spineTwist: number
  headPitch: number; headYaw: number; headTilt: number
}
const side = (o: Partial<Side> = {}): Side => ({ down: 35, fwd: 7, roll: 0, elbow: -30, twist: 12, wrist: 4, curl: 0.4, legFwd: 0, legOut: 0, knee: 2, foot: 0, ...o })
const pose = (o: Partial<Omit<Pose, 'L' | 'R'>> & { L?: Partial<Side>; R?: Partial<Side> } = {}): Pose => ({
  hipX: 0, hipTilt: 0, hipTurn: 0, spineFwd: 0, spineSide: 0, spineTwist: 0, headPitch: 0, headYaw: 0, headTilt: 0,
  ...o, L: side(o.L), R: side(o.R),
})

export const POSES: Record<string, { label: string; pose: Pose }> = {
  idle: { label: 'Entspannt', pose: pose() },
  contra: {
    label: 'Kontrapost',
    pose: pose({ hipX: 0.025, hipTilt: 4, spineSide: -3, headTilt: 2, headYaw: -6, L: { legOut: -3, knee: 1, elbow: -24 }, R: { legOut: 2, knee: 12, legFwd: 6, foot: 4, down: 32, elbow: -18 } }),
  },
  casual: {
    label: 'Lässig',
    pose: pose({ hipX: -0.02, hipTilt: -3, spineSide: 2, headYaw: 8, headTilt: -2, L: { down: 14, fwd: -8, roll: 80, elbow: 78, twist: -5, wrist: 18, curl: 0.15 }, R: { legOut: -2, knee: 10, legFwd: 4 } }),
  },
  clasp: {
    label: 'Hände gefaltet',
    pose: pose({ spineFwd: -2, headPitch: -4, L: { down: 14, fwd: -8, roll: 80, elbow: 78, twist: -5, wrist: 18, curl: 0.15, legOut: 5 }, R: { down: 14, fwd: -8, roll: 80, elbow: 78, twist: -5, wrist: 18, curl: 0.15, legOut: 5 } }),
  },
  walk: { label: 'Laufsteg', pose: pose() },
}
/** QA: the untouched MakeHuman rest pose */
export const REST_POSE = pose({ L: { down: 0, fwd: 0, elbow: 0, wrist: 0, curl: 0, knee: 0 }, R: { down: 0, fwd: 0, elbow: 0, wrist: 0, curl: 0, knee: 0 } })

/* ---------------------------------------------------------------- rig */

const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }
const q1 = new THREE.Quaternion(), v1 = new THREE.Vector3()
const deg = THREE.MathUtils.degToRad

function smoothNoise(t: number, seed: number) {
  return Math.sin(t * 0.71 + seed) * 0.5 + Math.sin(t * 1.37 + seed * 2.1) * 0.3 + Math.sin(t * 2.93 + seed * 3.7) * 0.2
}

export class Rig {
  bones: THREE.Bone[]
  skeleton: THREE.Skeleton
  root: THREE.Bone
  private byName = new Map<string, number>()
  private rest: THREE.Vector3[]
  private joints: THREE.Vector3[]
  private axes = new Map<string, THREE.Vector3>()
  private morphJoints: Record<string, [number, number, number][]>
  private morphs: string[]
  private cur: Pose = structuredClone(POSES.idle.pose)
  target: Pose = structuredClone(POSES.idle.pose)
  poseName = 'idle'
  private blink = { next: 2, t: -1 }
  private gaze = { next: 1, yaw: 0, pitch: 0, cy: 0, cp: 0 }
  look = new THREE.Vector2() // -1..1 where the viewer is, relative to the avatar
  hipOffset = new THREE.Vector3()

  private meta: BodyMeta

  constructor(meta: BodyMeta) {
    this.meta = meta
    this.morphs = meta.morphs
    this.morphJoints = meta.morphJoints
    this.bones = meta.bones.map((b, i) => {
      const bone = new THREE.Bone()
      bone.name = b.name
      this.byName.set(b.name, i)
      return bone
    })
    meta.bones.forEach((b, i) => { if (b.parent >= 0) this.bones[b.parent].add(this.bones[i]) })
    this.root = this.bones[0]
    this.rest = meta.bones.map((b) => new THREE.Vector3(...b.pos))
    this.joints = this.rest.map((v) => v.clone())
    this.skeleton = new THREE.Skeleton(this.bones, this.bones.map(() => new THREE.Matrix4()))
    this.applyJoints()
    this.computeAxes()
  }

  idx(name: string) { return this.byName.get(name) ?? -1 }
  bone(name: string) { return this.bones[this.idx(name)] }
  jointRest(name: string) { return this.rest[this.idx(name)] }

  /** Joint positions follow the body morphs; bones stay world aligned. */
  setShape(weights: number[]) {
    this.joints.forEach((j, i) => {
      j.copy(this.rest[i])
      this.morphs.forEach((m, k) => {
        const d = this.morphJoints[m]?.[i]
        if (d && weights[k]) j.add(v1.set(d[0], d[1], d[2]).multiplyScalar(weights[k]))
      })
    })
    this.applyJoints()
  }

  private applyJoints() {
    this.bones.forEach((bone, i) => {
      const p = this.meta.bones[i].parent
      bone.position.copy(this.joints[i])
      if (p >= 0) bone.position.sub(this.joints[p])
      this.skeleton.boneInverses[i].makeTranslation(-this.joints[i].x, -this.joints[i].y, -this.joints[i].z)
    })
    this.basePositions = this.bones.map((b) => b.position.clone())
  }
  private basePositions: THREE.Vector3[] = []

  /** Hinge axes measured on the rest skeleton (the bones are world aligned there). */
  private computeAxes() {
    const J = (n: string) => this.jointRest(n)
    for (const s of ['L', 'R']) {
      const up = J(`lowerarm01.${s}`).clone().sub(J(`upperarm01.${s}`)).normalize()
      this.axes.set(`upper.${s}`, up.clone())
      this.axes.set(`elbow.${s}`, up.clone().cross(AX.z).normalize())
      this.axes.set(`forearm.${s}`, J(`wrist.${s}`).clone().sub(J(`lowerarm01.${s}`)).normalize())
      const along = J(`finger3-1.${s}`).clone().sub(J(`wrist.${s}`)).normalize()
      const across = J(`finger2-1.${s}`).clone().sub(J(`finger5-1.${s}`)).normalize()
      const n = along.clone().cross(across).normalize()
      if (n.y > 0) n.negate()
      this.axes.set(`palm.${s}`, n)
      this.axes.set(`wrist.${s}`, along.clone().cross(n).normalize())
      for (let f = 1; f <= 5; f++) {
        for (let k = 1; k <= 3; k++) {
          const a = `finger${f}-${k}.${s}`
          const b = k < 3 ? `finger${f}-${k + 1}.${s}` : `finger${f}-${k}.${s}`
          const from = k < 3 ? J(a) : J(`finger${f}-${k - 1}.${s}`)
          const dir = J(b).clone().sub(from).normalize()
          this.axes.set(a, dir.cross(n).normalize())
        }
      }
    }
  }

  setPose(name: string) {
    this.poseName = name
    this.target = structuredClone(name === 'rest' ? REST_POSE : (POSES[name] ?? POSES.idle).pose)
    if (name === 'rest') this.cur = structuredClone(REST_POSE)
  }

  update(dt: number, t: number) {
    const k = 1 - Math.exp(-dt * 4.5)
    const lerpObj = (a: Record<string, number>, b: Record<string, number>) => { for (const key in b) if (typeof b[key] === 'number') a[key] += (b[key] - a[key]) * k }
    const walking = this.poseName === 'walk'
    lerpObj(this.cur as unknown as Record<string, number>, this.target as unknown as Record<string, number>)
    lerpObj(this.cur.L as unknown as Record<string, number>, this.target.L as unknown as Record<string, number>)
    lerpObj(this.cur.R as unknown as Record<string, number>, this.target.R as unknown as Record<string, number>)
    const P = this.cur

    // living layer: breathing, slow weight shift, small head motion
    const br = Math.sin(t * (Math.PI * 2) / 4.6)
    const shift = smoothNoise(t * 0.32, 1.3)
    const hx = P.hipX + shift * 0.006
    let walkPhase = 0, walkAmt = 0
    if (walking) { walkPhase = t * Math.PI * 1.9; walkAmt = 1 }
    const wS = Math.sin(walkPhase) * walkAmt, wC = Math.cos(walkPhase) * walkAmt

    this.bones.forEach((b, i) => { b.quaternion.identity(); b.position.copy(this.basePositions[i]) })
    const set = (name: string, ...rots: [THREE.Vector3, number][]) => {
      const b = this.bone(name)
      if (!b) return
      for (const [axis, a] of rots) b.quaternion.premultiply(q1.setFromAxisAngle(axis, deg(a)))
    }

    // hips
    this.root.position.x += hx + wS * 0.015
    this.root.position.y += -Math.abs(wC) * 0.012 * walkAmt + 0.006 * walkAmt
    this.hipOffset.set(hx, 0, 0)
    set('root', [AX.z, P.hipTilt + shift * 1.2 + wS * 3], [AX.y, P.hipTurn + wS * 4])
    set('spine05', [AX.z, -P.hipTilt * 0.4])
    set('spine04', [AX.x, P.spineFwd * 0.3 + br * 0.3], [AX.z, P.spineSide * 0.35 - shift * 0.5 - wS * 1.2], [AX.y, P.spineTwist * 0.3 - wS * 3])
    set('spine03', [AX.x, P.spineFwd * 0.3 + br * 0.4], [AX.z, P.spineSide * 0.35 - shift * 0.4], [AX.y, P.spineTwist * 0.3 - wS * 2])
    set('spine02', [AX.x, P.spineFwd * 0.4 - br * 0.6], [AX.z, P.spineSide * 0.3 - shift * 0.3])
    set('spine01', [AX.x, -br * 0.5])
    const hn = smoothNoise(t * 0.45, 4.2), hp = smoothNoise(t * 0.38, 7.7)
    set('neck01', [AX.x, P.headPitch * 0.3 + hp * 0.6])
    set('neck02', [AX.y, P.headYaw * 0.3 + hn * 1.5 + this.look.x * 3])
    set('head', [AX.x, P.headPitch * 0.5 + hp * 1.2 - this.look.y * 3], [AX.y, P.headYaw * 0.5 + hn * 2.5 + this.look.x * 5], [AX.z, P.headTilt + hn * 0.8])

    for (const s of ['L', 'R'] as const) {
      const S = P[s]
      const sg = s === 'L' ? -1 : 1 // rotating about +z lowers the right arm, -z the left
      const swing = walkAmt * (s === 'L' ? -wS : wS) * 14
      set(`clavicle.${s}`, [AX.z, sg * (br * 0.6)])
      set(`shoulder01.${s}`, [AX.z, sg * S.down * 0.18])
      set(`upperarm01.${s}`, [this.axes.get(`upper.${s}`)!, -sg * S.roll], [AX.z, sg * S.down * 0.82 + sg * smoothNoise(t * 0.5, s === 'L' ? 2 : 5)], [AX.x, -(S.fwd + swing)])
      set(`upperarm02.${s}`, [this.axes.get(`forearm.${s}`)!, sg * S.twist * 0.3])
      set(`lowerarm01.${s}`, [this.axes.get(`elbow.${s}`)!, S.elbow + walkAmt * (8 + Math.max(0, swing) * 0.6)])
      set(`lowerarm02.${s}`, [this.axes.get(`forearm.${s}`)!, sg * S.twist * 0.7])
      set(`wrist.${s}`, [this.axes.get(`wrist.${s}`)!, S.wrist])
      for (let f = 1; f <= 5; f++) {
        for (let j = 1; j <= 3; j++) {
          const n = `finger${f}-${j}.${s}`
          const amt = f === 1 ? S.curl * (j === 1 ? 8 : 18) : S.curl * (j === 1 ? 22 + f * 3 : j === 2 ? 38 : 22)
          set(n, [this.axes.get(n)!, amt])
        }
      }
      // legs: walk cycle on top of the pose
      const lp = walkAmt * (s === 'L' ? wS : -wS)
      set(`upperleg01.${s}`, [AX.z, sg * -S.legOut - (s === 'L' ? 1 : -1) * shift * 0.4], [AX.x, -(S.legFwd + lp * 16)])
      set(`lowerleg01.${s}`, [AX.x, S.knee + walkAmt * Math.max(0, -lp) * 28 + walkAmt * 6])
      set(`foot.${s}`, [AX.x, -S.foot + walkAmt * Math.max(0, lp) * -8])
    }

    // eyes: saccades towards the viewer, blinks
    const g = this.gaze
    g.next -= dt
    if (g.next <= 0) {
      g.next = 0.6 + Math.random() * 2.6
      g.yaw = this.look.x * 10 + (Math.random() - 0.5) * 9
      g.pitch = -this.look.y * 6 + (Math.random() - 0.5) * 5
    }
    const ek = 1 - Math.exp(-dt * 30)
    g.cy += (g.yaw - g.cy) * ek
    g.cp += (g.pitch - g.cp) * ek
    for (const s of ['L', 'R']) set(`eye.${s}`, [AX.y, g.cy], [AX.x, g.cp])
    const bl = this.blink
    bl.next -= dt
    if (bl.next <= 0 && bl.t < 0) { bl.t = 0; bl.next = 2.2 + Math.random() * 4 }
    let lid = 0
    if (bl.t >= 0) {
      bl.t += dt
      lid = bl.t < 0.07 ? bl.t / 0.07 : Math.max(0, 1 - (bl.t - 0.07) / 0.11)
      if (bl.t > 0.2) bl.t = -1
    }
    for (const s of ['L', 'R']) {
      set(`orbicularis03.${s}`, [AX.x, lid * 26 + g.cp * 0.25])
      set(`orbicularis04.${s}`, [AX.x, -lid * 6])
    }
    this.root.updateMatrixWorld(true)
  }

  /** Lowest body point for the current shape, so feet (or shoes) stand on the floor. */
  static groundOffset(geo: THREE.BufferGeometry, weights: number[], lowest: number[]) {
    const pos = geo.attributes.position
    const morph = geo.morphAttributes.position ?? []
    let min = Infinity
    for (const i of lowest) {
      let y = pos.getY(i)
      morph.forEach((m, k) => { if (weights[k]) y += m.getY(i) * weights[k] })
      if (y < min) min = y
    }
    return -min
  }
}

export function lowestVertices(geo: THREE.BufferGeometry, n = 300) {
  const pos = geo.attributes.position
  const ids = Array.from({ length: pos.count }, (_, i) => i)
  ids.sort((a, b) => pos.getY(a) - pos.getY(b))
  return ids.slice(0, n)
}

