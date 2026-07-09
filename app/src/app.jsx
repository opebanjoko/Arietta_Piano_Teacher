/**
 * Root wiring: boot from the progress store, route screens, and feed every
 * NoteEvent — tap keyboard or microphone — through the same course engine
 * (SR-EVT-01/02). Pacing (encouragement pauses, demo and ear playback, the
 * self-hearing gate) lives here — the engine is pure.
 */
import { useState, useEffect, useRef } from 'preact/hooks'
import { findLesson, allLessons } from './content/course.js'
import { VOICE } from './content/voice.js'
import {
  startDrill, drillNote, drillContinue, drillChoice, drillAdvance,
  startSong, songNote, lessonStates, pickWarmup
} from './core/engine.js'
import { letter, nameToMidi } from './core/notes.js'
import { playTone } from './audio/synth.js'
import { createMic } from './audio/mic.js'
import { unregisterMic } from './audio/gate.js'
import { openDb } from './store/db.js'
import {
  listProfiles, createProfile, getProgress, markComplete, recordSongRun,
  savePosition, getActiveProfileId, setActiveProfileId,
  getMicSettings, saveMicSettings
} from './store/progress.js'
import { FirstRun } from './ui/FirstRun.jsx'
import { MicCheck } from './ui/MicCheck.jsx'
import { Home } from './ui/Home.jsx'
import { Lesson } from './ui/Lesson.jsx'
import { Song } from './ui/Song.jsx'
import { FreePlay } from './ui/FreePlay.jsx'
import { Keyboard } from './ui/Keyboard.jsx'

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
  const [recap, setRecap] = useState(null)
  const [warmupOffer, setWarmupOffer] = useState(null)

  const lessonRef = useRef(null)
  const drillRef = useRef(null)
  const songRef = useRef(null)
  const demoRef = useRef(demo); demoRef.current = demo
  const earRef = useRef(false)
  const micRef = useRef(null)
  const screenRef = useRef(screen); screenRef.current = screen
  const warmupNextRef = useRef(null)
  const micReturnRef = useRef('home')
  const earPlayedStepRef = useRef(-1)
  const tos = useRef([])
  const heardTO = useRef(null)

  const to = (fn, ms) => tos.current.push(setTimeout(fn, ms))
  const clearTos = () => { tos.current.forEach(clearTimeout); tos.current = [] }
  useEffect(() => () => { clearTos(); clearTimeout(heardTO.current); stopMic() }, [])

  useEffect(() => {
    (async () => {
      const d = await openDb()
      const [ps, mic] = await Promise.all([listProfiles(d), getMicSettings(d)])
      setDb(d)
      setProfiles(ps)
      setMicSettings(mic)
      if (!ps.length) {
        micReturnRef.current = 'firstrun'
        setScreen(mic ? 'firstrun' : 'miccheck')
        return
      }
      const aid = await getActiveProfileId(d)
      const active = ps.find(p => p.id === aid) ?? ps[0]
      setActiveId(active.id)
      setProgress(await getProgress(d, active.id))
      setScreen('home')
    })()
  }, [])

  // ---- microphone lifecycle: on while playing, off at home (SR-AUD-12 fallback is silent) ----

  const stopMic = () => {
    micRef.current?.stop()
    micRef.current = null
    unregisterMic()
    setMicState('idle')
  }

  const startMic = async () => {
    if (micRef.current || !micSettings?.enabled) return
    const mic = createMic({
      detector: micSettings.detector ?? 'mpm',
      clarity: micSettings.clarity ?? 0.9,
      onNote: (ev) => onNote(ev),
      onState: setMicState
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

  useEffect(() => {
    if (screen !== 'lesson' || !drill || lessonRef.current?.kind !== 'drill') return
    const step = lessonRef.current.steps[drill.stepIndex]
    if (drill.phase === 'working' && step?.kind.startsWith('ear-') && earPlayedStepRef.current !== drill.stepIndex) {
      earPlayedStepRef.current = drill.stepIndex
      playEar()
    }
  }, [screen, drill?.stepIndex, drill?.phase])

  // ---- profiles ----

  const refreshProgress = async (pid = activeId) => setProgress(await getProgress(db, pid))

  const onCreateProfile = async (name) => {
    const p = await createProfile(db, name)
    await setActiveProfileId(db, p.id)
    setProfiles(await listProfiles(db))
    setActiveId(p.id)
    setProgress(new Map())
    setScreen('home')
  }

  const onSelectProfile = async (pid) => {
    await setActiveProfileId(db, pid)
    setActiveId(pid)
    await refreshProgress(pid)
  }

  const onMicCheckDone = async (settings) => {
    await saveMicSettings(db, settings)
    setMicSettings(settings)
    setScreen(micReturnRef.current === 'firstrun' && !profiles.length ? 'firstrun' : 'home')
    micReturnRef.current = 'home'
  }

  // ---- navigation ----

  const openLesson = (id) => {
    clearTos()
    const lesson = findLesson(id)
    lessonRef.current = lesson
    earPlayedStepRef.current = -1
    setRecap(null) // the recap is said once; moving on dismisses it
    setOverlay(false)
    setDemo({ on: false, pos: -1 })
    setWarmupOffer(null)
    if (lesson.kind === 'drill') {
      let s = startDrill(lesson)
      const saved = progress.get(id)
      if (!saved?.completed && saved?.stepIndex > 0) {
        s = { ...s, stepIndex: Math.min(saved.stepIndex, lesson.steps.length - 1) }
      }
      drillRef.current = s
      setDrill(s)
      setSong(null)
    } else {
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
      const wu = pickWarmup(allLessons(), progress)
      if (wu && wu.id !== id) {
        setWarmupOffer({
          lesson: wu,
          accept: () => { session.set('warmupOffered'); warmupNextRef.current = id; openLesson(wu.id) },
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
    if (lesson?.kind === 'drill' && d && d.phase !== 'done' && d.stepIndex > 0) {
      savePosition(db, activeId, lesson.id, d.stepIndex)
    }
    lessonRef.current = null
    warmupNextRef.current = null
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
      const next = drillNote(prev, lesson, ev)
      commitDrill(next)
      afterDrill(prev, next, lesson)
    } else {
      const prev = songRef.current
      const next = songNote(prev, lesson, ev)
      commitSong(next)
      if (next.done && !prev.done) {
        recordSongRun(db, activeId, lesson.id, next.cleanCount).then(() => refreshProgress())
        noteRecap(lesson)
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
          markComplete(db, activeId, lesson.id).then(() => refreshProgress())
          noteRecap(lesson)
        } else {
          savePosition(db, activeId, lesson.id, adv.stepIndex)
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

  // ---- render ----

  if (screen === 'boot') return <div class="screen"></div>
  if (screen === 'miccheck') return <MicCheck initialClarity={micSettings?.clarity ?? 0.9} onDone={onMicCheckDone} />
  if (screen === 'firstrun') return <FirstRun onCreate={onCreateProfile} />
  if (screen === 'newprofile') return <FirstRun onCreate={onCreateProfile} onCancel={() => setScreen('home')} />

  const states = lessonStates(allLessons(), new Set([...progress.values()].filter(r => r.completed).map(r => r.lessonId)))
  const pill = {
    text: heard !== null ? `Heard ${letter(heard)}`
      : (demo.on || earPlaying || micState === 'suspended') ? 'Playing it…' : 'Listening…',
    active: heard !== null
  }

  if (screen === 'home') {
    const active = profiles.find(p => p.id === activeId)
    return (
      <div class="screen">
        <Home profileName={active.name} profiles={profiles} activeId={activeId} states={states}
          micEnabled={!!micSettings?.enabled} recap={recap} warmup={warmupOffer}
          onOpen={openFromHome} onSelectProfile={onSelectProfile}
          onNewProfile={() => setScreen('newprofile')}
          onMicCheck={() => { micReturnRef.current = 'home'; setScreen('miccheck') }}
          onFreePlay={() => { setFreeCount(0); setRecap(null); setScreen('freeplay') }} />
      </div>
    )
  }

  if (screen === 'freeplay') {
    return (
      <div class="screen">
        <FreePlay heard={heard} noteCount={freeCount} pill={pill} onHome={goHome} />
        <Keyboard onNote={onNote} glowMidi={null} />
      </div>
    )
  }

  const lesson = lessonRef.current
  const glowMidi = lesson.kind === 'drill'
    ? (drill.phase === 'working' && drill.misses >= 2 && ['play', 'ear-echo'].includes(lesson.steps[drill.stepIndex].kind)
        ? nameToMidi(lesson.steps[drill.stepIndex].targets[drill.seqPos].note) : null)
    : (!song.done && song.misses >= 2 ? nameToMidi(lesson.notes[song.pos].note) : null)

  const nextAfterWarmup = warmupNextRef.current && findLesson(warmupNextRef.current)
  const doneAction = nextAfterWarmup ? {
    label: fill(VOICE.warmup.onward, { title: nextAfterWarmup.title }),
    go: () => { warmupNextRef.current = null; openLesson(nextAfterWarmup.id) }
  } : null

  return (
    <div class="screen">
      {lesson.kind === 'drill'
        ? <Lesson lesson={lesson} drill={drill} pill={pill} earPlaying={earPlaying}
            onHome={goHome} onContinue={onContinue} onChoice={onChoice}
            onReplayEar={playEar} onNextSong={openLesson} doneAction={doneAction} />
        : <Song lesson={lesson} song={song} demo={demo} overlay={overlay} pill={pill}
            onHome={goHome} onHearIt={onHearIt} onReplay={onReplay} />}
      <Keyboard onNote={onNote} glowMidi={glowMidi} />
    </div>
  )
}
