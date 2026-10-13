import { todayLog, useGame, type Tab } from '../store/useGame'
import { BOSSES } from '../game/world'
import { cleanliness, dirtiest, expiring } from './context'

/** One short contextual hint per tab, shown once a day in Lumi's bubble. */
export function tipFor(tab: Tab): string | null {
  const s = useGame.getState()
  const d = todayLog(s)
  switch (tab) {
    case 'status': {
      const open = s.quests.filter((q) => q.type === 'daily' && !q.done).length
      if (s.player.statPoints) return `Du hast ${s.player.statPoints} freie Statuspunkte! Tippe auf das Plus bei einem Attribut.`
      return open ? `Noch ${open} Aufgaben in deiner Daily Quest. Tippe mich an für dein Tagesbriefing.` : 'Daily Quest geschafft! Der Wochenboss wartet auf deinen nächsten Treffer.'
    }
    case 'quests': {
      const bonus = s.quests.find((q) => q.bonus && !q.done)
      return bonus ? `Bonus-Quest heute: ${bonus.title}. Gibt 2 Kristalle extra.` : 'Halte den Haken gedrückt, um eine Quest abzuschließen.'
    }
    case 'home': {
      const e = expiring()
      if (e.length) return `${e[0].name} läuft bald ab. Im Kühlschrank zeige ich dir Rezepte dafür.`
      const r = dirtiest()
      return r ? `${r.name} ist bei ${cleanliness(r.lastCleaned)} % Sauberkeit. Tippe den Raum an.` : null
    }
    case 'style':
      return s.wardrobe.length ? (s.wornLog[Object.keys(s.wornLog).sort().pop() ?? ''] ? 'Unter Vorschläge stelle ich dir Outfits für jeden Anlass zusammen.' : 'Noch kein Outfit heute geloggt. Anprobieren und „Heute tragen“ gibt XP.') : 'Fotografiere dein erstes Kleidungsstück. Farbe und Stoff erkenne ich automatisch.'
    case 'life':
      return d.water < 8 ? `Du bist bei ${d.water} von 8 Gläsern. Tippe ein Glas an, um zu trinken.` : 'Wasserziel geschafft! Wie wär’s mit einem Fokus-Gate?'
    case 'inventory': {
      const boss = s.boss && !s.boss.defeated ? BOSSES[s.boss.idx] : null
      if (s.inventory.some((i) => i.isNew)) return 'Neue Items in deiner Tasche! Tippe sie an für Details.'
      return boss ? `Tipp: Drei Items gleicher Seltenheit ergeben bei der Fusion etwas Besseres.` : 'Lege im Shop eigene echte Belohnungen an.'
    }
  }
}
