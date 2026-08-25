/** Keep environment from on-chain seed. Keep in sync with api/_lib/dungeonTraits.js. */

const TRAIT_XOR = 0x9e3779b9;
const COLLECTION_SIZE = 2222;
const ONE_OF_ONE_SHUFFLE_SEED = 0x4b335031;
const ROBINS_LAIR = ["Robins Lair", "robins_lair"] as const;
const LEGENDARY_BOSSES = [
  { miniBoss: "Sir Roars-a-Lot", biome: "The Vault", tileset: "the_vault" },
  { miniBoss: "Bun Bun", biome: "Ice", tileset: "icy" },
  { miniBoss: "King Croakus", biome: "Swamp", tileset: "mossy" },
];
const BIOMES: Array<[string, string, number]> = [
  ["Grass Plains", "plains", 928],
  ["Limestone", "limestone", 928],
  ["Desert", "desert", 928],
  ["Mossy ruins", "forgotten_ruins", 928],
  ["Swamp", "mossy", 928],
  ["Ice", "icy", 630],
  ["Stone Castle", "castle", 630],
  ["Underworld", "underworld", 630],
  ["Moon", "lunar", 630],
  ["Clouds", "clouds", 460],
  ["Volcano", "volcano", 460],
  ["Mushroom", "mushroom", 460],
  ["Shortcake", "shortcake", 460],
  ["Dreamscape", "dreamcore", 300],
  ["Storm", "storm", 300],
  ["The Vault", "the_vault", 300],
  ["Void", "void", 100],
];
const DUNGEON_TYPE_NAMES = ["Standard", "Keep", "Hive", "Spiral", "Labyrinth", "Gauntlet"];
const REPLACEMENT_SEEDS: Record<string, number> = {
  "0x0000244dc2ac4374ecf0f30773fb2415c5773b24c32df3f962f2533ffd54f060": 1947,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed: number) {
  const random = mulberry32(seed);
  return {
    random,
    shuffle<T>(items: T[]) {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [items[index], items[swap]] = [items[swap], items[index]];
      }
      return items;
    },
  };
}

function buildReservedTraitMap() {
  const rng = createRng(ONE_OF_ONE_SHUFFLE_SEED);
  const ids = Array.from({ length: COLLECTION_SIZE }, (_, index) => index + 1);
  rng.shuffle(ids);
  const map = new Map<number, { biome: string; tileset: string }>();
  let cursor = 0;
  for (const _dungeonType of DUNGEON_TYPE_NAMES) {
    map.set(ids[cursor], { biome: ROBINS_LAIR[0], tileset: ROBINS_LAIR[1] });
    cursor += 1;
  }
  for (const boss of LEGENDARY_BOSSES) {
    map.set(ids[cursor], { biome: boss.biome, tileset: boss.tileset });
    cursor += 1;
  }
  return map;
}

const RESERVED_TRAITS = buildReservedTraitMap();

function seedToInt(seed: string) {
  const text = String(seed || "42").trim();
  const hex = text.replace(/^0x/i, "");
  if (/^[0-9a-f]+$/i.test(hex) && hex.length >= 8) {
    return Number.parseInt(hex.slice(0, 8), 16) >>> 0;
  }
  return 42;
}

function replacementSourceTokenId(seed: string) {
  const hex = String(seed || "").toLowerCase();
  return REPLACEMENT_SEEDS[hex] ?? null;
}

function pickBiome(rng: { random: () => number }) {
  const total = BIOMES.reduce((sum, item) => sum + item[2], 0);
  let roll = rng.random() * total;
  for (const item of BIOMES) {
    roll -= item[2];
    if (roll < 0) return { biome: item[0], tileset: item[1] };
  }
  const last = BIOMES[BIOMES.length - 1];
  return { biome: last[0], tileset: last[1] };
}

export function seedHex(value: bigint | string | number) {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

export function keepEnvironment(seed: string, tokenId: string | number) {
  const numeric = seedToInt(seed);
  const rng = createRng(numeric ^ TRAIT_XOR);
  const rolled = pickBiome(rng);
  const effectiveId = replacementSourceTokenId(seed) || Number(tokenId);
  const reserved = Number.isInteger(effectiveId) ? RESERVED_TRAITS.get(effectiveId) : null;
  if (reserved) return reserved;
  return rolled;
}
