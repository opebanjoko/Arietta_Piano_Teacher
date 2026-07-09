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

  ear: {
    retry: 'No rush — have another listen. I’ll play them again.',
    playing: 'Listen…',
    again: '♪ Play them again'
  },

  micCheck: {
    kicker: 'CAN YOU HEAR ME?',
    title: 'May I use the microphone?',
    line: 'I listen to your piano so I can tell you which notes I hear. The sound never leaves this iPad — nothing is recorded, nothing is sent anywhere.',
    allow: 'Yes — have a listen',
    later: 'Not now — I’ll tap the keys instead',
    listenTitle: 'Lovely. Now play any note on your piano.',
    listenLine: 'Any key at all — I’m listening.',
    heardTitle: 'I heard {note}!',
    heardLine: 'Did I get that right?',
    confirm: 'That’s right →',
    retry: 'Try another note',
    sensitivity: 'If I miss quiet notes, slide toward Eager. If I imagine notes, slide toward Careful.',
    sensLow: 'Careful',
    sensHigh: 'Eager',
    deniedTitle: 'That’s alright.',
    deniedLine: 'We’ll use the tap keys under each lesson instead — everything works just the same. You can let me listen any time from the home screen.',
    deniedButton: 'Onward →'
  },

  warmup: {
    kicker: 'A LITTLE HELLO FIRST',
    title: 'Shall we say hello to the keys first?',
    line: 'A one-minute visit to {title} — something your fingers already know. Then, on to new things.',
    accept: 'Warm up →',
    skip: 'Skip today',
    bridge: 'Warm and ready. Now — something new.',
    onward: 'Onward — {title} →'
  },

  freePlay: {
    kicker: 'FREE PLAY · NO GOALS HERE',
    title: 'Just play.',
    idle: 'Play anything — I’ll listen and tell you what I hear.',
    heard: 'That was {note}!',
    sparks: [
      'Play it again, but one key higher?',
      'What does it sound like very softly?',
      'Try the same note far down low.',
      'Two notes at once is allowed here — no one is checking.',
      'Can you make it sound like rain?'
    ]
  },

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
    micLine: 'Mic ready — I listen when a lesson starts',
    micOffLine: 'Tap-key mode — tap “check my ears” to let me listen',
    micCheckLink: 'check my ears',
    freePlay: 'Just play →',
    recapKicker: 'TODAY AT THE PIANO',
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
