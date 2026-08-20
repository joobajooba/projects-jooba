/** Seed helpers and OpenSea traits shared by preview, keep metadata, and generation. */

const TRAIT_XOR = 0x9e3779b9;
export const COLLECTION_SIZE = 2222;
const ONE_OF_ONE_SHUFFLE_SEED = 0x4b335031;

const ROBINS_LAIR = ['Robins Lair', 'robins_lair'];
const LEGENDARY_BOSSES = [
  { miniBoss: 'Sir Roars-a-Lot', biome: 'The Vault', tileset: 'the_vault' },
  { miniBoss: 'Bun Bun', biome: 'Ice', tileset: 'icy' },
  { miniBoss: 'King Croakus', biome: 'Swamp', tileset: 'mossy' },
];

// label, tall-tileset slug, weight in basis points (10000 = 100%)
const BIOMES = [
  ['Grass Plains', 'plains', 928],
  ['Limestone', 'limestone', 928],
  ['Desert', 'desert', 928],
  ['Mossy ruins', 'forgotten_ruins', 928],
  ['Swamp', 'mossy', 928],
  ['Ice', 'icy', 630],
  ['Stone Castle', 'castle', 630],
  ['Underworld', 'underworld', 630],
  ['Moon', 'lunar', 630],
  ['Clouds', 'clouds', 460],
  ['Volcano', 'volcano', 460],
  ['Mushroom', 'mushroom', 460],
  ['Shortcake', 'shortcake', 460],
  ['Dreamscape', 'dreamcore', 300],
  ['Storm', 'storm', 300],
  ['The Vault', 'the_vault', 300],
  ['Void', 'void', 100],
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
    dungeonLayout: 'Round',
    roomLayout: 'Scattered',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 8,
    removeDeadends: 90,
    roomMin: 5,
    roomMax: 9,
    roomCountMin: 8,
    roomCountMax: 12,
  },
  Hive: {
    dungeonLayout: 'None',
    roomLayout: 'Dense',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 4,
    removeDeadends: 90,
    roomMin: 5,
    roomMax: 9,
    roomCountMin: 10,
    roomCountMax: 16,
  },
  Spiral: {
    dungeonLayout: 'None',
    roomLayout: 'Scattered',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 0,
    removeDeadends: 0,
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
    corridorLoops: 0,
    removeDeadends: 0,
    roomMin: 3,
    roomMax: 7,
    roomCountMin: 1,
    roomCountMax: 3,
  },
  Gauntlet: {
    dungeonLayout: 'None',
    roomLayout: 'Scattered',
    corridorLayout: 'Straight',
    circularRooms: 'None',
    corridorLoops: 0,
    removeDeadends: 80,
    roomMin: 3,
    roomMax: 7,
    roomCountMin: 5,
    roomCountMax: 8,
  },
};

export const TILESETS = [...new Set([...BIOMES.map((row) => row[1]), ROBINS_LAIR[1]])];
const DUNGEON_TYPE_NAMES = DUNGEON_TYPES.map((row) => row[0]);

export const MINI_BOSS_SPRITES = {
  'Alta-ir': 'Alta-ir',
  'The Burrow Queen': 'The Burrow Queen',
  'Arid Spectre': 'Arid Spectre',
  'Bone Monarch': 'Bone Monarch',
  'Gerald the Kind': 'Gerlard the Kind',
  'Mr Freeze': 'Mr Freeze',
  'Pebbles': 'Pebbles',
  'Infernal Judge': 'Infernal Judge',
  'Moon Guard': 'Moon Guard',
  'Skymother': 'Skymother',
  'Infernos': 'Infernos',
  'Fun-Guy': 'Fun-Guy',
  'Cupcake': 'Cupcake',
  'Umbra': 'Umbra',
  'Seaphiel': 'Seraphiel',
  'Archmage Tempest': 'Archmage Tempest',
  'Sir Roars-a-Lot': 'Sir Roars-a-Lot',
  'Bun Bun': 'Bun Bun',
  'King Croakus': 'King Croakus',
};

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

function buildReservedTraitMap() {
  const rng = createRng(ONE_OF_ONE_SHUFFLE_SEED);
  const ids = Array.from({ length: COLLECTION_SIZE }, (_, index) => index + 1);
  rng.shuffle(ids);
  const map = new Map();
  let cursor = 0;
  for (const dungeonType of DUNGEON_TYPE_NAMES) {
    map.set(ids[cursor], {
      kind: 'robins_lair',
      biome: ROBINS_LAIR[0],
      tileset: ROBINS_LAIR[1],
      dungeonType,
    });
    cursor += 1;
  }
  for (const boss of LEGENDARY_BOSSES) {
    map.set(ids[cursor], {
      kind: 'legendary_boss',
      biome: boss.biome,
      tileset: boss.tileset,
      miniBoss: boss.miniBoss,
    });
    cursor += 1;
  }
  return map;
}

const RESERVED_TRAITS = buildReservedTraitMap();

export function parseKeepTokenId(value) {
  const tokenId = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > COLLECTION_SIZE) return null;
  return tokenId;
}

export function reservedTraitsForToken(tokenId) {
  const parsed = parseKeepTokenId(tokenId);
  return parsed ? RESERVED_TRAITS.get(parsed) || null : null;
}

export function listReservedTraitAssignments() {
  return [...RESERVED_TRAITS.entries()]
    .map(([tokenId, spec]) => ({ tokenId, ...spec }))
    .sort((left, right) => left.tokenId - right.tokenId);
}

export function dungeonPreviewPath(seed, { format = 'png', tokenId } = {}) {
  const params = new URLSearchParams();
  params.set('seed', String(seed ?? ''));
  params.set('format', format);
  const parsed = parseKeepTokenId(tokenId);
  if (parsed) params.set('tokenId', String(parsed));
  return `/api/dungeon-preview?${params.toString()}`;
}

function applyReservedTraits(traits, tokenId) {
  const reserved = reservedTraitsForToken(tokenId);
  if (!reserved) return traits;
  if (reserved.kind === 'robins_lair') {
    return {
      ...traits,
      biome: reserved.biome,
      tileset: reserved.tileset,
      dungeonType: reserved.dungeonType,
    };
  }
  if (reserved.kind === 'legendary_boss') {
    return {
      ...traits,
      biome: reserved.biome,
      tileset: reserved.tileset,
      miniBoss: reserved.miniBoss,
    };
  }
  return traits;
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

export function rollKeepTraits(seed, tokenId = null) {
  const numeric = seedToInt(seed);
  const rng = createRng(numeric ^ TRAIT_XOR);
  const [biome, tileset] = pickWeighted(rng, BIOMES);
  const dungeonType = pickWeighted(rng, DUNGEON_TYPES);
  const miniBoss = pickWeighted(rng, MINI_BOSSES);
  return applyReservedTraits({ biome, tileset, dungeonType, miniBoss, numeric }, tokenId);
}

export function optionsFromSeed(seed, tokenId = null) {
  const traits = rollKeepTraits(seed, tokenId);
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

export function tilesetForSeed(seed, tokenId = null) {
  return rollKeepTraits(seed, tokenId).tileset;
}

export function attributesFromDungeon(_dungeon, _tileset, options) {
  const opts = options || {};
  return [
    { trait_type: 'Environment', value: opts.biome },
    { trait_type: 'Type', value: opts.dungeonType || opts.dungeon_type },
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
    name: tokenId ? `Imp Keep #${tokenId}` : 'Imp Keep',
    description,
    image: imageUrl,
    external_url: externalUrl,
    background_color: '171717',
    attributes,
    seed: String(seedValue),
  };
}

export const KEEP_DESCRIPTION =
  'An Imp Keep uncovered during an IMPLINGz adventure on Robinhood Chain. Minting is free aside from ETH gas. Traits are Environment, Type, and Mini Boss. Secondary trading is on OpenSea in ETH.';
