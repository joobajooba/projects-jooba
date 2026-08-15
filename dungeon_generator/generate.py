"""Donjon-style dungeon layout generation."""

from __future__ import annotations

import math
import random
from heapq import heappop, heappush
from dataclasses import dataclass, field
from typing import Any

from .bits import (
    ARCH,
    BLOCKED,
    CORRIDOR,
    DI,
    DJ,
    DIRS,
    DOOR,
    DOORSPACE,
    ENTRANCE,
    ESPACE,
    LABEL,
    LOCKED,
    NOTHING,
    OPENSPACE,
    OPPOSITE,
    PERIMETER,
    PORTC,
    ROOM,
    ROOM_ID,
    SECRET,
    STAIR_DN,
    STAIR_UP,
    STAIRS,
    TRAPPED,
)

CARDINAL = ((-1, 0), (1, 0), (0, -1), (0, 1))
DIAGONAL = ((-1, -1), (-1, 1), (1, -1), (1, 1))
AROUND8 = CARDINAL + DIAGONAL

LAYOUT_MASKS = {
    "Box": [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
    "Cross": [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
}

CORRIDOR_STRAIGHT_CHANCE = {
    "Labyrinth": 0,
    "Errant": 50,
    "Straight": 90,
}

CLOSE_END = {
    "north": {
        "walled": [(0, -1), (1, -1), (1, 0), (1, 1), (0, 1)],
        "close": [(0, 0)],
        "recurse": (-1, 0),
    },
    "south": {
        "walled": [(0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1)],
        "close": [(0, 0)],
        "recurse": (1, 0),
    },
    "west": {
        "walled": [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0)],
        "close": [(0, 0)],
        "recurse": (0, -1),
    },
    "east": {
        "walled": [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0)],
        "close": [(0, 0)],
        "recurse": (0, 1),
    },
}

STAIR_END = {
    "north": {
        "walled": [(1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1)],
        "corridor": [(0, 0), (1, 0), (2, 0)],
        "stair": (0, 0),
        "next": (1, 0),
    },
    "south": {
        "walled": [(-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)],
        "corridor": [(0, 0), (-1, 0), (-2, 0)],
        "stair": (0, 0),
        "next": (-1, 0),
    },
    "west": {
        "walled": [(-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1)],
        "corridor": [(0, 0), (0, 1), (0, 2)],
        "stair": (0, 0),
        "next": (0, 1),
    },
    "east": {
        "walled": [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1)],
        "corridor": [(0, 0), (0, -1), (0, -2)],
        "stair": (0, 0),
        "next": (0, -1),
    },
}


@dataclass
class DungeonOptions:
    seed: int | None = None
    n_rows: int = 39
    n_cols: int = 39
    dungeon_layout: str = "None"  # None, Box, Cross, Round
    room_min: int = 3
    room_max: int = 9
    room_count_min: int = 8
    room_count_max: int = 12
    room_layout: str = "Scattered"  # Scattered, Dense
    corridor_layout: str = "Errant"  # Labyrinth, Errant, Straight
    corridor_loops: int = 8  # percent of safe loop candidates to open
    remove_deadends: int = 50  # percent
    add_stairs: int = 2
    circular_rooms: str = "Some"  # None, Some, Many
    doors: str = "Standard"  # None, Basic, Secure, Standard, Deathtrap


@dataclass
class Dungeon:
    options: DungeonOptions
    cell: list[list[int]] = field(default_factory=list)
    rooms: dict[int, dict[str, Any]] = field(default_factory=dict)
    doors: list[dict[str, Any]] = field(default_factory=list)
    stairs: list[dict[str, Any]] = field(default_factory=list)
    n_rooms: int = 0
    n_rows: int = 0
    n_cols: int = 0
    max_row: int = 0
    max_col: int = 0
    n_i: int = 0
    n_j: int = 0
    room_base: int = 0
    room_radix: int = 0
    seed: int = 0
    connect: dict[str, int] = field(default_factory=dict)


def create_dungeon(options: DungeonOptions | None = None) -> Dungeon:
    options = options or DungeonOptions()
    seed = options.seed if options.seed is not None else random.randrange(1 << 30)
    rng = random.Random(seed)

    n_i = options.n_rows // 2
    n_j = options.n_cols // 2
    n_rows = n_i * 2
    n_cols = n_j * 2

    dungeon = Dungeon(
        options=options,
        seed=seed,
        n_i=n_i,
        n_j=n_j,
        n_rows=n_rows,
        n_cols=n_cols,
        max_row=n_rows - 1,
        max_col=n_cols - 1,
        room_base=(options.room_min + 1) // 2,
        room_radix=((options.room_max - options.room_min) // 2) + 1,
        cell=[[NOTHING for _ in range(n_cols + 1)] for _ in range(n_rows + 1)],
    )

    _init_cells(dungeon, rng)
    _emplace_rooms(dungeon, rng)
    _open_rooms(dungeon, rng)
    _label_rooms(dungeon)
    _corridors(dungeon, rng)
    if options.add_stairs:
        _emplace_stairs(dungeon, rng)
    _clean_dungeon(dungeon, rng)
    return dungeon


def _init_cells(dungeon: Dungeon, rng: random.Random) -> None:
    layout = dungeon.options.dungeon_layout
    if layout in LAYOUT_MASKS:
        _mask_cells(dungeon, LAYOUT_MASKS[layout])
    elif layout == "Round":
        _round_mask(dungeon)


def _mask_cells(dungeon: Dungeon, mask: list[list[int]]) -> None:
    r_x = len(mask) / (dungeon.n_rows + 1)
    c_x = len(mask[0]) / (dungeon.n_cols + 1)
    for r in range(dungeon.n_rows + 1):
        for c in range(dungeon.n_cols + 1):
            if not mask[int(r * r_x)][int(c * c_x)]:
                dungeon.cell[r][c] = BLOCKED


def _round_mask(dungeon: Dungeon) -> None:
    center_r = dungeon.n_rows // 2
    center_c = dungeon.n_cols // 2
    radius = center_c
    for r in range(dungeon.n_rows + 1):
        for c in range(dungeon.n_cols + 1):
            if math.hypot(r - center_r, c - center_c) > radius:
                dungeon.cell[r][c] = BLOCKED


def _emplace_rooms(dungeon: Dungeon, rng: random.Random) -> None:
    if dungeon.options.room_layout == "Dense":
        _pack_rooms(dungeon, rng)
    else:
        _scatter_rooms(dungeon, rng)


def _pack_rooms(dungeon: Dungeon, rng: random.Random) -> None:
    for i in range(dungeon.n_i):
        r = i * 2 + 1
        for j in range(dungeon.n_j):
            c = j * 2 + 1
            if dungeon.cell[r][c] & ROOM:
                continue
            if (i == 0 or j == 0) and rng.randrange(2):
                continue
            _emplace_room(dungeon, rng, {"i": i, "j": j})


def _scatter_rooms(dungeon: Dungeon, rng: random.Random) -> None:
    options = dungeon.options
    count_min = max(1, min(options.room_count_min, options.room_count_max))
    count_max = max(count_min, options.room_count_max)

    # Avoid asking a small map to hold more distinct rooms than it reasonably can.
    smallest_area = max(9, options.room_min * options.room_min)
    capacity = max(1, (dungeon.n_cols * dungeon.n_rows) // smallest_area)
    target = min(rng.randint(count_min, count_max), capacity)

    # Failed placements are expected as the map fills. Later attempts favour the
    # smallest legal room so the requested count can be reached without overlap.
    attempts = max(40, target * 30)
    for attempt in range(attempts):
        if dungeon.n_rooms >= target:
            break
        proto: dict[str, Any] | None = None
        if attempt >= attempts * 2 // 3:
            proto = {
                "height": dungeon.room_base,
                "width": dungeon.room_base,
            }
        _emplace_room(dungeon, rng, proto)


def _want_circle(dungeon: Dungeon, rng: random.Random) -> bool:
    mode = dungeon.options.circular_rooms
    if mode == "None":
        return False
    if mode == "Many":
        return rng.random() < 0.65
    return rng.random() < 0.28


def _room_floor_cells(
    r1: int, c1: int, r2: int, c2: int, circular: bool
) -> list[tuple[int, int]]:
    if not circular:
        return [(r, c) for r in range(r1, r2 + 1) for c in range(c1, c2 + 1)]

    cr = (r1 + r2) / 2.0
    cc = (c1 + c2) / 2.0
    ry = max((r2 - r1) / 2.0, 0.75)
    rx = max((c2 - c1) / 2.0, 0.75)
    cells = [
        (r, c)
        for r in range(r1, r2 + 1)
        for c in range(c1, c2 + 1)
        if ((r - cr) / ry) ** 2 + ((c - cc) / rx) ** 2 <= 1.02
    ]
    return _smooth_blob_cells(set(cells), r1, c1, r2, c2)


def _smooth_blob_cells(
    cells: set[tuple[int, int]], r1: int, c1: int, r2: int, c2: int
) -> list[tuple[int, int]]:
    """Fill diagonal gaps and small bites so circular rooms stay 4-connected."""
    for _ in range(2):
        extra: set[tuple[int, int]] = set()
        for r in range(r1, r2):
            for c in range(c1, c2):
                nw = (r, c) in cells
                ne = (r, c + 1) in cells
                sw = (r + 1, c) in cells
                se = (r + 1, c + 1) in cells
                if nw and se and not ne and not sw:
                    extra.add((r, c + 1))
                elif ne and sw and not nw and not se:
                    extra.add((r, c))
        cells |= extra

        grow: set[tuple[int, int]] = set()
        for r in range(r1, r2 + 1):
            for c in range(c1, c2 + 1):
                if (r, c) in cells:
                    continue
                n = 0
                for dr, dc in AROUND8:
                    if (r + dr, c + dc) in cells:
                        n += 1
                if n >= 5:
                    grow.add((r, c))
        cells |= grow
    return sorted(cells)


def _sound_cells(dungeon: Dungeon, cells: list[tuple[int, int]]) -> dict[str, int]:
    hit: dict[str, int] = {}
    for r, c in cells:
        cell = dungeon.cell[r][c]
        if cell & BLOCKED:
            return {"blocked": 1}
        if cell & (PERIMETER | ENTRANCE):
            return {"perimeter": 1}
        if cell & ROOM:
            room_id = (cell & ROOM_ID) >> 6
            hit[str(room_id)] = hit.get(str(room_id), 0) + 1
    return hit


def _stamp_room_cells(
    dungeon: Dungeon, room_id: int, cells: list[tuple[int, int]]
) -> None:
    for r, c in cells:
        cell = dungeon.cell[r][c]
        if cell & ENTRANCE:
            dungeon.cell[r][c] &= ~ESPACE
        elif cell & PERIMETER:
            dungeon.cell[r][c] &= ~PERIMETER
        dungeon.cell[r][c] |= ROOM | (room_id << 6)


def _mark_room_perimeter(
    dungeon: Dungeon,
    room_id: int,
    r1: int,
    c1: int,
    r2: int,
    c2: int,
) -> None:
    """Mark a 1-tile, 8-connected wall shell around this room's actual floors."""
    for r in range(max(0, r1 - 1), min(dungeon.n_rows, r2 + 1) + 1):
        for c in range(max(0, c1 - 1), min(dungeon.n_cols, c2 + 1) + 1):
            if dungeon.cell[r][c] & (ROOM | ENTRANCE):
                continue
            for dr, dc in AROUND8:
                rr, cc = r + dr, c + dc
                if not (0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols):
                    continue
                neighbor = dungeon.cell[rr][cc]
                if neighbor & ROOM and ((neighbor & ROOM_ID) >> 6) == room_id:
                    dungeon.cell[r][c] |= PERIMETER
                    break


def _emplace_room(
    dungeon: Dungeon,
    rng: random.Random,
    proto: dict[str, Any] | None = None,
) -> bool:
    if dungeon.n_rooms >= 999:
        return False
    proto = _set_room(dungeon, rng, proto or {})

    r1 = proto["i"] * 2 + 1
    c1 = proto["j"] * 2 + 1
    r2 = (proto["i"] + proto["height"]) * 2 - 1
    c2 = (proto["j"] + proto["width"]) * 2 - 1

    if r1 < 1 or r2 > dungeon.max_row or c1 < 1 or c2 > dungeon.max_col:
        return False

    circular = _want_circle(dungeon, rng) and min(r2 - r1, c2 - c1) >= 4
    floors = _room_floor_cells(r1, c1, r2, c2, circular)
    if not floors:
        return False

    hit = _sound_cells(dungeon, floors)
    if hit.get("blocked") or hit:
        return False

    room_id = dungeon.n_rooms + 1
    dungeon.n_rooms = room_id
    _stamp_room_cells(dungeon, room_id, floors)

    room = {
        "id": room_id,
        "row": r1,
        "col": c1,
        "north": r1,
        "south": r2,
        "west": c1,
        "east": c2,
        "height": ((r2 - r1) + 1) * 10,
        "width": ((c2 - c1) + 1) * 10,
        "circular": circular,
        "doors": [],
    }
    room["area"] = room["height"] * room["width"]
    dungeon.rooms[room_id] = room
    _mark_room_perimeter(dungeon, room_id, r1, c1, r2, c2)
    return True


def _set_room(
    dungeon: Dungeon, rng: random.Random, proto: dict[str, Any]
) -> dict[str, Any]:
    base = dungeon.room_base
    radix = dungeon.room_radix

    if "height" not in proto:
        if "i" in proto:
            a = max(0, dungeon.n_i - base - proto["i"])
            r = a if a < radix else radix
            proto["height"] = rng.randrange(r) + base if r > 0 else base
        else:
            proto["height"] = rng.randrange(radix) + base
    if "width" not in proto:
        if "j" in proto:
            a = max(0, dungeon.n_j - base - proto["j"])
            r = a if a < radix else radix
            proto["width"] = rng.randrange(r) + base if r > 0 else base
        else:
            proto["width"] = rng.randrange(radix) + base
    if "i" not in proto:
        proto["i"] = rng.randrange(max(1, dungeon.n_i - proto["height"] + 1))
    if "j" not in proto:
        proto["j"] = rng.randrange(max(1, dungeon.n_j - proto["width"] + 1))
    return proto


def _sound_room(
    dungeon: Dungeon, r1: int, c1: int, r2: int, c2: int
) -> dict[str, int]:
    hit: dict[str, int] = {}
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            cell = dungeon.cell[r][c]
            if cell & BLOCKED:
                return {"blocked": 1}
            if cell & ROOM:
                room_id = (cell & ROOM_ID) >> 6
                hit[str(room_id)] = hit.get(str(room_id), 0) + 1
    return hit


def _open_rooms(dungeon: Dungeon, rng: random.Random) -> None:
    for room_id in range(1, dungeon.n_rooms + 1):
        _open_room(dungeon, rng, dungeon.rooms[room_id])
    dungeon.connect.clear()


def _alloc_opens(dungeon: Dungeon, room: dict[str, Any]) -> int:
    room_h = ((room["south"] - room["north"]) // 2) + 1
    room_w = ((room["east"] - room["west"]) // 2) + 1
    # Richer layouts need more than one opportunity to join the corridor graph.
    # Keep the cap low so room silhouettes remain clean and readable.
    n_opens = int(math.sqrt(room_w * room_h)) + 1
    return max(2, min(4, n_opens))


def _door_sills(dungeon: Dungeon, room: dict[str, Any]) -> list[dict[str, Any]]:
    sills: list[dict[str, Any]] = []
    if room.get("circular"):
        for r in range(room["north"], room["south"] + 1):
            for c in range(room["west"], room["east"] + 1):
                if not (dungeon.cell[r][c] & ROOM):
                    continue
                room_id = (dungeon.cell[r][c] & ROOM_ID) >> 6
                if room_id != room["id"]:
                    continue
                for direction in DIRS:
                    sr = r + DI[direction]
                    sc = c + DJ[direction]
                    if not (0 <= sr <= dungeon.n_rows and 0 <= sc <= dungeon.n_cols):
                        continue
                    if not (dungeon.cell[sr][sc] & PERIMETER):
                        continue
                    if dungeon.cell[sr][sc] & DOORSPACE:
                        continue
                    door_r = sr
                    door_c = sc
                    out_r = sr + DI[direction]
                    out_c = sc + DJ[direction]
                    out_id = None
                    if 0 <= out_r <= dungeon.n_rows and 0 <= out_c <= dungeon.n_cols:
                        if dungeon.cell[out_r][out_c] & ROOM:
                            out_id = (dungeon.cell[out_r][out_c] & ROOM_ID) >> 6
                    sills.append(
                        {
                            "sill_r": r,
                            "sill_c": c,
                            "dir": direction,
                            "door_r": door_r,
                            "door_c": door_c,
                            "out_id": out_id,
                        }
                    )
        return sills

    for c in range(room["west"], room["east"], 2):
        _check_sill(dungeon, room, sills, room["north"], c, "north")
        _check_sill(dungeon, room, sills, room["south"], c, "south")
    for r in range(room["north"], room["south"], 2):
        _check_sill(dungeon, room, sills, r, room["west"], "west")
        _check_sill(dungeon, room, sills, r, room["east"], "east")
    return sills


def _check_sill(
    dungeon: Dungeon,
    room: dict[str, Any],
    list_: list[dict[str, Any]],
    sill_r: int,
    sill_c: int,
    direction: str,
) -> None:
    door_r = sill_r + DI[direction]
    door_c = sill_c + DJ[direction]
    if not (0 <= door_r <= dungeon.n_rows and 0 <= door_c <= dungeon.n_cols):
        return
    door_cell = dungeon.cell[door_r][door_c]
    if not (door_cell & PERIMETER):
        return
    if door_cell & BLOCKED:
        return
    out_r = door_r + DI[direction]
    out_c = door_c + DJ[direction]
    if not (0 <= out_r <= dungeon.n_rows and 0 <= out_c <= dungeon.n_cols):
        return
    if dungeon.cell[out_r][out_c] & BLOCKED:
        return
    out_id = None
    if dungeon.cell[out_r][out_c] & ROOM:
        out_id = (dungeon.cell[out_r][out_c] & ROOM_ID) >> 6
        if out_id == room["id"]:
            return
    list_.append(
        {
            "sill_r": sill_r,
            "sill_c": sill_c,
            "dir": direction,
            "door_r": door_r,
            "door_c": door_c,
            "out_id": out_id,
        }
    )


def _door_type(dungeon: Dungeon, rng: random.Random) -> int:
    style = dungeon.options.doors
    if style == "None":
        return ARCH
    if style == "Basic":
        return DOOR if rng.random() < 0.7 else ARCH
    if style == "Secure":
        roll = rng.random()
        if roll < 0.5:
            return LOCKED
        if roll < 0.8:
            return DOOR
        return ARCH
    if style == "Deathtrap":
        roll = rng.random()
        if roll < 0.35:
            return TRAPPED
        if roll < 0.55:
            return SECRET
        if roll < 0.75:
            return LOCKED
        if roll < 0.9:
            return DOOR
        return ARCH
    # Standard
    roll = rng.randrange(10)
    if roll < 2:
        return ARCH
    if roll < 6:
        return DOOR
    if roll < 8:
        return LOCKED
    if roll < 9:
        return TRAPPED
    return SECRET


def _open_room(dungeon: Dungeon, rng: random.Random, room: dict[str, Any]) -> None:
    sills = _door_sills(dungeon, room)
    if not sills:
        return
    n_opens = _alloc_opens(dungeon, room)
    for _ in range(n_opens):
        if not sills:
            break
        idx = rng.randrange(len(sills))
        sill = sills.pop(idx)
        door_r = sill["door_r"]
        door_c = sill["door_c"]
        if dungeon.cell[door_r][door_c] & DOORSPACE:
            continue
        out_id = sill.get("out_id")
        if out_id:
            connect = ",".join(str(x) for x in sorted((room["id"], out_id)))
            if dungeon.connect.get(connect):
                continue
            dungeon.connect[connect] = 1

        open_r = sill["sill_r"]
        open_c = sill["sill_c"]
        open_dir = sill["dir"]
        for x in range(3):
            r = open_r + DI[open_dir] * x
            c = open_c + DJ[open_dir] * x
            if 0 <= r <= dungeon.n_rows and 0 <= c <= dungeon.n_cols:
                dungeon.cell[r][c] &= ~PERIMETER
                dungeon.cell[r][c] |= ENTRANCE

        door_type = _door_type(dungeon, rng)
        door = {"row": door_r, "col": door_c, "dir": open_dir}
        if door_type == ARCH:
            dungeon.cell[door_r][door_c] |= ARCH
            door.update(key="arch", type="Archway")
        elif door_type == DOOR:
            dungeon.cell[door_r][door_c] |= DOOR | (ord("o") << 24)
            door.update(key="open", type="Unlocked Door")
        elif door_type == LOCKED:
            dungeon.cell[door_r][door_c] |= LOCKED | (ord("x") << 24)
            door.update(key="lock", type="Locked Door")
        elif door_type == TRAPPED:
            dungeon.cell[door_r][door_c] |= TRAPPED | (ord("t") << 24)
            door.update(key="trap", type="Trapped Door")
        elif door_type == SECRET:
            dungeon.cell[door_r][door_c] |= SECRET | (ord("$") << 24)
            door.update(key="secret", type="Secret Door")
        else:
            dungeon.cell[door_r][door_c] |= PORTC | (ord("#") << 24)
            door.update(key="portc", type="Portcullis")

        if out_id:
            door["out_id"] = out_id
        room["doors"].append(door)
        dungeon.doors.append(door)


def _label_rooms(dungeon: Dungeon) -> None:
    for room_id, room in dungeon.rooms.items():
        label = str(room_id)
        # Prefer geometric center that still sits on a room cell.
        mid_r = (room["north"] + room["south"]) // 2
        mid_c = (room["west"] + room["east"]) // 2
        if not (dungeon.cell[mid_r][mid_c] & ROOM):
            found = False
            for r in range(room["north"], room["south"] + 1):
                for c in range(room["west"], room["east"] + 1):
                    if dungeon.cell[r][c] & ROOM and (
                        (dungeon.cell[r][c] & ROOM_ID) >> 6
                    ) == room_id:
                        mid_r, mid_c = r, c
                        found = True
                        break
                if found:
                    break
        room["label_row"] = mid_r
        room["label_col"] = mid_c
        # Encode first digit for compatibility with classic maps.
        dungeon.cell[mid_r][mid_c] |= (ord(label[0]) << 24)


def _corridors(dungeon: Dungeon, rng: random.Random) -> None:
    for i in range(1, dungeon.n_i):
        r = i * 2 + 1
        for j in range(1, dungeon.n_j):
            c = j * 2 + 1
            if dungeon.cell[r][c] & OPENSPACE:
                continue
            _tunnel(dungeon, rng, i, j)


def _add_corridor_loops(dungeon: Dungeon, rng: random.Random) -> None:
    """Open a few safe cross-links in the maze without touching room walls."""
    candidates: list[tuple[int, int]] = []
    for r in range(1, dungeon.n_rows):
        for c in range(1, dungeon.n_cols):
            cell = dungeon.cell[r][c]
            if cell & (OPENSPACE | BLOCKED | PERIMETER):
                continue
            horizontal = (
                dungeon.cell[r][c - 1] & CORRIDOR
                and dungeon.cell[r][c + 1] & CORRIDOR
            )
            vertical = (
                dungeon.cell[r - 1][c] & CORRIDOR
                and dungeon.cell[r + 1][c] & CORRIDOR
            )
            if horizontal or vertical:
                candidates.append((r, c))

    rng.shuffle(candidates)
    chance = max(0, min(100, dungeon.options.corridor_loops))
    # Guarantee one loop when requested and possible; cap the rest by percentage.
    wanted = max(1, round(len(candidates) * chance / 100)) if candidates else 0
    for r, c in candidates[:wanted]:
        dungeon.cell[r][c] |= CORRIDOR


def _tunnel(
    dungeon: Dungeon,
    rng: random.Random,
    i: int,
    j: int,
    last_dir: str | None = None,
) -> None:
    for direction in _tunnel_dirs(dungeon, rng, last_dir):
        if _open_tunnel(dungeon, i, j, direction):
            next_i = i + DI[direction]
            next_j = j + DJ[direction]
            _tunnel(dungeon, rng, next_i, next_j, direction)


def _tunnel_dirs(
    dungeon: Dungeon, rng: random.Random, last_dir: str | None
) -> list[str]:
    dirs = list(DIRS)
    rng.shuffle(dirs)
    chance = CORRIDOR_STRAIGHT_CHANCE.get(dungeon.options.corridor_layout, 50)
    if last_dir and chance:
        if rng.randrange(100) < chance:
            dirs = [d for d in dirs if d != last_dir]
            dirs.insert(0, last_dir)
    return dirs


def _open_tunnel(dungeon: Dungeon, i: int, j: int, direction: str) -> bool:
    i_cur, j_cur = i * 2 + 1, j * 2 + 1
    i_next = (i + DI[direction]) * 2 + 1
    j_next = (j + DJ[direction]) * 2 + 1
    i_mid = (i_cur + i_next) // 2
    j_mid = (j_cur + j_next) // 2

    if not _sound_tunnel(dungeon, i_mid, j_mid, i_next, j_next):
        return False
    _delve_tunnel(dungeon, i_cur, j_cur, i_next, j_next)
    return True


def _sound_tunnel(
    dungeon: Dungeon, i_mid: int, j_mid: int, i_next: int, j_next: int
) -> bool:
    if not (0 < i_next < dungeon.n_rows and 0 < j_next < dungeon.n_cols):
        return False
    r1, r2 = sorted((i_mid, i_next))
    c1, c2 = sorted((j_mid, j_next))
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            if dungeon.cell[r][c] & (BLOCKED | PERIMETER | CORRIDOR):
                return False
    return True


def _delve_tunnel(
    dungeon: Dungeon, i_cur: int, j_cur: int, i_next: int, j_next: int
) -> None:
    r1, r2 = sorted((i_cur, i_next))
    c1, c2 = sorted((j_cur, j_next))
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            dungeon.cell[r][c] &= ~ENTRANCE
            dungeon.cell[r][c] |= CORRIDOR


def _emplace_stairs(dungeon: Dungeon, rng: random.Random) -> None:
    n = dungeon.options.add_stairs
    if n <= 0:
        return
    cells = _stair_ends(dungeon)
    if not cells:
        return
    rng.shuffle(cells)
    for idx in range(min(n, len(cells))):
        cell = cells[idx]
        r, c = cell["row"], cell["col"]
        if idx % 2 == 0:
            dungeon.cell[r][c] |= STAIR_DN | (ord(">") << 24)
            stair = {**cell, "key": "down", "type": "Down Stairs"}
        else:
            dungeon.cell[r][c] |= STAIR_UP | (ord("<") << 24)
            stair = {**cell, "key": "up", "type": "Up Stairs"}
        dungeon.stairs.append(stair)


def _stair_ends(dungeon: Dungeon) -> list[dict[str, Any]]:
    ends: list[dict[str, Any]] = []
    for i in range(dungeon.n_i):
        r = i * 2 + 1
        for j in range(dungeon.n_j):
            c = j * 2 + 1
            if dungeon.cell[r][c] != CORRIDOR:
                continue
            for direction, meta in STAIR_END.items():
                if not _check_tunnel(dungeon, r, c, meta):
                    continue
                next_r = r + meta["next"][0]
                next_c = c + meta["next"][1]
                ends.append(
                    {
                        "row": r,
                        "col": c,
                        "next_row": next_r,
                        "next_col": next_c,
                        "dir": direction,
                    }
                )
                break
    return ends


def _check_tunnel(
    dungeon: Dungeon, r: int, c: int, meta: dict[str, Any]
) -> bool:
    for dr, dc in meta.get("corridor", []):
        rr, cc = r + dr, c + dc
        if not (0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols):
            return False
        if dungeon.cell[rr][cc] != CORRIDOR:
            return False
    for dr, dc in meta.get("walled", []):
        rr, cc = r + dr, c + dc
        if not (0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols):
            return False
        if dungeon.cell[rr][cc] & OPENSPACE:
            return False
    return True


def _clean_dungeon(dungeon: Dungeon, rng: random.Random) -> None:
    if dungeon.options.remove_deadends:
        _remove_deadends(dungeon, rng)
    if dungeon.options.corridor_loops:
        _add_corridor_loops(dungeon, rng)
    _connect_open_components(dungeon)
    _tidy_geometry(dungeon)
    _fix_doors(dungeon)
    _fix_stairs(dungeon, rng)
    _rebuild_perimeter(dungeon)
    _empty_blocks(dungeon)
    _nudge_layout_to_center(dungeon)


def _is_open(dungeon: Dungeon, r: int, c: int) -> bool:
    if not (0 <= r <= dungeon.n_rows and 0 <= c <= dungeon.n_cols):
        return False
    return bool(dungeon.cell[r][c] & OPENSPACE)


def _open_components(dungeon: Dungeon) -> list[set[tuple[int, int]]]:
    remaining = {
        (r, c)
        for r in range(dungeon.n_rows + 1)
        for c in range(dungeon.n_cols + 1)
        if _is_open(dungeon, r, c)
    }
    components: list[set[tuple[int, int]]] = []
    while remaining:
        start = next(iter(remaining))
        component = {start}
        stack = [start]
        remaining.remove(start)
        while stack:
            r, c = stack.pop()
            for dr, dc in CARDINAL:
                neighbor = (r + dr, c + dc)
                if neighbor not in remaining:
                    continue
                remaining.remove(neighbor)
                component.add(neighbor)
                stack.append(neighbor)
        components.append(component)
    return sorted(components, key=len, reverse=True)


def _connect_open_components(dungeon: Dungeon) -> None:
    """Join isolated rooms to the main floor graph with narrow safe corridors."""
    while True:
        components = _open_components(dungeon)
        if len(components) <= 1:
            return
        main = components[0]
        isolated = components[1]
        path = _least_cost_connection(dungeon, isolated, main)
        if not path:
            return
        for r, c in path:
            if dungeon.cell[r][c] & OPENSPACE:
                continue
            dungeon.cell[r][c] &= ~(PERIMETER | ENTRANCE | BLOCKED)
            dungeon.cell[r][c] |= CORRIDOR


def _least_cost_connection(
    dungeon: Dungeon,
    starts: set[tuple[int, int]],
    targets: set[tuple[int, int]],
) -> list[tuple[int, int]]:
    """Dijkstra path that prefers void and existing passages over room walls."""
    queue: list[tuple[int, int, int]] = []
    distance: dict[tuple[int, int], int] = {}
    previous: dict[tuple[int, int], tuple[int, int]] = {}
    for r, c in starts:
        distance[(r, c)] = 0
        heappush(queue, (0, r, c))

    destination: tuple[int, int] | None = None
    while queue:
        cost, r, c = heappop(queue)
        current = (r, c)
        if cost != distance.get(current):
            continue
        if current in targets:
            destination = current
            break
        for dr, dc in CARDINAL:
            rr, cc = r + dr, c + dc
            if not (0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols):
                continue
            cell = dungeon.cell[rr][cc]
            if cell & BLOCKED:
                continue
            if (rr, cc) in targets:
                step = 1
            elif cell & ROOM:
                step = 12
            elif cell & PERIMETER:
                step = 5
            elif cell & OPENSPACE:
                step = 1
            else:
                step = 2
            next_cost = cost + step
            neighbor = (rr, cc)
            if next_cost >= distance.get(neighbor, 1 << 30):
                continue
            distance[neighbor] = next_cost
            previous[neighbor] = current
            heappush(queue, (next_cost, rr, cc))

    if destination is None:
        return []
    path = [destination]
    while path[-1] not in starts:
        path.append(previous[path[-1]])
    path.reverse()
    return path


def _room_ids_around(dungeon: Dungeon, r: int, c: int) -> set[int]:
    ids: set[int] = set()
    for dr, dc in CARDINAL:
        rr, cc = r + dr, c + dc
        if not (0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols):
            continue
        cell = dungeon.cell[rr][cc]
        if cell & ROOM:
            ids.add((cell & ROOM_ID) >> 6)
    return ids


def _adopt_openspace(dungeon: Dungeon, r: int, c: int) -> None:
    """Turn a wall/void cell into floor, inheriting room/corridor from neighbors."""
    room_ids = _room_ids_around(dungeon, r, c)
    corridor = False
    for dr, dc in CARDINAL:
        rr, cc = r + dr, c + dc
        if 0 <= rr <= dungeon.n_rows and 0 <= cc <= dungeon.n_cols:
            if dungeon.cell[rr][cc] & CORRIDOR:
                corridor = True
    flags = dungeon.cell[r][c] & ~(PERIMETER | BLOCKED)
    if len(room_ids) == 1:
        rid = next(iter(room_ids))
        dungeon.cell[r][c] = (flags & ~ROOM_ID) | ROOM | (rid << 6)
    elif corridor:
        dungeon.cell[r][c] = (flags & ~ROOM_ID) | CORRIDOR
    elif room_ids:
        rid = min(room_ids)
        dungeon.cell[r][c] = (flags & ~ROOM_ID) | ROOM | (rid << 6)


def _tidy_geometry(dungeon: Dungeon) -> None:
    """Close diagonal leaks, fill 1-tile bites, drop unused door punches."""
    _restore_unused_entrances(dungeon)
    for _ in range(3):
        changed = _close_diagonal_gaps(dungeon)
        changed = _fill_wall_notches(dungeon) or changed
        if not changed:
            break


def _restore_unused_entrances(dungeon: Dungeon) -> None:
    """If a door opening never connected to a corridor, put the wall back."""
    for r in range(dungeon.n_rows + 1):
        for c in range(dungeon.n_cols + 1):
            cell = dungeon.cell[r][c]
            if not (cell & ENTRANCE):
                continue
            if cell & OPENSPACE:
                continue
            dungeon.cell[r][c] &= ~ENTRANCE
            dungeon.cell[r][c] &= ~DOORSPACE
            dungeon.cell[r][c] |= PERIMETER


def _close_diagonal_gaps(dungeon: Dungeon) -> bool:
    """If two floors touch only at a corner, fill one side so walls can meet."""
    changed = False
    for r in range(dungeon.n_rows):
        for c in range(dungeon.n_cols):
            a = _is_open(dungeon, r, c)
            b = _is_open(dungeon, r, c + 1)
            d = _is_open(dungeon, r + 1, c)
            e = _is_open(dungeon, r + 1, c + 1)
            if a and e and not b and not d:
                fill = (r, c + 1)
            elif b and d and not a and not e:
                fill = (r, c)
            else:
                continue
            fr, fc = fill
            if dungeon.cell[fr][fc] & (DOORSPACE | STAIRS):
                continue
            rooms = _room_ids_around(dungeon, fr, fc)
            # Don't melt two different rooms into each other.
            if len(rooms) > 1:
                continue
            _adopt_openspace(dungeon, fr, fc)
            changed = True
    return changed


def _fill_wall_notches(dungeon: Dungeon) -> bool:
    """Fill wall cells nearly surrounded by floor (stubs and 1-tile holes)."""
    changed = False
    for r in range(1, dungeon.n_rows):
        for c in range(1, dungeon.n_cols):
            if dungeon.cell[r][c] & (OPENSPACE | DOORSPACE | STAIRS):
                continue
            n = sum(1 for dr, dc in CARDINAL if _is_open(dungeon, r + dr, c + dc))
            if n < 3:
                continue
            if len(_room_ids_around(dungeon, r, c)) > 1:
                continue
            _adopt_openspace(dungeon, r, c)
            changed = True
    return changed


def _rebuild_perimeter(dungeon: Dungeon) -> None:
    """Rebuild a consistent 8-connected wall shell after carving/cleanup."""
    for r in range(dungeon.n_rows + 1):
        for c in range(dungeon.n_cols + 1):
            if dungeon.cell[r][c] & OPENSPACE:
                dungeon.cell[r][c] &= ~PERIMETER
                continue
            dungeon.cell[r][c] &= ~PERIMETER
            for dr, dc in AROUND8:
                if _is_open(dungeon, r + dr, c + dc):
                    dungeon.cell[r][c] |= PERIMETER
                    break


def _remove_deadends(dungeon: Dungeon, rng: random.Random) -> None:
    pct = dungeon.options.remove_deadends
    for i in range(dungeon.n_i):
        r = i * 2 + 1
        for j in range(dungeon.n_j):
            c = j * 2 + 1
            if not (dungeon.cell[r][c] & OPENSPACE):
                continue
            if rng.randrange(100) < pct:
                _collapse_deadend(dungeon, r, c)


def _collapse_deadend(dungeon: Dungeon, r: int, c: int) -> None:
    for direction, meta in CLOSE_END.items():
        if not _check_tunnel(dungeon, r, c, meta):
            continue
        for dr, dc in meta["close"]:
            dungeon.cell[r + dr][c + dc] = NOTHING
        rr = r + meta["recurse"][0]
        cc = c + meta["recurse"][1]
        if dungeon.cell[rr][cc] & OPENSPACE:
            _collapse_deadend(dungeon, rr, cc)
        return


def _fix_doors(dungeon: Dungeon) -> None:
    fixed: list[dict[str, Any]] = []
    for door in dungeon.doors:
        r, c = door["row"], door["col"]
        if not (dungeon.cell[r][c] & OPENSPACE):
            dungeon.cell[r][c] &= ~DOORSPACE
            continue
        left = _is_open(dungeon, r, c - 1)
        right = _is_open(dungeon, r, c + 1)
        up = _is_open(dungeon, r - 1, c)
        down = _is_open(dungeon, r + 1, c)
        # A real doorway sits between opposite open cells.
        if (left and right) or (up and down):
            fixed.append(door)
        else:
            dungeon.cell[r][c] &= ~DOORSPACE
    dungeon.doors = fixed
    for room in dungeon.rooms.values():
        room["doors"] = [
            d
            for d in room["doors"]
            if any(d["row"] == x["row"] and d["col"] == x["col"] for x in fixed)
        ]


def _fix_stairs(dungeon: Dungeon, rng: random.Random) -> None:
    """Drop stale stair markers and replace any removed during maze cleanup."""
    wanted = max(0, dungeon.options.add_stairs)
    live: list[dict[str, Any]] = []
    for stair in dungeon.stairs:
        r, c = stair["row"], stair["col"]
        if dungeon.cell[r][c] & OPENSPACE and dungeon.cell[r][c] & STAIRS:
            live.append(stair)
        else:
            dungeon.cell[r][c] &= ~STAIRS
    dungeon.stairs = live[:wanted]

    candidates = [
        (r, c)
        for r in range(1, dungeon.n_rows)
        for c in range(1, dungeon.n_cols)
        if dungeon.cell[r][c] & OPENSPACE
        and not dungeon.cell[r][c] & (DOORSPACE | STAIRS | LABEL)
        and sum(
            1 for dr, dc in CARDINAL if _is_open(dungeon, r + dr, c + dc)
        )
        >= 2
    ]
    rng.shuffle(candidates)
    while len(dungeon.stairs) < wanted and candidates:
        if dungeon.stairs:
            candidates.sort(
                key=lambda point: min(
                    abs(point[0] - stair["row"]) + abs(point[1] - stair["col"])
                    for stair in dungeon.stairs
                ),
                reverse=True,
            )
        r, c = candidates.pop(0)
        index = len(dungeon.stairs)
        if index % 2 == 0:
            dungeon.cell[r][c] |= STAIR_DN | (ord(">") << 24)
            key, type_ = "down", "Down Stairs"
        else:
            dungeon.cell[r][c] |= STAIR_UP | (ord("<") << 24)
            key, type_ = "up", "Up Stairs"
        dungeon.stairs.append(
            {
                "row": r,
                "col": c,
                "next_row": r,
                "next_col": c,
                "dir": "north",
                "key": key,
                "type": type_,
            }
        )


def _empty_blocks(dungeon: Dungeon) -> None:
    for r in range(dungeon.n_rows + 1):
        for c in range(dungeon.n_cols + 1):
            if dungeon.cell[r][c] & BLOCKED:
                dungeon.cell[r][c] = NOTHING


def _nudge_layout_to_center(dungeon: Dungeon) -> None:
    """Slide the finished layout so its bounding box sits in the grid centre."""
    rows = dungeon.n_rows + 1
    cols = dungeon.n_cols + 1
    used = [
        (r, c)
        for r in range(rows)
        for c in range(cols)
        if dungeon.cell[r][c] & (OPENSPACE | PERIMETER | DOORSPACE | STAIRS)
    ]
    if not used:
        return
    north = min(r for r, _ in used)
    south = max(r for r, _ in used)
    west = min(c for _, c in used)
    east = max(c for _, c in used)
    shift_r = ((rows - (south - north + 1)) // 2) - north
    shift_c = ((cols - (east - west + 1)) // 2) - west
    if shift_r == 0 and shift_c == 0:
        return

    old = [row[:] for row in dungeon.cell]
    dungeon.cell = [[NOTHING for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            nr, nc = r + shift_r, c + shift_c
            if 0 <= nr < rows and 0 <= nc < cols:
                dungeon.cell[nr][nc] = old[r][c]

    def move(item: dict[str, Any], row_key: str, col_key: str) -> None:
        if row_key in item:
            item[row_key] += shift_r
        if col_key in item:
            item[col_key] += shift_c

    for room in dungeon.rooms.values():
        for row_key in ("row", "north", "south", "label_row"):
            if row_key in room:
                room[row_key] += shift_r
        for col_key in ("col", "west", "east", "label_col"):
            if col_key in room:
                room[col_key] += shift_c
        for door in room.get("doors", []):
            move(door, "row", "col")
    for door in dungeon.doors:
        move(door, "row", "col")
    for stair in dungeon.stairs:
        move(stair, "row", "col")
        move(stair, "next_row", "next_col")
