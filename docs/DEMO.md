# Demo

## Before the pitch

Run `scripts/up`, then `scripts/seed` only if this is a fresh dataset. Run `scripts/reset` and `.venv/bin/python scripts/check`. Keep the app, a terminal in the repo root, and the upstream dashboard available. Do not expose local `.env` contents or the sensor key.

Select sequence 83 (10.24 °C), the default peak, in the workspace. The primary proof path fits 60–90 seconds: open incident → inspect four passing checks → SQL tamper → wait for the poll → reveal DB/Tangle difference → reset.

This is a five-minute **pitch script**, not a claim that a recording has been made. Aim for natural pacing, with pauses to read the evidence. The hard deadline is five minutes; do not spend the opening scrolling marketing content.

## 0:00–0:35 — The dispute

**Screen:** the full-screen trace, then open the excursion within 10 seconds.

“Imagine a vaccine shipment arriving warm while the shipper's database insists the temperature was safe. The receiver doesn't just need another dashboard; they need a way to show whether the event record changed after it was captured. Coldproof turns that disagreement into a checkable evidence trail, using the Eclipse aeriOS IOTA Tangle as the independent record of what our sensor reported.”

## 0:35–1:15 — What is real

**Screen:** architecture diagram, briefly; then return to the workspace.

“Our publisher simulates a pallet sensor and signs each reading with Ed25519, linking it to the previous reading with a sequence number and hash. The adapted aeriOS Messages API inserts each message into a real local Hornet Stardust node, then forwards the returned block ID and message into our separate Postgres-backed traceability application. The temperature measurements are simulated, but the signatures, the Tangle blocks, and the verification requests you're seeing are real.”

## 1:15–1:55 — Find the evidence

**Screen:** search for sensor `PAL-0042-S1`, tag `coldproof.coldchain`, and the UTC interval 2026-10-06 19:45 through 21:00; inspect a result.

“The database gives operators the search path that Hornet's block-by-ID API doesn't provide. They can find a reading by block ID, tag, sensor, or time, rather than needing to know a ledger identifier in advance. Here we're narrowing the shipment to the temperature excursion. Every result retains its actual block ID, and selecting an event brings us straight to the incident evidence instead of treating database search as proof that the record is trustworthy.”

## 1:55–2:35 — Explain the four checks

**Screen:** peak event 83; four `OK` cells and block ID.

“For this event, Coldproof asks Hornet whether the block is solid, fetches its tagged payload and compares it with the database, checks the registered sensor signature, and checks its predecessor in the custody chain. Those are four different claims, so we show them separately. A matching database row isn't enough for the anchored verdict, and if Hornet is unavailable we say unverified rather than filling in a green result.”

## 2:35–3:40 — Live tamper climax

**Terminal:** `scripts/tamper --seq 83`. Return to the already-open incident workspace. Wait for the real poll/status change, not a pre-rendered animation.

“Now we'll change only the database to make the peak look like a safe five degrees. We aren't editing the Tangle, publishing a replacement block, or triggering a pretend warning in the UI. The workspace is still checking the same event against Hornet. As the next verification finishes, its verdict becomes tampered: the database says five degrees, but the Tangle still contains the original ten-point-two-four-degree reading. The signature fails too, and the next event can no longer match its predecessor's hash.”

**Hold:** the `TAMPERED` verdict and `DATABASE ≠ TANGLE` evidence for at least 10 seconds.

## 3:40–4:20 — Recovery and chain deletion

**Terminal:** `scripts/reset`, optionally `scripts/delete --seq 83`; select sequence 84; finish with `scripts/reset`.

“Restoring the original signed record makes verification pass again without changing or inserting any ledger block. Deleting a record is a different failure: the next event still exists on the Tangle, but its predecessor is missing, so the chain is broken. Keeping those failures distinct helps an operator understand whether they're looking at changed evidence, an incomplete database, or an unavailable verification service.”

If running behind, demonstrate reset only and describe deletion as a separately tested API case, not something performed on screen.

## 4:20–5:00 — Boundaries and close

**Screen:** final restored verdict, then the repository/architecture.

“This build covers the challenge's publisher, modified forwarding API, relational index, REST search, solidness check and content comparison, with signed custody chains and an incident explorer on top. It runs on the sponsor's unchanged private Tangle stack, which still has a trusted coordinator; a signed sensor report also isn't a guarantee that the physical sensor is accurate. What we demonstrate is narrower and useful: when cold-chain logs disagree, the operator can compare the disputed event with its original ledger record and show the evidence.”

## Real user flow versus judge flow

- **Real user:** register a trusted sensor, publish readings, search shipment evidence, investigate excursions, independently retrieve ledger evidence, and handle any mismatch.
- **Judge:** use the honestly labeled seeded shipment and known peak to remove setup time, then perform a real SQL edit and live Hornet verification.
- **Never fake:** block IDs, signature outcomes, solidness, content matches, or the tamper verdict.
- **Fallback:** if Hornet is unavailable, show `UNVERIFIED`; if using a recording, explicitly say it was recorded from an earlier real run. Do not silently substitute fixture results.
