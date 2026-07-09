/**
 * Mic recovery state machine (SR-PLT-02): pure logic, injected effects, so it
 * unit-tests under node. The mic controller feeds it break events (track
 * ended, AudioContext interrupted/suspended, page hidden/visible) and it
 * decides when to call restart(), retrying on a short ladder before giving
 * up as 'lost'. Recovery never runs while the page is hidden.
 */
export function createRecovery({
  restart, onState,
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = clearTimeout,
  delays = [1000, 3000]
}) {
  let broken = false
  let visible = true
  let attempting = false
  let attempt = 0
  let timer = null
  let stopped = false
  let lost = false

  async function tryRestart() {
    attempting = true
    try {
      await restart()
      if (stopped) return
      broken = false
      attempting = false
      attempt = 0
      lost = false
    } catch {
      if (stopped) return
      attempting = false
      if (attempt < delays.length) {
        timer = schedule(() => { timer = null; if (!stopped && broken && visible) tryRestart() }, delays[attempt++])
      } else {
        lost = true
        onState('lost')
      }
    }
  }

  function begin() {
    if (stopped || attempting || timer !== null || !broken || !visible) return
    lost = false
    attempt = 0
    onState('interrupted')
    tryRestart()
  }

  function broke() {
    if (stopped || (broken && !lost)) return
    lost = false
    broken = true
    begin()
  }

  return {
    trackEnded() { broke() },
    ctxStateChanged(state) {
      if (state === 'interrupted' || state === 'suspended') broke()
    },
    visibility(v) {
      visible = v
      if (v) begin()
    },
    stop() {
      stopped = true
      if (timer !== null) { cancel(timer); timer = null }
    }
  }
}
