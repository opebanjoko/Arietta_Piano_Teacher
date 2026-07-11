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
    far: '{soft}I heard {heard}. {target} is further to the {dir}.',
    chordExtra: '{soft}a {extra} slipped in there. This chord wants just {want}, all sounding together.',
    chordMissing: '{soft}{have} — lovely. Now {missing} wants to join in too.',
    blackTarget: '{soft}I heard {heard}. {target} is a black key — the one just to the {side} of {anchor}.'
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

  timing: {
    live: { on: 'with the pulse ♪', early: 'a little early', late: 'a little late' },
    steady: 'Right with the pulse, the whole way through.',
    oneOff: 'Just one wobble — {word} on the {ordinal} note. The rest sat right in the pulse.',
    early: 'A little eager here and there — next time, let the pulse carry you.',
    late: 'Some notes came a touch late — trust the pulse; it always waits the same amount.',
    mixed: 'Mostly with the pulse — a wobble or two, and that’s just fine.',
    words: { early: 'a little early', late: 'a little late' },
    ordinals: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
      'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
      'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'last'],
    steadiness: {
      label: 'How the notes sat against the pulse',
      eager: 'a little eager',
      pulseWord: 'right on the pulse',
      dreamy: 'taking their time'
    }
  },

  ear: {
    retry: 'No rush — have another listen. I’ll play them again.',
    playing: 'Listen…',
    again: '♪ Play them again'
  },

  reading: {
    prompt: 'Here’s a little tune nobody has ever played before.',
    sub: 'Read it slowly from the staff — it’s yours to discover.',
    warmupTitle: 'A brand-new little tune',
    doneTitle: 'You just read brand-new music.',
    doneLine: 'Nobody taught you that tune — you read it yourself, cold. That’s real musicianship.'
  },

  rhythm: {
    retry: 'Nearly — the {ordinal} clap came {word}. Listen to the pulse, and we’ll clap it again.',
    done: 'Claps right in the pulse ♪',
    listen: 'Listen…',
    again: '♪ Clap it for me again'
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
    lowOffer: 'One more, if you like — play your lowest C, down on the left.',
    lowListening: 'Listening low… play that deep C a few times.',
    lowHeard: 'Got it — the deep notes come through now.',
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

  practice: {
    kicker: 'TODAY’S PRACTICE',
    title: 'A few familiar things first?',
    line: 'Three tiny visits: {titles}. Nothing new — just helping yesterday settle into your fingers.',
    accept: 'Practice a little →',
    skip: 'Skip practice',
    next: 'Next — {title} →',
    done: 'Back to my course'
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

  trouble: {
    kicker: 'THE TRICKY CORNER',
    title: 'That corner is the tricky part for everyone.',
    line: 'Shall we do just these three notes, twice? Then we’ll drop back into the song.',
    accept: 'Practice the corner →',
    skip: 'Keep playing',
    again: 'Lovely — once more, same three notes.',
    rejoin: 'That’s the corner learned. Back into the song — from just before it.'
  },

  song: {
    lead: 'Next up: {target}',
    leadDone: 'Every note — well done.',
    withMe: '♫ Play it with me',
    withMeOn: 'Playing with you ♫',
    cheers: [
      { at: 0.2, line: 'a lovely start' },
      { at: 0.4, line: 'you’re really doing it' },
      { at: 0.6, line: 'more than halfway' },
      { at: 0.8, line: 'almost home…' }
    ],
    octaveMention: 'One small thing for next time: a few notes landed an octave away from home. It still sounded lovely.',
    tempos: { slow: 'Gently', medium: 'Easy pace', full: 'Full speed' },
    tempoLine: 'Any speed is a good speed.'
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
    settings: 'Settings',
    recapKicker: 'TODAY AT THE PIANO',
    kickerNext: 'NEXT UP · {unit} — {lesson}',
    lineNext: 'Ten gentle minutes is plenty. {lesson} is waiting for you.',
    btnNext: 'Continue — {lesson} →',
    kickerDone: 'EVERY LESSON PLAYED',
    lineDone: 'The whole course, start to finish. Replay anything you like — the songs only get warmer.',
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
    songLockedLine: 'Unlocks a little further along the path.'
  },

  glimpse: {
    fresh: '{name} is just getting started — the first hello to the keyboard is still ahead.',
    notes: '{name} has met {notes} at the piano.',
    songs: 'Songs played start to finish: {songs}.',
    last: 'Last at the piano {when}.',
    next: 'Next on the path: {lesson}.',
    courseDone: 'Every lesson in the course is complete — from here it’s all music.',
    and: 'and',
    today: 'today',
    yesterday: 'yesterday',
    thisWeek: 'earlier this week',
    aWhile: 'a little while ago'
  },

  pill: {
    waking: 'Waking up my ears…',
    midi: 'Hearing your piano through the cable ♪'
  },

  dynamics: {
    nudge: {
      soft: 'That was a lion — try a mouse: barely brush the key.',
      loud: 'That was a mouse — be a lion: let it ring out.'
    },
    praise: {
      soft: 'Soft as a mouse ♪',
      loud: 'A proper roar ♪'
    }
  },

  recital: {
    pickKicker: 'CHOOSE YOUR PIECES',
    pickLinePolish: 'Pick three favourites — each one gets a make-it-beautiful pass.',
    pickLineRecital: 'Pick the three you’ll play today. I’ll introduce each one, then go quiet and just listen.',
    begin: 'Begin ♪',
    intro: '{title}. Whenever you’re ready.',
    next: 'Next piece — {title} →',
    finishPolish: 'All polished ♪',
    finishRecital: 'Take a bow ♪',
    keepsake: '♪ My first recital — {pieces}'
  },

  settings: {
    kicker: 'SETTINGS',
    title: 'A few quiet knobs.',
    earsTitle: 'My ears',
    earsOn: 'The microphone is on — I listen whenever a lesson starts.',
    earsOff: 'Tap-key mode — I’m not listening yet.',
    earsButton: 'Check my ears',
    lookTitle: 'Colour & keys',
    accentLine: 'Arietta’s colour, for this player.',
    accentNames: ['Warm gold', 'Sage green', 'Slate blue', 'Plum'],
    labelsLine: 'Letter names on the tap keys.',
    labelsOn: 'Shown',
    labelsOff: 'Hidden',
    glimpseTitle: 'Parent’s glimpse',
    glimpseLine: 'How it’s going, in plain words. Just for grown-ups — no scores, no charts.',
    playerTitle: 'This player',
    resetLine: 'Start {name} over from the very first lesson. Other players keep their progress.',
    resetButton: 'Reset progress',
    resetConfirm: 'Yes — start over',
    deleteLine: 'Remove {name} and everything they’ve played.',
    deleteButton: 'Remove this player',
    deleteConfirm: 'Yes — remove {name}',
    cancel: 'Never mind',
    diagTitle: 'For the beta helpers',
    diagLine: 'If something odd happened, copy this and send it to us — it never leaves the iPad on its own.',
    diagCopy: 'Copy report',
    diagCopied: 'Copied — thank you',
    diagClear: 'Clear the notes',
    diagEmpty: 'Nothing to report — all quiet.',
    sync: {
      title: 'Family sync',
      offLine: 'Keep progress safe across iPads. Everything works without it, always.',
      createButton: 'Start a family',
      joinButton: 'Join a family',
      pinLabel: 'Family PIN (4 to 8 digits)',
      codeLabel: 'Family code',
      codeShow: 'Your family code is {code}. Write it inside the piano bench — with the PIN it links another iPad.',
      onLine: 'Linked to family {code}.',
      lastSync: 'Progress last carried over {when}.',
      neverSync: 'Waiting to carry progress over.',
      failing: 'Having trouble reaching home base — it will keep trying quietly.',
      syncNow: 'Carry it over now',
      leaveButton: 'Unlink this iPad',
      leaveLine: 'Progress stays on this iPad; it just stops carrying over.',
      deleteButton: 'Delete family data everywhere',
      deleteLine: 'Removes the family and its progress from home base. iPads keep their local copies.',
      wrong: 'That code and PIN did not match. Have another look.',
      confirm: 'Yes, delete it everywhere'
    }
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
