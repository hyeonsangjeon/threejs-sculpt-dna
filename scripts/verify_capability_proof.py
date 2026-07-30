#!/usr/bin/env python3
"""Verify the machine-readable Sculpt DNA capability proof without network access."""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path
from typing import Any

from audit_script_policy import audit_policy


ROOT = Path(__file__).resolve().parents[1]
PROOF_PATH = ROOT / "capability-proof.json"
EXPECTED_RELEASE = "0.5.0"
EXPECTED_REPOSITORY = "https://github.com/hyeonsangjeon/threejs-sculpt-dna"
EXPECTED_UPSTREAM = (
    "https://github.com/vinhhien112/Three.js-Object-Sculptor-Codex-Plugin"
)
EXPECTED_UPSTREAM_COMMIT = "543da1fc0e45a703b0ac037fb040ce082c79a1c2"
EXPECTED_CLAIM_IDS = {
    "action-ready-host-integration",
    "deterministic-asset-families",
    "evidence-and-review-integrity",
    "first-clone-trust",
    "modular-v4-modeling-kernel",
    "procedural-geometry-breadth",
    "production-flagships",
    "schema-compatibility",
}
EXPECTED_SKILLS = {
    "./skills/object-to-threejs-procedural/",
    "./skills/sculpt-dna-variants/",
}
REQUIRED_QUALITY_COMMANDS = {
    "python3 scripts/verify_capability_proof.py --json",
    "python3 scripts/audit_script_policy.py",
    "python3 scripts/doctor.py --skip-copilot",
    "python3 -m compileall -q scripts tests",
    "python3 -m unittest discover -s tests -q",
    "python3 scripts/verify_release.py",
    "npm audit --audit-level=high",
    "npm audit --omit=dev --audit-level=high",
    "npm run build",
}
MINIMUM_TESTS = 269


class StrictJsonError(ValueError):
    """Raised when a JSON document uses ambiguous or non-standard values."""


def _reject_constant(value: str) -> None:
    raise StrictJsonError(f"non-standard JSON constant {value!r}")


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise StrictJsonError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def load_json_strict(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8"),
        parse_constant=_reject_constant,
        object_pairs_hook=_reject_duplicate_keys,
    )


def _repo_path(
    root: Path,
    relative: Any,
    *,
    label: str,
    errors: list[str],
) -> Path | None:
    if not isinstance(relative, str) or not relative:
        errors.append(f"{label} must be a non-empty repository-relative path")
        return None
    raw = Path(relative)
    if raw.is_absolute():
        errors.append(f"{label} must not be absolute: {relative!r}")
        return None
    resolved_root = root.resolve()
    resolved = (resolved_root / raw).resolve()
    if not resolved.is_relative_to(resolved_root):
        errors.append(f"{label} escapes the repository: {relative!r}")
        return None
    return resolved


def _discover_tests(root: Path, errors: list[str]) -> int:
    count = 0
    for path in sorted((root / "tests").glob("test_*.py")):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except (OSError, SyntaxError) as exc:
            errors.append(f"cannot inspect tests in {path.relative_to(root)}: {exc}")
            continue
        count += sum(
            1
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name.startswith("test_")
        )
    if count < MINIMUM_TESTS:
        errors.append(
            f"test contract regressed: discovered {count}, expected at least "
            f"{MINIMUM_TESTS}"
        )
    return count


def _verify_release_metadata(root: Path, proof: dict[str, Any], errors: list[str]) -> None:
    if proof.get("release") != EXPECTED_RELEASE:
        errors.append(
            f"capability proof release must be {EXPECTED_RELEASE!r}, got "
            f"{proof.get('release')!r}"
        )
    if proof.get("repository") != EXPECTED_REPOSITORY:
        errors.append("capability proof repository is not the canonical repository")

    try:
        plugin = load_json_strict(root / "plugin.json")
        codex_plugin = load_json_strict(root / ".codex-plugin" / "plugin.json")
        marketplace = load_json_strict(
            root / ".github" / "plugin" / "marketplace.json"
        )
    except (OSError, json.JSONDecodeError, StrictJsonError) as exc:
        errors.append(f"cannot read release metadata: {exc}")
        return

    for label, document in (
        ("plugin.json", plugin),
        (".codex-plugin/plugin.json", codex_plugin),
    ):
        if document.get("name") != "threejs-sculpt-dna":
            errors.append(f"{label} has an unexpected plugin name")
        if document.get("version") != EXPECTED_RELEASE:
            errors.append(f"{label} version does not match the proof release")

    entries = marketplace.get("plugins")
    if not isinstance(entries, list) or len(entries) != 1:
        errors.append("marketplace must contain exactly one plugin entry")
    else:
        entry = entries[0]
        if (
            not isinstance(entry, dict)
            or entry.get("name") != "threejs-sculpt-dna"
            or entry.get("version") != EXPECTED_RELEASE
            or entry.get("source") != "."
        ):
            errors.append("marketplace plugin entry does not match the proof release")

    skills = plugin.get("skills")
    if not isinstance(skills, list) or set(skills) != EXPECTED_SKILLS:
        errors.append("plugin.json must expose exactly the two public Sculpt DNA skills")
    for skill in EXPECTED_SKILLS:
        skill_path = _repo_path(
            root,
            f"{skill}SKILL.md",
            label="plugin skill",
            errors=errors,
        )
        if skill_path is not None and not skill_path.is_file():
            errors.append(f"plugin skill is missing: {skill}SKILL.md")


def _verify_lineage(proof: dict[str, Any], errors: list[str]) -> None:
    lineage = proof.get("upstreamLineage")
    if not isinstance(lineage, dict):
        errors.append("upstreamLineage must be an object")
        return
    if lineage.get("repository") != EXPECTED_UPSTREAM:
        errors.append("upstream lineage repository does not match the credited source")
    commit = lineage.get("integratedSourceCommit")
    if commit != EXPECTED_UPSTREAM_COMMIT or not (
        isinstance(commit, str) and re.fullmatch(r"[0-9a-f]{40}", commit)
    ):
        errors.append("upstream integrated source commit is missing or unexpected")
    if lineage.get("license") != "MIT":
        errors.append("upstream lineage must preserve the MIT license declaration")
    if lineage.get("provenanceDocument") != "UPSTREAM.md":
        errors.append("upstream lineage must point to UPSTREAM.md")


def _verify_scope(proof: dict[str, Any], errors: list[str]) -> None:
    scope = proof.get("scope")
    if not isinstance(scope, dict):
        errors.append("scope must be an object")
        return
    proves = scope.get("proves")
    limits = scope.get("doesNotProve")
    if not isinstance(proves, list) or len(proves) < 3:
        errors.append("scope.proves must contain at least three explicit claims")
    if not isinstance(limits, list) or len(limits) < 3:
        errors.append("scope.doesNotProve must contain at least three limitations")
        return
    joined = " ".join(item for item in limits if isinstance(item, str)).lower()
    for required in ("stars", "visual", "blinded"):
        if required not in joined:
            errors.append(f"scope limitations must explicitly address {required!r}")


def _verify_claims(
    root: Path,
    proof: dict[str, Any],
    errors: list[str],
) -> tuple[int, int]:
    claims = proof.get("claims")
    if not isinstance(claims, list):
        errors.append("claims must be an array")
        return 0, 0

    claim_ids: list[str] = []
    evidence_count = 0
    for index, claim in enumerate(claims):
        label = f"claims[{index}]"
        if not isinstance(claim, dict):
            errors.append(f"{label} must be an object")
            continue
        claim_id = claim.get("id")
        if not isinstance(claim_id, str) or not claim_id:
            errors.append(f"{label}.id must be a non-empty string")
        else:
            claim_ids.append(claim_id)
        statement = claim.get("statement")
        if not isinstance(statement, str) or len(statement.strip()) < 40:
            errors.append(f"{label}.statement is too short to be auditable")
        evidence = claim.get("evidenceFiles")
        if not isinstance(evidence, list) or not evidence:
            errors.append(f"{label}.evidenceFiles must be a non-empty array")
            continue
        for evidence_index, relative in enumerate(evidence):
            path = _repo_path(
                root,
                relative,
                label=f"{label}.evidenceFiles[{evidence_index}]",
                errors=errors,
            )
            if path is None:
                continue
            evidence_count += 1
            if not path.is_file():
                errors.append(f"claim evidence is missing: {relative}")

    if len(claim_ids) != len(set(claim_ids)):
        errors.append("claim IDs must be unique")
    actual_ids = set(claim_ids)
    if actual_ids != EXPECTED_CLAIM_IDS:
        errors.append(
            "capability claim set changed: "
            f"missing={sorted(EXPECTED_CLAIM_IDS - actual_ids)}, "
            f"unexpected={sorted(actual_ids - EXPECTED_CLAIM_IDS)}"
        )
    return len(claims), evidence_count


def _verify_commands(root: Path, proof: dict[str, Any], errors: list[str]) -> None:
    verification = proof.get("verification")
    if not isinstance(verification, dict):
        errors.append("verification must be an object")
        return
    repository_commands = verification.get("repositoryCommands")
    if not isinstance(repository_commands, list) or not repository_commands:
        errors.append("verification.repositoryCommands must be a non-empty array")
    else:
        for index, item in enumerate(repository_commands):
            label = f"verification.repositoryCommands[{index}]"
            if not isinstance(item, dict):
                errors.append(f"{label} must be an object")
                continue
            command = item.get("command")
            if (
                not isinstance(command, list)
                or not command
                or any(not isinstance(token, str) or not token for token in command)
            ):
                errors.append(f"{label}.command must be a non-empty token array")
            working_directory = _repo_path(
                root,
                item.get("workingDirectory"),
                label=f"{label}.workingDirectory",
                errors=errors,
            )
            if working_directory is not None and not working_directory.is_dir():
                errors.append(f"{label}.workingDirectory does not exist")

    browser = verification.get("browserMatrix")
    if not isinstance(browser, dict):
        errors.append("verification.browserMatrix must be an object")
        return
    for field in ("workingDirectories", "captureContractDirectories"):
        directories = browser.get(field)
        if not isinstance(directories, list) or not directories:
            errors.append(f"verification.browserMatrix.{field} must be non-empty")
            continue
        for index, relative in enumerate(directories):
            path = _repo_path(
                root,
                relative,
                label=f"verification.browserMatrix.{field}[{index}]",
                errors=errors,
            )
            if path is not None and not (path / "package.json").is_file():
                errors.append(f"browser verification directory is invalid: {relative}")


def _verify_public_contracts(root: Path, errors: list[str]) -> None:
    try:
        quality = (root / ".github" / "workflows" / "quality.yml").read_text(
            encoding="utf-8"
        )
        readme = (root / "README.md").read_text(encoding="utf-8")
        verified = (root / "docs" / "VERIFIED_CAPABILITIES.md").read_text(
            encoding="utf-8"
        )
        upstream = (root / "UPSTREAM.md").read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"cannot read public proof documentation: {exc}")
        return

    for command in sorted(REQUIRED_QUALITY_COMMANDS):
        if command not in quality:
            errors.append(f"quality workflow is missing command: {command}")
    for label, text, required in (
        ("README.md", readme, "capability-proof.json"),
        ("README.md", readme, "docs/VERIFIED_CAPABILITIES.md"),
        ("README.md", readme, "Stars measure attention"),
        ("VERIFIED_CAPABILITIES.md", verified, "FAIR_COMPARISON_PROTOCOL.md"),
        ("UPSTREAM.md", upstream, EXPECTED_UPSTREAM_COMMIT),
        ("UPSTREAM.md", upstream, EXPECTED_UPSTREAM),
    ):
        if required not in text:
            errors.append(f"{label} is missing required proof text: {required}")

    expected_summary = {
        "total": 4,
        "missing": 0,
        "stale": 0,
        "passing": 4,
        "failing": 0,
    }
    for relative in (
        "examples/brick-offroad-hero/evidence/visual-regression-matrix.json",
        "examples/seoul-palace-hero/evidence/visual-regression-matrix.json",
    ):
        try:
            report = load_json_strict(root / relative)
        except (OSError, json.JSONDecodeError, StrictJsonError) as exc:
            errors.append(f"cannot read production matrix {relative}: {exc}")
            continue
        if report.get("ok") is not True or report.get("summary") != expected_summary:
            errors.append(f"production matrix is not passing: {relative}")


def verify_capability_proof(
    root: Path = ROOT,
    proof_path: Path | None = None,
) -> dict[str, Any]:
    root = root.resolve()
    path = proof_path or (root / "capability-proof.json")
    errors: list[str] = []
    try:
        proof = load_json_strict(path)
    except (OSError, json.JSONDecodeError, StrictJsonError) as exc:
        return {"ok": False, "errors": [f"cannot read capability proof: {exc}"]}
    if not isinstance(proof, dict):
        return {"ok": False, "errors": ["capability proof root must be an object"]}
    if proof.get("schemaVersion") != "1.0":
        errors.append("capability proof schemaVersion must be '1.0'")
    if proof.get("artifactType") != "threejs-sculpt-dna-capability-proof":
        errors.append("capability proof artifactType is invalid")

    _verify_release_metadata(root, proof, errors)
    _verify_lineage(proof, errors)
    _verify_scope(proof, errors)
    claims_checked, evidence_checked = _verify_claims(root, proof, errors)
    _verify_commands(root, proof, errors)
    _verify_public_contracts(root, errors)
    tests_discovered = _discover_tests(root, errors)

    policy = audit_policy(
        root=root,
        policy_path=root / "script-policy.json",
    )
    if policy.get("ok") is not True:
        errors.extend(
            f"script policy: {error}" for error in policy.get("errors", [])
        )

    return {
        "ok": not errors,
        "artifactType": proof.get("artifactType"),
        "release": proof.get("release"),
        "claimsChecked": claims_checked,
        "evidenceFilesChecked": evidence_checked,
        "testsDiscovered": tests_discovered,
        "scriptsChecked": policy.get("scriptsChecked", 0),
        "errors": errors,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print a JSON result")
    args = parser.parse_args(argv)
    result = verify_capability_proof()
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result["ok"]:
        print(
            "PASS: capability proof verified "
            f"({result['claimsChecked']} claims, "
            f"{result['evidenceFilesChecked']} evidence files, "
            f"{result['testsDiscovered']} tests, "
            f"{result['scriptsChecked']} scripts)."
        )
    else:
        for error in result["errors"]:
            print(f"FAIL: {error}", file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
