#!/usr/bin/env python3
"""Run the complete offline Sculpt DNA proof suite and emit bounded evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sculpt_contract import write_spec_atomic


ROOT = Path(__file__).resolve().parents[1]
MAX_CAPTURE_CHARACTERS = 8192
CHECK_TIMEOUT_SECONDS = 900
CHECKS: tuple[dict[str, Any], ...] = (
    {
        "id": "executable-policy",
        "label": "Executable policy",
        "command": ["python3", "scripts/audit_script_policy.py", "--json"],
    },
    {
        "id": "capability-contract",
        "label": "Capability contract",
        "command": ["python3", "scripts/verify_capability_proof.py", "--json"],
    },
    {
        "id": "first-clone-doctor",
        "label": "First-clone doctor",
        "command": ["python3", "scripts/doctor.py", "--skip-copilot", "--json"],
    },
    {
        "id": "python-compile",
        "label": "Python compile",
        "command": ["python3", "-m", "compileall", "-q", "scripts", "tests"],
    },
    {
        "id": "python-contracts",
        "label": "Python contracts",
        "command": [
            "python3",
            "-m",
            "unittest",
            "discover",
            "-s",
            "tests",
            "-q",
        ],
    },
    {
        "id": "release-evidence",
        "label": "Release evidence",
        "command": ["python3", "scripts/verify_release.py"],
    },
)
LIMITATIONS = (
    "This run proves the committed contracts in this checkout; it is not a visual-quality benchmark.",
    "Passing checks do not prove superiority over another project without the same-input blinded comparison protocol.",
    "Stars and other attention metrics are deliberately excluded from quality evidence.",
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def validate_commit(value: str) -> str:
    if value == "working-tree" or re.fullmatch(r"[0-9a-f]{40}", value):
        return value
    raise ValueError("--commit must be 'working-tree' or a lowercase 40-character Git SHA")


def release_version(root: Path = ROOT) -> str:
    payload = json.loads((root / "plugin.json").read_text(encoding="utf-8"))
    version = payload.get("version")
    if not isinstance(version, str) or not version:
        raise ValueError("plugin.json does not declare a release version")
    return version


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def captured_stream(value: str | None) -> dict[str, Any]:
    text = value or ""
    encoded = text.encode("utf-8")
    return {
        "preview": text[:MAX_CAPTURE_CHARACTERS],
        "truncated": len(text) > MAX_CAPTURE_CHARACTERS,
        "characters": len(text),
        "bytes": len(encoded),
        "sha256": hashlib.sha256(encoded).hexdigest(),
    }


def run_check(
    definition: dict[str, Any],
    *,
    root: Path = ROOT,
) -> dict[str, Any]:
    display_command = list(definition["command"])
    actual_command = [sys.executable, *display_command[1:]]
    started = time.monotonic()
    try:
        completed = subprocess.run(
            actual_command,
            cwd=root,
            check=False,
            capture_output=True,
            text=True,
            timeout=CHECK_TIMEOUT_SECONDS,
        )
        exit_code: int | None = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
        status = "pass" if completed.returncode == 0 else "fail"
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        exit_code = None
        stdout = (
            exc.stdout.decode("utf-8", errors="replace")
            if isinstance(exc.stdout, bytes)
            else exc.stdout
        )
        stderr = (
            exc.stderr.decode("utf-8", errors="replace")
            if isinstance(exc.stderr, bytes)
            else exc.stderr
        )
        status = "fail"
        timed_out = True
    duration_ms = round((time.monotonic() - started) * 1000)
    return {
        "id": definition["id"],
        "label": definition["label"],
        "command": display_command,
        "status": status,
        "exitCode": exit_code,
        "timedOut": timed_out,
        "durationMs": duration_ms,
        "stdout": captured_stream(stdout),
        "stderr": captured_stream(stderr),
    }


def build_proof_run(
    *,
    commit: str,
    checks: list[dict[str, Any]],
    started_at: datetime,
    finished_at: datetime,
    root: Path = ROOT,
) -> dict[str, Any]:
    commit = validate_commit(commit)
    passed = sum(item.get("status") == "pass" for item in checks)
    failed = len(checks) - passed
    duration_ms = sum(
        int(item.get("durationMs", 0))
        for item in checks
        if isinstance(item.get("durationMs"), int)
    )
    return {
        "schemaVersion": "1.0",
        "artifactType": "threejs-sculpt-dna-proof-run",
        "release": release_version(root),
        "repository": "https://github.com/hyeonsangjeon/threejs-sculpt-dna",
        "commit": commit,
        "generatedAt": iso_utc(finished_at),
        "startedAt": iso_utc(started_at),
        "offline": True,
        "environment": {
            "python": platform.python_version(),
            "implementation": platform.python_implementation(),
            "platform": platform.system().lower() or "unknown",
            "machine": platform.machine() or "unknown",
        },
        "inputs": {
            "capabilityProofSha256": file_sha256(
                root / "capability-proof.json"
            ),
            "scriptPolicySha256": file_sha256(root / "script-policy.json"),
            "pluginManifestSha256": file_sha256(root / "plugin.json"),
        },
        "ok": failed == 0 and len(checks) == len(CHECKS),
        "summary": {
            "status": "pass" if failed == 0 and len(checks) == len(CHECKS) else "fail",
            "passed": passed,
            "failed": failed,
            "total": len(checks),
            "durationMs": duration_ms,
        },
        "checks": checks,
        "limitations": list(LIMITATIONS),
    }


def run_proof(
    *,
    commit: str,
    root: Path = ROOT,
) -> dict[str, Any]:
    started_at = utc_now()
    checks = [run_check(definition, root=root) for definition in CHECKS]
    return build_proof_run(
        commit=commit,
        checks=checks,
        started_at=started_at,
        finished_at=utc_now(),
        root=root,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--commit",
        default=os.environ.get("GITHUB_SHA", "working-tree"),
        help="Commit under proof: a lowercase 40-character SHA or working-tree.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional JSON destination. No file is written without this flag.",
    )
    parser.add_argument("--json", action="store_true", help="Print the full proof JSON.")
    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        commit = validate_commit(args.commit)
        proof = run_proof(commit=commit)
        if args.output:
            write_spec_atomic(args.output.expanduser().resolve(), proof)
        if args.json:
            print(json.dumps(proof, indent=2, ensure_ascii=False))
        else:
            for check in proof["checks"]:
                print(
                    f"{check['status'].upper():4} "
                    f"{check['label']} ({check['durationMs']} ms)"
                )
            summary = proof["summary"]
            print(
                f"PROOF {summary['status'].upper()}: "
                f"{summary['passed']}/{summary['total']} checks passed"
            )
        return 0 if proof["ok"] else 1
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
