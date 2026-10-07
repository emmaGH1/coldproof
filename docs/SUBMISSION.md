# TAIKAI submission draft — awaits Emma's approval

This is copy to adapt to the actual form, not an assertion that every field is required. Do not submit, merge, publish a deployment, or contact organizers without explicit approval.

## Slides

The official three-slide PDF is `docs/coldproof-submission-slides.pdf`.

## Project name

coldproof

## Team name

coldproof (`TEAM_NAME=coldproof` in `infra/.env.example`).

## Track

Challenge 2 — O-CEI / Trust Ledger Traceability

## Short description

When cold-chain logs disagree, verify every sensor event against the Eclipse aeriOS IOTA Tangle.

## Problem and solution

A pharmaceutical shipment arrives warm, but the shipper's log says the temperature was safe. Coldproof lets an operator investigate that disagreement using a signed, hash-linked event record anchored to the aeriOS Tangle, rather than trusting an editable database.

A Python publisher simulates a pallet sensor, signs each reading with Ed25519, and links it to the previous message. Our adaptation of the aeriOS Messages API inserts the message into a real Hornet Stardust node and forwards the returned block ID and enriched metadata into a separate Postgres-backed traceability application.

Operators search by block ID, tag, sensor or UTC date and inspect a temperature-excursion timeline. Every reading is rechecked for block solidness, exact ledger content, sensor signature and custody-chain integrity.

The demonstration changes one database temperature from 10.24 °C to 5.00 °C. Live verification returns TAMPERED and shows the database-versus-Tangle values. Deleting a predecessor instead produces CHAIN_BROKEN; reset restores the original signed records without writing new ledger blocks.

## Challenge coverage

- Publisher application sends signed messages through the Messages API.
- Separate relational traceability application stores message, block ID, tag, actual insertion timestamp and receipt timestamp.
- Modified Messages API forwards inserted messages and retries failed forwarding from a persistent outbox.
- REST lookup/search supports ID, date, tag, sensor and shipment.
- Hornet `/api/core/v2/blocks/{blockId}/metadata` checks solidness.
- Hornet `/api/core/v2/blocks/{blockId}` supplies the original payload for content comparison.
- Additional complexity: explorer UI, sensor/shipment tracing, signed custody chains, incident timeline and live tamper/delete evidence.

## Technology

Eclipse aeriOS private IOTA Tangle; Hornet 2.0.2 Stardust; INX coordinator/dashboard; Python; Flask/Gunicorn; Ed25519; SHA-256; PostgreSQL 16; Next.js/TypeScript; Docker Compose.

## Repository

https://github.com/emmaGH1/coldproof

Implementation is on the feature branch until Emma approves merging. Link the exact PR/branch in the submission so judges do not mistake the old main-branch design probe for the completed build.

## Evidence and honesty

- Sensor readings and the shipment scenario are simulated; ledger blocks, signatures and live verification are real.
- Live API integration demonstrated 96 readings passing all four checks, tamper mismatch, deleted-chain detection and restoration.
- Unit HTTP fixtures are explicitly mocked and are not substituted for live verification.
- This is a private, trusted-coordinator Tangle, not a production public network or real hardware deployment.
- MQTT, alerts, auditor receipts and public deployment are not implemented or claimed.
- No demo video is required or claimed.

## Demo

Use the five-minute script in `DEMO.md` for the live judge presentation. The complete system runs locally through Docker Compose; a standalone Vercel deployment would omit required Hornet, Postgres, Python Messages API and persistent-outbox services.

## License and authorship

Apache-2.0. Sponsor adaptation provenance is in `messages-api/NOTICE`; sponsor Tangle configuration is unchanged. New implementation code was written during the event, using the official sponsor boilerplate and framework dependencies.

## Human checklist

1. Review the working app and implementation PR.
2. Approve merging if the source-of-truth main branch should contain the implementation.
3. Confirm participant/team fields in TAIKAI; no names or membership details are invented here.
4. Upload `docs/coldproof-submission-slides.pdf`.
5. Approve final submission and submit before **7 October 2026, 14:59 UTC / 16:59 Valencia**.
6. Prepare for the **8 October, 07:30 UTC / 09:30 Valencia** pitch.
