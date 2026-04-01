/**
 * gutenberg-to-html.mjs
 * Converts Gutenberg plain text of Frankenstein into an HTML content fragment.
 * Usage: node scripts/gutenberg-to-html.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let raw = readFileSync(resolve(__dirname, '../source-texts/frankenstein/gutenberg-raw.txt'), 'utf-8');
// Strip BOM and normalize line endings
raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Extract content between Gutenberg markers
const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
const startIdx = raw.indexOf(startMarker);
const endIdx = raw.indexOf(endMarker);
let content = raw.slice(raw.indexOf('\n', startIdx) + 1, endIdx).trim();

// Remove the title block and table of contents (everything before "Letter 1")
const firstLetterIdx = content.indexOf('\nLetter 1\n');
content = content.slice(firstLetterIdx).trim();

// Split into sections by detecting "Letter N" or "Chapter N" at start of line
const sectionRegex = /^(Letter \d+|Chapter \d+)\s*$/m;
const lines = content.split('\n');

const sections = [];
let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(Letter \d+|Chapter \d+)$/);
  if (match) {
    if (currentSection) sections.push(currentSection);
    currentSection = { title: match[1], lines: [] };
  } else if (currentSection) {
    currentSection.lines.push(line);
  }
}
if (currentSection) sections.push(currentSection);

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
  text = text.replace(/"/g, '&ldquo;').replace(/"/g, '&rdquo;');
  text = text.replace(/'/g, '&lsquo;').replace(/'/g, '&rsquo;');
  // Em dashes
  text = text.replace(/—/g, '&mdash;');
  // En dashes
  text = text.replace(/–/g, '&ndash;');
  return text;
}

function sectionId(title) {
  return title.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Parse section lines into structured blocks: paragraphs, poetry, attributions, datelines, salutations.
 */
function parseBlocks(lines, isLetter) {
  const blocks = [];
  let i = 0;

  // Skip leading blank lines
  while (i < lines.length && lines[i].trim() === '') i++;

  // For letters, detect salutation and dateline
  if (isLetter) {
    // First non-empty line(s) may be salutation like "_To Mrs. Saville, England._"
    if (i < lines.length && lines[i].trim().startsWith('_')) {
      blocks.push({ type: 'salutation', text: lines[i].trim() });
      i++;
      while (i < lines.length && lines[i].trim() === '') i++;
    }
    // Next non-empty line is the dateline
    if (i < lines.length && /^\S/.test(lines[i].trim()) && /\d/.test(lines[i].trim())) {
      blocks.push({ type: 'dateline', text: lines[i].trim() });
      i++;
      while (i < lines.length && lines[i].trim() === '') i++;
    }
    // "My dear Sister," or similar opening
    if (i < lines.length && /^(My dear|Dear)/.test(lines[i].trim()) && lines[i].trim().length < 60) {
      blocks.push({ type: 'salutation', text: lines[i].trim() });
      i++;
      while (i < lines.length && lines[i].trim() === '') i++;
    }
  }

  // Parse rest into paragraphs and poetry blocks
  while (i < lines.length) {
    const line = lines[i];

    // Blank line - skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Poetry block: lines starting with 2+ spaces (and not just a single indented line)
    if (/^  +\S/.test(line) && !line.trim().startsWith('[')) {
      const poetryLines = [];
      while (i < lines.length && (/^  +\S/.test(lines[i]) || lines[i].trim() === '')) {
        if (lines[i].trim() === '') {
          // Check if next non-empty line is still poetry
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length && /^  +\S/.test(lines[j])) {
            poetryLines.push('');
            i++;
            continue;
          } else {
            break;
          }
        }
        poetryLines.push(lines[i].trim());
        i++;
      }
      if (poetryLines.length > 0) {
        blocks.push({ type: 'poetry', lines: poetryLines });
      }
      continue;
    }

    // Attribution line in brackets
    if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
      blocks.push({ type: 'attribution', text: line.trim() });
      i++;
      continue;
    }

    // Regular paragraph: collect lines until blank line
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^  +\S/.test(lines[i])) {
      // Stop if we hit a bracket attribution on its own line
      if (lines[i].trim().startsWith('[') && lines[i].trim().endsWith(']') && paraLines.length > 0) {
        break;
      }
      paraLines.push(lines[i].trim());
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
  const isLetter = sec.title.startsWith('Letter');
  const blocks = parseBlocks(sec.lines, isLetter);

  html += `\n    <h2 class="section-heading" id="${id}">${escapeHtml(sec.title)}</h2>\n`;
  html += `    <div class="section-body">\n`;

  let isFirstPara = true;

  for (const block of blocks) {
    switch (block.type) {
      case 'salutation':
        html += `      <p class="letter-salutation">${processInlineFormatting(escapeHtml(block.text))}</p>\n`;
        break;
      case 'dateline':
        html += `      <p class="letter-dateline">${processInlineFormatting(escapeHtml(block.text))}</p>\n`;
        break;
      case 'paragraph': {
        let cls = '';
        if (isFirstPara) {
          const startsWithLetter = /^[A-Za-z]/.test(block.text);
          const longEnough = block.text.length >= 200;
          if (startsWithLetter && longEnough) {
            cls = ' class="drop-cap"';
          }
          isFirstPara = false;
        }
        html += `      <p${cls}>${processInlineFormatting(escapeHtml(block.text))}</p>\n`;
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
      case 'attribution':
        html += `      <p class="poetry-attribution">${processInlineFormatting(escapeHtml(block.text))}</p>\n`;
        break;
    }
  }

  html += `    </div>\n`;
}

writeFileSync(resolve(__dirname, '../source-texts/frankenstein/content.html'), html, 'utf-8');
console.log(`Generated ${sections.length} sections`);
console.log('Sections:', sections.map(s => s.title).join(', '));
console.log('Output: source-texts/frankenstein/content.html');
