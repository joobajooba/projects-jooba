import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetName =
  'c__Users_lucas_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-1f4a8d09-37e6-4593-8025-620440db1d0d.png';
const inputCandidates = [
  path.join(root, 'assets', assetName),
  path.join(root, 'public', 'logo.png'),
  path.join(
    'C:',
    'Users',
    'lucas',
    '.cursor',
    'projects',
    'c-Users-lucas-Documents-projects-jooba-main',
    'assets',
    assetName,
  ),
];
const input = inputCandidates.find((candidate) => fs.existsSync(candidate));
if (!input) {
  throw new Error('Logo source image not found');
}
const output = path.join(root, 'public', 'logo-transparent.png');

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const isNearWhite = r > 232 && g > 232 && b > 232;
  const isLightGrey = r > 210 && g > 210 && b > 210 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
  if (isNearWhite || isLightGrey) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

const finalOutput = path.join(root, 'public', 'logo.png');
if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);
fs.renameSync(output, finalOutput);
console.log('Wrote transparent logo to', finalOutput);
