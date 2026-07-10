/**
 * Root wiring: boot from the progress store, route screens, and feed every
 * NoteEvent — tap keyboard or microphone — through the same course engine
 * (SR-EVT-01/02). Pacing (encouragement pauses, demo and ear playback, the
 * self-hearing gate) lives here — the engine is pure.
 */
import { useState, useEffect, useRef } from 'preact/hooks'
import { findLesson, allLessons, READING_POOL } from './content/course.js'
import { PRACTICE_PACKS } from './content/practice.js'
import { resolveReading, readingWarmup } from './core/reading.js'
import { planPracticeSession, practiceLesson } from './core/practice.js'
import { VOICE } from './content/voice.js'
import {
  startDrill, drillNote, drillContinue, drillChoice, drillClap, drillAdvance,
  startSong, songNote, acceptLoop, declineLoop, songTargetIndex, lessonStates, pickWarmup,
  atTempo
} from './core/engine.js'
import { letter, nameToMidi } from './core/notes.js'
import { playTone, playHarmony } from './audio/synth.js'
import { startMetronome, playClap } from './audio/metronome.js'
import { createMic } from './audio/mic.js'
import { unregisterMic, holdFor } from './audio/gate.js'
import { openDb } from './store/db.js'
import { createSyncClient } from './sync/client.js'
import { logDiag, listDiag, clearDiag } from './store/diag.js'
import {
  listProfiles, createProfile, deleteProfile, resetProgress, getProgress,
  getPracticeProgress, recordPracticeRun,
  markComplete, recordSongRun, savePosition, getActiveProfileId, setActiveProfileId,
  getMicSettings, saveMicSettings, getSettings, saveSettings
} from './store/progress.js'
import { glimpseText } from './core/glimpse.js'
import { FirstRun } from './ui/FirstRun.jsx'
import { MicCheck } from './ui/MicCheck.jsx'
import { Home } from './ui/Home.jsx'
import { Lesson } from './ui/Lesson.jsx'
import { Song } from './ui/Song.jsx'
import { FreePlay } from './ui/FreePlay.jsx'
import { Settings, ACCENTS } from './ui/Settings.jsx'
import { Keyboard } from './ui/Keyboard.jsx'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const STEP_PAUSE = 1150
const SONG_DONE_PAUSE = 500
const HEARD_HOLD = 1600
const DEMO_STEP = 430
const EAR_STEP = 650

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])
const session = {
  get: (k) => sessionStorage.getItem(`arietta:${k}`) === '1',
  set: (k) => sessionStorage.setItem(`arietta:${k}`, '1')
}

export function App() {
  const [db, setDb] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [progress, setProgress] = useState(new Map())
  const [practiceProgress, setPracticeProgress] = useState(new Map())
  const [micSettings, setMicSettings] = useState(null)
  const [screen, setScreen] = useState('boot')
  const [drill, setDrill] = useState(null)
  const [song, setSong] = useState(null)
  const [overlay, setOverlay] = useState(false)
  const [heard, setHeard] = useState(null)
  const [demo, setDemo] = useState({ on: false, pos: -1 })
  const [earPlaying, setEarPlaying] = useState(false)
  const [micState, setMicState] = useState('idle')
  const [freeCount, setFreeCount] = useState(0)
  const [accompany, setAccompany] = useState(false)
  const [profileSettings, setProfileSettings] = useState({})
  const [recap, setRecap] = useState(null)
  const [warmupOffer, setWarmupOffer] = useState(null)
  const [practiceOffer, setPracticeOffer] = useState(null)
  const [beat, setBeat] = useState(false)
  const [diagEntries, setDiagEntries] = useState([])
  const [syncState, setSyncState] = useState({ linked: false, code: null, lastSyncAt: null, failing: false })
  const [tempoChoice, setTempoChoice] = useState('full')

  const syncRef = useRef(null)
  const lessonRef = useRef(null)
  const baseLessonRef = useRef(null)
  const drillRef = useRef(null)
  const songRef = useRef(null)
  const demoRef = useRef(demo); demoRef.current = demo
  const accompanyRef = useRef(accompany); accompanyRef.current = accompany
  const earRef = useRef(false)
  const micRef = useRef(null)
  const screenRef = useRef(screen); screenRef.current = screen
  const warmupNextRef = useRef(null)
  const practiceQueueRef = useRef([])
  const micReturnRef = useRef('home')
  const earPlayedStepRef = useRef(-1)
  const tos = useRef([])
  const heardTO = useRef(null)
  const metroRef = useRef(null)
  const detectorMsRef = useRef(null)
  const micStateRef = useRef('idle')

  const to = (fn, ms) => tos.current.push(setTimeout(fn, ms))
  const clearTos = () => { tos.current.forEach(clearTimeout); tos.current = [] }
  const stopMetro = () => { metroRef.current?.stop(); metroRef.current = null }
  useEffect(() => () => { clearTos(); clearTimeout(heardTO.current); stopMetro(); stopMic() }, [])

  useEffect(() => {
    (async () => {
      const d = await openDb()
      const [ps, mic] = await Promise.all([listProfiles(d), getMicSettings(d)])
      setDb(d)
      logDiag(d, 'boot', navigator.userAgent)
      window.addEventListener('error', (e) => logDiag(d, 'error', e.message))
      window.addEventListener('unhandledrejection', (e) => logDiag(d, 'error', e.reason?.message ?? String(e.reason)))
      setProfiles(ps)
      setMicSettings(mic)
      const sync = createSyncClient({
        db: d,
        url: import.meta.env.VITE_SYNC_URL ?? '',
        onChange: () => sync.getState().then(setSyncState)
      })
      syncRef.current = sync
      sync.getState().then(setSyncState)
      sync.schedule()
      if (!ps.length) {
        micReturnRef.current = 'firstrun'
        setScreen(mic ? 'firstrun' : 'miccheck')
        return
      }
      const aid = await getActiveProfileId(d)
      const active = ps.find(p => p.id === aid) ?? ps[0]
      setActiveId(active.id)
      const [prog, prac, settings] = await Promise.all([
        getProgress(d, active.id),
        getPracticeProgress(d, active.id),
        getSettings(d, active.id)
      ])
      setProgress(prog)
      setPracticeProgress(prac)
      setProfileSettings(settings)
      setScreen('home')
    })()
  }, [])

  // ---- microphone lifecycle: on while playing, off at home (SR-AUD-12 fallback is silent) ----

  const stopMic = () => {
    micRef.current?.stop()
    micRef.current = null
    unregisterMic()
    micStateRef.current = 'idle'
    setMicState('idle')
  }

  const startMic = async () => {
    if (micRef.current || !micSettings?.enabled) return
    const mic = createMic({
      detector: micSettings.detector ?? 'mpm',
      clarity: micSettings.clarity ?? 0.9,
      onNote: (ev) => onNote(ev),
      onOnset: (ev) => onClap(ev),
      onStats: (ms) => { detectorMsRef.current = ms },
      onState: (s) => {
        if (s === 'interrupted') logDiag(db, 'mic-interrupted')
        else if (s === 'lost') logDiag(db, 'mic-lost')
        else if (s === 'listening' && micStateRef.current === 'interrupted') logDiag(db, 'mic-recovered')
        micStateRef.current = s
        setMicState(s)
      }
    })
    micRef.current = mic
    try {
      await mic.start()
    } catch {
      stopMic() // mic denied or gone since calibration — tap keys carry the lesson
    }
  }

  useEffect(() => {
    if (screen === 'lesson' || screen === 'freeplay') startMic()
    else stopMic()
  }, [screen, micSettings])

  // per-player accent colour: one var, the palette derives from it
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', profileSettings.accent ?? ACCENTS[0])
  }, [profileSettings.accent])

  // coming back online is a good moment to try carrying progress over (SR-STO-04)
  useEffect(() => {
    const onUp = () => syncRef.current?.schedule()
    window.addEventListener('online', onUp)
    return () => window.removeEventListener('online', onUp)
  }, [])

  // ---- the pulse (SR-OUT-04): ticking whenever a timed step or piece is live ----

  const pulseWanted = () => {
    const lesson = lessonRef.current
    if (screen !== 'lesson' || !lesson?.tempo || demo.on || earPlaying) return false
    if (lesson.kind === 'song') return !songRef.current?.done
    const d = drillRef.current
    const step = lesson.steps[d?.stepIndex]
    return d?.phase !== 'done' && (step?.timed || step?.kind === 'rhythm-clap')
  }

  useEffect(() => {
    if (pulseWanted() && !metroRef.current) {
      metroRef.current = startMetronome(lessonRef.current.tempo, () => setBeat(b => !b))
    } else if (!pulseWanted() && metroRef.current) {
      stopMetro()
    }
  }, [screen, drill, song, demo.on, earPlaying])

  // ---- ear-step playback: the app plays first, then listens (SR-OUT-02 sequencing) ----

  const playEar = () => {
    const lesson = lessonRef.current
    const step = lesson?.steps[drillRef.current?.stepIndex]
    if (!step || !step.kind.startsWith('ear-')) return
    const notes = step.play ?? step.targets
    earRef.current = true
    setEarPlaying(true)
    notes.forEach((t, i) => to(() => playTone(nameToMidi(t.note)), EAR_STEP * i))
    to(() => { earRef.current = false; setEarPlaying(false) }, EAR_STEP * notes.length + 700)
  }

  /** Demo the clap pattern (SR-CRS-10): the teacher claps first, then listens. */
  const playPattern = () => {
    const lesson = lessonRef.current
    const step = lesson?.steps[drillRef.current?.stepIndex]
    if (!step || step.kind !== 'rhythm-clap') return
    const beatLen = 60000 / lesson.tempo
    const times = [0]
    for (const b of step.pattern) times.push(times.at(-1) + b * beatLen)
    earRef.current = true
    setEarPlaying(true)
    holdFor(times.at(-1) + 600) // one gate hold spanning the whole demo
    times.forEach(t => to(() => playClap(), t))
    to(() => { earRef.current = false; setEarPlaying(false) }, times.at(-1) + 700)
  }

  useEffect(() => {
    if (screen !== 'lesson' || !drill || lessonRef.current?.kind !== 'drill') return
    const step = lessonRef.current.steps[drill.stepIndex]
    const demoed = step?.kind.startsWith('ear-') || step?.kind === 'rhythm-clap'
    if (drill.phase === 'working' && demoed && earPlayedStepRef.current !== drill.stepIndex) {
      earPlayedStepRef.current = drill.stepIndex
      step.kind === 'rhythm-clap' ? playPattern() : playEar()
    }
  }, [screen, drill?.stepIndex, drill?.phase])

  // ---- profiles ----

  const refreshProgress = async (pid = activeId) => setProgress(await getProgress(db, pid))
  const refreshPracticeProgress = async (pid = activeId) => setPracticeProgress(await getPracticeProgress(db, pid))

  const onCreateProfile = async (name) => {
    const p = await createProfile(db, name)
    await setActiveProfileId(db, p.id)
    setProfiles(await listProfiles(db))
    setActiveId(p.id)
    setProgress(new Map())
    setPracticeProgress(new Map())
    setProfileSettings({})
    setScreen('home')
    syncRef.current?.schedule()
  }

  const onSelectProfile = async (pid) => {
    await setActiveProfileId(db, pid)
    setActiveId(pid)
    const [prog, prac, settings] = await Promise.all([getProgress(db, pid), getPracticeProgress(db, pid), getSettings(db, pid)])
    setProgress(prog)
    setPracticeProgress(prac)
    setProfileSettings(settings)
    setPracticeOffer(null)
  }

  /** Re-list profiles and refresh the active player's progress (after a sync pull). */
  const reloadAll = async () => {
    const ps = await listProfiles(db)
    setProfiles(ps)
    if (!ps.some(p => p.id === activeId)) {
      if (!ps.length) { setScreen('firstrun'); return }
      await onSelectProfile(ps[0].id)
      return
    }
    await refreshProgress()
    await refreshPracticeProgress()
    setProfileSettings(await getSettings(db, activeId))
  }

  const patchSettings = (patch) => {
    const next = { ...profileSettings, ...patch }
    setProfileSettings(next)
    saveSettings(db, activeId, next)
    syncRef.current?.schedule()
  }

  const onMicCheckDone = async (settings) => {
    await saveMicSettings(db, settings)
    setMicSettings(settings)
    const back = micReturnRef.current === 'firstrun' && !profiles.length ? 'firstrun'
      : micReturnRef.current === 'settings' ? 'settings' : 'home'
    if (back === 'settings') setDiagEntries(await listDiag(db))
    setScreen(back)
    micReturnRef.current = 'home'
  }

  // ---- navigation ----

  const openPracticeEntry = (pack, remaining = []) => {
    practiceQueueRef.current = remaining
    openLesson(practiceLesson(pack))
  }

  const openPracticeSession = (practiceSession) => {
    session.set('practiceOffered')
    setPracticeOffer(null)
    const [first, ...rest] = practiceSession.entries
    if (first) openPracticeEntry(first, rest)
  }

  const completePractice = async (lesson) => {
    if (!lesson.practicePackId) return
    await recordPracticeRun(db, activeId, lesson.practicePackId)
    await refreshPracticeProgress()
  }

  useEffect(() => {
    if (screen !== 'home' || !activeId || warmupOffer || practiceOffer || session.get('practiceOffered')) return
    const practiceSession = planPracticeSession({
      lessons: allLessons(),
      packs: PRACTICE_PACKS,
      progress,
      practiceProgress
    })
    if (!practiceSession) return
    setPracticeOffer({
      session: practiceSession,
      accept: () => openPracticeSession(practiceSession),
      skip: () => {
        session.set('practiceOffered')
        setPracticeOffer(null)
      }
    })
  }, [screen, activeId, progress, practiceProgress, warmupOffer, practiceOffer])

  const openLesson = (idOrLesson) => {
    clearTos()
    const raw = typeof idOrLesson === 'string' ? findLesson(idOrLesson) : idOrLesson
    const readingSeed = profileSettings.readingSeed ?? 0
    const lesson = resolveReading(raw, readingSeed)
    if (lesson !== raw) patchSettings({ readingSeed: readingSeed + 1 })
    lessonRef.current = lesson
    earPlayedStepRef.current = -1
    setRecap(null) // the recap is said once; moving on dismisses it
    setOverlay(false)
    setDemo({ on: false, pos: -1 })
    setWarmupOffer(null)
    setPracticeOffer(null)
    setAccompany(false)
    if (lesson.kind === 'drill') {
      let s = startDrill(lesson)
      const saved = progress.get(lesson.id)
      if (!lesson.ephemeral && !saved?.completed && saved?.stepIndex > 0) {
        s = { ...s, stepIndex: Math.min(saved.stepIndex, lesson.steps.length - 1) }
      }
      drillRef.current = s
      setDrill(s)
      setSong(null)
    } else {
      baseLessonRef.current = lesson
      setTempoChoice('full') // a lingering slow choice from a previous song shouldn't carry over
      const s = startSong(lesson)
      songRef.current = s
      setSong(s)
      setDrill(null)
    }
    setScreen('lesson')
  }

  /** From home: a returning student gets the warm-up hello first (SR-CRS-06). */
  const openFromHome = (id) => {
    if (!session.get('warmupOffered')) {
      let wu = pickWarmup(allLessons(), progress)
      // from the first song onward, every other hello is brand-new music read cold (SR-CRS-11)
      const readingSeed = profileSettings.readingSeed ?? 0
      const readingReady = allLessons().some(l => l.kind === 'song' && progress.get(l.id)?.completed)
      if (wu && readingReady && readingSeed % 2 === 1) wu = readingWarmup(READING_POOL, readingSeed)
      if (wu && wu.id !== id) {
        setWarmupOffer({
          lesson: wu,
          accept: () => { session.set('warmupOffered'); warmupNextRef.current = id; openLesson(wu) },
          skip: () => { session.set('warmupOffered'); setWarmupOffer(null); openLesson(id) }
        })
        return
      }
      session.set('warmupOffered')
    }
    openLesson(id)
  }

  const goHome = () => {
    clearTos()
    const lesson = lessonRef.current
    const d = drillRef.current
    if (lesson?.kind === 'drill' && !lesson.ephemeral && d && d.phase !== 'done' && d.stepIndex > 0) {
      savePosition(db, activeId, lesson.id, d.stepIndex)
      syncRef.current?.schedule()
    }
    lessonRef.current = null
    warmupNextRef.current = null
    practiceQueueRef.current = []
    setDemo({ on: false, pos: -1 })
    earRef.current = false
    setEarPlaying(false)
    setScreen('home')
  }

  const noteRecap = (lesson) => {
    if (!session.get('recapShown') && lesson.recap) {
      session.set('recapShown')
      setRecap(lesson.recap) // shown on home, once per session (SR-CRS-12)
    }
  }

  // ---- the NoteEvent route (SR-EVT-01/02) ----

  const commitDrill = (s) => { drillRef.current = s; setDrill(s) }
  const commitSong = (s) => { songRef.current = s; setSong(s) }

  const markHeard = (midi) => {
    clearTimeout(heardTO.current)
    setHeard(midi)
    heardTO.current = setTimeout(() => setHeard(null), HEARD_HOLD)
  }

  /** Mic onsets during a clap step; taps arrive here via onNote (SR-AUD-14). */
  const onClap = (ev) => {
    if (demoRef.current.on || earRef.current) return
    const lesson = lessonRef.current
    if (!lesson || screenRef.current !== 'lesson' || lesson.kind !== 'drill') return
    const prev = drillRef.current
    if (lesson.steps[prev.stepIndex]?.kind !== 'rhythm-clap') return
    const next = drillClap(prev, lesson, ev)
    commitDrill(next)
    afterDrill(prev, next, lesson)
    if (next.misses > prev.misses) to(() => playPattern(), 1200) // clap it again for them
  }

  const onNote = (ev) => {
    if (ev.source === 'tap') playTone(ev.pitch) // key-tap feedback; mic notes are the piano itself
    markHeard(ev.pitch)
    if (demoRef.current.on || earRef.current) return // app is playing — never grade our own sound
    const scr = screenRef.current
    if (scr === 'freeplay') { setFreeCount(c => c + 1); return }
    const lesson = lessonRef.current
    if (!lesson || scr !== 'lesson') return

    if (lesson.kind === 'drill') {
      const prev = drillRef.current
      // during a clap step any key tap counts as a clap; mic claps arrive as onsets
      if (ev.source === 'tap' && lesson.steps[prev.stepIndex]?.kind === 'rhythm-clap') {
        onClap(ev)
        return
      }
      const next = drillNote(prev, lesson, ev)
      commitDrill(next)
      afterDrill(prev, next, lesson)
    } else {
      const prev = songRef.current
      const next = songNote(prev, lesson, ev)
      commitSong(next)
      // "Play with me": a soft voicing under each correct melody note (SR-OUT-03)
      const advanced = next.pos > prev.pos ||
        (prev.loop && (!next.loop || next.loop.pos !== prev.loop.pos || next.loop.round !== prev.loop.round))
      if (advanced && accompanyRef.current && lesson.harmony) {
        const h = lesson.harmony[songTargetIndex(prev)]
        if (h) playHarmony(h.map(nameToMidi))
      }
      if (next.done && !prev.done) {
        if (lesson.practicePackId) {
          completePractice(lesson)
        } else {
          recordSongRun(db, activeId, lesson.id, next.cleanCount).then(() => refreshProgress())
          syncRef.current?.schedule()
          noteRecap(lesson)
        }
        to(() => setOverlay(true), SONG_DONE_PAUSE)
      }
    }
  }

  const afterDrill = (prev, next, lesson) => {
    if (next.phase === 'stepdone' && prev.phase === 'working') {
      to(() => {
        const adv = drillAdvance(drillRef.current, lesson)
        commitDrill(adv)
        if (adv.phase === 'done') {
          if (lesson.practicePackId) {
            completePractice(lesson)
          } else {
            if (!lesson.ephemeral) markComplete(db, activeId, lesson.id).then(() => refreshProgress())
            syncRef.current?.schedule()
            noteRecap(lesson)
          }
        } else if (!lesson.ephemeral) {
          savePosition(db, activeId, lesson.id, adv.stepIndex)
          syncRef.current?.schedule()
        }
      }, STEP_PAUSE)
    }
  }

  const onContinue = () => {
    commitDrill(drillContinue(drillRef.current, lessonRef.current))
  }

  const onChoice = (idx) => {
    const lesson = lessonRef.current
    const prev = drillRef.current
    const next = drillChoice(prev, lesson, idx)
    commitDrill(next)
    afterDrill(prev, next, lesson)
    if (next.misses > prev.misses) to(() => playEar(), 900) // "I'll play them again"
  }

  const onHearIt = () => {
    const lesson = lessonRef.current
    if (demoRef.current.on || songRef.current?.done) return
    setDemo({ on: true, pos: -1 })
    lesson.notes.forEach((t, i) => to(() => {
      playTone(nameToMidi(t.note))
      setDemo({ on: true, pos: i })
    }, DEMO_STEP * i))
    to(() => setDemo({ on: false, pos: -1 }), DEMO_STEP * lesson.notes.length + 480)
  }

  const onReplay = () => {
    clearTos()
    setOverlay(false)
    commitSong(startSong(lessonRef.current))
  }

  const onAcceptLoop = () => commitSong(acceptLoop(songRef.current, lessonRef.current))
  const onDeclineLoop = () => commitSong(declineLoop(songRef.current))

  /** Tempo change restarts the piece: the timing grid changed, a mid-piece splice would judge unfairly. */
  const onTempo = (id) => {
    setTempoChoice(id)
    lessonRef.current = atTempo(baseLessonRef.current, id)
    stopMetro() // the pulse effect recreates the metronome at the new tempo
    commitSong(startSong(lessonRef.current))
  }

  // ---- render ----

  if (screen === 'boot') return <div class="screen"></div>
  if (screen === 'miccheck') return <MicCheck initialClarity={micSettings?.clarity ?? 0.9} onDone={onMicCheckDone} />
  if (screen === 'firstrun') return <FirstRun onCreate={onCreateProfile} />
  if (screen === 'newprofile') return <FirstRun onCreate={onCreateProfile} onCancel={() => setScreen('home')} />

  const states = lessonStates(allLessons(), new Set([...progress.values()].filter(r => r.completed).map(r => r.lessonId)))
  const pill = {
    text: heard !== null ? `Heard ${letter(heard)}`
      : micState === 'interrupted' ? VOICE.pill.waking
      : (demo.on || earPlaying || micState === 'suspended') ? 'Playing it…' : 'Listening…',
    active: heard !== null
  }

  if (screen === 'home') {
    const active = profiles.find(p => p.id === activeId)
    return (
      <div class="screen">
        <Home profileName={active.name} profiles={profiles} activeId={activeId} states={states}
          micEnabled={!!micSettings?.enabled} recap={recap} warmup={warmupOffer} practice={practiceOffer}
          onOpen={openFromHome} onSelectProfile={onSelectProfile}
          onNewProfile={() => setScreen('newprofile')}
          onMicCheck={() => { micReturnRef.current = 'home'; setScreen('miccheck') }}
          onSettings={async () => { setDiagEntries(await listDiag(db)); setScreen('settings') }}
          onFreePlay={() => { setFreeCount(0); setRecap(null); setScreen('freeplay') }} />
      </div>
    )
  }

  if (screen === 'settings') {
    const active = profiles.find(p => p.id === activeId)
    const diagInfo = {
      version: APP_VERSION,
      device: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      mic: micSettings,
      detectorAvgMs: detectorMsRef.current,
      entries: diagEntries
    }
    const onCopyDiag = async () => {
      const text = JSON.stringify(diagInfo, null, 2)
      try {
        if (navigator.share) { await navigator.share({ text }); return true }
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        return false // user cancelled the share sheet, or clipboard denied
      }
    }
    const onClearDiag = async () => {
      await clearDiag(db)
      setDiagEntries([])
    }
    return (
      <div class="screen">
        <Settings profile={active} micEnabled={!!micSettings?.enabled}
          settings={profileSettings} canDelete={profiles.length > 1}
          glimpse={glimpseText({ name: active.name, lessons: allLessons(), progress })}
          diagInfo={diagInfo} onCopyDiag={onCopyDiag} onClearDiag={onClearDiag}
          onHome={() => setScreen('home')}
          onMicCheck={() => { micReturnRef.current = 'settings'; setScreen('miccheck') }}
          onAccent={(accent) => patchSettings({ accent })}
          onLabels={(labels) => patchSettings({ labels })}
          onReset={async () => { await resetProgress(db, activeId); await refreshProgress(); await refreshPracticeProgress() }}
          onDelete={async () => {
            await syncRef.current?.noteProfileDeleted(activeId)
            await deleteProfile(db, activeId)
            syncRef.current?.schedule()
            const ps = await listProfiles(db)
            setProfiles(ps)
            if (!ps.length) { setScreen('firstrun'); return }
            await onSelectProfile(ps[0].id)
            setScreen('home')
          }}
          sync={syncState}
          onSyncCreate={(pin) => syncRef.current.create(pin)}
          onSyncJoin={async (code, pin) => { await syncRef.current.join(code, pin); await reloadAll() }}
          onSyncLeave={() => syncRef.current.leave()}
          onSyncDeleteEverywhere={(pin) => syncRef.current.deleteEverywhere(pin)}
          onSyncNow={async () => { await syncRef.current.syncNow(); await reloadAll() }} />
      </div>
    )
  }

  if (screen === 'freeplay') {
    return (
      <div class="screen">
        <FreePlay heard={heard} noteCount={freeCount} pill={pill} onHome={goHome} />
        <Keyboard onNote={onNote} glowMidi={null} showLabels={profileSettings.labels !== false} />
      </div>
    )
  }

  const lesson = lessonRef.current
  const lessonLow = lesson.kind === 'drill'
    ? lesson.steps.some(s => (s.targets ?? []).some(t => nameToMidi(t.note) < 60))
    : lesson.notes.some(t => nameToMidi(t.note) < 60)
  const glowMidi = lesson.kind === 'drill'
    ? (drill.phase === 'working' && drill.misses >= 2 && ['play', 'ear-echo'].includes(lesson.steps[drill.stepIndex].kind)
        ? nameToMidi(lesson.steps[drill.stepIndex].targets[drill.seqPos].note) : null)
    : (!song.done && song.misses >= 2 ? nameToMidi(lesson.notes[songTargetIndex(song)].note) : null)

  const nextAfterWarmup = warmupNextRef.current && findLesson(warmupNextRef.current)
  const nextPractice = lesson.practicePackId ? practiceQueueRef.current[0] : null
  const doneAction = nextAfterWarmup ? {
    label: fill(VOICE.warmup.onward, { title: nextAfterWarmup.title }),
    go: () => { warmupNextRef.current = null; openLesson(nextAfterWarmup.id) }
  } : nextPractice ? {
    label: fill(VOICE.practice.next, { title: nextPractice.title }),
    go: () => {
      const [next, ...rest] = practiceQueueRef.current
      openPracticeEntry(next, rest)
    }
  } : lesson.practicePackId ? {
    label: VOICE.practice.done,
    go: goHome
  } : null

  return (
    <div class="screen">
      {lesson.kind === 'drill'
        ? <Lesson lesson={lesson} drill={drill} pill={pill} earPlaying={earPlaying} beat={beat}
            onHome={goHome} onContinue={onContinue} onChoice={onChoice}
            onReplayEar={playEar} onReplayPattern={playPattern}
            onNextSong={openLesson} doneAction={doneAction} />
        : <Song lesson={lesson} song={song} demo={demo} overlay={overlay} pill={pill} beat={beat}
            accompany={accompany}
            accompanyAvailable={!!lesson.harmony && !!progress.get(lesson.id)?.completed}
            onToggleAccompany={() => setAccompany(a => !a)}
            tempoChoice={tempoChoice} onTempo={onTempo}
            onHome={goHome} onHearIt={onHearIt} onReplay={onReplay}
            onAcceptLoop={onAcceptLoop} onDeclineLoop={onDeclineLoop}
            doneAction={doneAction} />}
      <Keyboard onNote={onNote} glowMidi={glowMidi} low={lessonLow} showLabels={profileSettings.labels !== false} />
    </div>
  )
}
