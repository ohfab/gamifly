const MAP: [RegExp, string][] = [
  [/milch|sahne/i, '🥛'], [/ei(er)?$|^ei/i, '🥚'], [/käse|feta|mozz/i, '🧀'], [/apfel/i, '🍎'], [/banane/i, '🍌'], [/erdbeer/i, '🍓'],
  [/heidel|beere/i, '🫐'], [/tomate/i, '🍅'], [/brot|toast|bagel/i, '🍞'], [/butter/i, '🧈'], [/joghurt|quark|skyr/i, '🥣'],
  [/fleisch|steak|hack/i, '🥩'], [/hähn|huhn|chicken/i, '🍗'], [/fisch|lachs|thun/i, '🐟'], [/salat|spinat|kohl/i, '🥬'],
  [/karotte|möhre/i, '🥕'], [/avocado/i, '🥑'], [/nudel|pasta|spaghetti/i, '🍝'], [/reis/i, '🍚'], [/eis/i, '🍦'], [/pizza/i, '🍕'],
  [/wasser/i, '💧'], [/saft|juice/i, '🧃'], [/wein|prosecco/i, '🍷'], [/bier/i, '🍺'], [/kaffee|espresso/i, '☕'], [/tee|matcha/i, '🍵'],
  [/zitrone|limette/i, '🍋'], [/gurke/i, '🥒'], [/paprika/i, '🫑'], [/kartoffel/i, '🥔'], [/zwiebel/i, '🧅'], [/knoblauch/i, '🧄'],
  [/pilz|champ/i, '🍄'], [/tofu/i, '🧊'], [/schoko/i, '🍫'], [/kuchen|torte/i, '🍰'], [/trauben/i, '🍇'], [/mango/i, '🥭'],
  [/pfirsich/i, '🍑'], [/brokkoli/i, '🥦'], [/mais/i, '🌽'], [/honig/i, '🍯'], [/edamame|erbsen|bohnen/i, '🫛'], [/wurst/i, '🌭'],
]
export const foodEmoji = (name: string) => MAP.find(([r]) => r.test(name))?.[1] ?? '🥫'
