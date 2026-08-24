import {
  COLLECTION_SIZE,
  listReservedTraitAssignments,
  rollKeepTraits,
} from '../api/_lib/dungeonTraits.js';

const TYPES = ['Standard', 'Keep', 'Hive', 'Spiral', 'Labyrinth', 'Gauntlet'];
const BOSSES = {
  'Sir Roars-a-Lot': { biome: 'The Vault', tileset: 'the_vault' },
  'Bun Bun': { biome: 'Ice', tileset: 'icy' },
  'King Croakus': { biome: 'Swamp', tileset: 'mossy' },
};

const reserved = listReservedTraitAssignments();
const errors = [];

if (reserved.length !== 9) {
  errors.push(`expected 9 reserved tokens, got ${reserved.length}`);
}

const lairs = reserved.filter((row) => row.kind === 'robins_lair');
const bosses = reserved.filter((row) => row.kind === 'legendary_boss');
if (lairs.length !== 6) errors.push(`expected 6 Robin's Lair tokens, got ${lairs.length}`);
if (bosses.length !== 3) errors.push(`expected 3 legendary bosses, got ${bosses.length}`);

const lairTypes = lairs.map((row) => row.dungeonType).sort();
if (lairTypes.join(',') !== [...TYPES].sort().join(',')) {
  errors.push(`Robin's Lair types were ${lairTypes.join(', ')}`);
}

const ids = new Set(reserved.map((row) => row.tokenId));
if (ids.size !== reserved.length) errors.push('reserved token ids were not unique');

for (const lair of lairs) {
  if (lair.biome !== 'Robins Lair' || lair.tileset !== 'robins_lair') {
    errors.push(`Lair #${lair.tokenId} had ${lair.biome}/${lair.tileset}`);
  }
}

for (const [name, lock] of Object.entries(BOSSES)) {
  const row = bosses.find((item) => item.miniBoss === name);
  if (!row) {
    errors.push(`missing ${name}`);
    continue;
  }
  if (row.biome !== lock.biome || row.tileset !== lock.tileset) {
    errors.push(`${name} locked to ${row.biome}/${row.tileset}`);
  }
}

let extraLairs = 0;
let extraBosses = 0;
for (let tokenId = 1; tokenId <= COLLECTION_SIZE; tokenId += 1) {
  const traits = rollKeepTraits(tokenId * 7919 + 17, tokenId);
  const isLair = traits.biome === 'Robins Lair';
  const isBoss = Object.prototype.hasOwnProperty.call(BOSSES, traits.miniBoss);
  const reservedRow = reserved.find((row) => row.tokenId === tokenId);
  if (isLair && reservedRow?.kind !== 'robins_lair') extraLairs += 1;
  if (isBoss && reservedRow?.kind !== 'legendary_boss') extraBosses += 1;
  if (reservedRow?.kind === 'robins_lair') {
    if (traits.biome !== 'Robins Lair' || traits.dungeonType !== reservedRow.dungeonType) {
      errors.push(`token ${tokenId} did not apply Robin's Lair ${reservedRow.dungeonType}`);
    }
  }
  if (reservedRow?.kind === 'legendary_boss') {
    if (traits.miniBoss !== reservedRow.miniBoss || traits.biome !== reservedRow.biome) {
      errors.push(`token ${tokenId} did not apply ${reservedRow.miniBoss}`);
    }
  }
}

for (let index = 0; index < 4000; index += 1) {
  const traits = rollKeepTraits(0xa11ce + index * 13);
  if (traits.biome === 'Robins Lair') extraLairs += 1;
  if (Object.prototype.hasOwnProperty.call(BOSSES, traits.miniBoss)) extraBosses += 1;
}

if (extraLairs) errors.push(`unreserved Robin's Lair count: ${extraLairs}`);
if (extraBosses) errors.push(`unreserved 1/1 boss count: ${extraBosses}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Reserved Imp Keep slots:');
for (const row of reserved) {
  if (row.kind === 'robins_lair') {
    console.log(`#${row.tokenId}  Robins Lair  ${row.dungeonType}`);
  } else {
    console.log(`#${row.tokenId}  ${row.biome}  ${row.miniBoss}`);
  }
}
console.log('All 2222 token ids have exactly 6 Robin\'s Lair (one per type) and one of each 1/1 boss.');
