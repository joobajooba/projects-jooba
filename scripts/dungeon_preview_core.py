"""Shared dungeon preview render used by scripts and local tooling."""

from __future__ import annotations

import io
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image

from dungeon_generator.traits import KEEP_DESCRIPTION, describe_dungeon, opensea_metadata
from dungeon_generator import render_dungeon


def render_preview(seed_value: str, max_edge: int = 768):
    described = describe_dungeon(seed_value)
    dungeon = described["dungeon"]
    tileset = described["tileset"]
    image = render_dungeon(
        dungeon,
        tileset=tileset,
        show_labels=False,
        show_doors=False,
        show_stairs=False,
    )
    width, height = image.size
    edge = max(width, height)
    if edge > max_edge:
        scale = max_edge / edge
        image = image.resize(
            (max(1, int(width * scale)), max(1, int(height * scale))),
            resample=Image.NEAREST,
        )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    payload = {
        "seed": described["seed"],
        "numericSeed": described["numericSeed"],
        "rooms": described["rooms"],
        "doors": described["doors"],
        "stairs": described["stairs"],
        "tileset": tileset,
        "biome": described["biome"],
        "dungeonType": described["dungeonType"],
        "miniBoss": described["miniBoss"],
        "options": described["options"],
        "attributes": described["attributes"],
        "engine": "donjon-tall-tiles",
        "png": buffer.getvalue(),
    }
    payload["metadata"] = opensea_metadata(
        seed_value=described["seed"],
        image_url="",
        external_url="",
        description=KEEP_DESCRIPTION,
        attributes=described["attributes"],
    )
    return payload
