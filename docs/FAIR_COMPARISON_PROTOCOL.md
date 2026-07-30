# Fair comparison protocol

Use this protocol before claiming that one procedural reconstruction workflow
produces better visual or production-ready output than another. Stars,
different showcase objects, cherry-picked attempts, and author identity are
excluded from scoring.

## Frozen comparison unit

One comparison unit consists of:

1. the same source image bytes and SHA-256
2. the same intended use and runtime target
3. the same maximum wall-clock and model/tool budget
4. the same Three.js, browser, viewport, DPR, lighting, and camera constraints
5. one declared retry policy
6. every generated source file, warning, render, receipt, and elapsed-time log

No team may substitute a more favorable reference, omit a failed attempt, or
manually repair output outside the declared workflow.

## Reference set

Use at least six license-compatible references, selected before either
workflow runs:

- two hard-surface or mechanical objects
- two organic or botanical objects
- one architectural object
- one compound object with an interaction or articulation requirement

At least half must not appear in either repository's examples or development
history. Record source, license, dimensions, hash, and selection rationale.

## Required outputs

For every unit, preserve:

- original input and pre-spec assessment
- complete spec/manifest/module state
- generated procedural source
- fixed front, side, rear, and three-quarter renders
- critical-feature close-ups declared before review
- browser/runtime console and performance receipts
- action hierarchy, pivots, sockets, collider, constraint, and detachable-part
  maps when required by the intended use
- all failed or superseded attempts

## Blinded review

Randomize each workflow as `A` or `B` independently per reference. Reviewers
must not see repository names, stars, authors, filenames, commit messages, or
workflow logs until scoring is locked.

Use at least three reviewers. Report individual scores, median, inter-reviewer
agreement, and ties. A critical identity-feature failure vetoes visual
acceptance even if the mean score is high.

Score these dimensions separately:

| Dimension | Weight | Gate |
| --- | ---: | --- |
| silhouette and proportions | 25 | no identity-breaking miss |
| component structure and attachment | 20 | required parts present and connected |
| material and lighting response | 15 | no category-breaking material error |
| critical local features | 15 | every predeclared critical feature passes |
| action/runtime readiness | 15 | required pivots/sockets/colliders behave correctly |
| reproducibility and evidence integrity | 10 | clean rerun and hashes/receipts pass |

Publish both weighted totals and every dimension. Do not hide a runtime or
reproducibility loss inside a visual average.

## Superiority threshold

Call a result “better” only when:

- it wins at least four of the six references,
- its paired median total is at least five points higher on a 100-point scale,
- it has no higher critical-veto rate,
- it meets the same runtime budget, and
- a clean rerun reproduces the reported artifacts.

Reserve “materially better” or stronger language for a preregistered threshold
of at least ten paired median points with the same veto/runtime conditions.
With six references this is still product evidence, not a universal scientific
claim.

## Publication

Commit the preregistered reference manifest before generation. Publish raw
inputs where licensing permits, complete outputs, hashes, scoring sheets,
reviewer-count and blinding method, failures, environment versions, and the
exact commits tested. Link corrections without rewriting the original result.

This protocol is intentionally harder to game than a star count. It is also
the boundary between the repository's currently verified capability claims
and any future claim about comparative visual quality.
