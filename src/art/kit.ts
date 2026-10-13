import { createElement, type ReactNode } from 'react'

/** A tiny declarative SVG DSL: every illustration is a list of shapes on a 64×64 canvas. */
export type Shape = [string, Record<string, unknown>, Shape[]?]
export type ArtDef = Shape[]
type O = Record<string, unknown>

export const C = (cx: number, cy: number, r: number, fill: string, o: O = {}): Shape => ['circle', { cx, cy, r, fill, ...o }]
export const E = (cx: number, cy: number, rx: number, ry: number, fill: string, o: O = {}): Shape => ['ellipse', { cx, cy, rx, ry, fill, ...o }]
export const R = (x: number, y: number, w: number, h: number, rx: number, fill: string, o: O = {}): Shape => ['rect', { x, y, width: w, height: h, rx, fill, ...o }]
export const P = (d: string, fill: string, o: O = {}): Shape => ['path', { d, fill, ...o }]
export const L = (d: string, stroke: string, w = 3, o: O = {}): Shape => ['path', { d, fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', ...o }]
export const G = (transform: string, kids: Shape[], o: O = {}): Shape => ['g', { transform, ...o }, kids]

export function render(shapes: Shape[], prefix = ''): ReactNode[] {
  return shapes.map((s, i) => createElement(s[0], { key: prefix + i, ...s[1] }, s[2] ? render(s[2], `${prefix}${i}-`) : undefined))
}

/** System palette (Solo Leveling vibe): cold steel, electric blue, monarch violet, gate crimson and loot gold. */
export const K = {
  olive: '#3a6fd8', oliveD: '#244a9c', sage: '#5d8fd8', sageL: '#a8c4ec', leaf: '#45a6ff', leafD: '#2a6fc6',
  cream: '#dce4f1', creamD: '#a9b6cc', white: '#f4f8ff', ink: '#0a0f1e', inkL: '#2b3754',
  blush: '#d65a76', rose: '#e0405f', roseD: '#a3223f', pink: '#a985ff', pinkD: '#7c58ee',
  gold: '#f2c14e', goldD: '#c58f22', goldL: '#fbe3a0',
  sky: '#5ec8ff', skyD: '#2c8ad6', skyL: '#c3e8ff', water: '#4ab7ff',
  lilac: '#9b7dff', lilacD: '#6545dc', lilacL: '#cdbfff',
  brown: '#8b6c56', brownD: '#5b4436', brownL: '#b39478',
  grey: '#8e98ae', greyD: '#5b6680', greyL: '#c6cedc',
  red: '#ef3f5a', redD: '#b42640', orange: '#ff8f3d', orangeD: '#d0661f', yellow: '#ffd24d', yellowD: '#d9a92a',
  green: '#3fd39a', greenD: '#21a072', night: '#1b2244', nightD: '#0e1430',
}

export const SH: Shape = E(32, 57, 17, 3.2, K.ink, { opacity: 0.1 })
export const HL = (x: number, y: number, rx = 2.6, ry = 4.2, rot = -25): Shape =>
  E(x, y, rx, ry, '#ffffff', { opacity: 0.7, transform: `rotate(${rot} ${x} ${y})` })
export const spark = (cx: number, cy: number, r: number, fill: string, o: O = {}): Shape =>
  P(`M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`, fill, o)
export const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 9 * s}C${cx - 11 * s} ${cy + 2 * s} ${cx - 12 * s} ${cy - 7 * s} ${cx - 6 * s} ${cy - 9 * s}C${cx - 2.5 * s} ${cy - 10.5 * s} ${cx} ${cy - 8 * s} ${cx} ${cy - 5.5 * s}C${cx} ${cy - 8 * s} ${cx + 2.5 * s} ${cy - 10.5 * s} ${cx + 6 * s} ${cy - 9 * s}C${cx + 12 * s} ${cy - 7 * s} ${cx + 11 * s} ${cy + 2 * s} ${cx} ${cy + 9 * s}Z`
/** Scale another illustration into a box, used for badges, medals and sigils. */
export const nest = (art: ArtDef, x: number, y: number, s: number): Shape => G(`translate(${x} ${y}) scale(${s})`, art.filter((sh) => sh !== SH))

// ---------- reusable templates ----------
export function potionRound(liq: string, liqD: string): ArtDef {
  return [SH,
    R(26, 13, 12, 11, 3, K.skyL), R(24.5, 7, 15, 7, 3, K.brown), R(24.5, 7, 15, 3, 2, K.brownL),
    C(32, 39, 17, K.skyL),
    P('M15 39Q23.5 34 32 38T49 38A17 17 0 0 1 15 39Z', liq),
    P('M18 46A17 17 0 0 0 46 46A17 15 0 0 1 18 46Z', liqD),
    HL(24, 33, 3, 5), C(38, 45, 2, '#fff', { opacity: 0.5 }), C(42, 41, 1.2, '#fff', { opacity: 0.5 })]
}
export function gift(box: string, boxD: string, rib: string, ribD: string): ArtDef {
  return [SH,
    R(14, 30, 36, 25, 4, box), R(14, 46, 36, 9, 4, boxD), R(14, 44, 36, 4, 0, boxD, { opacity: 0.6 }),
    R(11, 22, 42, 11, 4, boxD), R(11, 22, 42, 6, 4, box),
    R(29, 22, 6, 33, 0, rib), R(29, 22, 6, 33, 0, ribD, { opacity: 0.25 }),
    P('M32 21C24 9 13 13 19 20C22 24 28 23 32 21Z', rib), P('M32 21C40 9 51 13 45 20C42 24 36 23 32 21Z', rib),
    C(32, 21, 4, ribD), HL(19, 27, 2, 3, -60)]
}
export function gem(fill: string, dark: string, light: string): ArtDef {
  return [SH,
    P('M19 20H45L54 31L32 55L10 31Z', fill),
    P('M19 20H45L54 31H10Z', light),
    P('M10 31H54L32 55Z', dark, { opacity: 0.35 }),
    P('M24 31L32 20L40 31L32 55Z', '#fff', { opacity: 0.22 }),
    L('M19 20L24 31M45 20L40 31', '#fff', 1.4, { opacity: 0.5 }),
    spark(48, 14, 4, K.white)]
}
export function bow(fill: string, dark: string): ArtDef {
  return [SH,
    P('M30 33L22 52L27 50L30 54L33 36Z', dark), P('M34 33L42 52L37 50L34 54L31 36Z', dark),
    P('M32 30C22 14 6 18 11 31C14 40 26 38 32 32Z', fill), P('M32 30C42 14 58 18 53 31C50 40 38 38 32 32Z', fill),
    P('M32 31C25 22 15 22 15 29', 'none', { stroke: dark, strokeWidth: 1.5, opacity: 0.35, strokeLinecap: 'round' }),
    P('M32 31C39 22 49 22 49 29', 'none', { stroke: dark, strokeWidth: 1.5, opacity: 0.35, strokeLinecap: 'round' }),
    R(27.5, 26, 9, 10, 4, dark), HL(16, 26, 2, 3, 30)]
}
export function chest(wood: string, woodD: string, band: string, bandD: string, open = false): ArtDef {
  const lid = open
    ? [P('M10 26L14 8Q32 2 50 8L54 26Z', woodD), P('M14 8Q32 2 50 8L49 12Q32 6 15 12Z', band), E(32, 26, 20, 5, K.goldL), spark(24, 18, 4, K.white), spark(42, 14, 3, K.white)]
    : [P('M10 31V24Q10 12 32 12Q54 12 54 24V31Z', woodD), P('M10 24Q10 12 32 12Q54 12 54 24V27H10Z', wood, { opacity: 0.55 })]
  return [SH, ...lid,
    R(10, 29, 44, 26, 4, wood), R(10, 47, 44, 8, 4, woodD),
    R(10, 29, 44, 5, 0, band), R(16, 29, 5, 26, 0, bandD), R(43, 29, 5, 26, 0, bandD),
    R(27, 30, 10, 12, 3, band), C(32, 35, 2, K.ink), R(31, 35, 2, 4, 1, K.ink)]
}
export function medal(inner: ArtDef, rim = K.gold, rimD = K.goldD, face = K.cream): ArtDef {
  return [SH,
    P('M20 6H30L34 24H24Z', K.rose), P('M44 6H34L30 24H40Z', K.olive),
    C(32, 37, 19, rimD), C(32, 35.5, 19, rim), C(32, 35.5, 15, face),
    nest(inner, 19.2, 22.7, 0.4)]
}
export function badge(inner: ArtDef, fill: string, dark: string): ArtDef {
  return [SH,
    P('M32 5L52 13V31C52 44 43 52 32 57C21 52 12 44 12 31V13Z', dark),
    P('M32 8L49 15V31C49 42 41 49 32 53.5C23 49 15 42 15 31V15Z', fill),
    nest(inner, 16, 15, 0.5)]
}
