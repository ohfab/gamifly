import type { GameState } from '../store/useGame'

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  title?: string
  check: (s: GameState) => boolean
}

const allDays = (s: GameState) => Object.values(s.health)

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a_awaken', name: 'Erwacht', desc: 'Werde zum Player.', icon: '🌅', title: 'Erwachte Seele', check: () => true },
  { id: 'a_first', name: 'Erste Quest', desc: 'Schließe deine erste Quest ab.', icon: '🌱', check: (s) => s.stats.questsDone >= 1 },
  { id: 'a_q50', name: 'Questmaschine', desc: '50 Quests abgeschlossen.', icon: '⚔️', title: 'Questmaschine', check: (s) => s.stats.questsDone >= 50 },
  { id: 'a_lv5', name: 'Aufstieg', desc: 'Erreiche Level 5.', icon: '🪜', check: (s) => s.player.level >= 5 },
  { id: 'a_lv10', name: 'Rang D', desc: 'Erreiche Level 10.', icon: '🏅', title: 'Hunter · Rang D', check: (s) => s.player.level >= 10 },
  { id: 'a_streak3', name: 'Warm-up', desc: '3-Tage-Streak.', icon: '🔥', check: (s) => s.player.bestStreak >= 3 },
  { id: 'a_streak7', name: 'Unaufhaltsam', desc: '7-Tage-Streak.', icon: '☄️', title: 'Unaufhaltsam', check: (s) => s.player.bestStreak >= 7 },
  { id: 'a_water', name: 'Hydration Hunter', desc: 'An einem Tag 10 Gläser Wasser.', icon: '💧', title: 'Hydration Hunter', check: (s) => allDays(s).some((d) => d.water >= 10) },
  { id: 'a_steps', name: 'Marathonherz', desc: '12.000 Schritte an einem Tag.', icon: '👟', check: (s) => allDays(s).some((d) => d.steps >= 12000) },
  { id: 'a_sleep', name: 'Dornröschen', desc: '9 Stunden geschlafen.', icon: '😴', title: 'Dornröschen', check: (s) => allDays(s).some((d) => (d.sleep ?? 0) >= 9) },
  { id: 'a_closet10', name: 'Closet Queen', desc: '10 Kleidungsstücke eingelesen.', icon: '👗', title: 'Closet Queen', check: (s) => s.wardrobe.length >= 10 },
  { id: 'a_outfit', name: 'Erstes Outfit', desc: 'Speichere ein Outfit.', icon: '🪞', check: (s) => s.outfits.length >= 1 },
  { id: 'a_clean', name: 'Ordnungs-Assassine', desc: 'Alle Räume am selben Tag aufgeräumt.', icon: '🧹', title: 'Ordnungs-Assassine', check: (s) => s.home.rooms.every((r) => Date.now() - r.lastCleaned < 86400000) },
  { id: 'a_fridge', name: 'Vorrats-Profi', desc: '10 Items im Kühlschrank verwaltet.', icon: '🧊', check: (s) => s.home.fridge.length >= 10 },
  { id: 'a_legend', name: 'Legendärer Fund', desc: 'Finde ein legendäres Item.', icon: '🌟', check: (s) => s.stats.legendaryFound >= 1 },
  { id: 'a_fusion', name: 'Alchemie', desc: 'Führe eine Fusion durch.', icon: '🔮', check: (s) => s.stats.fusions >= 1 },
  { id: 'a_shop', name: 'Treat Yourself', desc: 'Löse eine echte Belohnung ein.', icon: '🧋', check: (s) => s.stats.rewardsRedeemed >= 1 },
  { id: 'a_rich', name: 'Goldrausch', desc: 'Besitze 2.000 Gold.', icon: '🪙', check: (s) => s.player.gold >= 2000 },
]
