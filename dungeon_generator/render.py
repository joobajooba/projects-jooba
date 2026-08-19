"""Render a dungeon with a PixelLab dual-grid 15-tile sheet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .bits import (
    DOORSPACE,
    LOCKED,
    OPENSPACE,
    PERIMETER,
    ROOM,
    ROOM_ID,
    SECRET,
    TRAPPED,
)
from .generate import Dungeon
from .tileset import DEFAULT_SHEET, load_pixellab_tileset

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TILESET = DEFAULT_SHEET
PROPS_DIR = ROOT / "Tiles" / "props"
INHABITANTS_DIR = ROOT / "Mini-Bosses"
OBJECTS_DIR = ROOT / "Tiles" / "objects"
INHABITANT_FOLDERS = (
    INHABITANTS_DIR,
    ROOT / "dungeon_generator" / "mini_bosses",
    ROOT / "Tiles" / "inhabitants",
    OBJECTS_DIR,
)


def render_dungeon(
    dungeon: Dungeon,
    *,
    style: str = "pixellab",
    floor_tile: Path | str | None = None,
    wall_tile: Path | str | None = None,
    tileset: Path | str | None = None,
    show_grid: bool = False,
    show_labels: bool = True,
    show_doors: bool = False,
    show_stairs: bool = False,
    outer_only: bool = False,
    fill_inner_walls: bool = True,
    center: bool = True,
    margin: int | None = None,
) -> Image.Image:
    _ = (style, floor_tile, wall_tile, show_grid)  # legacy kwargs
    img, tile, content_bbox, fill_tile, overhang = _render_pixellab_dual(
        dungeon,
        tileset=tileset,
        outer_only=outer_only,
        fill_inner_walls=fill_inner_walls,
    )

    draw = ImageDraw.Draw(img)
    if outer_only:
        show_doors = False
        show_stairs = False
        show_labels = False

    if show_doors:
        _draw_doors(draw, dungeon, tile, overhang=overhang)
    if show_stairs:
        _draw_stairs(draw, dungeon, tile, overhang=overhang)
    if show_labels:
        _draw_labels(draw, dungeon, tile, overhang=overhang)
    _draw_inhabitant(img, dungeon, tile, overhang=overhang)

    img = img.convert("RGB")
    if center:
        pad = tile if margin is None else max(0, margin)
        img = _center_content(
            img, pad, bbox=content_bbox, fill_tile=fill_tile.convert("RGB")
        )
    return img


def _render_pixellab_dual(
    dungeon: Dungeon,
    *,
    tileset: Path | str | None,
    outer_only: bool = False,
    fill_inner_walls: bool = True,
) -> tuple[Image.Image, int, tuple[int, int, int, int] | None, Image.Image, int]:
    """Dual-grid: each tile covers the meeting of four painted cells."""
    tiles = load_pixellab_tileset(tileset)
    ts = tiles.tile_size
    th = tiles.tile_height
    overhang = tiles.overhang

    # Painted cell extent (inclusive indices used by the generator).
    cell_rows = dungeon.n_rows + 1
    cell_cols = dungeon.n_cols + 1
    # Dual grid is one tile larger on each axis.
    dual_rows = cell_rows + 1
    dual_cols = cell_cols + 1
    img = Image.new(
        "RGBA", (dual_cols * ts, dual_rows * ts + overhang), (0, 0, 0, 255)
    )
    if tiles.fill_exterior:
        for dr in range(dual_rows):
            for dc in range(dual_cols):
                img.paste(tiles.void, (dc * ts, dr * ts), tiles.void)

    def is_floor(r: int, c: int) -> bool:
        if not (0 <= r < cell_rows and 0 <= c < cell_cols):
            return False
        return bool(dungeon.cell[r][c] & OPENSPACE)

    if outer_only:
        exterior = _flood_exterior(cell_rows, cell_cols, is_floor)
        interior = [
            [not exterior[r][c] for c in range(cell_cols)] for r in range(cell_rows)
        ]

        def is_floor(r: int, c: int) -> bool:  # noqa: F811
            if not (0 <= r < cell_rows and 0 <= c < cell_cols):
                return False
            return interior[r][c]

    def blocks_exterior(r: int, c: int) -> bool:
        if not (0 <= r < cell_rows and 0 <= c < cell_cols):
            return False
        return is_floor(r, c) or bool(dungeon.cell[r][c] & PERIMETER)

    exterior = (
        _flood_exterior(cell_rows, cell_cols, blocks_exterior)
        if fill_inner_walls
        else None
    )

    def touches_exterior(r: int, c: int) -> bool:
        if exterior is None:
            return False
        for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
            if not (0 <= rr < cell_rows and 0 <= cc < cell_cols):
                return True
            if exterior[rr][cc]:
                return True
        return False

    inner_walls = (
        [
            [
                not is_floor(r, c)
                and not exterior[r][c]
                and (
                    not (dungeon.cell[r][c] & PERIMETER)
                    or not touches_exterior(r, c)
                )
                for c in range(cell_cols)
            ]
            for r in range(cell_rows)
        ]
        if exterior is not None
        else None
    )

    def is_enclosed_wall(r: int, c: int) -> bool:
        if inner_walls is None or not (0 <= r < cell_rows and 0 <= c < cell_cols):
            return False
        return inner_walls[r][c]

    masks = [[0] * dual_cols for _ in range(dual_rows)]
    solid_positions: set[tuple[int, int]] = set()
    for dr in range(dual_rows):
        for dc in range(dual_cols):
            # Corners of this dual tile = four painted cells around vertex (dr, dc).
            mask = 0
            if is_floor(dr - 1, dc - 1):
                mask |= 1  # top-left
            if is_floor(dr - 1, dc):
                mask |= 2  # top-right
            if is_floor(dr, dc - 1):
                mask |= 4  # bottom-left
            if is_floor(dr, dc):
                mask |= 8  # bottom-right
            masks[dr][dc] = mask
            wall_cells = (
                (dr - 1, dc - 1),
                (dr - 1, dc),
                (dr, dc - 1),
                (dr, dc),
            )
            if mask == 0 and all(
                0 <= r < cell_rows
                and 0 <= c < cell_cols
                and is_enclosed_wall(r, c)
                for r, c in wall_cells
            ):
                solid_positions.add((dr, dc))

    wall_variants: dict[int, Image.Image] = {}
    for dr in range(dual_rows):
        for dc in range(dual_cols):
            mask = masks[dr][dc]
            tile = tiles.by_mask.get(mask)
            if (dr, dc) in solid_positions:
                if tiles.fill_exterior:
                    tile = tiles.solid_walls[0]
                else:
                    cut_mask = _solid_corner_mask(
                        dr, dc, masks, solid_positions, dual_rows, dual_cols
                    )
                    if cut_mask not in wall_variants:
                        wall_variants[cut_mask] = _shape_solid_wall(
                            tiles.solid_walls[0], cut_mask
                        )
                    tile = wall_variants[cut_mask]
            if tile is not None:
                img.paste(tile, (dc * ts, dr * ts), tile)

    content_bbox = _dual_content_bbox(masks, ts, th)
    return img, ts, content_bbox, tiles.void, overhang


def _center_content(
    img: Image.Image,
    margin: int,
    bbox: tuple[int, int, int, int] | None = None,
    fill_tile: Image.Image | None = None,
) -> Image.Image:
    """Center the dungeon on a square canvas with matching opposite margins."""
    if bbox is None:
        bbox = img.convert("L").point(lambda p: 255 if p > 12 else 0).getbbox()
    if bbox is None:
        return img
    cropped = img.crop(bbox)
    width, height = cropped.size
    side = max(img.width, img.height, width + margin * 2, height + margin * 2)
    paste_x = (side - width) // 2
    paste_y = (side - height) // 2
    canvas = Image.new(img.mode, (side, side), img.getpixel((0, 0)))
    if fill_tile is not None:
        tile = fill_tile.convert(img.mode)
        tw, th = tile.size
        origin_x, origin_y = bbox[0], bbox[1]
        offset_x = (origin_x - paste_x) % tw
        offset_y = (origin_y - paste_y) % th
        for y in range(-offset_y, side, th):
            for x in range(-offset_x, side, tw):
                canvas.paste(tile, (x, y))
    canvas.paste(cropped, (paste_x, paste_y))
    return canvas


def _dual_content_bbox(
    masks: list[list[int]],
    tile_size: int,
    tile_height: int | None = None,
) -> tuple[int, int, int, int] | None:
    rows = len(masks)
    cols = len(masks[0]) if rows else 0
    min_r = min_c = None
    max_r = max_c = None
    for r in range(rows):
        for c in range(cols):
            if masks[r][c] == 0:
                continue
            min_r = r if min_r is None else min(min_r, r)
            max_r = r if max_r is None else max(max_r, r)
            min_c = c if min_c is None else min(min_c, c)
            max_c = c if max_c is None else max(max_c, c)
    if min_r is None or min_c is None or max_r is None or max_c is None:
        return None
    th = tile_height or tile_size
    return (
        min_c * tile_size,
        min_r * tile_size,
        (max_c + 1) * tile_size,
        max_r * tile_size + th,
    )


def _solid_corner_mask(
    row: int,
    col: int,
    masks: list[list[int]],
    solid_positions: set[tuple[int, int]],
    rows: int,
    cols: int,
) -> int:
    """Corners to chamfer where solid masonry meets true empty exterior."""

    def empty(rr: int, cc: int) -> bool:
        if not (0 <= rr < rows and 0 <= cc < cols):
            return True
        return masks[rr][cc] == 0 and (rr, cc) not in solid_positions

    north = empty(row - 1, col)
    south = empty(row + 1, col)
    west = empty(row, col - 1)
    east = empty(row, col + 1)
    result = 0
    if empty(row - 1, col - 1) and (north or west):
        result |= 1  # NW
    if empty(row - 1, col + 1) and (north or east):
        result |= 2  # NE
    if empty(row + 1, col - 1) and (south or west):
        result |= 4  # SW
    if empty(row + 1, col + 1) and (south or east):
        result |= 8  # SE
    return result


def _shape_solid_wall(tile: Image.Image, corner_mask: int) -> Image.Image:
    """Apply small pixel-art chamfers to exposed solid-wall corners."""
    shaped = tile.copy()
    draw = ImageDraw.Draw(shaped)
    size = shaped.width
    cut = max(6, size * 3 // 8)
    black = (0, 0, 0, 255)
    if corner_mask & 1:
        draw.polygon(((0, 0), (cut, 0), (0, cut)), fill=black)
    if corner_mask & 2:
        draw.polygon(((size - 1, 0), (size - cut - 1, 0), (size - 1, cut)), fill=black)
    if corner_mask & 4:
        draw.polygon(((0, size - 1), (cut, size - 1), (0, size - cut - 1)), fill=black)
    if corner_mask & 8:
        draw.polygon(
            (
                (size - 1, size - 1),
                (size - cut - 1, size - 1),
                (size - 1, size - cut - 1),
            ),
            fill=black,
        )
    return shaped


def _flood_exterior(rows: int, cols: int, is_floor) -> list[list[bool]]:
    exterior = [[False] * cols for _ in range(rows)]
    stack: list[tuple[int, int]] = []
    for r in range(rows):
        for c in (0, cols - 1):
            if not is_floor(r, c):
                stack.append((r, c))
    for c in range(cols):
        for r in (0, rows - 1):
            if not is_floor(r, c):
                stack.append((r, c))
    while stack:
        r, c = stack.pop()
        if not (0 <= r < rows and 0 <= c < cols):
            continue
        if exterior[r][c] or is_floor(r, c):
            continue
        exterior[r][c] = True
        stack.extend(((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)))
    return exterior


def _cell_origin(
    r: int, c: int, tile: int, overhang: int = 0
) -> tuple[int, int]:
    """Top-left pixel of painted cell (r,c) on the dual-grid canvas.

    Dual tiles sit on vertices; each painted cell is the square between
    vertices (c,r), (c+1,r), (c,r+1), (c+1,r+1), which starts at half a
    tile offset from the dual origin. Tall tiles add a north overhang.
    """
    return c * tile + tile // 2, overhang + r * tile + tile // 2


def _draw_doors(
    draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int, overhang: int = 0
) -> None:
    for door in dungeon.doors:
        r, c = door["row"], door["col"]
        cell = dungeon.cell[r][c]
        if not (cell & DOORSPACE):
            continue
        x0, y0 = _cell_origin(r, c, tile, overhang=overhang)
        # Shift into cell center: dual tile at (c,r) is the NW corner of the cell,
        # so the cell spans [c,c+1] x [r,r+1] in dual space → origin already TL.
        # Wait: dual tile (dc,dr) at (dc*ts, dr*ts) covers vertex (dr,dc).
        # Painted cell (r,c) occupies dual verts (c,r)..(c+1,r+1), so TL = (c*ts, r*ts).
        cx = x0 + tile // 2
        cy = y0 + tile // 2
        fill = (235, 200, 170)
        outline = (20, 8, 12)

        left = bool(dungeon.cell[r][c - 1] & OPENSPACE) if c > 0 else False
        right = (
            bool(dungeon.cell[r][c + 1] & OPENSPACE) if c < dungeon.n_cols else False
        )
        up = bool(dungeon.cell[r - 1][c] & OPENSPACE) if r > 0 else False
        down = (
            bool(dungeon.cell[r + 1][c] & OPENSPACE) if r < dungeon.n_rows else False
        )
        horizontal = left and right and not (up and down)

        if door.get("key") == "secret" or cell & SECRET:
            font = _font(max(12, tile // 2))
            draw.text((cx, cy), "$", fill=(255, 220, 120), font=font, anchor="mm")
            continue

        thick = max(2, tile // 10)
        if horizontal:
            draw.rectangle(
                [x0 + 2, cy - thick, x0 + tile - 3, cy + thick],
                fill=fill,
                outline=outline,
            )
        else:
            draw.rectangle(
                [cx - thick, y0 + 2, cx + thick, y0 + tile - 3],
                fill=fill,
                outline=outline,
            )
        if cell & LOCKED:
            draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(40, 15, 20))
        elif cell & TRAPPED:
            draw.line([(cx - 4, cy - 4), (cx + 4, cy + 4)], fill=(200, 40, 40), width=2)
            draw.line([(cx + 4, cy - 4), (cx - 4, cy + 4)], fill=(200, 40, 40), width=2)


def _draw_stairs(
    draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int, overhang: int = 0
) -> None:
    for stair in dungeon.stairs:
        r, c = stair["row"], stair["col"]
        if not (dungeon.cell[r][c] & OPENSPACE):
            continue
        x0, y0 = _cell_origin(r, c, tile, overhang=overhang)
        color = (240, 210, 190)
        steps = max(4, tile // 5)
        gap = tile / (steps + 1)
        direction = stair.get("dir", "north")
        if direction in ("north", "south"):
            for i in range(1, steps + 1):
                y = int(y0 + gap * i)
                draw.line([(x0 + 4, y), (x0 + tile - 5, y)], fill=color, width=2)
        else:
            for i in range(1, steps + 1):
                x = int(x0 + gap * i)
                draw.line([(x, y0 + 4), (x, y0 + tile - 5)], fill=color, width=2)


def _draw_labels(
    draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int, overhang: int = 0
) -> None:
    font = _font(max(14, int(tile * 0.45)))
    shadow = (10, 4, 8)
    fill = (255, 230, 200)
    inhabitant_room = (dungeon.inhabitant or {}).get("room_id")

    for room_id, room in dungeon.rooms.items():
        r = room.get("label_row", (room["north"] + room["south"]) // 2)
        c = room.get("label_col", (room["west"] + room["east"]) // 2)
        if not (dungeon.cell[r][c] & ROOM):
            continue
        x0, y0 = _cell_origin(r, c, tile, overhang=overhang)
        cx = x0 + tile // 2
        cy = y0 + tile // 2
        if room_id == inhabitant_room:
            cy -= tile
        text = str(room_id)
        draw.text((cx + 1, cy + 1), text, fill=shadow, font=font, anchor="mm")
        draw.text((cx, cy), text, fill=fill, font=font, anchor="mm")


def _room_pixel_center(
    bounds: dict, tile: int, overhang: int = 0
) -> tuple[float, float]:
    """Geometric center of a room's painted-cell rectangle, in canvas pixels."""
    west = bounds["west"]
    east = bounds["east"]
    north = bounds["north"]
    south = bounds["south"]
    cx = (west + east + 2) * tile / 2
    cy = overhang + (north + south + 2) * tile / 2
    return cx, cy


def _is_painted_floor(dungeon: Dungeon, r: int, c: int, room_id: int | None) -> bool:
    if not (0 <= r <= dungeon.n_rows and 0 <= c <= dungeon.n_cols):
        return False
    cell = dungeon.cell[r][c]
    if not (cell & OPENSPACE) or (cell & DOORSPACE):
        return False
    if room_id is None:
        return True
    return bool(cell & ROOM) and ((cell & ROOM_ID) >> 6) == room_id


def _interior_floor_duals(
    dungeon: Dungeon, bounds: dict
) -> list[tuple[int, int]]:
    """Dual tiles whose four corners are this room's floor, never the north wall."""
    room_id = bounds.get("id") or bounds.get("room_id")
    north = bounds["north"]
    south = bounds["south"]
    west = bounds["west"]
    east = bounds["east"]
    tiles: list[tuple[int, int]] = []
    for dr in range(north + 1, south + 1):
        for dc in range(west + 1, east + 1):
            corners = (
                (dr - 1, dc - 1),
                (dr - 1, dc),
                (dr, dc - 1),
                (dr, dc),
            )
            if all(_is_painted_floor(dungeon, r, c, room_id) for r, c in corners):
                tiles.append((dr, dc))
    return tiles


def _lower_terrain_box(
    duals: list[tuple[int, int]], tile: int, overhang: int
) -> tuple[float, float, float, float] | None:
    """Pixel box of the walkable lower half of interior floor dual tiles.

    Tall 32x64 tiles draw upper wall terrain in the top `overhang` pixels and
    floor in the bottom `tile` pixels. Mini-bosses may only stand in that
    lower band, never on the north wall's upper surface.
    """
    if not duals:
        return None
    rows = [dr for dr, _ in duals]
    cols = [dc for _, dc in duals]
    left = min(cols) * tile
    right = (max(cols) + 1) * tile
    top = min(rows) * tile + overhang
    bottom = max(rows) * tile + overhang + tile
    if right <= left or bottom <= top:
        return None
    return float(left), float(top), float(right), float(bottom)


def _fallback_floor_box(
    bounds: dict, tile: int, overhang: int
) -> tuple[float, float, float, float]:
    """Interior painted cells with the northernmost wall-adjacent row removed."""
    west, east = bounds["west"], bounds["east"]
    north, south = bounds["north"], bounds["south"]
    floor_north = north + 1 if south > north else north
    left = west * tile + tile / 2
    right = (east + 1) * tile + tile / 2
    top = overhang + floor_north * tile + tile / 2
    bottom = overhang + (south + 1) * tile + tile / 2
    return left, top, right, bottom


def _origin_on_floor(
    left: float,
    top: float,
    right: float,
    bottom: float,
    width: int,
    height: int,
    north_gap: int = 0,
) -> tuple[int, int]:
    """Top-left so the sprite stays on lower-terrain floor, never north of it."""
    cx = (left + right) / 2
    x = round(cx - width / 2)
    floor_w = right - left
    if width <= floor_w:
        x = max(round(left), min(x, round(right - width)))

    # Keep a gap below the north wall whenever the sprite still fits.
    if north_gap > 0 and (bottom - top) - north_gap >= height:
        top += north_gap

    floor_h = bottom - top
    if height <= floor_h:
        y = round(top + (floor_h - height) / 2)
        y = max(round(top), min(y, round(bottom - height)))
    else:
        # Taller than the floor: pin the sprite top to the floor so it cannot
        # enter upper wall terrain. Feet may extend south.
        y = round(top)
    return x, y


def _inhabitant_path(kind: str) -> Path:
    for folder in INHABITANT_FOLDERS:
        path = folder / f"{kind}.png"
        if path.exists():
            return path
    return INHABITANTS_DIR / f"{kind}.png"


def _draw_inhabitant(
    img: Image.Image, dungeon: Dungeon, tile: int, overhang: int = 0
) -> None:
    inhabitant = dungeon.inhabitant
    if not inhabitant:
        return
    kind = inhabitant.get("kind")
    if not kind:
        return
    sprite = _load_prop(_inhabitant_path(kind), tile, scale_to_tile=False)
    if sprite is None:
        return
    visible = sprite.getbbox()
    if visible:
        sprite = sprite.crop(visible)
    room = dungeon.rooms.get(inhabitant.get("room_id"))
    bounds = dict(room or {})
    if all(key in inhabitant for key in ("north", "south", "west", "east")):
        bounds.update(
            {
                "north": inhabitant["north"],
                "south": inhabitant["south"],
                "west": inhabitant["west"],
                "east": inhabitant["east"],
                "room_id": inhabitant.get("room_id"),
            }
        )
    if not bounds or not all(key in bounds for key in ("north", "south", "west", "east")):
        return
    duals = _interior_floor_duals(dungeon, bounds)
    box = _lower_terrain_box(duals, tile, overhang) or _fallback_floor_box(
        bounds, tile, overhang
    )
    x, y = _origin_on_floor(
        *box, sprite.size[0], sprite.size[1], north_gap=overhang
    )
    img.paste(sprite, (x, y), sprite)


def _load_prop(
    path: Path, tile: int, *, scale_to_tile: bool = True
) -> Image.Image | None:
    if not path.exists():
        return None
    sprite = Image.open(path).convert("RGBA")
    if scale_to_tile and sprite.size != (tile, tile):
        sprite = sprite.resize((tile, tile), Image.NEAREST)
    return sprite


def _font(size: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for name in ("arialbd.ttf", "arial.ttf", "segoeui.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()
