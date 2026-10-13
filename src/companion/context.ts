import { useGame, todayLog, vitals } from '../store/useGame'
import { BOSSES, GATE_RANKS, JOBS } from '../game/world'
import { rankFor, xpToNext } from '../game/leveling'
import { matchRecipes } from '../data/recipes'
import { addDays, dayKey, daysBetween } from '../lib/util'

export const cleanliness = (lastCleaned: number) => Math.max(0, Math.round(100 - ((Date.now() - lastCleaned) / 86400000) * 14))

export interface Suggestion { text: string; actions: { label: string; cmd: string }[] }

/** Compact, model-friendly snapshot of the player's day. */
export function snapshot() {
  const s = useGame.getState()
  const d = todayLog(s)
  const v = vitals(s)
  const boss = s.boss ? BOSSES[s.boss.idx] : null
  const today = dayKey()
  return {
    date: new Date().toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    player: { name: s.player.name, level: s.player.level, rank: rankFor(s.player.level).rank, xp: s.player.xp, xpToNext: xpToNext(s.player.level), gold: s.player.gold, gems: s.player.gems, streak: s.player.streak, freeStatPoints: s.player.statPoints, title: s.player.title, job: JOBS.find((j) => j.id === s.job)?.name ?? null },
    vitals: { hp: `${v.hp}/${v.maxHp}`, mp: `${v.mp}/${v.maxMp}` },
    today: { water: d.water, steps: d.steps, workoutMin: d.workoutMin, sleepHours: d.sleep ?? null, mood: d.mood ?? null, meditationMin: d.meditationMin, outfitLogged: !!s.wornLog[today], journal: !!s.journal[today], chestClaimed: s.chestDay === today },
    openQuests: s.quests.filter((q) => !q.done).map((q) => ({ id: q.id, title: q.title, type: q.type, manual: !q.target, progress: q.target ? `${q.progress ?? 0}/${q.target}` : undefined })),
    boss: boss && s.boss ? { name: boss.name, hp: s.boss.hp, maxHp: s.boss.maxHp, weakness: boss.weakness, defeated: s.boss.defeated } : null,
    gate: s.gate ? { rank: s.gate.rank, minutesLeft: Math.max(0, Math.ceil((s.gate.start + s.gate.minutes * 60000 - Date.now()) / 60000)) } : null,
    rooms: s.home.rooms.map((r) => ({ name: r.name, cleanliness: cleanliness(r.lastCleaned), openNeeds: r.needs.filter((n) => !n.done).map((n) => n.text) })),
    fridge: s.home.fridge.map((f) => ({ name: f.name, qty: `${f.qty} ${f.unit}`, daysLeft: f.expires ? daysBetween(today, f.expires) : null })),
    shoppingList: s.home.shopping.filter((x) => !x.done).map((x) => x.name),
    wardrobe: { items: s.wardrobe.length, outfits: s.outfits.length },
    lightsOn: s.home.devices.filter((x) => x.kind === 'light' && x.on).map((x) => x.name),
  }
}

export function expiring() {
  const s = useGame.getState()
  const t = dayKey()
  return s.home.fridge.filter((f) => f.expires && daysBetween(t, f.expires) <= 2).sort((a, b) => a.expires!.localeCompare(b.expires!))
}

export function dirtiest() {
  const rooms = useGame.getState().home.rooms
  return [...rooms].sort((a, b) => a.lastCleaned - b.lastCleaned)[0]
}

export function nextStep(): Suggestion {
  const s = useGame.getState()
  const d = todayLog(s)
  const today = dayKey()
  const hour = new Date().getHours()
  const penalty = s.quests.find((q) => q.type === 'penalty' && !q.done)
  if (penalty) return { text: `Zuerst raus aus der Strafzone: ${penalty.title}. Danach geht alles leichter.`, actions: [{ label: 'Erledigt!', cmd: `done:${penalty.id}` }, { label: 'Zu den Quests', cmd: 'tab:quests' }] }
  if (s.chestDay !== today) return { text: 'Deine Login-Kiste ist noch zu. Hol dir erst mal deine Belohnung!', actions: [{ label: 'Kiste öffnen', cmd: 'chest' }] }
  if (s.player.statPoints > 0) return { text: `Du hast ${s.player.statPoints} freie Statuspunkte. Verteil sie im Status-Fenster, sonst verschenkst du Power.`, actions: [{ label: 'Zum Status', cmd: 'tab:status' }] }
  const waterQ = s.quests.find((q) => q.id === 'd_water' && !q.done)
  if (waterQ && d.water < 8 && (hour >= 9 || d.water === 0)) return { text: `Du bist bei ${d.water} von 8 Gläsern. Trink jetzt ein Glas Wasser, das ist der leichteste Punkt des Tages.`, actions: [{ label: '+1 Glas', cmd: 'water+1' }] }
  const manual = s.quests.filter((q) => q.type === 'daily' && !q.done && !q.target)
  if (manual.length) return { text: `Offen in deiner Daily Quest: ${manual.map((q) => q.title).join(', ')}. Fang mit „${manual[0].title}“ an.`, actions: [{ label: 'Erledigt!', cmd: `done:${manual[0].id}` }, { label: 'Zur Daily', cmd: 'tab:status' }] }
  const move = s.quests.find((q) => (q.id === 'd_steps' || q.id === 'd_move') && !q.done)
  if (move) return { text: move.id === 'd_steps' ? `Dir fehlen noch ${Math.max(0, 6000 - d.steps).toLocaleString('de-DE')} Schritte. Ein kurzer Spaziergang macht das.` : `Noch ${Math.max(0, 15 - d.workoutMin)} Minuten Workout. Pilates, Yoga oder Tanzen zählen auch.`, actions: [{ label: 'Zum Life-Tab', cmd: 'tab:life' }] }
  const room = dirtiest()
  if (room && cleanliness(room.lastCleaned) < 45) return { text: `${room.name} hat nur noch ${cleanliness(room.lastCleaned)} % Sauberkeit. 10 Minuten aufräumen bringt XP und trifft die Chaos-Hydra.`, actions: [{ label: 'Zur Wohnung', cmd: 'tab:home' }] }
  if (hour >= 19 && !s.journal[today]) return { text: 'Der Tag neigt sich. Wie wär’s mit deiner Abend-Reflexion? Drei Dinge, für die du dankbar bist.', actions: [{ label: 'Reflexion schreiben', cmd: 'tab:life' }] }
  if (!s.wornLog[today] && s.wardrobe.length) return { text: 'Du hast heute noch kein Outfit geloggt. Stell dir eins zusammen, das gibt XP und Charme.', actions: [{ label: 'Style Studio', cmd: 'tab:style' }] }
  if (!s.gate) return { text: 'Alles Wichtige ist erledigt. Stark! Wenn du noch Energie hast, betritt ein Fokus-Gate Rang C für 25 Minuten.', actions: [{ label: 'Gate C starten', cmd: 'gate:C' }] }
  return { text: 'Du läufst gerade durch ein Gate. Bleib fokussiert, ich melde mich, wenn du durch bist.', actions: [] }
}

export function briefing(): Suggestion {
  const s = useGame.getState()
  const d = todayLog(s)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Hey' : 'Guten Abend'
  const dailies = s.quests.filter((q) => q.type === 'daily')
  const open = dailies.filter((q) => !q.done)
  const parts = [`${greet}, ${s.player.name}! Du bist Level ${s.player.level} mit ${s.player.streak} Tagen Streak.`]
  parts.push(open.length ? `In deiner Daily Quest sind noch ${open.length} von ${dailies.length} Aufgaben offen.` : 'Deine Daily Quest ist komplett. Wunderbar!')
  parts.push(`Wasser: ${d.water} von 8 Gläsern, Schritte: ${d.steps.toLocaleString('de-DE')}.`)
  const exp = expiring()
  if (exp.length) parts.push(`Im Kühlschrank läuft bald ab: ${exp.slice(0, 3).map((f) => f.name).join(', ')}.`)
  if (s.boss && !s.boss.defeated) parts.push(`${BOSSES[s.boss.idx].name} hat noch ${s.boss.hp} HP. Schwäche: ${BOSSES[s.boss.idx].weakness}.`)
  const bonus = s.quests.find((q) => q.bonus && !q.done)
  if (bonus) parts.push(`Bonus-Quest heute: ${bonus.title}.`)
  const n = nextStep()
  parts.push(`Mein Tipp: ${n.text}`)
  return { text: parts.join(' '), actions: n.actions }
}

export function recipeIdeas() {
  const s = useGame.getState()
  return matchRecipes(s.home.fridge.map((f) => f.name)).filter((m) => m.have > 0).slice(0, 3)
}

export const gateByMinutes = (min: number) => [...GATE_RANKS].sort((a, b) => Math.abs(a.minutes - min) - Math.abs(b.minutes - min))[0]
export const tomorrow = () => addDays(dayKey(), 1)
