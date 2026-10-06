# AGENTS.md

Rules for any agent working in this repo.

- Canonical process: `HACKATHON_PLAYBOOK.md` on `main` of `emmaGH1/emmaGH1`. Re-read the relevant phase before starting it.
- Before working, read `docs/JUDGING.md`, `docs/IMPLEMENTATION.md`, `docs/CURRENT_STATE.md`. After working, update `docs/CURRENT_STATE.md`.
- Human approval gates: idea, scope, visual direction, design probe, implementation plan, final submission. Do not pass a gate silently.
- The mandatory Track 2 baseline (publisher, parallel DB, Messages API forward, search, solid check, content check) is never cut without Emma's approval.
- Never fake Tangle data. Every block ID shown must come from a real Hornet node. Clearly label anything seeded or simulated (the sensor readings are simulated; their Tangle anchoring is real).
- Hornet is Stardust (2.0). Do not use current IOTA Rebased docs; use legacy Stardust docs.
- Docker Hub may 429 on the VM: pull `mirror.gcr.io/iotaledger/<image>` and retag.
- Fresh-code rule: all code in this repo is written during the event (6–8 Oct 2026).
- Never commit secrets or `.env` files.
- Demo voice scripts: no staccato sentences.
