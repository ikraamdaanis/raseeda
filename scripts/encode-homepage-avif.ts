import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Writes an AVIF beside every WebP in public/home and public/templates. The
// pages offer the AVIF first and keep the WebP for browsers without AVIF; at
// this quality the AVIFs are about 40% smaller with no difference you can see
// at the size they display. Run `bun run encode:home` after replacing a picture
// or re-rendering the invoices.

const PICTURE_DIRS = ["home", "templates"].map(directory =>
  join(import.meta.dir, "..", "public", directory)
);

for (const directory of PICTURE_DIRS) {
  const files = (await readdir(directory)).filter(file =>
    file.endsWith(".webp")
  );

  for (const file of files) {
    await sharp(join(directory, file))
      .avif({ quality: 50, effort: 6 })
      .toFile(join(directory, file.replace(/\.webp$/, ".avif")));
  }
}
