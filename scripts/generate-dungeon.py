#!/usr/bin/env python3
"""Render a high-res dungeon PNG from a winning hash using the vendored generator."""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", required=True, help="Winning hash or numeric seed")
    parser.add_argument("--out", default="dungeon.png")
    args = parser.parse_args()

    spec = importlib.util.spec_from_file_location(
        "dungeon_preview_api", ROOT / "api" / "dungeon-preview.py"
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    preview = module.render_preview(args.seed, max_edge=2048)
    Path(args.out).write_bytes(preview["png"])
    print(f"seed: {preview['numericSeed']}")
    print(f"rooms: {preview['rooms']}")
    print(f"tileset: {preview['tileset']}")
    print(f"wrote: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
