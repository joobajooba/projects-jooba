"""NFT drop tables: dungeon type (tileset), pattern, and mini-boss.

Weights are used as-is. Mini-boss chances sum to 103 because the three
1.00% bosses sit on top of an otherwise 100% table; rng.choices keeps the
relative rarities.
"""

from __future__ import annotations

from random import Random

DUNGEON_TYPE_TRAIT = "Dungeon Type"
PATTERN_TRAIT = "Pattern"
MINI_BOSS_TRAIT = "Mini Boss"

# Display name -> weight
DUNGEON_TYPE_CHANCES: dict[str, float] = {
    "Grass Plains": 9.28,
    "Limestone": 9.28,
    "Desert": 9.28,
    "Mossy ruins": 9.28,
    "Swamp": 9.28,
    "Ice": 6.30,
    "Stone Castle": 6.30,
    "Underworld": 6.30,
    "Moon": 6.30,
    "Clouds": 4.60,
    "Volcano": 4.60,
    "Mushroom": 4.60,
    "Shortcake": 4.60,
    "Dreamscape": 3.00,
    "Storm": 3.00,
    "The Vault": 3.00,
    "Void": 1.00,
}

# 1/1 dungeon types: exactly one token per Pattern, never rolled otherwise.
ONE_OF_ONE_DUNGEON_TYPES: tuple[str, ...] = ("Robin's Lair",)

# Display name -> Tall Tiles preset slug from tileset.py
DUNGEON_TYPE_PRESETS: dict[str, str] = {
    "Grass Plains": "plains",
    "Limestone": "limestone",
    "Desert": "desert",
    "Mossy ruins": "forgotten_ruins",
    "Swamp": "mossy",
    "Ice": "icy",
    "Stone Castle": "castle",
    "Underworld": "underworld",
    "Moon": "lunar",
    "Clouds": "clouds",
    "Volcano": "volcano",
    "Mushroom": "mushroom",
    "Shortcake": "shortcake",
    "Dreamscape": "dreamcore",
    "Storm": "storm",
    "The Vault": "the_vault",
    "Void": "void",
    "Robin's Lair": "robins_lair",
}

PATTERN_CHANCES: dict[str, float] = {
    "Standard": 35,
    "Keep": 20,
    "Hive": 20,
    "Spiral": 10,
    "Labyrinth": 10,
    "Gauntlet": 5,
}

MINI_BOSS_CHANCES: dict[str, float] = {
    "None": 15.00,
    "Alta-ir": 8.00,
    "The Burrow Queen": 8.00,
    "Arid Spectre": 8.00,
    "Bone Monarch": 8.00,
    "Gerald the Kind": 8.00,
    "Mr Freeze": 8.00,
    "Pebbles": 5.00,
    "Infernal Judge": 5.00,
    "Moon Guard": 5.00,
    "Skymother": 5.00,
    "Infernos": 5.00,
    "Fun-Guy": 5.00,
    "Cupcake": 1.75,
    "Umbra": 1.75,
    "Seaphiel": 1.75,
    "Archmage Tempest": 1.75,
}

# 1/1 mini-bosses: exactly one token each in a collection, never rolled.
ONE_OF_ONE_MINI_BOSSES: tuple[str, ...] = (
    "Sir Roars-a-Lot",
    "Bun Bun",
    "King Croakus",
)

# Each 1/1 mini-boss may only appear on this dungeon type / tileset.
ONE_OF_ONE_MINI_BOSS_TYPES: dict[str, str] = {
    "Sir Roars-a-Lot": "The Vault",
    "Bun Bun": "Ice",
    "King Croakus": "Swamp",
}

# NFT trait name -> PNG stem in Mini-Bosses/
MINI_BOSS_SPRITES: dict[str, str] = {
    "Alta-ir": "Alta-ir",
    "The Burrow Queen": "The Burrow Queen",
    "Arid Spectre": "Arid Spectre",
    "Bone Monarch": "Bone Monarch",
    "Gerald the Kind": "Gerlard the Kind",
    "Mr Freeze": "Mr Freeze",
    "Pebbles": "Pebbles",
    "Infernal Judge": "Infernal Judge",
    "Moon Guard": "Moon Guard",
    "Skymother": "Skymother",
    "Infernos": "Infernos",
    "Fun-Guy": "Fun-Guy",
    "Cupcake": "Cupcake",
    "Umbra": "Umbra",
    "Seaphiel": "Seraphiel",
    "Archmage Tempest": "Archmage Tempest",
    "Sir Roars-a-Lot": "Sir Roars-a-Lot",
    "Bun Bun": "Bun Bun",
    "King Croakus": "King Croakus",
}

_PRESET_TO_TYPE = {preset: name for name, preset in DUNGEON_TYPE_PRESETS.items()}


def weighted_choice(rng: Random, chances: dict[str, float]) -> str:
    names = list(chances)
    weights = [chances[name] for name in names]
    return rng.choices(names, weights=weights, k=1)[0]


def _key(name: str) -> str:
    return " ".join("".join(c.lower() if c.isalnum() else " " for c in name).split())


_PRESET_TO_TYPE.update({_key(preset): name for preset, name in list(_PRESET_TO_TYPE.items())})


_DUNGEON_TYPE_LOOKUP = {_key(name): name for name in DUNGEON_TYPE_CHANCES}
_DUNGEON_TYPE_LOOKUP.update({_key(name): name for name in ONE_OF_ONE_DUNGEON_TYPES})
_DUNGEON_TYPE_LOOKUP.update({_key(preset): name for name, preset in DUNGEON_TYPE_PRESETS.items()})
_DUNGEON_TYPE_LOOKUP.update(
    {
        "grass": "Grass Plains",
        "plains": "Grass Plains",
        "desert": "Desert",
        "deser": "Desert",
        "mossy ruins": "Mossy ruins",
        "ruins": "Mossy ruins",
        "castle": "Stone Castle",
        "stone castle": "Stone Castle",
        "2castle": "Stone Castle",
        "castle": "Stone Castle",
        "dreamcore": "Dreamscape",
        "dreamscape": "Dreamscape",
        "vault": "The Vault",
        "the vault": "The Vault",
        "the_vault": "The Vault",
        "gld": "The Vault",
        "gold": "The Vault",
        "space": "Moon",
        "space black": "Moon",
        "lunar": "Moon",
        "icy": "Ice",
        "ice": "Ice",
        "murky": "Swamp",
        "mossy": "Swamp",
        "forgotten ruins": "Mossy ruins",
        "forgotten_ruins": "Mossy ruins",
        "robins lair": "Robin's Lair",
        "robin's lair": "Robin's Lair",
        "robins lairs": "Robin's Lair",
        "robin": "Robin's Lair",
    }
)

_MINI_BOSS_LOOKUP = {_key(name): name for name in MINI_BOSS_CHANCES}
_MINI_BOSS_LOOKUP.update({_key(name): name for name in ONE_OF_ONE_MINI_BOSSES})
_MINI_BOSS_LOOKUP.update(
    {
        "gerlard the kind": "Gerald the Kind",
        "gerald the kind": "Gerald the Kind",
        "seraphiel": "Seaphiel",
        "seaphiel": "Seaphiel",
        "none": "None",
        "no mini boss": "None",
        "empty": "None",
    }
)


def normalize_dungeon_type(name: str | None) -> str | None:
    if name is None:
        return None
    text = name.strip()
    if not text or _key(text) in {"varied", "random", "auto"}:
        return "Varied"
    return _DUNGEON_TYPE_LOOKUP.get(_key(text), text)


def normalize_mini_boss(name: str | None) -> str | None:
    if name is None:
        return None
    text = name.strip()
    if not text or _key(text) in {"varied", "random", "auto"}:
        return "Varied"
    return _MINI_BOSS_LOOKUP.get(_key(text), text)


def dungeon_type_from_preset(preset: str | None) -> str | None:
    if not preset:
        return None
    return _PRESET_TO_TYPE.get(preset) or _PRESET_TO_TYPE.get(_key(preset)) or _DUNGEON_TYPE_LOOKUP.get(
        _key(preset)
    )


def mini_boss_sprite(name: str | None) -> str | None:
    if not name or name == "None":
        return None
    return MINI_BOSS_SPRITES.get(name, name)


def roll_dungeon_type(rng: Random) -> str:
    return weighted_choice(rng, DUNGEON_TYPE_CHANCES)


def roll_pattern(rng: Random) -> str:
    return weighted_choice(rng, PATTERN_CHANCES)


def roll_mini_boss(rng: Random) -> str:
    return weighted_choice(rng, MINI_BOSS_CHANCES)


def pick_unique_mini_bosses(rng: Random, count: int) -> list[str]:
    """Weighted sample without replacement from the normal mini-boss table."""
    names = list(MINI_BOSS_CHANCES)
    weights = [MINI_BOSS_CHANCES[name] for name in names]
    if count > len(names):
        raise ValueError(
            f"Need {count} unique mini-bosses but only {len(names)} exist"
        )
    picked: list[str] = []
    remaining_names = names[:]
    remaining_weights = weights[:]
    for _ in range(count):
        choice = rng.choices(remaining_names, weights=remaining_weights, k=1)[0]
        picked.append(choice)
        index = remaining_names.index(choice)
        remaining_names.pop(index)
        remaining_weights.pop(index)
    return picked


def assign_one_of_ones(
    token_count: int, rng: Random
) -> dict[int, dict[str, str]]:
    """Assign 1/1 tileset and mini-boss slots to distinct token ids.

    Robin's Lair appears once per Pattern, each with a different mini-boss.
    Each 1/1 mini-boss appears once on its locked tileset.
    """
    if token_count < 1:
        return {}
    lair_count = len(ONE_OF_ONE_DUNGEON_TYPES) * len(PATTERN_CHANCES)
    needed = lair_count + len(ONE_OF_ONE_MINI_BOSSES)
    if token_count < needed:
        raise ValueError(
            f"Collection of {token_count} is too small for {needed} 1/1 slots"
        )
    slots = list(range(1, token_count + 1))
    rng.shuffle(slots)
    assigned: dict[int, dict[str, str]] = {}
    i = 0
    lair_bosses = pick_unique_mini_bosses(rng, lair_count)
    boss_index = 0
    for name in ONE_OF_ONE_DUNGEON_TYPES:
        for pattern in PATTERN_CHANCES:
            assigned[slots[i]] = {
                "dungeon_type": name,
                "pattern": pattern,
                "mini_boss": lair_bosses[boss_index],
            }
            boss_index += 1
            i += 1
    for boss in ONE_OF_ONE_MINI_BOSSES:
        spec = {"mini_boss": boss}
        locked = ONE_OF_ONE_MINI_BOSS_TYPES.get(boss)
        if locked:
            spec["dungeon_type"] = locked
        assigned[slots[i]] = spec
        i += 1
    return assigned


def one_of_one_copies() -> int:
    return len(PATTERN_CHANCES)


def drop_tables() -> dict[str, dict[str, float] | dict[str, int]]:
    return {
        DUNGEON_TYPE_TRAIT: dict(DUNGEON_TYPE_CHANCES),
        PATTERN_TRAIT: dict(PATTERN_CHANCES),
        MINI_BOSS_TRAIT: dict(MINI_BOSS_CHANCES),
        "one_of_ones": {
            "dungeon_types": {
                name: one_of_one_copies() for name in ONE_OF_ONE_DUNGEON_TYPES
            },
            "mini_bosses": {name: 1 for name in ONE_OF_ONE_MINI_BOSSES},
            "mini_boss_tilesets": dict(ONE_OF_ONE_MINI_BOSS_TYPES),
        },
    }
