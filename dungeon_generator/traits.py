"""Seed-derived dungeon traits, options, and OpenSea metadata."""

from __future__ import annotations

from typing import Any

from .generate import Dungeon, DungeonOptions, create_dungeon
from .rng import Mulberry32, to_u32

KEEP_DESCRIPTION = (
    "A procedurally generated dungeon uncovered during an IMPLINGz adventure "
    "on Robinhood Chain. Minted on j00ba.xyz. Secondary trading is on OpenSea in ETH."
)

TRAIT_XOR = 0x9E3779B9
COLLECTION_SIZE = 4444
ROBINS_LAIR = ("Robins Lair", "farvoid")
ONE_OF_ONE_BOSSES = ("Sir Roars-a-Lot", "Bun Bun", "King Croakus")

# label, tileset slug, weight in basis points (10000 = 100%)
BIOMES = (
    ("Grass Plains", "verdant", 928),
    ("Limestone", "deepkarst", 928),
    ("Desert", "sunscorch", 928),
    ("Mossy ruins", "mossruin", 928),
    ("Swamp", "greensward", 928),
    ("Ice", "frostbite", 630),
    ("Stone Castle", "stonekeep", 630),
    ("Underworld", "underworld", 630),
    ("Moon", "moondust", 630),
    ("Clouds", "cloudsea", 460),
    ("Volcano", "ashfall", 460),
    ("Mushroom", "sporewild", 460),
    ("Shortcake", "dreamveil", 460),
    ("Dreamscape", "dreamveil", 300),
    ("Storm", "tempest", 300),
    ("The Vault", "stonekeep", 300),
    ("Void", "farvoid", 100),
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

TILESETS = tuple(dict.fromkeys(row[1] for row in BIOMES))


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


def roll_keep_traits(seed: int) -> dict[str, Any]:
    numeric = to_u32(seed)
    rng = Mulberry32(numeric ^ TRAIT_XOR)
    biome, tileset = _pick_weighted(rng, BIOMES)
    dungeon_type = _pick_weighted(rng, DUNGEON_TYPES)
    mini_boss = _pick_weighted(rng, MINI_BOSSES)
    if rng.randrange(COLLECTION_SIZE) == 0:
        biome, tileset = ROBINS_LAIR
    legendary = rng.randrange(COLLECTION_SIZE)
    if legendary < len(ONE_OF_ONE_BOSSES):
        mini_boss = ONE_OF_ONE_BOSSES[legendary]
    return {
        "biome": biome,
        "tileset": tileset,
        "dungeon_type": dungeon_type,
        "mini_boss": mini_boss,
        "numeric": numeric,
    }


def tileset_for_seed(seed: int) -> str:
    return roll_keep_traits(to_u32(seed))["tileset"]


def options_from_seed(seed: int) -> tuple[DungeonOptions, dict[str, Any]]:
    traits = roll_keep_traits(seed)
    preset = DUNGEON_TYPE_PRESETS.get(traits["dungeon_type"], DUNGEON_TYPE_PRESETS["Standard"])
    options = DungeonOptions(
        seed=traits["numeric"],
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
        {"trait_type": "Biome", "value": data.get("biome")},
        {"trait_type": "Dungeon Type", "value": data.get("dungeon_type")},
        {"trait_type": "Mini Boss", "value": data.get("mini_boss")},
    ]


def describe_dungeon(seed_value: Any) -> dict[str, Any]:
    numeric = seed_to_int(seed_value)
    options, traits = options_from_seed(numeric)
    dungeon = create_dungeon(options)
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
    name = f"Lost Keep #{token_id}" if token_id else "Lost Keep"
    return {
        "name": name,
        "description": description,
        "image": image_url,
        "external_url": external_url,
        "background_color": "171717",
        "attributes": attributes,
        "seed": str(seed_value),
    }
