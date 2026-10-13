import { create } from 'zustand'
import { DEFAULT_LOOK, type AvatarLook } from '../avatar/look'
import { RED_GATE_MIN, RED_GATE_TASKS, SKILLS, ariseChance, shadowBossBonus, shadowXpBonus, type RedGate, type Shadow, type SkillId, type SkillState } from '../game/skills'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Cloth, DayLog, Device, FloorPlan, FridgeItem, InvEntry, ItemDef, LogEntry, Need, Outfit, Player, Quest, Room,
  RoomItem, ShopItem, Slot, StatKey, Stats, Toast,
} from '../game/types'
import { ITEMS, nextRarity, rollItem } from '../game/items'
import { DAILY_TEMPLATES, MAIN_TEMPLATES, PENALTY, WEEKLY_TEMPLATES, fromTpl } from '../game/quests'
import { STAT_KEYS, STAT_META, STAT_XP_PER_POINT, xpToNext } from '../game/leveling'
import { ACHIEVEMENTS } from '../game/achievements'
import { BONUS_POOL, BOSSES, GATE_RANKS, JOBS, JOB_BONUS, JOB_LEVEL, bossHpFor } from '../game/world'
import { RECIPES } from '../data/recipes'
import { DEFAULT_DEVICES, DEFAULT_FRIDGE, DEFAULT_RECTS, DEFAULT_ROOMS, DEFAULT_SHOPPING, KIND_NEEDS } from '../data/home'
import { idbStorage } from '../lib/storage'
import { dayKey, daysBetween, uid, weekKey } from '../lib/util'
import { sfx } from '../lib/sfx'
import { buzz } from '../lib/haptics'
import { foodArt, resolveArt, thingArt } from '../art/Art'

export type Tab = 'status' | 'quests' | 'home' | 'style' | 'life' | 'inventory'

export interface ChatMsg { id: string; role: 'user' | 'lumi'; text: string; t: number; actions?: { label: string; cmd: string }[] }
export interface CompanionSettings { tips: boolean; apiKey: string; useClaude: boolean }
export interface BossState { week: string; idx: number; hp: number; maxHp: number; defeated: boolean; arise?: number; extracted?: boolean }
export interface GateState { rank: string; start: number; minutes: number }
export interface Journal { text: string; grateful: string[] }

const zeroStats = (): Stats => ({ str: 0, vit: 0, agi: 0, int: 0, per: 0, cha: 0 })
const emptyDay = (): DayLog => ({ water: 0, steps: 0, workoutMin: 0, meditationMin: 0 })
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

export interface GameState {
  onboarded: boolean
  player: Player
  inventory: InvEntry[]
  equipped: Partial<Record<Slot, string>>
  customItems: ItemDef[]
  quests: Quest[]
  questDay: string
  questWeek: string
  history: Record<string, string[]>
  health: Record<string, DayLog>
  home: { rooms: Room[]; devices: Device[]; fridge: FridgeItem[]; shopping: ShopItem[]; cleanedWeek: string[]; plan?: FloorPlan }
  wardrobe: Cloth[]
  outfits: Outfit[]
  wornLog: Record<string, string[]>
  achievements: string[]
  titles: string[]
  stats: { questsDone: number; legendaryFound: number; fusions: number; rewardsRedeemed: number; bossesDefeated: number; gatesCleared: number; journalDays: number; recipesCooked: number; redGates: number; skillsCast: number; shadowsRaised: number }
  log: LogEntry[]
  settings: { theme: 'system' | 'monarch' | 'crimson'; sound: boolean; haptics: boolean }
  chestDay: string
  boss: BossState | null
  gate: GateState | null
  job: string | null
  journal: Record<string, Journal>
  cooked: Record<string, string[]>
  companion: CompanionSettings
  chat: ChatMsg[]
  tourDone: boolean
  tipsSeen: Record<string, string>
  avatar: AvatarLook
  skills: SkillState
  shadows: Shadow[]
  redGate: RedGate | null
  redGatePlan: { day: string; at: number | null }

  // ephemeral ui
  tab: Tab
  toasts: Toast[]
  levelUp: number | null
  reveal: ItemDef[] | null
  companionOpen: boolean
  handbook: string | null
  tourStep: number | null
  fridgeOpen: boolean
  bossHit: number
  ariseFx: number

  setTab: (t: Tab) => void
  notify: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  closeLevelUp: () => void
  closeReveal: () => void
  setUi: (p: Partial<Pick<GameState, 'companionOpen' | 'handbook' | 'tourStep' | 'fridgeOpen'>>) => void

  awaken: (name: string) => void
  rollover: () => void
  evaluate: () => void
  checkAchievements: () => void

  gainXp: (n: number, silent?: boolean) => void
  addStatXp: (s: Partial<Stats>) => void
  allocate: (k: StatKey) => void
  setTitle: (t: string) => void
  chooseJob: (id: string) => void

  completeQuest: (id: string) => void
  addQuest: (q: Pick<Quest, 'title' | 'type' | 'cat' | 'xp' | 'desc'> & { stat?: StatKey }) => void
  removeQuest: (id: string) => void
  claimChest: () => void

  damageBoss: (n: number, source: 'quest' | 'clean' | 'gate' | 'move' | 'food' | 'style') => void
  startGate: (rank: string) => void
  checkGate: () => void
  abandonGate: () => void
  saveJournal: (j: Journal) => void
  cookRecipe: (id: string) => void

  itemDef: (id: string) => ItemDef | undefined
  grant: (defId: string, qty?: number) => void
  useItem: (defId: string) => void
  equip: (defId: string) => void
  unequip: (slot: Slot) => void
  buy: (defId: string) => boolean
  addReward: (name: string, icon: string, price: number) => void
  removeReward: (id: string) => void
  fuse: (defIds: string[]) => ItemDef | null
  markSeen: () => void

  logHealth: (patch: Partial<DayLog>, day?: string) => void
  addHealth: (k: 'water' | 'steps' | 'workoutMin' | 'meditationMin', n: number) => void

  cleanRoom: (id: string) => void
  renameRoom: (id: string, name: string) => void
  setLayout: (rooms: Pick<Room, 'id' | 'name' | 'kind' | 'rect'>[], plan?: FloorPlan) => void
  addRoomItem: (roomId: string, item: Omit<RoomItem, 'id'>) => void
  removeRoomItem: (roomId: string, id: string) => void
  addNeed: (roomId: string, text: string) => void
  toggleNeed: (roomId: string, id: string) => void
  removeNeed: (roomId: string, id: string) => void
  needToShopping: (roomId: string, n: Need) => void
  toggleDevice: (id: string) => void
  setDevice: (id: string, value: number) => void
  addFridge: (f: Omit<FridgeItem, 'id'>) => void
  updateFridge: (id: string, patch: Partial<FridgeItem>) => void
  removeFridge: (id: string) => void
  addShopping: (name: string) => void
  toggleShopping: (id: string) => void
  clearShopping: () => void

  addCloth: (c: Omit<Cloth, 'id' | 'wears' | 'addedAt' | 'fav'>) => void
  updateCloth: (id: string, patch: Partial<Cloth>) => void
  removeCloth: (id: string) => void
  saveOutfit: (name: string, items: string[]) => void
  removeOutfit: (id: string) => void
  wearOutfit: (items: string[]) => void

  setSettings: (s: Partial<GameState['settings']>) => void
  setAvatar: (p: Partial<AvatarLook>) => void
  castSkill: (id: SkillId) => boolean
  arise: () => boolean
  checkRedGate: () => void
  confirmRedGate: () => void
  setCompanion: (s: Partial<CompanionSettings>) => void
  pushChat: (m: Omit<ChatMsg, 'id' | 't'>) => void
  clearChat: () => void
  seeTip: (id: string) => void
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

const initialPlayer = (name = ''): Player => ({
  name, level: 1, xp: 0, totalXp: 0, gold: 100, gems: 5, statPoints: 0,
  base: { str: 5, vit: 5, agi: 5, int: 5, per: 5, cha: 5 }, statXp: zeroStats(),
  title: 'Erwachte Seele', streak: 0, bestStreak: 0, createdAt: Date.now(),
})

const freshQuests = (): Quest[] => [...DAILY_TEMPLATES.map(fromTpl), ...WEEKLY_TEMPLATES.map(fromTpl), ...MAIN_TEMPLATES.map(fromTpl)]

const PERSIST_KEYS = [
  'onboarded', 'player', 'inventory', 'equipped', 'customItems', 'quests', 'questDay', 'questWeek', 'history',
  'health', 'home', 'wardrobe', 'outfits', 'wornLog', 'achievements', 'titles', 'stats', 'log', 'settings', 'chestDay',
  'boss', 'gate', 'job', 'journal', 'cooked', 'companion', 'chat', 'tourDone', 'tipsSeen', 'avatar', 'skills', 'shadows', 'redGate', 'redGatePlan',
] as const

const defaultCompanion = (): CompanionSettings => ({ tips: true, apiKey: '', useClaude: false })
const defaultStats = () => ({ questsDone: 0, legendaryFound: 0, fusions: 0, rewardsRedeemed: 0, bossesDefeated: 0, gatesCleared: 0, journalDays: 0, recipesCooked: 0, redGates: 0, skillsCast: 0, shadowsRaised: 0 })

const baseData = () => ({
  onboarded: false,
  player: initialPlayer(),
  inventory: [] as InvEntry[],
  equipped: {} as Partial<Record<Slot, string>>,
  customItems: [
    { id: 'rw_boba', name: 'Bubble Tea', desc: 'Echte Belohnung – gönn dir!', icon: 'boba', rarity: 'rare', type: 'reward', price: 250, effect: { kind: 'reward' } },
    { id: 'rw_movie', name: 'Filmabend', desc: 'Echte Belohnung – Netflix & chill.', icon: 'clapper', rarity: 'rare', type: 'reward', price: 400, effect: { kind: 'reward' } },
    { id: 'rw_nails', name: 'Nageldesign', desc: 'Echte Belohnung – fresh nails.', icon: 'polish', rarity: 'epic', type: 'reward', price: 1200, effect: { kind: 'reward' } },
  ] as ItemDef[],
  quests: freshQuests(),
  questDay: dayKey(),
  questWeek: weekKey(),
  history: {} as Record<string, string[]>,
  health: {} as Record<string, DayLog>,
  home: { rooms: DEFAULT_ROOMS.map((r) => ({ ...r, rect: DEFAULT_RECTS[r.id] })), devices: DEFAULT_DEVICES, fridge: DEFAULT_FRIDGE, shopping: DEFAULT_SHOPPING, cleanedWeek: [] as string[] },
  wardrobe: [] as Cloth[],
  outfits: [] as Outfit[],
  wornLog: {} as Record<string, string[]>,
  achievements: [] as string[],
  titles: ['Erwachte Seele'],
  stats: defaultStats(),
  log: [] as LogEntry[],
  settings: { theme: 'system' as GameState['settings']['theme'], sound: true, haptics: true },
  chestDay: '',
  boss: null as BossState | null,
  gate: null as GateState | null,
  job: null as string | null,
  journal: {} as Record<string, Journal>,
  cooked: {} as Record<string, string[]>,
  companion: defaultCompanion(),
  chat: [] as ChatMsg[],
  tourDone: false,
  tipsSeen: {} as Record<string, string>,
  avatar: DEFAULT_LOOK,
  skills: { day: '', spent: 0, buffs: {} } as SkillState,
  shadows: [] as Shadow[],
  redGate: null as RedGate | null,
  redGatePlan: { day: '', at: null } as { day: string; at: number | null },
})

const BOSS_WEAKNESS: Record<string, GameState['damageBoss'] extends (n: number, s: infer S) => void ? S : never> = {
  golem: 'quest', hydra: 'clean', phantom: 'gate', kraken: 'move', dragon: 'food',
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const log = (text: string, icon: string) => set((s) => ({ log: [{ t: Date.now(), text, icon }, ...s.log].slice(0, 80) }))
      const mapRoom = (id: string, fn: (r: Room) => Room) =>
        set((s) => ({ home: { ...s.home, rooms: s.home.rooms.map((r) => (r.id === id ? fn(r) : r)) } }))
      const jobBonus = (cat: string) => {
        const j = JOBS.find((x) => x.id === get().job)
        return j && (j.cats as string[]).includes(cat) ? 1 + JOB_BONUS : 1
      }

      return {
        ...baseData(),
        tab: 'status',
        toasts: [],
        levelUp: null,
        reveal: null,
        companionOpen: false,
        handbook: null,
        tourStep: null,
        fridgeOpen: false,
        bossHit: 0,
        ariseFx: 0,

        setTab: (tab) => set({ tab }),
        notify: (t) => {
          const id = uid()
          set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-3) }))
          setTimeout(() => get().dismiss(id), t.tone === 'warn' ? 6000 : 3800)
        },
        dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        closeLevelUp: () => set({ levelUp: null }),
        closeReveal: () => set({ reveal: null }),
        setUi: (p) => set(p),

        awaken: (name) => {
          const keep = { settings: get().settings, companion: get().companion }
          set({ ...baseData(), ...keep, onboarded: true, player: initialPlayer(name.trim() || 'Player') })
          get().grant('key_awaken')
          get().grant('potion_xp_s', 2)
          get().grant('eq_scrunchie')
          get().equip('eq_scrunchie')
          get().grant('streak_shield')
          get().grant('box_common')
          log('Du bist erwacht. Willkommen, Player.', 'sunrise')
          get().rollover()
          get().checkAchievements()
        },

        rollover: () => {
          const s = get()
          if (!s.onboarded) return
          const today = dayKey()
          let quests = s.quests
          let player = s.player
          if (s.questDay !== today) {
            const dailies = quests.filter((q) => q.type === 'daily')
            const allDone = dailies.length > 0 && dailies.every((q) => q.done)
            const failed = !allDone || daysBetween(s.questDay, today) > 1
            if (failed) {
              const shield = s.inventory.find((i) => i.defId === 'streak_shield' && i.qty > 0)
              if (shield && player.streak > 0) {
                set({ inventory: s.inventory.map((i) => (i.defId === 'streak_shield' ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) })
                get().notify({ tone: 'system', icon: 'shield_bow', title: 'Schleifen-Schild aktiviert', body: 'Dein Streak wurde geschützt. Die Strafzone wurde abgewehrt.' })
              } else {
                player = { ...player, streak: 0 }
                if (!quests.some((q) => q.type === 'penalty' && !q.done)) quests = [...quests, { ...fromTpl(PENALTY), id: 'p_' + uid() }]
                setTimeout(() => {
                  sfx.warn()
                  buzz([60, 40, 60])
                  get().notify({ tone: 'warn', icon: 'warning', title: 'Strafzone betreten', body: 'Die Daily Quest wurde nicht abgeschlossen. Eine Strafquest wurde zugewiesen.' })
                }, 900)
              }
            }
            quests = quests
              .filter((q) => !(q.type === 'penalty' && q.done))
              .filter((q) => !q.bonus)
              .map((q) => (q.type === 'daily' ? { ...q, done: false, progress: 0, doneAt: undefined } : q))
          }
          if (!quests.some((q) => q.bonus)) {
            const b = BONUS_POOL[hash(today) % BONUS_POOL.length]
            quests = [...quests, { id: 'b_' + today, title: b.title, desc: 'Bonus-Quest des Tages · +2 Kristalle', type: 'side', cat: b.cat, xp: 35, gold: 20, statXp: { [b.stat]: 25 }, done: false, progress: 0, bonus: true }]
          }
          const wk = weekKey()
          let cleanedWeek = s.home.cleanedWeek
          if (s.questWeek !== wk) {
            quests = quests.map((q) => (q.type === 'weekly' ? { ...q, done: false, progress: 0, doneAt: undefined } : q))
            cleanedWeek = []
          }
          let boss = s.boss
          if (!boss || boss.week !== wk) {
            const hp = bossHpFor(player.level)
            boss = { week: wk, idx: hash(wk) % BOSSES.length, hp, maxHp: hp, defeated: false }
          }
          let redGatePlan = s.redGatePlan
          if (redGatePlan?.day !== today) {
            const now = new Date()
            const from = Math.max(now.getTime() + 20 * 60000, new Date(now).setHours(9, 0, 0, 0))
            const to = new Date(now).setHours(20, 30, 0, 0)
            redGatePlan = { day: today, at: Math.random() < 0.4 && to > from ? from + Math.random() * (to - from) : null }
          }
          set({ quests, player, questDay: today, questWeek: wk, boss, redGatePlan, home: { ...get().home, cleanedWeek } })
          get().checkGate()
          get().evaluate()
        },

        evaluate: () => {
          const s = get()
          const today = dayKey()
          const d = s.health[today] ?? emptyDay()
          const wk = weekKey()
          const inWeek = (k: string) => weekKey(new Date(k + 'T12:00')) === wk
          const derived: Record<string, number> = {
            m_wardrobe: s.wardrobe.length,
            m_home: s.home.rooms.reduce((a, r) => a + r.items.length, 0),
            m_fridge: s.home.fridge.length,
            m_streak: s.player.bestStreak,
            m_level: s.player.level,
            w_clean: s.home.cleanedWeek.length,
            w_outfits: Object.keys(s.wornLog).filter(inWeek).length,
            w_sleep: Object.entries(s.health).filter(([k, v]) => inWeek(k) && (v.sleep ?? 0) >= 7.5).length,
          }
          const toComplete: string[] = []
          const quests = s.quests.map((q) => {
            let p = q.progress
            if (q.link) p = (d[q.link] as number | undefined) ?? 0
            else if (q.id in derived) p = derived[q.id]
            if (!q.done && q.target && (p ?? 0) >= q.target) toComplete.push(q.id)
            return p !== q.progress ? { ...q, progress: p } : q
          })
          set({ quests })
          toComplete.forEach((id) => get().completeQuest(id))
          const rg = get().redGate
          if (rg && !rg.done) {
            const t = RED_GATE_TASKS.find((x) => x.id === rg.task)
            if (t?.metric && t.amount) {
              const cur = t.metric === 'quests' ? get().stats.questsDone : ((todayLog(get())[t.metric] as number | undefined) ?? 0)
              if (cur - rg.base >= t.amount) get().confirmRedGate()
            }
          }
        },

        checkAchievements: () => {
          const s = get()
          const fresh = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.check(s))
          if (!fresh.length) return
          set({
            achievements: [...s.achievements, ...fresh.map((a) => a.id)],
            titles: [...new Set([...s.titles, ...fresh.flatMap((a) => (a.title ? [a.title] : []))])],
            player: { ...s.player, gems: s.player.gems + fresh.length * 3 },
          })
          fresh.forEach((a, i) =>
            setTimeout(() => {
              sfx.loot()
              get().notify({ tone: 'loot', icon: a.icon, title: `Erfolg: ${a.name}`, body: (a.title ? `Neuer Titel „${a.title}“ · ` : '') + '+3 Kristalle' })
            }, 400 + i * 700),
          )
          fresh.forEach((a) => log(`Erfolg freigeschaltet: ${a.name}`, a.icon))
        },

        gainXp: (n, silent) => {
          let p = { ...get().player, xp: get().player.xp + n, totalXp: get().player.totalXp + n }
          let ups = 0
          while (p.xp >= xpToNext(p.level)) {
            p = { ...p, xp: p.xp - xpToNext(p.level), level: p.level + 1, statPoints: p.statPoints + 3, gold: p.gold + 40 * (p.level + 1) }
            ups++
          }
          set({ player: p })
          if (ups) {
            sfx.level()
            buzz([30, 50, 30, 50, 80])
            set({ levelUp: p.level })
            log(`Level Up! Du bist jetzt Level ${p.level}.`, 'stairs')
            if (p.level >= JOB_LEVEL && !get().job) setTimeout(() => get().notify({ tone: 'system', icon: 'tiara', title: 'Jobwechsel freigeschaltet', body: 'Wähle deine Klasse im Status-Fenster.' }), 1500)
            get().evaluate()
          } else if (!silent) {
            get().notify({ tone: 'good', icon: 'xp', title: `+${n} XP` })
          }
        },

        addStatXp: (sx) => {
          const p = get().player
          const statXp = { ...p.statXp }
          const base = { ...p.base }
          const gained: StatKey[] = []
          for (const k of STAT_KEYS) {
            const v = sx[k]
            if (!v) continue
            statXp[k] += v
            while (statXp[k] >= STAT_XP_PER_POINT) {
              statXp[k] -= STAT_XP_PER_POINT
              base[k]++
              gained.push(k)
            }
          }
          set({ player: { ...p, statXp, base } })
          gained.forEach((k) => get().notify({ tone: 'system', icon: STAT_META[k].icon, title: `${STAT_META[k].short} +1`, body: `Durch Training ist deine ${STAT_META[k].label} gestiegen.` }))
        },

        allocate: (k) => {
          const p = get().player
          if (p.statPoints <= 0) return
          sfx.tap()
          set({ player: { ...p, statPoints: p.statPoints - 1, base: { ...p.base, [k]: p.base[k] + 1 } } })
        },
        setTitle: (title) => set((s) => ({ player: { ...s.player, title } })),
        chooseJob: (id) => {
          const j = JOBS.find((x) => x.id === id)
          if (!j || get().player.level < JOB_LEVEL || get().job) return
          sfx.level()
          buzz([40, 40, 120])
          set((s) => ({ job: id, titles: [...new Set([...s.titles, j.name])], player: { ...s.player, title: j.name } }))
          get().notify({ tone: 'system', icon: j.art, title: `Klasse: ${j.name}`, body: j.desc })
          log(`Jobwechsel abgeschlossen: ${j.name}`, j.art)
          get().checkAchievements()
        },

        completeQuest: (id) => {
          const s = get()
          const q = s.quests.find((x) => x.id === id)
          if (!q || q.done) return
          const today = dayKey()
          const buffs = s.skills.buffs
          const dash = buffs.dash && buffs.dash.until > Date.now() && buffs.dash.charges > 0
          if (dash) set({ skills: { ...s.skills, buffs: { ...buffs, dash: { ...buffs.dash!, charges: buffs.dash!.charges - 1 } } } })
          const xp = Math.round(q.xp * jobBonus(q.cat) * shadowXpBonus(s.shadows, q.cat) * (dash ? 1.5 : 1))
          sfx.quest()
          buzz(18)
          set({
            quests: s.quests.map((x) => (x.id === id ? { ...x, done: true, doneAt: Date.now() } : x)),
            history: { ...s.history, [today]: [...(s.history[today] ?? []), id] },
            stats: { ...s.stats, questsDone: s.stats.questsDone + 1 },
            player: { ...s.player, gold: s.player.gold + q.gold, gems: s.player.gems + (q.bonus ? 2 : 0) },
          })
          get().notify({ tone: 'system', icon: 'xp', title: 'Quest abgeschlossen', body: `${q.title} · +${xp} XP${q.gold ? ` · +${q.gold} Gold` : ''}${q.bonus ? ' · +2 Kristalle' : ''}` })
          log(`Quest abgeschlossen: ${q.title}`, 'star')
          get().addStatXp(q.statXp)

          const ruler = !!get().skills.buffs.ruler && q.type !== 'penalty'
          if (ruler) set((st) => ({ skills: { ...st.skills, buffs: { ...st.skills.buffs, ruler: false } } }))
          const r = ruler ? 0 : Math.random()
          const lootChance = q.type === 'daily' ? 0.3 : q.type === 'penalty' ? 0 : 0.75
          if (r < lootChance) {
            let item = rollItem(ruler ? 2 : q.type === 'main' ? 1 : 0)
            for (let i = 0; ruler && i < 12 && ['common', 'uncommon'].includes(item.rarity); i++) item = rollItem(2)
            get().grant(item.id)
            if (['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity)) setTimeout(() => set({ reveal: [item] }), 500)
            else setTimeout(() => get().notify({ tone: 'loot', icon: item.icon, title: 'Item erhalten', body: item.name }), 300)
          } else if (r < lootChance + 0.25 && q.type !== 'penalty') {
            get().grant('mat_ribbon')
          }

          if (q.type === 'daily') {
            const dailies = get().quests.filter((x) => x.type === 'daily')
            if (dailies.every((x) => x.done)) {
              const p = get().player
              const streak = p.streak + 1
              set({ player: { ...p, streak, bestStreak: Math.max(p.bestStreak, streak) } })
              get().grant('box_daily')
              setTimeout(() => {
                sfx.loot()
                buzz([20, 40, 20, 40, 60])
                get().notify({ tone: 'loot', icon: 'flame', title: 'Daily Quest abgeschlossen!', body: `Streak: ${streak} Tage · Tägliche Kiste erhalten` })
              }, 700)
              log(`Alle Daily Quests geschafft – Streak ${streak}`, 'flame')
            }
          }
          get().gainXp(xp, true)
          get().damageBoss(xp, q.cat === 'body' ? 'move' : 'quest')
          get().evaluate()
          get().checkAchievements()
        },

        addQuest: ({ stat, ...q }) => {
          const xp = q.xp
          set((s) => ({
            quests: [...s.quests, {
              ...q, id: 'c_' + uid(), custom: true, done: false, progress: 0,
              gold: Math.round(xp * 0.7), statXp: stat ? { [stat]: Math.round(xp * 0.6) } : {},
            }],
          }))
        },
        removeQuest: (id) => set((s) => ({ quests: s.quests.filter((q) => q.id !== id) })),

        claimChest: () => {
          const s = get()
          if (s.chestDay === dayKey()) return
          const gold = 30 + Math.floor(Math.random() * 40)
          const item = rollItem(0)
          set({ chestDay: dayKey(), player: { ...s.player, gold: s.player.gold + gold } })
          get().grant(item.id)
          sfx.loot()
          buzz([15, 30, 15])
          set({ reveal: [{ ...ITEMS.find((i) => i.id === 'gold_pouch')!, name: `${gold} Gold`, desc: 'Login-Belohnung' }, item] })
        },

        damageBoss: (n, source) => {
          const b = get().boss
          if (!b || b.defeated || n <= 0) return
          const boss = BOSSES[b.idx]
          const blood = (get().skills.buffs.bloodlust ?? 0) > 0
          if (blood) set((st) => ({ skills: { ...st.skills, buffs: { ...st.skills.buffs, bloodlust: (st.skills.buffs.bloodlust ?? 1) - 1 } } }))
          const crit = BOSS_WEAKNESS[boss.id] === source || blood
          const dmg = Math.round(n * (crit ? 2 : 1) * shadowBossBonus(get().shadows))
          const hp = Math.max(0, b.hp - dmg)
          set({ boss: { ...b, hp, defeated: hp === 0 }, bossHit: Date.now() })
          if (crit) get().notify({ tone: 'good', icon: boss.art, title: `Kritischer Treffer! −${dmg}`, body: blood ? 'Blutrausch' : `${boss.name} ist schwach gegen: ${boss.weakness}` })
          if (hp === 0) {
            sfx.level()
            buzz([50, 50, 50, 50, 150])
            set((s) => ({ stats: { ...s.stats, bossesDefeated: s.stats.bossesDefeated + 1 }, player: { ...s.player, gold: s.player.gold + 300, gems: s.player.gems + 10 } }))
            const loot = [rollItem(2), rollItem(1)]
            loot.forEach((it) => get().grant(it.id))
            setTimeout(() => {
              set({ reveal: [{ ...ITEMS.find((i) => i.id === 'gold_chest')!, name: '300 Gold · 10 Kristalle', desc: `${boss.name} wurde besiegt!` }, ...loot] })
              get().notify({ tone: 'loot', icon: boss.art, title: 'Wochenboss besiegt!', body: boss.name })
              setTimeout(() => get().notify({ tone: 'system', icon: 'shadow', title: 'Schatten-Extraktion möglich', body: 'Nutze „Erhebe dich“ im Boss-Fenster. 3 Versuche.' }), 2600)
            }, 600)
            log(`Wochenboss besiegt: ${boss.name}`, boss.art)
            get().checkAchievements()
          }
        },

        startGate: (rank) => {
          const g = GATE_RANKS.find((x) => x.rank === rank)
          if (!g || get().gate) return
          sfx.level()
          buzz([20, 60, 20])
          set({ gate: { rank, start: Date.now(), minutes: g.minutes } })
          log(`Gate betreten: Rang ${rank} (${g.minutes} Min.)`, 'gate')
        },
        checkGate: () => {
          get().checkRedGate()
          const gs = get().gate
          if (!gs || Date.now() - gs.start < gs.minutes * 60000) return
          const g = GATE_RANKS.find((x) => x.rank === gs.rank)!
          set({ gate: null })
          const stealth = !!get().skills.buffs.stealth
          if (stealth) set((st) => ({ skills: { ...st.skills, buffs: { ...st.skills.buffs, stealth: false } } }))
          const xp = Math.round(g.xp * (get().job === 'sage' ? 1 + JOB_BONUS : 1) * shadowXpBonus(get().shadows, undefined, true) * (stealth ? 2 : 1))
          set((s) => ({ stats: { ...s.stats, gatesCleared: s.stats.gatesCleared + 1 } }))
          get().addStatXp({ int: g.minutes, per: Math.round(g.minutes / 2) })
          const item = rollItem(g.tier)
          get().grant(item.id)
          sfx.loot()
          buzz([30, 40, 30, 40, 90])
          set({ reveal: [item] })
          get().notify({ tone: 'system', icon: 'gate', title: `Gate Rang ${g.rank} gecleart`, body: `+${xp} XP · ${g.minutes} Min. Fokus` })
          log(`Gate gecleart: Rang ${g.rank}`, 'gate')
          get().gainXp(xp, true)
          get().damageBoss(g.minutes * 4, 'gate')
          get().checkAchievements()
        },
        abandonGate: () => {
          if (!get().gate) return
          set({ gate: null })
          get().notify({ tone: 'warn', icon: 'gate', title: 'Gate verlassen', body: 'Kein Loot diesmal. Nächstes Mal schaffst du es!' })
        },
        saveJournal: (j) => {
          const day = dayKey()
          const first = !get().journal[day]
          set((s) => ({ journal: { ...s.journal, [day]: j } }))
          if (first && (j.text.trim() || j.grateful.some((g) => g.trim()))) {
            sfx.quest()
            set((s) => ({ stats: { ...s.stats, journalDays: s.stats.journalDays + 1 } }))
            get().addStatXp({ per: 15, int: 5 })
            get().gainXp(20, true)
            get().notify({ tone: 'system', icon: 'book', title: 'Reflexion gespeichert', body: '+20 XP · Wahrnehmung-Training' })
            get().checkAchievements()
          } else get().notify({ tone: 'good', icon: 'book', title: 'Tagebuch aktualisiert' })
        },
        cookRecipe: (id) => {
          const r = RECIPES.find((x) => x.id === id)
          if (!r) return
          const day = dayKey()
          if ((get().cooked[day] ?? []).includes(id)) return
          sfx.quest()
          buzz(18)
          set((s) => ({ cooked: { ...s.cooked, [day]: [...(s.cooked[day] ?? []), id] }, stats: { ...s.stats, recipesCooked: s.stats.recipesCooked + 1 } }))
          get().addStatXp({ vit: 20 })
          get().gainXp(30, true)
          get().notify({ tone: 'system', icon: r.art, title: `${r.name} gekocht`, body: '+30 XP · Vitalität-Training' })
          log(`Gekocht: ${r.name}`, r.art)
          get().damageBoss(30, 'food')
          get().checkAchievements()
        },

        itemDef: (id) => ITEMS.find((i) => i.id === id) ?? get().customItems.find((i) => i.id === id),
        grant: (defId, qty = 1) => {
          const def = get().itemDef(defId)
          if (!def) return
          if ((def.rarity === 'legendary' || def.rarity === 'mythic') && def.type !== 'key') set((s) => ({ stats: { ...s.stats, legendaryFound: s.stats.legendaryFound + 1 } }))
          set((s) => {
            const ex = s.inventory.find((i) => i.defId === defId)
            return {
              inventory: ex
                ? s.inventory.map((i) => (i.defId === defId ? { ...i, qty: i.qty + qty, isNew: true } : i))
                : [...s.inventory, { defId, qty, firstAt: Date.now(), isNew: true }],
            }
          })
        },
        useItem: (defId) => {
          const s = get()
          const def = s.itemDef(defId)
          const entry = s.inventory.find((i) => i.defId === defId)
          if (!def || !entry || !def.effect || def.effect.kind === 'streakShield') return
          set((st) => ({ inventory: st.inventory.map((i) => (i.defId === defId ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) }))
          const e = def.effect
          buzz(15)
          switch (e.kind) {
            case 'xp': sfx.quest(); get().gainXp(e.amount); break
            case 'gold': sfx.coin(); set((st) => ({ player: { ...st.player, gold: st.player.gold + e.amount } })); get().notify({ tone: 'good', icon: 'coin', title: `+${e.amount} Gold` }); break
            case 'gems': sfx.coin(); set((st) => ({ player: { ...st.player, gems: st.player.gems + e.amount } })); get().notify({ tone: 'good', icon: 'gem', title: `+${e.amount} Kristalle` }); break
            case 'statPoint': sfx.level(); set((st) => ({ player: { ...st.player, statPoints: st.player.statPoints + e.amount } })); get().notify({ tone: 'system', icon: 'stardust', title: '+1 Statuspunkt', body: 'Verteile ihn im Status-Fenster.' }); break
            case 'mystery': {
              const n = def.id === 'box_daily' ? 2 : 1
              const items = Array.from({ length: n }, () => rollItem(e.tier))
              items.forEach((it) => get().grant(it.id))
              sfx.loot()
              set({ reveal: items })
              break
            }
            case 'reward':
              sfx.loot()
              set((st) => ({ stats: { ...st.stats, rewardsRedeemed: st.stats.rewardsRedeemed + 1 } }))
              get().notify({ tone: 'loot', icon: def.icon, title: 'Belohnung eingelöst!', body: `${def.name} – du hast es dir verdient.` })
              log(`Belohnung eingelöst: ${def.name}`, def.icon)
              break
          }
          get().checkAchievements()
        },
        equip: (defId) => {
          const def = get().itemDef(defId)
          if (!def?.slot) return
          sfx.tap()
          set((s) => ({ equipped: { ...s.equipped, [def.slot!]: defId } }))
        },
        unequip: (slot) => set((s) => { const e = { ...s.equipped }; delete e[slot]; return { equipped: e } }),
        buy: (defId) => {
          const s = get()
          const def = s.itemDef(defId)
          if (!def) return false
          if (def.gemPrice) {
            if (s.player.gems < def.gemPrice) return false
            set({ player: { ...s.player, gems: s.player.gems - def.gemPrice } })
          } else {
            if (!def.price || s.player.gold < def.price) return false
            set({ player: { ...s.player, gold: s.player.gold - def.price } })
          }
          sfx.coin()
          buzz(12)
          get().grant(defId)
          get().notify({ tone: 'loot', icon: def.icon, title: 'Gekauft', body: def.name })
          return true
        },
        addReward: (name, icon, price) =>
          set((s) => ({ customItems: [...s.customItems, { id: 'rw_' + uid(), name, icon: icon || 'heart', desc: 'Echte Belohnung.', rarity: price >= 1000 ? 'epic' : price >= 300 ? 'rare' : 'uncommon', type: 'reward', price, effect: { kind: 'reward' } }] })),
        removeReward: (id) => set((s) => ({ customItems: s.customItems.filter((i) => i.id !== id) })),
        fuse: (defIds) => {
          const s = get()
          const defs = defIds.map((d) => s.itemDef(d)!)
          if (defIds.length !== 3 || new Set(defs.map((d) => d.rarity)).size !== 1) return null
          const inv = [...s.inventory.map((i) => ({ ...i }))]
          for (const d of defIds) {
            const e = inv.find((i) => i.defId === d && i.qty > 0)
            if (!e) return null
            e.qty--
          }
          set({ inventory: inv.filter((i) => i.qty > 0), stats: { ...s.stats, fusions: s.stats.fusions + 1 } })
          const target = nextRarity(defs[0].rarity)
          const pool = ITEMS.filter((i) => i.rarity === target && i.type !== 'key' && i.id !== 'box_daily')
          const out = pool[Math.floor(Math.random() * pool.length)] ?? rollItem(1)
          get().grant(out.id)
          sfx.loot()
          buzz([20, 30, 60])
          set({ reveal: [out] })
          log(`Fusion erfolgreich: ${out.name}`, 'fusion')
          get().checkAchievements()
          return out
        },
        markSeen: () => set((s) => ({ inventory: s.inventory.map((i) => ({ ...i, isNew: false })) })),

        logHealth: (patch, day = dayKey()) => {
          const prev = get().health[day]
          set((s) => ({ health: { ...s.health, [day]: { ...emptyDay(), ...s.health[day], ...patch } } }))
          if (patch.sleep && !prev?.sleep) get().addStatXp({ vit: Math.round(patch.sleep * 2) })
          if (patch.mood && !prev?.mood) get().gainXp(5, true)
          if (patch.water && patch.water > (prev?.water ?? 0)) get().damageBoss(5, 'food')
          get().evaluate()
          get().checkAchievements()
        },
        addHealth: (k, n) => {
          const day = dayKey()
          const cur = get().health[day] ?? emptyDay()
          get().logHealth({ [k]: Math.max(0, cur[k] + n) }, day)
          if (k === 'meditationMin' && n > 0) get().addStatXp({ per: Math.round(n) })
          if ((k === 'steps' || k === 'workoutMin') && n > 0) get().damageBoss(k === 'steps' ? Math.round(n / 100) : n, 'move')
        },

        cleanRoom: (id) => {
          const s = get()
          const room = s.home.rooms.find((r) => r.id === id)
          if (!room) return
          const already = dayKey(new Date(room.lastCleaned)) === dayKey()
          mapRoom(id, (r) => ({ ...r, lastCleaned: Date.now() }))
          set((st) => ({ home: { ...st.home, cleanedWeek: [...new Set([...st.home.cleanedWeek, id])] } }))
          if (!already) {
            sfx.quest()
            buzz(18)
            const xp = Math.round(20 * (get().job === 'hearth' ? 1 + JOB_BONUS : 1))
            get().notify({ tone: 'system', icon: 'broom', title: `${room.name} aufgeräumt`, body: `+${xp} XP · Wahrnehmung-Training` })
            get().addStatXp({ per: 15 })
            get().gainXp(xp, true)
            get().damageBoss(40, 'clean')
          }
          get().evaluate()
          get().checkAchievements()
        },
        renameRoom: (id, name) => mapRoom(id, (r) => ({ ...r, name })),
        setLayout: (layout, plan) => set((s) => {
          const old = new Map(s.home.rooms.map((r) => [r.id, r]))
          const rooms: Room[] = layout.map((l) => {
            const prev = old.get(l.id)
            return prev
              ? { ...prev, name: l.name, kind: l.kind, rect: l.rect }
              : { id: l.id, name: l.name, kind: l.kind, rect: l.rect, lastCleaned: Date.now(), items: [], needs: KIND_NEEDS[l.kind].map((text) => ({ id: uid(), text, done: false })) }
          })
          const ids = new Set(rooms.map((r) => r.id))
          const fallback = rooms[0]?.id
          const devices = s.home.devices.filter((d) => ids.has(d.roomId) || fallback).map((d) => (ids.has(d.roomId) ? d : { ...d, roomId: fallback! }))
          return { home: { ...s.home, rooms, devices, plan } }
        }),
        addRoomItem: (roomId, item) => { mapRoom(roomId, (r) => ({ ...r, items: [...r.items, { ...item, id: uid() }] })); get().evaluate() },
        removeRoomItem: (roomId, id) => { mapRoom(roomId, (r) => ({ ...r, items: r.items.filter((i) => i.id !== id) })); get().evaluate() },
        addNeed: (roomId, text) => mapRoom(roomId, (r) => ({ ...r, needs: [...r.needs, { id: uid(), text, done: false }] })),
        toggleNeed: (roomId, id) => {
          const n = get().home.rooms.find((r) => r.id === roomId)?.needs.find((x) => x.id === id)
          mapRoom(roomId, (r) => ({ ...r, needs: r.needs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }))
          if (n && !n.done) { sfx.tap(); buzz(10); get().gainXp(10) }
        },
        removeNeed: (roomId, id) => mapRoom(roomId, (r) => ({ ...r, needs: r.needs.filter((x) => x.id !== id) })),
        needToShopping: (_roomId, n) => {
          get().addShopping(n.text)
          get().notify({ tone: 'good', icon: 'cart', title: 'Auf die Einkaufsliste', body: n.text })
        },
        toggleDevice: (id) => { sfx.tap(); buzz(8); set((s) => ({ home: { ...s.home, devices: s.home.devices.map((d) => (d.id === id ? { ...d, on: !d.on } : d)) } })) },
        setDevice: (id, value) => set((s) => ({ home: { ...s.home, devices: s.home.devices.map((d) => (d.id === id ? { ...d, value } : d)) } })),
        addFridge: (f) => { set((s) => ({ home: { ...s.home, fridge: [...s.home.fridge, { ...f, id: uid() }] } })); get().evaluate(); get().checkAchievements() },
        updateFridge: (id, patch) => set((s) => ({ home: { ...s.home, fridge: s.home.fridge.map((f) => (f.id === id ? { ...f, ...patch } : f)) } })),
        removeFridge: (id) => { set((s) => ({ home: { ...s.home, fridge: s.home.fridge.filter((f) => f.id !== id) } })); get().evaluate() },
        addShopping: (name) => set((s) => ({ home: { ...s.home, shopping: [...s.home.shopping, { id: uid(), name, done: false }] } })),
        toggleShopping: (id) => set((s) => ({ home: { ...s.home, shopping: s.home.shopping.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) } })),
        clearShopping: () => set((s) => ({ home: { ...s.home, shopping: s.home.shopping.filter((x) => !x.done) } })),

        addCloth: (c) => {
          set((s) => ({ wardrobe: [...s.wardrobe, { ...c, id: uid(), wears: 0, fav: false, addedAt: Date.now() }] }))
          get().addStatXp({ cha: 5 })
          get().gainXp(8)
          get().evaluate()
          get().checkAchievements()
        },
        updateCloth: (id, patch) => set((s) => ({ wardrobe: s.wardrobe.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        removeCloth: (id) => set((s) => ({
          wardrobe: s.wardrobe.filter((c) => c.id !== id),
          outfits: s.outfits.map((o) => ({ ...o, items: o.items.filter((i) => i !== id) })),
        })),
        saveOutfit: (name, items) => {
          set((s) => ({ outfits: [{ id: uid(), name, items, createdAt: Date.now() }, ...s.outfits] }))
          get().notify({ tone: 'good', icon: 'mirror', title: 'Outfit gespeichert', body: name })
          get().checkAchievements()
        },
        removeOutfit: (id) => set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) })),
        wearOutfit: (items) => {
          const today = dayKey()
          const first = !get().wornLog[today]
          set((s) => ({
            wornLog: { ...s.wornLog, [today]: items },
            wardrobe: s.wardrobe.map((c) => (items.includes(c.id) && (s.wornLog[today] ?? []).indexOf(c.id) < 0 ? { ...c, wears: c.wears + 1, lastWorn: today } : c)),
          }))
          if (first) {
            sfx.quest()
            buzz(18)
            const xp = Math.round(25 * (get().job === 'monarch' ? 1 + JOB_BONUS : 1))
            get().notify({ tone: 'system', icon: 'lipstick', title: 'Outfit des Tages geloggt', body: `+${xp} XP · Charme-Training` })
            get().addStatXp({ cha: 20 })
            get().gainXp(xp, true)
            get().damageBoss(25, 'style')
          } else get().notify({ tone: 'good', icon: 'lipstick', title: 'Outfit aktualisiert' })
          get().evaluate()
        },

        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        setAvatar: (p) => set((s) => ({ avatar: { ...s.avatar, ...p, shape: { ...s.avatar.shape, ...p.shape } } })),

        castSkill: (id) => {
          const s = get()
          const sk = SKILLS.find((x) => x.id === id)
          if (!sk) return false
          if (id === 'arise') return get().arise()
          if (s.player.level < sk.level) { get().notify({ tone: 'warn', icon: sk.art, title: 'Skill gesperrt', body: `Ab Level ${sk.level} verfügbar.` }); return false }
          if (mpLeft(s) < sk.mp) { sfx.warn(); get().notify({ tone: 'warn', icon: 'mana', title: 'Nicht genug Mana', body: 'Meditation und gute Stimmung füllen dein MP.' }); return false }
          const today = dayKey()
          const buffs = { ...s.skills.buffs }
          if (id === 'dash') buffs.dash = { until: Date.now() + 3600000, charges: 3 }
          if (id === 'bloodlust') buffs.bloodlust = 3
          if (id === 'stealth') buffs.stealth = true
          if (id === 'ruler') buffs.ruler = true
          set({ skills: { day: today, spent: (s.skills.day === today ? s.skills.spent : 0) + sk.mp, buffs }, stats: { ...s.stats, skillsCast: (s.stats.skillsCast ?? 0) + 1 } })
          sfx.level()
          buzz([20, 30, 60])
          get().notify({ tone: 'system', icon: sk.art, title: `Skill aktiviert: ${sk.name}`, body: `−${sk.mp} MP · ${sk.desc}` })
          log(`Skill eingesetzt: ${sk.name}`, sk.art)
          return true
        },

        arise: () => {
          const s = get()
          const b = s.boss
          const sk = SKILLS.find((x) => x.id === 'arise')!
          if (!b?.defeated || b.extracted || (b.arise ?? 0) >= 3) return false
          if (mpLeft(s) < sk.mp) { sfx.warn(); get().notify({ tone: 'warn', icon: 'mana', title: 'Nicht genug Mana', body: `„Erhebe dich“ braucht ${sk.mp} MP.` }); return false }
          const today = dayKey()
          const boss = BOSSES[b.idx]
          const ok = Math.random() < ariseChance(effectiveStats(s).total.int)
          const tries = (b.arise ?? 0) + 1
          set({ skills: { ...s.skills, day: today, spent: (s.skills.day === today ? s.skills.spent : 0) + sk.mp }, boss: { ...b, arise: tries, extracted: ok || undefined }, ariseFx: Date.now() })
          buzz(ok ? [40, 60, 40, 60, 200] : [80])
          if (ok) {
            const prev = s.shadows.find((x) => x.boss === boss.id)
            const shadows = prev ? s.shadows.map((x) => (x.boss === boss.id ? { ...x, rank: Math.min(4, x.rank + 1) } : x)) : [...s.shadows, { boss: boss.id, rank: 0, since: Date.now() }]
            set({ shadows, stats: { ...s.stats, shadowsRaised: (s.stats.shadowsRaised ?? 0) + 1 } })
            sfx.level()
            get().notify({ tone: 'system', icon: 'shadow', title: 'ERHEBE DICH', body: prev ? 'Dein Schatten ist aufgestiegen.' : 'Ein neuer Schatten hat sich deiner Armee angeschlossen.' })
            log(`Schatten extrahiert: ${boss.name}`, 'shadow')
            get().checkAchievements()
          } else {
            sfx.warn()
            get().notify({ tone: 'warn', icon: 'shadow', title: 'Extraktion fehlgeschlagen', body: tries >= 3 ? 'Der Schatten ist verblasst.' : `Noch ${3 - tries} Versuch${3 - tries > 1 ? 'e' : ''}.` })
          }
          return ok
        },

        checkRedGate: () => {
          const s = get()
          if (!s.onboarded) return
          const now = Date.now()
          const rg = s.redGate
          if (rg && !rg.done && now > rg.until) {
            const loss = Math.min(s.player.gold, 50)
            set({ redGate: null, player: { ...s.player, gold: s.player.gold - loss } })
            sfx.warn()
            get().notify({ tone: 'warn', icon: 'red_gate', title: 'Red Gate kollabiert', body: `Die Monster sind entkommen. −${loss} Gold.` })
            log('Red Gate verloren', 'red_gate')
            return
          }
          const plan = s.redGatePlan
          if (!rg && plan?.day === dayKey() && plan.at && now >= plan.at) {
            const t = RED_GATE_TASKS[Math.floor(Math.random() * RED_GATE_TASKS.length)]
            const base = t.metric === 'quests' ? s.stats.questsDone : t.metric ? ((todayLog(s)[t.metric] as number | undefined) ?? 0) : 0
            set({ redGate: { task: t.id, opened: now, until: now + RED_GATE_MIN * 60000, base }, redGatePlan: { ...plan, at: null } })
            sfx.warn()
            buzz([90, 60, 90, 60, 90])
            get().notify({ tone: 'warn', icon: 'red_gate', title: 'RED GATE GEÖFFNET', body: `${t.title}: ${t.desc} ${RED_GATE_MIN} Minuten.` })
            log(`Red Gate: ${t.title}`, 'red_gate')
          }
        },

        confirmRedGate: () => {
          const s = get()
          const rg = s.redGate
          if (!rg || rg.done) return
          const t = RED_GATE_TASKS.find((x) => x.id === rg.task)
          set({ redGate: { ...rg, done: true }, player: { ...s.player, gold: s.player.gold + 120, gems: s.player.gems + 3 }, stats: { ...s.stats, redGates: (s.stats.redGates ?? 0) + 1 } })
          const item = rollItem(2)
          get().grant(item.id)
          sfx.loot()
          buzz([30, 40, 30, 40, 120])
          setTimeout(() => set({ reveal: [{ ...ITEMS.find((i) => i.id === 'gold_chest')!, name: '120 Gold · 3 Kristalle', desc: 'Red Gate gecleart!' }, item] }), 400)
          get().notify({ tone: 'loot', icon: 'red_gate', title: 'Red Gate gecleart', body: `${t?.title ?? ''} · +160 XP` })
          log(`Red Gate gecleart: ${t?.title ?? ''}`, 'red_gate')
          get().gainXp(160, true)
          get().damageBoss(120, 'quest')
          setTimeout(() => set({ redGate: null }), 4000)
          get().checkAchievements()
        },
        setCompanion: (p) => set((s) => ({ companion: { ...s.companion, ...p } })),
        pushChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid(), t: Date.now() }].slice(-60) })),
        clearChat: () => set({ chat: [] }),
        seeTip: (id) => set((s) => ({ tipsSeen: { ...s.tipsSeen, [id]: dayKey() } })),
        exportData: () => {
          const s = get()
          const out: Record<string, unknown> = {}
          PERSIST_KEYS.forEach((k) => (out[k] = s[k]))
          out.companion = { ...s.companion, apiKey: '' }
          return JSON.stringify({ app: 'gamifly', v: 2, data: out })
        },
        importData: (json) => {
          try {
            const parsed = JSON.parse(json)
            if (parsed.app !== 'gamifly' || !parsed.data) return false
            const data = migrateSave(parsed.data)
            const keepKey = get().companion.apiKey
            set({ ...(data as Partial<GameState>), companion: { ...defaultCompanion(), ...(data.companion as object), apiKey: keepKey } })
            get().rollover()
            return true
          } catch {
            return false
          }
        },
        resetAll: () => set({ ...baseData(), settings: get().settings, companion: get().companion, tab: 'status' }),
      }
    },
    {
      name: 'gamifly-save',
      version: 3,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<GameState>,
      migrate: (persisted) => migrateSave(persisted as Record<string, unknown>) as unknown as GameState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>
        return {
          ...current, ...p,
          settings: { ...current.settings, ...p.settings },
          companion: { ...current.companion, ...p.companion },
          stats: { ...current.stats, ...p.stats },
          avatar: { ...current.avatar, ...p.avatar, shape: { ...current.avatar.shape, ...p.avatar?.shape } },
          skills: { ...current.skills, ...p.skills, buffs: { ...p.skills?.buffs } },
        }
      },
    },
  ),
)

/** Upgrades older saves: emoji icons become illustration keys, new fields get defaults. */
function migrateSave(d: Record<string, unknown>): Record<string, unknown> {
  const out = { ...d }
  const items = (out.customItems as ItemDef[] | undefined)?.map((i) => ({ ...i, icon: resolveArt(i.icon) === 'sparkle' && i.type === 'reward' ? 'heart' : resolveArt(i.icon) }))
  if (items) out.customItems = items
  const home = out.home as GameState['home'] | undefined
  if (home) {
    out.home = {
      ...home,
      rooms: home.rooms.map((r) => ({ ...r, rect: r.rect ?? DEFAULT_RECTS[r.id], items: r.items.map((it) => ({ ...it, icon: resolveArt(it.icon) !== 'sparkle' ? resolveArt(it.icon) : thingArt(it.name) })) })),
      fridge: home.fridge.map((f) => ({ ...f, icon: foodArt(f.name) })),
    }
  }
  const lg = out.log as LogEntry[] | undefined
  if (lg) out.log = lg.map((l) => ({ ...l, icon: resolveArt(l.icon) }))
  out.stats = { ...defaultStats(), ...(out.stats as object) }
  out.settings = { theme: 'system', sound: true, haptics: true, ...(out.settings as object) }
  const st = out.settings as { theme: string }
  if (!['system', 'monarch', 'crimson'].includes(st.theme)) st.theme = 'system'
  return out
}

// ---------- selectors ----------
export function effectiveStats(s: Pick<GameState, 'player' | 'equipped' | 'itemDef'>): { total: Stats; bonus: Stats } {
  const bonus = zeroStats()
  Object.values(s.equipped).forEach((id) => {
    const def = id ? s.itemDef(id) : undefined
    if (def?.bonus) for (const k of STAT_KEYS) bonus[k] += def.bonus[k] ?? 0
  })
  const total = zeroStats()
  for (const k of STAT_KEYS) total[k] = s.player.base[k] + bonus[k]
  return { total, bonus }
}

export function vitals(s: Pick<GameState, 'health' | 'player' | 'equipped' | 'itemDef'>) {
  const d = s.health[dayKey()] ?? emptyDay()
  const { total } = effectiveStats(s)
  const maxHp = 100 + total.vit * 10
  const maxMp = 50 + total.int * 8
  const sleepScore = Math.min(1, (d.sleep ?? 0) / 8)
  const hpRatio = 0.25 + 0.4 * sleepScore + 0.25 * Math.min(1, d.water / 8) + 0.1 * Math.min(1, d.steps / 6000)
  const mpRatio = 0.3 + 0.35 * ((d.mood ?? 3) / 5) + 0.35 * Math.min(1, d.meditationMin / 10)
  return { hp: Math.round(maxHp * Math.min(1, hpRatio)), maxHp, mp: Math.round(maxMp * Math.min(1, mpRatio)), maxMp, day: d }
}

export const todayLog = (s: Pick<GameState, 'health'>) => s.health[dayKey()] ?? emptyDay()

/** MP left today: the daily pool from vitals minus what skills used up. */
export function mpLeft(s: Pick<GameState, 'health' | 'player' | 'equipped' | 'itemDef' | 'skills'>) {
  const v = vitals(s)
  return Math.max(0, v.mp - (s.skills.day === dayKey() ? s.skills.spent : 0))
}

// dev / e2e helper: lets automated tests drive the game state
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __game: typeof useGame }).__game = useGame
