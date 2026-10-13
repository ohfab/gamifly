/** Avatar appearance — kept free of three.js so the store can import it without pulling in 3D code. */
export interface BodyShape { masculine: number; weight: number; muscle: number; height: number; bust: number }
export const DEFAULT_SHAPE: BodyShape = { masculine: 0, weight: 0, muscle: 0.25, height: 0, bust: 0 }

export interface AvatarLook {
  shape: BodyShape
  skin: string
  eyes: string
  hair: string
  hairColor: string
  brows: string
}
export const DEFAULT_LOOK: AvatarLook = { shape: DEFAULT_SHAPE, skin: 'warm', eyes: 'brownlight', hair: 'long01', hairColor: '#2a1d17', brows: 'eyebrow010' }

export const HAIR_COLORS = [
  { v: '#0f0c0b', label: 'Schwarz' }, { v: '#2a1d17', label: 'Espresso' }, { v: '#4a3022', label: 'Braun' },
  { v: '#7a5236', label: 'Haselnuss' }, { v: '#a87a4f', label: 'Karamell' }, { v: '#d6b47f', label: 'Blond' },
  { v: '#ece0c8', label: 'Platin' }, { v: '#8e3a26', label: 'Kupfer' }, { v: '#4d5f8f', label: 'Shadow Blue' },
  { v: '#6d4b9e', label: 'Monarch' }, { v: '#c9c9d4', label: 'Silber' }, { v: '#b4485a', label: 'Rosé' },
]

export const BODY_SLIDERS: { k: keyof BodyShape; label: string; min: number; max: number; lo: string; hi: string }[] = [
  { k: 'masculine', label: 'Körperbau', min: 0, max: 1, lo: 'feminin', hi: 'maskulin' },
  { k: 'height', label: 'Größe', min: -1, max: 1, lo: 'kleiner', hi: 'größer' },
  { k: 'weight', label: 'Statur', min: -1, max: 1, lo: 'schlank', hi: 'kurvig' },
  { k: 'muscle', label: 'Muskeln', min: 0, max: 1, lo: 'weich', hi: 'athletisch' },
  { k: 'bust', label: 'Oberweite', min: -1, max: 1, lo: 'flach', hi: 'voll' },
]

/* option lists mirrored from public/avatar/manifest.json (kept here so menus need no 3D code) */
export const SKIN_TONES = [
  { v: 'porcelain', label: 'Porzellan', sw: '#f0d3c2' }, { v: 'warm', label: 'Warm', sw: '#e2b597' },
  { v: 'olive', label: 'Oliv', sw: '#c99a74' }, { v: 'deep', label: 'Tief', sw: '#6a4130' },
]
export const EYE_COLORS = [
  { v: 'brown', sw: '#4a2a17' }, { v: 'brownlight', sw: '#8a5a2b' }, { v: 'green', sw: '#5f7a3a' }, { v: 'bluegreen', sw: '#4f7f7a' },
  { v: 'blue', sw: '#3f6fa8' }, { v: 'lightblue', sw: '#86a9cf' }, { v: 'deepblue', sw: '#24447a' }, { v: 'grey', sw: '#7d848c' }, { v: 'ice', sw: '#bfd6e6' },
]
export const HAIR_STYLES = [
  { v: 'long01', label: 'Lang' }, { v: 'bob01', label: 'Bob' }, { v: 'bob02', label: 'Bob kurz' }, { v: 'ponytail01', label: 'Zopf hoch' },
  { v: 'braid01', label: 'Flechtzopf' }, { v: 'short02', label: 'Kurz' }, { v: 'short01', label: 'Undercut' }, { v: 'short04', label: 'Buzz' },
  { v: 'afro01', label: 'Afro' }, { v: 'none', label: 'Ohne' },
]
export const BROWS = [{ v: 'eyebrow010', label: 'Natürlich' }, { v: 'eyebrow001', label: 'Weich' }, { v: 'eyebrow006', label: 'Schmal' }, { v: 'eyebrow012', label: 'Kräftig' }]
export const POSE_LIST = [{ v: 'idle', label: 'Entspannt' }, { v: 'contra', label: 'Kontrapost' }, { v: 'casual', label: 'Lässig' }, { v: 'clasp', label: 'Gefaltet' }, { v: 'walk', label: 'Laufsteg' }]
