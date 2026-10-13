import { type ArtDef, C, E, G, HL, K, L, P, R, SH, badge, spark } from './kit'
import { ITEM_ART } from './items'
import { WORLD_ART } from './world'

export const SPECIAL_ART: Record<string, ArtDef> = {
  // ---------- weekly bosses ----------
  boss_golem: [E(32, 58, 22, 3.5, K.ink, { opacity: 0.12 }),
    P('M10 54Q6 30 16 18Q32 4 48 18Q58 30 54 54Z', K.greyD), P('M14 54Q10 32 20 22Q32 12 44 22Q54 32 50 54Z', K.grey),
    L('M20 30L26 36L22 42M44 28L40 34', K.greyD, 2), L('M20 36Q24 32 28 36', K.ink, 2.5), L('M36 36Q40 32 44 36', K.ink, 2.5),
    E(32, 46, 6, 3, K.inkL), P('M24 8L28 2L30 10Z', K.greyD), P('M40 8L36 2L34 10Z', K.greyD), P('M48 14L54 10L52 18Z', K.lilac), E(23, 41, 3, 2, K.rose, { opacity: 0.35 }), E(41, 41, 3, 2, K.rose, { opacity: 0.35 }),
    P('M50 4Q54 8 50 12', 'none', { stroke: K.lilacD, strokeWidth: 1.5 }), L('M52 4H58L52 10H58', K.lilacD, 1.8)],
  boss_hydra: [E(32, 58, 22, 3.5, K.ink, { opacity: 0.12 }),
    L('M20 40Q12 20 18 12', K.leafD, 9), L('M44 40Q52 20 46 12', K.leafD, 9),
    C(18, 12, 7, K.leaf), C(46, 12, 7, K.leaf), C(16, 11, 1.6, K.ink), C(21, 11, 1.6, K.ink), C(44, 11, 1.6, K.ink), C(49, 11, 1.6, K.ink),
    P('M10 56Q8 34 32 30Q56 34 54 56Z', K.leaf), P('M18 56Q16 40 32 38Q48 40 46 56Z', K.sageL), C(26, 44, 2.5, K.ink), C(38, 44, 2.5, K.ink), L('M28 50Q32 53 36 50', K.ink, 2),
    R(8, 44, 8, 6, 1, K.creamD, { transform: 'rotate(-20 12 47)' }), R(48, 46, 8, 5, 1, K.blush, { transform: 'rotate(15 52 48)' }), R(26, 20, 10, 6, 1, K.sky, { transform: 'rotate(10 31 23)' })],
  boss_phantom: [E(32, 58, 18, 3, K.ink, { opacity: 0.1 }),
    P('M12 54V28Q12 6 32 6Q52 6 52 28V54L46 48L40 54L34 48L28 54L22 48L16 54Z', K.lilacL), P('M12 28Q12 6 32 6Q22 14 20 28V50L16 54L12 54Z', K.white, { opacity: 0.6 }),
    R(19, 22, 10, 14, 2, K.nightD), R(35, 22, 10, 14, 2, K.nightD), R(21, 24, 6, 10, 1, K.sky), R(37, 24, 6, 10, 1, K.sky), L('M26 42Q32 46 38 42', K.lilacD, 2.4),
    spark(54, 10, 3, K.sky), spark(8, 18, 2.5, K.sky)],
  boss_kraken: [E(32, 58, 24, 3.5, K.ink, { opacity: 0.12 }),
    ...[10, 20, 44, 54].map((x, i) => L(`M${x} 40Q${x + (i < 2 ? -6 : 6)} 50 ${x + (i < 2 ? 2 : -2)} 56`, K.roseD, 6)),
    P('M10 42Q8 10 32 8Q56 10 54 42Q44 48 32 46Q20 48 10 42Z', K.rose), C(24, 28, 6, K.white), C(40, 28, 6, K.white), C(25, 29, 3, K.ink), C(41, 29, 3, K.ink),
    L('M26 38Q32 42 38 38', K.roseD, 2.5), R(18, 44, 28, 8, 4, K.olive), R(18, 44, 28, 3, 2, K.sage), C(16, 18, 2.5, K.blush), C(46, 14, 2, K.blush)],
  boss_dragon: [E(32, 58, 22, 3.5, K.ink, { opacity: 0.12 }),
    P('M6 30L18 22L14 36Z', K.pinkD), P('M58 30L46 22L50 36Z', K.pinkD),
    P('M14 56Q10 28 32 20Q54 28 50 56Z', K.pink), P('M22 56Q20 40 32 36Q44 40 42 56Z', K.blush),
    ...[[22, 22], [32, 16], [42, 22]].map(([x, y], i) => P(`M${x - 4} ${y + 4}L${x} ${y - 6}L${x + 4} ${y + 4}Z`, [K.sky, K.yellow, K.lilac][i])),
    C(25, 32, 2.8, K.ink), C(39, 32, 2.8, K.ink), C(26, 31, 1, '#fff'), C(40, 31, 1, '#fff'), E(32, 40, 5, 3, K.pinkD), C(30, 40, 1, K.ink), C(34, 40, 1, K.ink),
    C(48, 10, 4, K.white), L('M46 12L52 6', K.rose, 2)],

  // ---------- focus gate ----------
  gate: [E(32, 58, 22, 3.5, K.ink, { opacity: 0.12 }),
    E(32, 34, 22, 26, K.lilacD), E(32, 34, 18, 22, K.night), E(32, 34, 13, 17, K.lilacD, { opacity: 0.6 }), E(32, 34, 8, 11, K.lilacL, { opacity: 0.7 }),
    spark(32, 34, 5, K.white), R(8, 54, 48, 5, 2.5, K.greyD), C(12, 18, 2, K.lilacL), C(54, 24, 1.6, K.lilacL), spark(50, 8, 3, K.lilac)],

  // ---------- job classes ----------
  job_monarch: badge(ITEM_ART.tiara, K.lilacL, K.lilacD),
  job_iron: badge(WORLD_ART.dumbbell, K.sageL, K.olive),
  job_sage: badge(ITEM_ART.book, K.cream, K.goldD),
  job_hearth: badge(WORLD_ART.house, K.blush, K.roseD),

  // ---------- Lumi (static) ----------
  lumi: [SH,
    L('M32 18Q31 10 33 6', K.olive, 2.5), P('M33 9Q24 2 20 8Q26 14 33 9Z', K.leaf), P('M33 9Q42 2 46 8Q40 14 33 9Z', K.green),
    P('M10 40Q10 16 32 16Q54 16 54 40Q54 56 32 56Q10 56 10 40Z', K.sageL), P('M14 44Q20 54 32 54Q44 54 50 44Q44 50 32 50Q20 50 14 44Z', K.sage, { opacity: 0.6 }),
    C(25, 36, 3, K.ink), C(39, 36, 3, K.ink), C(26, 35, 1, '#fff'), C(40, 35, 1, '#fff'), L('M29 43Q32 46 35 43', K.ink, 2),
    E(19, 42, 3.5, 2.2, K.rose, { opacity: 0.5 }), E(45, 42, 3.5, 2.2, K.rose, { opacity: 0.5 }), HL(18, 26, 3, 5, -40)],
}
void G
