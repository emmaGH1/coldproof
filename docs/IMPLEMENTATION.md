# Implementation plan

Deadline: **7 Oct 2026, 14:59 UTC**. Budget assumes starting ~15:00 UTC on 6 Oct.

## Layout

```
infra/          docker compose: aeriOS Hornet stack (unmodified) + Postgres + messages-api fork + web
messages-api/   fork of eclipse-aerios/iota-messages-api (Apache-2.0), adds forwarding
simulator/      Python cold-chain sensor publisher (ed25519, seq, prevHash)
web/            Next.js app: explorer UI + traceability REST API (route handlers, Postgres via `pg`)
scripts/        seed, reset, tamper
```

Postgres is the parallel relational DB (a live `UPDATE` on stage is the tamper moment).

## Phases

### 1. Foundation (≈1h)
- **Goal:** one command brings up Hornet, Postgres, the Messages API fork and web.
- **Files:** `infra/compose.yaml`, `infra/.env.example`, `web/Dockerfile`, DB migration `web/db/001_events.sql`.
- **Accept:** `docker compose up` → Hornet healthy, Postgres reachable, web on :3000.
- **Checks:** compose health checks; `curl /api/health`.
- **Don't change:** aeriOS Hornet/coordinator config.

### 2. Ingest path — baseline (a) (≈2.5h)
- **Goal:** simulator → fork → Hornet → fork forwards `{blockId, tag, data, insertedAt}` → `POST /api/ingest` → `events` row.
- **Files:** `messages-api/send_data.py`, `simulator/`, `web/src/app/api/ingest/route.ts`, `web/src/lib/db.ts`.
- **Message:** `{sensorId, shipmentId, seq, ts, tempCenti, prevHash}` + `sig` (ed25519 over canonical JSON, sorted keys, no floats).
- **Accept:** 96 readings land in Postgres with real block IDs; forwarding failure doesn't break the Tangle insert.
- **Checks:** pytest for canonical/sign; ingest route test.

### 3. Search + verification — baseline (b)(c)(d) (≈2.5h)
- **Goal:** REST search and per-event verdicts.
- **API:** `GET /api/events?blockId=&tag=&sensor=&from=&to=`, `GET /api/events/{blockId}/verify` → `{solid, content, signature, chain, tangle, stored}`.
- **Accept:** each search param works; verify hits Hornet `/blocks/{id}/metadata` and `/blocks/{id}`; diff returned on mismatch.
- **Checks:** vitest for chain/signature/content logic; curl evidence in README.

### 4. UI on real data (≈2h)
- **Goal:** the approved probe screens read from the API, plus a search bar and incident detection from DB.
- **Files:** `web/src/app/page.tsx`, `shipments/[id]`, a `search` route; remove the probe fixture.
- **Accept:** hero + workspace render from Postgres; search by block ID/tag/sensor/date works in UI.
- **Don't change:** approved design system (DESIGN.md).

### 5. Tamper climax (≈2h)
- **Goal:** `scripts/tamper` edits one reading (or deletes one row); the workspace re-verifies every few seconds; the row and stamp flip to TAMPERED with a DB-vs-Tangle diff; the trace tick detaches.
- **Accept:** edit → TAMPERED within one poll; delete → chain break on the next reading; `scripts/reset` restores.
- **Checks:** scripted end-to-end test against the local stack.

### 6. Demo + docs (≈1.5h)
- **Goal:** deterministic `scripts/seed` + `reset`; README run steps and architecture diagram; DEMO.md 5-min script (no staccato voice lines). Emma confirmed that submission needs slides, not a video.
- **Accept:** fresh clone → compose up → seed → demo path in under 5 minutes.

### 7. Reliability + submission (≈1h, buffer)
- **Goal:** fresh-clone test, license check, TAIKAI submission draft for Emma's approval.
- **Gate:** Emma approves before submitting.

## Nice to have (only if phases 1–6 are done)
MQTT live feed; breach alerts; shareable auditor receipt; forge/replay buttons.

## Not changing
Approved scope (PRD), approved design (DESIGN), unmodified aeriOS Hornet stack.
