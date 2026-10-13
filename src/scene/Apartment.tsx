import { CameraControls, CameraControlsImpl, Float, Html, RoundedBox, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Device, FloorPlan, Room, RoomRect } from '../game/types'
import { DEFAULT_RECTS, ROOM_ICON } from '../data/home'
import { Art } from '../art/Art'

/* =====================================================================
   The apartment is generated from room rectangles (metres on the floor plan):
   floors, walls with doors and windows, and furniture that fits each room type.
   ===================================================================== */

const C = {
  wall: '#141b2b', slab: '#070b15', floor: '#0f1524', floor2: '#121a2c', tile: '#16203a',
  woodD: '#261e19', fabric: '#222c46', fabric2: '#2c3858', cushion: '#34406a', white: '#c3cddf', metal: '#8a97ad',
  dark: '#06080f', screen: '#0b1830', leaf: '#2f9f78', leaf2: '#3fc796', pot: '#2a3146', rug: '#151f38', rug2: '#1b1640', warm: '#ffd59a',
}

export interface ApartmentHandle { focus: (id: string | null) => void }

interface Props {
  rooms: Room[]
  devices: Device[]
  plan?: FloorPlan
  selected: string | null
  onSelect: (id: string | null) => void
  onToggle: (id: string) => void
  onFridge: () => void
  onWardrobe: () => void
  fridgeWarn: boolean
  night: boolean
  cleanliness: (r: Room) => number
  portal: React.RefObject<HTMLElement | null>
  accent: string
  /** fullscreen: one finger orbits freely and the wheel zooms; inline: vertical swipes scroll the page */
  immersive?: boolean
}

/* ---------------------------------------------------------------- layout */

export function rectsOf(rooms: Room[]) {
  const out = new Map<string, RoomRect>()
  let cursor = 0
  rooms.forEach((r) => {
    const rect = r.rect ?? DEFAULT_RECTS[r.id] ?? { x: 13 + cursor, z: 0, w: 3.5, d: 3.5 }
    if (!r.rect && !DEFAULT_RECTS[r.id]) cursor += 3.6
    out.set(r.id, rect)
  })
  return out
}

export function boundsOf(rects: Iterable<RoomRect>) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const r of rects) { minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w); minZ = Math.min(minZ, r.z); maxZ = Math.max(maxZ, r.z + r.d) }
  if (!isFinite(minX)) { minX = 0; maxX = 10; minZ = 0; maxZ = 8 }
  return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ }
}

interface Seg { a: [number, number]; b: [number, number]; kind: 'tall' | 'low' | 'inner'; window?: boolean; door?: boolean }

/** Splits every room edge into shared (interior) and free (exterior) parts. */
export function wallsOf(rects: RoomRect[]): Seg[] {
  const segs: Seg[] = []
  const E = 0.06
  type Edge = { axis: 'x' | 'z'; at: number; from: number; to: number; out: -1 | 1 }
  const edges = (r: RoomRect): Edge[] => [
    { axis: 'z', at: r.z, from: r.x, to: r.x + r.w, out: -1 }, { axis: 'z', at: r.z + r.d, from: r.x, to: r.x + r.w, out: 1 },
    { axis: 'x', at: r.x, from: r.z, to: r.z + r.d, out: -1 }, { axis: 'x', at: r.x + r.w, from: r.z, to: r.z + r.d, out: 1 },
  ]
  rects.forEach((r, i) => {
    for (const e of edges(r)) {
      const shared: { from: number; to: number; j: number }[] = []
      rects.forEach((o, j) => {
        if (j === i) return
        for (const f of edges(o)) {
          if (f.axis !== e.axis || f.out === e.out || Math.abs(f.at - e.at) > E) continue
          const from = Math.max(e.from, f.from), to = Math.min(e.to, f.to)
          if (to - from > E) shared.push({ from, to, j })
        }
      })
      shared.sort((p, q) => p.from - q.from)
      const pt = (t: number): [number, number] => (e.axis === 'z' ? [t, e.at] : [e.at, t])
      let cur = e.from
      const free = (from: number, to: number) => {
        if (to - from < E) return
        const tall = e.out === -1
        segs.push({ a: pt(from), b: pt(to), kind: tall ? 'tall' : 'low', window: tall && to - from >= 2.2 })
      }
      for (const s of shared) {
        free(cur, s.from)
        if (i < s.j) segs.push({ a: pt(s.from), b: pt(s.to), kind: 'inner', door: s.to - s.from >= 1.2 })
        cur = Math.max(cur, s.to)
      }
      free(cur, e.to)
    }
  })
  return segs
}

/* ---------------------------------------------------------------- primitives */

function M({ color, rough = 0.8, emissive, ei = 0, metal = 0, opacity }: { color: string; rough?: number; emissive?: string; ei?: number; metal?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={ei} transparent={opacity != null} opacity={opacity ?? 1} />
}

function B({ p, s, c, r = 0.04, onClick, children, ...rest }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; onClick?: (e: ThreeEvent<MouseEvent>) => void; children?: ReactNode; rough?: number; ei?: number; emissive?: string; metal?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(r, ...s.map((v) => v / 2 - 0.001))} smoothness={3} position={p} castShadow receiveShadow onClick={onClick}>
      {children ?? <M color={c} rough={rest.rough} emissive={rest.emissive} ei={rest.ei} metal={rest.metal} />}
    </RoundedBox>
  )
}

const click = (fn?: () => void) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); fn?.() }
const hoverCursor = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
  onPointerOut: () => { document.body.style.cursor = '' },
}

function Floor({ rect, accent, hovered, selected, tiled, onHover, onSelect, dim }: { rect: RoomRect; accent: string; hovered: boolean; selected: boolean; tiled: boolean; dim: boolean; onHover: (v: boolean) => void; onSelect: () => void }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const lines = useRef<THREE.MeshBasicMaterial[]>([])
  const tex = useMemo(() => {
    if (!tiled) return null
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = C.floor2; g.fillRect(0, 0, 64, 64)
    g.fillStyle = C.tile; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(rect.w * 1.6, rect.d * 1.6)
    return t
  }, [tiled, rect.w, rect.d])
  useFrame(() => {
    const target = selected ? 0.32 : hovered ? 0.14 : 0
    if (mat.current) mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.15
    const o = selected ? 1 : hovered ? 0.8 : 0.4
    lines.current.forEach((m) => { if (m) m.opacity += (o - m.opacity) * 0.15 })
  })
  const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2
  const e = 0.025
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.001, cz]} receiveShadow
        onPointerOver={(ev) => { ev.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = '' }}
        onClick={(ev) => { ev.stopPropagation(); onSelect() }}>
        <planeGeometry args={[rect.w - 0.02, rect.d - 0.02]} />
        <meshStandardMaterial ref={mat} color={tex ? '#ffffff' : C.floor} map={tex ?? undefined} roughness={0.7} metalness={0.1} emissive={accent} emissiveIntensity={0} transparent={dim} opacity={dim ? 0.55 : 1} />
      </mesh>
      {/* glowing room outline, like a dungeon map */}
      {[[cx, rect.z + e, rect.w, e * 2], [cx, rect.z + rect.d - e, rect.w, e * 2], [rect.x + e, cz, e * 2, rect.d], [rect.x + rect.w - e, cz, e * 2, rect.d]].map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, z]}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial ref={(m) => { if (m) lines.current[i] = m }} color={accent} transparent opacity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

const WALL_T = 0.12
function Wall({ seg, accent }: { seg: Seg; accent: string }) {
  const h = seg.kind === 'tall' ? 2.3 : seg.kind === 'inner' ? 1.05 : 0.3
  const len = Math.hypot(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1])
  const ang = Math.atan2(seg.b[1] - seg.a[1], seg.b[0] - seg.a[0])
  const mid: [number, number] = [(seg.a[0] + seg.b[0]) / 2, (seg.a[1] + seg.b[1]) / 2]
  const pieces: [number, number][] = seg.door ? [[-len / 2, -0.45], [0.45, len / 2]] : [[-len / 2, len / 2]]
  return (
    <group position={[mid[0], 0, mid[1]]} rotation={[0, -ang, 0]}>
      {pieces.map(([p0, p1], i) => {
        const l = p1 - p0
        if (l < 0.05) return null
        return (
          <group key={i} position={[(p0 + p1) / 2, 0, 0]}>
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[l + WALL_T, h, WALL_T]} /><M color={C.wall} rough={0.9} /></mesh>
            <mesh position={[0, h + 0.006, 0]}><boxGeometry args={[l + WALL_T, 0.012, WALL_T + 0.004]} /><meshBasicMaterial color={accent} toneMapped={false} /></mesh>
          </group>
        )
      })}
      {seg.window && (
        <group position={[0, 1.45, WALL_T / 2 + 0.005]}>
          <mesh><boxGeometry args={[Math.min(1.6, len - 0.8), 0.95, 0.02]} /><M color="#0e2a52" emissive="#2d7dd6" ei={0.55} rough={0.15} /></mesh>
          <mesh position={[0, 0, 0.012]}><boxGeometry args={[0.03, 0.95, 0.01]} /><M color={C.metal} /></mesh>
          <mesh position={[0, -0.5, 0.05]}><boxGeometry args={[Math.min(1.7, len - 0.7), 0.04, 0.12]} /><M color={C.metal} /></mesh>
        </group>
      )}
    </group>
  )
}

function Lamp({ pos, device, onToggle, kind = 'floor' }: { pos: [number, number, number]; device?: Device; onToggle?: () => void; kind?: 'floor' | 'pendant' | 'table' | 'mirror' | 'desk' }) {
  const on = !!device?.on
  const intensity = on ? ((device?.value ?? 100) / 100) * 4.5 : 0
  const light = <pointLight intensity={intensity} distance={5} decay={1.5} color="#ffd9b0" />
  const bulb = <M color={on ? '#fff3d6' : '#3a4256'} emissive={C.warm} ei={on ? 2.4 : 0} />
  const props = { position: pos, onClick: click(onToggle), ...hoverCursor }
  if (kind === 'pendant')
    return (
      <group {...props}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.01, 0.01, 1]} /><M color={C.dark} /></mesh>
        <mesh><sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><M color={C.fabric2} metal={0.4} rough={0.4} /></mesh>
        <mesh position={[0, -0.02, 0]}><sphereGeometry args={[0.08, 16, 16]} />{bulb}</mesh>
        <group position={[0, -0.3, 0]}>{light}</group>
      </group>
    )
  if (kind === 'table' || kind === 'desk')
    return (
      <group {...props}>
        <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.05, 0.07, 0.16, 16]} /><M color={C.metal} metal={0.6} rough={0.35} /></mesh>
        <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.09, 0.15, 0.2, 20, 1, true]} /><meshStandardMaterial color={C.white} side={THREE.DoubleSide} emissive={C.warm} emissiveIntensity={on ? 0.9 : 0} /></mesh>
        <group position={[0, 0.3, 0]}>{light}</group>
      </group>
    )
  if (kind === 'mirror')
    return (
      <group {...props}>
        <mesh><torusGeometry args={[0.32, 0.03, 12, 40]} />{bulb}</mesh>
        <mesh><circleGeometry args={[0.3, 32]} /><M color="#9fb6d6" rough={0.05} metal={0.8} /></mesh>
        <group position={[0, 0, 0.3]}>{light}</group>
      </group>
    )
  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.18, 0.2, 0.04, 24]} /><M color={C.metal} metal={0.6} rough={0.35} /></mesh>
      <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.015, 0.015, 1.5]} /><M color={C.metal} metal={0.6} rough={0.35} /></mesh>
      <mesh position={[0, 1.55, 0]}><cylinderGeometry args={[0.16, 0.26, 0.3, 24, 1, true]} /><meshStandardMaterial color={C.white} side={THREE.DoubleSide} emissive={C.warm} emissiveIntensity={on ? 0.9 : 0} /></mesh>
      <group position={[0, 1.45, 0]}>{light}</group>
    </group>
  )
}

function Plant({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.02}>
      <group position={pos} scale={scale}>
        <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.18, 0.14, 0.36, 20]} /><M color={C.pot} /></mesh>
        {[[0, 0.55, 0, 0.22], [0.12, 0.7, 0.05, 0.17], [-0.1, 0.72, -0.06, 0.16], [0.02, 0.86, 0.02, 0.14]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow><sphereGeometry args={[r, 16, 12]} /><M color={i % 2 ? C.leaf2 : C.leaf} /></mesh>
        ))}
      </group>
    </Float>
  )
}

function Fridge({ pos, onOpen, warn, portal }: { pos: [number, number, number]; onOpen: () => void; warn: boolean; portal: React.RefObject<HTMLElement | null> }) {
  const door = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  useFrame(() => {
    if (!door.current) return
    door.current.rotation.y += ((hover ? -0.7 : 0) - door.current.rotation.y) * 0.12
  })
  return (
    <group position={pos}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      onClick={click(onOpen)}>
      <B p={[0, 1, 0]} s={[0.78, 2, 0.72]} c="#1d2638" r={0.06} metal={0.4} rough={0.35} />
      <mesh position={[0, 1.2, 0.3]}><boxGeometry args={[0.66, 1.3, 0.1]} /><M color="#ffffff" emissive="#bfe4ff" ei={hover ? 1.2 : 0} /></mesh>
      <group ref={door} position={[-0.38, 0, 0.37]}>
        <B p={[0.38, 1.25, 0.03]} s={[0.76, 1.42, 0.07]} c="#263149" r={0.04} metal={0.4} rough={0.3} />
        <B p={[0.38, 0.3, 0.03]} s={[0.76, 0.5, 0.07]} c="#263149" r={0.04} metal={0.4} rough={0.3} />
        <mesh position={[0.68, 1.25, 0.09]}><boxGeometry args={[0.03, 0.4, 0.03]} /><M color={C.metal} metal={0.7} rough={0.25} /></mesh>
        <mesh position={[0.45, 1.6, 0.075]}><planeGeometry args={[0.16, 0.06]} /><meshBasicMaterial color="#4cc9ff" toneMapped={false} /></mesh>
      </group>
      {warn && (
        <Html portal={portal as React.RefObject<HTMLElement>} position={[0, 2.35, 0]} center zIndexRange={[20, 0]}>
          <div className="scene-badge warn"><Art name="clock" size={22} /></div>
        </Html>
      )}
    </group>
  )
}

function Vacuum({ rect, on }: { rect: RoomRect; on: boolean }) {
  const g = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    if (on) t.current += dt * 0.6
    const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2
    g.current.position.set(cx + Math.sin(t.current) * (rect.w / 2 - 0.5), 0.05, cz + Math.sin(t.current * 1.7) * (rect.d / 2 - 0.5))
    g.current.rotation.y = -t.current * 2
  })
  return (
    <group ref={g}>
      <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.08, 28]} /><M color="#1c2436" metal={0.3} /></mesh>
      <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.06, 0.06, 0.02, 16]} /><M color={on ? '#3fe0b0' : '#2a3350'} emissive="#3fe0b0" ei={on ? 2 : 0} /></mesh>
    </group>
  )
}

function Dust({ rect }: { rect: RoomRect }) {
  const pts = useMemo(() => Array.from({ length: 5 }, (_, i) => [rect.x + 0.6 + ((i * 1.37) % 1) * Math.max(0.1, rect.w - 1.2), 0.06, rect.z + 0.5 + ((i * 0.71 + 0.3) % 1) * Math.max(0.1, rect.d - 1)] as [number, number, number]), [rect])
  return (
    <group>
      {pts.map((p, i) => (
        <Float key={i} speed={3} floatIntensity={0.3} rotationIntensity={0.4}>
          <mesh position={p}><icosahedronGeometry args={[0.07, 0]} /><M color="#ff5470" emissive="#ff3b5c" ei={0.6} rough={1} /></mesh>
        </Float>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- furniture per room type */

interface FurnProps {
  rect: RoomRect; devices: Device[]; onToggle: (id: string) => void
  onFridge: () => void; onWardrobe: () => void; fridgeWarn: boolean; hasFridge: boolean; portal: React.RefObject<HTMLElement | null>
}

/** Devices without a dedicated spot: extra lights hang from the ceiling, plugs sit at the wall. */
function DeviceExtras({ rect, devices, onToggle, used }: { rect: RoomRect; devices: Device[]; onToggle: (id: string) => void; used: Set<string> }) {
  const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2
  return (
    <>
      {devices.filter((d) => !used.has(d.id)).map((d, i) => {
        const off = (i - 0.5) * 0.9
        if (d.kind === 'light') return <Lamp key={d.id} kind="pendant" pos={[cx + off, 2.0, cz - 0.4]} device={d} onToggle={() => onToggle(d.id)} />
        if (d.kind === 'vacuum') return <group key={d.id} onClick={click(() => onToggle(d.id))}><Vacuum rect={rect} on={d.on} /></group>
        if (d.kind === 'thermostat')
          return <B key={d.id} p={[rect.x + rect.w - 0.1, 0.5, cz + off]} s={[0.08, 0.45, 0.7]} c={d.on ? '#3a2018' : '#1b2233'} r={0.03} emissive="#ff6b3d" ei={d.on ? 0.5 : 0} onClick={click(() => onToggle(d.id))} />
        if (d.kind === 'speaker')
          return (
            <group key={d.id} position={[rect.x + 0.35, 0, rect.z + rect.d - 0.35 + off * 0.2]} onClick={click(() => onToggle(d.id))} {...hoverCursor}>
              <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.24, 24]} /><M color="#1b2233" /></mesh>
              <mesh position={[0, 0.25, 0]}><torusGeometry args={[0.06, 0.012, 8, 24]} /><M color="#2a3350" emissive="#4cc9ff" ei={d.on ? 2.4 : 0} /></mesh>
            </group>
          )
        if (d.kind === 'blinds') return null
        return (
          <group key={d.id} position={[cx + off, 0.25, rect.z + rect.d - 0.08]} onClick={click(() => onToggle(d.id))} {...hoverCursor}>
            <mesh><boxGeometry args={[0.12, 0.12, 0.05]} /><M color="#1b2233" /></mesh>
            <mesh position={[0, 0, 0.03]}><circleGeometry args={[0.025, 16]} /><meshBasicMaterial color={d.on ? '#3fe0b0' : '#33405e'} toneMapped={false} /></mesh>
          </group>
        )
      })}
    </>
  )
}

function pick(devices: Device[], kind: Device['kind'], used: Set<string>) {
  const d = devices.find((x) => x.kind === kind && !used.has(x.id))
  if (d) used.add(d.id)
  return d
}

function Living({ rect, devices, onToggle }: FurnProps) {
  const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2
  const sofaW = Math.min(2.3, rect.w - 1.2)
  const used = new Set<string>()
  const lamp = pick(devices, 'light', used)
  const speaker = pick(devices, 'speaker', used)
  const blinds = pick(devices, 'blinds', used)
  const sofaZ = cz + Math.min(rect.d * 0.3, 1.3)
  const big = rect.w >= 3.4 && rect.d >= 3
  const boardW = Math.min(1.9, rect.w - 1)
  return (
    <group>
      <mesh position={[cx, 0.008, cz - 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[Math.min(1.4, Math.min(rect.w, rect.d) / 2.8), 48]} /><M color={C.rug} rough={1} /></mesh>
      {sofaW > 1.2 && (
        <group position={[cx, 0, sofaZ]}>
          <B p={[0, 0.22, 0]} s={[sofaW, 0.3, 0.95]} c={C.fabric} r={0.1} />
          <B p={[0, 0.55, 0.36]} s={[sofaW, 0.55, 0.25]} c={C.fabric} r={0.1} />
          <B p={[-sofaW / 2, 0.42, 0]} s={[0.22, 0.4, 0.95]} c={C.fabric} r={0.1} />
          <B p={[sofaW / 2, 0.42, 0]} s={[0.22, 0.4, 0.95]} c={C.fabric} r={0.1} />
          <B p={[-sofaW / 4, 0.45, 0.05]} s={[sofaW / 2 - 0.12, 0.16, 0.75]} c={C.cushion} r={0.07} />
          <B p={[sofaW / 4, 0.45, 0.05]} s={[sofaW / 2 - 0.12, 0.16, 0.75]} c={C.cushion} r={0.07} />
          <B p={[-sofaW / 3, 0.7, 0.18]} s={[0.36, 0.32, 0.12]} c="#3b2f6e" r={0.06} />
        </group>
      )}
      <group position={[cx, 0, cz - 0.15]}>
        <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.45, 0.45, 0.04, 40]} /><M color="#1a2236" metal={0.5} rough={0.25} /></mesh>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.05, 0.1, 0.34, 16]} /><M color={C.metal} metal={0.6} rough={0.35} /></mesh>
        <mesh position={[0.12, 0.42, 0.05]} castShadow><cylinderGeometry args={[0.05, 0.04, 0.1, 16]} /><M color="#2a3350" emissive="#4cc9ff" ei={0.4} /></mesh>
      </group>
      <B p={[cx, 0.25, rect.z + 0.3]} s={[boardW, 0.5, 0.42]} c={C.woodD} />
      <group position={[cx, 1.1, rect.z + 0.16]}>
        <B p={[0, 0, 0]} s={[Math.min(1.5, rect.w - 1.2), 0.85, 0.06]} c={C.dark} r={0.02} />
        <mesh position={[0, 0, 0.032]}><planeGeometry args={[Math.min(1.42, rect.w - 1.28), 0.77]} /><M color={C.screen} emissive={speaker?.on ? '#7b56ff' : '#1e3a6a'} ei={speaker?.on ? 0.9 : 0.35} rough={0.2} /></mesh>
      </group>
      {speaker && (
        <group position={[cx + boardW / 2 + 0.2, 0.5, rect.z + 0.3]} onClick={click(() => onToggle(speaker.id))} {...hoverCursor}>
          <mesh castShadow><cylinderGeometry args={[0.09, 0.09, 0.22, 24]} /><M color="#1b2233" /></mesh>
          <mesh position={[0, 0.115, 0]}><torusGeometry args={[0.06, 0.012, 8, 24]} /><M color="#2a3350" emissive="#4cc9ff" ei={speaker.on ? 2.4 : 0} /></mesh>
          {speaker.on && <Sparkles count={10} scale={[0.6, 0.6, 0.6]} position={[0, 0.3, 0]} size={3} color="#a98bff" speed={0.8} />}
        </group>
      )}
      {big && (
        <group position={[rect.x + 0.25, 0, rect.z + rect.d * 0.45]}>
          <B p={[0, 0.85, 0]} s={[0.4, 1.7, 1.3]} c={C.woodD} />
          {[0.45, 0.95, 1.45].map((y, i) => (
            <group key={y} position={[0.06, y, 0]}>
              {[-0.4, -0.25, -0.12, 0.05, 0.22, 0.38].map((z, j) => (
                <mesh key={z} position={[0, 0.12, z]} castShadow><boxGeometry args={[0.26, 0.24 - ((i + j) % 3) * 0.03, 0.09]} /><M color={['#2f86ff', '#7b56ff', '#3fe0b0', '#ff8f3d', '#c3cddf', '#f5c451'][(i * 2 + j) % 6]} /></mesh>
              ))}
            </group>
          ))}
        </group>
      )}
      <Plant pos={[rect.x + 0.55, 0, rect.z + 0.5]} scale={1.3} />
      {lamp && <Lamp pos={[rect.x + 0.6, 0, rect.z + rect.d - 0.55]} device={lamp} onToggle={() => onToggle(lamp.id)} />}
      {blinds && (
        <group position={[cx, 1.95 - (blinds.on ? 0.45 : 0), rect.z + 0.12]} onClick={click(() => onToggle(blinds.id))}>
          <mesh scale={[1, blinds.on ? 1 : 0.08, 1]} position={[0, blinds.on ? -0.02 : 0.42, 0]}><boxGeometry args={[Math.min(1.6, rect.w - 0.8), 0.95, 0.03]} /><M color="#1a2236" /></mesh>
        </group>
      )}
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={used} />
    </group>
  )
}

function Kitchen({ rect, devices, onToggle, onFridge, fridgeWarn, hasFridge, portal }: FurnProps) {
  const cx = rect.x + rect.w / 2
  const fridgeRoom = hasFridge && rect.w >= 2.4
  const L = Math.max(1.2, Math.min(rect.w - (fridgeRoom ? 1.5 : 0.6), 4.2))
  const x0 = rect.x + 0.3
  const used = new Set<string>()
  const lamp = pick(devices, 'light', used)
  const table = rect.d >= 3
  const tz = rect.z + Math.max(1.6, rect.d * 0.6)
  return (
    <group>
      <B p={[x0 + L / 2, 0.45, rect.z + 0.38]} s={[L, 0.9, 0.62]} c="#1a2236" />
      <B p={[x0 + L / 2, 0.92, rect.z + 0.38]} s={[L + 0.08, 0.05, 0.68]} c="#2a3350" r={0.02} metal={0.3} rough={0.3} />
      <mesh position={[x0 + L / 2, 0.955, rect.z + 0.71]}><boxGeometry args={[L + 0.08, 0.01, 0.01]} /><meshBasicMaterial color="#4cc9ff" toneMapped={false} /></mesh>
      <B p={[x0 + L / 2, 1.85, rect.z + 0.22]} s={[L, 0.6, 0.36]} c="#161d2e" />
      <group position={[x0 + 0.5, 0.96, rect.z + 0.4]}>
        <mesh><cylinderGeometry args={[0.13, 0.13, 0.015, 24]} /><M color={C.dark} emissive="#ff4d2e" ei={0.25} /></mesh>
        <mesh position={[0.35, 0, 0]}><cylinderGeometry args={[0.13, 0.13, 0.015, 24]} /><M color={C.dark} /></mesh>
        <mesh position={[0.2, 0.09, 0.1]} castShadow><cylinderGeometry args={[0.1, 0.09, 0.15, 20]} /><M color={C.metal} metal={0.7} rough={0.25} /></mesh>
      </group>
      {L > 2.4 && (
        <group position={[x0 + L - 0.8, 0.95, rect.z + 0.4]}>
          <mesh><boxGeometry args={[0.6, 0.02, 0.4]} /><M color="#5c6a85" metal={0.7} rough={0.2} /></mesh>
          <mesh position={[0, 0.18, -0.15]}><torusGeometry args={[0.1, 0.015, 8, 24, Math.PI]} /><M color="#8a97ad" metal={0.7} rough={0.2} /></mesh>
        </group>
      )}
      {fridgeRoom && <Fridge pos={[x0 + L + 0.55, 0, rect.z + 0.45]} onOpen={onFridge} warn={fridgeWarn} portal={portal} />}
      {table && (
        <group position={[cx, 0, tz]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow><cylinderGeometry args={[0.6, 0.6, 0.05, 40]} /><M color="#1d2639" metal={0.4} rough={0.3} /></mesh>
          <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.05, 0.25, 0.72, 20]} /><M color="#1d2639" /></mesh>
          {[0, 2.1, 4.2].map((a) => (
            <group key={a} position={[Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85]}>
              <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.08, 24]} /><M color={C.fabric2} /></mesh>
              <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.02, 0.02, 0.44]} /><M color={C.metal} metal={0.5} /></mesh>
            </group>
          ))}
          <mesh position={[0.1, 0.83, 0.1]} castShadow><sphereGeometry args={[0.08, 16, 12]} /><M color="#ff5470" /></mesh>
          <mesh position={[-0.05, 0.82, 0.18]} castShadow><sphereGeometry args={[0.07, 16, 12]} /><M color="#f5c451" /></mesh>
        </group>
      )}
      {lamp && <Lamp kind="pendant" pos={[cx, 2.0, table ? tz : rect.z + rect.d / 2]} device={lamp} onToggle={() => onToggle(lamp.id)} />}
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={used} />
    </group>
  )
}

function Bedroom({ rect, devices, onToggle, onWardrobe, portal }: FurnProps) {
  const bx = rect.x + Math.max(1.2, rect.w * 0.42)
  const used = new Set<string>()
  const lamp = pick(devices, 'light', used)
  const heat = pick(devices, 'thermostat', used)
  return (
    <group>
      <group position={[bx, 0, rect.z + 1.25]}>
        <B p={[0, 0.2, 0]} s={[1.7, 0.4, 2.1]} c={C.woodD} r={0.06} />
        <B p={[0, 0.45, 0.05]} s={[1.6, 0.18, 2]} c="#1f2740" r={0.08} />
        <B p={[0, 0.58, 0.35]} s={[1.66, 0.1, 1.45]} c="#2b2160" r={0.05} />
        <B p={[-0.4, 0.62, -0.72]} s={[0.62, 0.16, 0.38]} c={C.white} r={0.08} />
        <B p={[0.4, 0.62, -0.72]} s={[0.62, 0.16, 0.38]} c={C.white} r={0.08} />
        <B p={[0, 0.75, -1.02]} s={[1.7, 1.1, 0.1]} c="#151c30" r={0.05} />
        <mesh position={[0, 1.31, -1.0]}><boxGeometry args={[1.7, 0.012, 0.11]} /><meshBasicMaterial color="#7b56ff" toneMapped={false} /></mesh>
      </group>
      <B p={[bx - 1.15, 0.28, rect.z + 0.45]} s={[0.45, 0.56, 0.45]} c={C.woodD} />
      <B p={[bx + 1.15, 0.28, rect.z + 0.45]} s={[0.45, 0.56, 0.45]} c={C.woodD} />
      {lamp && <Lamp kind="table" pos={[bx + 1.15, 0.56, rect.z + 0.45]} device={lamp} onToggle={() => onToggle(lamp.id)} />}
      {rect.d >= 3.2 && (
        <group position={[rect.x + 0.4, 0, rect.z + rect.d - 0.85]} onClick={click(onWardrobe)} {...hoverCursor}>
          <B p={[0, 1, 0]} s={[0.65, 2, 1.4]} c="#161d2e" r={0.05} />
          <mesh position={[0.33, 1, 0]}><boxGeometry args={[0.01, 1.9, 0.01]} /><meshBasicMaterial color="#4cc9ff" toneMapped={false} /></mesh>
          <Html portal={portal as React.RefObject<HTMLElement>} position={[0.4, 2.25, 0]} center zIndexRange={[20, 0]}><div className="scene-badge"><Art name="dress" size={22} /></div></Html>
        </group>
      )}
      {rect.w >= 3.2 && (
        <group position={[rect.x + rect.w - 0.8, 0, rect.z + rect.d - 0.32]}>
          <B p={[0, 0.38, 0]} s={[1.0, 0.06, 0.45]} c={C.woodD} />
          {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 0.18, 0]}><cylinderGeometry args={[0.02, 0.02, 0.36]} /><M color={C.metal} metal={0.5} /></mesh>)}
          <mesh position={[0, 0.85, -0.15]} rotation={[0, Math.PI, 0]}><torusGeometry args={[0.3, 0.025, 12, 40]} /><M color={C.metal} emissive="#a98bff" ei={0.6} /></mesh>
        </group>
      )}
      {heat && <B p={[rect.x + rect.w - 0.1, 0.55, rect.z + rect.d / 2]} s={[0.08, 0.45, 0.7]} c={heat.on ? '#3a2018' : '#1b2233'} r={0.03} emissive="#ff6b3d" ei={heat.on ? 0.5 : 0} onClick={click(() => onToggle(heat.id))} />}
      <mesh position={[bx, 0.008, rect.z + Math.min(rect.d - 0.9, 3)]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 40]} /><M color={C.rug2} rough={1} /></mesh>
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={used} />
    </group>
  )
}

function Bath({ rect, devices, onToggle }: FurnProps) {
  const used = new Set<string>()
  const lamp = pick(devices, 'light', used)
  const cz = rect.z + rect.d / 2
  const tub = rect.w >= 2.6
  return (
    <group>
      {tub ? (
        <group position={[rect.x + rect.w - 1.15, 0, rect.z + 0.55]}>
          <B p={[0, 0.3, 0]} s={[2.0, 0.6, 0.9]} c="#c3cddf" r={0.25} />
          <mesh position={[0, 0.52, 0]}><boxGeometry args={[1.7, 0.08, 0.62]} /><M color="#1a5fa8" rough={0.1} emissive="#2d7dd6" ei={0.35} /></mesh>
        </group>
      ) : (
        <group position={[rect.x + rect.w - 0.55, 0, rect.z + 0.55]}>
          <B p={[0, 0.04, 0]} s={[0.9, 0.08, 0.9]} c="#c3cddf" r={0.04} />
          <mesh position={[0, 1.1, 0.44]}><boxGeometry args={[0.9, 2.1, 0.02]} /><M color="#5ec8ff" opacity={0.18} rough={0.05} /></mesh>
        </group>
      )}
      <group position={[rect.x + 0.35, 0, cz]}>
        <B p={[0, 0.45, 0]} s={[0.5, 0.9, 0.8]} c="#1a2236" />
        <mesh position={[0.02, 0.92, 0]}><cylinderGeometry args={[0.2, 0.17, 0.08, 24]} /><M color="#c3cddf" rough={0.15} /></mesh>
      </group>
      <group position={[rect.x + 0.1, 1.5, cz]} rotation={[0, Math.PI / 2, 0]}>
        <Lamp kind="mirror" pos={[0, 0, 0]} device={lamp} onToggle={lamp ? () => onToggle(lamp.id) : undefined} />
      </group>
      <group position={[rect.x + rect.w - 0.45, 0, rect.z + rect.d - 0.55]}>
        <B p={[0, 0.22, 0]} s={[0.4, 0.44, 0.55]} c="#c3cddf" r={0.15} />
        <B p={[0.15, 0.55, 0]} s={[0.15, 0.5, 0.45]} c="#c3cddf" r={0.06} />
      </group>
      <mesh position={[rect.x + rect.w / 2, 0.008, cz + 0.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.9, 0.6]} /><M color="#1b2a4a" rough={1} /></mesh>
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={used} />
    </group>
  )
}

function Hall({ rect, devices, onToggle }: FurnProps) {
  const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2
  const vertical = rect.d >= rect.w
  return (
    <group>
      <mesh position={[cx, 0.008, cz]} rotation={[-Math.PI / 2, 0, vertical ? 0 : Math.PI / 2]} receiveShadow><planeGeometry args={[Math.max(0.4, Math.min(1, Math.min(rect.w, rect.d) - 0.6)), Math.max(0.6, Math.max(rect.w, rect.d) - 0.8)]} /><M color={C.rug} rough={1} /></mesh>
      <group position={[rect.x + rect.w - 0.35, 0, rect.z + 1.0]}>
        <B p={[0, 0.25, 0]} s={[0.4, 0.5, 1.0]} c="#1a2236" />
        {[-0.3, 0, 0.3].map((z, i) => <B key={z} p={[0, 0.55, z]} s={[0.22, 0.1, 0.12]} c={['#7b56ff', '#c3cddf', '#2f86ff'][i]} r={0.04} />)}
      </group>
      <group position={[rect.x + 0.08, 1.05, cz]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[0.5, 1.3]} /><M color="#9fb6d6" metal={0.8} rough={0.05} /></mesh>
      </group>
      <Plant pos={[rect.x + 0.35, 0, rect.z + rect.d - 0.4]} scale={0.8} />
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={new Set()} />
    </group>
  )
}

function Office({ rect, devices, onToggle }: FurnProps) {
  const cx = rect.x + rect.w / 2
  const used = new Set<string>()
  const lamp = pick(devices, 'light', used)
  return (
    <group>
      <group position={[cx, 0, rect.z + 0.45]}>
        <B p={[0, 0.74, 0]} s={[1.5, 0.05, 0.7]} c={C.woodD} />
        {[-0.7, 0.7].map((x) => <B key={x} p={[x, 0.37, 0]} s={[0.05, 0.74, 0.65]} c="#1a2236" />)}
        <B p={[0, 1.08, -0.15]} s={[0.9, 0.52, 0.04]} c={C.dark} r={0.02} />
        <mesh position={[0, 1.08, -0.127]}><planeGeometry args={[0.84, 0.46]} /><M color={C.screen} emissive="#2f86ff" ei={0.9} /></mesh>
        <B p={[0, 0.79, 0.12]} s={[0.5, 0.02, 0.16]} c="#1b2233" r={0.01} />
      </group>
      <group position={[cx, 0, rect.z + 1.2]}>
        <B p={[0, 0.48, 0]} s={[0.5, 0.08, 0.5]} c={C.fabric2} r={0.04} />
        <B p={[0, 0.85, 0.22]} s={[0.48, 0.65, 0.07]} c={C.fabric2} r={0.04} />
        <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.03, 0.03, 0.44]} /><M color={C.metal} metal={0.6} /></mesh>
      </group>
      {lamp && <Lamp kind="desk" pos={[cx + 0.55, 0.76, rect.z + 0.3]} device={lamp} onToggle={() => onToggle(lamp.id)} />}
      {rect.d >= 2.6 && <B p={[rect.x + 0.22, 0.9, rect.z + rect.d * 0.6]} s={[0.36, 1.8, 1.1]} c={C.woodD} />}
      <Plant pos={[rect.x + rect.w - 0.4, 0, rect.z + rect.d - 0.4]} scale={0.9} />
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={used} />
    </group>
  )
}

function Other({ rect, devices, onToggle }: FurnProps) {
  return (
    <group>
      <B p={[rect.x + 0.25, 0.75, rect.z + rect.d / 2]} s={[0.4, 1.5, Math.max(0.4, Math.min(1.2, rect.d - 0.6))]} c={C.woodD} />
      <Plant pos={[rect.x + rect.w - 0.4, 0, rect.z + 0.4]} />
      <DeviceExtras rect={rect} devices={devices} onToggle={onToggle} used={new Set()} />
    </group>
  )
}

const FURNITURE: Record<string, (p: FurnProps) => ReactNode> = { living: Living, kitchen: Kitchen, bedroom: Bedroom, bath: Bath, hall: Hall, office: Office, other: Other }

/* ---------------------------------------------------------------- floor plan underlay */

function PlanUnderlay({ plan }: { plan: FloorPlan }) {
  const tex = useLoader(THREE.TextureLoader, plan.image!)
  tex.colorSpace = THREE.SRGBColorSpace
  const w = plan.imgW / plan.ppm, d = plan.imgH / plan.ppm
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0.012, d / 2]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} transparent opacity={0.38} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

/* ---------------------------------------------------------------- camera */

type Bounds = ReturnType<typeof boundsOf>
function homeView(b: Bounds, aspect: number) {
  const span = Math.max(b.w, b.d * 1.2, 6)
  const k = ((aspect < 0.6 ? 2.05 : aspect < 0.8 ? 1.7 : aspect < 1.2 ? 1.25 : 1) * span) / 12
  return { pos: [b.cx + 7.5 * k, 10.5 * k, b.cz + 11 * k] as const, target: [b.cx, 0, b.cz + 0.3] as const }
}

function Rig({ cc, bounds, selected, immersive, size }: { cc: React.RefObject<CameraControls | null>; bounds: Bounds; selected: string | null; immersive: boolean; size: React.MutableRefObject<{ w: number; h: number }> }) {
  const s = useThree((st) => st.size)
  const first = useRef(true)
  useEffect(() => { size.current = { w: s.width, h: Math.max(1, s.height) } }, [s.width, s.height, size])
  useEffect(() => {
    const c = cc.current
    if (!c) return
    c.smoothTime = 0.45
    c.touches.one = CameraControlsImpl.ACTION.TOUCH_ROTATE
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK
    // inline the wheel scrolls the page; fullscreen it zooms
    c.mouseButtons.wheel = immersive ? CameraControlsImpl.ACTION.DOLLY : CameraControlsImpl.ACTION.NONE
  }, [cc, immersive])
  useEffect(() => {
    if (!cc.current || selected) return
    const v = homeView(bounds, s.width / Math.max(1, s.height))
    void cc.current.setLookAt(...v.pos, ...v.target, !first.current)
    first.current = false
  }, [s.width, s.height, bounds.cx, bounds.cz, bounds.w, bounds.d])
  return null
}

/* ---------------------------------------------------------------- scene */

export const Apartment = forwardRef<ApartmentHandle, Props>(function Apartment(props, ref) {
  const cc = useRef<CameraControls>(null)
  const [hover, setHover] = useState<string | null>(null)
  const size = useRef({ w: 1, h: 1 })
  const rects = useMemo(() => rectsOf(props.rooms), [props.rooms])
  const bounds = useMemo(() => boundsOf(rects.values()), [rects])
  const segs = useMemo(() => wallsOf([...rects.values()]), [rects])
  const firstKitchen = props.rooms.find((r) => r.kind === 'kitchen')?.id
  const wrap = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    focus: (id) => {
      if (!cc.current) return
      const aspect = size.current.w / size.current.h
      const r = id ? rects.get(id) : null
      if (!r) { const v = homeView(bounds, aspect); void cc.current.setLookAt(...v.pos, ...v.target, true); return }
      const cx = r.x + r.w / 2, cz = r.z + r.d / 2
      const f = Math.max(Math.max(r.w, r.d) / 5, 0.8) * (aspect < 0.8 ? 1.35 : 1)
      void cc.current.setLookAt(cx + 3.2 * f, 6.2 * f, cz + 5.2 * f, cx, 0.3, cz, true)
    },
  }))

  // ctrl / cmd + wheel zooms inline without stealing normal page scrolling
  useEffect(() => {
    const el = wrap.current
    if (!el || props.immersive) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      void cc.current?.dolly(-e.deltaY * 0.01, true)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [props.immersive])

  const bg = props.night ? '#03050a' : '#060a14'
  const touch = props.immersive ? 'none' : 'pan-y'
  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, touchAction: touch }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [18, 14, 20], fov: 40 }} onPointerMissed={() => props.onSelect(null)} style={{ touchAction: touch }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 30, 70]} />
        <hemisphereLight args={['#9ec8ff', '#0b1020', props.night ? 0.25 : 0.55]} />
        <directionalLight position={[bounds.cx - 6, 12, bounds.cz + 8]} intensity={props.night ? 0.35 : 1.1} color="#cfe0ff" castShadow
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-0.0004}>
          <object3D attach="target" position={[bounds.cx, 0, bounds.cz]} />
        </directionalLight>
        <pointLight position={[bounds.cx, 4, bounds.cz]} intensity={props.night ? 6 : 3} distance={20} color={props.accent} />
        <CameraControls ref={cc} minDistance={4} maxDistance={48} maxPolarAngle={Math.PI / 2.3} minPolarAngle={0.2} />
        <Rig cc={cc} bounds={bounds} selected={props.selected} immersive={!!props.immersive} size={size} />

        <group>
          <RoundedBox args={[bounds.w + 0.6, 0.3, bounds.d + 0.6]} radius={0.1} position={[bounds.cx, -0.16, bounds.cz]} receiveShadow>
            <M color={C.slab} rough={0.6} metal={0.2} />
          </RoundedBox>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.cx, -0.315, bounds.cz]}>
            <ringGeometry args={[Math.max(bounds.w, bounds.d) * 0.62, Math.max(bounds.w, bounds.d) * 0.63, 96]} />
            <meshBasicMaterial color={props.accent} transparent opacity={0.35} toneMapped={false} />
          </mesh>
          {props.plan?.image && props.plan.show3d && <Suspense fallback={null}><PlanUnderlay plan={props.plan} /></Suspense>}
          {props.rooms.map((r) => {
            const rect = rects.get(r.id)!
            const Furn = FURNITURE[r.kind] ?? Other
            const devs = props.devices.filter((d) => d.roomId === r.id)
            return (
              <group key={r.id}>
                <Floor rect={rect} accent={props.accent} hovered={hover === r.id} selected={props.selected === r.id} tiled={r.kind === 'kitchen' || r.kind === 'bath'}
                  dim={!!(props.plan?.image && props.plan.show3d)} onHover={(v) => setHover(v ? r.id : null)} onSelect={() => props.onSelect(r.id)} />
                <Furn rect={rect} devices={devs} onToggle={props.onToggle} onFridge={props.onFridge} onWardrobe={props.onWardrobe}
                  fridgeWarn={props.fridgeWarn} hasFridge={r.id === firstKitchen} portal={props.portal} />
                {props.cleanliness(r) < 45 && <Dust rect={rect} />}
              </group>
            )
          })}
          {segs.map((s, i) => <Wall key={i} seg={s} accent={props.accent} />)}
          {props.rooms.map((r) => {
            const rect = rects.get(r.id)!
            const clean = props.cleanliness(r)
            const open = r.needs.filter((n) => !n.done).length
            return (
              <Html portal={props.portal as React.RefObject<HTMLElement>} key={r.id} position={[rect.x + rect.w / 2, 2.0, rect.z + rect.d / 2]} center zIndexRange={[30, 0]}>
                <button className={`room-tag ${props.selected === r.id ? 'sel' : ''}`} onClick={() => props.onSelect(r.id)}>
                  <Art name={ROOM_ICON[r.kind] ?? 'box'} size={20} />
                  <b>{r.name}</b>
                  <i style={{ background: clean > 66 ? '#3fe0b0' : clean > 33 ? '#f5c451' : '#ff3b5c' }} />
                  {open > 0 && <em>{open}</em>}
                </button>
              </Html>
            )
          })}
          <Sparkles count={45} scale={[bounds.w, 3.5, bounds.d]} position={[bounds.cx, 1.8, bounds.cz]} size={2.4} color={props.accent} speed={0.3} opacity={0.7} />
        </group>
      </Canvas>
    </div>
  )
})
