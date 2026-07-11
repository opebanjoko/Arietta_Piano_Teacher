/** Tiny helpers shared across UI components. */

/** Fill {name} slots in a voice string: fill('Hi {name}', { name: 'Ada' }). */
export const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

/** Make a div behave as a button: role, tab stop, Enter/Space activation. */
export const pressable = (fn) => ({
  role: 'button',
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }
})
