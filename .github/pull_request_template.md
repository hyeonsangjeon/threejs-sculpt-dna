## Problem

What user-facing problem does this change solve?

## Changes

- Describe the focused implementation changes.

## Compatibility

Describe schema, deterministic output, marketplace, or migration impact.

## Verification

- [ ] `python3 scripts/doctor.py --skip-copilot`
- [ ] `python3 scripts/audit_script_policy.py`
- [ ] `python3 -m compileall -q scripts tests`
- [ ] `python3 -m unittest discover -s tests -v`
- [ ] `python3 scripts/verify_release.py`
- [ ] Changed browser examples build and pass `npm audit --audit-level=high`
- [ ] Changed ObjectSculptSpecs pass strict validation
- [ ] Marketplace JSON remains valid when applicable
- [ ] Browser screenshots and comparison evidence are attached for visual changes

## Visual evidence

Reference, render, comparison, camera, layer scores, and semantic feature notes:

## Checklist

- [ ] The change is focused.
- [ ] New behavior has tests.
- [ ] Skill references use Markdown links.
- [ ] No secrets or sensitive image metadata are included.
- [ ] New or changed Python executables are declared in `script-policy.json`.
- [ ] Preview variants are not described as production-ready.
