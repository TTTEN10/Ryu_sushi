import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const IMAGES_DIR = join(process.cwd(), 'public', 'images');
const DIST_DIR = join(process.cwd(), 'dist', 'images');

const SUPPORTED = ['.png', '.jpg', '.jpeg', '.webp'];

async function optimizeImage(file) {
  const ext = extname(file).toLowerCase();
  const inputPath = join(IMAGES_DIR, file);
  const outputPath = join(DIST_DIR, file);

  const { size: originalSize } = await stat(inputPath);

  let pipeline = sharp(inputPath);

  // Compress PNG
  if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true, colors: 128 });
  }
  // Compress JPG
  else if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
  }
  // Already WebP or other — just pass through
  else {
    return;
  }

  const { data } = await pipeline.toBuffer({ resolveWithObject: true });

  // Only write if smaller (or first time)
  if (data.length < originalSize || !(await stat(outputPath).catch(() => null))) {
    await sharp(data).toFile(outputPath);
    const saved = ((1 - data.length / originalSize) * 100).toFixed(1);
    console.log(`  ${file}: ${originalSize / 1024 | 0}KB → ${data.length / 1024 | 0}KB (${saved}% smaller)`);
  } else {
    console.log(`  ${file}: ${originalSize / 1024 | 0}KB → ${data.length / 1024 | 0}KB (${((1 - data.length / originalSize) * 100).toFixed(1)}%) — skipped`);
  }
}

async function main() {
  console.log('Optimizing images…');
  const files = await readdir(IMAGES_DIR);
  const images = files.filter(f => SUPPORTED.includes(extname(f).toLowerCase()));
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of images) {
    const { size } = await stat(join(IMAGES_DIR, file));
    totalBefore += size;
  }

  for (const file of images) {
    try {
      await optimizeImage(file);
    } catch (err) {
      console.error(`  Error optimizing ${file}:`, err.message);
    }
  }

  for (const file of images) {
    const s = await stat(join(DIST_DIR, file)).catch(() => ({ size: 0 }));
    totalAfter += s.size;
  }

  const totalSaved = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`Done: ${images.length} images, ${totalBefore / 1024 / 1024 | 1}MB → ${totalAfter / 1024 / 1024 | 1}MB (${totalSaved}% smaller)`);
}

main().catch(console.error);
