import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SOURCE_DIR =
  process.env.SLIDESHOW_SOURCE ||
  String.raw`C:\Users\lucas\Documents\D3MON$\opensea_studio\images`;
const DEST_DIR = path.join(root, 'public', 'slideshow');
const COUNT = Number(process.env.SLIDESHOW_COUNT || 24);

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`Source folder not found:\n  ${SOURCE_DIR}`);
  process.exit(1);
}

const sourceFiles = fs
  .readdirSync(SOURCE_DIR)
  .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
  .map((name) => path.join(SOURCE_DIR, name));

if (sourceFiles.length === 0) {
  console.error('No images found in source folder.');
  process.exit(1);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
for (const entry of fs.readdirSync(DEST_DIR)) {
  fs.unlinkSync(path.join(DEST_DIR, entry));
}

const selected = shuffle(sourceFiles).slice(0, Math.min(COUNT, sourceFiles.length));
const manifest = [];

selected.forEach((filePath, index) => {
  const ext = path.extname(filePath).toLowerCase();
  const destName = `slide-${String(index + 1).padStart(2, '0')}${ext}`;
  fs.copyFileSync(filePath, path.join(DEST_DIR, destName));
  manifest.push(`/slideshow/${destName}`);
});

fs.writeFileSync(
  path.join(DEST_DIR, 'manifest.json'),
  `${JSON.stringify({ images: manifest }, null, 2)}\n`
);

console.log(
  `Copied ${manifest.length} random images from\n  ${SOURCE_DIR}\ninto\n  ${DEST_DIR}`
);
