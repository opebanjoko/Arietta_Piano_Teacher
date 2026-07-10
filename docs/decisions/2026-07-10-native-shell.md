# Decision: thin native shell for MIDI (SR-MID-02)

**Date**: 2026-07-10 (Phase 6) · **Owners**: Dev + PM · **Status**: decided

## Context

SR-MID-01 wants a connected digital piano (USB or BLE MIDI) preferred over the
microphone automatically. iPad Safari — the primary target — does not ship
Web MIDI, so browser-only Arietta cannot see MIDI devices there. REQUIREMENTS
§9.3 deferred the shell decision to Phase 6 planning.

## Decision

1. **Capacitor is the shell** if and when device MIDI on iPad becomes a
   product requirement. It wraps the existing PWA as-is (WKWebView), keeps
   the single codebase, and a community/native plugin can bridge CoreMIDI to
   the page as `midimessage`-shaped events feeding the same adapter.
2. **The shell is not built in Phase 6.** The Web MIDI adapter
   (`app/src/audio/midi.js`) ships now and already works in Chromium
   browsers; on iPad Safari `requestMIDIAccess` is absent, the adapter
   resolves to null, and the mic path carries the lesson — zero cost.
3. **Wrap-additivity is a standing constraint**: no module may assume a
   browser-only API at import time (the adapter feature-detects at call
   time); the PWA must keep working unchanged inside a WKWebView.

## Why not alternatives

- **Build the shell now**: no beta family owns a MIDI piano; the App Store
  pipeline, signing, and update cadence are real costs with no user today.
- **WebRTC/BLE workarounds in Safari**: Web Bluetooth is also absent on iOS
  Safari; there is no browser-only path to BLE MIDI there.

## Revisit when

A beta/real family wants silent-practice MIDI on iPad, or polyphony's piano
validation lands No-Go (MIDI then becomes the chord path and this decision
upgrades to "build now").
