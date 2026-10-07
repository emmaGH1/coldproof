# Current state

_Updated 2026-10-07 during the approved core-first sprint._

- Track 2 selected; hybrid concept and scope approved (see PRD).
- Risk proof done: aeriOS Tangle runs locally; insert/read/metadata verified (see ARCHITECTURE).
- Visual territory B, design profile and reference stack approved (see DESIGN).
- **Database-backed application built** in `web/` (Next.js 15, TypeScript, Tailwind 4, Base UI components):
  - `/` — full-viewport anchored-trace hero.
  - `/shipments/SHP-VLC-2210` — incident workspace.
- `/search` — block ID, tag, sensor and UTC date search.
- Messages API adaptation inserts tagged messages into Hornet, saves receipts to a durable outbox and forwards to `/api/ingest`.
- Postgres `events` stores enriched records; `sensors` stores trusted Ed25519 public keys.
- Python publisher signs and chains 96 simulated readings using integer `tempCenti`, resolving the old Python/JavaScript float-canonicalization mismatch.
- Real REST verification checks solidness, exact content/tag, registered signatures, sequence and previous hash.
- The workspace polls verification, labels outages and previous results, and shows DB-versus-Tangle differences and detached trace points.
- Seed, SQL tamper, delete and reset scripts exist; reset preserves original receipts/insertion times.
- Sponsor source/configuration remains unchanged.

## Observed verification

- 96 new signed simulator readings were inserted through the local Messages API into real Hornet and forwarded into Postgres.
- All 96 returned `ANCHORED`, with solid/content/signature/chain checks passing.
- These demo blocks are solid but not yet referenced by a milestone; metadata says `shouldReattach: true`. The app distinguishes solidness from confirmation and makes no finality claim. Raw node health is false while fresh latest/confirmed milestone indexes match; both facts are reported.
- Live REST search by ID, sensor, tag and date passed, including empty results, malformed dates/IDs, missing records and SQL-like input.
- Unauthorized ingestion was rejected, invalid signed content was rejected, and identical valid re-ingestion was idempotent.
- Live SQL edit of sequence 83 produced `TAMPERED`, with DB 500 versus Tangle 1024 centi-degrees; its successor's chain check failed.
- Live deletion of sequence 83 produced a missing-row response and `CHAIN_BROKEN` on sequence 84.
- Reset restored all 96 original rows and the edited event returned `ANCHORED`.
- TypeScript unit tests (including all 96 Python-generated signatures/hashes), lint, type check and production build passed.
- Python forwarding unit tests passed with explicitly mocked HTTP; those are separate from the live integration proof.

## Remaining delivery checks

- Production Compose runtime check and clean-clone startup/seed verification are being finalized.
- Browser inspection/recorded UI testing is not yet claimed for this sprint.
- Submission content is drafted in `SUBMISSION.md`; final submission and merging require Emma's explicit approval.

## Known limits

- Single seeded shipment and excursion; simulated hardware, real ledger anchoring. No physical deployment or production-readiness claim.
- No MQTT, alerts, shareable receipts or public deployment.
- Reads/verification are capped at 1,000 rows.
- Outbox persistence is durable, but not atomic with Hornet insertion.
- Postgres's sensor public-key registry and private coordinator administration require production security controls.
- Seven npm audit findings remain in the existing Next.js/tooling dependency tree after removing the unused shadcn CLI. A breaking framework upgrade was not forced during the deadline sprint; use a trusted local environment, not a public production deployment.
