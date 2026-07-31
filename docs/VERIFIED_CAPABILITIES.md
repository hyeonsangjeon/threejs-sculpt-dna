# Verified capabilities

Release claims are judged here by executable contracts, committed evidence,
live runtimes, and reproducible commands.

## Release proof

The `0.6.0` capability contract binds eleven claims to implementation files,
tests, public CI, production reports, and the exact upstream source snapshot.
The verifier rejects undeclared claims, missing or escaping evidence paths,
version drift, incomplete skill registration, a failing production matrix, a
reduced test surface, an incomplete executable policy, or missing CI commands.

```bash
python3 scripts/prove.py --output proof-run.json
```

This single offline command runs executable policy, capability contract,
first-clone doctor, Python compile, Python contracts, and release evidence. Its
machine-readable result bounds stdout/stderr previews while preserving hashes
of the complete streams and binding the capability, policy, and plugin inputs.
The same result is presented in the public
[Proof Lab](https://hyeonsangjeon.github.io/threejs-sculpt-dna/proof/).

Expected state for this release:

| Contract | Verifiable state |
| --- | --- |
| Capability claims | 11 claims with repository-local evidence |
| Python contract surface | 295 discovered tests |
| React runtime contracts | 7 adapter lifecycle tests plus 2 real-factory integration tests |
| Executable boundary | 41 declared Python scripts; network disabled |
| Self-contained proof | 6/6 fail-closed offline checks with bounded, hashed streams |
| Public skills | 2 registered skills |
| Production family matrices | Brick 4/4 and Seoul 4/4 passing |
| Flagship artifacts | Repolis, Brick, and Seoul manifests verified |
| Dependency/build boundary | 6 locked browser builds, a dedicated adapter package build, and full/production audits in CI |
| Source lineage | Upstream commit `543da1fc0e45a703b0ac037fb040ce082c79a1c2` |

`testsDiscovered` is a structural floor, not a substitute for execution. The
dependency-free contracts job runs the suite and may skip the three Brick
runtime probes when `three` is not installed; the Brick browser job installs
its locked dependency graph and then runs that module, so the combined public
workflow executes the full 295-test surface.

## Combined capability surface

| Layer | Present in `0.6.0` | Primary evidence |
| --- | --- | --- |
| Modular reconstruction | v4 root manifests, independent modules, adaptive passes, module hashes/cache, correction batches, build/runtime receipts | `scripts/sculpt_manifest.py`, `scripts/sculpt_module_state.py`, `tests/test_modular_workflow.py` |
| Procedural modeling | compound assemblies; sweeps; lathes; extrusions; lofts; fitted shells; branch/scatter/instance systems; modifiers; welded sculpted surfaces; specialized regions | `scripts/sculpt_geometry.py`, `scripts/sculpt_special_geometry_typescript.py`, modeling tests |
| Region-aware reference PBR | validated pixel/normalized crops, source/crop identities, suitability gates, preserved auto-foreground path | `scripts/extract_reference_pbr.py`, `tests/test_reference_pbr_regions.py` |
| Published compatibility | explicit schema-v2 production modules alongside the adaptive v3.1/v4 path | `*_legacy.py` compatibility modules and `tests/test_sculpt_dna.py` |
| Deterministic families | named semantic controls, invariants, reproducible seeds, Coverage Curator, promoted base-plus-variant matrices | `scripts/sculpt_dna_core.py`, `scripts/visual_regression_matrix.py` |
| Review integrity | multi-view sheets, source/render hashes, review precedence, critical-feature vetoes, runtime provenance, stale-evidence rejection | review/evidence scripts and integrity tests |
| Runtime readiness | stable hierarchy, pivots, sockets, colliders, constraints, detachable groups, standalone/host snapshot checks | action-ready reference and Render Integration Contract |
| React Three Fiber runtime | optional peer-only adapter for plain/structured factories, commit-phase allocation, semantic rebuilds, frame delegation, runtime maps/stats, StrictMode-safe exact-once cleanup | `adapters/react-three-fiber`, `examples/react-three-fiber` |
| Release trust | read-only doctor, strict JSON boundaries, complete network-disabled executable inventory, pinned CI actions, audits | `scripts/doctor.py`, `script-policy.json`, `.github/workflows/quality.yml` |
| Public proof | one six-gate runner, bounded/hashed machine result, source-linked static Proof Lab | `scripts/prove.py`, `examples/proof-lab`, `tests/test_proof_runner.py` |
| Production proof | three code-native flagship manifests and two deterministic four-cell family reports | `examples/*-hero/artifact-manifest.json`, production matrix reports |

The first two layers come from the credited upstream source line and are now
combined with the Sculpt DNA layers. Exact provenance is recorded in
[`UPSTREAM.md`](../UPSTREAM.md).

## Full reproduction

Run the repository contracts and optionally retain the exact JSON result:

```bash
python3 scripts/prove.py --output proof-run.json
```

For each of `examples/repolis-hero`, `examples/brick-offroad-hero`,
`examples/seoul-palace-hero`, `examples/showcase`, `examples/proof-lab`, and
`examples/react-three-fiber`, run:

```bash
npm ci
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
npm run build
```

The first three examples also run `npm run test:capture`; Proof Lab and the
React Three Fiber example run `npm test` against their data/runtime contracts.
The adapter package itself runs locked install, audits, seven lifecycle tests,
and a declaration build. The public
[`Quality` workflow](../.github/workflows/quality.yml) performs this matrix on
pull requests.

## What this evidence does not say

- It does not convert stars, clones, or traffic into a quality score.
- It does not claim that more files or tests automatically produce a better
  render.
- It does not claim visual superiority from different references or
  hand-selected showcase images.
- It does not replace AI-vision review with diagnostic pixel metrics.

An honest “better output” result needs identical references and constraints,
frozen raw outputs, and blinded review. That comparison is defined in
[`FAIR_COMPARISON_PROTOCOL.md`](FAIR_COMPARISON_PROTOCOL.md). Until such a run
is published, the defensible claim is narrower and stronger: this release has
a larger, explicitly integrated capability surface and more production,
compatibility, trust, and reproducibility contracts than either line had
alone.
