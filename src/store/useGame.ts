import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Cloth, DayLog, Device, FridgeItem, InvEntry, ItemDef, LogEntry, Need, Outfit, Player, Quest, Room,
  RoomItem, ShopItem, Slot, StatKey, Stats, Toast,
} from '../game/types'
import { ITEMS, nextRarity, rollItem } from '../game/items'
import { DAILY_TEMPLATES, MAIN_TEMPLATES, PENALTY, WEEKLY_TEMPLATES, fromTpl } from '../game/quests'
import { STAT_KEYS, STAT_META, STAT_XP_PER_POINT, xpToNext } from '../game/leveling'
import { ACHIEVEMENTS } from '../game/achievements'
import { DEFAULT_DEVICES, DEFAULT_FRIDGE, DEFAULT_ROOMS, DEFAULT_SHOPPING } from '../data/home'
import { idbStorage } from '../lib/storage'
import { dayKey, daysBetween, uid, weekKey } from '../lib/util'
import { sfx } from '../lib/sfx'

export type Tab = 'status' | 'quests' | 'home' | 'style' | 'life' | 'inventory'

const zeroStats = (): Stats => ({ str: 0, vit: 0, agi: 0, int: 0, per: 0, cha: 0 })
const emptyDay = (): DayLog => ({ water: 0, steps: 0, workoutMin: 0, meditationMin: 0 })

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
  home: { rooms: Room[]; devices: Device[]; fridge: FridgeItem[]; shopping: ShopItem[]; cleanedWeek: string[] }
  wardrobe: Cloth[]
  outfits: Outfit[]
  wornLog: Record<string, string[]>
  achievements: string[]
  titles: string[]
  stats: { questsDone: number; legendaryFound: number; fusions: number; rewardsRedeemed: number }
  log: LogEntry[]
  settings: { theme: 'matcha' | 'pastel' | 'night'; sound: boolean }
  chestDay: string

  // ephemeral ui
  tab: Tab
  toasts: Toast[]
  levelUp: number | null
  reveal: ItemDef[] | null

  setTab: (t: Tab) => void
  notify: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  closeLevelUp: () => void
  closeReveal: () => void

  awaken: (name: string) => void
  rollover: () => void
  evaluate: () => void
  checkAchievements: () => void

  gainXp: (n: number, silent?: boolean) => void
  addStatXp: (s: Partial<Stats>) => void
  allocate: (k: StatKey) => void
  setTitle: (t: string) => void

  completeQuest: (id: string) => void
  addQuest: (q: Pick<Quest, 'title' | 'type' | 'cat' | 'xp' | 'desc'> & { stat?: StatKey }) => void
  removeQuest: (id: string) => void
  claimChest: () => void

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
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

const initialPlayer = (name = ''): Player => ({
  name, level: 1, xp: 0, totalXp: 0, gold: 100, gems: 5, statPoints: 0,
  base: { str: 5, vit: 5, agi: 5, int: 5, per: 5, cha: 5 }, statXp: zeroStats(),
  title: 'Erwachte Seele', streak: 0, bestStreak: 0, createdAt: Date.now(),
})

const freshQuests = (): Quest[] => [
  ...DAILY_TEMPLATES.map(fromTpl),
  ...WEEKLY_TEMPLATES.map(fromTpl),
  ...MAIN_TEMPLATES.map(fromTpl),
]

const PERSIST_KEYS = [
  'onboarded', 'player', 'inventory', 'equipped', 'customItems', 'quests', 'questDay', 'questWeek', 'history',
  'health', 'home', 'wardrobe', 'outfits', 'wornLog', 'achievements', 'titles', 'stats', 'log', 'settings', 'chestDay',
] as const

const baseData = () => ({
  onboarded: false,
  player: initialPlayer(),
  inventory: [] as InvEntry[],
  equipped: {} as Partial<Record<Slot, string>>,
  customItems: [
    { id: 'rw_boba', name: 'Bubble Tea', desc: 'Echte Belohnung – gönn dir!', icon: '🧋', rarity: 'rare', type: 'reward', price: 250, effect: { kind: 'reward' } },
    { id: 'rw_movie', name: 'Filmabend', desc: 'Echte Belohnung – Netflix & chill.', icon: '🎬', rarity: 'rare', type: 'reward', price: 400, effect: { kind: 'reward' } },
    { id: 'rw_nails', name: 'Nageldesign', desc: 'Echte Belohnung – fresh nails.', icon: '💅', rarity: 'epic', type: 'reward', price: 1200, effect: { kind: 'reward' } },
  ] as ItemDef[],
  quests: freshQuests(),
  questDay: dayKey(),
  questWeek: weekKey(),
  history: {} as Record<string, string[]>,
  health: {} as Record<string, DayLog>,
  home: { rooms: DEFAULT_ROOMS, devices: DEFAULT_DEVICES, fridge: DEFAULT_FRIDGE, shopping: DEFAULT_SHOPPING, cleanedWeek: [] as string[] },
  wardrobe: [] as Cloth[],
  outfits: [] as Outfit[],
  wornLog: {} as Record<string, string[]>,
  achievements: [] as string[],
  titles: ['Erwachte Seele'],
  stats: { questsDone: 0, legendaryFound: 0, fusions: 0, rewardsRedeemed: 0 },
  log: [] as LogEntry[],
  settings: { theme: 'matcha' as GameState['settings']['theme'], sound: true },
  chestDay: '',
})

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const log = (text: string, icon: string) =>
        set((s) => ({ log: [{ t: Date.now(), text, icon }, ...s.log].slice(0, 80) }))
      const mapRoom = (id: string, fn: (r: Room) => Room) =>
        set((s) => ({ home: { ...s.home, rooms: s.home.rooms.map((r) => (r.id === id ? fn(r) : r)) } }))

      return {
        ...baseData(),
        tab: 'status',
        toasts: [],
        levelUp: null,
        reveal: null,

        setTab: (tab) => set({ tab }),
        notify: (t) => {
          const id = uid()
          set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-3) }))
          setTimeout(() => get().dismiss(id), t.tone === 'warn' ? 6000 : 3800)
        },
        dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        closeLevelUp: () => set({ levelUp: null }),
        closeReveal: () => set({ reveal: null }),

        awaken: (name) => {
          set({ ...baseData(), onboarded: true, player: initialPlayer(name.trim() || 'Player') })
          get().grant('key_awaken')
          get().grant('potion_xp_s', 2)
          get().grant('eq_scrunchie')
          get().equip('eq_scrunchie')
          get().grant('streak_shield')
          get().grant('box_common')
          log('Du bist erwacht. Willkommen, Player.', '🌅')
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
                get().notify({ tone: 'system', icon: '🎀', title: 'Schleifen-Schild aktiviert', body: 'Dein Streak wurde geschützt. Die Strafzone wurde abgewehrt.' })
              } else {
                player = { ...player, streak: 0 }
                if (!quests.some((q) => q.type === 'penalty' && !q.done)) quests = [...quests, { ...fromTpl(PENALTY), id: 'p_' + uid() }]
                setTimeout(() => {
                  sfx.warn()
                  get().notify({ tone: 'warn', icon: '⚠️', title: 'Strafzone betreten', body: 'Die Daily Quest wurde nicht abgeschlossen. Eine Strafquest wurde zugewiesen.' })
                }, 900)
              }
            }
            quests = quests
              .filter((q) => !(q.type === 'penalty' && q.done))
              .map((q) => (q.type === 'daily' ? { ...q, done: false, progress: 0, doneAt: undefined } : q))
          }
          const wk = weekKey()
          let cleanedWeek = s.home.cleanedWeek
          if (s.questWeek !== wk) {
            quests = quests.map((q) => (q.type === 'weekly' ? { ...q, done: false, progress: 0, doneAt: undefined } : q))
            cleanedWeek = []
          }
          set({ quests, player, questDay: today, questWeek: wk, home: { ...get().home, cleanedWeek } })
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
            if (p !== q.progress) {
              if (!q.done && q.target && (p ?? 0) >= q.target) toComplete.push(q.id)
              return { ...q, progress: p }
            }
            if (!q.done && q.target && (p ?? 0) >= q.target) toComplete.push(q.id)
            return q
          })
          set({ quests })
          toComplete.forEach((id) => get().completeQuest(id))
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
              get().notify({ tone: 'loot', icon: a.icon, title: `Erfolg: ${a.name}`, body: (a.title ? `Neuer Titel „${a.title}“ · ` : '') + '+3 💎' })
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
            set({ levelUp: p.level })
            log(`Level Up! Du bist jetzt Level ${p.level}.`, '⬆️')
            get().evaluate()
          } else if (!silent) {
            get().notify({ tone: 'good', icon: '✨', title: `+${n} XP` })
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

        completeQuest: (id) => {
          const s = get()
          const q = s.quests.find((x) => x.id === id)
          if (!q || q.done) return
          const today = dayKey()
          sfx.quest()
          set({
            quests: s.quests.map((x) => (x.id === id ? { ...x, done: true, doneAt: Date.now() } : x)),
            history: { ...s.history, [today]: [...(s.history[today] ?? []), id] },
            stats: { ...s.stats, questsDone: s.stats.questsDone + 1 },
            player: { ...s.player, gold: s.player.gold + q.gold },
          })
          get().notify({ tone: 'system', icon: '◆', title: 'Quest abgeschlossen', body: `${q.title} · +${q.xp} XP · +${q.gold} Gold` })
          log(`Quest abgeschlossen: ${q.title}`, '✅')
          get().addStatXp(q.statXp)

          // loot
          const r = Math.random()
          const lootChance = q.type === 'daily' ? 0.3 : q.type === 'penalty' ? 0 : 0.75
          if (r < lootChance) {
            const item = rollItem(q.type === 'main' ? 1 : 0)
            get().grant(item.id)
            if (['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity)) setTimeout(() => set({ reveal: [item] }), 500)
            else setTimeout(() => get().notify({ tone: 'loot', icon: item.icon, title: 'Item erhalten', body: item.name }), 300)
          } else if (r < lootChance + 0.25 && q.type !== 'penalty') {
            get().grant('mat_ribbon')
          }

          // daily completion bonus
          if (q.type === 'daily') {
            const dailies = get().quests.filter((x) => x.type === 'daily')
            if (dailies.every((x) => x.done)) {
              const p = get().player
              const streak = p.streak + 1
              set({ player: { ...p, streak, bestStreak: Math.max(p.bestStreak, streak) } })
              get().grant('box_daily')
              setTimeout(() => {
                sfx.loot()
                get().notify({ tone: 'loot', icon: '🔥', title: 'Daily Quest abgeschlossen!', body: `Streak: ${streak} Tage · Tägliche Kiste erhalten` })
              }, 700)
              log(`Alle Daily Quests geschafft – Streak ${streak}`, '🔥')
            }
          }
          get().gainXp(q.xp, true)
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
          set({ reveal: [{ ...ITEMS.find((i) => i.id === 'gold_pouch')!, name: `${gold} Gold`, desc: 'Login-Belohnung' }, item] })
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
          const consume = () => set((st) => ({ inventory: st.inventory.map((i) => (i.defId === defId ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) }))
          const e = def.effect
          consume()
          switch (e.kind) {
            case 'xp': sfx.quest(); get().gainXp(e.amount); break
            case 'gold': sfx.coin(); set((st) => ({ player: { ...st.player, gold: st.player.gold + e.amount } })); get().notify({ tone: 'good', icon: '🪙', title: `+${e.amount} Gold` }); break
            case 'gems': sfx.coin(); set((st) => ({ player: { ...st.player, gems: st.player.gems + e.amount } })); get().notify({ tone: 'good', icon: '💎', title: `+${e.amount} Kristalle` }); break
            case 'statPoint': sfx.level(); set((st) => ({ player: { ...st.player, statPoints: st.player.statPoints + e.amount } })); get().notify({ tone: 'system', icon: '✨', title: '+1 Statuspunkt', body: 'Verteile ihn im Status-Fenster.' }); break
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
              get().notify({ tone: 'loot', icon: def.icon, title: 'Belohnung eingelöst!', body: `${def.name} – du hast es dir verdient 💖` })
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
          get().grant(defId)
          get().notify({ tone: 'loot', icon: def.icon, title: 'Gekauft', body: def.name })
          return true
        },
        addReward: (name, icon, price) =>
          set((s) => ({ customItems: [...s.customItems, { id: 'rw_' + uid(), name, icon: icon || '🎀', desc: 'Echte Belohnung.', rarity: price >= 1000 ? 'epic' : price >= 300 ? 'rare' : 'uncommon', type: 'reward', price, effect: { kind: 'reward' } }] })),
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
          set({ reveal: [out] })
          log(`Fusion erfolgreich: ${out.name}`, '🔮')
          get().checkAchievements()
          return out
        },
        markSeen: () => set((s) => ({ inventory: s.inventory.map((i) => ({ ...i, isNew: false })) })),

        logHealth: (patch, day = dayKey()) => {
          const prev = get().health[day]
          set((s) => ({ health: { ...s.health, [day]: { ...emptyDay(), ...s.health[day], ...patch } } }))
          if (patch.sleep && !prev?.sleep) get().addStatXp({ vit: Math.round(patch.sleep * 2) })
          if (patch.mood && !prev?.mood) get().gainXp(5, true)
          get().evaluate()
          get().checkAchievements()
        },
        addHealth: (k, n) => {
          const day = dayKey()
          const cur = get().health[day] ?? emptyDay()
          get().logHealth({ [k]: Math.max(0, cur[k] + n) }, day)
          if (k === 'meditationMin' && n > 0) get().addStatXp({ per: Math.round(n) })
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
            get().notify({ tone: 'system', icon: '🧹', title: `${room.name} aufgeräumt`, body: '+20 XP · Wahrnehmung-Training' })
            get().addStatXp({ per: 15 })
            get().gainXp(20, true)
          }
          get().evaluate()
          get().checkAchievements()
        },
        renameRoom: (id, name) => mapRoom(id, (r) => ({ ...r, name })),
        addRoomItem: (roomId, item) => { mapRoom(roomId, (r) => ({ ...r, items: [...r.items, { ...item, id: uid() }] })); get().evaluate() },
        removeRoomItem: (roomId, id) => { mapRoom(roomId, (r) => ({ ...r, items: r.items.filter((i) => i.id !== id) })); get().evaluate() },
        addNeed: (roomId, text) => mapRoom(roomId, (r) => ({ ...r, needs: [...r.needs, { id: uid(), text, done: false }] })),
        toggleNeed: (roomId, id) => {
          const n = get().home.rooms.find((r) => r.id === roomId)?.needs.find((x) => x.id === id)
          mapRoom(roomId, (r) => ({ ...r, needs: r.needs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }))
          if (n && !n.done) { sfx.tap(); get().gainXp(10) }
        },
        removeNeed: (roomId, id) => mapRoom(roomId, (r) => ({ ...r, needs: r.needs.filter((x) => x.id !== id) })),
        needToShopping: (_roomId, n) => {
          get().addShopping(n.text)
          get().notify({ tone: 'good', icon: '🛒', title: 'Auf die Einkaufsliste', body: n.text })
        },
        toggleDevice: (id) => { sfx.tap(); set((s) => ({ home: { ...s.home, devices: s.home.devices.map((d) => (d.id === id ? { ...d, on: !d.on } : d)) } })) },
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
          get().notify({ tone: 'good', icon: '🪞', title: 'Outfit gespeichert', body: name })
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
            get().notify({ tone: 'system', icon: '💄', title: 'Outfit des Tages geloggt', body: '+25 XP · Charme-Training' })
            get().addStatXp({ cha: 20 })
            get().gainXp(25, true)
          } else get().notify({ tone: 'good', icon: '💄', title: 'Outfit aktualisiert' })
          get().evaluate()
        },

        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        exportData: () => {
          const s = get()
          const out: Record<string, unknown> = {}
          PERSIST_KEYS.forEach((k) => (out[k] = s[k]))
          return JSON.stringify({ app: 'gamifly', v: 1, data: out })
        },
        importData: (json) => {
          try {
            const parsed = JSON.parse(json)
            if (parsed.app !== 'gamifly' || !parsed.data) return false
            const data: Record<string, unknown> = {}
            PERSIST_KEYS.forEach((k) => { if (k in parsed.data) data[k] = parsed.data[k] })
            set(data as Partial<GameState>)
            get().rollover()
            return true
          } catch {
            return false
          }
        },
        resetAll: () => set({ ...baseData(), tab: 'status' }),
      }
    },
    {
      name: 'gamifly-save',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<GameState>,
    },
  ),
)

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
