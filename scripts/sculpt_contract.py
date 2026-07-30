#!/usr/bin/env python3
"""Shared immutable contracts for ObjectSculptSpec tooling."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any


DEFAULT_PASS_ORDER = (
    "blockout",
    "structural-pass",
    "form-refinement",
    "material-pass",
    "surface-pass",
    "lighting-pass",
    "interaction-pass",
    "optimization-pass",
)
VISUAL_PASS_IDS = frozenset(DEFAULT_PASS_ORDER[:-1])

REVIEW_POLICY_VERSION = 2
LATEST_REVIEW_SELECTION = "latest-per-pass"
SHA_REQUIRED_BINDING = "local-sha256-required"
PRODUCTION_REVIEW_POLICY = {
    "version": REVIEW_POLICY_VERSION,
    "authoritativeReview": LATEST_REVIEW_SELECTION,
    "evidenceBinding": SHA_REQUIRED_BINDING,
}


def is_finite_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def score_meets_threshold(value: Any, threshold: float) -> bool:
    return is_finite_number(value) and float(value) >= threshold


def load_json_object(path: Path, label: str = "JSON") -> dict[str, Any]:
    """Load strict JSON, rejecting NaN/Infinity and non-object roots."""

    def reject_constant(value: str) -> None:
        raise ValueError(f"non-standard JSON constant {value}")

    try:
        payload = json.loads(
            path.read_text(encoding="utf-8"),
            parse_constant=reject_constant,
        )
    except OSError as exc:
        raise ValueError(f"{label} cannot be read: {path}: {exc}") from exc
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError(f"{label} is invalid JSON: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"{label} must contain a JSON object: {path}")
    return payload
