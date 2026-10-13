let on = true
export const setHaptics = (v: boolean) => { on = v }
export const buzz = (pattern: number | number[] = 12) => {
  if (!on) return
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}
