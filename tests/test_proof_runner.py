from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import prove  # noqa: E402


FIXED_TIME = datetime(2026, 7, 31, 1, 2, 3, tzinfo=timezone.utc)


class ProofRunnerTests(unittest.TestCase):
    def test_contract_has_exactly_six_stable_checks(self) -> None:
        self.assertEqual(
            [item["id"] for item in prove.CHECKS],
            [
                "executable-policy",
                "capability-contract",
                "first-clone-doctor",
                "python-compile",
                "python-contracts",
                "release-evidence",
            ],
        )
        self.assertTrue(
            all(item["command"][0] == "python3" for item in prove.CHECKS)
        )

    @patch("prove.subprocess.run")
    def test_subprocess_is_shell_free_and_uses_current_python(self, mocked_run) -> None:
        mocked_run.return_value = subprocess.CompletedProcess(
            ["python3"],
            0,
            stdout="pass",
            stderr="",
        )
        result = prove.run_check(prove.CHECKS[0], root=ROOT)
        command = mocked_run.call_args.args[0]
        options = mocked_run.call_args.kwargs
        self.assertEqual(command[0], sys.executable)
        self.assertNotIn("shell", options)
        self.assertEqual(options["cwd"], ROOT)
        self.assertEqual(result["status"], "pass")

    @patch("prove.subprocess.run")
    def test_failed_check_fails_closed(self, mocked_run) -> None:
        mocked_run.return_value = subprocess.CompletedProcess(
            ["python3"],
            2,
            stdout="",
            stderr="contract failed",
        )
        check = prove.run_check(prove.CHECKS[1], root=ROOT)
        proof = prove.build_proof_run(
            commit="working-tree",
            checks=[check],
            started_at=FIXED_TIME,
            finished_at=FIXED_TIME,
            root=ROOT,
        )
        self.assertFalse(proof["ok"])
        self.assertEqual(proof["summary"]["status"], "fail")
        self.assertEqual(proof["summary"]["failed"], 1)
        self.assertEqual(check["stderr"]["preview"], "contract failed")

    def test_captured_output_is_bounded_and_hashes_the_full_stream(self) -> None:
        output = "evidence-" * 2000
        captured = prove.captured_stream(output)
        self.assertEqual(
            len(captured["preview"]),
            prove.MAX_CAPTURE_CHARACTERS,
        )
        self.assertTrue(captured["truncated"])
        self.assertEqual(
            captured["sha256"],
            hashlib.sha256(output.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(captured["characters"], len(output))

    def test_proof_records_release_environment_and_limitations(self) -> None:
        checks = [
            {
                "id": item["id"],
                "status": "pass",
                "durationMs": 1,
            }
            for item in prove.CHECKS
        ]
        proof = prove.build_proof_run(
            commit="a" * 40,
            checks=checks,
            started_at=FIXED_TIME,
            finished_at=FIXED_TIME,
            root=ROOT,
        )
        plugin = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        self.assertTrue(proof["ok"])
        self.assertTrue(proof["offline"])
        self.assertEqual(proof["release"], plugin["version"])
        self.assertEqual(proof["generatedAt"], "2026-07-31T01:02:03Z")
        self.assertEqual(proof["summary"]["passed"], 6)
        self.assertIn("stars", " ".join(proof["limitations"]).lower())
        self.assertEqual(
            proof["inputs"]["capabilityProofSha256"],
            prove.file_sha256(ROOT / "capability-proof.json"),
        )
        self.assertEqual(
            proof["inputs"]["scriptPolicySha256"],
            prove.file_sha256(ROOT / "script-policy.json"),
        )

    def test_commit_validation_rejects_ambiguous_values(self) -> None:
        for value in ("main", "A" * 40, "../commit", "a" * 39):
            with self.subTest(value=value), self.assertRaises(ValueError):
                prove.validate_commit(value)
        self.assertEqual(prove.validate_commit("working-tree"), "working-tree")
        self.assertEqual(prove.validate_commit("f" * 40), "f" * 40)

    @patch("prove.run_proof")
    def test_output_is_only_written_when_explicit(self, mocked_run) -> None:
        mocked_run.return_value = {
            "ok": True,
            "summary": {
                "status": "pass",
                "passed": 0,
                "failed": 0,
                "total": 0,
            },
            "checks": [],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "proof-run.json"
            with patch("builtins.print"):
                self.assertEqual(prove.main(["--commit", "working-tree"]), 0)
            self.assertFalse(output.exists())
            with patch("builtins.print"):
                self.assertEqual(
                    prove.main(
                        [
                            "--commit",
                            "working-tree",
                            "--output",
                            str(output),
                        ]
                    ),
                    0,
                )
            self.assertTrue(output.is_file())


if __name__ == "__main__":
    unittest.main()
