"""CLI renderer used by the Node preview API when Python is available.

Writes: UTF-8 JSON metadata, a null byte, then PNG bytes to stdout.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent
for entry in (ROOT, SCRIPTS):
    if str(entry) not in sys.path:
        sys.path.insert(0, str(entry))

from dungeon_preview_core import render_preview  # noqa: E402


def main() -> int:
    seed = sys.argv[1] if len(sys.argv) > 1 else "42"
    max_edge = int(sys.argv[2]) if len(sys.argv) > 2 else 768
    preview = render_preview(seed, max_edge=max_edge)
    meta = {
        "seed": preview["seed"],
        "numericSeed": preview["numericSeed"],
        "rooms": preview["rooms"],
        "tileset": preview["tileset"],
        "engine": "python",
    }
    sys.stdout.buffer.write(json.dumps(meta).encode("utf-8"))
    sys.stdout.buffer.write(b"\x00")
    sys.stdout.buffer.write(preview["png"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
