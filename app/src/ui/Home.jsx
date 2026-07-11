/** Home / course map (SR-UI-01): greeting, next best action, path, songs, profiles. */
import { COURSE, allLessons } from '../content/course.js'
import { VOICE } from '../content/voice.js'
import { fill, pressable } from './util.js'
import { Overlay } from './Overlay.jsx'

function greeting(name) {
  const h = new Date().getHours()
  const key = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  return fill(VOICE.greeting[key], { name })
}

function Hero({ states, onOpen }) {
  const v = VOICE.home
  const lessons = allLessons()
  const next = lessons.find(l => states.get(l.id) === 'next')
  const peek = lessons.find(l => l.sneakPeek && states.get(l.id) === 'peek')

  if (!next) {
    return {
      kicker: v.kickerDone, line: v.lineDone,
      btnText: v.btnDone, btnGo: () => onOpen('ode-to-joy'),
      altText: null, altGo: null
    }
  }
  return {
    kicker: fill(v.kickerNext, { unit: next.unitTag, lesson: next.title }),
    line: fill(v.lineNext, { lesson: next.title }),
    btnText: fill(v.btnNext, { lesson: next.title }),
    btnGo: () => onOpen(next.id),
    altText: peek ? fill(v.altPeek, { song: peek.title }) : null,
    altGo: peek ? () => onOpen(peek.id) : null
  }
}

/** One letter normally; two when another player's name starts the same (touch has no tooltips). */
function monogram(p, profiles) {
  const clash = profiles.some(o => o.id !== p.id && o.name[0].toUpperCase() === p.name[0].toUpperCase())
  return clash ? p.name[0].toUpperCase() + (p.name[1] ?? '').toLowerCase() : p.name[0].toUpperCase()
}

function unitStatus(unit, states, prevUnit) {
  const v = VOICE.home
  // coming-soon lessons are visible but never block a unit's completion
  const real = unit.lessons.filter(l => states.get(l.id) !== 'coming-soon')
  const ss = real.map(l => states.get(l.id))
  const done = ss.filter(s => s === 'complete').length
  if (done === real.length) return { text: v.unitComplete, active: false, complete: true }
  if (ss.some(s => s === 'next')) {
    return { text: done ? fill(v.unitContinue, { done, total: real.length }) : v.unitStart, active: true, complete: false }
  }
  return { text: fill(v.unitLocked, { prev: prevUnit.title }), active: false, complete: false, locked: true }
}

export function Home({ profileName, profiles, activeId, states, micEnabled, recap, warmup, practice, recital, onOpen, onSelectProfile, onNewProfile, onMicCheck, onSettings, onFreePlay }) {
  const v = VOICE.home
  const hero = Hero({ states, onOpen })
  const songs = COURSE.units.flatMap(u => u.lessons).filter(l => l.kind === 'song')

  return (
    <section style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;animation:fadeUp .4s ease;position:relative;">
      <header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding:20px 36px 6px;">
        <div style="display:flex;align-items:baseline;gap:12px;">
          <div style="font-family:var(--serif);font-weight:700;font-size:25px;letter-spacing:.2px;">Arietta</div>
          <div style="font-family:var(--serif);font-style:italic;font-size:13.5px;color:var(--ink-mid);">a gentle piano teacher</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:12px 22px;">
          <button class="btn-quiet hit" onClick={onFreePlay} style="padding:8px 16px;">{v.freePlay}</button>
          <button class="btn-quiet hit" onClick={onSettings} style="padding:8px 16px;">{v.settings}</button>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="position:relative;width:9px;height:9px;">
              <div style={`position:absolute;inset:0;border-radius:50%;background:${micEnabled ? 'var(--sage)' : 'var(--todo)'};animation:breath 2.4s ease-out infinite;`}></div>
              <div style={`position:absolute;inset:0;border-radius:50%;background:${micEnabled ? 'var(--sage-ink)' : 'var(--ink-faint)'};`}></div>
            </div>
            <div style="font-size:12.5px;font-weight:700;color:var(--ink-soft);">{micEnabled ? v.micLine : v.micOffLine}</div>
            <button class="btn-quiet hit" onClick={onMicCheck} style="padding:5px 12px;font-size:11.5px;">{v.micCheckLink}</button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:1.6px;color:var(--ink-faint);">PLAYING&nbsp;AS</div>
            <div style="display:flex;gap:7px;">
              {profiles.map(p => {
                const active = p.id === activeId
                return (
                  <div key={p.id} {...pressable(() => onSelectProfile(p.id))} class="hit" title={p.name} aria-label={p.name} aria-pressed={active}
                    style={`width:37px;height:37px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14.5px;cursor:pointer;background:${active ? 'var(--accent-ink)' : '#F1E8D5'};color:${active ? '#FFF9EC' : 'var(--ink-mono)'};box-shadow:${active ? '0 0 0 3px color-mix(in oklab, var(--accent) 35%, transparent)' : 'inset 0 0 0 1px var(--line-soft)'};transition:all .2s ease;`}>
                    {monogram(p, profiles)}
                  </div>
                )
              })}
              {profiles.length < 5 && (
                <div {...pressable(onNewProfile)} class="hit" title="New player" aria-label="New player"
                  style="width:37px;height:37px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;cursor:pointer;background:transparent;color:var(--ink-faint);box-shadow:inset 0 0 0 1.5px var(--line-soft);transition:all .2s ease;">+</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {recap && (
        <div style="padding:14px 36px 0;animation:fadeUp .5s ease;">
          <div style="background:var(--accent-soft);border:1px solid var(--line-strong);border-radius:16px;padding:14px 22px;display:flex;flex-direction:column;gap:2px;">
            <div class="kicker">{v.recapKicker}</div>
            <div style="font-family:var(--serif);font-size:16.5px;color:var(--ink);">{recap.summary}</div>
            <div style="font-family:var(--serif);font-style:italic;font-size:14px;color:var(--ink-soft);">{recap.seed}</div>
          </div>
        </div>
      )}

      <div style="padding:18px 36px 4px;">
        <div style="position:relative;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:30px 38px 32px;box-shadow:var(--shadow-card);">
          {[26, 39, 52, 65, 78].map(b => (
            <div key={b} style={`position:absolute;left:0;right:0;bottom:${b}px;height:1.4px;background:rgba(43,36,28,.1);`}></div>
          ))}
          <div style="position:absolute;right:46px;top:-38px;font-family:var(--music);font-size:200px;line-height:1;color:var(--ink);opacity:.06;pointer-events:none;">𝄞</div>
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:6px;">
            <div class="kicker">{hero.kicker}</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:38px;line-height:1.12;">{greeting(profileName)}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);max-width:560px;text-wrap:pretty;">{hero.line}</div>
            {recital && (
              <div style="font-family:var(--serif);font-style:italic;font-size:14px;color:var(--cheer);">
                {fill(VOICE.recital.keepsake, { pieces: recital.pieces.join(', ') })}
              </div>
            )}
            <div style="display:flex;align-items:center;gap:18px;margin-top:16px;">
              <button class="btn-primary" onClick={hero.btnGo}>{hero.btnText}</button>
              {hero.altText && <button class="btn-link" onClick={hero.altGo}>{hero.altText}</button>}
            </div>
          </div>
        </div>
      </div>

      <div class="kicker" style="padding:22px 40px 10px;">{v.pathTitle}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:0 36px;">
        {COURSE.units.map((u, ui) => {
          const st = unitStatus(u, states, COURSE.units[ui - 1] ?? u)
          const openable = st.active || st.complete
          const firstOpen = u.lessons.find(l => ['next', 'peek'].includes(states.get(l.id))) ?? u.lessons[0]
          return (
            <div key={u.id} {...(openable ? pressable(() => onOpen(firstOpen.id)) : {})} class={openable ? 'card-press' : ''}
              style={`background:${st.active ? 'var(--card)' : 'var(--card-warm)'};border:1px solid ${st.active ? 'var(--line-strong)' : 'var(--line)'};border-radius:16px;padding:16px 18px;opacity:${st.locked ? .55 : 1};cursor:${openable ? 'pointer' : 'default'};box-shadow:${st.active ? '0 6px 18px rgba(140,100,40,.10)' : 'none'};transition:all .2s ease;`}>
              <div style="font-family:var(--mono);font-size:10px;letter-spacing:1.6px;color:var(--ink-faint);">{u.tag}</div>
              <div style="font-family:var(--serif);font-weight:600;font-size:19px;margin:6px 0 10px;">{u.title}</div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                {u.lessons.map(l => {
                  const s = states.get(l.id)
                  const dot = s === 'complete' ? 'var(--sage)' : s === 'next' ? 'var(--accent-ink)' : 'var(--todo)'
                  return (
                    <div key={l.id} style="display:flex;align-items:center;gap:8px;">
                      <div style={`width:7px;height:7px;border-radius:50%;background:${dot};`}></div>
                      <div style={`font-size:13px;color:var(--ink-soft);${s === 'coming-soon' ? 'opacity:.6;' : ''}`}>{l.title}</div>
                      {s === 'coming-soon' && <div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1px;color:var(--ink-faint);border:1px dashed var(--line-soft);border-radius:5px;padding:1px 5px;">SOON</div>}
                    </div>
                  )
                })}
              </div>
              <div style={`margin-top:12px;font-size:12.5px;font-weight:800;color:${st.active ? 'var(--accent-ink)' : st.complete ? 'var(--sage-ink)' : 'var(--ink-faint)'};`}>{st.text}</div>
            </div>
          )
        })}
      </div>

      <div class="kicker" style="padding:24px 40px 10px;">{v.songsTitle}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:0 36px 30px;">
        {songs.map(song => {
          const s = states.get(song.id)
          const playable = s !== 'locked'
          const tag = s === 'complete' ? v.songDone : s === 'peek' ? v.songPeek : s === 'next' ? v.songNext : v.songNext
          const action = s === 'complete' ? v.songReplay : playable ? v.songPlay : v.songLocked
          return (
            <div key={song.id} {...(playable ? pressable(() => onOpen(song.id)) : {})} class={playable ? 'card-press' : ''}
              style={`background:${playable ? 'var(--card)' : 'var(--card-warm)'};border:1px solid ${playable ? 'var(--line-strong)' : 'var(--line)'};border-radius:16px;padding:16px 18px;opacity:${playable ? 1 : .55};cursor:${playable ? 'pointer' : 'default'};box-shadow:${playable ? '0 6px 18px rgba(140,100,40,.10)' : 'none'};transition:all .2s ease;`}>
              <div style={`font-family:var(--mono);font-size:10px;letter-spacing:1.6px;color:${playable ? 'var(--accent-ink)' : 'var(--ink-faint)'};`}>{tag}</div>
              <div style="font-family:var(--serif);font-weight:600;font-size:19px;margin:6px 0 6px;">{song.title}</div>
              <div style="font-size:13px;color:var(--ink-soft);text-wrap:pretty;">{playable ? song.card : v.songLockedLine}</div>
              <div style={`margin-top:12px;font-size:12.5px;font-weight:800;color:${playable ? 'var(--accent-ink)' : 'var(--ink-faint)'};`}>{action}</div>
            </div>
          )
        })}
      </div>

      {warmup && (
        <Overlay label={VOICE.warmup.title} onDismiss={warmup.skip}>
            <div class="kicker">{VOICE.warmup.kicker}</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:30px;margin-top:8px;">{VOICE.warmup.title}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;text-wrap:pretty;">{fill(VOICE.warmup.line, { title: warmup.lesson.title })}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
              <button class="btn-primary" onClick={warmup.accept}>{VOICE.warmup.accept}</button>
              <button class="btn-quiet" onClick={warmup.skip} style="padding:12px 20px;font-size:14px;">{VOICE.warmup.skip}</button>
            </div>
        </Overlay>
      )}

      {practice && !warmup && (
        <Overlay label={VOICE.practice.title} onDismiss={practice.skip} maxWidth={560}>
            <div class="kicker">{VOICE.practice.kicker}</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:30px;margin-top:8px;">{VOICE.practice.title}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;text-wrap:pretty;">{fill(VOICE.practice.line, { titles: practice.session.entries.map(e => e.title).join(', ') })}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
              <button class="btn-primary" onClick={practice.accept}>{VOICE.practice.accept}</button>
              <button class="btn-quiet" onClick={practice.skip} style="padding:12px 20px;font-size:14px;">{VOICE.practice.skip}</button>
            </div>
        </Overlay>
      )}
    </section>
  )
}
