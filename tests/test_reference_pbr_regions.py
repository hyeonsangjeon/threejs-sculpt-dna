from __future__ import annotations

import hashlib
import io
import json
import math
import sys
import tempfile
import unittest
from argparse import Namespace
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from extract_reference_pbr import (  # noqa: E402
    build_foreground_mask,
    build_parser,
    extract,
    main,
    mask_bbox,
    resolve_source_crop,
)
from new_sculpt_spec import make_spec  # noqa: E402
from sculpt_image_io import load_image_rgba_limited, write_png_rgb  # noqa: E402


SOURCE_WIDTH = 128
SOURCE_HEIGHT = 96
PIXEL_CROP = [8, 16, 48, 64]
NORMALIZED_CROP = [0.0625, 1 / 6, 0.375, 2 / 3]


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_two_material_reference(path: Path) -> None:
    pixels = [(248, 248, 244)] * (SOURCE_WIDTH * SOURCE_HEIGHT)
    for y in range(16, 80):
        for x in range(8, 56):
            variation = 10 if (x + y) % 7 == 0 else 0
            pixels[y * SOURCE_WIDTH + x] = (162 + variation, 56, 42)
        for x in range(72, 120):
            variation = 12 if (x + y) % 5 == 0 else 0
            pixels[y * SOURCE_WIDTH + x] = (38, 74 + variation, 168)
    write_png_rgb(path, SOURCE_WIDTH, SOURCE_HEIGHT, pixels)


def extraction_args(
    image: Path,
    out_dir: Path,
    path_root: Path,
    *,
    pixel_crop: list[int] | None = None,
    normalized_crop: list[float] | None = None,
) -> Namespace:
    return Namespace(
        image=image,
        out_dir=out_dir,
        material_id="base",
        mask=None,
        crop_pixels=pixel_crop,
        crop_normalized=normalized_crop,
        size=256,
        palette_size=5,
        target_threshold=0.65,
        url_prefix="textures/base",
        spec=None,
        path_root=path_root,
        in_place=False,
        out_spec=None,
        report=None,
        allow_low_confidence=False,
        material_crop_confirmed=True,
        multi_view_reference=False,
    )


class RegionAwareReferencePbrTests(unittest.TestCase):
    def test_pixel_and_normalized_crops_resolve_to_the_same_identity(self) -> None:
        digest = "a" * 64
        pixel = resolve_source_crop(
            SOURCE_WIDTH,
            SOURCE_HEIGHT,
            pixel_crop=PIXEL_CROP,
            image_sha256=digest,
        )
        normalized = resolve_source_crop(
            SOURCE_WIDTH,
            SOURCE_HEIGHT,
            normalized_crop=NORMALIZED_CROP,
            image_sha256=digest,
        )
        self.assertIsNotNone(pixel)
        self.assertIsNotNone(normalized)
        self.assertEqual(pixel["sourcePixels"], normalized["sourcePixels"])
        self.assertEqual(pixel["normalized"], normalized["normalized"])
        self.assertEqual(pixel["identitySha256"], normalized["identitySha256"])
        self.assertEqual(pixel["requested"]["units"], "pixels")
        self.assertEqual(normalized["requested"]["units"], "normalized")

    def test_invalid_out_of_bounds_non_finite_and_tiny_crops_fail_closed(self) -> None:
        digest = "b" * 64
        invalid = (
            {"pixel_crop": [0, 0, 31, 64]},
            {"pixel_crop": [100, 0, 32, 64]},
            {"normalized_crop": [-0.1, 0, 0.5, 0.5]},
            {"normalized_crop": [0.75, 0, 0.5, 0.5]},
            {"normalized_crop": [0, 0, math.nan, 0.5]},
        )
        for crop in invalid:
            with self.subTest(crop=crop), self.assertRaises(ValueError):
                resolve_source_crop(
                    SOURCE_WIDTH,
                    SOURCE_HEIGHT,
                    image_sha256=digest,
                    **crop,
                )
        with self.assertRaisesRegex(ValueError, "only one"):
            resolve_source_crop(
                SOURCE_WIDTH,
                SOURCE_HEIGHT,
                pixel_crop=PIXEL_CROP,
                normalized_crop=NORMALIZED_CROP,
                image_sha256=digest,
            )

    def test_parser_rejects_ambiguous_crop_flags(self) -> None:
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            build_parser().parse_args(
                [
                    "reference.png",
                    "--out-dir",
                    "generated",
                    "--crop-pixels",
                    "8",
                    "16",
                    "48",
                    "64",
                    "--crop-normalized",
                    "0.0625",
                    "0.16666667",
                    "0.375",
                    "0.66666667",
                ]
            )

    def test_region_maps_and_identity_are_deterministic_across_units(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            image = root / "reference.png"
            write_two_material_reference(image)
            pixel_report, pixel_patch = extract(
                extraction_args(
                    image,
                    root / "pixel-maps",
                    root,
                    pixel_crop=PIXEL_CROP,
                )
            )
            normalized_report, normalized_patch = extract(
                extraction_args(
                    image,
                    root / "normalized-maps",
                    root,
                    normalized_crop=NORMALIZED_CROP,
                )
            )

            self.assertTrue(pixel_report["ok"])
            self.assertTrue(normalized_report["ok"])
            self.assertEqual(
                pixel_report["sourceImageSha256"],
                file_sha256(image),
            )
            self.assertEqual(
                pixel_report["sourceCrop"]["identitySha256"],
                normalized_report["sourceCrop"]["identitySha256"],
            )
            self.assertEqual(
                pixel_patch["referencePbr"]["sourceCrop"]["sourcePixels"],
                {"x": 8, "y": 16, "width": 48, "height": 64},
            )
            self.assertEqual(
                pixel_patch["referencePbr"]["sourceImageSha256"],
                file_sha256(image),
            )
            self.assertTrue(pixel_report["palette"][0].startswith("#"))
            for channel in ("albedo", "roughness", "height", "normal", "ao"):
                pixel_map = root / pixel_report["maps"][channel]["path"]
                normalized_map = root / normalized_report["maps"][channel]["path"]
                self.assertEqual(file_sha256(pixel_map), file_sha256(normalized_map))

    def test_no_crop_keeps_the_legacy_auto_foreground_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            image = root / "reference.png"
            write_two_material_reference(image)
            report, patch = extract(
                extraction_args(image, root / "auto-maps", root)
            )
            self.assertIsNone(report["sourceCrop"])
            self.assertNotIn("sourceCrop", patch["referencePbr"])
            self.assertEqual(report["diagnostics"]["cropMode"], "auto-foreground")
            width, height, pixels, _ = load_image_rgba_limited(image, 1024)
            mask, _, _ = build_foreground_mask(width, height, pixels)
            expected = mask_bbox(width, height, mask)
            self.assertEqual(
                report["diagnostics"]["cropBBoxPixels"],
                {
                    "x": expected[0],
                    "y": expected[1],
                    "width": expected[2],
                    "height": expected[3],
                },
            )

    def test_in_place_patch_records_crop_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            image = root / "reference.png"
            spec_path = root / "object-sculpt-spec.json"
            write_two_material_reference(image)
            spec_path.write_text(
                json.dumps(make_spec("Crop Test", "reference.png")),
                encoding="utf-8",
            )
            with redirect_stdout(io.StringIO()):
                exit_code = main(
                    [
                        str(image),
                        "--out-dir",
                        str(root / "maps"),
                        "--material-id",
                        "base",
                        "--crop-pixels",
                        *[str(value) for value in PIXEL_CROP],
                        "--size",
                        "256",
                        "--target-threshold",
                        "0.65",
                        "--url-prefix",
                        "textures/base",
                        "--path-root",
                        str(root),
                        "--material-crop-confirmed",
                        "--spec",
                        str(spec_path),
                        "--in-place",
                    ]
                )
            self.assertEqual(exit_code, 0)
            updated = json.loads(spec_path.read_text(encoding="utf-8"))
            reference_pbr = updated["materials"][0]["referencePbr"]
            self.assertEqual(reference_pbr["sourceCrop"]["requested"]["units"], "pixels")
            self.assertEqual(reference_pbr["sourceImageSha256"], file_sha256(image))
            self.assertEqual(
                updated["pbrExtractionHistory"][-1]["sourceCrop"]["identitySha256"],
                reference_pbr["sourceCrop"]["identitySha256"],
            )


if __name__ == "__main__":
    unittest.main()
