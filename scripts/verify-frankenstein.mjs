/**
 * verify-frankenstein.mjs
 * Verifies that the HTML chapter pages match the Gutenberg source word-for-word.
 * Usage: node scripts/verify-frankenstein.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Normalize text for comparison ──────────────────────────
function normalize(text) {
  return text
    .replace(/[\u201C\u201D\u201E\u201F""]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B'']/g, "'")
    .replace(/[\u2013\u2014\u2015—–]/g, '-')
    .replace(/&mdash;/g, '-').replace(/&ndash;/g, '-')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&middot;/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ─── Source A: Gutenberg canonical text ─────────────────────
console.log('Reading Gutenberg source...');
let raw = readFileSync(resolve(ROOT, 'source-texts/frankenstein/gutenberg-raw.txt'), 'utf-8');
raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
const startIdx = raw.indexOf(startMarker);
const endIdx = raw.indexOf(endMarker);
let gutenbergContent = raw.slice(raw.indexOf('\n', startIdx) + 1, endIdx).trim();

// Strip TOC and title block (everything before "Letter 1")
const firstLetterIdx = gutenbergContent.indexOf('\nLetter 1\n');
gutenbergContent = gutenbergContent.slice(firstLetterIdx).trim();

const gutenbergNorm = normalize(gutenbergContent);
const gutenbergWords = gutenbergNorm.split(' ').filter(w => w.length > 0);
console.log(`  Gutenberg: ${gutenbergWords.length} words`);

// ─── Source B: All chapter HTML pages combined ──────────────
console.log('Reading chapter pages...');
const bookDir = resolve(ROOT, 'books/frankenstein');
const dirs = readdirSync(bookDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && (d.name.startsWith('letter-') || d.name.startsWith('chapter-')))
  .sort((a, b) => {
    // Sort letters first, then chapters by number
    const getOrder = (name) => {
      if (name.startsWith('letter-')) return parseInt(name.replace('letter-', ''));
      return 100 + parseInt(name.replace('chapter-', ''));
    };
    return getOrder(a.name) - getOrder(b.name);
  });

let allHtmlText = '';
for (const dir of dirs) {
  let html = readFileSync(resolve(bookDir, dir.name, 'index.html'), 'utf-8');

  // Extract ONLY the main content area
  const mainMatch = html.match(/<main[^>]*id="main-content"[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) continue;
  html = mainMatch[1];

  // Remove non-content elements inside main
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<a[^>]*class="begin-reading[^>]*>[\s\S]*?<\/a>/gi, '');
  html = html.replace(/<div class="section-intro">[\s\S]*?<\/div>/gi, ''); // epigraph

  // Remove the section heading (it's in the hero, not content)
  // But we need to ADD it back since the Gutenberg source has it
  const headingMatch = dir.name.match(/^(letter|chapter)-(\d+)/);
  if (headingMatch) {
    const type = headingMatch[1].charAt(0).toUpperCase() + headingMatch[1].slice(1);
    const num = headingMatch[2];
    allHtmlText += type + ' ' + num + ' ';
  }

  // Strip all HTML tags
  html = html.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  html = html.replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013');
  html = html.replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D');
  html = html.replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019');
  html = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  html = html.replace(/&quot;/g, '"').replace(/&middot;/g, '\u00B7');
  html = html.replace(/&nbsp;/g, ' ').replace(/&rarr;/g, '');

  allHtmlText += html + ' ';
}

const htmlNorm = normalize(allHtmlText);
const htmlWords = htmlNorm.split(' ').filter(w => w.length > 0);
console.log(`  HTML:      ${htmlWords.length} words`);

// ─── Save extracted texts ───────────────────────────────────
writeFileSync(resolve(ROOT, 'source-texts/frankenstein/gutenberg-extracted.txt'), gutenbergNorm, 'utf-8');
writeFileSync(resolve(ROOT, 'source-texts/frankenstein/html-extracted.txt'), htmlNorm, 'utf-8');

// ─── 1. Word count comparison ───────────────────────────────
const wordCountDiff = Math.abs(gutenbergWords.length - htmlWords.length);
console.log(`\n── Word Count ──`);
console.log(`  Gutenberg: ${gutenbergWords.length}`);
console.log(`  HTML:      ${htmlWords.length}`);
console.log(`  Diff:      ${wordCountDiff}`);

// ─── 2. Sequential word comparison ──────────────────────────
console.log(`\n── Word Sequence Comparison ──`);
let ai = 0, bi = 0;
let matched = 0;
const sourceOnly = [];
const htmlOnly = [];

while (ai < gutenbergWords.length && bi < htmlWords.length) {
  if (gutenbergWords[ai] === htmlWords[bi]) {
    matched++;
    ai++;
    bi++;
  } else {
    let foundA = -1, foundB = -1;
    for (let k = 1; k <= 15; k++) {
      if (ai + k < gutenbergWords.length && gutenbergWords[ai + k] === htmlWords[bi]) { foundA = k; break; }
      if (bi + k < htmlWords.length && gutenbergWords[ai] === htmlWords[bi + k]) { foundB = k; break; }
    }
    if (foundA >= 0 && (foundB < 0 || foundA <= foundB)) {
      for (let k = 0; k < foundA; k++) {
        if (sourceOnly.length < 100) sourceOnly.push({ word: gutenbergWords[ai + k], position: ai + k });
      }
      ai += foundA;
    } else if (foundB >= 0) {
      for (let k = 0; k < foundB; k++) {
        if (htmlOnly.length < 100) htmlOnly.push({ word: htmlWords[bi + k], position: bi + k });
      }
      bi += foundB;
    } else {
      if (sourceOnly.length < 100) sourceOnly.push({ word: gutenbergWords[ai], position: ai });
      if (htmlOnly.length < 100) htmlOnly.push({ word: htmlWords[bi], position: bi });
      ai++;
      bi++;
    }
  }
}

const total = Math.max(gutenbergWords.length, htmlWords.length);
const similarity = ((matched / total) * 100).toFixed(2);

console.log(`  Matched:     ${matched}`);
console.log(`  Source only: ${sourceOnly.length} (words in Gutenberg but not HTML)`);
console.log(`  HTML only:   ${htmlOnly.length} (words in HTML but not Gutenberg)`);
console.log(`  Similarity:  ${similarity}%`);

if (sourceOnly.length > 0) {
  console.log(`\n  Sample omissions (first 20):`);
  sourceOnly.slice(0, 20).forEach(w => console.log(`    pos ${w.position}: "${w.word}"`));
}
if (htmlOnly.length > 0) {
  console.log(`\n  Sample additions (first 20):`);
  htmlOnly.slice(0, 20).forEach(w => console.log(`    pos ${w.position}: "${w.word}"`));
}

// ─── 3. Section heading check ───────────────────────────────
console.log(`\n── Section Headings ──`);
const expectedSections = [
  'Letter 1', 'Letter 2', 'Letter 3', 'Letter 4',
  ...Array.from({length: 24}, (_, i) => `Chapter ${i + 1}`)
];

const missingDirs = [];
for (const section of expectedSections) {
  const slug = section.toLowerCase().replace(/\s+/g, '-');
  const exists = dirs.some(d => d.name === slug);
  if (!exists) missingDirs.push(section);
}

console.log(`  Expected: ${expectedSections.length} sections`);
console.log(`  Found:    ${dirs.length} chapter directories`);
if (missingDirs.length === 0) {
  console.log(`  All sections present ✓`);
} else {
  console.log(`  Missing: ${missingDirs.join(', ')}`);
}

// ─── 4. Verdict ─────────────────────────────────────────────
const status = (
  sourceOnly.length === 0 &&
  htmlOnly.length === 0 &&
  missingDirs.length === 0 &&
  wordCountDiff <= 10
) ? 'PASS' : 'NEEDS_REVIEW';

console.log(`\n══════════════════════════════`);
console.log(`  STATUS: ${status}`);
console.log(`══════════════════════════════`);

if (status === 'NEEDS_REVIEW') {
  if (wordCountDiff > 10) console.log(`  ⚠ Word count difference: ${wordCountDiff}`);
  if (sourceOnly.length > 0) console.log(`  ⚠ ${sourceOnly.length} words in source but not HTML`);
  if (htmlOnly.length > 0) console.log(`  ⚠ ${htmlOnly.length} words in HTML but not source`);
  if (missingDirs.length > 0) console.log(`  ⚠ ${missingDirs.length} missing sections`);
}

// ─── 5. Save report ─────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  book: 'Frankenstein; or, The Modern Prometheus',
  author: 'Mary Shelley',
  source: 'Project Gutenberg #84',
  status,
  wordCount: { gutenberg: gutenbergWords.length, html: htmlWords.length, difference: wordCountDiff },
  sequenceDiff: { matched, sourceOnly: sourceOnly.length, htmlOnly: htmlOnly.length, similarity },
  sectionHeadings: { expected: expectedSections.length, found: dirs.length, missing: missingDirs }
};

writeFileSync(resolve(ROOT, 'source-texts/frankenstein/verification-report.json'), JSON.stringify(report, null, 2), 'utf-8');
console.log(`\nReport saved to: source-texts/frankenstein/verification-report.json`);
console.log(`Extracted texts saved to: source-texts/frankenstein/gutenberg-extracted.txt & html-extracted.txt`);
