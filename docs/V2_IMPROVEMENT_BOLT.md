# V2 Improvement Bolt: make the first clone trustworthy and useful

> This is an executable work order, not a feature wish list. Keep the order:
> discovery and trust first, production integrity second, release hardening
> third, then conversion and distribution.

## Bolt metadata

- **Focus repository:** `hyeonsangjeon/threejs-sculpt-dna`
- **Started:** 2026-07-31
- **Release train:** `0.5.0` implementation milestone; “V2” is the product
  hardening initiative, not a forced SemVer 2.0 compatibility break.
- **External comparison:** `vinhhien112/Three.js-Object-Sculptor-Codex-Plugin`
- **Constraint:** preserve Sculpt DNA, production evidence, and flagship
  contracts; do not merge the upstream modular kernel blindly.

## Diagnosis

The basic clone path is not broken. A clean public depth-1 clone completed in
4.1 seconds, occupied about 122 MB on disk, passed the committed image probe,
strict spec validation, and eight-pass status check, and installed through
direct repository, local path, and repository marketplace modes in Copilot CLI
1.0.73.

The apparent clone-to-star gap is mainly a measurement and distribution gap:

- recorded traffic reached 116 unique 14-day cloners while only 21 unique web
  visitors were observed; clone/fetch traffic includes CI, mirrors, indexers,
  and anonymous IPs and should not be treated as 116 evaluating developers;
- one star divided by the 21 recently observed unique web visitors is a
  descriptive 4.8% ratio, not a cohort conversion rate: the time windows and
  identities do not align, and the sample is too small. Qualified reach is the
  stronger diagnosis;
- the upstream project owns the original search phrase, received large Reddit
  distribution, and has more than one thousand stars;
- the official `github/copilot-plugins` submission remains open and review
  blocked, while the `awesome-copilot` submission was rejected because
  script-heavy behavior was considered opaque and a possible attack surface;
- the strongest visual proof currently appears well below the README opening,
  and three alternative install modes can create duplicate cached plugins.

## File-level change orders

### CO-01 · First-clone trust contract

- **Change:** add one read-only doctor command, a machine-readable executable
  inventory, a static policy audit, security guidance, and duplicate-install
  detection.
- **Why:** a user should be able to answer “what will run and is my checkout
  healthy?” before allowing an agent to execute the workflow.
- **Risk:** the doctor must not install, update, remove, render, or access the
  network.

### CO-02 · Production family matrix

- **Change:** migrate Brick and Seoul base/variant families to committed matrix
  configurations and reports, then make the release gate recompute and compare
  them.
- **Why:** documentation currently promises a production matrix that the
  committed release gate does not enforce.
- **Risk:** do not manufacture visual review. Reuse only current SHA-bound
  evidence and normalize camera labels that refer to the same committed view.

### CO-03 · CI and dependency boundary

- **Change:** add PR quality CI for plugin, docs, skills, scripts, manifests,
  examples, and generated factory parsing; run production matrices and npm
  audits; update vulnerable development lockfiles.
- **Why:** plugin-only changes can currently bypass CI and Vite/PostCSS have
  known high-severity development-tool findings.
- **Risk:** Pages deployment remains push-only; PR checks must not request write
  permissions.

### CO-04 · Input and contract integrity

- **Change:** centralize immutable pass/review constants, reject non-finite
  fidelity input, use strict JSON at mutation boundaries, and decouple the
  matrix from the flagship release module.
- **Why:** duplicated contracts drift and `NaN` can currently clamp to a perfect
  fidelity value.
- **Risk:** preserve policy-v1 read compatibility while keeping policy-v2
  production strict.

### CO-05 · Portable outputs and demo lifecycle

- **Change:** make PBR report/spec paths relative to an explicit base, modernize
  Repolis capture isolation, make capture-only framebuffer preservation
  conditional, and dispose long-lived browser resources.
- **Why:** cloned specs should not retain another machine's absolute paths, and
  interactive demos should not pay capture costs or leak resources.
- **Risk:** canonical capture mode must retain deterministic pixels and explicit
  evidence invalidation rules.

### CO-06 · README conversion and positioning

- **Change:** show the visual result and unique Sculpt DNA value above the fold,
  recommend exactly one marketplace install, add a doctor command and honest
  upstream differentiation, and move deep internals behind the successful
  first run.
- **Why:** this is a visual product competing with a search-dominant upstream;
  users need result, differentiation, trust, install, and proof in that order.
- **Risk:** do not imply photogrammetry, automatic hero quality, official
  marketplace acceptance, or human usage from clone counts.

## Work order

- [x] **BOLT-01 · Publish a read-only first-clone doctor and script trust policy**
  - Acceptance: clean checkout prints `READY`; no script is missing from the
    policy; no Python script imports a network client.
- [x] **BOLT-02 · Make Brick and Seoul production matrices real**
  - Acceptance: both committed 4-cell matrices are byte-deterministic and pass;
    release verification fails if either report or evidence becomes stale.
- [x] **BOLT-03 · Close mutation-boundary correctness gaps**
  - Acceptance: NaN/Infinity fidelity and non-standard JSON are rejected; shared
    constants are imported from one module; all focused tests pass.
- [x] **BOLT-04 · Add full-surface PR quality CI**
  - Acceptance: plugin/docs/skills/manifests trigger tests; all four browser
    examples build; generated TypeScript parses; audits have no high findings.
- [x] **BOLT-05 · Update runtime and capture hygiene**
  - Acceptance: framebuffer preservation is capture-only; Repolis has isolated
    port/lock tests; normal page lifecycle disposes resources.
- [x] **BOLT-06 · Rebuild the first README screen**
  - Acceptance: result, differentiation, one recommended install, doctor, and
    star CTA are visible before the detailed architecture.
- [x] **BOLT-07 · Prepare the 0.5.0 release contract**
  - Acceptance: root/marketplace versions and changelog agree; registry status
    is documented honestly; no tag or external release is claimed before push.
- [ ] **BOLT-08 · Re-run from a clean public clone**
  - Acceptance: doctor, compile, unit tests, release gate, Node tests, audits,
    four builds, and isolated marketplace install all pass.

## Defer conditions

- [ ] **DEFER:** importing the upstream 26k-line modular geometry kernel is a
  separate architecture migration. It must not be mixed into this hardening
  Bolt without a schema migration and flagship compatibility plan.
- [ ] **DEFER:** rewriting Git history or moving evidence media to LFS would
  change clone and archival contracts and needs an explicit repository
  migration decision.
- [ ] **DEFER:** updating the external marketplace PR, resubmitting to Awesome
  Copilot, pushing commits, tagging, or publishing a release requires the local
  changes to be reviewed and pushed first.
- [ ] **DEFER:** star growth is not an acceptance test. Measure qualified web
  visitors, successful doctor runs or issue feedback, demo engagement, and
  marketplace installs separately from anonymous clone traffic.

## Required validation

- [x] `python3 scripts/doctor.py --skip-copilot`
- [x] `python3 scripts/audit_script_policy.py`
- [x] `python3 -m compileall -q scripts tests`
- [x] `python3 -m unittest discover -s tests -v`
- [x] `python3 scripts/verify_release.py`
- [x] Brick and Seoul visual matrix reports are regenerated and byte-identical
- [x] all four `npm run build` commands pass
- [x] capture isolation tests pass
- [x] full and production-only npm audits are reviewed
- [ ] clean-clone marketplace installation reports exactly two installed skills

## Completion report

### Local implementation result · 2026-07-31

- BOLT-01 through BOLT-07 meet their acceptance criteria.
- The doctor reports `READY`; its only local warning identifies three duplicate
  Copilot installations, which is the intended shadowing diagnostic.
- All 134 Python tests pass. Release verification, Python compilation, the
  executable-policy audit, Node capture/factory tests, all four Vite builds,
  generated TypeScript bundling/parsing, and both dependency audit modes pass.
- Brick and Seoul each pass four of four production matrix cells. Two
  independent regenerations are byte-identical to the committed reports:
  Brick `2786a451b2204229259245761bbb192b97f1dba4c996f9a7feaa6d4b8ffd85a7`;
  Seoul `38f8979976aaec10a5a764d7564970685a8c9cd0a391d767f63f928f83d6609b`.
- Seoul performance evidence was refreshed from a visible Chrome 150 session
  on the physical 75 Hz display. The base and three promoted variants average
  at least 75.01 FPS, have p95 frame time at or below 15.3 ms, and record zero
  dropped frames under the committed probe.
- BOLT-08 remains open because version 0.5.0 is not pushed. The previous public
  commit was clean-cloned and installed successfully in all three Copilot CLI
  modes, but the new source cannot honestly be validated from a *public* clone
  until it has a reviewed remote commit.

Remaining distribution work is intentionally separate from local
implementation. Do not represent these changes as causing star growth.
