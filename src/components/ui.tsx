import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Art } from '../art/Art'

export function Bar({ value, max, kind = 'xp', size }: { value: number; max: number; kind?: 'xp' | 'hp' | 'mp' | 'custom'; size?: 'lg'; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`bar ${kind} ${size ?? ''}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <motion.i initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
    </div>
  )
}

export function ColorBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bar">
      <motion.i style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
    </div>
  )
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  // portal: sheets must escape sticky / isolated parents, otherwise later content paints over them
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="overlay sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grab" />
            {title && (
              <div className="row between" style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontStyle: 'var(--display-style)', fontWeight: 'var(--display-weight)', fontStretch: 'var(--display-stretch)', fontSize: 24 }}>{title}</h2>
                <button className="btn ghost icon" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Seg<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { v: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'active' : ''} onClick={() => onChange(o.v)}>
          {value === o.v && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Press-and-hold to confirm — prevents accidental quest completion and feels gamey. */
export function HoldButton({ onDone, disabled, children, ms = 650 }: { onDone: () => void; disabled?: boolean; children: ReactNode; ms?: number }) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const stop = () => { cancelAnimationFrame(raf.current); setP(0) }
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / ms)
    setP(v)
    if (v >= 1) { onDone(); setTimeout(() => setP(0), 200); return }
    raf.current = requestAnimationFrame(tick)
  }
  return (
    <button
      className="hold-btn"
      disabled={disabled}
      onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = performance.now(); raf.current = requestAnimationFrame(tick) }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDone() } }}
      aria-label="Gedrückt halten zum Abschließen"
      style={{ ['--p' as string]: p }}
    >
      <span>{children}</span>
    </button>
  )
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
      {children}
    </motion.div>
  )
}
export const itemV = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } } }

export function Empty({ icon, text, children }: { icon: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="big"><Art name={icon} size={64} style={{ margin: '0 auto' }} /></div>
      <div>{text}</div>
      {children && <div className="mt">{children}</div>}
    </div>
  )
}
