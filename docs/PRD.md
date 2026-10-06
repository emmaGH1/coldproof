# PRD — coldproof

**User:** QA operator receiving a pharma cold-chain shipment.

**Painful moment:** the pallet arrives warm; the shipper says the log shows it was fine; nobody can prove whose data is true.

**Core promise:** check any shipment event against the Tangle and get a clear verdict, so disputes are settled with evidence instead of trust.

**Sponsor integration role:** the aeriOS IOTA Tangle is the tamper-proof witness for every event.

## Primary journey

1. Simulated sensors publish signed, hash-linked readings via the Messages API fork.
2. The fork forwards each message + block ID to the traceability API, which stores it with enriched fields.
3. A temperature breach becomes an incident.
4. The operator opens the incident timeline; each event shows solid / content match / signature / chain verdicts with its block ID.
5. Demo climax: a DB row is edited; the event turns to TAMPERED with a DB-vs-Tangle diff.

## Must have

- aeriOS Tangle stack running (Hornet, coordinator, dashboard :31011).
- Messages API fork forwarding messages and block IDs.
- Cold-chain sensor simulator with ed25519 signatures, sequence numbers, previous-hash links.
- Relational traceability DB + REST search by block ID, date, tag, sensor.
- Verdicts: solid, content match, signature valid, chain intact.
- Incident timeline view.
- Explorer UI with block IDs linking to the Hornet dashboard.
- Scripted tamper action and live detection.
- Apache-2.0, README, public repo.

## Nice to have (only after the core path works)

MQTT live feed; alerts on critical events; shareable auditor receipt; forge/replay attack buttons.

## Non-goals

Multi-node/multi-cluster, Helm/K8s, auth, AI, public Tangle deployment, non-cold-chain domains.

## Acceptance criteria

- A judge can search by each of block ID, date, tag, sensor and get results from the DB.
- Every listed event re-verifies live against Hornet (solid + content).
- Editing a stored reading flips that event to TAMPERED within one verification pass, with the diff shown.
- A missing sequence number or replayed message is flagged as a chain break.
