import { createRng, optionsFromSeed, attributesFromDungeon, seedToInt } from './dungeonTraits.js';

export const NOTHING = 0x00000000;
export const BLOCKED = 0x00000001;
export const ROOM = 0x00000002;
export const CORRIDOR = 0x00000004;
export const PERIMETER = 0x00000010;
export const ENTRANCE = 0x00000020;
export const ROOM_ID = 0x0000ffc0;
export const ARCH = 0x00010000;
export const DOOR = 0x00020000;
export const LOCKED = 0x00040000;
export const TRAPPED = 0x00080000;
export const SECRET = 0x00100000;
export const PORTC = 0x00200000;
export const STAIR_DN = 0x00400000;
export const STAIR_UP = 0x00800000;
export const LABEL = 0xff000000;
export const OPENSPACE = ROOM | CORRIDOR;
export const DOORSPACE = ARCH | DOOR | LOCKED | TRAPPED | SECRET | PORTC;
export const ESPACE = ENTRANCE | DOORSPACE | LABEL;
export const STAIRS = STAIR_DN | STAIR_UP;

const DI = { north: -1, south: 1, west: 0, east: 0 };
const DJ = { north: 0, south: 0, west: -1, east: 1 };
const DIRS = ['north', 'south', 'west', 'east'];
const CARDINAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAGONAL = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const AROUND8 = [...CARDINAL, ...DIAGONAL];

const LAYOUT_MASKS = {
  Box: [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  Cross: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
};

const CORRIDOR_STRAIGHT_CHANCE = {
  Labyrinth: 0,
  Errant: 50,
  Straight: 90,
};

const CLOSE_END = {
  north: { walled: [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1]], close: [[0, 0]], recurse: [-1, 0] },
  south: { walled: [[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], close: [[0, 0]], recurse: [1, 0] },
  west: { walled: [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0]], close: [[0, 0]], recurse: [0, -1] },
  east: { walled: [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]], close: [[0, 0]], recurse: [0, 1] },
};

const STAIR_END = {
  north: {
    walled: [[1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]],
    corridor: [[0, 0], [1, 0], [2, 0]],
    next: [1, 0],
  },
  south: {
    walled: [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]],
    corridor: [[0, 0], [-1, 0], [-2, 0]],
    next: [-1, 0],
  },
  west: {
    walled: [[-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]],
    corridor: [[0, 0], [0, 1], [0, 2]],
    next: [0, 1],
  },
  east: {
    walled: [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]],
    corridor: [[0, 0], [0, -1], [0, -2]],
    next: [0, -1],
  },
};

function hypot(a, b) {
  return Math.sqrt(a * a + b * b);
}

function inBounds(dungeon, r, c) {
  return r >= 0 && c >= 0 && r <= dungeon.nRows && c <= dungeon.nCols;
}

function isOpen(dungeon, r, c) {
  return inBounds(dungeon, r, c) && Boolean(dungeon.cell[r][c] & OPENSPACE);
}

function emptyDungeon(options) {
  const nI = Math.floor(options.nRows / 2);
  const nJ = Math.floor(options.nCols / 2);
  const nRows = nI * 2;
  const nCols = nJ * 2;
  return {
    options,
    seed: options.seed,
    nI,
    nJ,
    nRows,
    nCols,
    maxRow: nRows - 1,
    maxCol: nCols - 1,
    roomBase: Math.floor((options.roomMin + 1) / 2),
    roomRadix: Math.floor((options.roomMax - options.roomMin) / 2) + 1,
    cell: Array.from({ length: nRows + 1 }, () => Array(nCols + 1).fill(NOTHING)),
    rooms: {},
    doors: [],
    stairs: [],
    nRooms: 0,
    connect: {},
  };
}

function maskCells(dungeon, mask) {
  const rX = mask.length / (dungeon.nRows + 1);
  const cX = mask[0].length / (dungeon.nCols + 1);
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      if (!mask[Math.floor(r * rX)][Math.floor(c * cX)]) {
        dungeon.cell[r][c] = BLOCKED;
      }
    }
  }
}

function roundMask(dungeon) {
  const centerR = Math.floor(dungeon.nRows / 2);
  const centerC = Math.floor(dungeon.nCols / 2);
  const radius = centerC;
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      if (hypot(r - centerR, c - centerC) > radius) dungeon.cell[r][c] = BLOCKED;
    }
  }
}

function initCells(dungeon) {
  const layout = dungeon.options.dungeonLayout;
  if (LAYOUT_MASKS[layout]) maskCells(dungeon, LAYOUT_MASKS[layout]);
  else if (layout === 'Round') roundMask(dungeon);
}

function wantCircle(dungeon, rng) {
  const mode = dungeon.options.circularRooms;
  if (mode === 'None') return false;
  if (mode === 'Many') return rng.random() < 0.65;
  return rng.random() < 0.28;
}

function smoothBlobCells(cells, r1, c1, r2, c2) {
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const has = (r, c) => set.has(`${r},${c}`);
  for (let pass = 0; pass < 2; pass += 1) {
    const extra = [];
    for (let r = r1; r < r2; r += 1) {
      for (let c = c1; c < c2; c += 1) {
        const nw = has(r, c);
        const ne = has(r, c + 1);
        const sw = has(r + 1, c);
        const se = has(r + 1, c + 1);
        if (nw && se && !ne && !sw) extra.push([r, c + 1]);
        else if (ne && sw && !nw && !se) extra.push([r, c]);
      }
    }
    extra.forEach(([r, c]) => set.add(`${r},${c}`));
    for (let r = r1; r <= r2; r += 1) {
      for (let c = c1; c <= c2; c += 1) {
        if (has(r, c)) continue;
        let n = 0;
        for (const [dr, dc] of AROUND8) if (has(r + dr, c + dc)) n += 1;
        if (n >= 5) set.add(`${r},${c}`);
      }
    }
  }
  return [...set].map((key) => key.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function roomFloorCells(r1, c1, r2, c2, circular) {
  if (!circular) {
    const cells = [];
    for (let r = r1; r <= r2; r += 1) {
      for (let c = c1; c <= c2; c += 1) cells.push([r, c]);
    }
    return cells;
  }
  const cr = (r1 + r2) / 2;
  const cc = (c1 + c2) / 2;
  const ry = Math.max((r2 - r1) / 2, 0.75);
  const rx = Math.max((c2 - c1) / 2, 0.75);
  const cells = [];
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      if (((r - cr) / ry) ** 2 + ((c - cc) / rx) ** 2 <= 1.02) cells.push([r, c]);
    }
  }
  return smoothBlobCells(cells, r1, c1, r2, c2);
}

function soundCells(dungeon, cells) {
  const hit = {};
  for (const [r, c] of cells) {
    const cell = dungeon.cell[r][c];
    if (cell & BLOCKED) return { blocked: 1 };
    if (cell & (PERIMETER | ENTRANCE)) return { perimeter: 1 };
    if (cell & ROOM) {
      const roomId = (cell & ROOM_ID) >> 6;
      hit[String(roomId)] = (hit[String(roomId)] || 0) + 1;
    }
  }
  return hit;
}

function stampRoomCells(dungeon, roomId, cells) {
  for (const [r, c] of cells) {
    const cell = dungeon.cell[r][c];
    if (cell & ENTRANCE) dungeon.cell[r][c] &= ~ESPACE;
    else if (cell & PERIMETER) dungeon.cell[r][c] &= ~PERIMETER;
    dungeon.cell[r][c] |= ROOM | (roomId << 6);
  }
}

function markRoomPerimeter(dungeon, roomId, r1, c1, r2, c2) {
  for (let r = Math.max(0, r1 - 1); r <= Math.min(dungeon.nRows, r2 + 1); r += 1) {
    for (let c = Math.max(0, c1 - 1); c <= Math.min(dungeon.nCols, c2 + 1); c += 1) {
      if (dungeon.cell[r][c] & (ROOM | ENTRANCE)) continue;
      for (const [dr, dc] of AROUND8) {
        const rr = r + dr;
        const cc = c + dc;
        if (!inBounds(dungeon, rr, cc)) continue;
        const neighbor = dungeon.cell[rr][cc];
        if (neighbor & ROOM && ((neighbor & ROOM_ID) >> 6) === roomId) {
          dungeon.cell[r][c] |= PERIMETER;
          break;
        }
      }
    }
  }
}

function setRoom(dungeon, rng, proto) {
  const next = { ...proto };
  const base = dungeon.roomBase;
  const radix = dungeon.roomRadix;
  if (next.height === undefined) {
    if (next.i !== undefined) {
      const a = Math.max(0, dungeon.nI - base - next.i);
      const r = a < radix ? a : radix;
      next.height = r > 0 ? rng.randrange(r) + base : base;
    } else {
      next.height = rng.randrange(radix) + base;
    }
  }
  if (next.width === undefined) {
    if (next.j !== undefined) {
      const a = Math.max(0, dungeon.nJ - base - next.j);
      const r = a < radix ? a : radix;
      next.width = r > 0 ? rng.randrange(r) + base : base;
    } else {
      next.width = rng.randrange(radix) + base;
    }
  }
  if (next.i === undefined) {
    next.i = rng.randrange(Math.max(1, dungeon.nI - next.height + 1));
  }
  if (next.j === undefined) {
    next.j = rng.randrange(Math.max(1, dungeon.nJ - next.width + 1));
  }
  return next;
}

function emplaceRoom(dungeon, rng, proto = null) {
  if (dungeon.nRooms >= 999) return false;
  const roomProto = setRoom(dungeon, rng, proto || {});
  const r1 = roomProto.i * 2 + 1;
  const c1 = roomProto.j * 2 + 1;
  const r2 = (roomProto.i + roomProto.height) * 2 - 1;
  const c2 = (roomProto.j + roomProto.width) * 2 - 1;
  if (r1 < 1 || r2 > dungeon.maxRow || c1 < 1 || c2 > dungeon.maxCol) return false;
  const circular = wantCircle(dungeon, rng) && Math.min(r2 - r1, c2 - c1) >= 4;
  const floors = roomFloorCells(r1, c1, r2, c2, circular);
  if (!floors.length) return false;
  const hit = soundCells(dungeon, floors);
  if (hit.blocked || Object.keys(hit).length) return false;
  const roomId = dungeon.nRooms + 1;
  dungeon.nRooms = roomId;
  stampRoomCells(dungeon, roomId, floors);
  const room = {
    id: roomId,
    row: r1,
    col: c1,
    north: r1,
    south: r2,
    west: c1,
    east: c2,
    height: (r2 - r1 + 1) * 10,
    width: (c2 - c1 + 1) * 10,
    circular,
    doors: [],
  };
  room.area = room.height * room.width;
  dungeon.rooms[roomId] = room;
  markRoomPerimeter(dungeon, roomId, r1, c1, r2, c2);
  return true;
}

function packRooms(dungeon, rng) {
  for (let i = 0; i < dungeon.nI; i += 1) {
    const r = i * 2 + 1;
    for (let j = 0; j < dungeon.nJ; j += 1) {
      const c = j * 2 + 1;
      if (dungeon.cell[r][c] & ROOM) continue;
      if ((i === 0 || j === 0) && rng.randrange(2)) continue;
      emplaceRoom(dungeon, rng, { i, j });
    }
  }
}

function scatterRooms(dungeon, rng) {
  const options = dungeon.options;
  const countMin = Math.max(1, Math.min(options.roomCountMin, options.roomCountMax));
  const countMax = Math.max(countMin, options.roomCountMax);
  const smallestArea = Math.max(9, options.roomMin * options.roomMin);
  const capacity = Math.max(1, Math.floor((dungeon.nCols * dungeon.nRows) / smallestArea));
  const target = Math.min(rng.randint(countMin, countMax), capacity);
  const attempts = Math.max(40, target * 30);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (dungeon.nRooms >= target) break;
    let proto = null;
    if (attempt >= Math.floor((attempts * 2) / 3)) proto = { height: dungeon.roomBase, width: dungeon.roomBase };
    emplaceRoom(dungeon, rng, proto);
  }
}

function centerRoomSize(dungeon) {
  const maxH = Math.min(dungeon.roomBase + Math.max(0, dungeon.roomRadix - 1), dungeon.nI - 2);
  let size = Math.max(3, Math.min(5, maxH));
  if (size % 2 === 0) size -= 1;
  return Math.max(3, size);
}

function emplaceCenterRoom(dungeon, rng) {
  const size = centerRoomSize(dungeon);
  return emplaceRoom(dungeon, rng, {
    i: Math.floor((dungeon.nI - size) / 2),
    j: Math.floor((dungeon.nJ - size) / 2),
    height: size,
    width: size,
    circular: rng.random() < 0.4 && dungeon.options.circularRooms !== 'None',
  });
}

function squareSpiralIj(nI, nJ) {
  let i = Math.floor(nI / 2);
  let j = Math.floor(nJ / 2);
  const cells = [];
  const seen = new Set();
  const take = (ii, jj) => {
    const key = `${ii},${jj}`;
    if (ii >= 1 && ii < nI && jj >= 1 && jj < nJ && !seen.has(key)) {
      seen.add(key);
      cells.push([ii, jj]);
    }
  };
  take(i, j);
  let di = 0;
  let dj = 1;
  let length = 1;
  while (cells.length < Math.max(1, (nI - 2) * (nJ - 2)) && length <= Math.max(nI, nJ) + 2) {
    for (let turn = 0; turn < 2; turn += 1) {
      for (let step = 0; step < length; step += 1) {
        i += di;
        j += dj;
        take(i, j);
      }
      [di, dj] = [dj, -di];
    }
    length += 1;
  }
  return cells;
}

function emplaceSpiralRooms(dungeon, rng) {
  emplaceCenterRoom(dungeon, rng);
  const positions = squareSpiralIj(dungeon.nI, dungeon.nJ);
  if (positions.length < 16) return;
  const outer = positions.slice(Math.floor(positions.length * 0.72));
  rng.shuffle(outer);
  let placed = 0;
  for (const [i, j] of outer) {
    if (placed >= 2) break;
    if (emplaceRoom(dungeon, rng, { i, j, height: 2, width: 2 })) placed += 1;
  }
}

function carveSpiralCorridor(dungeon) {
  const points = [];
  for (const [i, j] of squareSpiralIj(dungeon.nI, dungeon.nJ)) {
    const r = i * 2 + 1;
    const c = j * 2 + 1;
    if (!(r > 0 && r < dungeon.nRows && c > 0 && c < dungeon.nCols)) continue;
    if (dungeon.cell[r][c] & BLOCKED) continue;
    points.push([r, c, i, j]);
  }
  for (let index = 0; index < points.length - 1; index += 1) {
    const [r1, c1, i1, j1] = points[index];
    const [r2, c2, i2, j2] = points[index + 1];
    if (Math.abs(i1 - i2) + Math.abs(j1 - j2) !== 1) continue;
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) {
        if (dungeon.cell[r][c] & (ROOM | BLOCKED)) continue;
        dungeon.cell[r][c] &= ~PERIMETER;
        dungeon.cell[r][c] |= CORRIDOR;
      }
    }
  }
}

function emplaceGauntletRooms(dungeon, rng) {
  const width = 3;
  const j = Math.max(1, Math.floor((dungeon.nJ - width) / 2));
  let i = 1;
  const target = Math.max(5, Math.min(8, dungeon.options.roomCountMax));
  while (dungeon.nRooms < target && i + 2 < dungeon.nI - 1) {
    const isBossRoom = dungeon.nRooms === 0;
    let height = isBossRoom ? 3 : 2;
    if (i + height >= dungeon.nI - 1) height = 2;
    if (!emplaceRoom(dungeon, rng, { i, j, height, width, circular: false })) break;
    i += height + 1;
  }
}

function carveGauntletSpine(dungeon) {
  const j = Math.floor(dungeon.nJ / 2);
  const c = j * 2 + 1;
  let prevR = null;
  for (let i = 1; i < dungeon.nI; i += 1) {
    const r = i * 2 + 1;
    if (!(r > 0 && r < dungeon.nRows && c > 0 && c < dungeon.nCols)) continue;
    if (dungeon.cell[r][c] & BLOCKED) continue;
    if (prevR !== null) {
      for (let rr = Math.min(prevR, r); rr <= Math.max(prevR, r); rr += 1) {
        if (dungeon.cell[rr][c] & (ROOM | BLOCKED)) continue;
        dungeon.cell[rr][c] &= ~PERIMETER;
        dungeon.cell[rr][c] |= CORRIDOR;
      }
    }
    prevR = r;
  }
}

function emplaceRooms(dungeon, rng) {
  const style = dungeon.options.dungeonType;
  if (style === 'Keep') {
    emplaceCenterRoom(dungeon, rng);
    scatterRooms(dungeon, rng);
  } else if (style === 'Spiral') {
    emplaceSpiralRooms(dungeon, rng);
  } else if (style === 'Gauntlet') {
    emplaceGauntletRooms(dungeon, rng);
  } else if (dungeon.options.roomLayout === 'Dense') {
    packRooms(dungeon, rng);
  } else {
    scatterRooms(dungeon, rng);
  }
}

function checkSill(dungeon, room, list, sillR, sillC, direction) {
  const doorR = sillR + DI[direction];
  const doorC = sillC + DJ[direction];
  if (!inBounds(dungeon, doorR, doorC)) return;
  const doorCell = dungeon.cell[doorR][doorC];
  if (!(doorCell & PERIMETER) || doorCell & BLOCKED) return;
  const outR = doorR + DI[direction];
  const outC = doorC + DJ[direction];
  if (!inBounds(dungeon, outR, outC) || dungeon.cell[outR][outC] & BLOCKED) return;
  let outId = null;
  if (dungeon.cell[outR][outC] & ROOM) {
    outId = (dungeon.cell[outR][outC] & ROOM_ID) >> 6;
    if (outId === room.id) return;
  }
  list.push({ sill_r: sillR, sill_c: sillC, dir: direction, door_r: doorR, door_c: doorC, out_id: outId });
}

function doorSills(dungeon, room) {
  const sills = [];
  if (room.circular) {
    for (let r = room.north; r <= room.south; r += 1) {
      for (let c = room.west; c <= room.east; c += 1) {
        if (!(dungeon.cell[r][c] & ROOM)) continue;
        if (((dungeon.cell[r][c] & ROOM_ID) >> 6) !== room.id) continue;
        for (const direction of DIRS) {
          const sr = r + DI[direction];
          const sc = c + DJ[direction];
          if (!inBounds(dungeon, sr, sc)) continue;
          if (!(dungeon.cell[sr][sc] & PERIMETER) || dungeon.cell[sr][sc] & DOORSPACE) continue;
          const outR = sr + DI[direction];
          const outC = sc + DJ[direction];
          let outId = null;
          if (inBounds(dungeon, outR, outC) && dungeon.cell[outR][outC] & ROOM) {
            outId = (dungeon.cell[outR][outC] & ROOM_ID) >> 6;
          }
          sills.push({
            sill_r: r,
            sill_c: c,
            dir: direction,
            door_r: sr,
            door_c: sc,
            out_id: outId,
          });
        }
      }
    }
    return sills;
  }
  for (let c = room.west; c < room.east; c += 2) {
    checkSill(dungeon, room, sills, room.north, c, 'north');
    checkSill(dungeon, room, sills, room.south, c, 'south');
  }
  for (let r = room.north; r < room.south; r += 2) {
    checkSill(dungeon, room, sills, r, room.west, 'west');
    checkSill(dungeon, room, sills, r, room.east, 'east');
  }
  return sills;
}

function allocOpens(room) {
  const roomH = Math.floor((room.south - room.north) / 2) + 1;
  const roomW = Math.floor((room.east - room.west) / 2) + 1;
  return Math.max(2, Math.min(4, Math.floor(Math.sqrt(roomW * roomH)) + 1));
}

function doorType(dungeon, rng) {
  const style = dungeon.options.doors;
  if (style === 'None') return ARCH;
  if (style === 'Basic') return rng.random() < 0.7 ? DOOR : ARCH;
  if (style === 'Secure') {
    const roll = rng.random();
    if (roll < 0.5) return LOCKED;
    if (roll < 0.8) return DOOR;
    return ARCH;
  }
  if (style === 'Deathtrap') {
    const roll = rng.random();
    if (roll < 0.35) return TRAPPED;
    if (roll < 0.55) return SECRET;
    if (roll < 0.75) return LOCKED;
    if (roll < 0.9) return DOOR;
    return ARCH;
  }
  const roll = rng.randrange(10);
  if (roll < 2) return ARCH;
  if (roll < 6) return DOOR;
  if (roll < 8) return LOCKED;
  if (roll < 9) return TRAPPED;
  return SECRET;
}

function openRoom(dungeon, rng, room) {
  const sills = doorSills(dungeon, room);
  if (!sills.length) return;
  const nOpens = allocOpens(room);
  for (let i = 0; i < nOpens; i += 1) {
    if (!sills.length) break;
    const sill = sills.splice(rng.randrange(sills.length), 1)[0];
    const doorR = sill.door_r;
    const doorC = sill.door_c;
    if (dungeon.cell[doorR][doorC] & DOORSPACE) continue;
    const outId = sill.out_id;
    if (outId) {
      const connect = [room.id, outId].sort((a, b) => a - b).join(',');
      if (dungeon.connect[connect]) continue;
      dungeon.connect[connect] = 1;
    }
    const openDir = sill.dir;
    for (let x = 0; x < 3; x += 1) {
      const r = sill.sill_r + DI[openDir] * x;
      const c = sill.sill_c + DJ[openDir] * x;
      if (inBounds(dungeon, r, c)) {
        dungeon.cell[r][c] &= ~PERIMETER;
        dungeon.cell[r][c] |= ENTRANCE;
      }
    }
    const type = doorType(dungeon, rng);
    const door = { row: doorR, col: doorC, dir: openDir };
    if (type === ARCH) {
      dungeon.cell[doorR][doorC] |= ARCH;
      Object.assign(door, { key: 'arch', type: 'Archway' });
    } else if (type === DOOR) {
      dungeon.cell[doorR][doorC] |= DOOR | ('o'.charCodeAt(0) << 24);
      Object.assign(door, { key: 'open', type: 'Unlocked Door' });
    } else if (type === LOCKED) {
      dungeon.cell[doorR][doorC] |= LOCKED | ('x'.charCodeAt(0) << 24);
      Object.assign(door, { key: 'lock', type: 'Locked Door' });
    } else if (type === TRAPPED) {
      dungeon.cell[doorR][doorC] |= TRAPPED | ('t'.charCodeAt(0) << 24);
      Object.assign(door, { key: 'trap', type: 'Trapped Door' });
    } else if (type === SECRET) {
      dungeon.cell[doorR][doorC] |= SECRET | ('$'.charCodeAt(0) << 24);
      Object.assign(door, { key: 'secret', type: 'Secret Door' });
    } else {
      dungeon.cell[doorR][doorC] |= PORTC | ('#'.charCodeAt(0) << 24);
      Object.assign(door, { key: 'portc', type: 'Portcullis' });
    }
    if (outId) door.out_id = outId;
    room.doors.push(door);
    dungeon.doors.push(door);
  }
}

function openRooms(dungeon, rng) {
  for (let roomId = 1; roomId <= dungeon.nRooms; roomId += 1) openRoom(dungeon, rng, dungeon.rooms[roomId]);
  dungeon.connect = {};
}

function labelRooms(dungeon) {
  for (const [roomIdKey, room] of Object.entries(dungeon.rooms)) {
    const roomId = Number(roomIdKey);
    let midR = Math.floor((room.north + room.south) / 2);
    let midC = Math.floor((room.west + room.east) / 2);
    if (!(dungeon.cell[midR][midC] & ROOM)) {
      let found = false;
      for (let r = room.north; r <= room.south && !found; r += 1) {
        for (let c = room.west; c <= room.east; c += 1) {
          if (dungeon.cell[r][c] & ROOM && ((dungeon.cell[r][c] & ROOM_ID) >> 6) === roomId) {
            midR = r;
            midC = c;
            found = true;
            break;
          }
        }
      }
    }
    room.label_row = midR;
    room.label_col = midC;
    dungeon.cell[midR][midC] |= String(roomId).charCodeAt(0) << 24;
  }
}

function tunnelDirs(dungeon, rng, lastDir) {
  const dirs = rng.shuffle([...DIRS]);
  const chance = CORRIDOR_STRAIGHT_CHANCE[dungeon.options.corridorLayout] ?? 50;
  if (lastDir && chance && rng.randrange(100) < chance) {
    const rest = dirs.filter((dir) => dir !== lastDir);
    rest.unshift(lastDir);
    return rest;
  }
  return dirs;
}

function soundTunnel(dungeon, iMid, jMid, iNext, jNext) {
  if (!(iNext > 0 && iNext < dungeon.nRows && jNext > 0 && jNext < dungeon.nCols)) return false;
  const r1 = Math.min(iMid, iNext);
  const r2 = Math.max(iMid, iNext);
  const c1 = Math.min(jMid, jNext);
  const c2 = Math.max(jMid, jNext);
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      if (dungeon.cell[r][c] & (BLOCKED | PERIMETER | CORRIDOR)) return false;
    }
  }
  return true;
}

function delveTunnel(dungeon, iCur, jCur, iNext, jNext) {
  const r1 = Math.min(iCur, iNext);
  const r2 = Math.max(iCur, iNext);
  const c1 = Math.min(jCur, jNext);
  const c2 = Math.max(jCur, jNext);
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      dungeon.cell[r][c] &= ~ENTRANCE;
      dungeon.cell[r][c] |= CORRIDOR;
    }
  }
}

function openTunnel(dungeon, i, j, direction) {
  const iCur = i * 2 + 1;
  const jCur = j * 2 + 1;
  const iNext = (i + DI[direction]) * 2 + 1;
  const jNext = (j + DJ[direction]) * 2 + 1;
  const iMid = Math.floor((iCur + iNext) / 2);
  const jMid = Math.floor((jCur + jNext) / 2);
  if (!soundTunnel(dungeon, iMid, jMid, iNext, jNext)) return false;
  delveTunnel(dungeon, iCur, jCur, iNext, jNext);
  return true;
}

function tunnel(dungeon, rng, i, j, lastDir = null) {
  for (const direction of tunnelDirs(dungeon, rng, lastDir)) {
    if (openTunnel(dungeon, i, j, direction)) {
      tunnel(dungeon, rng, i + DI[direction], j + DJ[direction], direction);
    }
  }
}

function corridors(dungeon, rng) {
  for (let i = 1; i < dungeon.nI; i += 1) {
    const r = i * 2 + 1;
    for (let j = 1; j < dungeon.nJ; j += 1) {
      const c = j * 2 + 1;
      if (dungeon.cell[r][c] & OPENSPACE) continue;
      tunnel(dungeon, rng, i, j);
    }
  }
}

function addCorridorLoops(dungeon, rng) {
  const candidates = [];
  for (let r = 1; r < dungeon.nRows; r += 1) {
    for (let c = 1; c < dungeon.nCols; c += 1) {
      const cell = dungeon.cell[r][c];
      if (cell & (OPENSPACE | BLOCKED | PERIMETER)) continue;
      const horizontal = dungeon.cell[r][c - 1] & CORRIDOR && dungeon.cell[r][c + 1] & CORRIDOR;
      const vertical = dungeon.cell[r - 1][c] & CORRIDOR && dungeon.cell[r + 1][c] & CORRIDOR;
      if (horizontal || vertical) candidates.push([r, c]);
    }
  }
  rng.shuffle(candidates);
  const chance = Math.max(0, Math.min(100, dungeon.options.corridorLoops));
  const wanted = candidates.length ? Math.max(1, Math.floor(candidates.length * chance / 100 + 0.5)) : 0;
  for (const [r, c] of candidates.slice(0, wanted)) dungeon.cell[r][c] |= CORRIDOR;
}

function checkTunnel(dungeon, r, c, meta) {
  for (const [dr, dc] of meta.corridor || []) {
    const rr = r + dr;
    const cc = c + dc;
    if (!inBounds(dungeon, rr, cc) || dungeon.cell[rr][cc] !== CORRIDOR) return false;
  }
  for (const [dr, dc] of meta.walled || []) {
    const rr = r + dr;
    const cc = c + dc;
    if (!inBounds(dungeon, rr, cc) || dungeon.cell[rr][cc] & OPENSPACE) return false;
  }
  return true;
}

function stairEnds(dungeon) {
  const ends = [];
  for (let i = 0; i < dungeon.nI; i += 1) {
    const r = i * 2 + 1;
    for (let j = 0; j < dungeon.nJ; j += 1) {
      const c = j * 2 + 1;
      if (dungeon.cell[r][c] !== CORRIDOR) continue;
      for (const [direction, meta] of Object.entries(STAIR_END)) {
        if (!checkTunnel(dungeon, r, c, meta)) continue;
        ends.push({
          row: r,
          col: c,
          next_row: r + meta.next[0],
          next_col: c + meta.next[1],
          dir: direction,
        });
        break;
      }
    }
  }
  return ends;
}

function emplaceStairs(dungeon, rng) {
  const n = dungeon.options.addStairs;
  if (n <= 0) return;
  const cells = stairEnds(dungeon);
  if (!cells.length) return;
  rng.shuffle(cells);
  for (let idx = 0; idx < Math.min(n, cells.length); idx += 1) {
    const cell = cells[idx];
    const { row: r, col: c } = cell;
    if (idx % 2 === 0) {
      dungeon.cell[r][c] |= STAIR_DN | ('>'.charCodeAt(0) << 24);
      dungeon.stairs.push({ ...cell, key: 'down', type: 'Down Stairs' });
    } else {
      dungeon.cell[r][c] |= STAIR_UP | ('<'.charCodeAt(0) << 24);
      dungeon.stairs.push({ ...cell, key: 'up', type: 'Up Stairs' });
    }
  }
}

function collapseDeadend(dungeon, r, c) {
  for (const meta of Object.values(CLOSE_END)) {
    if (!checkTunnel(dungeon, r, c, meta)) continue;
    for (const [dr, dc] of meta.close) dungeon.cell[r + dr][c + dc] = NOTHING;
    const rr = r + meta.recurse[0];
    const cc = c + meta.recurse[1];
    if (dungeon.cell[rr][cc] & OPENSPACE) collapseDeadend(dungeon, rr, cc);
    return;
  }
}

function removeDeadends(dungeon, rng) {
  const pct = dungeon.options.removeDeadends;
  for (let i = 0; i < dungeon.nI; i += 1) {
    const r = i * 2 + 1;
    for (let j = 0; j < dungeon.nJ; j += 1) {
      const c = j * 2 + 1;
      if (!(dungeon.cell[r][c] & OPENSPACE)) continue;
      if (rng.randrange(100) < pct) collapseDeadend(dungeon, r, c);
    }
  }
}

function openComponents(dungeon) {
  const remaining = new Set();
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      if (isOpen(dungeon, r, c)) remaining.add(`${r},${c}`);
    }
  }
  const components = [];
  while (remaining.size) {
    const start = remaining.values().next().value;
    const component = new Set([start]);
    const stack = [start];
    remaining.delete(start);
    while (stack.length) {
      const [r, c] = stack.pop().split(',').map(Number);
      for (const [dr, dc] of CARDINAL) {
        const key = `${r + dr},${c + dc}`;
        if (!remaining.has(key)) continue;
        remaining.delete(key);
        component.add(key);
        stack.push(key);
      }
    }
    components.push(component);
  }
  return components.sort((a, b) => b.size - a.size);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.up(this.items.length - 1);
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      this.down(0);
    }
    return top;
  }

  get length() {
    return this.items.length;
  }

  cmp(a, b) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  }

  up(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.cmp(this.items[index], this.items[parent]) >= 0) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  down(index) {
    const n = this.items.length;
    while (true) {
      let smallest = index;
      const left = index * 2 + 1;
      const right = left + 1;
      if (left < n && this.cmp(this.items[left], this.items[smallest]) < 0) smallest = left;
      if (right < n && this.cmp(this.items[right], this.items[smallest]) < 0) smallest = right;
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

function leastCostConnection(dungeon, starts, targets) {
  const queue = new MinHeap();
  const distance = new Map();
  const previous = new Map();
  for (const key of starts) {
    const [r, c] = key.split(',').map(Number);
    distance.set(key, 0);
    queue.push([0, r, c]);
  }
  let destination = null;
  while (queue.length) {
    const [cost, r, c] = queue.pop();
    const current = `${r},${c}`;
    if (cost !== distance.get(current)) continue;
    if (targets.has(current)) {
      destination = current;
      break;
    }
    for (const [dr, dc] of CARDINAL) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(dungeon, rr, cc)) continue;
      const cell = dungeon.cell[rr][cc];
      if (cell & BLOCKED) continue;
      const neighbor = `${rr},${cc}`;
      let step = 2;
      if (targets.has(neighbor)) step = 1;
      else if (cell & ROOM) step = 12;
      else if (cell & PERIMETER) step = 5;
      else if (cell & OPENSPACE) step = 1;
      const nextCost = cost + step;
      if (nextCost >= (distance.get(neighbor) ?? 1 << 30)) continue;
      distance.set(neighbor, nextCost);
      previous.set(neighbor, current);
      queue.push([nextCost, rr, cc]);
    }
  }
  if (!destination) return [];
  const path = [destination];
  while (!starts.has(path[path.length - 1])) path.push(previous.get(path[path.length - 1]));
  path.reverse();
  return path.map((key) => key.split(',').map(Number));
}

function connectOpenComponents(dungeon) {
  while (true) {
    const components = openComponents(dungeon);
    if (components.length <= 1) return;
    const path = leastCostConnection(dungeon, components[1], components[0]);
    if (!path.length) return;
    for (const [r, c] of path) {
      if (dungeon.cell[r][c] & OPENSPACE) continue;
      dungeon.cell[r][c] &= ~(PERIMETER | ENTRANCE | BLOCKED);
      dungeon.cell[r][c] |= CORRIDOR;
    }
  }
}

function roomIdsAround(dungeon, r, c) {
  const ids = new Set();
  for (const [dr, dc] of CARDINAL) {
    const rr = r + dr;
    const cc = c + dc;
    if (!inBounds(dungeon, rr, cc)) continue;
    const cell = dungeon.cell[rr][cc];
    if (cell & ROOM) ids.add((cell & ROOM_ID) >> 6);
  }
  return ids;
}

function adoptOpenspace(dungeon, r, c) {
  const roomIds = roomIdsAround(dungeon, r, c);
  let corridor = false;
  for (const [dr, dc] of CARDINAL) {
    const rr = r + dr;
    const cc = c + dc;
    if (inBounds(dungeon, rr, cc) && dungeon.cell[rr][cc] & CORRIDOR) corridor = true;
  }
  const flags = dungeon.cell[r][c] & ~(PERIMETER | BLOCKED);
  if (roomIds.size === 1) {
    const rid = [...roomIds][0];
    dungeon.cell[r][c] = (flags & ~ROOM_ID) | ROOM | (rid << 6);
  } else if (corridor) {
    dungeon.cell[r][c] = (flags & ~ROOM_ID) | CORRIDOR;
  } else if (roomIds.size) {
    const rid = Math.min(...roomIds);
    dungeon.cell[r][c] = (flags & ~ROOM_ID) | ROOM | (rid << 6);
  }
}

function restoreUnusedEntrances(dungeon) {
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      const cell = dungeon.cell[r][c];
      if (!(cell & ENTRANCE) || cell & OPENSPACE) continue;
      dungeon.cell[r][c] &= ~ENTRANCE;
      dungeon.cell[r][c] &= ~DOORSPACE;
      dungeon.cell[r][c] |= PERIMETER;
    }
  }
}

function closeDiagonalGaps(dungeon) {
  let changed = false;
  for (let r = 0; r < dungeon.nRows; r += 1) {
    for (let c = 0; c < dungeon.nCols; c += 1) {
      const a = isOpen(dungeon, r, c);
      const b = isOpen(dungeon, r, c + 1);
      const d = isOpen(dungeon, r + 1, c);
      const e = isOpen(dungeon, r + 1, c + 1);
      let fill = null;
      if (a && e && !b && !d) fill = [r, c + 1];
      else if (b && d && !a && !e) fill = [r, c];
      if (!fill) continue;
      const [fr, fc] = fill;
      if (dungeon.cell[fr][fc] & (DOORSPACE | STAIRS)) continue;
      if (roomIdsAround(dungeon, fr, fc).size > 1) continue;
      adoptOpenspace(dungeon, fr, fc);
      changed = true;
    }
  }
  return changed;
}

function fillWallNotches(dungeon) {
  let changed = false;
  for (let r = 1; r < dungeon.nRows; r += 1) {
    for (let c = 1; c < dungeon.nCols; c += 1) {
      if (dungeon.cell[r][c] & (OPENSPACE | DOORSPACE | STAIRS)) continue;
      const n = CARDINAL.reduce((sum, [dr, dc]) => sum + (isOpen(dungeon, r + dr, c + dc) ? 1 : 0), 0);
      if (n < 3 || roomIdsAround(dungeon, r, c).size > 1) continue;
      adoptOpenspace(dungeon, r, c);
      changed = true;
    }
  }
  return changed;
}

function tidyGeometry(dungeon) {
  restoreUnusedEntrances(dungeon);
  for (let i = 0; i < 3; i += 1) {
    const changed = closeDiagonalGaps(dungeon) || fillWallNotches(dungeon);
    if (!changed) break;
  }
}

function rebuildPerimeter(dungeon) {
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      if (dungeon.cell[r][c] & OPENSPACE) {
        dungeon.cell[r][c] &= ~PERIMETER;
        continue;
      }
      dungeon.cell[r][c] &= ~PERIMETER;
      for (const [dr, dc] of AROUND8) {
        if (isOpen(dungeon, r + dr, c + dc)) {
          dungeon.cell[r][c] |= PERIMETER;
          break;
        }
      }
    }
  }
}

function fixDoors(dungeon) {
  const fixed = [];
  for (const door of dungeon.doors) {
    const { row: r, col: c } = door;
    if (!(dungeon.cell[r][c] & OPENSPACE)) {
      dungeon.cell[r][c] &= ~DOORSPACE;
      continue;
    }
    const left = isOpen(dungeon, r, c - 1);
    const right = isOpen(dungeon, r, c + 1);
    const up = isOpen(dungeon, r - 1, c);
    const down = isOpen(dungeon, r + 1, c);
    if ((left && right) || (up && down)) fixed.push(door);
    else dungeon.cell[r][c] &= ~DOORSPACE;
  }
  dungeon.doors = fixed;
  for (const room of Object.values(dungeon.rooms)) {
    room.doors = room.doors.filter((door) =>
      fixed.some((keep) => keep.row === door.row && keep.col === door.col)
    );
  }
}

function fixStairs(dungeon, rng) {
  const wanted = Math.max(0, dungeon.options.addStairs);
  const live = [];
  for (const stair of dungeon.stairs) {
    const { row: r, col: c } = stair;
    if (dungeon.cell[r][c] & OPENSPACE && dungeon.cell[r][c] & STAIRS) live.push(stair);
    else dungeon.cell[r][c] &= ~STAIRS;
  }
  dungeon.stairs = live.slice(0, wanted);
  const candidates = [];
  for (let r = 1; r < dungeon.nRows; r += 1) {
    for (let c = 1; c < dungeon.nCols; c += 1) {
      if (
        dungeon.cell[r][c] & OPENSPACE &&
        !(dungeon.cell[r][c] & (DOORSPACE | STAIRS | LABEL)) &&
        CARDINAL.reduce((sum, [dr, dc]) => sum + (isOpen(dungeon, r + dr, c + dc) ? 1 : 0), 0) >= 2
      ) {
        candidates.push([r, c]);
      }
    }
  }
  rng.shuffle(candidates);
  while (dungeon.stairs.length < wanted && candidates.length) {
    if (dungeon.stairs.length) {
      candidates.sort((a, b) => {
        const dist = (point) =>
          Math.min(
            ...dungeon.stairs.map((stair) => Math.abs(point[0] - stair.row) + Math.abs(point[1] - stair.col))
          );
        return dist(b) - dist(a);
      });
    }
    const [r, c] = candidates.shift();
    const index = dungeon.stairs.length;
    const down = index % 2 === 0;
    dungeon.cell[r][c] |= (down ? STAIR_DN : STAIR_UP) | ((down ? '>' : '<').charCodeAt(0) << 24);
    dungeon.stairs.push({
      row: r,
      col: c,
      next_row: r,
      next_col: c,
      dir: 'north',
      key: down ? 'down' : 'up',
      type: down ? 'Down Stairs' : 'Up Stairs',
    });
  }
}

function emptyBlocks(dungeon) {
  for (let r = 0; r <= dungeon.nRows; r += 1) {
    for (let c = 0; c <= dungeon.nCols; c += 1) {
      if (dungeon.cell[r][c] & BLOCKED) dungeon.cell[r][c] = NOTHING;
    }
  }
}

function nudgeLayoutToCenter(dungeon) {
  const rows = dungeon.nRows + 1;
  const cols = dungeon.nCols + 1;
  const used = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (dungeon.cell[r][c] & (OPENSPACE | PERIMETER | DOORSPACE | STAIRS)) used.push([r, c]);
    }
  }
  if (!used.length) return;
  const north = Math.min(...used.map(([r]) => r));
  const south = Math.max(...used.map(([r]) => r));
  const west = Math.min(...used.map(([, c]) => c));
  const east = Math.max(...used.map(([, c]) => c));
  const shiftR = Math.floor((rows - (south - north + 1)) / 2) - north;
  const shiftC = Math.floor((cols - (east - west + 1)) / 2) - west;
  if (!shiftR && !shiftC) return;
  const old = dungeon.cell.map((row) => row.slice());
  dungeon.cell = Array.from({ length: rows }, () => Array(cols).fill(NOTHING));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const nr = r + shiftR;
      const nc = c + shiftC;
      if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) dungeon.cell[nr][nc] = old[r][c];
    }
  }
  const move = (item, rowKey, colKey) => {
    if (rowKey in item) item[rowKey] += shiftR;
    if (colKey in item) item[colKey] += shiftC;
  };
  for (const room of Object.values(dungeon.rooms)) {
    for (const key of ['row', 'north', 'south', 'label_row']) if (key in room) room[key] += shiftR;
    for (const key of ['col', 'west', 'east', 'label_col']) if (key in room) room[key] += shiftC;
    room.doors.forEach((door) => move(door, 'row', 'col'));
  }
  dungeon.doors.forEach((door) => move(door, 'row', 'col'));
  dungeon.stairs.forEach((stair) => {
    move(stair, 'row', 'col');
    move(stair, 'next_row', 'next_col');
  });
}

function cleanDungeon(dungeon, rng) {
  if (dungeon.options.removeDeadends) removeDeadends(dungeon, rng);
  if (dungeon.options.corridorLoops) addCorridorLoops(dungeon, rng);
  connectOpenComponents(dungeon);
  tidyGeometry(dungeon);
  fixDoors(dungeon);
  fixStairs(dungeon, rng);
  rebuildPerimeter(dungeon);
  emptyBlocks(dungeon);
  const style = dungeon.options.dungeonType;
  if (style !== 'Spiral' && style !== 'Keep' && style !== 'Gauntlet') {
    nudgeLayoutToCenter(dungeon);
  }
}

export function createDungeon(options) {
  const dungeon = emptyDungeon(options);
  const rng = createRng(options.seed);
  initCells(dungeon);
  emplaceRooms(dungeon, rng);
  const style = options.dungeonType;
  if (style === 'Spiral') carveSpiralCorridor(dungeon);
  else if (style === 'Gauntlet') carveGauntletSpine(dungeon);
  openRooms(dungeon, rng);
  labelRooms(dungeon);
  if (style !== 'Spiral' && style !== 'Gauntlet') corridors(dungeon, rng);
  if (options.addStairs) emplaceStairs(dungeon, rng);
  cleanDungeon(dungeon, rng);
  return dungeon;
}

export function dungeonToFloorGrid(dungeon) {
  const rows = dungeon.nRows + 1;
  const cols = dungeon.nCols + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = dungeon.cell[r][c];
      if (cell & ROOM) grid[r][c] = 1;
      else if (cell & CORRIDOR) grid[r][c] = 2;
    }
  }
  return { rows, cols, rooms: dungeon.nRooms, grid };
}

export function describeDungeon(seedValue, tokenId = null) {
  const options = optionsFromSeed(seedValue, tokenId);
  const dungeon = createDungeon(options);
  const attributes = attributesFromDungeon(dungeon, options.tileset, options);
  return {
    seed: String(seedValue ?? '42'),
    numericSeed: seedToInt(seedValue),
    tileset: options.tileset,
    biome: options.biome,
    dungeonType: options.dungeonType,
    miniBoss: options.miniBoss,
    tokenId,
    rooms: dungeon.nRooms,
    doors: dungeon.doors.length,
    stairs: dungeon.stairs.length,
    options,
    attributes,
    dungeon,
    layout: dungeonToFloorGrid(dungeon),
  };
}
