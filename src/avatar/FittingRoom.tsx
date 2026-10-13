import { Environment, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { assetUrl, onAvatarBytes } from './assets'
import { sharedAvatar, type AvatarModel, type AvatarLook } from './model'
import type { WornPart } from './map'

export type Framing = 'full' | 'upper' | 'face' | 'feet' | 'eyes' | 'hands'
const FRAMES: Record<Framing, { y: number; dist: number; look: number; x?: number }> = {
  full: { y: 0.95, dist: 4.5, look: 0.74 },
  upper: { y: 1.3, dist: 2.3, look: 1.22 },
  face: { y: 1.5, dist: 1.05, look: 1.49 },
  feet: { y: 0.45, dist: 1.9, look: 0.22 },
  eyes: { y: 1.5, dist: 0.42, look: 1.49 },
  hands: { y: 0.9, dist: 1.0, look: 0.85, x: 0.25 },
}

export interface Controls {
  angle: number
  vel: number
  zoom: number
  dragging: boolean
  pointer: THREE.Vector2
}

/* ---------------------------------------------------------------- stage */

const ringVert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const ringFrag = /* glsl */`
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
varying vec2 vUv;
float hex(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.732))), p.x);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  // concentric system rings
  float ring1 = smoothstep(0.012, 0.0, abs(r - 0.62));
  float ring2 = smoothstep(0.006, 0.0, abs(r - 0.7)) * 0.7;
  float ring3 = smoothstep(0.004, 0.0, abs(r - 0.94)) * 0.5;
  // rotating dashes
  float a = atan(p.y, p.x);
  float dash = step(0.55, fract(a * 9.549 + uTime * 0.15)) * smoothstep(0.01, 0.0, abs(r - 0.8));
  float ticks = step(0.92, fract(a * 19.098 - uTime * 0.05)) * smoothstep(0.03, 0.0, abs(r - 0.87));
  // hex grid fading out
  vec2 g = p * 9.0;
  vec2 h = vec2(1.0, 1.732);
  vec2 ga = mod(g, h) - h * 0.5;
  vec2 gb = mod(g - h * 0.5, h) - h * 0.5;
  vec2 gv = dot(ga, ga) < dot(gb, gb) ? ga : gb;
  float grid = smoothstep(0.03, 0.0, abs(hex(gv) - 0.48)) * 0.18 * smoothstep(1.0, 0.2, r);
  // scanning pulse
  float pulse = smoothstep(0.05, 0.0, abs(r - fract(uTime * 0.22))) * 0.6 * (1.0 - r);
  float glow = smoothstep(0.75, 0.0, r) * 0.12;
  vec3 col = uA * (ring1 + ring2 + dash * 0.8 + grid + pulse + glow) + uB * (ring3 + ticks * 0.6);
  float alpha = clamp(ring1 + ring2 + ring3 + dash + ticks + grid + pulse + glow, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`

function Platform() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color('#3fa9ff') }, uB: { value: new THREE.Color('#8f6bff') } },
  }), [])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position-y={-0.001}>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#020306" roughness={0.75} metalness={0} envMapIntensity={0.04} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} material={mat}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
        <circleGeometry args={[1.3, 64]} />
        <shadowMaterial opacity={0.55} transparent />
      </mesh>
    </group>
  )
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  useEffect(() => {
    const t = new THREE.Object3D()
    t.position.set(0, 0.9, 0)
    scene.add(t)
    if (key.current) key.current.target = t
    return () => { scene.remove(t) }
  }, [scene])
  return (
    <>
      <spotLight ref={key} position={[1.8, 3.6, 3.2]} angle={0.42} penumbra={0.8} intensity={38} color="#fff3ea" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.035} />
      <directionalLight position={[-3, 2.2, 2]} intensity={0.55} color="#dfe8ff" />
      <spotLight position={[-2.6, 2.4, -2.4]} angle={0.6} penumbra={1} intensity={30} color="#3aa0ff" />
      <spotLight position={[2.6, 2.0, -2.6]} angle={0.6} penumbra={1} intensity={22} color="#9a6bff" />
      <pointLight position={[0, 0.25, 1.2]} intensity={0.6} color="#4cc9ff" distance={3} />
    </>
  )
}

/* ---------------------------------------------------------------- avatar + camera */

function Scene({ model, look, parts, pose, framing, ctl, spin }: {
  model: AvatarModel; look: AvatarLook; parts: WornPart[]; pose: string; framing: Framing; ctl: React.MutableRefObject<Controls>; spin: boolean
}) {
  const { camera, size } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 0.9, 0))
  const [ready, setReady] = useState(model.ready)
  useEffect(() => {
    let alive = true
    if (!model.ready) model.init().then(() => alive && setReady(true)).catch((e) => console.error('avatar', e))
    return () => { alive = false }
  }, [model])
  useEffect(() => { if (ready) void model.setLook(look) }, [ready, look, model])
  useEffect(() => { if (ready) model.setOutfit(parts) }, [ready, parts, model])
  useEffect(() => { if (ready) model.rig.setPose(pose) }, [ready, pose, model])

  useFrame((state, dt) => {
    const c = ctl.current
    if (!c.dragging) {
      c.angle += c.vel * dt
      c.vel *= Math.exp(-dt * 2.2)
      if (spin && Math.abs(c.vel) < 0.25) c.angle += dt * 0.32
    }
    model.group.rotation.y = c.angle
    if (model.ready) {
      model.rig.look.set(THREE.MathUtils.clamp(c.pointer.x - Math.sin(c.angle) * 0.6, -1, 1), THREE.MathUtils.clamp(c.pointer.y, -1, 1))
      model.update(dt, state.clock.elapsedTime)
    }
    const f = FRAMES[framing]
    const aspect = size.width / Math.max(size.height, 1)
    const dist = f.dist * c.zoom * (aspect < 0.5 ? 1 + (0.5 - aspect) * 1.6 : 1)
    const target = new THREE.Vector3(f.x ?? 0, f.y, dist)
    const k = 1 - Math.exp(-dt * 4)
    camera.position.lerp(target, k)
    lookAt.current.lerp(new THREE.Vector3(f.x ?? 0, f.look, 0), k)
    camera.lookAt(lookAt.current)
  })
  return <primitive object={model.group} />
}

export interface FittingRoomProps {
  angle?: number
  look: AvatarLook
  parts: WornPart[]
  pose?: string
  framing?: Framing
  spin?: boolean
  className?: string
  onFraming?: (f: Framing) => void
}

/**
 * The 3D fitting room. Gestures: horizontal drag turns the avatar, vertical swipes scroll the page
 * (touch-action: pan-y), pinch or ctrl+wheel zooms, double tap cycles the camera framing.
 */
export default function FittingRoom({ look, parts, pose = 'idle', framing = 'full', spin = false, className, onFraming, angle = 0.35 }: FittingRoomProps) {
  const model = useMemo(() => sharedAvatar(), [])
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __avatar: AvatarModel }).__avatar = model }, [model])
  const ctl = useRef<Controls>({ angle, vel: 0, zoom: 1, dragging: false, pointer: new THREE.Vector2() })
  const wrap = useRef<HTMLDivElement>(null)
  const [bytes, setBytes] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => onAvatarBytes(setBytes), [])
  useEffect(() => {
    const id = setInterval(() => { if (model.ready) { setReady(true); clearInterval(id) } }, 200)
    return () => clearInterval(id)
  }, [model])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const pts = new Map<number, { x: number; y: number }>()
    let start: { x: number; y: number; angle: number } | null = null
    let pinch0 = 0, zoom0 = 1, lastX = 0, lastT = 0, lastTap = 0
    const order: Framing[] = ['full', 'upper', 'face', 'feet']
    const rect = () => el.getBoundingClientRect()
    const onMove = (e: PointerEvent) => {
      const r = rect()
      ctl.current.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      if (!pts.has(e.pointerId)) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch0) ctl.current.zoom = THREE.MathUtils.clamp(zoom0 * (pinch0 / d), 0.35, 1.6)
        return
      }
      if (!start) return
      const dx = e.clientX - start.x
      ctl.current.angle = start.angle + dx * 0.012
      const now = performance.now()
      if (now - lastT > 0) ctl.current.vel = ((e.clientX - lastX) * 0.012) / ((now - lastT) / 1000)
      lastX = e.clientX
      lastT = now
    }
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 1) {
        start = { x: e.clientX, y: e.clientY, angle: ctl.current.angle }
        lastX = e.clientX
        lastT = performance.now()
        ctl.current.dragging = true
        ctl.current.vel = 0
        const now = performance.now()
        if (now - lastTap < 300 && onFraming) onFraming(order[(order.indexOf(framing) + 1) % order.length])
        lastTap = now
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y)
        zoom0 = ctl.current.zoom
        start = null
      }
    }
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch0 = 0
      if (pts.size === 0) {
        ctl.current.dragging = false
        start = null
        if (performance.now() - lastT > 80) ctl.current.vel = 0
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return // let the page scroll
      e.preventDefault()
      ctl.current.zoom = THREE.MathUtils.clamp(ctl.current.zoom * Math.exp(e.deltaY * 0.002), 0.35, 1.6)
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [framing, onFraming])

  useEffect(() => { ctl.current.zoom = 1 }, [framing])

  return (
    <div ref={wrap} className={`fitting-room ${className ?? ''}`} style={{ touchAction: 'pan-y' }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 26, position: [0, 1.0, 4.3], near: 0.05, far: 60 }}>
        <color attach="background" args={['#04060b']} />
        <fog attach="fog" args={['#04060b', 4.5, 11]} />
        <Suspense fallback={null}>
          <Environment files={assetUrl('env/studio.hdr')} environmentIntensity={0.5} />
        </Suspense>
        <Lights />
        <Platform />
        <Sparkles count={50} scale={[3, 2.4, 3]} position={[0, 1.2, 0]} size={1.6} speed={0.25} color="#5fb8ff" opacity={0.5} />
        <Scene model={model} look={look} parts={parts} pose={pose} framing={framing} ctl={ctl} spin={spin} />
      </Canvas>
      {!ready && (
        <div className="fr-loading">
          <div className="fr-sys">SYSTEM</div>
          <div className="fr-msg">Avatar wird synchronisiert</div>
          <div className="fr-bar"><i style={{ width: `${Math.min(100, (bytes / 6e6) * 100)}%` }} /></div>
          <div className="fr-bytes mono">{(bytes / 1e6).toFixed(1)} MB</div>
        </div>
      )}
    </div>
  )
}
