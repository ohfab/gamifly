import { motion } from 'framer-motion'
import { useVoice } from './voice'

export type LumiMood = 'idle' | 'happy' | 'think' | 'surprised' | 'calm'

const HEX = (r: number) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2
  return `${60 + r * Math.cos(a)},${60 + r * Math.sin(a)}`
}).join(' ')

/**
 * The System: a holographic hex sigil with an eye-like core. Rings turn slowly, spin up while it thinks,
 * flare when something good happens and pulse red while the microphone listens.
 */
export function Lumi({ size = 64, mood = 'idle' }: { size?: number; mood?: LumiMood; bob?: boolean }) {
  const listening = useVoice((s) => s.listening)
  const accent = listening ? '#ff5470' : 'var(--sys, #4cc9ff)'
  const fast = mood === 'think'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="sys-core" aria-hidden style={{ overflow: 'visible', color: accent }}>
      <defs>
        <radialGradient id="coreGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#coreGlow)" opacity={mood === 'happy' ? 0.9 : 0.5} />
      <polygon points={HEX(50)} fill="#050a16" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: fast ? 2.4 : 18 }} style={{ transformOrigin: '60px 60px' }}>
        <polygon points={HEX(41)} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" strokeDasharray="10 6" />
      </motion.g>
      <motion.g animate={{ rotate: -360 }} transition={{ repeat: Infinity, ease: 'linear', duration: fast ? 1.6 : 11 }} style={{ transformOrigin: '60px 60px' }}>
        <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 9" opacity="0.8" />
      </motion.g>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2
        return <line key={i} x1={60 + 50 * Math.cos(a)} y1={60 + 50 * Math.sin(a)} x2={60 + 42 * Math.cos(a)} y2={60 + 42 * Math.sin(a)} stroke="currentColor" strokeWidth="2" />
      })}
      <ellipse cx="60" cy="60" rx="25" ry={mood === 'surprised' ? 18 : 14} fill="#02050c" stroke="currentColor" strokeWidth="1.8" />
      <motion.circle cx="60" cy="60" fill="currentColor" animate={{ r: mood === 'happy' ? [8, 10.5, 8] : [7, 8.2, 7], opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: listening ? 0.7 : 2.6, ease: 'easeInOut' }} />
      <circle cx="60" cy="60" r="3.4" fill="#eaf8ff" />
      {(listening || mood === 'happy') && [0, 1].map((i) => (
        <motion.polygon key={i} points={HEX(50)} fill="none" stroke="currentColor" strokeWidth="2"
          initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.8 }} style={{ transformOrigin: '60px 60px' }} />
      ))}
    </svg>
  )
}
