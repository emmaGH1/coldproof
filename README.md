# coldproof

Verify cold-chain sensor events against the Eclipse aeriOS IOTA Tangle.

Built for **Veles Hack 2026 — Challenge 2 (O-CEI, Trust Ledger Traceability)**.

When a vaccine pallet arrives warm, the shipper's log often says everything was fine. coldproof gives the receiver a way to settle that dispute with evidence: every sensor reading is signed, hash-linked to the previous one, anchored as a block on the aeriOS IOTA Tangle, and indexed in a parallel relational database. Any event can then be checked against the Tangle and gets a clear verdict.

> Status: project harness only. No application code yet. See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## What it will do (approved scope)

- Publish signed, hash-chained cold-chain sensor readings through a fork of the aeriOS Messages API.
- Forward each inserted message (with its block ID) to a traceability API backed by a relational DB.
- Search by block ID, date, tag and sensor.
- Verify each event: block is **solid** (Hornet metadata), **content matches** the Tangle (Hornet block), **signature valid**, **chain intact** (no gaps or replays).
- Group temperature breaches into an incident timeline.
- Live demo: edit a DB row and watch coldproof catch the mismatch against the Tangle.

## Stack

- Eclipse aeriOS IOTA Tangle (Hornet 2.0 Stardust + coordinator + dashboard), run locally via Docker.
- Endpoints used: `GET /api/core/v2/blocks/{blockId}` and `GET /api/core/v2/blocks/{blockId}/metadata`.

## License

Apache-2.0. See [LICENSE](LICENSE).
