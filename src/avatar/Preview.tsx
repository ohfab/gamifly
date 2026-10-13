import { useMemo } from 'react'
import FittingRoom, { type Framing } from './FittingRoom'
import { DEFAULT_LOOK, type AvatarLook } from './model'
import type { WornPart } from './map'

/** QA page: ?avatar&wear=tee:#ffffff:jersey,jeans&pose=idle&frame=full&hair=bob01&skin=deep&m=0.5 */
export default function AvatarPreview() {
  const q = new URLSearchParams(location.search)
  const parts = useMemo<WornPart[]>(() => (q.get('wear') ?? '').split(',').filter(Boolean).map((s, i) => {
    const [def, color, fabric] = s.split(':')
    return { key: `${i}:${def}`, def, color: color ?? '#d9d4cc', fabric: fabric ?? '' }
  }), [])
  const look = useMemo<AvatarLook>(() => ({
    ...DEFAULT_LOOK,
    hair: q.get('hair') ?? DEFAULT_LOOK.hair,
    skin: q.get('skin') ?? DEFAULT_LOOK.skin,
    eyes: q.get('eyes') ?? DEFAULT_LOOK.eyes,
    hairColor: q.get('hc') ?? DEFAULT_LOOK.hairColor,
    shape: { ...DEFAULT_LOOK.shape, masculine: +(q.get('m') ?? 0), weight: +(q.get('w') ?? 0), muscle: +(q.get('mu') ?? 0.25), height: +(q.get('h') ?? 0), bust: +(q.get('b') ?? 0) },
  }), [])
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <FittingRoom look={look} parts={parts} pose={q.get('pose') ?? 'idle'} framing={(q.get('frame') as Framing) ?? 'full'} spin={q.has('spin')} angle={+(q.get('angle') ?? 0.35)} className="fr-full" />
    </div>
  )
}
