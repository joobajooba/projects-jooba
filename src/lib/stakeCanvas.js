import { canvasById } from './staking';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawRoundedImage(ctx, image, x, y, size, radius, aligned) {
  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.clip();
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(x, y, size, size);
  if (image) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, size, size);
  }
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.strokeStyle = aligned ? 'rgba(255, 200, 90, 0.95)' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = aligned ? 4 : 2;
  ctx.stroke();
  ctx.restore();
}

export async function composeStakeCanvas({
  canvasId,
  imp,
  keepsBySlot,
  alignedSlots = new Set(),
}) {
  const layout = canvasById(canvasId);
  const cell = 220;
  const gap = 18;
  const pad = 28;
  const width = pad * 2 + layout.cols * cell + (layout.cols - 1) * gap;
  const height = pad * 2 + layout.rows * cell + (layout.rows - 1) * gap;
  const board = document.createElement('canvas');
  board.width = width;
  board.height = height;
  const ctx = board.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable.');

  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(184, 255, 46, 0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  const sources = [];
  if (imp?.image) sources.push(['imp', imp.image]);
  layout.keepSlots.forEach((slot) => {
    const keep = keepsBySlot?.[slot];
    if (keep?.image) sources.push([slot, keep.image]);
  });

  const loaded = new Map();
  await Promise.all(
    sources.map(async ([slot, src]) => {
      try {
        loaded.set(slot, await loadImage(src));
      } catch {
        loaded.set(slot, null);
      }
    })
  );

  layout.cells.forEach((slot, index) => {
    if (!slot) return;
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);
    const x = pad + col * (cell + gap);
    const y = pad + row * (cell + gap);
    const image = slot === 'imp' ? loaded.get('imp') : loaded.get(slot);
    drawRoundedImage(ctx, image, x, y, cell, Math.round(cell * 0.12), alignedSlots.has(slot));
  });

  return board.toDataURL('image/jpeg', 0.84);
}

export function downloadPngFromImageSrc(src, filename) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No canvas image to download.'));
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const board = document.createElement('canvas');
      board.width = image.naturalWidth || image.width;
      board.height = image.naturalHeight || image.height;
      const ctx = board.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is unavailable.'));
        return;
      }
      ctx.drawImage(image, 0, 0);
      board.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not export PNG.'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('Could not load the canvas image.'));
    image.src = src;
  });
}
