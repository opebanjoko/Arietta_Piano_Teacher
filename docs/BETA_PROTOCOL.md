# Arietta family beta — protocol

Owner: QA (protocol, triage). BO judges pedagogy severity. PM owns the cut list.
References: PLAN.md Phase 4, REQUIREMENTS.md section 1 (tone, privacy).

## Who and how long
- At least 2 households, at least 1 child aged 8 or under, two weeks, real pianos.
- Each household gets: an iPad with Arietta installed (PWA, offline verified
  before handoff), a one-page setup sheet, and a contact for questions.

## Setup checklist (per household, before day 1)
- [ ] App installed to home screen; airplane-mode cold start verified.
- [ ] Mic check completed in the room where the piano lives.
- [ ] One profile per player created.
- [ ] Parent shown the Settings diagnostics card and the copy button.

## During the two weeks
- Families play as they like — no scripts. We ask only:
  - if something feels wrong or confusing, note roughly when it happened;
  - when convenient, copy the diagnostics report from Settings and message it
    to us (it contains no recordings and nothing personal beyond the device
    description — see SR-PLT-04).
- Mid-point check-in (day 7): one short call or message thread per household.

## What we collect
- The diagnostics export (app version, device, mic settings, detector timing,
  error/interruption log). Nothing is transmitted by the app itself.
- The family's own words about what happened. No screen recording, no analytics.

## Triage rules (from PLAN.md Phase 4)
- Pedagogy problems (hints confuse the child, wrong difficulty, trust broken
  by false positives) — BO judges; these BLOCK release.
- Polish items (visual nits, wording preferences) — logged, do not block.
- Data loss of any kind — blocks release, no judgment call needed.

## Exit review
- Both households completed Unit 2 or beyond unassisted.
- Zero data-loss incidents; diagnostics logs reviewed for silent mic losses.
- Findings sorted into: release blockers / v1.x fixes / ideas for Course 2.
