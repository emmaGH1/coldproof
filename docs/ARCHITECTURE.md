# Architecture

```
simulator/publish.py               messages-api/send_data.py
96 simulated, signed readings ──▶ aeriOS Messages API adaptation ──▶ Hornet 2.0.2
                                           │                       + coordinator
                              persistent forwarding outbox        + dashboard
                                           │                          ▲
                           {blockId, tag, data, insertedAt}           │ GET block
                                           ▼                          │ GET metadata
                             web: POST /api/ingest                    │
                                           │                          │
                               Postgres events + sensors             │
                                           │                          │
                           Next.js REST search and verification ─────┘
                                           │
                          trace hero / search / incident workspace
                                           ▲
                         SQL edit/delete/reset → verify every 5s
```

## Message format

`{ sensorId, shipmentId, seq, ts, tempCenti, prevHash, sig }` — `sig` is a hex Ed25519 signature over sorted-key, compact JSON **without `sig`**. `tempCenti` is an integer, so Python and JavaScript agree on canonical bytes. `prevHash` is SHA-256 of those bytes from the preceding reading for the same sensor/shipment; sequence 1 uses a 32-byte all-zero genesis hash.

The trusted registry stores each sensor's raw 32-byte public key. Messages do not get to nominate their own trust key. The publisher refuses to overwrite an existing registration with a different key.

## Sponsor stack

- Tangle source: https://github.com/eclipse-aerios/iota-tangle at `7803e5d73670c663472e51a820ba32411cca919d`.
- Messages API adaptation: https://github.com/eclipse-aerios/iota-messages-api at `1ed089a1812cb15025e3775f9c8b7d43fdf519bb`, Apache-2.0.
- The upstream `startup.yaml` and `hornet-main.yaml` are run as supplied, with no coordinator/Hornet configuration edits.
- Two Compose files are orchestrated by `scripts/up`, preserving relative paths in the sponsor stack.
- Every application block ID comes from Hornet's insertion response.

## Verified facts (risk proof, 2026-10-06)

- aeriOS stack runs locally with Docker; milestones every few seconds.
- POST `/api/core/v2/blocks` (tagged data payload, type 5) → 201 + `blockId`.
- Metadata returns `isSolid: true`, `referencedByMilestoneIndex`, `ledgerInclusionState: "noTransaction"` within seconds.
- Block endpoint returns hex `tag` and `data` that decode to the original strings.
- The PDF omits `/blocks/` in its endpoint shorthand.

## Trust boundary

The DB event record is treated as untrusted. Verification fetches the **configured** Hornet node's block and metadata without caching, compares complete stored message content and tag, checks the registered Ed25519 signature, and checks sequence/previous hash against related DB rows.

The sidebar returns both stored and Tangle evidence, with explicit field differences. A deleted predecessor leaves its successor intact but with `CHAIN_BROKEN`. A network error or pruned block yields `UNVERIFIED`, not a fabricated verification or a false tampering accusation.

The upstream private coordinator and the sensor registration administrator remain trust boundaries. This proof is about persistence and provenance of a reported reading, not the accuracy of a physical measurement.

## Failure and recovery

Insertion precedes durable receipt persistence and forwarding. A failed traceability request leaves the receipt in an on-disk outbox; a worker retries every three seconds. Identical ingestion is idempotent by block ID; conflicting content/tag gets 409 and is not silently restored. The original insertion timestamp is retained during reset.

There is no atomic transaction across Hornet and Postgres. Disk failure after insertion returns the real receipt with a warning; a process crash in the insertion/outbox gap needs reconciliation. Reset uses ignored receipts from actual successful seed insertions, not invented block IDs.

The workspace re-verifies after each five-second poll interval. If refreshing fails, it explicitly labels the displayed results as previous results.
