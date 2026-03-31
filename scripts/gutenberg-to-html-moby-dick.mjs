/**
 * gutenberg-to-html-moby-dick.mjs
 * Converts Gutenberg plain text of Moby-Dick into an HTML content fragment.
 * Usage: node scripts/gutenberg-to-html-moby-dick.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let raw = readFileSync(resolve(__dirname, '../source-texts/moby-dick/gutenberg-raw.txt'), 'utf-8');
// Strip BOM and normalize line endings
raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Extract content between Gutenberg markers
const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
const startIdx = raw.indexOf(startMarker);
const endIdx = raw.indexOf(endMarker);
let content = raw.slice(raw.indexOf('\n', startIdx) + 1, endIdx).trim();

// Strip the table of contents and title block.
// The TOC runs from the start to just before the ETYMOLOGY section in the body.
// The body starts with indented "  ETYMOLOGY." after the "Original Transcriber's Notes" block.
// Find the actual ETYMOLOGY section (the one with indented content after the TOC)
const etymologyBodyIdx = content.indexOf('\n  ETYMOLOGY.\n');
content = content.slice(etymologyBodyIdx).trim();

// Split into sections: ETYMOLOGY, EXTRACTS, CHAPTER N. Title, Epilogue
const lines = content.split('\n');
const sections = [];
let currentSection = null;

// Section heading patterns for Moby Dick
function detectHeading(line) {
  const trimmed = line.trim();
  // ETYMOLOGY.
  if (/^ETYMOLOGY\.?$/i.test(trimmed)) return 'Etymology';
  // EXTRACTS. or EXTRACTS (...)
  if (/^EXTRACTS[\s.(]/i.test(trimmed) || /^EXTRACTS\.?$/i.test(trimmed)) return 'Extracts';
  // CHAPTER N. Title (may span multiple lines if title is long)
  const chapterMatch = trimmed.match(/^CHAPTER\s+(\d+)\.\s+(.+)/i);
  if (chapterMatch) return `Chapter ${chapterMatch[1]}. ${chapterMatch[2]}`;
  // Epilogue
  if (/^Epilogue$/i.test(trimmed)) return 'Epilogue';
  return null;
}

for (let i = 0; i < lines.length; i++) {
  const heading = detectHeading(lines[i]);
  if (heading) {
    if (currentSection) sections.push(currentSection);
    // Check if the next line continues a chapter title (for multi-line titles)
    let title = heading;
    if (heading.startsWith('Chapter') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      // If next line is non-empty and not a blank line, it continues the title
      if (nextLine && !detectHeading(lines[i + 1]) && !nextLine.startsWith('(')) {
        title = heading + ' ' + nextLine;
        i++; // skip the continuation line
      }
    }
    currentSection = { title, lines: [] };
  } else if (currentSection) {
    currentSection.lines.push(lines[i]);
  }
}
if (currentSection) sections.push(currentSection);

// The Etymology and Extracts sections are entirely indented with 2 spaces
// in the Gutenberg source. Strip this indentation so prose isn't treated as poetry.
for (const sec of sections) {
  if (sec.title === 'Etymology' || sec.title === 'Extracts') {
    sec.lines = sec.lines.map(line => line.replace(/^  /, ''));
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInlineFormatting(text) {
  // Convert _text_ to <em>text</em>
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Convert curly quotes
  text = text.replace(/\u201C/g, '&ldquo;').replace(/\u201D/g, '&rdquo;');
  text = text.replace(/\u2018/g, '&lsquo;').replace(/\u2019/g, '&rsquo;');
  // Straight quotes to smart quotes (basic heuristic)
  text = text.replace(/"([^"]*?)"/g, '&ldquo;$1&rdquo;');
  // Em dashes
  text = text.replace(/\u2014/g, '&mdash;');
  text = text.replace(/--/g, '&mdash;');
  // En dashes
  text = text.replace(/\u2013/g, '&ndash;');
  return text;
}

function sectionId(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse section lines into structured blocks: paragraphs, poetry, attributions.
 */
function parseBlocks(sectionLines) {
  const blocks = [];
  let i = 0;

  // Skip leading blank lines
  while (i < sectionLines.length && sectionLines[i].trim() === '') i++;

  while (i < sectionLines.length) {
    const line = sectionLines[i];

    // Blank line - skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Poetry/indented block: lines starting with 2+ spaces
    if (/^  +\S/.test(line)) {
      const poetryLines = [];
      while (i < sectionLines.length && (/^  +\S/.test(sectionLines[i]) || sectionLines[i].trim() === '')) {
        if (sectionLines[i].trim() === '') {
          let j = i + 1;
          while (j < sectionLines.length && sectionLines[j].trim() === '') j++;
          if (j < sectionLines.length && /^  +\S/.test(sectionLines[j])) {
            poetryLines.push('');
            i++;
            continue;
          } else {
            break;
          }
        }
        poetryLines.push(sectionLines[i].trim());
        i++;
      }
      if (poetryLines.length > 0) {
        blocks.push({ type: 'poetry', lines: poetryLines });
      }
      continue;
    }

    // Regular paragraph: collect lines until blank line or indented block
    const paraLines = [];
    while (i < sectionLines.length && sectionLines[i].trim() !== '' && !/^  +\S/.test(sectionLines[i])) {
      paraLines.push(sectionLines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
  }

  return blocks;
}

// Build HTML
let html = '';

for (let s = 0; s < sections.length; s++) {
  const sec = sections[s];
  const id = sectionId(sec.title);
  const blocks = parseBlocks(sec.lines);

  html += `\n    <h2 class="section-heading" id="${id}">${escapeHtml(sec.title)}</h2>\n`;
  html += `    <div class="section-body">\n`;

  let isFirstPara = true;

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph': {
        const cls = isFirstPara ? ' class="drop-cap"' : '';
        html += `      <p${cls}>${processInlineFormatting(escapeHtml(block.text))}</p>\n`;
        isFirstPara = false;
        break;
      }
      case 'poetry':
        html += `      <div class="poetry-block">\n`;
        for (const pl of block.lines) {
          if (pl === '') {
            html += `        <br>\n`;
          } else {
            html += `        <p class="poetry-line">${processInlineFormatting(escapeHtml(pl))}</p>\n`;
          }
        }
        html += `      </div>\n`;
        break;
    }
  }

  html += `    </div>\n`;
}

writeFileSync(resolve(__dirname, '../source-texts/moby-dick/content.html'), html, 'utf-8');
console.log(`Generated ${sections.length} sections`);
console.log('Sections:', sections.map(s => s.title).join(', '));
console.log('Output: source-texts/moby-dick/content.html');
