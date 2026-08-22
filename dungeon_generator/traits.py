"""Seed-derived dungeon traits, options, and OpenSea metadata."""

from __future__ import annotations

from typing import Any

from .generate import Dungeon, DungeonOptions, create_dungeon
from .drops import mini_boss_sprite
from .rng import Mulberry32, to_u32

KEEP_DESCRIPTION = (
    "An Imp Keep uncovered during an IMPLINGz adventure on Robinhood Chain. "
    "Minting is free aside from ETH gas. Traits are Environment, Type, and Mini Boss. "
    "Secondary trading is on OpenSea in ETH."
)

TRAIT_XOR = 0x9E3779B9
COLLECTION_SIZE = 2222
ONE_OF_ONE_SHUFFLE_SEED = 0x4B335031
ROBINS_LAIR = ("Robins Lair", "robins_lair")
LEGENDARY_BOSSES = (
    {"mini_boss": "Sir Roars-a-Lot", "biome": "The Vault", "tileset": "the_vault"},
    {"mini_boss": "Bun Bun", "biome": "Ice", "tileset": "icy"},
    {"mini_boss": "King Croakus", "biome": "Swamp", "tileset": "mossy"},
)

# label, tall-tileset slug, weight in basis points (10000 = 100%)
BIOMES = (
    ("Grass Plains", "plains", 928),
    ("Limestone", "limestone", 928),
    ("Desert", "desert", 928),
    ("Mossy ruins", "forgotten_ruins", 928),
    ("Swamp", "mossy", 928),
    ("Ice", "icy", 630),
    ("Stone Castle", "castle", 630),
    ("Underworld", "underworld", 630),
    ("Moon", "lunar", 630),
    ("Clouds", "clouds", 460),
    ("Volcano", "volcano", 460),
    ("Mushroom", "mushroom", 460),
    ("Shortcake", "shortcake", 460),
    ("Dreamscape", "dreamcore", 300),
    ("Storm", "storm", 300),
    ("The Vault", "the_vault", 300),
    ("Void", "void", 100),
)

DUNGEON_TYPES = (
    ("Standard", 3500),
    ("Keep", 2000),
    ("Hive", 2000),
    ("Spiral", 1000),
    ("Labyrinth", 1000),
    ("Gauntlet", 500),
)

MINI_BOSSES = (
    ("None", 1500),
    ("Alta-ir", 800),
    ("The Burrow Queen", 800),
    ("Arid Spectre", 800),
    ("Bone Monarch", 800),
    ("Gerald the Kind", 800),
    ("Mr Freeze", 800),
    ("Pebbles", 500),
    ("Infernal Judge", 500),
    ("Moon Guard", 500),
    ("Skymother", 500),
    ("Infernos", 500),
    ("Fun-Guy", 500),
    ("Cupcake", 175),
    ("Umbra", 175),
    ("Seaphiel", 175),
    ("Archmage Tempest", 175),
)

DUNGEON_TYPE_PRESETS = {
    "Standard": {
        "dungeon_layout": "None",
        "room_layout": "Scattered",
        "corridor_layout": "Errant",
        "circular_rooms": "Some",
        "corridor_loops": 8,
        "remove_deadends": 50,
        "room_min": 5,
        "room_max": 9,
        "room_count_min": 10,
        "room_count_max": 14,
    },
    "Keep": {
        "dungeon_layout": "Box",
        "room_layout": "Dense",
        "corridor_layout": "Straight",
        "circular_rooms": "None",
        "corridor_loops": 4,
        "remove_deadends": 75,
        "room_min": 5,
        "room_max": 9,
        "room_count_min": 8,
        "room_count_max": 12,
    },
    "Hive": {
        "dungeon_layout": "None",
        "room_layout": "Scattered",
        "corridor_layout": "Errant",
        "circular_rooms": "Many",
        "corridor_loops": 10,
        "remove_deadends": 40,
        "room_min": 5,
        "room_max": 11,
        "room_count_min": 10,
        "room_count_max": 16,
    },
    "Spiral": {
        "dungeon_layout": "Round",
        "room_layout": "Scattered",
        "corridor_layout": "Errant",
        "circular_rooms": "Some",
        "corridor_loops": 8,
        "remove_deadends": 55,
        "room_min": 5,
        "room_max": 9,
        "room_count_min": 8,
        "room_count_max": 12,
    },
    "Labyrinth": {
        "dungeon_layout": "None",
        "room_layout": "Scattered",
        "corridor_layout": "Labyrinth",
        "circular_rooms": "None",
        "corridor_loops": 16,
        "remove_deadends": 20,
        "room_min": 3,
        "room_max": 7,
        "room_count_min": 8,
        "room_count_max": 12,
    },
    "Gauntlet": {
        "dungeon_layout": "Cross",
        "room_layout": "Scattered",
        "corridor_layout": "Straight",
        "circular_rooms": "None",
        "corridor_loops": 0,
        "remove_deadends": 90,
        "room_min": 3,
        "room_max": 7,
        "room_count_min": 6,
        "room_count_max": 9,
    },
}

TILESETS = tuple(dict.fromkeys([*(row[1] for row in BIOMES), ROBINS_LAIR[1]]))
DUNGEON_TYPE_NAMES = tuple(row[0] for row in DUNGEON_TYPES)


def _build_reserved_trait_map() -> dict[int, dict[str, Any]]:
    rng = Mulberry32(ONE_OF_ONE_SHUFFLE_SEED)
    ids = list(range(1, COLLECTION_SIZE + 1))
    rng.shuffle(ids)
    assigned: dict[int, dict[str, Any]] = {}
    cursor = 0
    for dungeon_type in DUNGEON_TYPE_NAMES:
        assigned[ids[cursor]] = {
            "kind": "robins_lair",
            "biome": ROBINS_LAIR[0],
            "tileset": ROBINS_LAIR[1],
            "dungeon_type": dungeon_type,
        }
        cursor += 1
    for boss in LEGENDARY_BOSSES:
        assigned[ids[cursor]] = {
            "kind": "legendary_boss",
            "biome": boss["biome"],
            "tileset": boss["tileset"],
            "mini_boss": boss["mini_boss"],
        }
        cursor += 1
    return assigned


RESERVED_TRAITS = _build_reserved_trait_map()


def parse_keep_token_id(value: Any) -> int | None:
    try:
        token_id = int(value)
    except (TypeError, ValueError):
        return None
    if token_id < 1 or token_id > COLLECTION_SIZE:
        return None
    return token_id


def _apply_reserved_traits(traits: dict[str, Any], token_id: Any) -> dict[str, Any]:
    parsed = parse_keep_token_id(token_id)
    reserved = RESERVED_TRAITS.get(parsed) if parsed else None
    if not reserved:
        return traits
    if reserved["kind"] == "robins_lair":
        return {
            **traits,
            "biome": reserved["biome"],
            "tileset": reserved["tileset"],
            "dungeon_type": reserved["dungeon_type"],
        }
    if reserved["kind"] == "legendary_boss":
        return {
            **traits,
            "biome": reserved["biome"],
            "tileset": reserved["tileset"],
            "mini_boss": reserved["mini_boss"],
        }
    return traits


def seed_to_int(value: Any) -> int:
    text = str(value or "42").strip()
    if text.startswith(("0x", "0X")):
        text = text[2:]
    if text and all(ch in "0123456789abcdefABCDEF" for ch in text) and len(text) >= 8:
        return int(text[:8], 16) & 0xFFFFFFFF
    if text.isdigit():
        return int(text) & 0xFFFFFFFF
    hash_ = 2166136261
    for char in text:
        hash_ ^= ord(char)
        hash_ = to_u32(hash_ * 16777619)
    return to_u32(hash_)


def layout_seed_from(seed_value: Any, token_id: int | None = None) -> int:
    text = str(seed_value or "42").strip()
    if text.startswith(("0x", "0X")):
        text = text[2:]
    if text and all(ch in "0123456789abcdefABCDEF" for ch in text) and len(text) >= 8:
        numeric = 0
        for offset in range(0, len(text), 8):
            chunk = text[offset : offset + 8].ljust(8, "0")
            numeric ^= int(chunk, 16) & 0xFFFFFFFF
        numeric &= 0xFFFFFFFF
    else:
        numeric = seed_to_int(seed_value)
    if token_id is not None:
        token = int(token_id)
        if token > 0:
            numeric ^= (token * 0x9E3779B9) & 0xFFFFFFFF
    return numeric


def title_trait(value: str) -> str:
    return str(value or "").replace("_", " ").strip().title() or "Unknown"


def _pick_weighted(rng: Mulberry32, table: tuple[tuple, ...]):
    total = sum(item[-1] for item in table)
    roll = rng.random() * total
    for item in table:
        roll -= item[-1]
        if roll < 0:
            return item[:-1] if len(item) > 2 else item[0]
    last = table[-1]
    return last[:-1] if len(last) > 2 else last[0]


def roll_keep_traits(seed: int | str, token_id: int | None = None) -> dict[str, Any]:
    numeric = seed_to_int(seed)
    rng = Mulberry32(numeric ^ TRAIT_XOR)
    biome, tileset = _pick_weighted(rng, BIOMES)
    dungeon_type = _pick_weighted(rng, DUNGEON_TYPES)
    mini_boss = _pick_weighted(rng, MINI_BOSSES)
    return _apply_reserved_traits(
        {
            "biome": biome,
            "tileset": tileset,
            "dungeon_type": dungeon_type,
            "mini_boss": mini_boss,
            "numeric": numeric,
        },
        token_id,
    )


def tileset_for_seed(seed: int, token_id: int | None = None) -> str:
    return roll_keep_traits(to_u32(seed), token_id)["tileset"]


def options_from_seed(seed: int, token_id: int | None = None) -> tuple[DungeonOptions, dict[str, Any]]:
    traits = roll_keep_traits(seed, token_id)
    preset = DUNGEON_TYPE_PRESETS.get(traits["dungeon_type"], DUNGEON_TYPE_PRESETS["Standard"])
    options = DungeonOptions(
        seed=layout_seed_from(seed, token_id),
        n_rows=39,
        n_cols=39,
        add_stairs=2,
        doors="Standard",
        **preset,
    )
    return options, traits


def attributes_from_dungeon(
    dungeon: Dungeon, tileset: str, options: DungeonOptions | None = None, traits: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    _ = (dungeon, tileset, options)
    data = traits or {}
    return [
        {"trait_type": "Environment", "value": data.get("biome")},
        {"trait_type": "Type", "value": data.get("dungeon_type")},
        {"trait_type": "Mini Boss", "value": data.get("mini_boss")},
    ]


def _attach_mini_boss(dungeon: Dungeon, mini_boss: str) -> None:
    dungeon.inhabitant = None
    kind = mini_boss_sprite(mini_boss)
    if not kind or not dungeon.rooms:
        return
    room_id, room = max(
        dungeon.rooms.items(),
        key=lambda item: int(item[1].get("area") or 0),
    )
    dungeon.inhabitant = {
        "kind": kind,
        "room_id": room_id,
        "north": room.get("north"),
        "south": room.get("south"),
        "west": room.get("west"),
        "east": room.get("east"),
    }


def describe_dungeon(seed_value: Any, token_id: int | None = None) -> dict[str, Any]:
    numeric = layout_seed_from(seed_value, token_id)
    options, traits = options_from_seed(seed_value, token_id)
    dungeon = create_dungeon(options)
    _attach_mini_boss(dungeon, traits["mini_boss"])
    attributes = attributes_from_dungeon(dungeon, traits["tileset"], options, traits)
    return {
        "seed": str(seed_value),
        "numericSeed": numeric,
        "tileset": traits["tileset"],
        "biome": traits["biome"],
        "dungeonType": traits["dungeon_type"],
        "miniBoss": traits["mini_boss"],
        "rooms": dungeon.n_rooms,
        "doors": len(dungeon.doors),
        "stairs": len(dungeon.stairs),
        "options": {
            "dungeon_layout": options.dungeon_layout,
            "room_layout": options.room_layout,
            "corridor_layout": options.corridor_layout,
            "circular_rooms": options.circular_rooms,
            "doors": options.doors,
            "remove_deadends": options.remove_deadends,
            "corridor_loops": options.corridor_loops,
            "room_min": options.room_min,
            "room_max": options.room_max,
            "room_count_min": options.room_count_min,
            "room_count_max": options.room_count_max,
            "add_stairs": options.add_stairs,
            "biome": traits["biome"],
            "dungeon_type": traits["dungeon_type"],
            "mini_boss": traits["mini_boss"],
        },
        "attributes": attributes,
        "dungeon": dungeon,
    }


def opensea_metadata(
    *,
    seed_value: Any,
    image_url: str,
    external_url: str,
    token_id: int | None = None,
    description: str,
    attributes: list[dict[str, Any]],
) -> dict[str, Any]:
    name = f"Imp Keep #{token_id}" if token_id else "Imp Keep"
    return {
        "name": name,
        "description": description,
        "image": image_url,
        "external_url": external_url,
        "background_color": "171717",
        "attributes": attributes,
        "seed": str(seed_value),
    }
