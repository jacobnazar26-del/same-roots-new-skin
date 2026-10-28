// Compress every photo in public/photos/**: WebP copy (max 1600px wide, under ~300 KB)
// plus a lightened JPEG fallback. Originals are backed up to photos-originals/ (git-ignored).
// Usage: npm install && npm run photos
import { readdir, stat, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join, extname, basename, dirname, relative } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'public', 'photos');
const BACKUP = join(ROOT, 'photos-originals');
const MAX_W = 1600;
const TARGET = 300 * 1024;

async function* walk(dir) {
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) yield* walk(p);
    else if (/\.(jpe?g|png)$/i.test(d.name)) yield p;
  }
}

async function encodeUnder(pipeline, format, startQ) {
  for (let q = startQ; q >= 40; q -= 6) {
    const buf = await pipeline.clone()[format]({ quality: q, effort: format === 'webp' ? 5 : undefined, mozjpeg: format === 'jpeg' ? true : undefined }).toBuffer();
    if (buf.length <= TARGET || q <= 40) return { buf, q };
  }
}

let count = 0;
for await (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const backup = join(BACKUP, rel);
  await mkdir(dirname(backup), { recursive: true });
  try { await stat(backup); } catch { await copyFile(file, backup); }

  const base = sharp(backup).rotate().resize({ width: MAX_W, withoutEnlargement: true });
  const webp = await encodeUnder(base, 'webp', 82);
  const webpPath = join(dirname(file), basename(file, extname(file)) + '.webp');
  await writeFile(webpPath, webp.buf);

  const jpg = await encodeUnder(base, 'jpeg', 80);
  await writeFile(file, jpg.buf);

  console.log(`${rel}: webp ${(webp.buf.length / 1024).toFixed(0)} KB (q${webp.q}), jpg ${(jpg.buf.length / 1024).toFixed(0)} KB (q${jpg.q})`);
  count++;
}
console.log(count ? `Done: ${count} photo(s) optimized.` : 'No photos found in public/photos/. Drop the .jpg files in first.');
