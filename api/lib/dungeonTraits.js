/** Seed helpers and OpenSea traits shared by preview, keep metadata, and generation. */

const TRAIT_XOR = 0x9e3779b9;
const COLLECTION_SIZE = 4444;

const ROBINS_LAIR = ['Robins Lair', 'farvoid'];
const ONE_OF_ONE_BOSSES = ['Sir Roars-a-Lot', 'Bun Bun', 'King Croakus'];

// label, tileset slug, weight in basis points (10000 = 100%)
const BIOMES = [
  ['Grass Plains', 'verdant', 928],
  ['Limestone', 'deepkarst', 928],
  ['Desert', 'sunscorch', 928],
  ['Mossy ruins', 'mossruin', 928],
  ['Swamp', 'greensward', 928],
  ['Ice', 'frostbite', 630],
  ['Stone Castle', 'stonekeep', 630],
  ['Underworld', 'underworld', 630],
  ['Moon', 'moondust', 630],
  ['Clouds', 'cloudsea', 460],
  ['Volcano', 'ashfall', 460],
  ['Mushroom', 'sporewild', 460],
  ['Shortcake', 'dreamveil', 460],
  ['Dreamscape', 'dreamveil', 300],
  ['Storm', 'tempest', 300],
  ['The Vault', 'stonekeep', 300],
  ['Void', 'farvoid', 100],
];

const DUNGEON_TYPES = [
  ['Standard', 3500],
  ['Keep', 2000],
  ['Hive', 2000],
  ['Spiral', 1000],
  ['Labyrinth', 1000],
  ['Gauntlet', 500],
];

const MINI_BOSSES = [
  ['None', 1500],
  ['Alta-ir', 800],
  ['The Burrow Queen', 800],
  ['Arid Spectre', 800],
  ['Bone Monarch', 800],
  ['Gerald the Kind', 800],
  ['Mr Freeze', 800],
  ['Pebbles', 500],
  ['Infernal Judge', 500],
  ['Moon Guard', 500],
  ['Skymother', 500],
  ['Infernos', 500],
  ['Fun-Guy', 500],
  ['Cupcake', 175],
  ['Umbra', 175],
  ['Seaphiel', 175],
  ['Archmage Tempest', 175],
];

const DUNGEON_TYPE_PRESETS = {
  Standard: {
    dungeonLayout: 'None',
    roomLayout: 'Scattered',
    corridorLayout: 'Errant',
    circularRooms: 'Some',
    corridorLoops: 8,
    removeDeadends: 50,
    roomMin: 5,
    roomMax: 9,
    roomCountMin: 10,
    roomCountMax: 14,
  },
  Keep: {
    dungeonLayout: 'Box',
    roomLayout: 'Dense',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 4,
    removeDeadends: 75,
    roomMin: 5,
    roomMax: 9,
    roomCountMin: 8,
    roomCountMax: 12,
  },
  Hive: {
    dungeonLayout: 'None',
    roomLayout: 'Scattered',
    corridorLayout: 'Errant',
    circularRooms: 'Many',
    corridorLoops: 10,
    removeDeadends: 40,
    roomMin: 5,
    roomMax: 11,
    roomCountMin: 10,
    roomCountMax: 16,
  },
  Spiral: {
    dungeonLayout: 'Round',
    roomLayout: 'Scattered',
    corridorLayout: 'Errant',
    circularRooms: 'Some',
    corridorLoops: 8,
    removeDeadends: 55,
    roomMin: 5,
    roomMax: 9,
    roomCountMin: 8,
    roomCountMax: 12,
  },
  Labyrinth: {
    dungeonLayout: 'None',
    roomLayout: 'Scattered',
    corridorLayout: 'Labyrinth',
    circularRooms: 'None',
    corridorLoops: 16,
    removeDeadends: 20,
    roomMin: 3,
    roomMax: 7,
    roomCountMin: 8,
    roomCountMax: 12,
  },
  Gauntlet: {
    dungeonLayout: 'Cross',
    roomLayout: 'Scattered',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 0,
    removeDeadends: 90,
    roomMin: 3,
    roomMax: 7,
    roomCountMin: 6,
    roomCountMax: 9,
  },
};

export const TILESETS = [...new Set(BIOMES.map((row) => row[1]))];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const random = mulberry32(seed);
  return {
    random,
    randrange(start, stop) {
      if (stop === undefined) {
        return Math.floor(random() * start);
      }
      return start + Math.floor(random() * (stop - start));
    },
    randint(low, high) {
      return low + Math.floor(random() * (high - low + 1));
    },
    choice(seq) {
      return seq[Math.floor(random() * seq.length)];
    },
    shuffle(items) {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [items[index], items[swap]] = [items[swap], items[index]];
      }
      return items;
    },
  };
}

export function seedToInt(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  const text = String(seed || '42').trim();
  const hex = text.replace(/^0x/i, '');
  if (/^[0-9a-f]+$/i.test(hex) && hex.length >= 8) {
    return Number.parseInt(hex.slice(0, 8), 16) >>> 0;
  }
  if (/^\d+$/.test(text)) {
    return Number(text) >>> 0;
  }
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function titleTrait(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Unknown';
}

function pickWeighted(rng, table) {
  const total = table.reduce((sum, item) => sum + item[item.length - 1], 0);
  let roll = rng.random() * total;
  for (const item of table) {
    roll -= item[item.length - 1];
    if (roll < 0) {
      return item.length > 2 ? item.slice(0, -1) : item[0];
    }
  }
  const last = table[table.length - 1];
  return last.length > 2 ? last.slice(0, -1) : last[0];
}

export function rollKeepTraits(seed) {
  const numeric = seedToInt(seed);
  const rng = createRng(numeric ^ TRAIT_XOR);
  let [biome, tileset] = pickWeighted(rng, BIOMES);
  const dungeonType = pickWeighted(rng, DUNGEON_TYPES);
  let miniBoss = pickWeighted(rng, MINI_BOSSES);
  if (rng.randrange(COLLECTION_SIZE) === 0) {
    [biome, tileset] = ROBINS_LAIR;
  }
  const legendary = rng.randrange(COLLECTION_SIZE);
  if (legendary < ONE_OF_ONE_BOSSES.length) {
    miniBoss = ONE_OF_ONE_BOSSES[legendary];
  }
  return { biome, tileset, dungeonType, miniBoss, numeric };
}

export function optionsFromSeed(seed) {
  const traits = rollKeepTraits(seed);
  const preset = DUNGEON_TYPE_PRESETS[traits.dungeonType] || DUNGEON_TYPE_PRESETS.Standard;
  return {
    seed: traits.numeric,
    nRows: 39,
    nCols: 39,
    addStairs: 2,
    doors: 'Standard',
    ...preset,
    tileset: traits.tileset,
    biome: traits.biome,
    dungeonType: traits.dungeonType,
    miniBoss: traits.miniBoss,
  };
}

export function tilesetForSeed(seed) {
  return rollKeepTraits(seed).tileset;
}

export function attributesFromDungeon(_dungeon, _tileset, options) {
  const opts = options || {};
  return [
    { trait_type: 'Biome', value: opts.biome },
    { trait_type: 'Dungeon Type', value: opts.dungeonType || opts.dungeon_type },
    { trait_type: 'Mini Boss', value: opts.miniBoss || opts.mini_boss },
  ];
}

export function openseaMetadata({
  seedValue,
  imageUrl,
  externalUrl,
  tokenId = null,
  description,
  attributes,
}) {
  return {
    name: tokenId ? `Lost Keep #${tokenId}` : 'Lost Keep',
    description,
    image: imageUrl,
    external_url: externalUrl,
    background_color: '171717',
    attributes,
    seed: String(seedValue),
  };
}

export const KEEP_DESCRIPTION =
  'A procedurally generated dungeon uncovered during an IMPLINGz adventure on Robinhood Chain. Minted on j00ba.xyz. Secondary trading is on OpenSea in ETH.';
