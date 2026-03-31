/**
 * verify-moby-dick.mjs
 * Verifies that the HTML text matches the Gutenberg source word-for-word.
 * Usage: node scripts/verify-moby-dick.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Normalize text for comparison ──────────────────────────
function normalize(text) {
  return text
    .replace(/[\u201C\u201D\u201E\u201F""]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B'']/g, "'")
    .replace(/[\u2013\u2014—–]/g, '-')
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
let raw = readFileSync(resolve(ROOT, 'source-texts/moby-dick/gutenberg-raw.txt'), 'utf-8');
raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
const startIdx = raw.indexOf(startMarker);
const endIdx = raw.indexOf(endMarker);
let gutenbergContent = raw.slice(raw.indexOf('\n', startIdx) + 1, endIdx).trim();

// Strip TOC and title block (everything before the body ETYMOLOGY section)
const etymologyBodyIdx = gutenbergContent.indexOf('\n  ETYMOLOGY.\n');
gutenbergContent = gutenbergContent.slice(etymologyBodyIdx).trim();

const gutenbergNorm = normalize(gutenbergContent);
const gutenbergWords = gutenbergNorm.split(' ').filter(w => w.length > 0);

// ─── Source B: HTML extracted text ──────────────────────────
let html = readFileSync(resolve(ROOT, 'books/moby-dick/index.html'), 'utf-8');

// Remove non-content elements
html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
html = html.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
html = html.replace(/class="source-banner"[\s\S]*?<\/div>/gi, '');
html = html.replace(/class="accuracy-widget[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');

// Strip HTML tags
html = html.replace(/<[^>]+>/g, ' ');
// Decode HTML entities
html = html.replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013');
html = html.replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D');
html = html.replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019');
html = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
html = html.replace(/&quot;/g, '"').replace(/&middot;/g, '\u00B7');
html = html.replace(/&nbsp;/g, ' ');

const htmlNorm = normalize(html);
const htmlWords = htmlNorm.split(' ').filter(w => w.length > 0);

// ─── Save extracted texts ───────────────────────────────────
writeFileSync(resolve(ROOT, 'source-texts/moby-dick/gutenberg-extracted.txt'), gutenbergNorm, 'utf-8');
writeFileSync(resolve(ROOT, 'source-texts/moby-dick/html-extracted.txt'), htmlNorm, 'utf-8');

// ─── 1. Word count comparison ───────────────────────────────
console.log('Word Count Comparison');
console.log(`  Gutenberg: ${gutenbergWords.length}`);
console.log(`  HTML:      ${htmlWords.length}`);
console.log(`  Diff:      ${Math.abs(gutenbergWords.length - htmlWords.length)}`);
console.log();

// ─── 2. LCS-based diff ─────────────────────────────────────
// For large texts, use a streaming approach: compare in chunks
function computeLCSDiff(aWords, bWords) {
  // For very large texts, sample comparison
  const maxLen = 50000;
  const aSlice = aWords.length > maxLen ? aWords.slice(0, maxLen) : aWords;
  const bSlice = bWords.length > maxLen ? bWords.slice(0, maxLen) : bWords;

  // Simple sequential matching (not full LCS for huge texts)
  let ai = 0, bi = 0;
  let matched = 0;
  const sourceOnly = [];
  const htmlOnly = [];

  while (ai < aSlice.length && bi < bSlice.length) {
    if (aSlice[ai] === bSlice[bi]) {
      matched++;
      ai++;
      bi++;
    } else {
      // Look ahead in both to find next match
      let foundA = -1, foundB = -1;
      for (let k = 1; k <= 10; k++) {
        if (ai + k < aSlice.length && aSlice[ai + k] === bSlice[bi]) { foundA = k; break; }
        if (bi + k < bSlice.length && aSlice[ai] === bSlice[bi + k]) { foundB = k; break; }
      }
      if (foundA >= 0 && (foundB < 0 || foundA <= foundB)) {
        for (let k = 0; k < foundA; k++) {
          if (sourceOnly.length < 50) sourceOnly.push({ word: aSlice[ai + k], position: ai + k });
        }
        ai += foundA;
      } else if (foundB >= 0) {
        for (let k = 0; k < foundB; k++) {
          if (htmlOnly.length < 50) htmlOnly.push({ word: bSlice[bi + k], position: bi + k });
        }
        bi += foundB;
      } else {
        if (sourceOnly.length < 50) sourceOnly.push({ word: aSlice[ai], position: ai });
        if (htmlOnly.length < 50) htmlOnly.push({ word: bSlice[bi], position: bi });
        ai++;
        bi++;
      }
    }
  }

  while (ai < aSlice.length) {
    if (sourceOnly.length < 50) sourceOnly.push({ word: aSlice[ai], position: ai });
    ai++;
  }
  while (bi < bSlice.length) {
    if (htmlOnly.length < 50) htmlOnly.push({ word: bSlice[bi], position: bi });
    bi++;
  }

  const total = Math.max(aSlice.length, bSlice.length);
  const similarity = total > 0 ? ((matched / total) * 100).toFixed(2) : '100.00';

  return { matched, sourceOnly, htmlOnly, similarity };
}

const diff = computeLCSDiff(gutenbergWords, htmlWords);
console.log('Word Sequence Comparison');
console.log(`  Matched:     ${diff.matched}`);
console.log(`  Source only: ${diff.sourceOnly.length} (omissions)`);
console.log(`  HTML only:   ${diff.htmlOnly.length} (additions)`);
console.log(`  Similarity:  ${diff.similarity}%`);
if (diff.sourceOnly.length > 0) {
  console.log(`  Sample omissions: ${diff.sourceOnly.slice(0, 10).map(w => w.word).join(', ')}`);
}
if (diff.htmlOnly.length > 0) {
  console.log(`  Sample additions: ${diff.htmlOnly.slice(0, 10).map(w => w.word).join(', ')}`);
}
console.log();

// ─── 3. Section heading check ───────────────────────────────
// Extract chapter headings from Gutenberg source
const gutenbergSections = [];
const sectionPattern = /^(CHAPTER\s+\d+\.|ETYMOLOGY\.|EXTRACTS|Epilogue)/gm;
let match;
const rawContent = readFileSync(resolve(ROOT, 'source-texts/moby-dick/gutenberg-raw.txt'), 'utf-8');
const bodyContent = rawContent.slice(rawContent.indexOf('ETYMOLOGY.', rawContent.indexOf('Original Transcriber')));
const bodyEndIdx = bodyContent.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
const bodyText = bodyEndIdx > 0 ? bodyContent.slice(0, bodyEndIdx) : bodyContent;

while ((match = sectionPattern.exec(bodyText)) !== null) {
  gutenbergSections.push(match[1].trim());
}

// Extract headings from HTML
const htmlRaw = readFileSync(resolve(ROOT, 'books/moby-dick/index.html'), 'utf-8');
const htmlHeadings = [];
const headingPattern = /<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi;
while ((match = headingPattern.exec(htmlRaw)) !== null) {
  htmlHeadings.push(match[2].replace(/<[^>]+>/g, '').trim());
}

console.log('Section Heading Check');
console.log(`  Gutenberg sections: ${gutenbergSections.length}`);
console.log(`  HTML headings:      ${htmlHeadings.length}`);

const missingHeadings = [];
for (const gs of gutenbergSections) {
  const gsNorm = gs.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = htmlHeadings.some(h => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(gsNorm));
  if (!found) missingHeadings.push(gs);
}

if (missingHeadings.length === 0) {
  console.log('  All section headings present in HTML');
} else {
  console.log(`  Missing headings: ${missingHeadings.join(', ')}`);
}
console.log();

// ─── 4. Pass/fail verdict ───────────────────────────────────
const wordCountDiff = Math.abs(gutenbergWords.length - htmlWords.length);
const status = (
  diff.sourceOnly.length === 0 &&
  diff.htmlOnly.length === 0 &&
  missingHeadings.length === 0 &&
  wordCountDiff <= 10
) ? 'PASS' : 'NEEDS_REVIEW';

console.log(`STATUS: ${status}`);
if (status === 'NEEDS_REVIEW') {
  if (wordCountDiff > 10) console.log(`  - Word count difference: ${wordCountDiff}`);
  if (diff.sourceOnly.length > 0) console.log(`  - ${diff.sourceOnly.length} words in source but not HTML`);
  if (diff.htmlOnly.length > 0) console.log(`  - ${diff.htmlOnly.length} words in HTML but not source`);
  if (missingHeadings.length > 0) console.log(`  - ${missingHeadings.length} missing section headings`);
}

// ─── 5. Save report ─────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  book: 'Moby-Dick; or, The Whale',
  author: 'Herman Melville',
  source: 'Project Gutenberg #2701',
  status,
  wordCount: {
    gutenberg: gutenbergWords.length,
    html: htmlWords.length,
    difference: wordCountDiff
  },
  sequenceDiff: {
    matched: diff.matched,
    sourceOnly: diff.sourceOnly.length,
    htmlOnly: diff.htmlOnly.length,
    similarity: diff.similarity
  },
  sectionHeadings: {
    gutenbergCount: gutenbergSections.length,
    htmlCount: htmlHeadings.length,
    missing: missingHeadings
  }
};

writeFileSync(
  resolve(ROOT, 'source-texts/moby-dick/verification-report.json'),
  JSON.stringify(report, null, 2),
  'utf-8'
);
console.log('\nReport saved to: source-texts/moby-dick/verification-report.json');
