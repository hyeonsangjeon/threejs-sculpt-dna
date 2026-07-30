# Upstream lineage

`threejs-sculpt-dna` extends Vinh Hiển's
[`Three.js-Object-Sculptor-Codex-Plugin`](https://github.com/vinhhien112/Three.js-Object-Sculptor-Codex-Plugin).
The upstream work remains credited in the README and MIT license.

## Integrated source snapshot

- Upstream repository:
  `https://github.com/vinhhien112/Three.js-Object-Sculptor-Codex-Plugin`
- Integrated source commit:
  `543da1fc0e45a703b0ac037fb040ce082c79a1c2`
- Local integration commit:
  `dcfdb1dc858b412803d2280c8995dbc2b69f6186`
- License: MIT

The two repositories do not share Git ancestry. The upstream source snapshot
was reviewed and integrated into the Sculpt DNA history with explicit
compatibility dispatch and its contract tests, rather than represented as a
GitHub fork or a merge commit.

## What came from the upstream line

The integrated snapshot supplies the current modular reconstruction kernel:

- v4 root manifests and independently authored module specs
- adaptive v3.1 pass planning
- module content/interface hashing, reuse, correction batches, and receipts
- shared validation/generation geometry registry
- compound assemblies, curve sweeps, lofts, fitted shells, branch networks,
  scatter, modifiers, bounded instancing, and sculpted surfaces
- specialized face/hand regions, special surfaces, and material profiles
- multi-view evidence, view hypotheses, critical-feature vetoes, and strict
  non-finite input rejection

The source snapshot's upstream tests are retained inside this repository's
combined test suite.

## What Sculpt DNA adds

The extension keeps its separately published schema-v2 production lane and
adds:

- named deterministic variation controls and semantic invariants
- Coverage Curator selection for representative asset families
- SHA-bound pass reviews and base-plus-variant visual regression matrices
- action-ready pivots, sockets, colliders, constraints, and destruction maps
- standalone/host Render Integration Contract checks
- Brick, Seoul, and Repolis production evidence and artifact manifests
- a read-only first-clone doctor, complete executable policy, least-privilege
  CI, dependency audits, and a machine-readable capability proof

The combined release deliberately dispatches schema-v2 documents to explicit
compatibility modules while v3.1/v4 documents use the adaptive modular kernel.
Neither contract is silently coerced into the other.

## How to audit the claim

Run:

```bash
python3 scripts/verify_capability_proof.py --json
python3 scripts/audit_script_policy.py --json
python3 -m unittest discover -s tests -q
python3 scripts/verify_release.py
```

The exact claims and evidence paths are in
[`capability-proof.json`](capability-proof.json). Capability breadth is
auditable from this checkout. Better visual output is a different claim and
must use the same-input, same-budget, blinded protocol in
[`docs/FAIR_COMPARISON_PROTOCOL.md`](docs/FAIR_COMPARISON_PROTOCOL.md).
