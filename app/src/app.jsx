/**
 * Root wiring: boot from the progress store, route screens, and feed every
 * NoteEvent from the tap keyboard through the course engine (SR-EVT-01/02).
 * Pacing (encouragement pauses, demo tempo) lives here — the engine is pure.
 */
import { useState, useEffect, useRef } from 'preact/hooks'
import { findLesson, allLessons } from './content/course.js'
import { startDrill, drillNote, drillContinue, drillAdvance, startSong, songNote, lessonStates } from './core/engine.js'
import { letter } from './core/notes.js'
import { nameToMidi } from './core/notes.js'
import { playTone } from './audio/synth.js'
import { openDb } from './store/db.js'
import {
  listProfiles, createProfile, getProgress, markComplete, recordSongRun,
  savePosition, getActiveProfileId, setActiveProfileId
} from './store/progress.js'
import { FirstRun } from './ui/FirstRun.jsx'
import { Home } from './ui/Home.jsx'
import { Lesson } from './ui/Lesson.jsx'
import { Song } from './ui/Song.jsx'
import { Keyboard } from './ui/Keyboard.jsx'

const STEP_PAUSE = 1150
const SONG_DONE_PAUSE = 500
const HEARD_HOLD = 1600
const DEMO_STEP = 430

export function App() {
  const [db, setDb] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [progress, setProgress] = useState(new Map())
  const [screen, setScreen] = useState('boot')
  const [drill, setDrill] = useState(null)
  const [song, setSong] = useState(null)
  const [overlay, setOverlay] = useState(false)
  const [heard, setHeard] = useState(null)
  const [demo, setDemo] = useState({ on: false, pos: -1 })

  const lessonRef = useRef(null)
  const drillRef = useRef(null)
  const songRef = useRef(null)
  const demoRef = useRef(demo)
  demoRef.current = demo
  const tos = useRef([])
  const heardTO = useRef(null)

  const to = (fn, ms) => tos.current.push(setTimeout(fn, ms))
  const clearTos = () => { tos.current.forEach(clearTimeout); tos.current = [] }
  useEffect(() => () => { clearTos(); clearTimeout(heardTO.current) }, [])

  useEffect(() => {
    (async () => {
      const d = await openDb()
      const ps = await listProfiles(d)
      setDb(d)
      setProfiles(ps)
      if (!ps.length) { setScreen('firstrun'); return }
      const aid = await getActiveProfileId(d)
      const active = ps.find(p => p.id === aid) ?? ps[0]
      setActiveId(active.id)
      setProgress(await getProgress(d, active.id))
      setScreen('home')
    })()
  }, [])

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

  const openLesson = (id) => {
    clearTos()
    const lesson = findLesson(id)
    lessonRef.current = lesson
    setOverlay(false)
    setDemo({ on: false, pos: -1 })
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

  const goHome = () => {
    clearTos()
    const lesson = lessonRef.current
    const d = drillRef.current
    if (lesson?.kind === 'drill' && d && d.phase !== 'done' && d.stepIndex > 0) {
      savePosition(db, activeId, lesson.id, d.stepIndex)
    }
    lessonRef.current = null
    setDemo({ on: false, pos: -1 })
    setScreen('home')
  }

  const commitDrill = (s) => { drillRef.current = s; setDrill(s) }
  const commitSong = (s) => { songRef.current = s; setSong(s) }

  const markHeard = (midi) => {
    clearTimeout(heardTO.current)
    setHeard(midi)
    heardTO.current = setTimeout(() => setHeard(null), HEARD_HOLD)
  }

  const onNote = (ev) => {
    playTone(ev.pitch)
    markHeard(ev.pitch)
    if (demoRef.current.on) return // never grade our own playback (SR-OUT-02)
    const lesson = lessonRef.current
    if (!lesson || screen !== 'lesson') return

    if (lesson.kind === 'drill') {
      const prev = drillRef.current
      const next = drillNote(prev, lesson, ev)
      commitDrill(next)
      if (next.phase === 'stepdone' && prev.phase === 'working') {
        to(() => {
          const adv = drillAdvance(drillRef.current, lesson)
          commitDrill(adv)
          if (adv.phase === 'done') {
            markComplete(db, activeId, lesson.id).then(() => refreshProgress())
          } else {
            savePosition(db, activeId, lesson.id, adv.stepIndex)
          }
        }, STEP_PAUSE)
      }
    } else {
      const prev = songRef.current
      const next = songNote(prev, lesson, ev)
      commitSong(next)
      if (next.done && !prev.done) {
        recordSongRun(db, activeId, lesson.id, next.cleanCount).then(() => refreshProgress())
        to(() => setOverlay(true), SONG_DONE_PAUSE)
      }
    }
  }

  const onContinue = () => {
    const lesson = lessonRef.current
    commitDrill(drillContinue(drillRef.current, lesson))
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

  if (screen === 'boot') return <div class="screen"></div>
  if (screen === 'firstrun') return <FirstRun onCreate={onCreateProfile} />
  if (screen === 'newprofile') return <FirstRun onCreate={onCreateProfile} onCancel={() => setScreen('home')} />

  const states = lessonStates(allLessons(), new Set([...progress.values()].filter(r => r.completed).map(r => r.lessonId)))

  if (screen === 'home') {
    const active = profiles.find(p => p.id === activeId)
    return (
      <div class="screen">
        <Home profileName={active.name} profiles={profiles} activeId={activeId} states={states}
          onOpen={openLesson} onSelectProfile={onSelectProfile} onNewProfile={() => setScreen('newprofile')} />
      </div>
    )
  }

  const lesson = lessonRef.current
  const pill = {
    text: heard !== null ? `Heard ${letter(heard)}` : demo.on ? 'Playing it…' : 'Listening…',
    active: heard !== null
  }
  const glowMidi = lesson.kind === 'drill'
    ? (drill.phase === 'working' && drill.misses >= 2 && lesson.steps[drill.stepIndex].kind === 'play'
        ? nameToMidi(lesson.steps[drill.stepIndex].targets[drill.seqPos].note) : null)
    : (!song.done && song.misses >= 2 ? nameToMidi(lesson.notes[song.pos].note) : null)

  return (
    <div class="screen">
      {lesson.kind === 'drill'
        ? <Lesson lesson={lesson} drill={drill} pill={pill} onHome={goHome} onContinue={onContinue} onNextSong={openLesson} />
        : <Song lesson={lesson} song={song} demo={demo} overlay={overlay} pill={pill} onHome={goHome} onHearIt={onHearIt} onReplay={onReplay} />}
      <Keyboard onNote={onNote} glowMidi={glowMidi} />
    </div>
  )
}
