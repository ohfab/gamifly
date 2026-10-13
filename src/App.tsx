import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useGame } from './store/useGame'
import { Ambient, Hud, LevelUp, LootReveal, Nav, Toasts } from './components/Shell'
import { Awakening } from './components/Awakening'
import { Settings } from './components/Settings'
import { setSfx } from './lib/sfx'
import { setHaptics } from './lib/haptics'
import { CompanionSheet } from './companion/Companion'
import { Handbook } from './guide/Handbook'
import { Tour } from './guide/Tour'
import Status from './pages/Status'
import Quests from './pages/Quests'
import Life from './pages/Life'
import Inventory from './pages/Inventory'
import { Art } from './art/Art'

const Home = lazy(() => import('./pages/Home'))
const Style = lazy(() => import('./pages/Style'))

function Loader() {
  return (
    <div className="center" style={{ padding: 80 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} style={{ display: 'inline-block' }}><Art name="xp" size={40} /></motion.div>
      <div className="mono small muted mt">Dungeon wird geladen…</div>
    </div>
  )
}

export default function App() {
  const [hydrated, setHydrated] = useState(useGame.persist.hasHydrated())
  const onboarded = useGame((s) => s.onboarded)
  const tab = useGame((s) => s.tab)
  const theme = useGame((s) => s.settings.theme)
  const sound = useGame((s) => s.settings.sound)
  const haptics = useGame((s) => s.settings.haptics)
  const [settings, setSettings] = useState(false)

  useEffect(() => {
    const unsub = useGame.persist.onFinishHydration(() => setHydrated(true))
    if (useGame.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    useGame.getState().rollover()
    const t = setInterval(() => useGame.getState().rollover(), 60_000)
    const g = setInterval(() => { if (useGame.getState().gate) useGame.getState().checkGate() }, 5_000)
    const vis = () => document.visibilityState === 'visible' && useGame.getState().rollover()
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); clearInterval(g); document.removeEventListener('visibilitychange', vis) }
  }, [hydrated])

  useEffect(() => {
    document.documentElement.dataset.skin = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#04060c')
  }, [theme])
  useEffect(() => setSfx(sound), [sound])
  useEffect(() => setHaptics(haptics), [haptics])

  if (!hydrated) return <><Ambient /><Loader /></>
  if (!onboarded) return <><Ambient /><Awakening /><Toasts /></>

  return (
    <div className="app">
      <Ambient />
      <Hud onSettings={() => setSettings(true)} />
      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<Loader />}>
              {tab === 'status' && <Status />}
              {tab === 'quests' && <Quests />}
              {tab === 'home' && <Home />}
              {tab === 'style' && <Style />}
              {tab === 'life' && <Life />}
              {tab === 'inventory' && <Inventory />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Nav />
      <Toasts />
      <LevelUp />
      <LootReveal />
      <CompanionSheet />
      <Handbook />
      <Tour />
      <Settings open={settings} onClose={() => setSettings(false)} />
    </div>
  )
}
