import { CameraControls, ContactShadows, Float, Html, RoundedBox, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Device, Room } from '../game/types'
import { ROOM_ICON } from '../data/home'
import { Art } from '../art/Art'

export const ROOM_BOUNDS: Record<string, { x: [number, number]; z: [number, number] }> = {
  living: { x: [-6, 0], z: [-4, 0] },
  kitchen: { x: [0, 6], z: [-4, 0] },
  bedroom: { x: [-6, -1.5], z: [0, 4] },
  hall: { x: [-1.5, 1.5], z: [0, 4] },
  bath: { x: [1.5, 6], z: [0, 4] },
}
const center = (id: string) => {
  const b = ROOM_BOUNDS[id]
  return new THREE.Vector3((b.x[0] + b.x[1]) / 2, 0, (b.z[0] + b.z[1]) / 2)
}

const PASTEL = {
  wall: '#fffafc', wallTop: '#f3d3e3', white: '#ffffff', pink: '#ffbfd8', pinkDeep: '#ff8fbf', lilac: '#d6c8ff', mint: '#b9ecd9',
  peach: '#ffd1bc', sky: '#cbe4ff', wood: '#e8c9ac', woodDark: '#c99f7f', dark: '#5b4a63', cream: '#fff3e3', gold: '#f2c66d', leaf: '#8fd3a8',
  sofa: '#ffbfd8', sofaCushion: '#ffd3e5', rug: '#d6c8ff', blanket: '#ffbfd8', cabinets: '#b9ecd9', fridge: '#cbe4ff', fridgeDoor: '#d9ecff',
  bg: '#fdf1f7', slab: '#ffffff', hemiSky: '#fff4fb', hemiGround: '#f1dcff', sparkle: '#ff9fd0', shadow: '#b0608c',
  floors: {
    living: { floor: '#f3dcc8' }, kitchen: { floor: '#f7eef5', tile: '#efe1ec' }, bedroom: { floor: '#fbdbe8' },
    hall: { floor: '#efd8c6' }, bath: { floor: '#e0f4ee', tile: '#cdebe2' },
  } as Record<string, { floor: string; tile?: string }>,
}
type Palette = typeof PASTEL
const MATCHA: Palette = {
  wall: '#fbf8ee', wallTop: '#c9d3b0', white: '#fffdf7', pink: '#f1c2b8', pinkDeep: '#dc7c6c', lilac: '#c4cfa6', mint: '#a8bb83',
  peach: '#e9cfa9', sky: '#dfe5d1', wood: '#d8b98f', woodDark: '#a8835b', dark: '#3a4424', cream: '#fff8e6', gold: '#c9a35a', leaf: '#6f8f45',
  sofa: '#7c8f45', sofaCushion: '#97a865', rug: '#e8dcc2', blanket: '#f1c2b8', cabinets: '#8a9c58', fridge: '#e8e6d8', fridgeDoor: '#f3f1e6',
  bg: '#eef0e4', slab: '#fffdf5', hemiSky: '#fffbef', hemiGround: '#dfe6cc', sparkle: '#c9d69f', shadow: '#5b6a33',
  floors: {
    living: { floor: '#e9d6ba' }, kitchen: { floor: '#f4f1e6', tile: '#e5e2d2' }, bedroom: { floor: '#f0e2d2' },
    hall: { floor: '#e3d0b3' }, bath: { floor: '#e5ecdc', tile: '#d3dec5' },
  },
}
export const PALETTES = { pastel: PASTEL, matcha: MATCHA, night: PASTEL }
const PalCtx = createContext<Palette>(PASTEL)
const usePal = () => useContext(PalCtx)

function M({ color, rough = 0.75, emissive, ei = 0, metal = 0, opacity }: { color: string; rough?: number; emissive?: string; ei?: number; metal?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={ei} transparent={opacity != null} opacity={opacity ?? 1} />
}

function B({ p, s, c, r = 0.04, onClick, children, ...rest }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; onClick?: (e: ThreeEvent<MouseEvent>) => void; children?: ReactNode; rough?: number; ei?: number; emissive?: string }) {
  return (
    <RoundedBox args={s} radius={Math.min(r, ...s.map((v) => v / 2 - 0.001))} smoothness={3} position={p} castShadow receiveShadow onClick={onClick}>
      {children ?? <M color={c} rough={rest.rough} emissive={rest.emissive} ei={rest.ei} />}
    </RoundedBox>
  )
}

function tileTexture(a: string, b: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = a; g.fillRect(0, 0, 64, 64)
  g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Floor({ id, hovered, selected, onHover, onSelect }: { id: string; hovered: boolean; selected: boolean; onHover: (id: string | null) => void; onSelect: (id: string) => void }) {
  const b = ROOM_BOUNDS[id]
  const P = usePal()
  const pal = P.floors[id]
  const w = b.x[1] - b.x[0], d = b.z[1] - b.z[0]
  const tex = useMemo(() => {
    if (!pal.tile) return null
    const t = tileTexture(pal.floor, pal.tile)
    t.repeat.set(w * 1.5, d * 1.5)
    return t
  }, [pal, w, d])
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (!mat.current) return
    const target = selected ? 0.22 : hovered ? 0.12 : 0
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.15
  })
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[(b.x[0] + b.x[1]) / 2, 0.001, (b.z[0] + b.z[1]) / 2]}
      receiveShadow
      onPointerOver={(e) => { e.stopPropagation(); onHover(id); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); onSelect(id) }}
    >
      <planeGeometry args={[w - 0.02, d - 0.02]} />
      <meshStandardMaterial ref={mat} color={tex ? '#ffffff' : pal.floor} map={tex ?? undefined} roughness={0.9} emissive={P.sparkle} emissiveIntensity={0} />
    </mesh>
  )
}

const WALL_T = 0.12
function Wall({ a, b, h, tall }: { a: [number, number]; b: [number, number]; h: number; tall?: boolean }) {
  const C = usePal()
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  return (
    <group position={[(a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2]} rotation={[0, -ang, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[len + WALL_T, h, WALL_T]} />
        <M color={C.wall} rough={0.95} />
      </mesh>
      <mesh position={[0, h / 2 + 0.008, 0]}>
        <boxGeometry args={[len + WALL_T, 0.016, WALL_T + 0.01]} />
        <M color={tall ? C.wallTop : C.pink} />
      </mesh>
    </group>
  )
}

function Walls() {
  const C = usePal()
  const T = 2.3, L = 1.05, F = 0.3
  return (
    <group>
      {/* outer back & left: tall */}
      <Wall a={[-6, -4]} b={[6, -4]} h={T} tall />
      <Wall a={[-6, -4]} b={[-6, 4]} h={T} tall />
      {/* outer front & right: low curb for the cutaway look */}
      <Wall a={[-6, 4]} b={[-0.6, 4]} h={F} />
      <Wall a={[0.6, 4]} b={[6, 4]} h={F} />
      <Wall a={[6, -4]} b={[6, 4]} h={F} />
      {/* interior */}
      <Wall a={[-6, 0]} b={[-1.2, 0]} h={L} />
      <Wall a={[-0.4, 0]} b={[0.4, 0]} h={L} />
      <Wall a={[1.2, 0]} b={[6, 0]} h={L} />
      <Wall a={[0, -4]} b={[0, -2.7]} h={L} />
      <Wall a={[-1.5, 0]} b={[-1.5, 1.6]} h={L} />
      <Wall a={[-1.5, 2.6]} b={[-1.5, 4]} h={L} />
      <Wall a={[1.5, 0]} b={[1.5, 2.3]} h={L} />
      <Wall a={[1.5, 3.3]} b={[1.5, 4]} h={L} />
      {/* windows */}
      {[[-4.2, -3.93], [3, -3.93]].map(([x, z], i) => (
        <group key={i} position={[x, 1.45, z]}>
          <mesh><boxGeometry args={[1.5, 0.95, 0.04]} /><M color="#dff0ff" emissive="#cfe8ff" ei={0.6} rough={0.2} /></mesh>
          <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.04, 0.95, 0.02]} /><M color={C.white} /></mesh>
          <mesh position={[0, -0.5, 0.06]}><boxGeometry args={[1.62, 0.05, 0.14]} /><M color={C.white} /></mesh>
        </group>
      ))}
      <group position={[-5.93, 1.45, 2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><boxGeometry args={[1.3, 0.95, 0.04]} /><M color="#dff0ff" emissive="#cfe8ff" ei={0.6} rough={0.2} /></mesh>
      </group>
    </group>
  )
}

function Lamp({ pos, device, onToggle, kind = 'floor' }: { pos: [number, number, number]; device?: Device; onToggle?: () => void; kind?: 'floor' | 'pendant' | 'table' | 'mirror' }) {
  const C = usePal()
  const on = !!device?.on
  const intensity = on ? ((device?.value ?? 100) / 100) * 4 : 0
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onToggle?.() }
  const light = <pointLight intensity={intensity} distance={4.5} decay={1.6} color="#ffd9b0" castShadow={false} />
  const bulb = <M color={on ? '#fff6d8' : '#f3eef2'} emissive="#ffd59a" ei={on ? 2.2 : 0} />
  if (kind === 'pendant')
    return (
      <group position={pos} onClick={click}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.01, 0.01, 1]} /><M color={C.dark} /></mesh>
        <mesh><sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><M color={C.pink} /></mesh>
        <mesh position={[0, -0.02, 0]}><sphereGeometry args={[0.08, 16, 16]} />{bulb}</mesh>
        <group position={[0, -0.3, 0]}>{light}</group>
      </group>
    )
  if (kind === 'table')
    return (
      <group position={pos} onClick={click}>
        <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.06, 0.08, 0.16, 16]} /><M color={C.gold} metal={0.4} rough={0.4} /></mesh>
        <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.1, 0.16, 0.2, 20, 1, true]} /><M color={C.cream} emissive="#ffd59a" ei={on ? 0.8 : 0} /></mesh>
        <group position={[0, 0.3, 0]}>{light}</group>
      </group>
    )
  if (kind === 'mirror')
    return (
      <group position={pos} onClick={click}>
        <mesh><torusGeometry args={[0.32, 0.035, 12, 40]} />{bulb}</mesh>
        <mesh><circleGeometry args={[0.3, 32]} /><M color="#eaf6ff" rough={0.05} metal={0.6} /></mesh>
        <group position={[0, 0, 0.3]}>{light}</group>
      </group>
    )
  return (
    <group position={pos} onClick={click}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.18, 0.2, 0.04, 24]} /><M color={C.gold} metal={0.4} rough={0.4} /></mesh>
      <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.015, 0.015, 1.5]} /><M color={C.gold} metal={0.4} rough={0.4} /></mesh>
      <mesh position={[0, 1.55, 0]}><cylinderGeometry args={[0.16, 0.26, 0.3, 24, 1, true]} /><meshStandardMaterial color={C.cream} side={THREE.DoubleSide} emissive="#ffd59a" emissiveIntensity={on ? 0.9 : 0} /></mesh>
      <group position={[0, 1.45, 0]}>{light}</group>
    </group>
  )
}

function Plant({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  const C = usePal()
  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.02}>
      <group position={pos} scale={scale}>
        <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.18, 0.14, 0.36, 20]} /><M color={C.peach} /></mesh>
        {[[0, 0.55, 0, 0.22], [0.12, 0.7, 0.05, 0.17], [-0.1, 0.72, -0.06, 0.16], [0.02, 0.86, 0.02, 0.14]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow><sphereGeometry args={[r, 16, 12]} /><M color={i % 2 ? '#7fcf9c' : C.leaf} /></mesh>
        ))}
      </group>
    </Float>
  )
}

function Fridge({ onOpen, warn, portal }: { onOpen: () => void; warn: boolean; portal: React.RefObject<HTMLElement | null> }) {
  const C = usePal()
  const door = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  useFrame(() => {
    if (!door.current) return
    const t = hover ? -0.7 : 0
    door.current.rotation.y += (t - door.current.rotation.y) * 0.12
  })
  return (
    <group position={[5.5, 0, -3.55]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); onOpen() }}>
      <B p={[0, 1, 0]} s={[0.78, 2, 0.72]} c={C.fridge} r={0.08} />
      {/* interior glow */}
      <mesh position={[0, 1.2, 0.3]}><boxGeometry args={[0.66, 1.3, 0.1]} /><M color="#ffffff" emissive="#eaf6ff" ei={hover ? 1 : 0} /></mesh>
      <group ref={door} position={[-0.38, 0, 0.37]}>
        <B p={[0.38, 1.25, 0.03]} s={[0.76, 1.42, 0.07]} c={C.fridgeDoor} r={0.05} />
        <B p={[0.38, 0.3, 0.03]} s={[0.76, 0.5, 0.07]} c={C.fridgeDoor} r={0.05} />
        <mesh position={[0.68, 1.25, 0.09]}><boxGeometry args={[0.03, 0.4, 0.03]} /><M color={C.white} metal={0.5} rough={0.3} /></mesh>
        <mesh position={[0.3, 1.5, 0.075]}><circleGeometry args={[0.06, 20]} /><M color={C.pinkDeep} /></mesh>
        <mesh position={[0.48, 1.38, 0.075]}><circleGeometry args={[0.045, 20]} /><M color={C.gold} /></mesh>
      </group>
      {warn && (
        <Html portal={portal as React.RefObject<HTMLElement>} position={[0, 2.35, 0]} center zIndexRange={[20, 0]}>
          <div className="scene-badge warn"><Art name="clock" size={22} /></div>
        </Html>
      )}
    </group>
  )
}

function Vacuum({ on }: { on: boolean }) {
  const C = usePal()
  const g = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    if (on) t.current += dt * 0.6
    g.current.position.set(Math.sin(t.current) * 0.8, 0.05, 2 + Math.sin(t.current * 1.7) * 1.3)
    g.current.rotation.y = -t.current * 2
  })
  return (
    <group ref={g}>
      <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.08, 28]} /><M color={C.white} /></mesh>
      <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.06, 0.06, 0.02, 16]} /><M color={on ? '#7cf0b5' : C.lilac} emissive={on ? '#3fe09a' : '#000'} ei={on ? 1.5 : 0} /></mesh>
    </group>
  )
}

function Dust({ id }: { id: string }) {
  const b = ROOM_BOUNDS[id]
  const pts = useMemo(() => Array.from({ length: 5 }, (_, i) => [b.x[0] + 0.6 + ((i * 1.37) % 1) * (b.x[1] - b.x[0] - 1.2), 0.06, b.z[0] + 0.5 + ((i * 0.71 + 0.3) % 1) * (b.z[1] - b.z[0] - 1)] as [number, number, number]), [b])
  return (
    <group>
      {pts.map((p, i) => (
        <Float key={i} speed={3} floatIntensity={0.3} rotationIntensity={0.4}>
          <mesh position={p}><icosahedronGeometry args={[0.07, 0]} /><M color="#c9bfcf" rough={1} /></mesh>
        </Float>
      ))}
    </group>
  )
}

function Furniture({ devices, onToggle, onFridge, onWardrobe, fridgeWarn, portal }: { devices: Device[]; onToggle: (id: string) => void; onFridge: () => void; onWardrobe: () => void; fridgeWarn: boolean; portal: React.RefObject<HTMLElement | null> }) {
  const C = usePal()
  const dev = (id: string) => devices.find((d) => d.id === id)
  const blinds = dev('d8')
  const speaker = dev('d2')
  const heater = dev('d5')
  return (
    <group>
      {/* ---------- living ---------- */}
      <mesh position={[-3, 0.006, -1.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.4, 48]} /><M color={C.rug} rough={1} /></mesh>
      <group position={[-3, 0, -0.75]}>
        <B p={[0, 0.22, 0]} s={[2.3, 0.3, 0.95]} c={C.sofa} r={0.1} />
        <B p={[0, 0.55, 0.36]} s={[2.3, 0.55, 0.25]} c={C.sofa} r={0.1} />
        <B p={[-1.1, 0.42, 0]} s={[0.22, 0.4, 0.95]} c={C.sofa} r={0.1} />
        <B p={[1.1, 0.42, 0]} s={[0.22, 0.4, 0.95]} c={C.sofa} r={0.1} />
        <B p={[-0.5, 0.45, 0.05]} s={[0.95, 0.16, 0.75]} c={C.sofaCushion} r={0.07} />
        <B p={[0.5, 0.45, 0.05]} s={[0.95, 0.16, 0.75]} c={C.sofaCushion} r={0.07} />
        <B p={[-0.75, 0.7, 0.18]} s={[0.36, 0.32, 0.12]} c={C.cream} r={0.06} />
        <B p={[0.8, 0.68, 0.2]} s={[0.32, 0.3, 0.12]} c={C.mint} r={0.06} />
      </group>
      <group position={[-3, 0, -1.95]}>
        <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.05, 40]} /><M color={C.white} rough={0.3} /></mesh>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.06, 0.12, 0.34, 16]} /><M color={C.gold} metal={0.5} rough={0.4} /></mesh>
        <mesh position={[0.15, 0.42, 0.05]} castShadow><cylinderGeometry args={[0.06, 0.05, 0.1, 16]} /><M color={C.pinkDeep} /></mesh>
        <mesh position={[-0.15, 0.39, -0.08]} castShadow><boxGeometry args={[0.24, 0.04, 0.18]} /><M color={C.sky} /></mesh>
      </group>
      <B p={[-3, 0.25, -3.72]} s={[1.9, 0.5, 0.42]} c={C.wood} />
      <group position={[-3, 1.1, -3.82]}>
        <B p={[0, 0, 0]} s={[1.5, 0.85, 0.06]} c={C.dark} r={0.03} />
        <mesh position={[0, 0, 0.032]}><planeGeometry args={[1.42, 0.77]} /><M color="#2a2240" emissive={speaker?.on ? '#b48cff' : '#3a2f56'} ei={speaker?.on ? 0.6 : 0.2} rough={0.2} /></mesh>
      </group>
      <group position={[-1.8, 0.5, -3.72]} onClick={(e) => { e.stopPropagation(); onToggle('d2') }}>
        <mesh castShadow><cylinderGeometry args={[0.09, 0.09, 0.22, 24]} /><M color={C.cream} /></mesh>
        <mesh position={[0, 0.115, 0]}><torusGeometry args={[0.06, 0.012, 8, 24]} /><M color={speaker?.on ? '#7fd0ff' : C.lilac} emissive="#7fd0ff" ei={speaker?.on ? 2 : 0} /></mesh>
        {speaker?.on && <Sparkles count={10} scale={[0.6, 0.6, 0.6]} position={[0, 0.3, 0]} size={3} color="#b49cff" speed={0.8} />}
      </group>
      <group position={[-5.75, 0, -2.2]}>
        <B p={[0, 0.85, 0]} s={[0.4, 1.7, 1.3]} c={C.white} />
        {[0.45, 0.95, 1.45].map((y, i) => (
          <group key={y} position={[0.06, y, 0]}>
            {[-0.4, -0.25, -0.12, 0.05, 0.22, 0.38].map((z, j) => (
              <mesh key={z} position={[0, 0.12, z]} castShadow><boxGeometry args={[0.26, 0.24 - ((i + j) % 3) * 0.03, 0.09]} /><M color={[C.pinkDeep, C.lilac, C.mint, C.peach, C.sky, C.gold][(i * 2 + j) % 6]} /></mesh>
            ))}
          </group>
        ))}
      </group>
      <Plant pos={[-5.4, 0, -3.5]} scale={1.4} />
      <Lamp pos={[-5.4, 0, -0.55]} device={dev('d1')} onToggle={() => onToggle('d1')} />
      {/* blinds on living window */}
      <group position={[-4.2, 1.95 - ((blinds?.on ? 1 : 0) * 0.45), -3.88]} onClick={(e) => { e.stopPropagation(); onToggle('d8') }}>
        <mesh scale={[1, blinds?.on ? 1 : 0.08, 1]} position={[0, blinds?.on ? -0.02 : 0.42, 0]}><boxGeometry args={[1.56, 0.95, 0.03]} /><M color={C.cream} /></mesh>
      </group>

      {/* ---------- kitchen ---------- */}
      <B p={[2.9, 0.45, -3.62]} s={[4.2, 0.9, 0.62]} c={C.white} />
      <B p={[2.9, 0.92, -3.62]} s={[4.3, 0.05, 0.68]} c="#f4e9ef" r={0.02} />
      {[1.3, 2.3, 3.3, 4.3].map((x) => <mesh key={x} position={[x, 0.55, -3.3]}><boxGeometry args={[0.3, 0.025, 0.02]} /><M color={C.gold} metal={0.5} rough={0.3} /></mesh>)}
      <B p={[2.9, 1.85, -3.78]} s={[4.2, 0.6, 0.36]} c={C.cabinets} />
      <group position={[1.6, 0.96, -3.6]}>
        <mesh><cylinderGeometry args={[0.13, 0.13, 0.015, 24]} /><M color={C.dark} /></mesh>
        <mesh position={[0.35, 0, 0]}><cylinderGeometry args={[0.13, 0.13, 0.015, 24]} /><M color={C.dark} /></mesh>
        <mesh position={[0.2, 0.09, 0.1]} castShadow><cylinderGeometry args={[0.1, 0.09, 0.15, 20]} /><M color={C.pinkDeep} /></mesh>
      </group>
      <group position={[3.6, 0.95, -3.6]}>
        <mesh><boxGeometry args={[0.6, 0.02, 0.4]} /><M color="#d8e6ef" metal={0.6} rough={0.25} /></mesh>
        <mesh position={[0, 0.18, -0.15]}><torusGeometry args={[0.1, 0.015, 8, 24, Math.PI]} /><M color="#d8e6ef" metal={0.6} rough={0.25} /></mesh>
      </group>
      <Plant pos={[4.6, 0.95, -3.6]} scale={0.45} />
      <group position={[3, 0, -1.6]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow><cylinderGeometry args={[0.6, 0.6, 0.05, 40]} /><M color={C.white} rough={0.35} /></mesh>
        <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.05, 0.25, 0.72, 20]} /><M color={C.white} /></mesh>
        {[0, 2.1, 4.2].map((a) => (
          <group key={a} position={[Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85]}>
            <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.08, 24]} /><M color={C.peach} /></mesh>
            <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.02, 0.02, 0.44]} /><M color={C.gold} metal={0.4} /></mesh>
          </group>
        ))}
        <mesh position={[0.1, 0.83, 0.1]} castShadow><sphereGeometry args={[0.08, 16, 12]} /><M color="#ff7b8f" /></mesh>
        <mesh position={[-0.05, 0.82, 0.18]} castShadow><sphereGeometry args={[0.07, 16, 12]} /><M color="#ffd36e" /></mesh>
      </group>
      <Lamp kind="pendant" pos={[3, 2.0, -1.6]} device={dev('d3')} onToggle={() => onToggle('d3')} />
      <Fridge onOpen={onFridge} warn={fridgeWarn} portal={portal} />

      {/* ---------- bedroom ---------- */}
      <group position={[-4.3, 0, 1.25]}>
        <B p={[0, 0.2, 0]} s={[1.7, 0.4, 2.1]} c={C.woodDark} r={0.06} />
        <B p={[0, 0.45, 0.05]} s={[1.6, 0.18, 2]} c={C.white} r={0.08} />
        <B p={[0, 0.58, 0.35]} s={[1.66, 0.1, 1.45]} c={C.blanket} r={0.05} />
        <B p={[-0.4, 0.62, -0.72]} s={[0.62, 0.16, 0.38]} c={C.cream} r={0.08} />
        <B p={[0.4, 0.62, -0.72]} s={[0.62, 0.16, 0.38]} c={C.cream} r={0.08} />
        <B p={[0, 0.75, -1.02]} s={[1.7, 1.1, 0.1]} c={C.lilac} r={0.05} />
        <B p={[0.3, 0.68, 0.6]} s={[0.4, 0.12, 0.3]} c={C.mint} r={0.06} />
      </group>
      <B p={[-5.45, 0.28, 0.45]} s={[0.45, 0.56, 0.45]} c={C.white} />
      <B p={[-3.15, 0.28, 0.45]} s={[0.45, 0.56, 0.45]} c={C.white} />
      <Lamp kind="table" pos={[-3.15, 0.56, 0.45]} device={dev('d4')} onToggle={() => onToggle('d4')} />
      <group position={[-5.6, 0, 3.15]} onClick={(e) => { e.stopPropagation(); onWardrobe() }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
        <B p={[0, 1, 0]} s={[0.65, 2, 1.4]} c={C.white} r={0.05} />
        <mesh position={[0.33, 1, 0]}><boxGeometry args={[0.01, 1.9, 0.01]} /><M color={C.wallTop} /></mesh>
        <mesh position={[0.34, 1.05, -0.08]}><boxGeometry args={[0.03, 0.25, 0.03]} /><M color={C.gold} metal={0.5} /></mesh>
        <mesh position={[0.34, 1.05, 0.08]}><boxGeometry args={[0.03, 0.25, 0.03]} /><M color={C.gold} metal={0.5} /></mesh>
        <Html portal={portal as React.RefObject<HTMLElement>} position={[0.4, 2.25, 0]} center zIndexRange={[20, 0]}><div className="scene-badge"><Art name="dress" size={22} /></div></Html>
      </group>
      <group position={[-2.2, 0, 3.6]}>
        <B p={[0, 0.38, 0]} s={[1.0, 0.06, 0.45]} c={C.white} />
        {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 0.18, 0]}><cylinderGeometry args={[0.02, 0.02, 0.36]} /><M color={C.gold} metal={0.4} /></mesh>)}
        <mesh position={[0, 0.85, 0.15]}><torusGeometry args={[0.3, 0.03, 12, 40]} /><M color={C.gold} metal={0.5} rough={0.3} /></mesh>
        <mesh position={[0, 0.85, 0.16]}><circleGeometry args={[0.28, 32]} /><M color="#f0f7ff" metal={0.7} rough={0.05} /></mesh>
        <mesh position={[0.3, 0.46, -0.05]}><cylinderGeometry args={[0.03, 0.03, 0.1, 12]} /><M color={C.pinkDeep} /></mesh>
        <mesh position={[0.18, 0.44, 0]}><cylinderGeometry args={[0.04, 0.04, 0.06, 12]} /><M color={C.lilac} /></mesh>
      </group>
      <group position={[-1.75, 0.55, 3.0]} rotation={[0, Math.PI / 2, 0]}>
        <B p={[0, 0, 0]} s={[0.7, 0.45, 0.08]} c={heater?.on ? '#ffd7c4' : C.white} r={0.03} emissive="#ff9a6b" ei={heater?.on ? 0.25 : 0} />
      </group>
      <mesh position={[-4.3, 0.006, 3.0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 40]} /><M color={C.cream} rough={1} /></mesh>

      {/* ---------- hall ---------- */}
      <mesh position={[0, 0.006, 2.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.0, 3.2]} /><M color={C.peach} rough={1} /></mesh>
      <group position={[1.15, 0, 1.0]}>
        <B p={[0, 0.25, 0]} s={[0.4, 0.5, 1.0]} c={C.white} />
        {[-0.3, 0, 0.3].map((z, i) => <B key={z} p={[0, 0.55, z]} s={[0.22, 0.1, 0.12]} c={[C.pinkDeep, C.white, C.lilac][i]} r={0.04} />)}
      </group>
      <group position={[-1.38, 1.05, 2.1]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[0.5, 1.3]} /><M color="#eef6ff" metal={0.7} rough={0.05} /></mesh>
      </group>
      <Plant pos={[-1.15, 0, 3.6]} scale={0.8} />
      <Vacuum on={!!dev('d6')?.on} />

      {/* ---------- bath ---------- */}
      <group position={[4.7, 0, 0.55]}>
        <B p={[0, 0.3, 0]} s={[2.0, 0.6, 0.9]} c={C.white} r={0.25} />
        <mesh position={[0, 0.52, 0]}><boxGeometry args={[1.7, 0.08, 0.62]} /><M color="#bfe6ff" rough={0.1} emissive="#bfe6ff" ei={0.15} /></mesh>
        {[[-0.4, 0.62, 0.1], [-0.2, 0.64, -0.1], [0.1, 0.63, 0.05]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}><sphereGeometry args={[0.08, 12, 10]} /><M color={C.white} opacity={0.85} /></mesh>
        ))}
        <mesh position={[-0.6, 0.66, -0.2]} castShadow><sphereGeometry args={[0.07, 16, 12]} /><M color="#ffe066" /></mesh>
      </group>
      <group position={[1.85, 0, 2.0]}>
        <B p={[0, 0.45, 0]} s={[0.5, 0.9, 0.8]} c={C.white} />
        <mesh position={[0.02, 0.92, 0]}><cylinderGeometry args={[0.2, 0.17, 0.08, 24]} /><M color="#f5fbff" rough={0.15} /></mesh>
      </group>
      <group position={[1.6, 1.5, 2.0]} rotation={[0, Math.PI / 2, 0]}>
        <Lamp kind="mirror" pos={[0, 0, 0]} device={dev('d7')} onToggle={() => onToggle('d7')} />
      </group>
      <group position={[5.5, 0, 3.3]}>
        <B p={[0, 0.22, 0]} s={[0.4, 0.44, 0.55]} c={C.white} r={0.15} />
        <B p={[0.15, 0.55, 0]} s={[0.15, 0.5, 0.45]} c={C.white} r={0.06} />
      </group>
      <mesh position={[3.4, 0.006, 2.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.9, 0.6]} /><M color={C.pink} rough={1} /></mesh>
      <Plant pos={[2.2, 0, 3.6]} scale={0.7} />
    </group>
  )
}

export interface ApartmentHandle { focus: (id: string | null) => void }

interface Props {
  rooms: Room[]
  devices: Device[]
  selected: string | null
  onSelect: (id: string | null) => void
  onToggle: (id: string) => void
  onFridge: () => void
  onWardrobe: () => void
  fridgeWarn: boolean
  night: boolean
  cleanliness: (r: Room) => number
  portal: React.RefObject<HTMLElement | null>
  theme: keyof typeof PALETTES
}

const HOME_VIEW = { pos: [9, 11, 12] as const, target: [0, 0, 0.3] as const }
const zoomFor = (aspect: number) => (aspect < 0.8 ? 1.42 : aspect < 1.2 ? 1.2 : 1)

/** Keeps the default framing right for the canvas aspect (portrait phones need the camera further back). */
function Rig({ cc, aspect, selected }: { cc: React.RefObject<CameraControls | null>; aspect: React.MutableRefObject<number>; selected: string | null }) {
  const size = useThree((s) => s.size)
  useEffect(() => {
    const first = aspect.current === 0
    aspect.current = size.width / Math.max(1, size.height)
    if (!cc.current || selected) return
    const k = zoomFor(aspect.current)
    void cc.current.setLookAt(HOME_VIEW.pos[0] * k, HOME_VIEW.pos[1] * k, HOME_VIEW.pos[2] * k, ...HOME_VIEW.target, !first)
  }, [size.width, size.height])
  return null
}

export const Apartment = forwardRef<ApartmentHandle, Props>(function Apartment(props, ref) {
  const cc = useRef<CameraControls>(null)
  const [hover, setHover] = useState<string | null>(null)
  const aspect = useRef(0)
  const P = PALETTES[props.theme]
  useImperativeHandle(ref, () => ({
    focus: (id) => {
      if (!cc.current) return
      const k = zoomFor(aspect.current || 1)
      if (!id) { void cc.current.setLookAt(HOME_VIEW.pos[0] * k, HOME_VIEW.pos[1] * k, HOME_VIEW.pos[2] * k, ...HOME_VIEW.target, true); return }
      const c = center(id)
      const f = Math.min(k, 1.4)
      void cc.current.setLookAt(c.x + 3.2 * f, 6.2 * f, c.z + 5.2 * f, c.x, 0.3, c.z, true)
    },
  }))
  useEffect(() => { if (cc.current) cc.current.smoothTime = 0.45 }, [])

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [...HOME_VIEW.pos], fov: 40 }} onPointerMissed={() => props.onSelect(null)}>
      <PalCtx.Provider value={P}>
      <color attach="background" args={[props.night ? '#160f24' : P.bg]} />
      <fog attach="fog" args={[props.night ? '#160f24' : P.bg, 34, 70]} />
      <hemisphereLight args={[props.night ? '#6a5aa8' : P.hemiSky, props.night ? '#1a1030' : P.hemiGround, props.night ? 0.35 : 1.0]} />
      <directionalLight
        position={[-6, 12, 8]}
        intensity={props.night ? 0.25 : 1.6}
        color={props.night ? '#9fb4ff' : '#fff1e6'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <CameraControls ref={cc} minDistance={4} maxDistance={34} maxPolarAngle={Math.PI / 2.3} minPolarAngle={0.2} />
      <Rig cc={cc} aspect={aspect} selected={props.selected} />

      <group>
        {/* base slab */}
        <RoundedBox args={[12.6, 0.3, 8.6]} radius={0.12} position={[0, -0.16, 0]} receiveShadow>
          <M color={props.night ? '#2c1f40' : P.slab} />
        </RoundedBox>
        {Object.keys(ROOM_BOUNDS).map((id) => (
          <Floor key={id} id={id} hovered={hover === id} selected={props.selected === id} onHover={setHover} onSelect={props.onSelect} />
        ))}
        <Walls />
        <Furniture devices={props.devices} onToggle={props.onToggle} onFridge={props.onFridge} onWardrobe={props.onWardrobe} fridgeWarn={props.fridgeWarn} portal={props.portal} />
        {props.rooms.map((r) => props.cleanliness(r) < 45 && <Dust key={r.id} id={r.id} />)}
        {props.rooms.map((r) => {
          const c = center(r.id)
          const clean = props.cleanliness(r)
          const open = r.needs.filter((n) => !n.done).length
          return (
            <Html portal={props.portal as React.RefObject<HTMLElement>} key={r.id} position={[c.x, 2.0, c.z]} center zIndexRange={[30, 0]}>
              <button className={`room-tag ${props.selected === r.id ? 'sel' : ''}`} onClick={() => props.onSelect(r.id)}>
                <Art name={ROOM_ICON[r.kind]} size={20} />
                <b>{r.name}</b>
                <i style={{ background: clean > 66 ? '#3fc796' : clean > 33 ? '#ffb84d' : '#ef5a7a' }} />
                {open > 0 && <em>{open}</em>}
              </button>
            </Html>
          )
        })}
        {!props.night && <Sparkles count={30} scale={[12, 3, 8]} position={[0, 1.6, 0]} size={2.2} color={P.sparkle} speed={0.25} opacity={0.6} />}
        {props.night && <Sparkles count={50} scale={[12, 4, 8]} position={[0, 2, 0]} size={2.5} color="#b8a4ff" speed={0.3} />}
      </group>
      <ContactShadows position={[0, -0.3, 0]} opacity={0.35} scale={22} blur={2.6} far={4} color={P.shadow} />
      </PalCtx.Provider>
    </Canvas>
  )
})
