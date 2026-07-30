# Security

## Supported versions

Security fixes are applied to the current default branch and the latest tagged
release. Older plugin caches should be updated or reinstalled before reporting
a problem.

## Script trust model

This plugin is script-assisted because deterministic specs, hashes, image
channels, matrices, and runtime contracts need reproducible local tooling. The
Python tooling:

- uses the Python standard library;
- performs no network requests;
- is read-only unless the command explicitly names an output or `--in-place`;
- rejects unsafe or non-finite structured input at production boundaries;
- keeps evidence paths inside the repository when a release gate reads them.

The complete executable inventory is [script-policy.json](script-policy.json).
Audit it without executing the workflow:

```bash
python3 scripts/audit_script_policy.py
```

The release claim/evidence boundary has a separate read-only verifier:

```bash
python3 scripts/verify_capability_proof.py --json
```

It checks repository-local metadata, paths, tests, production reports, and CI
declarations. It does not access the network or execute the declared evidence
commands.

Two image tools may invoke the local macOS `sips` executable when a source
format cannot be decoded directly. `scripts/doctor.py` may read `copilot
--version`, `copilot plugin list`, and `node --version`; it does not install,
update, or remove anything.

Flagship capture scripts are separate developer tools. They bind Vite to
`127.0.0.1` and may invoke an installed Chrome/Chromium, `ffmpeg`, `cwebp`, and
Python. They are not run when the plugin is installed.

## Before running a command

1. Review the relevant entry in `script-policy.json`.
2. Run `python3 scripts/doctor.py`.
3. Use a copy of valuable specs before passing `--in-place`.
4. Do not provide secrets, private images, or unredacted filesystem data.
5. Inspect generated TypeScript before adding it to a production application.

## Reporting a vulnerability

Do not publish credentials, private references, or exploit details in a public
issue. Use GitHub's private vulnerability reporting for
`hyeonsangjeon/threejs-sculpt-dna`. Include the affected version, smallest
reproduction, impact, and whether untrusted input is required.
