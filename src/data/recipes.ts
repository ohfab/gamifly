export interface Recipe { id: string; name: string; art: string; minutes: number; needs: string[]; extra: string[]; tip: string }

/** `needs` are keywords matched against fridge items; `extra` are pantry basics assumed at home. */
export const RECIPES: Recipe[] = [
  { id: 'r_omelette', name: 'Spinat-Omelette', art: 'egg', minutes: 10, needs: ['ei', 'spinat'], extra: ['Salz', 'Öl'], tip: 'Eier verquirlen, Spinat kurz anbraten, Eier drüber.' },
  { id: 'r_bowl', name: 'Joghurt-Beeren-Bowl', art: 'bowl', minutes: 5, needs: ['joghurt', 'erdbeer|beere'], extra: ['Haferflocken'], tip: 'Joghurt in eine Schale, Beeren und Flocken drauf.' },
  { id: 'r_pasta', name: 'Pasta Pomodoro', art: 'pasta', minutes: 20, needs: ['pasta|nudel', 'tomate'], extra: ['Knoblauch', 'Olivenöl'], tip: 'Tomaten mit Knoblauch einkochen, mit der Pasta schwenken.' },
  { id: 'r_avotoast', name: 'Avocado-Toast mit Ei', art: 'avocado', minutes: 10, needs: ['avocado', 'brot|toast'], extra: ['Zitrone', 'Chili'], tip: 'Avocado zerdrücken, auf Toast, Spiegelei on top.' },
  { id: 'r_smoothie', name: 'Matcha-Smoothie', art: 'tea', minutes: 5, needs: ['milch', 'banane|matcha'], extra: ['Honig'], tip: 'Alles in den Mixer, 30 Sekunden mixen.' },
  { id: 'r_stirfry', name: 'Gemüse-Pfanne mit Reis', art: 'rice', minutes: 25, needs: ['reis', 'paprika|brokkoli|karotte|edamame'], extra: ['Sojasoße'], tip: 'Gemüse scharf anbraten, mit Sojasoße ablöschen, auf Reis servieren.' },
  { id: 'r_salad', name: 'Bunter Salat', art: 'greens', minutes: 10, needs: ['salat|spinat|rucola', 'tomate|gurke|paprika'], extra: ['Öl', 'Essig'], tip: 'Alles schneiden, Dressing aus Öl, Essig, Salz und Senf.' },
  { id: 'r_pancakes', name: 'Fluffy Pancakes', art: 'cake', minutes: 20, needs: ['ei', 'milch'], extra: ['Mehl', 'Zucker'], tip: '1 Ei, 150 ml Milch, 120 g Mehl verrühren, kleine Pancakes braten.' },
  { id: 'r_soup', name: 'Kartoffel-Suppe', art: 'bowl', minutes: 30, needs: ['kartoffel', 'zwiebel|karotte'], extra: ['Brühe'], tip: 'Alles würfeln, in Brühe weich kochen, pürieren.' },
  { id: 'r_overnight', name: 'Overnight Oats', art: 'yogurt', minutes: 5, needs: ['milch|joghurt', 'banane|beere|erdbeer|apfel'], extra: ['Haferflocken'], tip: 'Abends anrühren, morgens fertig. Perfekt für stressige Tage.' },
  { id: 'r_tofu', name: 'Knuspriger Tofu mit Reis', art: 'tofu', minutes: 25, needs: ['tofu', 'reis'], extra: ['Speisestärke', 'Sojasoße'], tip: 'Tofu würfeln, in Stärke wenden, knusprig braten.' },
  { id: 'r_wrap', name: 'Hähnchen-Wrap', art: 'drumstick', minutes: 15, needs: ['hähn|huhn|chicken', 'salat|gurke|tomate'], extra: ['Wraps', 'Joghurt'], tip: 'Hähnchen anbraten, mit Gemüse und Joghurt-Soße einrollen.' },
]

const NICE: Record<string, string> = {
  ei: 'Eier', spinat: 'Spinat', joghurt: 'Joghurt', erdbeer: 'Erdbeeren', pasta: 'Pasta', tomate: 'Tomaten', avocado: 'Avocado', brot: 'Brot',
  milch: 'Milch', banane: 'Banane', reis: 'Reis', paprika: 'Paprika', salat: 'Salat', kartoffel: 'Kartoffeln', zwiebel: 'Zwiebeln', tofu: 'Tofu', 'hähn': 'Hähnchen',
}
export const niceIngredient = (k: string) => NICE[k] ?? k.charAt(0).toUpperCase() + k.slice(1)

export function matchRecipes(fridgeNames: string[]) {
  const names = fridgeNames.map((n) => n.toLowerCase())
  return RECIPES.map((r) => {
    const have = r.needs.filter((k) => names.some((n) => new RegExp(k, 'i').test(n)))
    const missing = r.needs.filter((k) => !have.includes(k)).map((k) => niceIngredient(k.split('|')[0]))
    return { r, have: have.length, missing, score: have.length / r.needs.length }
  }).sort((a, b) => b.score - a.score || a.r.minutes - b.r.minutes)
}
