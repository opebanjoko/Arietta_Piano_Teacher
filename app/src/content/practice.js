/**
 * Optional practice packs: short review sessions unlocked by completed lessons.
 * They reuse the existing drill/song lesson shapes so practice never needs a
 * separate grading engine.
 */

const n = (note, finger, beats) => beats ? { note, finger, beats } : { note, finger }

const drill = (id, title, unitId, unitTitle, afterLessonId, tags, steps, done, extra = {}) => ({
  id,
  title,
  unitId,
  unitTitle,
  afterLessonId,
  tags,
  estimatedMinutes: 1,
  unlocksAfter: [afterLessonId],
  lesson: {
    id,
    title,
    kind: 'drill',
    ephemeral: true,
    steps,
    done,
    ...extra
  }
})

const song = (id, title, unitId, unitTitle, afterLessonId, tags, notes, done, extra = {}) => ({
  id,
  title,
  unitId,
  unitTitle,
  afterLessonId,
  tags,
  estimatedMinutes: 1,
  unlocksAfter: [afterLessonId],
  lesson: {
    id,
    title,
    kind: 'song',
    ephemeral: true,
    notes,
    done,
    ...extra
  }
})

export const PRACTICE_PACKS = [
  drill('practice-keyboard-c-map', 'C is beside every pair', 'u1', 'Sitting at the Piano', 'meet-the-keyboard', ['notes', 'map'], [
    {
      kind: 'play',
      match: 'pitch-class',
      prompt: 'Find three different Cs on your piano.',
      sub: 'Each one lives just to the left of a group of two black keys.',
      targets: [n('C4', 1), n('C4', 1), n('C4', 1)]
    }
  ], {
    title: 'Those Cs are getting easy to find.',
    line: 'The black-key map is doing its job.'
  }),

  drill('practice-middle-c-home', 'Middle C home base', 'u1', 'Sitting at the Piano', 'finding-middle-c', ['notes', 'review'], [
    {
      kind: 'play',
      prompt: 'Come back to middle C and play it four calm times.',
      sub: 'Same home note, same gentle hand.',
      targets: [n('C4', 1), n('C4', 1), n('C4', 1), n('C4', 1)]
    }
  ], {
    title: 'Middle C still feels like home.',
    line: 'Four calm sounds, all from the same place.'
  }),

  drill('practice-hands-finger-walk', 'Fingers say hello again', 'u1', 'Sitting at the Piano', 'hands-say-hello', ['technique', 'notes'], [
    {
      kind: 'play',
      prompt: 'Three fingers, one home note: C with 1, then 2, then 3.',
      sub: 'Let every finger make the same warm sound.',
      targets: [n('C4', 1), n('C4', 2), n('C4', 3)]
    },
    {
      kind: 'ear-echo',
      prompt: 'Copy me: three gentle Cs.',
      sub: 'Your ear already knows this sound.',
      targets: [n('C4', 1), n('C4', 2), n('C4', 3)]
    }
  ], {
    title: 'Your fingers remembered C.',
    line: 'Thumb, pointer, and tall finger all found the same home.'
  }),

  drill('practice-middle-c-soft-brave', 'Soft and brave C', 'u2', 'First Notes', 'middle-c-again', ['tone', 'review'], [
    {
      kind: 'play',
      prompt: 'Play two soft Cs, then two braver Cs.',
      sub: 'Same key, two colors of sound.',
      targets: [n('C4', 1), n('C4', 1), n('C4', 1), n('C4', 1)]
    }
  ], {
    title: 'C can sing in more than one way.',
    line: 'Soft and brave both came from the same relaxed hand.'
  }),

  drill('practice-meet-d-steps', 'C and D stairs', 'u2', 'First Notes', 'meet-d', ['notes', 'ear'], [
    {
      kind: 'ear-choice',
      prompt: 'Listen: was the second note higher or lower?',
      sub: 'C to D is one little step up.',
      play: [n('C4', 1), n('D4', 2)],
      choices: [{ label: 'Higher', correct: true }, { label: 'Lower', correct: false }]
    },
    {
      kind: 'play',
      prompt: 'Walk C to D and back home.',
      sub: 'Fingers 1, 2, then 1 again.',
      targets: [n('C4', 1), n('D4', 2), n('C4', 1)]
    }
  ], {
    title: 'The first stair is familiar now.',
    line: 'C and D are close neighbors.'
  }),

  drill('practice-meet-e-little-hill', 'The little hill', 'u2', 'First Notes', 'meet-e', ['notes', 'ear'], [
    {
      kind: 'play',
      prompt: 'Walk up the little hill again: C, D, E.',
      sub: 'Fingers 1, 2, 3.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
    },
    {
      kind: 'ear-echo',
      prompt: 'Copy me: the same little hill.',
      sub: 'No hurry. Hear it, then play it.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
    }
  ], {
    title: 'That hill is getting familiar.',
    line: 'C, D, and E are starting to feel like neighbors.'
  }),

  drill('practice-meet-f-g-five-finger', 'Five-finger walk', 'u2', 'First Notes', 'meet-f-and-g', ['notes', 'review'], [
    {
      kind: 'play',
      prompt: 'Walk from C all the way to G.',
      sub: 'Five fingers, five white keys.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
    },
    {
      kind: 'play',
      prompt: 'Now come gently back down: G, F, E, D, C.',
      sub: 'Let the hand settle back home.',
      targets: [n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2), n('C4', 1)]
    }
  ], {
    title: 'The whole five-finger path is under your hand.',
    line: 'Up to G and home again, with every finger in its place.'
  }),

  song('practice-ode-first-corner', 'Ode: first corner', 'u3', 'First Songs', 'ode-to-joy', ['song', 'review'], [
    n('E4', 3), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('F4', 4), n('E4', 3), n('D4', 2)
  ], {
    title: 'That Ode corner is warmer now.',
    line: 'The phrase climbed, turned, and came back with you.'
  }),

  song('practice-lightly-row-answer', 'Lightly Row answer', 'u3', 'First Songs', 'lightly-row', ['song', 'review'], [
    n('G4', 5), n('E4', 3), n('E4', 3), n('F4', 4), n('D4', 2), n('D4', 2)
  ], {
    title: 'That little answer knows where to land.',
    line: 'G to E, F to D — the shape is in your ear.'
  }),

  drill('practice-au-clair-cde-reading', 'C-D-E reading path', 'u3', 'First Songs', 'au-clair-de-la-lune', ['reading', 'notes'], [
    {
      kind: 'play',
      prompt: 'Read this tiny path: C, C, D, E, D, C.',
      sub: 'Small steps, right from the staff.',
      targets: [n('C4', 1), n('C4', 1), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1)]
    }
  ], {
    title: 'That little reading path made sense.',
    line: 'Your eyes and fingers found the way together.'
  }),

  drill('practice-long-short-claps', 'Long and short claps', 'u4', 'Rhythm Joins In', 'long-and-short', ['rhythm'], [
    {
      kind: 'rhythm-clap',
      prompt: 'Clap quick, quick, long with the pulse.',
      sub: 'Two small steps, then one longer breath.',
      pattern: [1, 1, 2]
    }
  ], {
    title: 'Quick and long both sat in the pulse.',
    line: 'Your hands waited the right amount of time.'
  }, { tempo: 60 }),

  drill('practice-pulse-cde', 'C-D-E with the pulse', 'u4', 'Rhythm Joins In', 'playing-with-the-pulse', ['rhythm', 'notes'], [
    {
      kind: 'play',
      timed: true,
      prompt: 'Play C, D, E with the pulse.',
      sub: 'One note on each tick.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
    }
  ], {
    title: 'The little hill stayed with the pulse.',
    line: 'Three notes, three ticks, all calmly placed.'
  }, { tempo: 60 }),

  song('practice-hot-cross-first-line', 'Hot Cross Buns corner', 'u4', 'Rhythm Joins In', 'hot-cross-buns', ['song', 'rhythm'], [
    n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 2),
    n('E4', 3, 1), n('D4', 2, 1), n('C4', 1, 2)
  ], {
    title: 'Hot Cross Buns found its steady shape.',
    line: 'Down the little hill, with room for the long notes.'
  }, { tempo: 60 })
]
