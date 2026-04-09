/**
 * Post-build script: copies chapter pages, images, and static assets
 * into dist/ so everything is deployable from a single directory.
 */

import { cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

const copies = [
  // Chapter pages (standalone HTML not in Vite build)
  { src: 'books/frankenstein/chapter-1', dest: 'books/frankenstein/chapter-1' },
  { src: 'books/frankenstein/chapter-2', dest: 'books/frankenstein/chapter-2' },
  { src: 'books/frankenstein/chapter-3', dest: 'books/frankenstein/chapter-3' },
  { src: 'books/frankenstein/chapter-4', dest: 'books/frankenstein/chapter-4' },
  { src: 'books/frankenstein/chapter-5', dest: 'books/frankenstein/chapter-5' },
  { src: 'books/frankenstein/chapter-6', dest: 'books/frankenstein/chapter-6' },
  { src: 'books/frankenstein/chapter-7', dest: 'books/frankenstein/chapter-7' },
  { src: 'books/frankenstein/chapter-8', dest: 'books/frankenstein/chapter-8' },
  { src: 'books/frankenstein/chapter-9', dest: 'books/frankenstein/chapter-9' },
  { src: 'books/frankenstein/chapter-10', dest: 'books/frankenstein/chapter-10' },
  { src: 'books/frankenstein/chapter-11', dest: 'books/frankenstein/chapter-11' },
  { src: 'books/frankenstein/chapter-12', dest: 'books/frankenstein/chapter-12' },
  { src: 'books/frankenstein/chapter-13', dest: 'books/frankenstein/chapter-13' },
  { src: 'books/frankenstein/chapter-14', dest: 'books/frankenstein/chapter-14' },
  { src: 'books/frankenstein/chapter-15', dest: 'books/frankenstein/chapter-15' },
  { src: 'books/frankenstein/chapter-16', dest: 'books/frankenstein/chapter-16' },
  { src: 'books/frankenstein/chapter-17', dest: 'books/frankenstein/chapter-17' },
  { src: 'books/frankenstein/chapter-18', dest: 'books/frankenstein/chapter-18' },
  { src: 'books/frankenstein/chapter-19', dest: 'books/frankenstein/chapter-19' },
  { src: 'books/frankenstein/chapter-20', dest: 'books/frankenstein/chapter-20' },
  { src: 'books/frankenstein/chapter-21', dest: 'books/frankenstein/chapter-21' },
  { src: 'books/frankenstein/chapter-22', dest: 'books/frankenstein/chapter-22' },
  { src: 'books/frankenstein/chapter-23', dest: 'books/frankenstein/chapter-23' },
  { src: 'books/frankenstein/chapter-24', dest: 'books/frankenstein/chapter-24' },
  { src: 'books/frankenstein/letter-1', dest: 'books/frankenstein/letter-1' },
  { src: 'books/frankenstein/letter-2', dest: 'books/frankenstein/letter-2' },
  { src: 'books/frankenstein/letter-3', dest: 'books/frankenstein/letter-3' },
  { src: 'books/frankenstein/letter-4', dest: 'books/frankenstein/letter-4' },

  // Images for book covers
  { src: 'books/frankenstein/images', dest: 'books/frankenstein/images' },
  { src: 'books/moby-dick/images', dest: 'books/moby-dick/images' },

  // Shared CSS and JS referenced by chapter pages
  { src: 'src', dest: 'src' },

  // Static assets
  { src: 'assets', dest: 'assets' },
  { src: 'favicon.svg', dest: 'favicon.svg' },
];

// Dynamically find all moby-dick chapter directories
import { readdirSync, statSync } from 'fs';
const mobyDir = resolve(root, 'books/moby-dick');
for (const entry of readdirSync(mobyDir)) {
  if (entry === 'images' || entry === 'index.html') continue;
  const full = resolve(mobyDir, entry);
  if (statSync(full).isDirectory()) {
    copies.push({ src: `books/moby-dick/${entry}`, dest: `books/moby-dick/${entry}` });
  }
}

let copied = 0;
for (const { src, dest } of copies) {
  const srcPath = resolve(root, src);
  const destPath = resolve(dist, dest);
  if (!existsSync(srcPath)) {
    console.warn(`  skip: ${src} (not found)`);
    continue;
  }
  cpSync(srcPath, destPath, { recursive: true });
  copied++;
}

console.log(`postbuild: copied ${copied} entries into dist/`);
