from __future__ import annotations

import json
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from verify_capability_proof import verify_capability_proof


class CapabilityProofTests(unittest.TestCase):
    def setUp(self) -> None:
        self.proof = json.loads(
            (ROOT / "capability-proof.json").read_text(encoding="utf-8")
        )

    def verify_mutation(self, proof: dict[str, object]) -> dict[str, object]:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "capability-proof.json"
            path.write_text(
                json.dumps(proof, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return verify_capability_proof(root=ROOT, proof_path=path)

    def test_committed_capability_proof_is_complete(self) -> None:
        result = verify_capability_proof(root=ROOT)
        self.assertTrue(result["ok"], result["errors"])
        self.assertEqual(result["claimsChecked"], 8)
        self.assertGreaterEqual(result["testsDiscovered"], 269)
        self.assertGreaterEqual(result["scriptsChecked"], 40)

    def test_proof_rejects_repository_path_escape(self) -> None:
        proof = deepcopy(self.proof)
        proof["claims"][0]["evidenceFiles"].append("../README.md")
        result = self.verify_mutation(proof)
        self.assertFalse(result["ok"])
        self.assertTrue(
            any("escapes the repository" in error for error in result["errors"])
        )

    def test_proof_rejects_release_metadata_drift(self) -> None:
        proof = deepcopy(self.proof)
        proof["release"] = "9.9.9"
        result = self.verify_mutation(proof)
        self.assertFalse(result["ok"])
        self.assertTrue(
            any("proof release must be" in error for error in result["errors"])
        )

    def test_proof_records_limits_and_exact_upstream_snapshot(self) -> None:
        self.assertEqual(
            self.proof["upstreamLineage"]["integratedSourceCommit"],
            "543da1fc0e45a703b0ac037fb040ce082c79a1c2",
        )
        limitations = " ".join(self.proof["scope"]["doesNotProve"]).lower()
        self.assertIn("stars", limitations)
        self.assertIn("visual-quality superiority", limitations)
        self.assertIn("blinded review", limitations)


if __name__ == "__main__":
    unittest.main()
