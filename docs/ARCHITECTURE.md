# Architecture (draft — finalized in Phase 6)

```
sensor simulator ──(signed reading)──▶ Messages API fork ──▶ Hornet 2.0 (private Tangle)
                                              │                       ▲
                                              └─(msg + blockId)──▶ Traceability API ──▶ relational DB
                                                                      │
                                                     verify: GET /blocks/{id}, /blocks/{id}/metadata
                                                                      │
                                                                 Explorer UI
```

## Message format (planned)

`{ sensorId, shipmentId, seq, ts, tempC, prevHash, sig }` — `sig` is ed25519 over the canonical JSON without `sig`; `prevHash` is SHA-256 of the previous message from the same sensor.

## Verified facts (risk proof, 2026-10-06)

- aeriOS stack runs locally with Docker; milestones every few seconds.
- POST `/api/core/v2/blocks` (tagged data payload, type 5) → 201 + `blockId`.
- Metadata returns `isSolid: true`, `referencedByMilestoneIndex`, `ledgerInclusionState: "noTransaction"` within seconds.
- Block endpoint returns hex `tag` and `data` that decode to the original strings.
- The PDF omits `/blocks/` in its endpoint shorthand.

## Trust boundary

The DB is treated as untrusted; the Tangle is the source of truth. Verdicts are recomputed from Hornet, never cached as truth.
