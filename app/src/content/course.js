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

const n = (note, finger) => ({ note, finger })

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
          done: {
            title: 'You played Au clair de la lune.',
            line: 'Patient, moonlit playing — the long notes got their full breath.'
          },
          recap: {
            summary: 'Today you played Au clair de la lune, calm as moonlight.',
            seed: 'Rhythm joins in a little later — until then, replay your favourites.'
          }
        }
      ]
    }
  ]
}

/** Home-screen teaser for the next unit still being written (PLAN Phase 3). */
export const COMING_SOON = {
  tag: 'UNIT 4',
  title: 'Rhythm Joins In',
  lessons: ['Long notes and short notes', 'Playing with the pulse', 'Ode to Joy — in time', 'Hot Cross Buns, steady']
}

/** Flat list of lessons in course order (linear unlocking walks this). */
export function allLessons(course = COURSE) {
  return course.units.flatMap(u => u.lessons.map(l => ({ ...l, unitId: u.id, unitTag: u.tag, unitTitle: u.title })))
}

export function findLesson(id, course = COURSE) {
  return allLessons(course).find(l => l.id === id) ?? null
}
