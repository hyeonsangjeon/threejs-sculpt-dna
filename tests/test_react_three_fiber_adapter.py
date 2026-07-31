from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADAPTER = ROOT / "adapters" / "react-three-fiber"
EXAMPLE = ROOT / "examples" / "react-three-fiber"


class ReactThreeFiberAdapterTests(unittest.TestCase):
    def test_adapter_is_an_optional_peer_package(self) -> None:
        package = json.loads((ADAPTER / "package.json").read_text(encoding="utf-8"))
        plugin = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(package["name"], "@threejs-sculpt-dna/react-three-fiber")
        self.assertEqual(package["version"], plugin["version"])
        self.assertEqual(
            set(package["peerDependencies"]),
            {"react", "three", "@react-three/fiber"},
        )
        self.assertNotIn("dependencies", package)

    def test_adapter_owns_lifecycle_without_double_disposal(self) -> None:
        source = (ADAPTER / "src" / "index.tsx").read_text(encoding="utf-8")
        for contract in (
            "useLayoutEffect(() =>",
            "useFrame((state, deltaSeconds) =>",
            "root.removeFromParent();",
            "if (disposed) return;",
            "dispose={null}",
            "created.dispose();",
            "disposeObject3DResources(root);",
        ):
            self.assertIn(contract, source)
        frame_body = source.split("useFrame((state, deltaSeconds) =>", 1)[1].split(
            "});", 1
        )[0]
        self.assertNotIn("setState", frame_body)
        self.assertNotIn("setInstance", frame_body)

    def test_adapter_normalizes_plain_and_structured_factory_shapes(self) -> None:
        source = (ADAPTER / "src" / "index.tsx").read_text(encoding="utf-8")
        self.assertIn("root.userData.sculptRuntime", source)
        self.assertIn("structured?.runtime ?? embeddedRuntime", source)
        self.assertIn("structured?.stats", source)
        self.assertIn("runtime.destructionGroups", source)
        self.assertIn("stableFactoryKey", source)

    def test_runtime_tests_cover_mount_rebuild_strict_mode_and_unmount(self) -> None:
        tests = (ADAPTER / "test" / "adapter.test.tsx").read_text(encoding="utf-8")
        for contract in (
            "mount exposes action-ready maps",
            "semantic prop changes rebuild once",
            "StrictMode balances every factory allocation",
            "plain generated Object3D factories",
            "renderer.unmount()",
            "advanceFrames",
        ):
            self.assertIn(contract, tests)

    def test_live_example_reuses_the_existing_plain_three_factory(self) -> None:
        package = json.loads((EXAMPLE / "package.json").read_text(encoding="utf-8"))
        app = (EXAMPLE / "src" / "App.jsx").read_text(encoding="utf-8")
        contracts = (EXAMPLE / "contract.test.mjs").read_text(encoding="utf-8")
        self.assertEqual(
            package["dependencies"]["@threejs-sculpt-dna/react-three-fiber"],
            "file:../../adapters/react-three-fiber",
        )
        self.assertEqual(
            package["dependencies"]["@threejs-sculpt-dna/brick-offroad-factory"],
            "file:../brick-offroad-hero",
        )
        self.assertIn("@threejs-sculpt-dna/brick-offroad-factory", app)
        self.assertIn("factory={createBrickOffroad}", app)
        self.assertIn("normalizeFactoryOutput(createBrickOffroad(options))", contracts)
        self.assertTrue((EXAMPLE / "package-lock.json").is_file())
        self.assertEqual(
            (EXAMPLE / ".npmrc").read_text(encoding="utf-8").strip(),
            "install-links=true",
        )

    def test_quality_and_pages_cover_the_adapter_and_live_route(self) -> None:
        quality = (ROOT / ".github" / "workflows" / "quality.yml").read_text(
            encoding="utf-8"
        )
        pages = (
            ROOT / ".github" / "workflows" / "deploy-repolis-hero.yml"
        ).read_text(encoding="utf-8")
        self.assertIn('"adapters/**"', quality)
        self.assertIn("adapters/react-three-fiber", quality)
        self.assertIn("examples/react-three-fiber", quality)
        self.assertIn("npm test", quality)
        self.assertIn('"$PAGES_DIR/react"', pages)
        self.assertIn('examples/react-three-fiber/dist "$PAGES_DIR/react"', pages)

    def test_primary_install_is_one_command_and_r3f_is_above_the_fold(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        overview = "\n".join(readme.splitlines()[:150])
        self.assertIn(
            "copilot plugin install hyeonsangjeon/threejs-sculpt-dna",
            overview,
        )
        self.assertIn("React Three Fiber", overview)
        self.assertIn("/react/", overview)
        self.assertNotIn("Stars measure attention", overview)


if __name__ == "__main__":
    unittest.main()
