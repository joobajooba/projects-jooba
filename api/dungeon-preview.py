"""Vercel / local-compatible dungeon preview using the vendored Dungeon_Generator."""

from __future__ import annotations

import io
import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image

from dungeon_generator import DungeonOptions, create_dungeon, render_dungeon  # noqa: E402

TILESETS = [
    "ashfall",
    "cloudsea",
    "deepkarst",
    "dreamveil",
    "farvoid",
    "frostbite",
    "greensward",
    "moondust",
    "mossruin",
    "sporewild",
    "stonekeep",
    "sunscorch",
    "tempest",
    "underworld",
    "verdant",
]


def seed_to_int(value: str) -> int:
    text = str(value or "42").strip()
    if text.startswith(("0x", "0X")):
        text = text[2:]
    if text and all(ch in "0123456789abcdefABCDEF" for ch in text) and len(text) >= 8:
        return int(text[:16], 16) % (2**31)
    if text.isdigit():
        return int(text) % (2**31)
    return abs(hash(text)) % (2**31)


def tileset_for_seed(seed: int) -> str:
    return TILESETS[seed % len(TILESETS)]


def render_preview(seed_value: str, max_edge: int = 768):
    numeric = seed_to_int(seed_value)
    tileset = tileset_for_seed(numeric)
    dungeon = create_dungeon(
        DungeonOptions(
            seed=numeric,
            n_rows=39,
            n_cols=39,
            room_min=5,
            room_max=9,
            room_count_min=10,
            room_count_max=14,
            corridor_layout="Straight",
            corridor_loops=8,
            circular_rooms="None",
            doors="Basic",
            remove_deadends=90,
            add_stairs=2,
        )
    )
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
    return {
        "seed": seed_value,
        "numericSeed": numeric,
        "rooms": dungeon.n_rooms,
        "tileset": tileset,
        "png": buffer.getvalue(),
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        seed = (query.get("seed") or ["42"])[0]
        fmt = ((query.get("format") or ["png"])[0] or "png").lower()

        try:
            preview = render_preview(seed)
        except Exception as exc:  # noqa: BLE001
            payload = json.dumps({"error": f"Dungeon render failed: {exc}"}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if fmt in {"json", "meta"}:
            body = json.dumps(
                {
                    "seed": preview["seed"],
                    "numericSeed": preview["numericSeed"],
                    "rooms": preview["rooms"],
                    "tileset": preview["tileset"],
                    "imageUrl": f"/api/dungeon-preview?seed={seed}&format=png",
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "public, max-age=86400, immutable")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        png = preview["png"]
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Cache-Control", "public, max-age=86400, immutable")
        self.send_header("Content-Length", str(len(png)))
        self.end_headers()
        self.wfile.write(png)

    def log_message(self, format, *args):  # noqa: A003
        return
