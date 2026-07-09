# Arietta app

Production application (PLAN.md Phase 1+). The `.dc.html` in the repo root is the
design prototype; this is the product.

## Stack (SR-PLT-05 decision, recorded Phase 1 start)

**Vite + Preact, plain JS.** Chosen over React (10x smaller runtime, same component
model as the prototype), vanilla JS (three screens of reactive UI get verbose), and
Svelte (new idiom for no offline/perf advantage here). `vite-plugin-pwa` generates the
offline precache (SR-PLT-01); fonts are vendored in `src/fonts` — no CDN or third-party
requests at runtime (SR-PLT-04). Engine, content, and store logic are dependency-free
ES modules testable with `node --test` (SR-VER-02/03).

## Commands

    npm run dev        # dev server
    npm run build      # production build + service worker (dist/)
    npm run preview    # serve the production build
    npm test           # engine/content/store unit tests + full-course E2E harness

## Layout

    src/core/      NoteEvent model, note math, course engine (pure logic)
    src/content/   course data (units, lessons, songs) and voice strings (pure data)
    src/store/     IndexedDB progress store, versioned schema
    src/audio/     Web Audio synth voice
    src/ui/        Preact components and screens
    test/          node --test suites (no browser needed)
