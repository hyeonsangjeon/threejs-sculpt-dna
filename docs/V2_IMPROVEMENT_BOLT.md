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
  contracts; integrate the upstream modular kernel only with explicit schema
  dispatch, provenance, and regression coverage.

## Diagnosis

The basic clone path is not broken. A clean public depth-1 clone completed in
4.1 seconds, occupied about 122 MB on disk, passed the committed image probe,
strict spec validation, and eight-pass status check, and installed through
direct repository, local path, and repository marketplace modes in Copilot CLI
1.0.73.

The apparent clone-to-star gap is mainly an exposure and attribution gap, not
a broken clone path. The GitHub traffic snapshot observed on 2026-07-31 showed
11 views from 6 unique visitors and 10 clones from 10 unique cloners in the
rolling 14-day window. Clone/fetch traffic includes CI, mirrors, indexers, and
anonymous IPs, so it is not a count of ten developers who evaluated the
product.

- one star against six recently observed unique web visitors is too small and
  identity-misaligned to support a conversion diagnosis;
- the upstream repository has accumulated roughly 1.5k stars and 160 forks,
  owns the original search phrase, and received launch distribution from
  Reddit and X; the current repository did not inherit that history or GitHub
  fork graph;
- therefore the measurable problem is that almost nobody reached the canonical
  repository page, not that a large qualified audience cloned it and rejected
  it;
- the official `github/copilot-plugins` submission remains open and review
  blocked, while the `awesome-copilot` submission was rejected because
  script-heavy behavior was considered opaque and a possible attack surface;
- the strongest visual proof currently appears well below the README opening,
  and three alternative install modes can create duplicate cached plugins.

This Bolt does not answer that gap with star solicitation or unverifiable
superiority copy. It turns the repository into a proof-bearing combined
release and reserves visual superiority language for a same-input blinded
comparison.

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
  upstream differentiation, replace the star request with verified release
  state, and move deep internals behind the successful first run.
- **Why:** this is a visual product competing with a search-dominant upstream;
  users need result, differentiation, trust, install, and proof in that order.
- **Risk:** do not imply photogrammetry, automatic hero quality, official
  marketplace acceptance, or human usage from clone counts.

### CO-07 · Kernel convergence without contract regression

- **Change:** integrate upstream source commit
  `543da1fc0e45a703b0ac037fb040ce082c79a1c2`, retain its modular tests, and
  dispatch published schema-v2 documents to explicit compatibility modules.
- **Why:** Sculpt DNA should contain the strongest current upstream modeling
  kernel instead of competing with an older inherited baseline.
- **Risk:** do not silently coerce schema-v2 production documents into the
  adaptive v3.1/v4 state machine or discard SHA-bound flagship behavior.

### CO-08 · Machine-verifiable capability and comparison boundary

- **Change:** publish `capability-proof.json`, a read-only verifier, exact
  upstream provenance, a verified capability matrix, and a same-input blinded
  comparison protocol.
- **Why:** source breadth, tests, executable trust, and production integrity can
  be proven now; visual superiority requires a different controlled experiment.
- **Risk:** never convert stars, file counts, unequal showcases, or test counts
  alone into a visual-quality claim.

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
  - Acceptance: plugin/docs/skills/manifests trigger tests; all five browser
    examples build; generated TypeScript parses; audits have no high findings.
- [x] **BOLT-05 · Update runtime and capture hygiene**
  - Acceptance: framebuffer preservation is capture-only; Repolis has isolated
    port/lock tests; normal page lifecycle disposes resources.
- [x] **BOLT-06 · Rebuild the first README screen**
  - Acceptance: result, differentiation, one recommended install, doctor, and
    executable proof are visible before the detailed architecture.
- [x] **BOLT-07 · Prepare the 0.5.0 release contract**
  - Acceptance: root/marketplace versions and changelog agree; registry status
    is documented honestly; no tag or external release is claimed before push.
- [x] **BOLT-08 · Re-run from a clean public clone**
  - Acceptance: doctor, compile, unit tests, release gate, Node tests, audits,
    four builds, and isolated marketplace install all pass.
- [x] **BOLT-09 · Converge the modular kernel and Sculpt DNA production lane**
  - Acceptance: the reviewed upstream snapshot, modular workflow, geometry
    registry, specialized systems, and upstream tests are present; schema-v2
    flagships remain supported by explicit compatibility dispatch.
- [x] **BOLT-10 · Make capability claims machine-verifiable**
  - Acceptance: release metadata, lineage, ten capability claims, evidence
    paths, test floor, executable inventory, production matrices, and CI
    commands are checked locally without network access.
- [x] **BOLT-11 · Block popularity-based superiority claims**
  - Acceptance: the README contains no star solicitation; proof limitations
    reject stars as quality evidence; comparative output claims require the
    published same-input, equal-budget, blinded protocol.
- [x] **BOLT-12 · Close the public-demo conversion loop**
  - Acceptance: the primary Repolis and Brick flagships plus the variant
    showcase link directly to the canonical repository and installation guide;
    Seoul preserves its stricter reviewed-source fingerprint and links back
    through the flagship pager instead of rewriting accepted evidence.
- [x] **BOLT-13 · Put installation and repository proof above the fold**
  - Acceptance: the README exposes the single recommended two-command install
    before architecture detail, links the exact self-contained proof command
    and live Proof Lab, and displays Quality state without asking for stars.
- [x] **BOLT-14 · Make one command the release authority**
  - Acceptance: `python3 scripts/prove.py` runs policy, capability, doctor,
    compile, Python contracts, and release evidence offline; optional JSON
    output is bounded, full-stream hashed, versioned, and fail-closed.
- [x] **BOLT-15 · Ship region-aware reference PBR**
  - Acceptance: normalized/pixel crops resolve deterministically; source hash,
    dimensions, coordinate forms, and crop identity survive reports and
    in-place patches; invalid, tiny, background-heavy, and mixed regions fail;
    no-crop output keeps the legacy auto-foreground path.
- [x] **BOLT-16 · Publish proof as a product surface**
  - Acceptance: a dependency-free Proof Lab renders the actual CI proof,
    exposes every source-linked claim and limitation, passes desktop/mobile and
    interaction QA, and deploys at `/proof/` beside the flagships.

## Defer conditions

- [ ] **DEFER:** rewriting Git history or moving evidence media to LFS would
  change clone and archival contracts and needs an explicit repository
  migration decision.
- [x] **RETIRED:** external catalog resubmission is outside the release plan.
  No further comments, reopen attempts, or catalog-specific changes are
  required; repository-local proof is the authority.
- [ ] **DEFER:** tagging or publishing a release requires this draft PR to pass
  public checks and merge first.
- [ ] **DEFER:** star growth is not an acceptance test. Measure qualified web
  visitors, successful doctor runs or issue feedback, demo engagement, and
  marketplace installs separately from anonymous clone traffic.

## Required validation

- [x] `python3 scripts/prove.py --output proof-run.json`
- [x] Brick and Seoul visual matrix reports are regenerated and byte-identical
- [x] all five `npm run build` commands pass
- [x] Proof Lab data contracts and desktop/mobile interaction QA pass
- [x] capture isolation tests pass
- [x] full and production-only npm audits are reviewed
- [x] clean-clone marketplace installation reports exactly two installed skills

## Completion report

### Local implementation result · 2026-07-31

- BOLT-01 through BOLT-11 meet their acceptance criteria.
- The reviewed upstream modular source snapshot is integrated with explicit
  schema-v2 compatibility modules. A doctor regression that initially
  reinterpreted the completed schema-v2 sample through the adaptive pipeline
  was caught and fixed; the public status command now reports all eight passes
  complete.
- The doctor reports `READY` when optional Copilot inspection is skipped. Its
  normal local mode may warn when duplicate Copilot installations can shadow
  each other, which is the intended diagnostic.
- The capability proof verifies 8 claims, 56 evidence files, 273 tests, and 40
  network-disabled Python scripts. All 273 tests pass. Release verification,
  Python compilation, 12 Node capture/factory tests, all four Vite builds,
  generated TypeScript bundling/parsing, and both dependency audit modes pass
  with zero reported npm vulnerabilities.
- Brick and Seoul each pass four of four production matrix cells. Two
  independent regenerations are byte-identical to the committed reports:
  Brick `2786a451b2204229259245761bbb192b97f1dba4c996f9a7feaa6d4b8ffd85a7`;
  Seoul `38f8979976aaec10a5a764d7564970685a8c9cd0a391d767f63f928f83d6609b`.
- Seoul performance evidence was refreshed from a visible Chrome 150 session
  on the physical 75 Hz display. The base and three promoted variants average
  at least 75.01 FPS, have p95 frame time at or below 15.3 ms, and record zero
  dropped frames under the committed probe.
- Public branch commit `6b7be56650215f81c3d1f1c27d1b75adf72e78d0` was
  HTTPS depth-1 cloned into a fresh 118 MB checkout. Before npm installation,
  the dependency-free suite discovered all 273 tests, passed, and explicitly
  skipped only the three declared Brick runtime probes. After locked npm
  installation, all 273 tests ran without skips and the Brick CI module passed
  all 12 of its tests.
- The same public clone passed the doctor, proof, policy audit, compilation,
  release gate, 12 Node contracts, four browser builds, all eight dependency
  audits, and generated TypeScript bundling/parsing. An empty isolated
  `COPILOT_HOME` registered that checkout as a marketplace, installed
  `threejs-sculpt-dna@threejs-copilot-plugins` v0.5.0, and exposed exactly
  `object-to-threejs-procedural` and `sculpt-dna-variants` as plugin skills.

Remaining distribution work is intentionally separate from local
implementation. Do not represent these changes as causing star growth.

### Distribution follow-through · 2026-07-31

- The rolling GitHub traffic window contained 11 page views from 6 unique
  visitors and 10 clone events from 10 unique sources. Clone telemetry includes
  automation, mirrors, and indexers, so it remains unsuitable as a human
  conversion count.
- External catalog follow-through is retired from the project plan. No further
  submission-specific work is required for release quality.
- Official Copilot Plugins PR `#57` remains open for maintainer review.
- Primary public demo navigation now returns qualified visitors to the
  canonical source and install instructions instead of ending at an isolated
  WebGL experience. Seoul retains its stricter reviewed-source fingerprint and
  routes back through the flagship pager.

### Self-proof upgrade · 0.5.2 · 2026-07-31

- The capability proof now verifies 10 claims, 63 evidence files, 288 Python
  contracts, and 41 network-disabled Python scripts.
- The new offline proof runner completes all six declared gates and publishes a
  bounded, hashed machine-readable result; CI invokes this same command.
- Region-aware PBR extraction supports deterministic pixel/normalized material
  regions, preserves complete source/crop provenance, and keeps the legacy
  no-crop path under regression coverage.
- The dependency-free Proof Lab renders the real proof result, source-links all
  claims, exposes limitations, and joins the five-build Pages matrix at
  `/proof/`.
