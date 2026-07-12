# Arietta — a gentle piano teacher

A family iPad sits on the music stand of a real piano. Arietta listens through
the microphone, hears which keys the student plays, and walks beginners through
a course of units, songs, and drills — patient, encouraging, never in a hurry.
Progress lives on the device; an optional family sync carries it across iPads.

Beta: https://web-production-415a7.up.railway.app (HTTPS is required for the
microphone; without it, the tap keyboard carries every lesson).

## Layout

| Path | What it is |
|---|---|
| `app/` | The product: Vite + Preact PWA — course engine, pitch detection, UI ([app/README.md](app/README.md)) |
| `server/` | Family-sync backend: node:http + SQLite, deployed as Railway service `api` |
| `spike/` | Phase 0 listening spike and gate runbooks (throwaway, kept for the record) |
| `REQUIREMENTS.md` | Source of truth for product and pedagogy decisions |
| `SYSTEM_REQUIREMENTS.md` | Numbered SR-* system requirements with traceability |
| `PLAN.md` | Build sequence: phases, gates, risks |
| `docs/` | Beta protocol and decision records |
| `Arietta Piano Teacher.dc.html` | The original design prototype the app was translated from |

## Run

    cd app && npm install
    npm run dev      # dev server (tap keyboard works everywhere; mic needs HTTPS or localhost)
    npm test         # engine/content/store units + full-course E2E harness

Sync backend: `cd server && npm install && npm test`.

Deploy notes (Railway staging-dir workaround included) are in
[app/README.md](app/README.md).

## License

See [LICENSE](LICENSE).
