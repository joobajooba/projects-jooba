"""Render a dungeon with a PixelLab dual-grid 15-tile sheet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .bits import DOORSPACE, LOCKED, OPENSPACE, PERIMETER, ROOM, SECRET, TRAPPED
from .generate import Dungeon
from .tileset import DEFAULT_SHEET, load_pixellab_tileset

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TILESET = DEFAULT_SHEET


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
    img, tile, content_bbox, fill_tile = _render_pixellab_dual(
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
        _draw_doors(draw, dungeon, tile)
    if show_stairs:
        _draw_stairs(draw, dungeon, tile)
    if show_labels:
        _draw_labels(draw, dungeon, tile)

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
) -> tuple[Image.Image, int, tuple[int, int, int, int] | None, Image.Image]:
    """Dual-grid: each tile covers the meeting of four painted cells."""
    tiles = load_pixellab_tileset(tileset)
    ts = tiles.tile_size

    # Painted cell extent (inclusive indices used by the generator).
    cell_rows = dungeon.n_rows + 1
    cell_cols = dungeon.n_cols + 1
    # Dual grid is one tile larger on each axis.
    dual_rows = cell_rows + 1
    dual_cols = cell_cols + 1
    img = Image.new("RGBA", (dual_cols * ts, dual_rows * ts), (0, 0, 0, 255))
    if tiles.fill_exterior:
        for dr in range(dual_rows):
            for dc in range(dual_cols):
                img.paste(tiles.void, (dc * ts, dr * ts))

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
                img.paste(tile, (dc * ts, dr * ts))

    content_bbox = _dual_content_bbox(masks, ts)
    return img, ts, content_bbox, tiles.void


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


def _dual_content_bbox(masks: list[list[int]], tile_size: int) -> tuple[int, int, int, int] | None:
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
    return (
        min_c * tile_size,
        min_r * tile_size,
        (max_c + 1) * tile_size,
        (max_r + 1) * tile_size,
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


def _cell_origin(r: int, c: int, tile: int) -> tuple[int, int]:
    """Top-left pixel of painted cell (r,c) on the dual-grid canvas.

    Dual tiles sit on vertices; each painted cell is the square between
    vertices (c,r), (c+1,r), (c,r+1), (c+1,r+1), which starts at half a
    tile offset from the dual origin.
    """
    return c * tile + tile // 2, r * tile + tile // 2


def _draw_doors(draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int) -> None:
    for door in dungeon.doors:
        r, c = door["row"], door["col"]
        cell = dungeon.cell[r][c]
        if not (cell & DOORSPACE):
            continue
        x0, y0 = _cell_origin(r, c, tile)
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


def _draw_stairs(draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int) -> None:
    for stair in dungeon.stairs:
        r, c = stair["row"], stair["col"]
        if not (dungeon.cell[r][c] & OPENSPACE):
            continue
        x0, y0 = _cell_origin(r, c, tile)
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


def _draw_labels(draw: ImageDraw.ImageDraw, dungeon: Dungeon, tile: int) -> None:
    font = _font(max(14, int(tile * 0.45)))
    shadow = (10, 4, 8)
    fill = (255, 230, 200)

    for room_id, room in dungeon.rooms.items():
        r = room.get("label_row", (room["north"] + room["south"]) // 2)
        c = room.get("label_col", (room["west"] + room["east"]) // 2)
        if not (dungeon.cell[r][c] & ROOM):
            continue
        x0, y0 = _cell_origin(r, c, tile)
        cx = x0 + tile // 2
        cy = y0 + tile // 2
        text = str(room_id)
        draw.text((cx + 1, cy + 1), text, fill=shadow, font=font, anchor="mm")
        draw.text((cx, cy), text, fill=fill, font=font, anchor="mm")


def _font(size: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for name in ("arialbd.ttf", "arial.ttf", "segoeui.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()
