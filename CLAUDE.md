# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

Arietta is a gentle at-home piano teacher for beginners. A family iPad sits on the music stand of a real piano; the app listens through the microphone, hears which keys the student plays, and walks them through a beginner course of units, songs, and drills. Progress is local-first on the device; Phase 2 adds an optional family account with progress sync via a small backend on Railway (REQUIREMENTS.md §9.5).

**`REQUIREMENTS.md` is the source of truth for product and pedagogy decisions** — the course map, the hint ladder, microphone behavior, tone of voice. **`SYSTEM_REQUIREMENTS.md` translates it into numbered, phased system requirements** (subsystems, interfaces, latency/accuracy targets, verification) with traceability back to REQUIREMENTS.md sections. **`PLAN.md` sequences the build** (Phases 0–6, gates, risks); check it to know what phase work belongs to. Read these before any feature work.

The current `.dc.html` is a **prototype**: its "mic simulator" tap keyboard stands in for real microphone pitch detection, which is a v1 requirement (REQUIREMENTS.md §4). The tap keyboard remains in the real product as a fallback and dev/test simulator.

## What this is (code)

A single **DC (Document Component)** file. There is no build step and no package manager for the app itself — it is one `.dc.html` component rendered by a runtime that pulls React from a CDN at load time.

Two files:
- `Arietta Piano Teacher.dc.html` — the component (template + logic). This is where all app work happens.
- `support.js` — the DC runtime. **Generated, do not edit.** Its header says: rebuild with `cd dc-runtime && bun run build` (the `dc-runtime` TypeScript source is not part of this repo).

## Running

Open the `.dc.html` over a local HTTP server (so the relative `./support.js` resolves) with an internet connection — the runtime loads React 18, ReactDOM, and Babel from `unpkg.com` at boot (`support.js` ~line 1037). For example: `python3 -m http.server` then open the file. There are no tests, linter, or build for the app.

## Architecture

A `.dc.html` has two parts, both consumed by `support.js`:

1. **`<x-dc>` template** — HTML with a small custom templating layer:
   - `{{ expr }}` interpolates values into text and attributes.
   - `<sc-if value="{{ ... }}">` conditional; `<sc-for list="{{ arr }}" as="item">` loops. The `hint-placeholder-*` attributes only feed the visual editor's empty-state preview.
   - `onClick="{{ handler }}"` (and `onChange`, `onInput`, etc.) bind DOM events to functions from the logic.
   - `style-hover="..."` applies inline styles on hover.

2. **`<script type="text/x-dc" data-dc-script>`** — `class Component extends DCLogic`. React-like: `this.state` + `this.setState`, and `componentDidMount` / `componentDidUpdate` / `componentWillUnmount`. Editor-editable props are declared in the script tag's `data-props` attribute (JSON).

### The key rule: logic lives in the class, not the template

`{{ }}` expressions are **not** arbitrary JavaScript. The runtime's `resolve()` (`support.js` ~line 205) only supports dotted path lookups, equality/inequality operators, `!` negation, and literals — no function calls, no arithmetic, no member expressions with args.

Everything the template renders comes from **`renderVals()`**, which returns a flat object of primitives, handler functions, and pre-built arrays. So the pattern is: compute in `renderVals()` (or helpers it calls), expose a named value, reference that name in the template. When adding UI, add the computed value to the object `renderVals()` returns rather than putting logic in the markup.

### App-specific structure (in the `.dc.html`)

- Three screens switched by `state.screen` (`'home'` | `'lesson'` | `'song'`), each guarded by an `<sc-if>`. The mic-simulator piano keyboard shows on every screen except home.
- Note constants at the top of the constructor: `WHITE`/`BLACKS` (keys), `FREQ` (Web Audio frequencies), `NOTE_Y` (staff pixel positions), `STEPS` (lesson script), `SONG` (Ode to Joy sequence).
- `playTone()` synthesizes notes with the Web Audio API (triangle + sine oscillators through a lowpass).
- Input is simulated: tapping a key calls `tapKey()` → `evalLesson()` / `evalSong()`, which compare against the current target and produce hints via `hintFor()`. There is no real microphone.
- Timers go through `this.to()` so they are tracked and cleared on unmount / screen change (`clearTos()`).
