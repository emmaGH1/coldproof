# Judging — Veles Hack 2026, Challenge 2 (O-CEI)

Sources: TAIKAI event pages; `O-CEI_challenge_introduction.pdf` (Discord). No public numeric rubric.

## Hard facts

- Submission deadline: **7 Oct 2026, 14:59 UTC** (16:59 Valencia).
- Live pitch 8 Oct, 07:30 UTC. Schedule says **5 min STRICT** (rules say 6) — plan for 5.
- Mentors pre-select teams before pitches.
- Fresh public repo created at the event; README required; license per challenge (assumed Apache-2.0, matching aeriOS repos — confirm with mentors).
- Jury states it rewards **complexity**, via a ladder: MQTT → Explorer UI → traceability by sensor/flow → incident explorer.

## Mandatory baseline ("IOTA Advanced Explorer")

| Item | Our evidence |
|---|---|
| App that sends messages to the Tangle | Sensor simulator → Messages API fork |
| Parallel relational DB with enriched info | Traceability DB (timestamps, tag, sensor, seq, prev hash) |
| a) Messages API also sends to our app | Fork forwards message + block ID |
| b) REST retrieval with search (ID, date, tag) | `/events?blockId=&from=&to=&tag=&sensor=` |
| c) Solid check via block metadata | `GET /api/core/v2/blocks/{id}/metadata` → `isSolid`, milestone |
| d) Content check via block endpoint | `GET /api/core/v2/blocks/{id}` payload vs DB row |

## Where we climb the ladder

Rungs 2–4 done for real: explorer UI, per-sensor custody chain, incident timeline with per-event verification. Live tamper detection as the memorable proof.

## Easiest ways to lose

Missing baseline item; mock Tangle data; using IOTA Rebased docs; wrong license; running over 5 min.
