# Current state

_Updated 2026-10-06._

- Track 2 selected; hybrid concept and scope approved (see PRD).
- Risk proof done: aeriOS Tangle runs locally; insert/read/metadata verified (see ARCHITECTURE).
- Visual territory B, design profile and reference stack approved (see DESIGN).
- **Design probe built** in `web/` (Next.js 15, TypeScript, Tailwind 4, shadcn base-nova):
  - `/` — full-viewport anchored-trace hero.
  - `/shipments/SHP-VLC-2210` — incident workspace.
- Probe data: 96 simulated readings in `web/src/data/probe-shipment.json`, really posted to the local Hornet node (real block IDs, all solid). The workspace re-checks solid + content against Hornet on every request; chain check (seq + prevHash) is computed. Signatures are not implemented yet (shown as "—").
- Known: canonical JSON differs between Python (`5.0`) and JS (`5`). The real simulator should send integer centi-degrees.

**Next action:** Emma reviews the design probe (design checkpoint), then Phase 6 implementation plan.
