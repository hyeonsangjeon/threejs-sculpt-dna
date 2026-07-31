from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class CommunityFilesTests(unittest.TestCase):
    def test_roadmap_and_contributing_are_linked_to_current_project(self) -> None:
        roadmap = (ROOT / "ROADMAP.md").read_text(encoding="utf-8")
        contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
        self.assertIn("Coverage Curator 2", roadmap)
        self.assertIn("hyeonsangjeon/threejs-sculpt-dna", contributing)
        self.assertIn("visual evidence", contributing.lower())
        self.assertIn("Reference image policy", contributing)

    def test_issue_and_pull_request_templates_cover_public_workflows(self) -> None:
        templates = ROOT / ".github" / "ISSUE_TEMPLATE"
        for filename in (
            "bug_report.yml",
            "feature_request.yml",
            "reconstruction_request.yml",
            "config.yml",
        ):
            with self.subTest(filename=filename):
                self.assertTrue((templates / filename).exists())
        pull_request = (
            ROOT / ".github" / "pull_request_template.md"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "python3 scripts/prove.py --output proof-run.json",
            pull_request,
        )
        self.assertIn("Preview variants are not described as production-ready", pull_request)

    def test_trust_and_quality_contracts_are_public(self) -> None:
        security = (ROOT / "SECURITY.md").read_text(encoding="utf-8")
        conduct = (ROOT / "CODE_OF_CONDUCT.md").read_text(encoding="utf-8")
        bolt = (ROOT / "docs" / "V2_IMPROVEMENT_BOLT.md").read_text(
            encoding="utf-8"
        )
        quality = (
            ROOT / ".github" / "workflows" / "quality.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("script-policy.json", security)
        self.assertIn("Security", security)
        self.assertIn("Enforcement", conduct)
        self.assertIn("BOLT-08", bolt)
        for required_path in (
            '"plugin.json"',
            '".codex-plugin/**"',
            '".github/plugin/**"',
            '"skills/**"',
            '"scripts/**"',
            '"adapters/**"',
            '"docs/**"',
            '"examples/**"',
        ):
            self.assertIn(required_path, quality)
        self.assertIn(
            'python3 scripts/prove.py --output proof-run.json --commit "$GITHUB_SHA"',
            quality,
        )
        self.assertIn(
            "python3 -m unittest tests.test_brick_offroad_hero -q",
            quality,
        )
        self.assertIn("npm audit --omit=dev --audit-level=high", quality)
        self.assertIn("--bundle", quality)
        self.assertIn("--external:three", quality)
        self.assertIn("react-three-fiber-adapter:", quality)
        self.assertIn("Verify committed adapter output", quality)


if __name__ == "__main__":
    unittest.main()
