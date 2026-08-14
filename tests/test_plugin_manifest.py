from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PluginManifestTests(unittest.TestCase):
    def test_marketplace_registers_root_plugin(self) -> None:
        plugin = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        marketplace = json.loads(
            (
                ROOT / ".github" / "plugin" / "marketplace.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(marketplace["name"], "threejs-copilot-plugins")
        self.assertEqual(len(marketplace["plugins"]), 1)
        entry = marketplace["plugins"][0]
        self.assertEqual(entry["name"], plugin["name"])
        self.assertEqual(entry["version"], plugin["version"])
        self.assertEqual(entry["source"], ".")
        self.assertEqual(entry["license"], "MIT")

    def test_public_brand_name_does_not_include_cli(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertTrue(
            readme.startswith("# threejs-sculpt-dna — A GitHub Copilot Plugin")
        )
        self.assertNotIn(
            "# Three.js Sculpt DNA for GitHub Copilot CLI",
            readme,
        )

    def test_readme_and_manual_document_direct_and_optional_marketplace_install(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        guide = (ROOT / "docs" / "USER_GUIDE.md").read_text(encoding="utf-8")
        install = "threejs-sculpt-dna@threejs-copilot-plugins"
        repository = (
            "hyeonsangjeon/threejs-sculpt-dna"
        )
        for document in (readme, guide):
            self.assertIn(f"copilot plugin install {repository}", document)
            self.assertIn(install, document)
            self.assertIn(repository, document)
        self.assertIn(
            "assets/github-copilot-image-prompt-example.png",
            readme,
        )

    def test_every_skill_reference_is_directly_linked(self) -> None:
        for skill_dir in sorted((ROOT / "skills").iterdir()):
            references_dir = skill_dir / "references"
            if not references_dir.is_dir():
                continue

            skill = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
            linked = set(
                re.findall(
                    r"\]\((references/[^)#\s]+)(?:#[^)]+)?\)",
                    skill,
                )
            )
            expected = {
                path.relative_to(skill_dir).as_posix()
                for path in references_dir.rglob("*")
                if path.is_file()
            }
            self.assertFalse(
                expected - linked,
                f"{skill_dir.name} has unlinked references: "
                f"{sorted(expected - linked)}",
            )

    def test_overview_links_canonical_repo_skill_and_reproducible_check(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        skill = (
            ROOT / "skills" / "object-to-threejs-procedural" / "SKILL.md"
        ).read_text(encoding="utf-8")
        overview = "\n".join(readme.splitlines()[:140])

        for expected in (
            "**Canonical repository:**",
            "https://github.com/hyeonsangjeon/threejs-sculpt-dna",
            "skills/object-to-threejs-procedural/SKILL.md",
            "### Install in one command",
            "copilot plugin install hyeonsangjeon/threejs-sculpt-dna",
            "### Verified release state",
            "capability-proof.json",
            "python3 scripts/prove.py",
            "/proof/",
            "Every release claim below is backed by an executable check",
            "React Three Fiber",
            "/react/",
            "### 5-minute reproducible check",
            "assets/brick-offroad-reference.jpeg",
            "examples/repolis-tree/object-sculpt-spec.json",
            '"technicalSuitability": "pass"',
            "currentPass: complete",
        ):
            self.assertIn(expected, overview)

        for expected in (
            "## Fast Path",
            "assessment.json",
            "object-sculpt-spec.json",
            "runtime node, mesh, socket, collider, and destruction maps",
            "python3 ../../scripts/probe_reference_image.py <image>",
            "Do not use an imported mesh.",
        ):
            self.assertIn(expected, skill)

    def test_release_changelog_matches_plugin_version(self) -> None:
        plugin = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn(f"## [{plugin['version']}]", changelog)
        self.assertIn(
            "img.shields.io/github/v/release/hyeonsangjeon/threejs-sculpt-dna",
            readme,
        )

if __name__ == "__main__":
    unittest.main()
