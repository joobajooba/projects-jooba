import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TILESETS, tilesetForSeed } from './dungeonTraits.js';
import { describeDungeon } from './generateDungeon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TILES_DIR = path.join(ROOT, 'Tiles');
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

function resolveSheetPath(tilesetName) {
  const wanted = slug(tilesetName);
  const files = fs.readdirSync(TILES_DIR).filter((name) => name.toLowerCase().endsWith('.png'));
  const match =
    files.find((name) => slug(path.parse(name).name) === wanted) ||
    files.find((name) => slug(path.parse(name).name).includes(wanted)) ||
    files[0];
  if (!match) throw new Error(`No tilesheets found in ${TILES_DIR}`);
  return path.join(TILES_DIR, match);
}

async function loadTileset(tilesetName) {
  const sheetPath = resolveSheetPath(tilesetName);
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const src = Math.floor(Math.min(info.width, info.height) / 4);
  if (src < 8) throw new Error(`Invalid tilesheet ${sheetPath}`);

  const extractCell = async (tx, ty) => {
    const left = tx * src;
    const top = ty * src;
    const tileBuf = Buffer.alloc(src * src * 4);
    for (let y = 0; y < src; y += 1) {
      const srcStart = ((top + y) * info.width + left) * 4;
      data.copy(tileBuf, y * src * 4, srcStart, srcStart + src * 4);
    }
    return sharp(tileBuf, { raw: { width: src, height: src, channels: 4 } })
      .resize(TILE_SIZE, TILE_SIZE, { kernel: sharp.kernel.nearest })
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
  return { byMask, voidTile: solidWall, tileSize: TILE_SIZE };
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

function contentBBox(masks, tileSize) {
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
    height: (maxR - minR + 1) * tileSize,
  };
}

async function centerOnSquare(pngBuffer, margin, bbox, fillTile) {
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
      const tx = x % TILE_SIZE;
      const ty = y % TILE_SIZE;
      const ti = (ty * TILE_SIZE + tx) * 4;
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

async function renderDualGrid(layout, tilesetName, maxEdge = 768) {
  const tiles = await loadTileset(tilesetName);
  const cellRows = layout.rows;
  const cellCols = layout.cols;
  const dualRows = cellRows + 1;
  const dualCols = cellCols + 1;
  const ts = tiles.tileSize;
  const isFloor = (r, c) => {
    if (r < 0 || c < 0 || r >= cellRows || c >= cellCols) return false;
    return isFloorCell(layout.grid[r][c]);
  };
  const exterior = floodExterior(cellRows, cellCols, isFloor);
  const masks = Array.from({ length: dualRows }, () => Array(dualCols).fill(0));
  const width = dualCols * ts;
  const height = dualRows * ts;
  const canvas = Buffer.alloc(width * height * 4);

  const blit = (tileBuf, dx, dy) => {
    if (!tileBuf) return;
    for (let y = 0; y < ts; y += 1) {
      for (let x = 0; x < ts; x += 1) {
        const si = (y * ts + x) * 4;
        if (tileBuf[si + 3] === 0) continue;
        const di = ((dy + y) * width + (dx + x)) * 4;
        canvas[di] = tileBuf[si];
        canvas[di + 1] = tileBuf[si + 1];
        canvas[di + 2] = tileBuf[si + 2];
        canvas[di + 3] = 255;
      }
    }
  };

  for (let dr = 0; dr < dualRows; dr += 1) {
    for (let dc = 0; dc < dualCols; dc += 1) {
      blit(tiles.voidTile, dc * ts, dr * ts);
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

      blit(tiles.byMask.get(mask) || tiles.voidTile, dc * ts, dr * ts);
    }
  }

  let png = await sharp(canvas, { raw: { width, height, channels: 4 } }).png().toBuffer();
  png = await centerOnSquare(png, ts, contentBBox(masks, ts), tiles.voidTile);

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
  const png = await renderDualGrid(described.layout, described.tileset, 768);
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
    engine: 'donjon-tiles',
    png,
  };
}

export { TILESETS, tilesetForSeed };
export { seedToInt } from './dungeonTraits.js';
export { describeDungeon } from './generateDungeon.js';
