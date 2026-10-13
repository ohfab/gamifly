import { memo, type CSSProperties } from 'react'
import { type ArtDef, medal, render } from './kit'
import { ITEM_ART } from './items'
import { WORLD_ART } from './world'
import { FOOD_ART } from './food'
import { SPECIAL_ART } from './special'

const BASE: Record<string, ArtDef> = { ...ITEM_ART, ...WORLD_ART, ...FOOD_ART, ...SPECIAL_ART }

/** Achievement medals wrap a smaller illustration. */
const MEDALS: Record<string, string> = {
  awaken: 'sunrise', first: 'sprout', q50: 'swords', lv5: 'stairs', lv10: 'medal_plain', streak3: 'flame', streak7: 'comet',
  water: 'drop', steps: 'run_shoe', sleep: 'moon_sleep', closet10: 'dress', outfit: 'mirror', clean: 'broom', fridge: 'fridge',
  legend: 'star', fusion: 'crystal_ball', shop: 'boba', rich: 'coin', boss: 'boss_dragon', gate: 'gate', job: 'tiara', journal: 'book', chef: 'bowl',
}
for (const [k, inner] of Object.entries(MEDALS)) BASE[`ach_${k}`] = medal(BASE[inner] ?? BASE.star)

export const ART_KEYS = Object.keys(BASE)

/** Old saves stored emoji; map the ones we know, everything else gets a neutral sparkle. */
const EMOJI: Record<string, string> = {
  '🧋': 'boba', '🎬': 'clapper', '💅': 'polish', '🎀': 'bow', '🎁': 'box_pastel', '📺': 'gamepad', '🧶': 'hoodie', '🔌': 'plug', '🍵': 'tea',
  '🍱': 'bowl', '💍': 'ring', '🛂': 'letter', '🔑': 'key', '☂️': 'rain', '💇‍♀️': 'scrunchie', '🩹': 'heart', '📦': 'box', '✨': 'sparkle',
  '✅': 'star', '🔥': 'flame', '⬆️': 'stairs', '🌅': 'sunrise', '🔮': 'crystal_ball', '💖': 'heart', '🍰': 'cake', '📚': 'book', '☕': 'coffee',
}
export function resolveArt(name?: string): string {
  if (!name) return 'sparkle'
  if (BASE[name]) return name
  return EMOJI[name] ?? 'sparkle'
}

interface Props { name?: string; size?: number | string; className?: string; style?: CSSProperties; title?: string }

export const Art = memo(function Art({ name, size = 32, className, style, title }: Props) {
  const key = resolveArt(name)
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`art ${className ?? ''}`} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {render(BASE[key])}
    </svg>
  )
})

const FOOD_MAP: [RegExp, string][] = [
  [/milch|sahne/i, 'milk'], [/^ei|eier/i, 'egg'], [/käse|feta|mozz|parmesan/i, 'cheese'], [/apfel/i, 'apple'], [/banane/i, 'banana'],
  [/erdbeer/i, 'strawberry'], [/heidel|himbeer|beere/i, 'berries'], [/traube/i, 'grapes'], [/tomate/i, 'tomato'], [/brot|toast|bagel|brötchen/i, 'bread'],
  [/butter/i, 'butter'], [/joghurt|quark|skyr/i, 'yogurt'], [/hähn|huhn|chicken|pute/i, 'drumstick'], [/fleisch|steak|hack|rind/i, 'meat'],
  [/fisch|lachs|thun|garnele/i, 'fish'], [/salat|spinat|kohl|rucola/i, 'greens'], [/karotte|möhre/i, 'carrot'], [/avocado/i, 'avocado'],
  [/nudel|pasta|spaghetti|penne/i, 'pasta'], [/reis|sushi/i, 'rice'], [/eis\b|eiscreme/i, 'icecream'], [/pizza/i, 'pizza'], [/saft|juice|smoothie/i, 'juice'],
  [/wein|prosecco|sekt/i, 'wine'], [/bier/i, 'beer'], [/kaffee|espresso/i, 'coffee'], [/tee|matcha/i, 'tea'], [/zitrone|limette/i, 'lemon'],
  [/gurke/i, 'cucumber'], [/paprika|chili/i, 'pepper'], [/kartoffel|süßkartoffel/i, 'potato'], [/zwiebel/i, 'onion'], [/knoblauch/i, 'garlic'],
  [/pilz|champ/i, 'mushroom'], [/tofu/i, 'tofu'], [/schoko/i, 'chocolate'], [/kuchen|torte|muffin/i, 'cake'], [/keks|cookie/i, 'cookie'],
  [/pfirsich|mango|aprikose|nektarine/i, 'peach'], [/brokkoli/i, 'broccoli'], [/mais/i, 'corn'], [/honig/i, 'honey'], [/edamame|erbsen|bohnen/i, 'peas'],
  [/wurst|salami/i, 'sausage'], [/wasser/i, 'water_bottle'], [/müsli|haferflocken|granola|bowl/i, 'bowl'],
]
export const foodArt = (name: string) => FOOD_MAP.find(([r]) => r.test(name))?.[1] ?? 'jar'

const THING_MAP: [RegExp, string][] = [
  [/schlüssel/i, 'key'], [/schirm/i, 'rain'], [/fernbedienung|konsole|controller/i, 'gamepad'], [/kabel|lade|stecker|akku/i, 'plug'],
  [/decke|kissen|pulli|hoodie/i, 'hoodie'], [/pass|ausweis|dokument|vertrag|brief|papier/i, 'letter'], [/schmuck|ring|kette/i, 'ring'],
  [/pflaster|medizin|tablette|erste hilfe/i, 'heart'], [/haar|glätter|föhn|bürste/i, 'scrunchie'], [/buch|bücher|notiz/i, 'book'],
  [/kerze/i, 'candle'], [/pflanze|blume/i, 'sprout'], [/tasche|rucksack/i, 'handbag'], [/schuh/i, 'sneaker'], [/lampe|licht|birne/i, 'bulb'],
  [/werkzeug|hammer|schraube/i, 'sword'], [/kosmetik|lippenstift|makeup|parfum/i, 'lipstick'], [/spiegel/i, 'mirror'], [/uhr|wecker/i, 'clock'],
  [/geld|portemonnaie|geldbeutel|karte/i, 'pouch'], [/kopfhörer|airpods/i, 'headphones'], [/flasche/i, 'bottle'],
]
export const thingArt = (name: string) => THING_MAP.find(([r]) => r.test(name))?.[1] ?? (FOOD_MAP.some(([r]) => r.test(name)) ? foodArt(name) : 'box')

export const REWARD_ICONS = ['boba', 'clapper', 'polish', 'cake', 'book', 'candle', 'coffee', 'bag', 'ticket', 'gamepad', 'flower', 'sushi', 'pizza', 'icecream', 'lipstick', 'heart']
