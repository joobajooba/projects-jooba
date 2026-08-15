"""Load a PixelLab dual-grid 15-tile (4x4) sheet.

PixelLab's "15-tileset" export is a corner Wang set meant for dual-grid
rendering: each drawn tile sits on the vertex between four painted cells
and is chosen by which of those four cells are filled (floor).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TILE_SIZE = 32

# SpriteCook / PixelLab dual-grid layout:
# mask bits = filled corners of the dual tile
#   1 = top-left painted cell, 2 = top-right, 4 = bottom-left, 8 = bottom-right
# frame index on the 4x4 sheet (col = frame % 4, row = frame // 4)
# mask 0 = draw nothing (or the secondary terrain, if fill_exterior)
FRAME_BY_MASK: list[int] = [
    -1,  # 0  empty
    15,  # 1  TL
    8,  # 2  TR
    9,  # 3  TL+TR
    0,  # 4  BL
    11,  # 5  TL+BL
    14,  # 6  TR+BL (diagonal)
    7,  # 7  TL+TR+BL
    13,  # 8  BR
    4,  # 9  TL+BR (diagonal)
    1,  # 10 TR+BR
    10,  # 11 TL+TR+BR
    3,  # 12 BL+BR
    2,  # 13 TL+BL+BR
    5,  # 14 TR+BL+BR
    6,  # 15 all four = solid floor
]


@dataclass(frozen=True)
class TilesetPreset:
    name: str
    path: Path
    fill_exterior: bool
    slice_dir: str


def _slug(name: str) -> str:
    return "_".join(
        part
        for part in "".join(c.lower() if c.isalnum() else " " for c in name).split()
    )


def _discover_presets() -> dict[str, TilesetPreset]:
    presets: dict[str, TilesetPreset] = {}
    tiles_dir = ROOT / "Tiles"
    if not tiles_dir.exists():
        return presets
    for path in sorted(tiles_dir.glob("*.png")):
        name = _slug(path.stem)
        if not name:
            continue
        preset = TilesetPreset(name, path, True, f"pixellab_{name}_32")
        presets[name] = preset
        for alias in name.split("_"):
            presets.setdefault(alias, preset)
    return presets


PRESETS: dict[str, TilesetPreset] = _discover_presets()
DEFAULT_PRESET = next(iter(PRESETS.values())) if PRESETS else TilesetPreset(
    "missing", ROOT / "Tiles" / "missing.png", True, "pixellab_missing_32"
)
DEFAULT_SHEET = DEFAULT_PRESET.path


@dataclass
class PixelLabTileset:
    tile_size: int
    floor: Image.Image
    solid_walls: tuple[Image.Image, ...]
    void: Image.Image
    by_mask: dict[int, Image.Image | None]
    fill_exterior: bool = False


def resolve_tileset(
    sheet_path: Path | str | None = None,
) -> tuple[Path, bool, str]:
    """Return (sheet path, fill_exterior, slice directory name)."""
    if sheet_path is None:
        preset = DEFAULT_PRESET
        return preset.path, preset.fill_exterior, preset.slice_dir
    key = str(sheet_path).strip().lower()
    if key in PRESETS:
        preset = PRESETS[key]
        return preset.path, preset.fill_exterior, preset.slice_dir
    path = Path(sheet_path)
    key = _slug(path.stem)
    if key in PRESETS:
        preset = PRESETS[key]
        return preset.path, preset.fill_exterior, preset.slice_dir
    return path, True, f"pixellab_{key or path.stem}_32"


def load_pixellab_tileset(sheet_path: Path | str | None = None) -> PixelLabTileset:
    path, fill_exterior, _slice_dir = resolve_tileset(sheet_path)
    sheet = Image.open(path).convert("RGBA")
    src = min(sheet.size) // 4
    if src < 8:
        raise ValueError(f"Expected at least a 4x4 tile sheet, got {sheet.size}")

    def cell(tx: int, ty: int) -> Image.Image:
        tile = sheet.crop(
            (tx * src, ty * src, (tx + 1) * src, (ty + 1) * src)
        ).convert("RGBA")
        if src != TILE_SIZE:
            tile = tile.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
        return tile

    by_mask: dict[int, Image.Image | None] = {}
    for mask, frame in enumerate(FRAME_BY_MASK):
        if frame < 0:
            by_mask[mask] = None
            continue
        by_mask[mask] = cell(frame % 4, frame // 4)

    floor = by_mask[15]
    assert floor is not None
    # PixelLab leaves frame 12 out of the 15 transition lookup. In this sheet
    # it is the seamless flat tile for the secondary terrain.
    solid_walls = (cell(0, 3),)
    if fill_exterior:
        by_mask[0] = solid_walls[0]
        void = solid_walls[0].copy()
    else:
        void = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (0, 0, 0, 255))

    return PixelLabTileset(
        tile_size=TILE_SIZE,
        floor=floor,
        solid_walls=solid_walls,
        void=void,
        by_mask=by_mask,
        fill_exterior=fill_exterior,
    )


def load_moss_tileset(sheet_path: Path | str | None = None) -> PixelLabTileset:
    """Back-compat alias."""
    return load_pixellab_tileset(sheet_path)
