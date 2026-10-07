# coldproof

Verify cold-chain sensor events against the Eclipse aeriOS IOTA Tangle.

Built for **Veles Hack 2026 — Challenge 2 (O-CEI, Trust Ledger Traceability)**.

When a vaccine pallet arrives warm, the shipper's log often says everything was fine. coldproof gives the receiver a way to settle that dispute with evidence: every sensor reading is signed, hash-linked to the previous one, anchored as a block on the aeriOS IOTA Tangle, and indexed in a parallel relational database. Any event can then be checked against the Tangle and gets a clear verdict.

**Working local build.** The mandatory publisher → Messages API → Hornet → forwarding → Postgres → search/verification path is implemented. The sensor is **simulated**; signatures, block IDs and Hornet verification are **real**. See [current state](docs/CURRENT_STATE.md) for tested behavior and limitations.

## What it does

- Publish signed, hash-chained cold-chain sensor readings through a fork of the aeriOS Messages API.
- Forward each inserted message (with its block ID) to a traceability API backed by a relational DB.
- Search by block ID, date, tag and sensor.
- Verify each event: block is **solid** (Hornet metadata), **content matches** the Tangle (Hornet block), **signature valid**, **chain intact** (no gaps or replays).
- Group temperature breaches into an incident timeline.
- Live demo: edit a DB row and watch coldproof catch the mismatch against the Tangle.

## Run locally

Requirements: Docker with Compose v2, Git, Python 3.10+ with `venv`, and Node.js 22/npm. Allow Docker several GB of disk and memory. Run from a checkout of the implementation branch until its PR is merged.

```bash
git clone https://github.com/emmaGH1/coldproof.git
cd coldproof
# If reading this on an unmerged PR, check out that PR's branch first.
scripts/install
scripts/up
scripts/seed
```

Open http://localhost:3000 and choose **Open the dock-3 excursion**. Search is at http://localhost:3000/search; the upstream Hornet dashboard is at http://localhost:31011.

`scripts/up` uses two Compose files behind one command: the **unchanged, commit-pinned sponsor stack** and our separate application stack. It downloads the aeriOS source into ignored `infra/tangle/`, bootstraps a private Stardust network once, and starts Hornet, coordinator, dashboard, Postgres, production Next.js and the forwarding API. Missing IOTA images are pulled through Google's Docker mirror and retagged; the sponsor configuration is not edited.

`scripts/setup` generates random local database and ingest credentials. Configuration, sensor private keys, reset receipts, database files and outbox records are ignored by Git. Do not delete `.local/` if you need to restore the seeded events; do not register the same sensor ID under a new key.

The publisher sends 96 signed readings at simulated 15-minute intervals for `SHP-VLC-2210`, with six breaches of the illustrative **2–8 °C** range and a peak of **10.24 °C**. Blocks are inserted now, not backdated: sensor `ts` and actual `insertedAt` are separate fields. Seeding is intentionally refused if the shipment already exists; use reset instead.

## Live tamper demo

Keep the incident workspace open on sequence 83 (the peak; selected by default):

```bash
scripts/reset
scripts/tamper --seq 83   # SQL UPDATE: DB now says 5.00 °C; the Tangle still says 10.24 °C
scripts/reset            # Restore the original signed DB data; no new Tangle blocks
scripts/delete --seq 83  # Optional: sequence 84 reports CHAIN_BROKEN
scripts/reset
```

The workspace polls verification every five seconds, after each preceding request completes. On tampering, it shows **TAMPERED**, failed content/signature checks, explicit DB-versus-Tangle values, and a detached orange trace tick. Editing a predecessor also breaks its successor's chain check.

## REST API

| Method | Route | Purpose |
|---|---|---|
| POST | Messages API `:5555/upload?node=iota-hornet` | Insert tagged JSON into real Hornet; return real `blockId` and forwarding status |
| POST | `/api/ingest` | Authenticated, schema/signature-checked Postgres insert; identical retries are idempotent; conflicting evidence returns 409 |
| GET | `/api/events?blockId=&tag=&sensor=&shipment=&from=&to=` | Parameterized search; inclusive UTC date range applies to sensor `ts`; maximum 1,000 results |
| GET | `/api/events/{blockId}/verify` | Recompute solid, content, ed25519 signature and previous-hash/sequence checks |
| GET | `/api/events/{blockId}/block` | Read-only proxy to the configured Hornet block endpoint |
| GET | `/api/shipments/{shipmentId}` | Verified readings and temperature-excursion timeline |
| GET | `/api/health` | Database reachability and fresh, synchronized Hornet milestones; raw Hornet `isHealthy` is reported separately |

Publishing and ingestion require `Authorization: Bearer <INGEST_TOKEN>`. The publisher reads the ignored local configuration; never paste the token into a public request example. Read-only routes are unauthenticated for this local demonstration.

Verification verdicts:

- **ANCHORED:** all four checks pass.
- **TAMPERED:** stored content differs from the returned Tangle payload, or the registered signature fails.
- **CHAIN_BROKEN:** a sequence is missing/duplicated or its previous hash does not match.
- **PENDING:** the matching block is not yet solid.
- **UNVERIFIED:** Hornet evidence or a trusted key is unavailable. A missing/pruned block alone is **not** called tampering.

Solidness is not milestone confirmation. The demo blocks observed during the sprint are solid but not milestone-referenced; the sidebar explicitly reports that limitation. **ANCHORED is the four-check verdict against this node, not a claim of ledger finality.**

## Tests

After installation:

```bash
npm --prefix web test
npm --prefix web run lint
(cd web && npx tsc --noEmit)
npm --prefix web run build
.venv/bin/python -m unittest discover -s messages-api -p 'test_*.py' -v
.venv/bin/python scripts/check
.venv/bin/python scripts/check-forwarding
```

`scripts/check` needs the running, seeded stack. It uses **real Hornet/Postgres**, exercises REST filters, authentication, schema rejection, idempotency, tamper evidence and deleted-chain detection, and restores the demo in `finally`. Unit tests use explicitly mocked HTTP responses; they do not prove the live sponsor integration.

`check-forwarding` separately takes web offline, inserts a real signed test event, restarts the Messages API while it has a queued receipt, then restores web and checks automatic forwarding and verification. It removes only its isolated test DB row afterward; the real test block remains on the Tangle. Expect a brief preview interruption.

## Stack and trust boundaries

- Eclipse aeriOS IOTA Tangle (Hornet 2.0 Stardust + coordinator + dashboard), run locally via Docker.
- Endpoints used: `GET /api/core/v2/blocks/{blockId}` and `GET /api/core/v2/blocks/{blockId}/metadata`.
- Python signed publisher and Flask/Gunicorn Messages API adaptation with a persistent retry outbox.
- PostgreSQL 16; Next.js 15/TypeScript traceability API and approved cold-chain instrument UI.
- [Architecture](docs/ARCHITECTURE.md), [five-minute demo](docs/DEMO.md), [submission draft](docs/SUBMISSION.md) and [three-slide submission PDF](docs/coldproof-submission-slides.pdf).

This is a **private, coordinator-controlled research Tangle**, not a public production ledger. A valid signature proves that the registered key signed a reading, not that a physical sensor measured it accurately. The database also holds the trusted public-key registry; its administration must be secured in a production system.

Forwarding failures do not undo successful Tangle insertion. The API stores a receipt in an outbox and retries every three seconds; ingestion is idempotent. A crash between Hornet insertion and outbox persistence is not an atomic distributed transaction. An outbox disk failure returns the real receipt with `queued: false`, rather than hiding insertion success.

No MQTT, notifications, auditor receipts, public deployment or real hardware is claimed. The explorer is a single seeded shipment/incident demonstration, not a production fleet management system. Read/verification queries are bounded at 1,000 rows. A standalone Vercel deployment would omit required Hornet, Postgres, Python Messages API and persistent-outbox services; run the complete judge demo locally with Docker Compose.

Run only in a trusted local environment. The upstream development stack is not hardened for internet exposure. The existing Next.js/tooling dependency tree has npm audit findings; see [current state](docs/CURRENT_STATE.md). No force upgrade or public production deployment is claimed.

## License

Apache-2.0. See [LICENSE](LICENSE).
