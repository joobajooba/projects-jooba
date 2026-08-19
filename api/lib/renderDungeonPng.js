import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { MINI_BOSS_SPRITES, TILESETS, tilesetForSeed } from './dungeonTraits.js';
import { describeDungeon } from './generateDungeon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TALL_DIRS = [
  path.join(ROOT, 'Tall Tiles'),
  path.join(ROOT, 'dungeon_generator', 'tall_tiles'),
  path.join(ROOT, 'tall_tiles'),
];
const TILES_DIR = path.join(ROOT, 'Tiles');
const BOSS_DIRS = [
  path.join(ROOT, 'Mini-Bosses'),
  path.join(ROOT, 'dungeon_generator', 'mini_bosses'),
];
const TILE_SIZE = 32;

const FRAME_BY_MASK = [
  -1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6,
];

function slug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function listSheets(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => path.join(dir, name));
}

function pickSheet(files, wanted) {
  const rows = files.map((file) => ({ file, stem: slug(path.parse(file).name) }));
  return (
    rows.find((row) => row.stem === wanted) ||
    rows.find((row) => row.stem === `tall_${wanted}`) ||
    null
  );
}

function resolveSheetPath(tilesetName) {
  const wanted = slug(tilesetName);
  const tallFiles = TALL_DIRS.flatMap(listSheets);
  const match = pickSheet(tallFiles, wanted) || pickSheet(listSheets(TILES_DIR), wanted);
  if (!match) {
    throw new Error(`No tall tilesheet for ${tilesetName} (looked in Tall Tiles/)`);
  }
  return match.file;
}

function resolveBossPath(stem) {
  for (const dir of BOSS_DIRS) {
    const spritePath = path.join(dir, `${stem}.png`);
    if (fs.existsSync(spritePath)) return spritePath;
  }
  return null;
}

async function loadTileset(tilesetName) {
  const sheetPath = resolveSheetPath(tilesetName);
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const tileW = Math.floor(info.width / 4);
  const tileH = Math.floor(info.height / 4);
  if (tileW < 8 || tileH < 8) throw new Error(`Invalid tilesheet ${sheetPath}`);
  const outW = TILE_SIZE;
  const outH = Math.max(1, Math.round(tileH * (TILE_SIZE / tileW)));

  const extractCell = async (tx, ty) => {
    const left = tx * tileW;
    const top = ty * tileH;
    const tileBuf = Buffer.alloc(tileW * tileH * 4);
    for (let y = 0; y < tileH; y += 1) {
      const srcStart = ((top + y) * info.width + left) * 4;
      data.copy(tileBuf, y * tileW * 4, srcStart, srcStart + tileW * 4);
    }
    return sharp(tileBuf, { raw: { width: tileW, height: tileH, channels: 4 } })
      .resize(outW, outH, { kernel: sharp.kernel.nearest })
      .ensureAlpha()
      .raw()
      .toBuffer();
  };

  const byMask = new Map();
  for (let mask = 0; mask < FRAME_BY_MASK.length; mask += 1) {
    const frame = FRAME_BY_MASK[mask];
    if (frame < 0) {
      byMask.set(mask, null);
      continue;
    }
    byMask.set(mask, await extractCell(frame % 4, Math.floor(frame / 4)));
  }

  const solidWall = await extractCell(0, 3);
  byMask.set(0, solidWall);
  return {
    byMask,
    voidTile: solidWall,
    tileSize: outW,
    tileHeight: outH,
    overhang: Math.max(0, outH - outW),
  };
}

function isFloorCell(value) {
  return value === 1 || value === 2 || value === 3;
}

function floodExterior(rows, cols, isFloor) {
  const exterior = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [];
  for (let r = 0; r < rows; r += 1) {
    for (const c of [0, cols - 1]) if (!isFloor(r, c)) stack.push([r, c]);
  }
  for (let c = 0; c < cols; c += 1) {
    for (const r of [0, rows - 1]) if (!isFloor(r, c)) stack.push([r, c]);
  }
  while (stack.length) {
    const [r, c] = stack.pop();
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
    if (exterior[r][c] || isFloor(r, c)) continue;
    exterior[r][c] = true;
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return exterior;
}

function contentBBox(masks, tileSize, tileHeight) {
  let minR = null;
  let minC = null;
  let maxR = null;
  let maxC = null;
  for (let r = 0; r < masks.length; r += 1) {
    for (let c = 0; c < masks[r].length; c += 1) {
      if (masks[r][c] === 0) continue;
      minR = minR === null ? r : Math.min(minR, r);
      maxR = maxR === null ? r : Math.max(maxR, r);
      minC = minC === null ? c : Math.min(minC, c);
      maxC = maxC === null ? c : Math.max(maxC, c);
    }
  }
  if (minR === null) return null;
  return {
    left: minC * tileSize,
    top: minR * tileSize,
    width: (maxC - minC + 1) * tileSize,
    height: (maxR - minR) * tileSize + tileHeight,
  };
}

function blit(canvas, width, height, tileBuf, tileW, tileH, dx, dy) {
  if (!tileBuf) return;
  for (let y = 0; y < tileH; y += 1) {
    const destY = dy + y;
    if (destY < 0 || destY >= height) continue;
    for (let x = 0; x < tileW; x += 1) {
      const destX = dx + x;
      if (destX < 0 || destX >= width) continue;
      const si = (y * tileW + x) * 4;
      if (tileBuf[si + 3] === 0) continue;
      const di = (destY * width + destX) * 4;
      canvas[di] = tileBuf[si];
      canvas[di + 1] = tileBuf[si + 1];
      canvas[di + 2] = tileBuf[si + 2];
      canvas[di + 3] = 255;
    }
  }
}

async function centerOnSquare(pngBuffer, margin, bbox, fillTile, tileW, tileH) {
  const image = sharp(pngBuffer);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const crop = bbox || { left: 0, top: 0, width, height };
  const extract = {
    left: Math.max(0, Math.min(width - 1, crop.left)),
    top: Math.max(0, Math.min(height - 1, crop.top)),
    width: Math.max(1, Math.min(width - crop.left, crop.width)),
    height: Math.max(1, Math.min(height - crop.top, crop.height)),
  };
  const cropped = await image.extract(extract).png().toBuffer();
  const croppedMeta = await sharp(cropped).metadata();
  const cw = croppedMeta.width || 0;
  const ch = croppedMeta.height || 0;
  const side = Math.max(width, height, cw + margin * 2, ch + margin * 2);
  const pasteX = Math.floor((side - cw) / 2);
  const pasteY = Math.floor((side - ch) / 2);

  const canvas = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const tx = ((x % tileW) + tileW) % tileW;
      const ty = ((y % tileH) + tileH) % tileH;
      const ti = (ty * tileW + tx) * 4;
      const di = (y * side + x) * 4;
      canvas[di] = fillTile[ti];
      canvas[di + 1] = fillTile[ti + 1];
      canvas[di + 2] = fillTile[ti + 2];
      canvas[di + 3] = 255;
    }
  }

  const cropRaw = await sharp(cropped).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const si = (y * cw + x) * 4;
      if (cropRaw[si + 3] === 0) continue;
      const di = ((pasteY + y) * side + (pasteX + x)) * 4;
      canvas[di] = cropRaw[si];
      canvas[di + 1] = cropRaw[si + 1];
      canvas[di + 2] = cropRaw[si + 2];
      canvas[di + 3] = 255;
    }
  }

  return sharp(canvas, { raw: { width: side, height: side, channels: 4 } }).png().toBuffer();
}

async function blitMiniBoss(canvas, width, height, dungeon, miniBoss, ts, overhang) {
  const stem = MINI_BOSS_SPRITES[miniBoss];
  if (!stem || miniBoss === 'None') return;
  const spritePath = resolveBossPath(stem);
  if (!spritePath) return;
  const rooms = Object.values(dungeon?.rooms || {});
  const room = rooms.sort((a, b) => (b.area || 0) - (a.area || 0))[0];
  if (!room) return;

  const { data, info } = await sharp(spritePath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const cx = Math.round(((room.west + room.east + 2) * ts) / 2);
  const floorNorth = room.south > room.north ? room.north + 1 : room.north;
  const cy = Math.round(overhang + ((floorNorth + room.south + 2) * ts) / 2);
  const dx = Math.round(cx - info.width / 2);
  const dy = Math.round(cy - info.height / 2);
  blit(canvas, width, height, data, info.width, info.height, dx, dy);
}

async function renderDualGrid(described, maxEdge = 768) {
  const layout = described.layout;
  const tiles = await loadTileset(described.tileset);
  const cellRows = layout.rows;
  const cellCols = layout.cols;
  const dualRows = cellRows + 1;
  const dualCols = cellCols + 1;
  const ts = tiles.tileSize;
  const th = tiles.tileHeight;
  const overhang = tiles.overhang;
  const isFloor = (r, c) => {
    if (r < 0 || c < 0 || r >= cellRows || c >= cellCols) return false;
    return isFloorCell(layout.grid[r][c]);
  };
  const exterior = floodExterior(cellRows, cellCols, isFloor);
  const masks = Array.from({ length: dualRows }, () => Array(dualCols).fill(0));
  const width = dualCols * ts;
  const height = dualRows * ts + overhang;
  const canvas = Buffer.alloc(width * height * 4);

  for (let dr = 0; dr < dualRows; dr += 1) {
    for (let dc = 0; dc < dualCols; dc += 1) {
      blit(canvas, width, height, tiles.voidTile, ts, th, dc * ts, dr * ts);
      let mask = 0;
      if (isFloor(dr - 1, dc - 1)) mask |= 1;
      if (isFloor(dr - 1, dc)) mask |= 2;
      if (isFloor(dr, dc - 1)) mask |= 4;
      if (isFloor(dr, dc)) mask |= 8;
      masks[dr][dc] = mask;

      if (mask === 0) {
        const cells = [
          [dr - 1, dc - 1],
          [dr - 1, dc],
          [dr, dc - 1],
          [dr, dc],
        ];
        const allExterior = cells.every(([r, c]) => {
          if (r < 0 || c < 0 || r >= cellRows || c >= cellCols) return true;
          return exterior[r][c] && !isFloor(r, c);
        });
        if (allExterior) continue;
      }

      blit(canvas, width, height, tiles.byMask.get(mask) || tiles.voidTile, ts, th, dc * ts, dr * ts);
    }
  }

  await blitMiniBoss(canvas, width, height, described.dungeon, described.miniBoss, ts, overhang);

  let png = await sharp(canvas, { raw: { width, height, channels: 4 } }).png().toBuffer();
  png = await centerOnSquare(
    png,
    ts,
    contentBBox(masks, ts, th),
    tiles.voidTile,
    ts,
    th,
  );

  const meta = await sharp(png).metadata();
  const edge = Math.max(meta.width || 0, meta.height || 0);
  if (edge > maxEdge) {
    const scale = maxEdge / edge;
    png = await sharp(png)
      .resize({
        width: Math.max(1, Math.round((meta.width || edge) * scale)),
        height: Math.max(1, Math.round((meta.height || edge) * scale)),
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
  }
  return png;
}

export async function renderDungeonPreview(seedValue) {
  const seed = String(seedValue || '42');
  const described = describeDungeon(seed);
  const png = await renderDualGrid(described, 768);
  return {
    seed: described.seed,
    numericSeed: described.numericSeed,
    rooms: described.rooms,
    doors: described.doors,
    stairs: described.stairs,
    tileset: described.tileset,
    biome: described.biome,
    dungeonType: described.dungeonType,
    miniBoss: described.miniBoss,
    options: described.options,
    attributes: described.attributes,
    engine: 'donjon-tall-tiles',
    png,
  };
}

export { TILESETS, tilesetForSeed };
export { seedToInt } from './dungeonTraits.js';
export { describeDungeon } from './generateDungeon.js';
