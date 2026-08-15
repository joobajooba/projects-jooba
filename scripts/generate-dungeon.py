#!/usr/bin/env python3
"""Render a high-res dungeon PNG from a winning hash using Dungeon_Generator."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

GENERATOR = Path.home() / "Documents" / "Dungeon_Generator" / "generate.py"


def seed_to_int(value: str) -> int:
    text = value[2:] if value.startswith(("0x", "0X")) else value
    if all(ch in "0123456789abcdefABCDEF" for ch in text) and len(text) >= 8:
        return int(text[:16], 16) % (2**31)
    return abs(hash(value)) % (2**31)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", required=True, help="Winning hash or numeric seed")
    parser.add_argument("--out", default="dungeon.png")
    args = parser.parse_args()

    if not GENERATOR.exists():
        print(f"Dungeon_Generator not found at {GENERATOR}", file=sys.stderr)
        return 1

    numeric = seed_to_int(args.seed)
    return subprocess.call(
        [sys.executable, str(GENERATOR), "--seed", str(numeric), "--out", args.out]
    )


if __name__ == "__main__":
    raise SystemExit(main())
