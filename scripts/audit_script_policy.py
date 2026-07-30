#!/usr/bin/env python3
"""Audit the plugin's executable Python surface against script-policy.json."""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "script-policy.json"
NETWORK_MODULES = {"http.client", "requests", "socket", "urllib.request"}
VALID_MODES = {
    "library",
    "read-only",
    "generated-output",
    "explicit-in-place",
}


def imported_modules(tree: ast.AST) -> set[str]:
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module)
    return modules


def audit_policy(
    root: Path = ROOT,
    policy_path: Path = POLICY_PATH,
) -> dict[str, Any]:
    try:
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "errors": [f"cannot read script policy: {exc}"]}

    errors: list[str] = []
    if policy.get("schemaVersion") != "1.0":
        errors.append("script-policy.json schemaVersion must be '1.0'")
    if policy.get("defaultNetworkAccess") is not False:
        errors.append("defaultNetworkAccess must be false")
    entries = policy.get("scripts")
    if not isinstance(entries, list):
        return {"ok": False, "errors": errors + ["scripts must be an array"]}

    by_path = {
        entry.get("path"): entry
        for entry in entries
        if isinstance(entry, dict) and isinstance(entry.get("path"), str)
    }
    if len(by_path) != len(entries):
        errors.append("every script policy entry must have a unique path")

    actual = {
        path.relative_to(root).as_posix()
        for path in (root / "scripts").glob("*.py")
    }
    declared = set(by_path)
    for path in sorted(actual - declared):
        errors.append(f"script is not declared in script-policy.json: {path}")
    for path in sorted(declared - actual):
        errors.append(f"declared script does not exist: {path}")

    for relative in sorted(actual & declared):
        entry = by_path[relative]
        mode = entry.get("mode")
        if mode not in VALID_MODES:
            errors.append(f"{relative} has unsupported mode {mode!r}")
        if entry.get("network") is not False:
            errors.append(f"{relative} must explicitly declare network=false")
        subprocesses = entry.get("subprocesses")
        if (
            not isinstance(subprocesses, list)
            or any(not isinstance(item, str) or not item for item in subprocesses)
        ):
            errors.append(f"{relative}.subprocesses must be an array of names")
            subprocesses = []

        source_path = root / relative
        try:
            tree = ast.parse(
                source_path.read_text(encoding="utf-8"),
                filename=relative,
            )
        except (OSError, SyntaxError) as exc:
            errors.append(f"{relative} cannot be parsed: {exc}")
            continue
        imports = imported_modules(tree)
        network_imports = sorted(
            module
            for module in imports
            if module in NETWORK_MODULES
            or any(module.startswith(f"{prefix}.") for prefix in NETWORK_MODULES)
        )
        if network_imports:
            errors.append(
                f"{relative} imports network modules despite network=false: "
                + ", ".join(network_imports)
            )
        uses_subprocess = "subprocess" in imports or any(
            module.startswith("subprocess.") for module in imports
        )
        if uses_subprocess and not subprocesses:
            errors.append(
                f"{relative} imports subprocess but declares no allowed executable"
            )
        if not uses_subprocess and subprocesses:
            errors.append(
                f"{relative} declares subprocesses but does not import subprocess"
            )

    return {
        "ok": not errors,
        "schemaVersion": policy.get("schemaVersion"),
        "scriptsChecked": len(actual),
        "errors": errors,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print a JSON result")
    args = parser.parse_args(argv)
    result = audit_policy()
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result["ok"]:
        print(
            f"PASS: {result['scriptsChecked']} Python scripts match "
            "script-policy.json; network access is disabled."
        )
    else:
        for error in result["errors"]:
            print(f"FAIL: {error}", file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
