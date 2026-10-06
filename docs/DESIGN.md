# Design

**Approved territory (2026-10-06): B — Cold-chain instrument.** A dense, precise readout in the spirit of a pharma data logger, with dark slate, icy cyan for temperature, signal orange for breaches, tabular figures, and no glow.

Candidate motif: the temperature trace with a tick for each anchored block ID.

Design profile, references and design probe are pending (Phase 4.5). The system is locked here only after the probe is approved.

## Profile (approved)

- Feel: the calm authority of a calibrated instrument; evidence, not a dashboard.
- Density: high but projector-legible. Tabular mono numbers, hairline rules instead of cards, radius ≈ 2px.
- Colour: near-black slate `#0a0d10`, ice `#8be4f0` for temperature/verified, signal `#ff6a1a` only for breach/tamper. No purple, gradients or glow.
- Type: Archivo (width axis) for display/UI, JetBrains Mono for readings and IDs.
- Not: a Grafana clone, a crypto block explorer, a dark AI-SaaS template.
- Motif: the anchored trace. Every reading is a hairline pinned from the trace to the baseline (the Tangle). Tampering detaches it and flips the verdict stamp to TAMPERED.

## Reference stack (approved)

| Job | Reference | Borrow | Not borrowing |
|---|---|---|---|
| Signature | Vercel Observability | edge-to-edge trace hero, crisp hover readout | light theme, SaaS CTA row |
| Immersion | earth.nullschool.net | data fills the viewport, near-zero chrome | globe, saturated palette |
| Visual language | Teenage Engineering | outline display type, thin glyphs, one rare orange | photography, playfulness |
| Structure | Linear | dense dark workspace, hairlines, calm hierarchy | sidebar nav, rounded cards, chat |
| Structure | Flightradar24 | dense panels over full-bleed canvas, time scrubber | ads, green CTAs, clutter |
| Domain | ELPRO data logger | LCD readout style for temperatures | corporate site |
