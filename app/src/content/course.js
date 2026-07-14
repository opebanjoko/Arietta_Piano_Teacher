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
// chord entry (SR-AUD-10): notes sound together; members match exact midi
const c = (notes, fingers, beats) => beats ? { notes, fingers, beats } : { notes, fingers }

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
            seed: 'Next time your shoes make music: bàtà mi a dún kò kò kà.'
          }
        },
        {
          id: 'bata-mi',
          title: 'Bàtà mi a dún kòkòkà',
          kind: 'song',
          tempo: 72,
          card: 'The school-shoes song — ko ko ka! Every step lands right on the pulse.',
          notes: [
            // Bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('E4', 3, 2),
            // Bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('E4', 3, 2),
            // tí m bá kà-wé mi
            n('G4', 5, 1), n('G4', 5, 1), n('F4', 4, 1), n('F4', 4, 1), n('E4', 3, 1), n('E4', 3, 1),
            // bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('C4', 1, 2)
          ],
          harmony: { 0: ['C3', 'G3'], 7: ['C3', 'G3'], 14: ['G3', 'B3'], 20: ['C3', 'G3'] },
          done: {
            title: 'You played Bàtà mi a dún kòkòkà.',
            line: 'Ko ko ka, right in time — those shoes have never sounded smarter.'
          },
          recap: {
            summary: 'Today your shoes made music — Bàtà mi, steady with the pulse.',
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
            seed: 'Next time your new high C leads a song from home — under the orange tree.'
          }
        },
        {
          id: 'labe-igi-orombo',
          title: 'L’ábẹ́ igi ọ́rọ́mbọ́',
          kind: 'song',
          card: 'Under the orange tree — a song from home. It climbs your whole new octave, refrain and all.',
          notes: [
            // L'á-bẹ́ i-gi (♪ from the Beth's Notes notation, family-auditioned)
            n('C4', 1), n('C4', 1), n('E4', 3), n('G4', 5),
            // ọ́-rọ́m-bọ́
            n('E4', 3), n('D4', 2), n('C4', 1),
            // ní-bẹ̀ la gbé
            n('C4', 1), n('C4', 1), n('E4', 3), n('G4', 5),
            // ń ṣe-ré wa
            n('F4', 4), n('E4', 3), n('D4', 2),
            // i-nú wa dùn,
            n('C5', 5), n('C5', 5), n('C5', 5), n('G4', 5),
            // a-ra wa yá
            n('A4', 5), n('A4', 5), n('A4', 5), n('G4', 5),
            // l'á-bẹ́ i-gi
            n('C4', 1), n('C4', 1), n('E4', 3), n('G4', 5),
            // ọ́-rọ́m-bọ́
            n('E4', 3), n('D4', 2), n('C4', 1),
            // ọ́-rọ́m-bọ́, ọ́-rọ́m-bọ́,
            n('E4', 3), n('D4', 2), n('C4', 1), n('G4', 5), n('E4', 3), n('G4', 5),
            // ọ́-rọ́m-bọ́, ọ́-rọ́m-bọ́,
            n('E4', 3), n('D4', 2), n('C4', 1), n('G4', 5), n('E4', 3), n('G4', 5),
            // ọ́-rọ́m-bọ́
            n('E4', 3), n('D4', 2), n('C4', 1)
          ],
          harmony: {
            0: ['C3', 'G3'], 7: ['C3', 'G3'], 11: ['G3', 'B3'], 14: ['C3', 'G3'],
            18: ['F3', 'A3'], 22: ['C3', 'G3'], 26: ['G3', 'B3'],
            29: ['C3', 'G3'], 35: ['C3', 'G3'], 41: ['C3', 'G3']
          },
          done: {
            title: 'You played L’ábẹ́ igi ọ́rọ́mbọ́.',
            line: 'Under the orange tree, start to finish — a song from home under your own fingers.'
          },
          recap: {
            summary: 'Today you played L’ábẹ́ igi ọ́rọ́mbọ́ — the orange-tree song, refrain and all.',
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
            seed: 'Next time: Ìṣẹ́ Olúwa — a song from home that flows like water.'
          }
        },
        {
          id: 'ise-oluwa',
          title: 'Ìṣẹ́ Olúwa',
          kind: 'song',
          card: 'The work of the Lord cannot be destroyed — a flowing song from home, patient and sure, reaching up to your new note A.',
          notes: [
            // Ì-ṣẹ́ O-lú-wa
            n('E4', 3), n('G4', 5), n('G4', 5), n('A4', 5), n('G4', 5),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('C4', 1),
            // Ì-ṣẹ́ O-lú-wa
            n('E4', 3), n('G4', 5), n('G4', 5), n('A4', 5), n('G4', 5),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('C4', 1),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('G4', 5), n('E4', 3), n('D4', 2), n('C4', 1),
            // kò lè bà-jẹ́ o
            n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 5: ['F3', 'A3'], 10: ['C3', 'G3'], 15: ['F3', 'A3'], 20: ['G3', 'B3'], 25: ['C3', 'G3'] },
          done: {
            title: 'You played Ìṣẹ́ Olúwa.',
            line: 'Kò lè bàjẹ́ — sung by your hands now, patient and true.'
          },
          recap: {
            summary: 'Today you played Ìṣẹ́ Olúwa — flowing, patient, unbreakable.',
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
          poly: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Three notes at once — C, E and G under one hand, sounding together.',
              sub: 'One sound made of three. It has a name — the C chord — and your hand already knows the shape.'
            },
            {
              kind: 'watch-me',
              prompt: 'Watch: thumb, middle and little finger land together.',
              sub: 'Fingers 1, 3 and 5 rest on C, E and G — then press as one.',
              anim: { keys: ['C4', 'E4', 'G4'], fingers: [1, 3, 5], hand: 'right', together: true }
            },
            {
              kind: 'play',
              prompt: 'Start with two: C and E together.',
              sub: 'Thumb on C, middle finger on E. Let them sound at the same moment.',
              targets: [c(['C4', 'E4'], [1, 3])]
            },
            {
              kind: 'play',
              prompt: 'Now the top pair: E and G.',
              sub: 'Middle finger keeps E; the little finger takes G.',
              targets: [c(['E4', 'G4'], [3, 5])]
            },
            {
              kind: 'play',
              prompt: 'All three — roll it gently, bottom to top.',
              sub: 'C, then E, then G — let each one keep ringing until they blend.',
              targets: [c(['C4', 'E4', 'G4'], [1, 3, 5])]
            },
            {
              kind: 'play',
              prompt: 'Once more — and this time, land it as one.',
              sub: 'Three fingers, one motion, one sound.',
              targets: [c(['C4', 'E4', 'G4'], [1, 3, 5])]
            }
          ],
          done: {
            title: 'Your first chord.',
            line: 'Three notes, one sound — and your hand made it. Chords are where songs get their warmth.'
          },
          recap: {
            summary: 'You played the C chord — C, E and G, together.',
            seed: 'Next time the hands hold a little conversation: Tòlótòló.'
          }
        },
        {
          id: 'tolotolo',
          title: 'Tòlótòló',
          kind: 'song',
          low: true,
          card: 'The turkey song — the right hand calls, the left hand answers, just like taking turns.',
          notes: [
            // call (right hand): Tò-ló-tò-ló ì-wo ló j'ẹ-ran
            n('G4', 5), n('E4', 3), n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1),
            // answer (left hand, an octave below)
            n('G3', 1), n('E3', 3), n('G3', 1), n('E3', 3), n('D3', 4), n('E3', 3), n('D3', 4), n('C3', 5),
            // short call
            n('E4', 3), n('E4', 3), n('D4', 2), n('C4', 1),
            // short answer
            n('E3', 3), n('E3', 3), n('D3', 4), n('C3', 5)
          ],
          harmony: { 0: ['C3', 'G3'], 8: ['C3', 'G3'], 16: ['G3', 'B3'], 20: ['C3', 'G3'] },
          done: {
            title: 'You played Tòlótòló.',
            line: 'Call and answer, both hands in the conversation — the turkey has nothing on you.'
          },
          recap: {
            summary: 'Today Tòlótòló strutted in — one hand calling, the other answering.',
            seed: 'Course 2 is open now: new maps to read, and the left hand finds its voice.'
          }
        }
      ]
    },
    {
      id: 'u7',
      title: 'Reading the Map',
      tag: 'UNIT 7',
      lessons: [
        {
          id: 'notes-cold',
          title: 'Notes without training wheels',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'The letter labels are coming off today — you don’t need them anymore.',
              sub: 'The staff is the map now. Line, space, line — your eyes already know the way.'
            },
            {
              kind: 'play',
              prompt: 'Read and play: the five home notes, no labels anywhere.',
              sub: 'C sits on its little ledger line. Count up from there.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
            },
            {
              kind: 'play',
              prompt: 'Now out of order — trust the staff, not your habit.',
              sub: 'Higher on the map means higher on the keys. That’s the whole secret.',
              targets: [n('E4', 3), n('C4', 1), n('G4', 5), n('D4', 2), n('F4', 4)]
            },
            {
              kind: 'reading-snippet',
              pool: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)],
              len: 4
            },
            {
              kind: 'reading-snippet',
              pool: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)],
              len: 5
            }
          ],
          done: {
            title: 'You read music cold.',
            line: 'No labels, no help — just you and the map. That’s real reading.'
          },
          recap: {
            summary: 'Today the training wheels came off — you read C to G with bare notes.',
            seed: 'Next time: the difference between a step and a skip.'
          }
        },
        {
          id: 'steps-and-skips',
          title: 'Steps and skips',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Notes move two ways: a step to the very next key, or a skip over one.',
              sub: 'On the staff: line-to-space is a step; line-to-line jumps a space — that’s a skip.'
            },
            {
              kind: 'play',
              prompt: 'Play a walk of steps: neighbour to neighbour and back.',
              sub: 'C, D, E, D, C — no key left out.',
              targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Now skips: leap over a key each time.',
              sub: 'C, E, G, E, C — the middle keys just watch.',
              targets: [n('C4', 1), n('E4', 3), n('G4', 5), n('E4', 3), n('C4', 1)]
            },
            {
              kind: 'ear-choice',
              prompt: 'Close your eyes — is this a step or a skip?',
              sub: 'Steps sound like walking; skips sound like hopping.',
              play: [n('C4', 1), n('E4', 3)],
              choices: [{ label: 'A step', correct: false }, { label: 'A skip', correct: true }]
            },
            {
              kind: 'reading-snippet',
              pool: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)],
              len: 4
            }
          ],
          done: {
            title: 'Steps and skips — sorted.',
            line: 'Walking and hopping — every melody ever written is made of those two moves.'
          },
          recap: {
            summary: 'Today you learned the two ways notes travel: steps and skips.',
            seed: 'Next time your hand packs up and moves to a brand-new home: G position.'
          }
        },
        {
          id: 'meet-g-position',
          title: 'Meet G position',
          kind: 'drill',
          high: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Your hand can move house. Slide it up so the thumb lives on G.',
              sub: 'Same five fingers, same shapes — a new neighbourhood called G position.'
            },
            {
              kind: 'watch-me',
              prompt: 'Watch: thumb on G, one finger per key up to D.',
              sub: 'G, A, B, C, D — the hill you know, four keys higher.',
              anim: { keys: ['G4', 'A4', 'B4', 'C5', 'D5'], fingers: [1, 2, 3, 4, 5], hand: 'right' }
            },
            {
              kind: 'play',
              prompt: 'Climb the new hill: G up to D.',
              sub: 'Fingers 1, 2, 3, 4, 5 — just like home, only brighter.',
              targets: [n('G4', 1), n('A4', 2), n('B4', 3), n('C5', 4), n('D5', 5)]
            },
            {
              kind: 'play',
              prompt: 'And back down to G.',
              sub: 'Pinky to thumb, gently downhill.',
              targets: [n('D5', 5), n('C5', 4), n('B4', 3), n('A4', 2), n('G4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Now mix it up — skips in the new neighbourhood.',
              sub: 'G, B, D, B, G — hopping over the in-between keys.',
              targets: [n('G4', 1), n('B4', 3), n('D5', 5), n('B4', 3), n('G4', 1)]
            }
          ],
          done: {
            title: 'G position is yours.',
            line: 'Your hand has two homes now — and every song just got twice as many places to live.'
          },
          recap: {
            summary: 'Today your hand moved house: thumb on G, pinky on D.',
            seed: 'Next time, Ode to Joy comes back — the whole theme, read from the staff.'
          }
        },
        {
          id: 'ode-whole-theme',
          title: 'Ode to Joy — the whole theme',
          kind: 'song',
          card: 'Both phrases this time, read from a clean score — the tune that started everything.',
          notes: [
            n('E4', 3), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2),
            n('C4', 1), n('C4', 1), n('D4', 2), n('E4', 3), n('E4', 3), n('D4', 2), n('D4', 2),
            n('E4', 3), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2),
            n('C4', 1), n('C4', 1), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 8: ['C3', 'G3'], 13: ['G3', 'B3'], 15: ['C3', 'G3'], 23: ['C3', 'G3'], 27: ['G3', 'B3'], 29: ['C3', 'G3'] },
          done: {
            title: 'The whole theme. All of it.',
            line: 'You met this tune with three notes and labels. Today you read it, both phrases, bare.'
          },
          recap: {
            summary: 'Today you played the whole Ode to Joy from a clean score.',
            seed: 'Next time the left hand gets a map of its very own.'
          }
        }
      ]
    },
    {
      id: 'u8',
      title: 'The Left Hand Speaks',
      tag: 'UNIT 8',
      lessons: [
        {
          id: 'the-bass-clef',
          title: 'The bass clef',
          kind: 'drill',
          clef: 'bass',
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'The left hand gets its own map today — the bass clef, where the deep notes live.',
              sub: 'The curly symbol with two dots. Everything on it sits lower than middle C.'
            },
            {
              kind: 'watch-me',
              prompt: 'Watch: the left pinky finds deep C on the new map.',
              sub: 'C, D, E — fingers 5, 4, 3, reading from the bass clef now.',
              anim: { keys: ['C3', 'D3', 'E3'], fingers: [5, 4, 3], hand: 'left' }
            },
            {
              kind: 'play',
              prompt: 'Read the bass clef and play: C, D, E.',
              sub: 'Deep C sits in the second space from the bottom. Fingers 5, 4, 3.',
              targets: [n('C3', 5), n('D3', 4), n('E3', 3)]
            },
            {
              kind: 'play',
              prompt: 'The whole left-hand hill, read from its own map.',
              sub: 'C up to G — pinky to thumb, every note on the new staff.',
              targets: [n('C3', 5), n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1)]
            }
          ],
          done: {
            title: 'The bass clef is yours.',
            line: 'Two clefs, two hands, one language. The deep notes finally have their own address.'
          },
          recap: {
            summary: 'Today you met the bass clef — the left hand’s own map.',
            seed: 'Next time the left hand warms up its five deep fingers.'
          }
        },
        {
          id: 'left-hand-warmup',
          title: 'The left hand warms up',
          kind: 'drill',
          clef: 'bass',
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Before the hands ever play together, the left hand does its own warm-up.',
              sub: 'Five deep fingers, five deep notes — pinky to thumb, C up to G.'
            },
            {
              kind: 'watch-me',
              prompt: 'Watch the left hand climb: pinky first, up to the thumb.',
              sub: 'C, D, E, F, G — fingers 5, 4, 3, 2, 1.',
              anim: { keys: ['C3', 'D3', 'E3', 'F3', 'G3'], fingers: [5, 4, 3, 2, 1], hand: 'left' }
            },
            {
              kind: 'play',
              prompt: 'Climb the five deep notes: C, D, E, F, G.',
              sub: 'Pinky to thumb — 5, 4, 3, 2, 1.',
              targets: [n('C3', 5), n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1)]
            },
            {
              kind: 'play',
              prompt: 'And back down: G, F, E, D, C.',
              sub: 'Thumb to pinky — 1, 2, 3, 4, 5.',
              targets: [n('G3', 1), n('F3', 2), n('E3', 3), n('D3', 4), n('C3', 5)]
            },
            {
              kind: 'play',
              prompt: 'Now skip about, and the left hand gets nimble.',
              sub: 'C, E, D, F, E, G — little hops between the deep notes.',
              targets: [n('C3', 5), n('E3', 3), n('D3', 4), n('F3', 2), n('E3', 3), n('G3', 1)]
            }
          ],
          done: {
            title: 'The left hand is warm.',
            line: 'Five fingers, five deep notes — up, down, and skipping. Ready for anything.'
          },
          recap: {
            summary: 'Today the left hand warmed up its five deep fingers, on its own.',
            seed: 'Next time it walks down the bass clef, reading little melodies.'
          }
        },
        {
          id: 'walking-down-the-bass',
          title: 'Walking down the bass',
          kind: 'drill',
          clef: 'bass',
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Today the left hand reads little melodies of its own — starting from the top.',
              sub: 'Same map as last time, read downhill first.'
            },
            {
              kind: 'play',
              prompt: 'Walk down from G to deep C.',
              sub: 'Thumb first: 1, 2, 3, 4, 5 — downhill all the way.',
              targets: [n('G3', 1), n('F3', 2), n('E3', 3), n('D3', 4), n('C3', 5)]
            },
            {
              kind: 'play',
              prompt: 'Now a real left-hand tune — steps and skips mixed.',
              sub: 'Read each note from the bass clef; no habits, just the map.',
              targets: [n('C3', 5), n('E3', 3), n('D3', 4), n('F3', 2), n('E3', 3), n('G3', 1)]
            },
            {
              kind: 'reading-snippet',
              pool: [n('C3', 5), n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1)],
              len: 4
            }
          ],
          done: {
            title: 'The left hand reads.',
            line: 'Brand-new music, low and warm, straight off the bass clef.'
          },
          recap: {
            summary: 'Today the left hand read its own melodies from the bass clef.',
            seed: 'Next time it carries a whole song alone: Merrily We Roll Along.'
          }
        },
        {
          id: 'merrily-left-hand',
          title: 'Merrily We Roll Along — left hand',
          kind: 'song',
          clef: 'bass',
          card: 'The whole melody, deep and warm, carried by the left hand alone.',
          notes: [
            n('E3', 3), n('D3', 4), n('C3', 5), n('D3', 4), n('E3', 3), n('E3', 3), n('E3', 3),
            n('D3', 4), n('D3', 4), n('D3', 4), n('E3', 3), n('G3', 1), n('G3', 1),
            n('E3', 3), n('D3', 4), n('C3', 5), n('D3', 4), n('E3', 3), n('E3', 3), n('E3', 3),
            n('E3', 3), n('D3', 4), n('D3', 4), n('E3', 3), n('D3', 4), n('C3', 5)
          ],
          done: {
            title: 'The left hand sang the whole song.',
            line: 'Merrily, all the way through, an octave deep — no right hand needed.'
          },
          recap: {
            summary: 'Today your left hand carried Merrily We Roll Along by itself.',
            seed: 'Next time the left hand rows a second song of its own: Lightly Row.'
          }
        },
        {
          id: 'lightly-row-left-hand',
          title: 'Lightly Row — left hand',
          kind: 'song',
          clef: 'bass',
          card: 'The little boat song, rowed by the left hand alone — deep and warm.',
          notes: [
            n('G3', 1), n('E3', 3), n('E3', 3), n('F3', 2), n('D3', 4), n('D3', 4), n('C3', 5),
            n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1), n('G3', 1), n('G3', 1)
          ],
          done: {
            title: 'The left hand rowed the whole boat.',
            line: 'Lightly Row, all the way through, deep and low — no right hand needed.'
          },
          recap: {
            summary: 'Today your left hand carried Lightly Row by itself.',
            seed: 'Next time the hands play echo games — one asks, the other answers.'
          }
        },
        {
          id: 'echo-games',
          title: 'Echo games',
          kind: 'drill',
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Echo games: the right hand plays a phrase, and the left hand answers it, deeper.',
              sub: 'One hand at a time — listen first, then echo what you heard.'
            },
            {
              kind: 'ear-echo',
              prompt: 'Listen… then echo with the right hand: C, E, G.',
              sub: 'A skip up, a skip up again.',
              targets: [n('C4', 1), n('E4', 3), n('G4', 5)]
            },
            {
              kind: 'ear-echo',
              prompt: 'Now the left hand answers, an octave deeper: C, E, G.',
              sub: 'Fingers 5, 3, 1 — the mirror of what you just played.',
              targets: [n('C3', 5), n('E3', 3), n('G3', 1)]
            },
            {
              kind: 'ear-echo',
              prompt: 'Right hand asks, coming down this time: G, E, C.',
              sub: 'Two skips, downhill.',
              targets: [n('G4', 5), n('E4', 3), n('C4', 1)]
            },
            {
              kind: 'ear-echo',
              prompt: 'And the left hand has the last word: G, E, C, down in the deep.',
              sub: 'Thumb, middle, pinky — let it ring.',
              targets: [n('G3', 1), n('E3', 3), n('C3', 5)]
            }
          ],
          done: {
            title: 'Echo games — played.',
            line: 'Question and answer, high and low — your hands are having conversations now.'
          },
          recap: {
            summary: 'Today your hands played echoes — each one answering the other, an octave apart.',
            seed: 'Next time they stop taking turns and play together.'
          }
        }
      ]
    },
    {
      id: 'u9',
      title: 'Hands Together',
      tag: 'UNIT 9',
      lessons: [
        {
          id: 'both-thumbs',
          title: 'Both thumbs share middle C',
          kind: 'drill',
          poly: true,
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Today, for the first time, both hands play at once.',
              sub: 'Left thumb on G below middle C, right thumb on middle C — neighbours, nearly touching.'
            },
            {
              kind: 'play',
              prompt: 'Both thumbs land together: G below, and middle C.',
              sub: 'One gentle press, two notes, one sound.',
              targets: [c(['G3', 'C4'], [1, 1])]
            },
            {
              kind: 'play',
              prompt: 'Now hold that low G and let the right hand walk on top of it.',
              sub: 'Strike both thumbs, then D, E, D, C — the deep note keeps humming underneath.',
              targets: [c(['G3', 'C4'], [1, 1]), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Once more — a longer walk over the held note.',
              sub: 'Left thumb down with the right middle finger this time, then step away.',
              targets: [c(['G3', 'E4'], [1, 3]), n('D4', 2), n('C4', 1)]
            }
          ],
          done: {
            title: 'Both hands, at once.',
            line: 'A note below, a melody above — that’s the whole idea of piano, right there.'
          },
          recap: {
            summary: 'Today both thumbs landed together and the hands played at once.',
            seed: 'Next time the left hand holds one long drone while the right sings.'
          }
        },
        {
          id: 'drone-and-melody',
          title: 'Drone and melody',
          kind: 'drill',
          poly: true,
          low: true,
          steps: [
            {
              kind: 'info',
              prompt: 'A drone is one deep note that keeps sounding while a melody moves above it.',
              sub: 'Left pinky holds deep C. The right hand does all the walking.'
            },
            {
              kind: 'play',
              prompt: 'Land the drone and a melody note together: deep C under E.',
              sub: 'Left pinky and right middle finger, one press.',
              targets: [c(['C3', 'E4'], [5, 3])]
            },
            {
              kind: 'play',
              prompt: 'Now the whole hill over the drone.',
              sub: 'Strike C and E together, then walk: F, G, F, E, D — and land on C.',
              targets: [c(['C3', 'E4'], [5, 3]), n('F4', 4), n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1)]
            }
          ],
          done: {
            title: 'Drone and melody — together.',
            line: 'One note held like the ground, a tune walking on top. Bagpipes do it; now you do too.'
          },
          recap: {
            summary: 'Today the left hand held a drone while the right walked the whole hill.',
            seed: 'Next time: Au clair de la lune, hands together.'
          }
        },
        {
          id: 'au-clair-together',
          title: 'Au clair de la lune — together',
          kind: 'song',
          poly: true,
          low: true,
          card: 'The gentle moonlight song returns — with long left-hand notes glowing underneath.',
          notes: [
            c(['G3', 'C4'], [1, 1]), n('C4', 1), n('C4', 1), n('D4', 2),
            c(['C3', 'E4'], [5, 3]), n('D4', 2), n('C4', 1), n('E4', 3),
            c(['G3', 'D4'], [1, 2]), n('D4', 2), c(['E3', 'C4'], [3, 1])
          ],
          done: {
            title: 'Au clair de la lune, hands together.',
            line: 'The moonlight song with its own ground underneath — both hands, one music.'
          },
          recap: {
            summary: 'Today Au clair de la lune got its left-hand glow — hands together.',
            seed: 'Next time Twinkle comes back, with the left hand changing beneath the tune.'
          }
        },
        {
          id: 'twinkle-together',
          title: 'Twinkle — together',
          kind: 'song',
          poly: true,
          low: true,
          card: 'The sky’s favourite tune — now the left hand changes notes beneath it.',
          notes: [
            c(['E3', 'C4'], [3, 1]), n('C4', 1), c(['C3', 'G4'], [5, 5]), n('G4', 5),
            c(['F3', 'A4'], [2, 5]), n('A4', 5), n('G4', 5),
            c(['A3', 'F4'], [1, 4]), n('F4', 4), c(['C3', 'E4'], [5, 3]), n('E4', 3),
            c(['G3', 'D4'], [1, 2]), n('D4', 2), n('C4', 1)
          ],
          done: {
            title: 'Twinkle, hands together.',
            line: 'The tune up top, the harmony moving underneath — you played both at once.'
          },
          recap: {
            summary: 'Today Twinkle twinkled over a left hand that moved beneath it.',
            seed: 'Next time the black keys finally join in.'
          }
        }
      ]
    },
    {
      id: 'u10',
      title: 'Black Keys Join In',
      tag: 'UNIT 10',
      lessons: [
        {
          id: 'meet-f-sharp',
          title: 'Meet F sharp',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'G position comes with a gift: its own black key, F sharp.',
              sub: 'The sharp sign ♯ means “the black key just to the right.” F sharp leans on G like a doorstep.'
            },
            {
              kind: 'play',
              prompt: 'Find it: the black key just left of G. Thumb, gently.',
              sub: 'It’s in the group of three black keys — the first one.',
              targets: [n('F#4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Rock between the doorstep and the door: F sharp, G, F sharp, G.',
              sub: 'Thumb walks the tiny distance — black, white, black, white.',
              targets: [n('F#4', 1), n('G4', 1), n('F#4', 1), n('G4', 1)]
            },
            {
              kind: 'play',
              prompt: 'Now a G-position pattern that uses it.',
              sub: 'Up the hill, then home by the doorstep: G, A, B, F sharp, G.',
              targets: [n('G4', 1), n('A4', 2), n('B4', 3), n('F#4', 1), n('G4', 1)]
            }
          ],
          done: {
            title: 'F sharp — met.',
            line: 'Your first black key by name. G position sounds properly at home now.'
          },
          recap: {
            summary: 'Today you met F sharp — the black key that makes G position home.',
            seed: 'Next time a flat: the same idea, leaning the other way.'
          }
        },
        {
          id: 'meet-b-flat',
          title: 'Meet B flat',
          kind: 'drill',
          flats: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Meet the flat: ♭ means “the black key just to the left.” B flat lives beside A.',
              sub: 'New home today too — thumb on F. Same tune shapes, starting somewhere new. That’s called transposing.'
            },
            {
              kind: 'play',
              prompt: 'Climb F position: F, G, A, B flat, C.',
              sub: 'Fingers 1 to 5 — the fourth step is the black key.',
              targets: [n('F4', 1), n('G4', 2), n('A4', 3), n('Bb4', 4), n('C5', 5)]
            },
            {
              kind: 'play',
              prompt: 'And back down through the flat.',
              sub: 'C, B flat, A, G, F — let the black key be as gentle as the whites.',
              targets: [n('C5', 5), n('Bb4', 4), n('A4', 3), n('G4', 2), n('F4', 1)]
            },
            {
              kind: 'play',
              prompt: 'A tune you know, in the new home: Merrily begins on A now.',
              sub: 'A, G, F, G, A, A, A — same shape, new address.',
              targets: [n('A4', 3), n('G4', 2), n('F4', 1), n('G4', 2), n('A4', 3), n('A4', 3), n('A4', 3)]
            }
          ],
          done: {
            title: 'B flat — met.',
            line: 'Sharps lean right, flats lean left — and you just transposed your first tune.'
          },
          recap: {
            summary: 'Today you met B flat and played an old tune from a brand-new home.',
            seed: 'Next time: a whole song in G — sharp and all.'
          }
        },
        {
          id: 'london-bridge-in-g',
          title: 'London Bridge in G',
          kind: 'drill',
          high: true,
          steps: [
            {
              kind: 'info',
              prompt: 'A whole song in G position — and the sharp gets the last word.',
              sub: 'Phrase by phrase. The pinky stretches one key past its post for the top note.'
            },
            {
              kind: 'play',
              prompt: 'The big phrase: London Bridge is falling down…',
              sub: 'Pinky starts on D, stretches up to E, then steps down the hill.',
              targets: [n('D5', 5), n('E5', 5), n('D5', 5), n('C5', 4), n('B4', 3), n('C5', 4), n('D5', 5)]
            },
            {
              kind: 'play',
              prompt: '…falling down…',
              sub: 'Three little steps up: A, B, C.',
              targets: [n('A4', 2), n('B4', 3), n('C5', 4)]
            },
            {
              kind: 'play',
              prompt: '…falling down…',
              sub: 'And three more, one key higher: B, C, D.',
              targets: [n('B4', 3), n('C5', 4), n('D5', 5)]
            },
            {
              kind: 'play',
              prompt: 'The big phrase again, start to finish.',
              sub: 'Same as before — let it swing.',
              targets: [n('D5', 5), n('E5', 5), n('D5', 5), n('C5', 4), n('B4', 3), n('C5', 4), n('D5', 5)]
            },
            {
              kind: 'play',
              prompt: 'My fair la-dy — with the sharp leaning home.',
              sub: 'A, up to D, then F sharp falls onto G. That’s the whole song.',
              targets: [n('A4', 2), n('D5', 5), n('F#4', 1), n('G4', 1)]
            }
          ],
          done: {
            title: 'London Bridge, in G.',
            line: 'A full song in the new position — black key and all. Nothing fell down.'
          },
          recap: {
            summary: 'Today London Bridge stood tall in G — sharp included.',
            seed: 'Next time, chords come back: C, and its two best friends.'
          }
        }
      ]
    },
    {
      id: 'u11',
      title: 'First Chords',
      tag: 'UNIT 11',
      lessons: [
        {
          id: 'building-the-c-chord',
          title: 'Building the C chord',
          kind: 'drill',
          poly: true,
          steps: [
            {
              kind: 'info',
              prompt: 'The C chord comes back — not as a trick this time, but as a tool.',
              sub: 'C, E, G under fingers 1, 3, 5. Today it learns to repeat and to be steady.'
            },
            {
              kind: 'play',
              prompt: 'Land the C chord once, all together.',
              sub: 'Roll it if you need to — ending together is what counts.',
              targets: [c(['C4', 'E4', 'G4'], [1, 3, 5])]
            },
            {
              kind: 'ear-choice',
              prompt: 'Listen — is that one note, or three sounding together?',
              sub: 'A chord is thicker, like three voices agreeing.',
              play: [c(['C4', 'E4', 'G4'], [1, 3, 5])],
              choices: [{ label: 'One note', correct: false }, { label: 'Three together', correct: true }]
            },
            {
              kind: 'play',
              prompt: 'Now three in a row — steady as breathing.',
              sub: 'Land, lift, land, lift, land. Same shape every time.',
              targets: [c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['C4', 'E4', 'G4'], [1, 3, 5])]
            }
          ],
          done: {
            title: 'The C chord is a tool now.',
            line: 'Once is a discovery; three in a row is a skill. Your hand owns that shape.'
          },
          recap: {
            summary: 'Today the C chord became steady — three clean landings in a row.',
            seed: 'Next time it meets its neighbour, G seven, and they take turns.'
          }
        },
        {
          id: 'c-and-g7',
          title: 'C and G7 take turns',
          kind: 'drill',
          poly: true,
          steps: [
            {
              kind: 'info',
              prompt: 'Every chord has a best friend. C’s is called G seven — it leans, and C answers.',
              sub: 'Thumb slides down to B, finger 4 finds F, pinky keeps G. A new shape, one key of travel.'
            },
            {
              kind: 'play',
              prompt: 'Make the G seven shape: B, F and G together.',
              sub: 'Thumb on B (just below middle C), 4 on F, pinky stays home on G.',
              targets: [c(['B3', 'F4', 'G4'], [1, 4, 5])]
            },
            {
              kind: 'play',
              prompt: 'Now they take turns: C… G seven… and home again.',
              sub: 'Slow is beautiful. Feel the lean, feel the landing.',
              targets: [
                c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['B3', 'F4', 'G4'], [1, 4, 5]),
                c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['B3', 'F4', 'G4'], [1, 4, 5]),
                c(['C4', 'E4', 'G4'], [1, 3, 5])
              ]
            }
          ],
          done: {
            title: 'C and G seven — talking.',
            line: 'Lean and answer, tension and home. That little pair carries half the songs ever sung.'
          },
          recap: {
            summary: 'Today C and G seven took turns — the lean and the landing.',
            seed: 'Next time F joins, and you’ll own the whole I–IV–V neighbourhood.'
          }
        },
        {
          id: 'f-joins',
          title: 'F joins the family',
          kind: 'drill',
          poly: true,
          steps: [
            {
              kind: 'info',
              prompt: 'One more friend: the F chord. Thumb stays on C; the top two fingers reach up.',
              sub: 'C stays, F and A stack above it. Three chords now — the whole neighbourhood.'
            },
            {
              kind: 'play',
              prompt: 'Make the F shape: C, F and A together.',
              sub: 'Thumb on C, finger 4 on F, pinky on A.',
              targets: [c(['C4', 'F4', 'A4'], [1, 4, 5])]
            },
            {
              kind: 'play',
              prompt: 'The round trip: C, F, C, G seven, C.',
              sub: 'Home, away, home, lean… and home. Songs live inside this loop.',
              targets: [
                c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['C4', 'F4', 'A4'], [1, 4, 5]),
                c(['C4', 'E4', 'G4'], [1, 3, 5]), c(['B3', 'F4', 'G4'], [1, 4, 5]),
                c(['C4', 'E4', 'G4'], [1, 3, 5])
              ]
            }
          ],
          done: {
            title: 'Three chords. The family.',
            line: 'C, F and G seven — with those three shapes you can accompany half the world’s songs.'
          },
          recap: {
            summary: 'Today F joined the family — the whole I–IV–V neighbourhood under one hand.',
            seed: 'Next time: When the Saints, with real chords in the left hand.'
          }
        },
        {
          id: 'saints-with-chords',
          title: 'When the Saints — with chords',
          kind: 'song',
          poly: true,
          low: true,
          card: 'The march comes back grown-up: melody in the right hand, block chords in the left.',
          notes: [
            n('C4', 1), n('E4', 3), c(['C3', 'E3', 'G3', 'F4'], [5, 3, 1, 4]), n('G4', 5),
            n('C4', 1), n('E4', 3), c(['C3', 'E3', 'G3', 'F4'], [5, 3, 1, 4]), n('G4', 5),
            n('C4', 1), n('E4', 3), n('F4', 4), n('G4', 5), n('E4', 3), n('C4', 1), n('E4', 3), c(['G3', 'B3', 'D4'], [5, 3, 1]),
            n('E4', 3), n('E4', 3), c(['G3', 'B3', 'D4'], [5, 3, 1]), n('C4', 1), n('C4', 1),
            n('E4', 3), n('G4', 5), n('G4', 5), c(['A3', 'C4', 'F4'], [3, 1, 4]),
            n('E4', 3), n('F4', 4), n('G4', 5), n('E4', 3), n('C4', 1), c(['G3', 'B3', 'D4'], [5, 3, 1]), n('C4', 1)
          ],
          done: {
            title: 'The Saints, with chords.',
            line: 'Melody up top, chords marching underneath — that’s two-handed piano, the real thing.'
          },
          recap: {
            summary: 'Today the Saints marched with block chords under the tune.',
            seed: 'Next time: louds and softs — making the piano whisper and roar.'
          }
        }
      ]
    },
    {
      id: 'u12',
      title: 'Your First Recital',
      tag: 'UNIT 12',
      lessons: [
        {
          id: 'louds-and-softs',
          title: 'Louds and softs',
          kind: 'drill',
          steps: [
            {
              kind: 'info',
              prompt: 'Music breathes: sometimes it whispers, sometimes it roars.',
              sub: 'Same keys, same fingers — the only difference is how gently or boldly they land.'
            },
            {
              kind: 'dynamics',
              mode: 'soft',
              prompt: 'Play it like a mouse: C, then G, barely brushing the keys.',
              sub: 'So quiet you almost wonder if it happened.',
              targets: [n('C4', 1), n('G4', 5)]
            },
            {
              kind: 'dynamics',
              mode: 'loud',
              prompt: 'Now a lion: the same two notes, ringing out.',
              sub: 'Bold and warm — loud never means harsh.',
              targets: [n('C4', 1), n('G4', 5)]
            },
            {
              kind: 'dynamics',
              mode: 'soft',
              prompt: 'One more mouse: a whisper on E.',
              sub: 'Tiny. Gentle. Just a breath of a note.',
              targets: [n('E4', 3)]
            },
            {
              kind: 'dynamics',
              mode: 'loud',
              prompt: 'And the lion answers on E.',
              sub: 'Let it fill the room.',
              targets: [n('E4', 3)]
            }
          ],
          done: {
            title: 'Louds and softs — yours.',
            line: 'A mouse and a lion live in your hands now. That’s called playing with feeling.'
          },
          recap: {
            summary: 'Today you played whispers and roars — dynamics, the musicians call it.',
            seed: 'Next time you’ll pick three favourites and polish them till they shine.'
          }
        },
        {
          id: 'putting-on-polish',
          title: 'Putting on polish',
          kind: 'setlist',
          pick: 3,
          from: [
            'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune', 'ode-in-time', 'hot-cross-buns',
            'when-the-saints', 'twinkle', 'ode-whole-theme', 'merrily-left-hand',
            'au-clair-together', 'twinkle-together', 'saints-with-chords',
            'labe-igi-orombo', 'bata-mi', 'ise-oluwa', 'tolotolo'
          ],
          done: {
            title: 'Polished.',
            line: 'Three favourites, made more beautiful on purpose. That’s what practising is for.'
          },
          recap: {
            summary: 'Today you gave three favourite pieces a make-it-beautiful pass.',
            seed: 'Next time is the big one: recital day.'
          }
        },
        {
          id: 'recital-day',
          title: 'Recital day',
          kind: 'setlist',
          pick: 3,
          recital: true,
          from: [
            'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune', 'ode-in-time', 'hot-cross-buns',
            'when-the-saints', 'twinkle', 'ode-whole-theme', 'merrily-left-hand',
            'au-clair-together', 'twinkle-together', 'saints-with-chords',
            'labe-igi-orombo', 'bata-mi', 'ise-oluwa', 'tolotolo'
          ],
          done: {
            title: 'My first recital.',
            line: 'Three pieces, played for real, start to finish. I kept that set for you — it’s yours forever.'
          },
          recap: {
            summary: 'Today was recital day — three pieces, played all the way through, for real.',
            seed: 'A whole year of music lives in your hands now. Keep playing.'
          }
        }
      ]
    }
  ]
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
