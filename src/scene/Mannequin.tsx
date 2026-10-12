import { ContactShadows, OrbitControls, Sparkles } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Cloth } from '../game/types'

type P = [number, number][] // [radius, y]

// Stylised body silhouette (radius by height), mirrored around the Y axis.
const TORSO: P = [[0, 0.9], [0.13, 0.9], [0.175, 0.95], [0.185, 1.0], [0.16, 1.1], [0.15, 1.15], [0.165, 1.24], [0.18, 1.31], [0.172, 1.38], [0.15, 1.43], [0.1, 1.47], [0.05, 1.5], [0, 1.5]]
const LEG: P = [[0, 0.04], [0.035, 0.05], [0.04, 0.12], [0.045, 0.3], [0.05, 0.42], [0.048, 0.5], [0.062, 0.62], [0.075, 0.78], [0.088, 0.93], [0, 0.95]]
const ARM: P = [[0, -0.62], [0.03, -0.6], [0.032, -0.48], [0.038, -0.3], [0.042, -0.15], [0.048, 0], [0, 0.03]]

function radiusAt(p: P, y: number) {
  const pts = p.filter((x) => x[0] > 0)
  for (let i = 0; i < pts.length - 1; i++) {
    const [r1, y1] = pts[i], [r2, y2] = pts[i + 1]
    if ((y >= y1 && y <= y2) || (y <= y1 && y >= y2)) return r1 + ((y - y1) / (y2 - y1 || 1)) * (r2 - r1)
  }
  return pts[0][0]
}

/** Builds a garment lathe from a body profile between y0..y1 with an offset and optional flare towards y0. */
const cache = new Map<string, THREE.LatheGeometry>()
function shell(p: P, y0: number, y1: number, off: number, flare = 0, steps = 14, capTop = false) {
  const key = [p === TORSO ? 't' : p === LEG ? 'l' : 'a', y0, y1, off, flare, steps, capTop].join('|')
  const hit = cache.get(key)
  if (hit) return hit
  const g = buildShell(p, y0, y1, off, flare, steps, capTop)
  cache.set(key, g)
  return g
}
function buildShell(p: P, y0: number, y1: number, off: number, flare: number, steps: number, capTop: boolean) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps
    const f = flare * Math.pow(1 - i / steps, 1.6)
    pts.push(new THREE.Vector2(radiusAt(p, y) + off + f, y))
  }
  if (capTop) pts.push(new THREE.Vector2(0.001, y1 + 0.01))
  return new THREE.LatheGeometry(pts, 40)
}

const latheOf = (p: P) => new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), 40)

function useFabric(url?: string) {
  return useMemo(() => {
    if (!url) return null
    const t = new THREE.TextureLoader().load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [url])
}

function Fabric({ c, texture }: { c: Cloth; texture: boolean }) {
  const map = useFabric(texture ? c.fabric : undefined)
  return (
    <meshPhysicalMaterial
      color={map ? '#ffffff' : c.color}
      map={map ?? undefined}
      roughness={0.78}
      sheen={1}
      sheenRoughness={0.6}
      sheenColor={new THREE.Color(c.color).lerp(new THREE.Color('#ffffff'), 0.5)}
      side={THREE.DoubleSide}
    />
  )
}

const SKIN = '#f3dcd4'
const STAGE = {
  pastel: { hemi: ['#fff6fb', '#f1d8ff'], rim: '#ffc6e6', fill: '#ffe0f0', ring: '#ff8fc7', spark: '#ffb3d9', aura: '#ff5fa8', shadow: '#b0608c', bow: '#ff8fc7', pedestal: '#ffffff' },
  matcha: { hemi: ['#fffbef', '#dfe6cc'], rim: '#e6edcf', fill: '#fff4dc', ring: '#7c8f45', spark: '#b9c99a', aura: '#dc7c6c', shadow: '#5b6a33', bow: '#dc7c6c', pedestal: '#fffdf5' },
  night: { hemi: ['#f4e8ff', '#3b2a5a'], rim: '#b49cff', fill: '#ffd6f0', ring: '#ff7ac0', spark: '#c9b6ff', aura: '#ff5fa8', shadow: '#000000', bow: '#ff7ac0', pedestal: '#2c1f40' },
}
type Stage = (typeof STAGE)['pastel']
function Body({ bow }: { bow: string }) {
  const torso = useMemo(() => latheOf(TORSO), [])
  const leg = useMemo(() => latheOf(LEG), [])
  const arm = useMemo(() => latheOf(ARM), [])
  const mat = <meshStandardMaterial color={SKIN} roughness={0.55} />
  return (
    <group>
      <mesh geometry={torso} castShadow>{mat}</mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={leg} position={[s * 0.085, 0, 0]} castShadow>{mat}</mesh>
          <mesh geometry={arm} position={[s * 0.205, 1.4, 0]} rotation={[0, 0, s * 0.13]} castShadow>{mat}</mesh>
        </group>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 0.1, 20]} />{mat}</mesh>
      <mesh position={[0, 1.7, 0]} scale={[1, 1.12, 1]} castShadow><sphereGeometry args={[0.105, 32, 24]} />{mat}</mesh>
      {/* hair: soft bun */}
      <mesh position={[0, 1.73, -0.015]} scale={[1.05, 1.08, 1.05]}><sphereGeometry args={[0.105, 32, 24, 0, Math.PI * 2, 0, Math.PI / 1.7]} /><meshStandardMaterial color="#6b4a45" roughness={0.6} /></mesh>
      <mesh position={[0, 1.83, -0.07]} castShadow><sphereGeometry args={[0.055, 24, 16]} /><meshStandardMaterial color="#6b4a45" roughness={0.6} /></mesh>
      <mesh position={[0, 1.8, -0.035]} rotation={[0.9, 0, 0]}><torusGeometry args={[0.045, 0.014, 10, 24]} /><meshStandardMaterial color={bow} roughness={0.4} /></mesh>
    </group>
  )
}

function Garment({ c, texture }: { c: Cloth; texture: boolean }) {
  const geo = useMemo(() => {
    switch (c.cat) {
      case 'top': return { body: shell(TORSO, 1.0, 1.46, 0.012, 0.01, 14, true), sleeve: { len: 0.2, off: 0.014 } }
      case 'outer': return { body: shell(TORSO, 0.78, 1.47, 0.035, 0.05, 16, true), sleeve: { len: 0.58, off: 0.024 } }
      case 'dress': {
        const pts: THREE.Vector2[] = []
        for (let i = 0; i <= 20; i++) {
          const y = 0.5 + (0.96 * i) / 20
          const r = y > 1.0 ? radiusAt(TORSO, y) + 0.012 : 0.188 + (1.0 - y) * 0.3
          pts.push(new THREE.Vector2(r, y))
        }
        pts.push(new THREE.Vector2(0.001, 1.47))
        return { body: new THREE.LatheGeometry(pts, 40), sleeve: { len: 0.08, off: 0.012 } }
      }
      default: return null
    }
  }, [c.cat])

  if (c.cat === 'bottom') {
    if (c.fit === 'skirt') {
      const pts = [new THREE.Vector2(0.168, 1.1), new THREE.Vector2(0.19, 1.0), new THREE.Vector2(0.24, 0.8), new THREE.Vector2(0.28, 0.6)]
      return <mesh castShadow><latheGeometry args={[pts, 40]} /><Fabric c={c} texture={texture} /></mesh>
    }
    const y0 = c.fit === 'shorts' ? 0.72 : 0.06
    return (
      <group>
        <mesh castShadow geometry={shell(TORSO, 0.9, 1.12, 0.013)}><Fabric c={c} texture={texture} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * 0.085, 0, 0]} geometry={shell(LEG, y0, 0.94, 0.014, c.fit === 'pants' ? 0.025 : 0.02)}><Fabric c={c} texture={texture} /></mesh>
        ))}
      </group>
    )
  }
  if (c.cat === 'shoes') {
    return (
      <group>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.085, 0.035, 0.035]}>
            <mesh castShadow scale={[1, 0.75, 1.9]}><sphereGeometry args={[0.055, 24, 16]} /><Fabric c={c} texture={false} /></mesh>
            <mesh position={[0, -0.03, 0]} scale={[1.05, 0.25, 1.95]}><sphereGeometry args={[0.056, 24, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
          </group>
        ))}
      </group>
    )
  }
  if (c.cat === 'accessory') {
    if (c.fit === 'hat')
      return (
        <group position={[0, 1.79, 0]}>
          <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.012, 40]} /><Fabric c={c} texture={false} /></mesh>
          <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.1, 0.115, 0.12, 32]} /><Fabric c={c} texture={false} /></mesh>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.117, 0.117, 0.025, 32]} /><meshStandardMaterial color="#ff8fc7" /></mesh>
        </group>
      )
    if (c.fit === 'jewelry')
      return (
        <group position={[0, 1.47, 0.02]} rotation={[1.25, 0, 0]}>
          {Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2
            return <mesh key={i} position={[Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0]}><sphereGeometry args={[0.012, 12, 8]} /><meshStandardMaterial color={c.color} roughness={0.15} metalness={0.3} /></mesh>
          })}
        </group>
      )
    return (
      <group position={[0.27, 0.98, 0.04]} rotation={[0, 0, 0.12]}>
        <mesh castShadow><boxGeometry args={[0.07, 0.16, 0.22]} /><Fabric c={c} texture={texture} /></mesh>
        <mesh position={[-0.06, 0.24, 0]} rotation={[0, Math.PI / 2, 0.2]}><torusGeometry args={[0.22, 0.008, 8, 40, Math.PI]} /><meshStandardMaterial color={c.color} /></mesh>
      </group>
    )
  }
  if (!geo) return null
  const { len, off } = geo.sleeve
  return (
    <group>
      <mesh castShadow geometry={geo.body}><Fabric c={c} texture={texture} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.205, 1.4, 0]} rotation={[0, 0, s * 0.13]}>
          <mesh castShadow geometry={shell(ARM, -len, 0.02, off, 0.01)}><Fabric c={c} texture={texture} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Turntable({ children, spin }: { children: React.ReactNode; spin: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (g.current && spin) g.current.rotation.y += dt * 0.35 })
  return <group ref={g}>{children}</group>
}

export function Mannequin({ items, texture, spin = true, aura, theme = 'pastel' }: { items: Cloth[]; texture: boolean; spin?: boolean; aura?: boolean; theme?: keyof typeof STAGE }) {
  const st: Stage = STAGE[theme]
  const order: Record<string, number> = { bottom: 0, shoes: 1, dress: 2, top: 3, outer: 4, accessory: 5 }
  const sorted = [...items].sort((a, b) => order[a.cat] - order[b.cat])
  useEffect(() => () => { document.body.style.cursor = '' }, [])
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.2, 3.55], fov: 34 }} gl={{ alpha: true }}>
      <hemisphereLight args={[st.hemi[0], st.hemi[1], 1.1]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} color="#fff3ea" />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color={st.rim} />
      <pointLight position={[0, 1.2, 1.6]} intensity={0.6} color={st.fill} />
      <OrbitControls target={[0, 0.95, 0]} enablePan={false} minDistance={1.6} maxDistance={4.5} minPolarAngle={0.6} maxPolarAngle={1.75} />
      <Turntable spin={spin}>
        <Body bow={st.bow} />
        {sorted.map((c) => <Garment key={c.id} c={c} texture={texture} />)}
      </Turntable>
      <mesh position={[0, -0.03, 0]} receiveShadow><cylinderGeometry args={[0.6, 0.64, 0.06, 64]} /><meshStandardMaterial color={st.pedestal} roughness={0.4} /></mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.52, 0.56, 64]} /><meshStandardMaterial color={st.ring} emissive={st.ring} emissiveIntensity={theme === 'matcha' ? 0.5 : 1.2} /></mesh>
      <Sparkles count={aura ? 60 : 26} scale={[1.6, 2.2, 1.6]} position={[0, 1, 0]} size={aura ? 4 : 2.5} color={aura ? st.aura : st.spark} speed={0.4} />
      <ContactShadows position={[0, -0.059, 0]} opacity={0.4} scale={4} blur={2.4} far={2} color={st.shadow} />
    </Canvas>
  )
}
