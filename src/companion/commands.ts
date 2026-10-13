import type { SkillId } from '../game/skills'
import { todayLog, useGame, type Tab } from '../store/useGame'

const TABS: Tab[] = ['status', 'quests', 'home', 'style', 'life', 'inventory']

/** Executes a chip action from Lumi. Returns a short confirmation, or null when nothing needs saying. */
export function runCmd(cmd: string): string | null {
  const s = useGame.getState()
  const [k, arg] = cmd.split(':')
  switch (k) {
    case 'tab':
      if (TABS.includes(arg as Tab)) { s.setTab(arg as Tab); s.setUi({ companionOpen: false }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      return null
    case 'tour':
      s.setUi({ companionOpen: false, tourStep: 0 })
      return null
    case 'guide':
      s.setUi({ handbook: arg || 'start' })
      return null
    case 'fridge':
      s.setTab('home'); s.setUi({ companionOpen: false, fridgeOpen: true })
      return null
    case 'chest':
      s.claimChest()
      return 'Kiste geöffnet!'
    case 'water+1':
      s.addHealth('water', 1)
      return `Eingetragen. Du bist jetzt bei ${todayLog(useGame.getState()).water} von 8 Gläsern.`
    case 'gate':
      s.setTab('life'); s.startGate(arg || 'C'); s.setUi({ companionOpen: false })
      return null
    case 'skill':
      s.castSkill(arg as SkillId)
      return null
    case 'done': {
      const q = s.quests.find((x) => x.id === arg)
      if (q && !q.done) { s.completeQuest(arg); return `„${q.title}“ ist erledigt. Stark!` }
      return null
    }
    default:
      return null
  }
}
