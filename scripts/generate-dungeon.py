#!/usr/bin/env python3
"""Render a high-res dungeon PNG and OpenSea metadata from a winning hash."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from dungeon_preview_core import render_preview  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", required=True, help="Winning hash or numeric seed")
    parser.add_argument("--out", default="dungeon.png")
    args = parser.parse_args()

    preview = render_preview(args.seed, max_edge=2048)
    out_path = Path(args.out)
    out_path.write_bytes(preview["png"])
    meta_path = out_path.with_suffix(".json")
    meta = {key: value for key, value in preview.items() if key != "png"}
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"seed: {preview['numericSeed']}")
    print(f"rooms: {preview['rooms']}")
    print(f"tileset: {preview['tileset']}")
    print(f"wrote: {out_path}")
    print(f"metadata: {meta_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
