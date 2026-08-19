const ROOM = 1;
const CORRIDOR = 2;
const DOOR = 3;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedToInt(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  const text = String(seed || '').replace(/^0x/i, '');
  if (/^[0-9a-f]+$/i.test(text) && text.length >= 8) {
    return Number.parseInt(text.slice(0, 8), 16) >>> 0;
  }

  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fillRect(grid, rows, cols, row, col, height, width, value) {
  for (let r = row; r < row + height && r < rows; r += 1) {
    for (let c = col; c < col + width && c < cols; c += 1) {
      grid[r][c] = value;
    }
  }
}

function carveCorridor(grid, rows, cols, from, to) {
  const [r1, c1] = from;
  const [r2, c2] = to;
  let r = r1;
  let c = c1;

  while (c !== c2) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0) grid[r][c] = CORRIDOR;
    c += c2 > c ? 1 : -1;
  }
  while (r !== r2) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0) grid[r][c] = CORRIDOR;
    r += r2 > r ? 1 : -1;
  }
}

export function generateDungeonLayout(seed, options = {}) {
  const rows = options.rows ?? 39;
  const cols = options.cols ?? 39;
  const random = mulberry32(seedToInt(seed));
  const targetRooms = 10 + Math.floor(random() * 5);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rooms = [];

  for (let attempt = 0; attempt < 80 && rooms.length < targetRooms; attempt += 1) {
    const height = 5 + Math.floor(random() * 5);
    const width = 5 + Math.floor(random() * 5);
    const row = 1 + Math.floor(random() * Math.max(1, rows - height - 2));
    const col = 1 + Math.floor(random() * Math.max(1, cols - width - 2));
    const overlaps = rooms.some(
      (room) =>
        row <= room.row + room.height + 1 &&
        row + height + 1 >= room.row &&
        col <= room.col + room.width + 1 &&
        col + width + 1 >= room.col
    );
    if (overlaps) continue;

    fillRect(grid, rows, cols, row, col, height, width, ROOM);
    rooms.push({
      id: rooms.length + 1,
      row,
      col,
      height,
      width,
      center: [row + Math.floor(height / 2), col + Math.floor(width / 2)],
    });
  }

  for (let index = 1; index < rooms.length; index += 1) {
    carveCorridor(grid, rows, cols, rooms[index - 1].center, rooms[index].center);
  }

  rooms.forEach((room) => {
    const doorRow = room.row;
    const doorCol = room.col + Math.floor(room.width / 2);
    if (grid[doorRow]?.[doorCol] === ROOM) grid[doorRow][doorCol] = DOOR;
  });

  const tilesets = [
    'plains',
    'limestone',
    'desert',
    'forgotten_ruins',
    'mossy',
    'icy',
    'castle',
    'underworld',
    'lunar',
    'clouds',
    'volcano',
    'mushroom',
    'shortcake',
    'dreamcore',
    'storm',
    'the_vault',
    'void',
  ];
  const tilesetIndex = seedToInt(seed) % tilesets.length;

  return {
    seed: String(seed),
    numericSeed: seedToInt(seed),
    rows,
    cols,
    rooms: rooms.length,
    tileset: tilesets[tilesetIndex],
    grid,
  };
}

export function dungeonLayoutToSvg(layout, { cell = 10 } = {}) {
  const width = layout.cols * cell;
  const height = layout.rows * cell;
  const fills = {
    0: '#07070a',
    [ROOM]: '#3d3344',
    [CORRIDOR]: '#2a2433',
    [DOOR]: '#b8ff2e',
  };

  const rects = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const value = layout.grid[row][col];
      if (!value) continue;
      rects.push(
        `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${fills[value]}" />`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}
