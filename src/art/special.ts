import { type ArtDef, C, E, G, HL, K, L, P, R, SH, badge, spark } from './kit'
import { ITEM_ART } from './items'
import { WORLD_ART } from './world'

export const SPECIAL_ART: Record<string, ArtDef> = {
  // ---------- weekly bosses ----------
  boss_golem: [E(32, 58, 23, 3.5, '#000', { opacity: 0.35 }),
    P('M7 57L11 31L19 18L32 11L45 18L53 31L57 57Z', '#232a3c'), P('M14 57L17 34L24 24L32 19L40 24L47 34L50 57Z', '#353e55'),
    P('M23 13L27 3L31 12Z', '#232a3c'), P('M41 13L37 3L33 12Z', '#232a3c'),
    L('M21 29L27 38L22 47M43 27L38 36L44 45M29 49L33 56', K.orange, 1.6, { opacity: 0.95 }),
    E(25, 35, 7, 4.5, K.sky, { opacity: 0.25 }), E(39, 35, 7, 4.5, K.sky, { opacity: 0.25 }),
    P('M20 33L29 35L28 38L20 37Z', K.sky), P('M44 33L35 35L36 38L44 37Z', K.sky), R(26, 44, 12, 3, 1, K.ink)],
  boss_hydra: [E(32, 58, 23, 3.5, '#000', { opacity: 0.35 }),
    L('M19 46Q9 28 15 13', '#173f37', 8), L('M45 46Q55 28 49 13', '#173f37', 8), L('M32 42Q31 24 32 9', '#1d5146', 9),
    ...[[15, 12], [49, 12], [32, 8]].map(([x, y]) => G(`translate(${x} ${y})`, [
      P('M-8 2Q-8 -6 0 -7Q8 -6 8 2L4 6L0 4L-4 6Z', '#24695a'), P('M-3 -1L-1 1L-4 1Z', K.red), P('M3 -1L1 1L4 1Z', K.red),
      P('M-4 6L-3 9L-2 6M2 6L3 9L4 6', 'none', { stroke: K.white, strokeWidth: 1 })])),
    P('M8 58Q8 38 32 34Q56 38 56 58Z', '#123a32'), P('M18 58Q18 44 32 41Q46 44 46 58Z', '#1d5146'),
    L('M22 50L26 47M38 47L42 50M30 54L34 54', K.green, 1.4, { opacity: 0.6 })],
  boss_phantom: [E(32, 58, 20, 3, '#000', { opacity: 0.35 }),
    P('M10 58Q14 40 16 26Q18 6 32 6Q46 6 48 26Q50 40 54 58L46 52L40 58L34 52L28 58L22 52L16 58Z', '#161c38'),
    P('M10 58Q14 40 16 26Q18 6 32 6Q24 12 22 26Q20 44 16 58Z', '#222a52'),
    P('M20 30Q20 14 32 12Q44 14 44 30Q44 38 32 41Q20 38 20 30Z', '#04060c'),
    E(26, 28, 7, 4, K.lilac, { opacity: 0.3 }), E(38, 28, 7, 4, K.lilac, { opacity: 0.3 }),
    E(26, 28, 3.6, 1.6, K.lilacL), E(38, 28, 3.6, 1.6, K.lilacL),
    L('M13 46Q7 37 9 28M51 46Q57 37 55 28', K.lilacD, 2, { opacity: 0.7 }), spark(54, 12, 3, K.lilac), spark(9, 17, 2.4, K.lilac)],
  boss_kraken: [E(32, 58, 25, 3.5, '#000', { opacity: 0.35 }),
    ...[9, 19, 45, 55].map((x, i) => L(`M${x} 40Q${x + (i < 2 ? -7 : 7)} 50 ${x + (i < 2 ? 3 : -3)} 57`, '#5a1830', 6)),
    L('M27 44Q24 52 28 58M37 44Q40 52 36 58', '#4a1428', 5),
    P('M9 42Q7 9 32 7Q57 9 55 42Q45 48 32 46Q19 48 9 42Z', '#3a1226'), P('M15 38Q14 14 32 12Q22 20 21 38Z', '#561a36'),
    E(24, 28, 7, 4, K.yellow, { opacity: 0.25 }), E(40, 28, 7, 4, K.yellow, { opacity: 0.25 }),
    P('M18 27L29 29L27 32L19 30Z', K.yellow), P('M46 27L35 29L37 32L45 30Z', K.yellow), C(24, 30, 1.2, K.ink), C(40, 30, 1.2, K.ink),
    L('M24 39H40', K.ink, 2)],
  boss_dragon: [E(32, 58, 23, 3.5, '#000', { opacity: 0.35 }),
    P('M4 34L20 18L22 34L14 40Z', '#3a1420'), P('M60 34L44 18L42 34L50 40Z', '#3a1420'),
    L('M6 33L18 21M58 33L46 21', K.redD, 1.2),
    P('M14 57Q10 30 32 20Q54 30 50 57Z', '#511a2a'), P('M22 57Q20 40 32 35Q44 40 42 57Z', '#6e2236'),
    P('M22 24L16 8L27 20Z', K.gold), P('M42 24L48 8L37 20Z', K.gold),
    E(25, 32, 6, 3.6, K.orange, { opacity: 0.35 }), E(39, 32, 6, 3.6, K.orange, { opacity: 0.35 }),
    P('M20 30L29 32L28 34.5L21 33.5Z', K.orange), P('M44 30L35 32L36 34.5L43 33.5Z', K.orange),
    P('M26 44L29 48L32 44L35 48L38 44', 'none', { stroke: K.white, strokeWidth: 1.4, strokeLinejoin: 'round' }),
    L('M30 40L29 42M34 40L35 42', K.ink, 1.6)],

  // ---------- gate ----------
  gate: [E(32, 59, 23, 3.5, '#000', { opacity: 0.35 }),
    E(32, 33, 23, 27, K.skyD, { opacity: 0.35 }), E(32, 33, 20, 24, '#0b1a3a'), E(32, 33, 20, 24, 'none', { stroke: K.sky, strokeWidth: 2.2 }),
    E(32, 33, 14, 17, 'none', { stroke: K.skyD, strokeWidth: 1.6, opacity: 0.8 }), E(32, 33, 8, 10, K.sky, { opacity: 0.35 }),
    E(32, 33, 4, 5, K.skyL), spark(32, 33, 7, K.white, { opacity: 0.9 }),
    L('M14 18L10 14M50 18L54 14M12 48L8 52M52 48L56 52', K.sky, 1.4, { opacity: 0.7 }), spark(50, 8, 3, K.skyL), spark(12, 10, 2, K.skyL)],
  red_gate: [E(32, 59, 23, 3.5, '#000', { opacity: 0.35 }),
    E(32, 33, 23, 27, K.redD, { opacity: 0.4 }), E(32, 33, 20, 24, '#2a0610'), E(32, 33, 20, 24, 'none', { stroke: K.red, strokeWidth: 2.4 }),
    E(32, 33, 14, 17, 'none', { stroke: K.redD, strokeWidth: 1.6 }), E(32, 33, 8, 10, K.red, { opacity: 0.4 }), E(32, 33, 3.5, 5, '#ffd0d8'),
    L('M14 18L10 14M50 18L54 14M12 48L8 52M52 48L56 52', K.red, 1.4, { opacity: 0.8 })],
  shadow: [E(32, 59, 18, 3, K.lilacD, { opacity: 0.5 }),
    P('M18 58Q16 40 20 30Q22 18 32 16Q42 18 44 30Q48 40 46 58L40 54L35 58L32 54L29 58L24 54Z', '#0d1024'),
    P('M24 30Q24 20 32 19Q40 20 40 30Q40 36 32 38Q24 36 24 30Z', '#04050c'),
    E(28, 28, 2.6, 1.3, K.lilacL), E(36, 28, 2.6, 1.3, K.lilacL), E(28, 28, 5, 3, K.lilac, { opacity: 0.35 }), E(36, 28, 5, 3, K.lilac, { opacity: 0.35 }),
    L('M16 44Q10 34 14 24M48 44Q54 34 50 24', K.lilacD, 2, { opacity: 0.8 })],
  skill: [P('M32 4L56 18V46L32 60L8 46V18Z', '#0e1630'), P('M32 4L56 18V46L32 60L8 46V18Z', 'none', { stroke: K.sky, strokeWidth: 2 }),
    P('M36 12L20 36H31L27 52L45 26H34Z', K.sky), P('M36 12L20 36H31L27 52L45 26H34Z', 'none', { stroke: K.skyL, strokeWidth: 1 })],
  mana: [SH, P('M32 6C22 22 16 30 16 40A16 16 0 0 0 48 40C48 30 42 22 32 6Z', K.skyD), P('M32 12C25 24 21 31 21 40A11 11 0 0 0 43 40C43 31 39 24 32 12Z', K.sky), HL(26, 36, 2.6, 5), spark(45, 14, 3.5, K.skyL)],

  // ---------- job classes ----------
  job_monarch: badge(ITEM_ART.tiara, K.lilacL, K.lilacD),
  job_iron: badge(WORLD_ART.dumbbell, K.sageL, K.olive),
  job_sage: badge(ITEM_ART.book, K.cream, K.goldD),
  job_hearth: badge(WORLD_ART.house, K.blush, K.roseD),

  // ---------- the System (formerly Lumi) ----------
  lumi: [P('M32 3L57 17.5V46.5L32 61L7 46.5V17.5Z', '#0b1430'),
    P('M32 3L57 17.5V46.5L32 61L7 46.5V17.5Z', 'none', { stroke: K.sky, strokeWidth: 2 }),
    P('M32 10L51 21V43L32 54L13 43V21Z', 'none', { stroke: K.sky, strokeWidth: 1, opacity: 0.45 }),
    L('M32 3V10M57 17.5L51 21M57 46.5L51 43M32 61V54M7 46.5L13 43M7 17.5L13 21', K.sky, 1.4),
    E(32, 32, 14, 8.5, '#03060f'), E(32, 32, 14, 8.5, 'none', { stroke: K.skyL, strokeWidth: 1.6 }),
    C(32, 32, 5.5, K.sky), C(32, 32, 2.3, '#eaf8ff'), E(32, 32, 9, 9, K.sky, { opacity: 0.15 })],
}
void G
