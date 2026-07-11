/**
 * Gentle interruption as a real dialog: labelled for screen readers, focus
 * moves to the primary action on entry (and back on exit), Esc declines
 * when a decline action exists. `backdrop` nodes render behind the card.
 */
import { useRef, useEffect } from 'preact/hooks'

export function Overlay({ label, onDismiss = null, maxWidth = 520, backdrop = null, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('button:not(:disabled)')?.focus()
    return () => prev?.focus?.()
  }, [])

  useEffect(() => {
    if (!onDismiss) return
    const onKey = (e) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div class="overlay">
      {backdrop}
      <div ref={ref} class="card-modal" role="dialog" aria-modal="true" aria-label={label}
        style={`max-width:min(${maxWidth}px, 92vw);`}>
        {children}
      </div>
    </div>
  )
}
