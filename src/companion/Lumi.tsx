import { motion } from 'framer-motion'
import { useVoice } from './voice'

export type LumiMood = 'idle' | 'happy' | 'think' | 'surprised' | 'calm'

/** Lumi: a little matcha-mochi spirit with a sprout and a bow. Blinks, sways, talks and listens. */
export function Lumi({ size = 64, mood = 'idle', bob = true }: { size?: number; mood?: LumiMood; bob?: boolean }) {
  const speaking = useVoice((s) => s.speaking)
  const listening = useVoice((s) => s.listening)
  const happyEyes = mood === 'happy'
  return (
    <motion.svg viewBox="0 0 120 120" width={size} height={size} className="lumi" aria-hidden
      animate={bob ? { y: [0, -4, 0] } : undefined} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="lumiBody" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#eef5dc" />
          <stop offset="0.55" stopColor="#cfdcae" />
          <stop offset="1" stopColor="#a9bb83" />
        </radialGradient>
      </defs>
      {(speaking || listening) && [0, 1].map((i) => (
        <motion.circle key={i} cx="60" cy="72" r="44" fill="none" stroke={listening ? '#e47d6f' : '#a9bb83'} strokeWidth="2"
          initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.8 }} style={{ transformOrigin: '60px 72px' }} />
      ))}
      <ellipse cx="60" cy="112" rx="30" ry="4.5" fill="#3b3326" opacity="0.12" />
      <motion.g animate={{ rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }} style={{ transformOrigin: '60px 34px' }}>
        <path d="M60 36Q58 24 62 14" stroke="#5d7c33" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M62 18Q48 4 38 14Q48 26 62 18Z" fill="#7fa04a" />
        <path d="M62 18Q76 4 88 12Q78 26 62 18Z" fill="#86bf5c" />
        <path d="M62 18Q52 12 44 14" stroke="#5d7c33" strokeWidth="1.4" fill="none" opacity="0.5" />
      </motion.g>
      <path d="M18 74Q18 34 60 32Q102 34 102 74Q102 108 60 108Q18 108 18 74Z" fill="url(#lumiBody)" />
      <path d="M28 86Q38 104 60 104Q82 104 92 86Q82 98 60 98Q38 98 28 86Z" fill="#a9bb83" opacity="0.45" />
      <ellipse cx="38" cy="48" rx="7" ry="10" fill="#fff" opacity="0.55" transform="rotate(-35 38 48)" />
      {/* bow */}
      <g transform="translate(84 40) rotate(18)">
        <path d="M0 0C-8 -10 -18 -6 -14 2C-12 7 -4 6 0 1Z" fill="#f3b7aa" />
        <path d="M0 0C8 -10 18 -6 14 2C12 7 4 6 0 1Z" fill="#f3b7aa" />
        <circle r="3.4" fill="#e47d6f" />
      </g>
      {/* eyes */}
      {happyEyes ? (
        <g stroke="#3b3326" strokeWidth="3.6" fill="none" strokeLinecap="round">
          <path d="M39 70Q45 62 51 70" /><path d="M69 70Q75 62 81 70" />
        </g>
      ) : (
        <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1] }} style={{ transformOrigin: '60px 68px' }}>
          <ellipse cx="45" cy={mood === 'think' ? 64 : 68} rx="5.4" ry={mood === 'surprised' ? 7.5 : 6.4} fill="#3b3326" />
          <ellipse cx="75" cy={mood === 'think' ? 64 : 68} rx="5.4" ry={mood === 'surprised' ? 7.5 : 6.4} fill="#3b3326" />
          <circle cx="47" cy={mood === 'think' ? 61 : 65} r="2" fill="#fff" />
          <circle cx="77" cy={mood === 'think' ? 61 : 65} r="2" fill="#fff" />
        </motion.g>
      )}
      <ellipse cx="34" cy="80" rx="7" ry="4.2" fill="#e47d6f" opacity="0.45" />
      <ellipse cx="86" cy="80" rx="7" ry="4.2" fill="#e47d6f" opacity="0.45" />
      {/* mouth */}
      {speaking ? (
        <motion.ellipse cx="60" cy="84" rx="6" fill="#8a3d3a" animate={{ ry: [1.5, 5.5, 2.5, 6, 1.5] }} transition={{ repeat: Infinity, duration: 0.55 }} />
      ) : mood === 'surprised' ? (
        <ellipse cx="60" cy="85" rx="4" ry="5" fill="#8a3d3a" />
      ) : mood === 'think' ? (
        <path d="M54 85Q60 83 66 86" stroke="#3b3326" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d={mood === 'happy' ? 'M51 81Q60 92 69 81Z' : 'M53 82Q60 89 67 82'} stroke="#3b3326" strokeWidth="3" fill={mood === 'happy' ? '#8a3d3a' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {mood === 'think' && !speaking && (
        <g fill="#a9bb83">
          {[0, 1, 2].map((i) => <motion.circle key={i} cx={96 + i * 7} cy={30 - i * 6} r={2.4 + i * 0.8} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />)}
        </g>
      )}
    </motion.svg>
  )
}
