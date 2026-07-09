/**
 * The course, as pure data (SR-CRS-01): units, lessons, steps, songs.
 * Adding content means editing this file, never engine code.
 *
 * Step kinds (v1): 'info' (read + continue) and 'play' (targets verified by ear).
 * Every played note carries its finger number — mandatory, not optional (SR-CRS-05).
 * 'match' on a play step: 'exact' (default; octave slips get a gentle hint) or
 * 'pitch-class' (any octave counts — used before middle C is taught).
 * Song lessons are play-alongs: 'notes' in sequence, pitch-class matching (SR-CRS-03).
 */

const n = (note, finger, beats) => beats ? { note, finger, beats } : { note, finger }

export const COURSE = {
  units: [
    {
      id: 'u1',
      title: 'Sitting at the Piano',
      tag: 'UNIT 1',
      lessons: [
        {
          id: 'meet-the-keyboard',
          title: 'Meet the keyboard',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Look at the black keys — they come in little groups of two and three, all the way up the piano.',
              sub: 'Those groups are the map. Everything has an address here.'
            },
            {
              kind: 'play',
              match: 'pitch-class',
              prompt: 'Just to the left of any group of two black keys lives a C. Play one.',
              sub: 'Any C on the whole piano counts.',
              targets: [n('C4', 1)]
            },
            {
              kind: 'play',
              match: 'pitch-class',
              prompt: 'Now knock on that C twice — hello, piano.',
              sub: 'Two gentle taps, one after the other.',
              targets: [n('C4', 1), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Meet the keyboard — done.',
            line: 'Groups of two, groups of three, and a C beside every pair. The map makes sense now.'
          },
          recap: {
            summary: 'Today the keyboard became a map — groups of two and three, and a C beside every pair.',
            seed: 'Next time we find the C that lives in the very middle.'
          }
        },
        {
          id: 'finding-middle-c',
          title: 'Finding middle C',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Sit tall in the middle of the piano, and let your shoulders be soft.',
              sub: 'Comfort first — a relaxed body makes a warm sound.'
            },
            {
              kind: 'info',
              prompt: 'Curve your fingers gently, as if you were holding a small bubble.',
              sub: 'Round and easy, never squeezed.'
            },
            {
              kind: 'play',
              prompt: 'The C nearest the middle of the piano is middle C — the home note. Play it.',
              sub: 'It’s marked on the keyboard below, right under your nose.',
              targets: [n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Play middle C three times, slow and even.',
              sub: 'Like slow footsteps — let each one ring.',
              targets: [n('C4', 1), n('C4', 1), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Finding middle C — done.',
            line: 'Middle C is home now. You can find it from anywhere.'
          },
          recap: {
            summary: 'Today you found middle C — the home note — and gave it three steady knocks.',
            seed: 'Next time your fingers get their numbers.'
          }
        },
        {
          id: 'hands-say-hello',
          title: 'Hands say hello',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Right hand up. Wiggle your thumb — that’s finger 1. Count outward to your pinky, finger 5.',
              sub: 'Every note you meet from now on shows its finger number.'
            },
            {
              kind: 'play',
              prompt: 'Rest your right thumb — finger 1 — on middle C, and play it.',
              sub: 'A gentle landing, like the thumb belongs there.',
              targets: [n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Now finger 2, your pointer, on the very same C. Play it once.',
              sub: 'Same note, new finger — it should sound just as friendly.',
              targets: [n('C4', 2)]
            },
            {
              kind: 'play',
              prompt: 'And finger 3 — tall finger, gentle sound.',
              sub: 'Three fingers, one home note.',
              targets: [n('C4', 3)]
            }
          ],
          done: {
            title: 'That’s Hands say hello — done.',
            line: 'Three fingers said hello to C, and C said hello right back.'
          },
          recap: {
            summary: 'Today three fingers said hello to middle C — thumb, pointer, and tall finger.',
            seed: 'Next time C starts to sing — soft and loud.'
          }
        }
      ]
    },
    {
      id: 'u2',
      title: 'First Notes',
      tag: 'UNIT 2',
      lessons: [
        {
          id: 'middle-c-again',
          title: 'Middle C, again',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              prompt: 'Middle C, finger 1. Play it once and listen until the sound fades all the way to nothing.',
              sub: 'That long fade is the piano singing.',
              targets: [n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Play it softly, like a secret. Then once more, a little braver.',
              sub: 'Same key, two moods.',
              targets: [n('C4', 1), n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Three steady Cs, like slow footsteps.',
              sub: 'Even and calm — no rush at all.',
              targets: [n('C4', 1), n('C4', 1), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Middle C, again — done.',
            line: 'C has a singing tone now — soft, brave, and steady.'
          },
          recap: {
            summary: 'Today middle C sang — soft as a secret, brave as a hello.',
            seed: 'Next time C meets its neighbour, D.'
          }
        },
        {
          id: 'meet-d',
          title: 'Meet D',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              prompt: 'This is D — it lives snug between the two black keys, just right of middle C. Finger 2. Play it.',
              sub: 'Middle C is marked below if you need the landmark.',
              targets: [n('D4', 2)]
            },
            {
              kind: 'ear-choice',
              prompt: 'Close your eyes. I’ll play two notes — was the second one higher or lower?',
              sub: 'Ears first. No looking needed.',
              play: [n('C4', 1), n('D4', 2)],
              choices: [{ label: 'Higher', correct: true }, { label: 'Lower', correct: false }]
            },
            {
              kind: 'play',
              prompt: 'Step up the stairs: C, then D.',
              sub: 'Fingers 1 and 2, one step each.',
              targets: [n('C4', 1), n('D4', 2)]
            },
            {
              kind: 'play',
              prompt: 'And back down: D, then C.',
              sub: 'Gently — like stepping downstairs.',
              targets: [n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'One little round trip: C, D, and home to C.',
              sub: 'Up a step, down a step.',
              targets: [n('C4', 1), n('D4', 2), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Meet D — done.',
            line: 'C has a neighbour now, and your fingers know the way between them.'
          },
          recap: {
            summary: 'Today you met D and walked the first little stairs — C to D and back.',
            seed: 'Next time the hill grows a step taller. E is waiting.'
          }
        },
        {
          id: 'meet-e',
          title: 'Meet E',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              prompt: 'This is E — it lives just to the right of D.',
              sub: 'Find it on your piano and play it once, whenever you’re ready.',
              targets: [n('E4', 3)]
            },
            {
              kind: 'play',
              prompt: 'Lovely. Now play E three times, slow and steady.',
              sub: 'No rush — let each note ring before the next one.',
              targets: [n('E4', 3), n('E4', 3), n('E4', 3)]
            },
            {
              kind: 'play',
              prompt: 'Walk up the little hill: C, then D, then E.',
              sub: 'Fingers 1, 2, 3. Middle C is marked on the keyboard.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
            },
            {
              kind: 'play',
              prompt: 'And back down again: E, D, C.',
              sub: 'Gently does it — like stepping downstairs.',
              targets: [n('E4', 3), n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'ear-echo',
              prompt: 'Copy me: I’ll play three notes, and you play them back.',
              sub: 'Close your eyes if you like — your ears know these now.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
            }
          ],
          done: {
            title: 'That’s Meet E — done.',
            line: 'C, D and E — up the little hill and back down. You played every step, and it sounded lovely.',
            nextSongId: 'ode-to-joy'
          },
          recap: {
            summary: 'Today you met E — up the little hill and back down, every step true.',
            seed: 'Next time, a song is waiting for those notes.'
          }
        },
        {
          id: 'meet-f-and-g',
          title: 'Meet F and G',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              prompt: 'This is F — one more step to the right. Finger 4.',
              sub: 'Your ring finger’s note.',
              targets: [n('F4', 4)]
            },
            {
              kind: 'play',
              prompt: 'And this is G — finger 5. Your pinky gets a note of its own.',
              sub: 'Small finger, proud sound.',
              targets: [n('G4', 5)]
            },
            {
              kind: 'ear-choice',
              prompt: 'Ears again: two notes — was the second one higher or lower?',
              sub: 'Trust the first feeling.',
              play: [n('G4', 5), n('F4', 4)],
              choices: [{ label: 'Higher', correct: false }, { label: 'Lower', correct: true }]
            },
            {
              kind: 'play',
              prompt: 'The whole five-finger walk, thumb to pinky: C, D, E, F, G.',
              sub: 'One finger per key — the hand barely has to move.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
            },
            {
              kind: 'play',
              prompt: 'And all the way back home: G, F, E, D, C.',
              sub: 'Downhill is easier — let it roll gently.',
              targets: [n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Meet F and G — done.',
            line: 'Five notes, five fingers — the whole neighbourhood, and you know everyone’s name.'
          },
          recap: {
            summary: 'Today you met F and G — five fingers, five notes, the whole neighbourhood.',
            seed: 'Next time those five notes turn into Ode to Joy.'
          }
        }
      ]
    },
    {
      id: 'u3',
      title: 'First Songs',
      tag: 'UNIT 3',
      lessons: [
        {
          id: 'ode-to-joy',
          title: 'Ode to Joy — first phrase',
          kind: 'song',
          sneakPeek: true,
          card: 'The famous first phrase — five notes you already know, C up to G.',
          notes: [
            n('E4', 3), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5),
            n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1), n('C4', 1),
            n('D4', 2), n('E4', 3), n('E4', 3), n('D4', 2), n('D4', 2)
          ],
          // "Play with me" voicings by note index (SR-OUT-03) — sparse, soft, beneath
          harmony: { 0: ['C3', 'G3'], 4: ['G3', 'B3'], 8: ['C3', 'G3'], 12: ['C3', 'G3'] },
          done: {
            title: 'You played Ode to Joy.',
            line: 'The whole first phrase, start to finish. That deserves a small bow.'
          },
          recap: {
            summary: 'Today you played Ode to Joy — a real piece of music, start to finish.',
            seed: 'Next time a boat sets off from G: Lightly Row.'
          }
        },
        {
          id: 'lightly-row',
          title: 'Lightly Row',
          kind: 'song',
          card: 'A boat song that starts up on G — your first tune that doesn’t begin on C.',
          notes: [
            n('G4', 5), n('E4', 3), n('E4', 3), n('F4', 4), n('D4', 2), n('D4', 2),
            n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('G4', 5)
          ],
          harmony: { 0: ['C3', 'G3'], 3: ['G3', 'B3'], 6: ['C3', 'G3'], 10: ['C3', 'G3'] },
          done: {
            title: 'You played Lightly Row.',
            line: 'Starting away from home and finding your way back — that’s real sailing.'
          },
          recap: {
            summary: 'Today you sailed Lightly Row — starting away from home and finding your way back.',
            seed: 'Next time: moonlight, and long patient notes.'
          }
        },
        {
          id: 'au-clair-de-la-lune',
          title: 'Au clair de la lune',
          kind: 'song',
          card: 'A quiet French melody — long, patient notes in the moonlight.',
          notes: [
            n('C4', 1), n('C4', 1), n('C4', 1), n('D4', 2), n('E4', 3), n('D4', 2),
            n('C4', 1), n('E4', 3), n('D4', 2), n('D4', 2), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 6: ['C3', 'G3'], 8: ['G3', 'B3'], 10: ['C3', 'G3'] },
          done: {
            title: 'You played Au clair de la lune.',
            line: 'Patient, moonlit playing — the long notes got their full breath.'
          },
          recap: {
            summary: 'Today you played Au clair de la lune, calm as moonlight.',
            seed: 'Next time the metronome starts ticking — rhythm joins in.'
          }
        }
      ]
    },
    {
      id: 'u4',
      title: 'Rhythm Joins In',
      tag: 'UNIT 4',
      lessons: [
        {
          id: 'long-and-short',
          title: 'Long notes and short notes',
          kind: 'drill',
          tempo: 60,
          steps: [
            {
              kind: 'info',
              prompt: 'Music walks, and music breathes. Some notes are quick steps, some take a long, slow breath.',
              sub: 'Underneath them all, the pulse ticks on — steady as a clock. Listen to it.'
            },
            {
              kind: 'rhythm-clap',
              prompt: 'Clap with the pulse — four steady claps, like footsteps.',
              sub: 'I’ll clap it first. Then it’s your turn.',
              pattern: [1, 1, 1]
            },
            {
              kind: 'rhythm-clap',
              prompt: 'Now long notes: three claps, with a whole quiet beat inside each gap.',
              sub: 'Count a silent “two” between claps — the rest belongs to the note.',
              pattern: [2, 2]
            },
            {
              kind: 'rhythm-clap',
              prompt: 'Short, short, looong. Clap this little rhythm.',
              sub: 'Two quick footsteps and one slow breath.',
              pattern: [1, 1, 2]
            },
            {
              kind: 'play',
              timed: true,
              prompt: 'Now the piano joins in: middle C, four times, right with the pulse.',
              sub: 'Finger 1, steady as the tick.',
              targets: [n('C4', 1), n('C4', 1), n('C4', 1), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Long notes and short notes — done.',
            line: 'Quick steps, slow breaths, and a pulse that never hurried you once.'
          },
          recap: {
            summary: 'Today rhythm arrived — short claps, long claps, and notes that walk with the pulse.',
            seed: 'Next time your five-finger hill learns to keep time.'
          }
        },
        {
          id: 'playing-with-the-pulse',
          title: 'Playing with the pulse',
          kind: 'drill',
          tempo: 60,
          steps: [
            {
              kind: 'info',
              prompt: 'The metronome is a little clock that loves company. It never rushes and it never drags.',
              sub: 'Play with it, not against it — let it carry you.'
            },
            {
              kind: 'play',
              timed: true,
              prompt: 'Walk up the five-finger hill in time — one note on every tick.',
              sub: 'C, D, E, F, G. Let the pulse set the pace.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
            },
            {
              kind: 'play',
              timed: true,
              prompt: 'And back down, still with the pulse.',
              sub: 'Downhill loves to rush — don’t let it.',
              targets: [n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'play',
              timed: true,
              prompt: 'Now skips: C, E, G, and back down — one tick each.',
              sub: 'Fingers 1, 3, 5, 3, 1. Skipping, still steady.',
              targets: [n('C4', 1), n('E4', 3), n('G4', 5), n('E4', 3), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Playing with the pulse — done.',
            line: 'Up, down, and skipping — and the little clock never lost you.'
          },
          recap: {
            summary: 'Today you played with the pulse — steps and skips, right on the tick.',
            seed: 'Next time Ode to Joy learns to keep time too.'
          }
        },
        {
          id: 'ode-in-time',
          title: 'Ode to Joy — in time',
          kind: 'song',
          tempo: 60,
          card: 'The phrase you know by heart — now with the pulse ticking underneath.',
          notes: [
            n('E4', 3, 1), n('E4', 3, 1), n('F4', 4, 1), n('G4', 5, 1), n('G4', 5, 1),
            n('F4', 4, 1), n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 1), n('C4', 1, 1),
            n('D4', 2, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1), n('D4', 2, 2)
          ],
          harmony: { 0: ['C3', 'G3'], 4: ['G3', 'B3'], 8: ['C3', 'G3'], 12: ['C3', 'G3'] },
          done: {
            title: 'You played Ode to Joy — in time.',
            line: 'The same fifteen notes, now walking together with the pulse.'
          },
          recap: {
            summary: 'Today Ode to Joy found its pulse — every note in step.',
            seed: 'Next time: a steady little piece about buns.'
          }
        },
        {
          id: 'hot-cross-buns',
          title: 'Hot Cross Buns, steady',
          kind: 'song',
          tempo: 60,
          card: 'Three notes, one honest rhythm — played fully in time.',
          notes: [
            n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 2),
            n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 2),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('C4', 1, 0.5), n('C4', 1, 0.5),
            n('D4', 2, 0.5), n('D4', 2, 0.5), n('D4', 2, 0.5), n('D4', 2, 0.5),
            n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 2)
          ],
          harmony: { 0: ['C3', 'G3'], 3: ['G3', 'B3'], 6: ['C3', 'G3'], 10: ['G3', 'B3'], 14: ['C3', 'G3'] },
          done: {
            title: 'You played Hot Cross Buns, steady.',
            line: 'Long notes, quick notes, and not one of them rushed. A baker would be proud.'
          },
          recap: {
            summary: 'Today Hot Cross Buns came out of the oven perfectly steady.',
            seed: 'Next time the hand stretches — two brand-new notes are waiting.'
          }
        }
      ]
    },
    {
      id: 'u5',
      title: 'More Notes, New Places',
      tag: 'UNIT 5',
      lessons: [
        {
          id: 'meet-a-and-b',
          title: 'Meet A and B',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              prompt: 'One step past G lives A. Let your pinky lean over and reach it — finger 5.',
              sub: 'The hand stays home; only the pinky stretches.',
              targets: [n('A4', 5)]
            },
            {
              kind: 'watch-me',
              prompt: 'Watch how the hand leans, so the pinky can reach without jumping.',
              sub: 'The wrist tips gently to the right — no leap, just a lean.',
              anim: { keys: ['F4', 'G4', 'A4'], fingers: [4, 5, 5], hand: 'right' }
            },
            {
              kind: 'play',
              prompt: 'One more lean: past A lives B, the last stop before high C.',
              sub: 'Pinky again — brave and light.',
              targets: [n('B4', 5)]
            },
            {
              kind: 'ear-choice',
              prompt: 'Two new friends. Close your eyes — was the second note higher or lower?',
              sub: 'Trust the first feeling.',
              play: [n('B4', 5), n('A4', 5)],
              choices: [{ label: 'Higher', correct: false }, { label: 'Lower', correct: true }]
            },
            {
              kind: 'play',
              prompt: 'From A, walk all the way home to C.',
              sub: 'Six steps down — feel the hand settle back into place.',
              targets: [n('A4', 5), n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1)]
            }
          ],
          done: {
            title: 'That’s Meet A and B — done.',
            line: 'The neighbourhood grew by two houses, and your pinky knows both doors.'
          },
          recap: {
            summary: 'Today the pinky stretched to A and B — the neighbourhood grew.',
            seed: 'Next time you climb all the way to high C.'
          }
        },
        {
          id: 'up-to-high-c',
          title: 'Up to high C',
          kind: 'drill',
          steps: [
            {
              kind: 'play',
              match: 'pitch-class',
              prompt: 'At the top of the ladder sits high C — the same letter as home, singing higher. Find it and play it.',
              sub: 'It lives beside the next group of two black keys, one octave up.',
              targets: [n('C5', 5)]
            },
            {
              kind: 'ear-choice',
              prompt: 'Same name, different height. I’ll play both Cs — was the second one higher or lower?',
              sub: 'Two ends of the same ladder.',
              play: [n('C4', 1), n('C5', 5)],
              choices: [{ label: 'Higher', correct: true }, { label: 'Lower', correct: false }]
            },
            {
              kind: 'watch-me',
              prompt: 'Eight keys is more than five fingers — watch the thumb tuck under after E.',
              sub: 'Fingers 1, 2, 3… thumb slips under… then 1, 2, 3, 4, 5.',
              anim: { keys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], fingers: [1, 2, 3, 1, 2, 3, 4, 5], hand: 'right' }
            },
            {
              kind: 'play',
              prompt: 'Climb the whole octave: C to high C, thumb tucking under after E.',
              sub: 'Slow is perfect. Let the thumb travel quietly.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 1), n('G4', 2), n('A4', 3), n('B4', 4), n('C5', 5)]
            },
            {
              kind: 'play',
              prompt: 'And step back down the ladder, fingers crossing gently over.',
              sub: 'Same road home, one rung at a time.',
              targets: [n('C5', 5), n('B4', 4), n('A4', 3), n('G4', 2), n('F4', 1), n('E4', 3), n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'reading-snippet',
              pool: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)],
              len: 4
            }
          ],
          done: {
            title: 'That’s Up to high C — done.',
            line: 'A whole octave under one hand — the ladder is yours, top to bottom.'
          },
          recap: {
            summary: 'Today you climbed the whole octave, thumb tucking under like a pro.',
            seed: 'Next time the saints come marching through those keys.'
          }
        },
        {
          id: 'when-the-saints',
          title: 'When the Saints Go Marching In',
          kind: 'song',
          card: 'A marching tune that climbs the same four steps, three times — then lands home.',
          notes: [
            n('C4', 1), n('E4', 3), n('F4', 4), n('G4', 5),
            n('C4', 1), n('E4', 3), n('F4', 4), n('G4', 5),
            n('C4', 1), n('E4', 3), n('F4', 4), n('G4', 5),
            n('E4', 3), n('C4', 1), n('E4', 3), n('D4', 2)
          ],
          harmony: { 0: ['C3', 'G3'], 4: ['C3', 'G3'], 8: ['F3', 'A3'], 12: ['C3', 'G3'], 15: ['G3', 'B3'] },
          done: {
            title: 'You played When the Saints.',
            line: 'Three climbs and a landing — that’s a real march, and you led it.'
          },
          recap: {
            summary: 'Today the saints marched in, four steps at a time.',
            seed: 'Next time: Twinkle, with your new note A shining in the middle.'
          }
        },
        {
          id: 'twinkle',
          title: 'Twinkle, Twinkle',
          kind: 'song',
          card: 'The whole song, corner to corner — with your pinky’s new note A at the very top.',
          notes: [
            n('C4', 1), n('C4', 1), n('G4', 5), n('G4', 5), n('A4', 5), n('A4', 5), n('G4', 5),
            n('F4', 4), n('F4', 4), n('E4', 3), n('E4', 3), n('D4', 2), n('D4', 2), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 4: ['F3', 'C4'], 7: ['F3', 'A3'], 9: ['C3', 'G3'], 11: ['G3', 'B3'], 13: ['C3', 'G3'] },
          done: {
            title: 'You played Twinkle, Twinkle.',
            line: 'The most famous tune in the sky, start to finish, under your own fingers.'
          },
          recap: {
            summary: 'Today Twinkle twinkled — the whole song, with A shining at the top.',
            seed: 'Next time your left hand finally gets to say hello.'
          }
        }
      ]
    },
    {
      id: 'u6',
      title: 'Both Hands Say Hello',
      tag: 'UNIT 6',
      lessons: [
        {
          id: 'left-hand-home',
          title: 'The left hand’s home',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Now the left hand gets a home of its own — the same five letters, one octave lower, where the piano’s voice is deep.',
              sub: 'Left pinky on the C below middle C. The numbers mirror: pinky is 5, thumb is 1.'
            },
            {
              kind: 'watch-me',
              prompt: 'Watch: the left pinky rests on low C, and the fingers count backwards.',
              sub: '5, 4, 3 — walking up, the numbers walk down.',
              anim: { keys: ['C3', 'D3', 'E3'], fingers: [5, 4, 3], hand: 'left' }
            },
            {
              kind: 'play',
              prompt: 'Left pinky — finger 5 — on the deep C. Play it and hear how low it sings.',
              sub: 'It’s the C one octave below the marked middle C.',
              targets: [n('C3', 5)]
            },
            {
              kind: 'play',
              prompt: 'Walk up three steps: C, D, E — fingers 5, 4, 3.',
              sub: 'Slow and deep, like footsteps in a big room.',
              targets: [n('C3', 5), n('D3', 4), n('E3', 3)]
            },
            {
              kind: 'play',
              prompt: 'The whole left-hand walk: C up to G, pinky to thumb.',
              sub: '5, 4, 3, 2, 1 — the mirror of everything you know.',
              targets: [n('C3', 5), n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1)]
            },
            {
              kind: 'play',
              prompt: 'And back down to the deep C.',
              sub: 'Thumb to pinky, gently downhill.',
              targets: [n('G3', 1), n('F3', 2), n('E3', 3), n('D3', 4), n('C3', 5)]
            }
          ],
          done: {
            title: 'That’s The left hand’s home — done.',
            line: 'Two hands, two homes, one piano. The left one sings deeper, that’s all.'
          },
          recap: {
            summary: 'Today the left hand found its home — five deep notes, fingers mirrored.',
            seed: 'Next time the hands start taking turns.'
          }
        },
        {
          id: 'taking-turns',
          title: 'Taking turns',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Two hands, one tune — they take turns, like a conversation.',
              sub: 'One hand speaks while the other listens. Nobody interrupts.'
            },
            {
              kind: 'play',
              prompt: 'The right hand asks: C, D, E.',
              sub: 'Fingers 1, 2, 3, up the little hill.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
            },
            {
              kind: 'play',
              prompt: 'And the left hand answers, down low: E, D, C.',
              sub: 'Fingers 3, 4, 5, stepping down to the deep C.',
              targets: [n('E3', 3), n('D3', 4), n('C3', 5)]
            },
            {
              kind: 'play',
              prompt: 'Right hand walks the whole hill up…',
              sub: 'C to G, one finger each.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
            },
            {
              kind: 'play',
              prompt: '…and the left hand walks its hill back down.',
              sub: 'G to deep C — thumb first this time.',
              targets: [n('G3', 1), n('F3', 2), n('E3', 3), n('D3', 4), n('C3', 5)]
            },
            {
              kind: 'reading-snippet',
              pool: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)],
              len: 4
            }
          ],
          done: {
            title: 'That’s Taking turns — done.',
            line: 'A whole conversation in music — question, answer, and not one interruption.'
          },
          recap: {
            summary: 'Today your hands took turns — a question up high, an answer down low.',
            seed: 'One day soon: three notes at once. Your first chord is being tuned.'
          }
        },
        {
          id: 'your-first-chord',
          title: 'Your first chord',
          kind: 'drill',
          comingSoon: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Three notes at once — C, E and G under one hand, sounding together.',
              sub: 'Arietta is still learning to hear three notes at the same time. This lesson opens when she can.'
            }
          ],
          done: {
            title: 'Your first chord.',
            line: 'Coming a little later — when my ears learn to hear three notes at once.'
          },
          recap: {
            summary: 'Your first chord is still on its way.',
            seed: 'It opens when Arietta’s ears learn to hear three notes at once.'
          }
        }
      ]
    }
  ]
}

/** Home-screen teaser for what comes after v1 (REQUIREMENTS §9.4, PLAN Phase 6). */
export const COMING_SOON = {
  tag: 'COURSE 2',
  title: 'Year One continues',
  lessons: ['Reading the Map', 'The Left Hand Speaks', 'Hands Together', 'First Chords & Recital Day']
}

/**
 * Notes a student can read cold once the first songs are learned — the
 * C-position hand, fingers on home keys (feeds SR-CRS-11 snippets).
 */
export const READING_POOL = [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]

/** Flat list of lessons in course order (linear unlocking walks this). */
export function allLessons(course = COURSE) {
  return course.units.flatMap(u => u.lessons.map(l => ({ ...l, unitId: u.id, unitTag: u.tag, unitTitle: u.title })))
}

export function findLesson(id, course = COURSE) {
  return allLessons(course).find(l => l.id === id) ?? null
}
