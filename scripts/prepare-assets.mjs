import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
const source = process.argv[2];
if (!source) throw Error('Pass the reference frontend asset folder');
await mkdir('public/assets', { recursive: true });
for (const name of await readdir(source)) {
  if (!name.endsWith('.png')) continue;
  await sharp(source + '/' + name)
    .resize({ width: name === 'header_img.png' ? 1000 : 600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile('public/assets/' + name.replace('.png', '.webp'));
}
