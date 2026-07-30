#!/usr/bin/env python3
"""Run a read-only installation and committed-sample health check."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from audit_script_policy import audit_policy
from probe_reference_image import probe
from sculpt_contract import load_json_object
from sculpt_pass_orchestrator import status_payload
from validate_sculpt_spec import validate_spec
from visual_regression_matrix import build_report


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Check:
    id: str
    status: str
    message: str
    details: dict[str, Any] | None = None


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=20,
    )


def manifest_check() -> Check:
    plugin = load_json_object(ROOT / "plugin.json", "plugin manifest")
    marketplace = load_json_object(
        ROOT / ".github" / "plugin" / "marketplace.json",
        "marketplace manifest",
    )
    entries = marketplace.get("plugins")
    entry = entries[0] if isinstance(entries, list) and len(entries) == 1 else {}
    expected_skills = {
        "./skills/object-to-threejs-procedural/",
        "./skills/sculpt-dna-variants/",
    }
    problems: list[str] = []
    if plugin.get("name") != "threejs-sculpt-dna":
        problems.append("root plugin name is not threejs-sculpt-dna")
    if set(plugin.get("skills", [])) != expected_skills:
        problems.append("root plugin does not expose the two canonical skills")
    if entry.get("name") != plugin.get("name"):
        problems.append("marketplace and root plugin names differ")
    if entry.get("version") != plugin.get("version"):
        problems.append("marketplace and root plugin versions differ")
    for relative in expected_skills:
        if not (ROOT / relative / "SKILL.md").is_file():
            problems.append(f"missing {relative}SKILL.md")
    return Check(
        "plugin-manifest",
        "fail" if problems else "pass",
        "; ".join(problems) if problems else f"plugin {plugin['version']} exposes 2 skills",
    )


def sample_check() -> Check:
    image = ROOT / "assets" / "brick-offroad-reference.jpeg"
    image_result = probe(image)
    spec_path = ROOT / "examples" / "repolis-tree" / "object-sculpt-spec.json"
    spec = load_json_object(spec_path, "committed sample spec")
    errors, warnings = validate_spec(spec, spec_path)
    strict_warnings = [item for item in warnings if item.startswith("quality:")]
    status = status_payload(spec, spec_path)
    problems = [
        *errors,
        *strict_warnings,
    ]
    if image_result.get("technicalSuitability") != "pass":
        problems.append("committed reference probe did not pass")
    if status.get("currentPass") != "complete":
        problems.append("committed flagship pipeline is not complete")
    return Check(
        "committed-sample",
        "fail" if problems else "pass",
        "; ".join(problems) if problems else "probe, strict spec, and 8-pass pipeline pass",
        {
            "image": image_result.get("technicalSuitability"),
            "currentPass": status.get("currentPass"),
            "completedPasses": len(status.get("completedPasses", [])),
        },
    )


def matrix_check() -> Check:
    families = (
        (
            "brick",
            ROOT / "examples" / "brick-offroad" / "object-sculpt-spec.json",
            ROOT
            / "examples"
            / "showcase"
            / "variants"
            / "brick"
            / "sculpt-dna-manifest.json",
        ),
        (
            "seoul",
            ROOT / "examples" / "seoul-challenge" / "object-sculpt-spec.json",
            ROOT
            / "examples"
            / "showcase"
            / "variants"
            / "seoul-production"
            / "sculpt-dna-manifest.json",
        ),
    )
    summaries: dict[str, Any] = {}
    problems: list[str] = []
    for family, base, manifest in families:
        report = build_report(
            base,
            manifest,
            cli_viewpoints=[],
            render_template=None,
            comparison_template=None,
            feature_ids=(),
        )
        summaries[family] = report["summary"]
        if not report["ok"]:
            problems.append(f"{family} matrix is not clean: {report['summary']}")
    return Check(
        "production-matrices",
        "fail" if problems else "pass",
        "; ".join(problems) if problems else "Brick and Seoul matrices pass",
        summaries,
    )


def script_policy_check() -> Check:
    result = audit_policy()
    return Check(
        "script-policy",
        "pass" if result["ok"] else "fail",
        (
            f"{result['scriptsChecked']} scripts are declared and network-disabled"
            if result["ok"]
            else "; ".join(result["errors"])
        ),
    )


def runtime_check(command: str, minimum_major: int) -> Check:
    executable = shutil.which(command)
    if executable is None:
        return Check(
            f"{command}-runtime",
            "warn",
            f"{command} is not installed; core Python checks still work",
        )
    completed = run_command([executable, "--version"])
    output = (completed.stdout or completed.stderr).strip()
    match = re.search(r"(\d+)(?:\.\d+)*", output)
    major = int(match.group(1)) if match else None
    if completed.returncode != 0 or major is None:
        return Check(
            f"{command}-runtime",
            "warn",
            f"could not parse {command} version: {output or completed.returncode}",
        )
    status = "pass" if major >= minimum_major else "fail"
    return Check(
        f"{command}-runtime",
        status,
        f"{output} ({'supported' if status == 'pass' else 'too old'})",
    )


def copilot_check() -> Check:
    executable = shutil.which("copilot")
    if executable is None:
        return Check(
            "copilot-cli",
            "warn",
            "Copilot CLI is not installed; install it before using the plugin skills",
        )
    version = run_command([executable, "--version"])
    installed = run_command([executable, "plugin", "list"])
    if version.returncode != 0 or installed.returncode != 0:
        return Check(
            "copilot-cli",
            "warn",
            "Copilot CLI exists but plugin status could not be read",
        )
    matches = [
        line.strip()
        for line in installed.stdout.splitlines()
        if "threejs-sculpt-dna" in line
    ]
    if len(matches) > 1:
        return Check(
            "copilot-cli",
            "warn",
            "multiple Three.js Sculpt DNA installations can shadow each other; "
            "keep one marketplace installation",
            {"installations": matches},
        )
    message = version.stdout.strip()
    if matches:
        message += f"; installed: {matches[0]}"
    else:
        message += "; plugin is not installed yet"
    return Check("copilot-cli", "pass", message)


def run_checks(*, skip_copilot: bool, skip_matrix: bool) -> dict[str, Any]:
    checks = [
        Check(
            "python-runtime",
            "pass" if sys.version_info >= (3, 10) else "fail",
            f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        ),
        manifest_check(),
        script_policy_check(),
        sample_check(),
        runtime_check("node", 22),
    ]
    if not skip_matrix:
        checks.append(matrix_check())
    if not skip_copilot:
        checks.append(copilot_check())
    return {
        "ok": all(item.status != "fail" for item in checks),
        "repository": "hyeonsangjeon/threejs-sculpt-dna",
        "checks": [asdict(item) for item in checks],
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print JSON")
    parser.add_argument(
        "--skip-copilot",
        action="store_true",
        help="Do not inspect the optional Copilot CLI installation",
    )
    parser.add_argument(
        "--skip-matrix",
        action="store_true",
        help="Skip committed production matrix verification",
    )
    args = parser.parse_args(argv)
    result = run_checks(
        skip_copilot=args.skip_copilot,
        skip_matrix=args.skip_matrix,
    )
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        for item in result["checks"]:
            print(f"{item['status'].upper():4} {item['id']}: {item['message']}")
        print("READY" if result["ok"] else "NOT READY")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
