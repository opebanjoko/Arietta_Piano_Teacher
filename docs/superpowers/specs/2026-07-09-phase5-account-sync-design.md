# Phase 5 design — Account & sync + tempo depth

Date: 2026-07-09. Covers PLAN.md Phase 5: SR-BCK-01..03, SR-STO-04/05,
SR-CRS-09, SR-OUT-05, SR-AUD-09.

## Decisions made with the product owner

- **No email/Apple auth yet.** Beta-stage households authenticate with a
  server-issued family code plus a family-chosen PIN. This intentionally
  deviates from SR-BCK-02 (magic link / Sign in with Apple) as an interim
  beta measure; real auth is deferred, and the token layer is designed so
  it can be added without reworking sync.
- **Full Phase 5 scope**: sync backend, tempo depth, and C3 calibration
  prep, built incrementally in that order.
- **Stack**: plain Node (`node:http`) + `better-sqlite3` on a Railway
  volume, deployed as a second service (`api`) in the existing `arietta`
  Railway project. No framework, no managed database; right-sized for
  beta scale and testable with `node --test` like the rest of the repo.

## 1. Backend service (`server/`)

- SQLite file on a Railway volume at `/data/arietta.db`.
- Tables:
  - `households` — id, family code, PIN hash (scrypt via `node:crypto`),
    createdAt.
  - `devices` — token hash → household id, createdAt, lastSeenAt.
  - `progress_docs` — (household id, profile id) → doc JSON, updatedAt.
- Per-profile settings ride inside the progress doc; the doc is the single
  synced unit (SR-BCK-01 stores nothing else — no audio, no events, no
  analytics).
- Endpoints (JSON over HTTPS):
  - `POST /households` — `{pin}` → `{code, token}`. Server issues a
    6-character family code from an unambiguous alphabet (no 0/O/1/I).
  - `POST /households/link` — `{code, pin}` → `{token}`. Rate-limited
    (per-code counter with lockout) so the PIN cannot be brute-forced.
  - `GET /sync` — bearer token → all profile docs for the household.
  - `PUT /sync` — push local docs; **server merges with stored docs via
    the shared merge module before writing**, returns merged state.
  - `DELETE /households` — PIN re-entry required; deletes the household,
    its devices, and all progress docs (SR-BCK-03).
- Device auth: opaque random bearer token issued at create/link, stored
  hashed server-side, kept in IndexedDB client-side.
- CORS: allow only the app's origin.

## 2. Shared merge core

One pure module (`app/src/sync/merge.js`) implements SR-STO-05; the
server runs the same logic. Because each Railway service uploads only its
own directory, the server keeps a committed copy (`server/merge.js`) and
a unit test asserts the two files are byte-identical — one canonical
implementation, no build machinery, and the test fails loudly if they
drift.

- Progress doc shape: `{profileId, name, lessons: {lessonId: {completed,
  bestCount, stepIndex, lastPlayedAt}}, settings, updatedAt}`.
- `mergeDocs(a, b)` per lesson: most-progress-wins —
  `completed > in-progress (stepIndex present) > untouched`; within the
  same state the higher stepIndex / bestCount wins; `lastPlayedAt` is the
  max. Settings resolve whole-doc by latest `updatedAt`.
- The merge is idempotent and commutative, so merging on pull (client)
  and again on push (server) is always safe. Sync is state-based; no
  operation queue — just a per-profile dirty flag.
- Known limitation (accepted for beta): profiles created independently on
  two devices before linking union by id — a duplicate "Maya" appears
  once and the family deletes one. No profile-merge UI in this phase.

## 3. Sync client (`app/src/sync/`)

- **Additive (SR-STO-04)**: with no family linked, the module is inert;
  every v1 flow is untouched.
- Triggers: app start, profile switch, lesson/song completion, settings
  change, connectivity regained. Debounced; exponential backoff on
  failure; failures are silent — the only sync surface is a quiet status
  line in Settings.
- Flow: pull → merge into local per profile → push dirty docs (server
  merges again on write).
- Phase gate: the existing E2E harness runs with the sync URL pointed at
  a dead endpoint to prove local-first regression (PLAN.md Phase 5 gate).

## 4. Settings UI — "Family sync" section

Create family (choose PIN → app displays the family code to write down),
join family (code + PIN), sync status line, leave family (local data
stays), delete family data everywhere (PIN re-entry). Lives in the
existing Settings screen behind its existing parent-facing pattern.

## 5. Tempo depth (SR-CRS-09, SR-OUT-05)

- **Practice tempos**: timed pieces playable at slow / medium / full
  (≈0.6 / 0.8 / 1.0 of authored BPM, rounded), student-chosen on the play
  screen, all equally celebrated — no nudging toward full tempo. Engine
  tolerance windows already scale with tempo; this plumbs the chosen
  multiplier through engine, metronome, and playback.
- **Steadiness view**: after a timed piece, a number-free SVG timeline —
  pulse marks with the student's onsets drawn against them so rushing and
  dragging are visible. The engine's timed state is extended to retain
  per-run onset offsets. Caption reuses the qualitative voice strings;
  no numerals, percentages, or grades anywhere (§9.2).
- **Backing tracks**: synthesized accompaniment scheduled on the timing
  grid at the chosen tempo through the existing Web Audio voice, quieter
  than the student, gated by the SR-OUT-02 playback gate (the app never
  listens to itself).

## 6. C3 calibration prep (SR-AUD-09)

Detector confidence thresholds become tunable per pitch region with an
independent low-register band (below ~E3). Mic check gains an optional
low-note calibration step (prompts for C3, adjusts the band threshold).
Calibration is stored in device-local settings and deliberately **not
synced** — it is per-device, per-room.

## 7. Error handling

- Server: malformed requests → 400 with terse JSON error; unknown token →
  401; rate-limited link → 429. No stack traces or PII in responses or
  logs.
- Client: any sync error (network, 4xx/5xx, quota) marks the attempt
  failed, schedules backoff, and never surfaces to the student. Settings
  shows "last synced …" or "waiting to sync".
- Merge never throws on missing fields: absent lessons/settings are
  treated as untouched/empty.

## 8. Testing

- `merge.js`: unit tests for commutativity, idempotence, every
  most-progress case, and missing-field tolerance.
- Server: `node --test` against in-memory SQLite (`:memory:`), endpoints
  exercised with `fetch` on an ephemeral port — create/link/sync/delete,
  auth failures, rate limiting, concurrent-push merging.
- Sync client: fake fetch + fake db; two-device conflict scenarios,
  offline/backoff behavior, inert-without-account.
- Tempo/steadiness: pure layout + engine extensions unit-tested; E2E
  harness extended to a timed piece at a practice tempo.
- Regression gate: full existing test suite plus E2E with backend
  unreachable.

## 9. Build order (incremental, each step verified before the next)

1. Shared merge core + tests.
2. `server/`: schema, endpoints, tests.
3. Deploy `api` service to Railway (volume, domain, CORS), smoke-test.
4. Sync client + store integration + tests.
5. Settings "Family sync" UI.
6. Practice tempos.
7. Steadiness view.
8. Backing tracks.
9. C3 calibration prep.
