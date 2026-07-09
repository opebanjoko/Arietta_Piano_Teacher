/**
 * Arietta's voice — every student-facing string the engine needs (SR-FBK-03).
 * Editable without touching engine code. Placeholders in {braces} are filled
 * by the engine. Tone: warm, specific, unpatronizing; hints, never buzzers.
 */

export const VOICE = {
  softeners: ['Almost — ', 'So close — ', 'Nearly — '],

  hints: {
    blackKey: '{soft}that was one of the black keys. {target} is a white key.',
    directional: '{soft}I heard {heard}. {target} is {distance} to the {dir}.',
    directionalSong: '{soft}I heard {heard}. The next note is {target} — {distance} to the {dir}.',
    octaveSlip: 'That was {target} — just one octave too {highlow}. The one you want is a little to the {dir}.',
    far: '{soft}I heard {heard}. {target} is further to the {dir}.'
  },

  distances: ['', 'one key', 'two keys', 'three keys', 'four keys', 'five keys', 'six keys', 'seven keys'],

  encouragements: [
    'There it is ♪',
    'Steady as a clock ♪',
    'Up the hill you went ♪',
    'And softly back down ♪',
    'That rang out beautifully ♪',
    'Just like that ♪',
    'Your fingers knew the way ♪',
    'Warm and clear ♪'
  ],

  song: {
    lead: 'Next up: {target}',
    leadDone: 'Every note — well done.',
    cheers: [
      { at: 0.2, line: 'a lovely start' },
      { at: 0.4, line: 'you’re really doing it' },
      { at: 0.6, line: 'more than halfway' },
      { at: 0.8, line: 'almost home…' }
    ],
    octaveMention: 'One small thing for next time: a few notes landed an octave away from home. It still sounded lovely.'
  },

  greeting: {
    morning: 'Good morning, {name}.',
    afternoon: 'Good afternoon, {name}.',
    evening: 'Good evening, {name}.'
  },

  home: {
    micLine: 'Tap-key mode — my listening ears arrive soon',
    kickerNext: 'NEXT UP · {unit} — {lesson}',
    lineNext: 'Ten gentle minutes is plenty. {lesson} is waiting for you.',
    btnNext: 'Continue — {lesson} →',
    kickerDone: 'EVERY LESSON PLAYED',
    lineDone: 'Units 1 to 3, start to finish. Replay anything you like — the songs only get warmer.',
    btnDone: 'Play Ode to Joy again →',
    altPeek: 'or peek at {song}',
    altReplay: 'or replay {lesson}',
    unitComplete: 'Complete',
    unitContinue: '{done} of {total} · continue →',
    unitStart: 'Start here →',
    unitLocked: 'Unlocks after {prev}',
    unitComing: 'Coming a little later',
    pathTitle: 'YOUR PATH',
    songsTitle: 'SONGS YOU CAN PLAY',
    songPeek: 'SNEAK PEEK',
    songNext: 'UP NEXT',
    songDone: 'SONG COMPLETE',
    songPlay: 'Play along →',
    songReplay: 'Play it again →',
    songLocked: 'Locked for now',
    songLockedLine: 'Comes along with First Songs.'
  },

  firstRun: {
    kicker: 'HELLO THERE',
    title: 'I’m Arietta — your piano teacher.',
    line: 'We’ll learn at your piano, a few gentle minutes at a time. First things first: what should I call you?',
    placeholder: 'Your name',
    button: 'Let’s meet the piano →',
    newProfileTitle: 'A new player — lovely.',
    newProfileLine: 'Tell me their name and I’ll set up a fresh path through the course.',
    newProfileButton: 'Join the piano →'
  }
}
