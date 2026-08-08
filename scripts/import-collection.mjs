import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = 'C:\\Users\\lucas\\Documents\\D3MON$\\opensea_studio\\metadata.csv';
const imagesDir = 'C:\\Users\\lucas\\Documents\\D3MON$\\opensea_studio\\images';

const publicCollectionDir = path.join(__dirname, '..', 'public', 'collection');
const dataFile = path.join(__dirname, '..', 'src', 'data', 'collection.json');

// Ensure directories exist
if (!fs.existsSync(publicCollectionDir)) {
  fs.mkdirSync(publicCollectionDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(dataFile))) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

// 1. Copy images
console.log('Copying images...');
const imageFiles = fs.readdirSync(imagesDir);
for (const file of imageFiles) {
  fs.copyFileSync(path.join(imagesDir, file), path.join(publicCollectionDir, file));
}
console.log(`Copied ${imageFiles.length} images.`);

// 2. Parse CSV to JSON
console.log('Parsing metadata...');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(l => l.trim() !== '');

const headers = lines[0].split(',').map(h => h.trim());
const metadata = [];

for (let i = 1; i < lines.length; i++) {
  // Simple CSV parse (assuming no commas inside quotes in this specific file based on preview)
  const values = lines[i].split(',').map(v => v.trim());
  const item = {};
  
  for (let j = 0; j < headers.length; j++) {
    item[headers[j]] = values[j];
  }
  
  // Clean up format
  const cleanItem = {
    id: parseInt(item.tokenID),
    name: item.name,
    image: `/collection/${item.file_name}`,
    attributes: {}
  };
  
  // Extract attributes
  for (const key of Object.keys(item)) {
    if (key.startsWith('attributes[')) {
      const attrName = key.replace('attributes[', '').replace(']', '');
      cleanItem.attributes[attrName] = item[key];
    }
  }
  
  metadata.push(cleanItem);
}

fs.writeFileSync(dataFile, JSON.stringify(metadata, null, 2));
console.log(`Saved metadata for ${metadata.length} items to src/data/collection.json.`);
