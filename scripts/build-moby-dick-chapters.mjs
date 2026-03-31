/**
 * build-moby-dick-chapters.mjs
 * Splits Moby-Dick into individual chapter pages with prev/next navigation.
 * Usage: node scripts/build-moby-dick-chapters.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, '../source-texts/moby-dick/content.html'), 'utf-8');

// ─── Parse content.html into individual sections ────────────
const sectionRegex = /<h2 class="section-heading" id="([^"]+)">([^<]+)<\/h2>\s*<div class="section-body">([\s\S]*?)<\/div>\s*(?=<h2 class="section-heading"|$)/g;

const chapters = [];
let match;
while ((match = sectionRegex.exec(content)) !== null) {
  chapters.push({
    id: match[1],
    title: match[2],
    html: match[0],
    index: chapters.length
  });
}

console.log(`Parsed ${chapters.length} chapters`);

// ─── Shared page parts ──────────────────────────────────────

function pageHead(chapter, chapterIdx) {
  // Decode HTML entities in title for <title> tag
  const plainTitle = chapter.title.replace(/&mdash;/g, '—').replace(/&amp;/g, '&');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${plainTitle} — Moby-Dick — Public Domain Classics</title>
  <link rel="canonical" href="https://publicdomainclassics.com/books/moby-dick/${chapter.id}/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Unicase:wght@300;400;500;600;700&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+DW+Pica+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/document-template.css">
  <style>
    /* Chapter page: no hero, just reading */
    .chapter-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #1a1510;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 1rem;
      gap: 0;
    }
    .chapter-nav-inner {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 1000px;
    }
    .chapter-nav-brand {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      color: rgba(232, 223, 208, 0.4);
      text-decoration: none;
      white-space: nowrap;
      margin-right: auto;
    }
    .chapter-nav-brand:hover { color: rgba(232, 223, 208, 0.7); }
    .chapter-nav-controls {
      display: flex;
      align-items: center;
      gap: 0;
      margin-left: auto;
    }
    .chapter-prev, .chapter-next {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      color: rgba(232, 223, 208, 0.6);
      text-decoration: none;
      padding: 8px 12px;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .chapter-prev:hover, .chapter-next:hover { color: #e8dfd0; }
    .chapter-prev[aria-disabled="true"],
    .chapter-next[aria-disabled="true"] {
      color: rgba(232, 223, 208, 0.15);
      pointer-events: none;
    }
    .chapter-prev svg, .chapter-next svg {
      width: 14px; height: 14px;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
      vertical-align: -2px;
    }

    /* Current chapter dropdown */
    .chapter-current {
      position: relative;
    }
    .chapter-current-btn {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      color: #e8dfd0;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      max-width: 300px;
    }
    .chapter-current-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chapter-current-progress {
      font-size: 0.6rem;
      color: rgba(232, 223, 208, 0.35);
      margin-left: 4px;
    }
    .chapter-current-caret {
      width: 12px; height: 12px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .chapter-current-caret::after {
      content: '';
      width: 6px; height: 6px;
      border-right: 1.5px solid rgba(232, 223, 208, 0.5);
      border-bottom: 1.5px solid rgba(232, 223, 208, 0.5);
      transform: rotate(45deg);
      transition: transform 0.2s;
    }
    .chapter-current[open] .chapter-current-caret::after {
      transform: rotate(-135deg);
    }
    .chapter-dropdown-list {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #2a2520;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      max-height: 70vh;
      overflow-y: auto;
      min-width: 280px;
      max-width: 400px;
      z-index: 300;
      padding: 4px 0;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
      list-style: none;
    }
    .chapter-dropdown-list a {
      display: block;
      padding: 8px 16px;
      font-family: 'Libre Baskerville', serif;
      font-size: 0.8rem;
      color: rgba(232, 223, 208, 0.7);
      text-decoration: none;
      transition: background 0.15s;
    }
    .chapter-dropdown-list a:hover { background: rgba(255, 255, 255, 0.06); }
    .chapter-dropdown-list a.active {
      color: #e8dfd0;
      background: rgba(107, 58, 42, 0.3);
    }

    /* Compact hero for chapter pages */
    .chapter-hero {
      background: #1a1510;
      padding: 36px 2rem 32px;
      position: relative;
      overflow: hidden;
    }
    .chapter-hero-bg {
      position: absolute; inset: 0;
      background: url('/books/moby-dick/images/default.jpg') center/cover no-repeat;
      z-index: 0;
    }
    .chapter-hero-overlay {
      position: absolute; inset: 0;
      background: rgba(5, 15, 25, 0.88);
      z-index: 0;
    }
    .chapter-hero-inner {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 28px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .chapter-hero-cover {
      width: 80px;
      border-radius: 3px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }
    .chapter-hero-text {
      flex: 1; min-width: 0;
    }
    .chapter-hero-book {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: rgba(196, 185, 154, 0.5);
      margin-bottom: 6px;
    }
    .chapter-hero-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.5rem;
      font-weight: 400;
      color: #e8dfd0;
      line-height: 1.25;
    }
    @media (max-width: 600px) {
      .chapter-hero { padding: 24px 1.25rem 20px; }
      .chapter-hero-cover { width: 56px; }
      .chapter-hero-title { font-size: 1.15rem; }
    }

    /* Reading area */
    .article-body {
      margin-top: 0 !important;
      border-radius: 0;
    }

    /* TOC page styles */
    .toc-section {
      background: var(--bg, #faf8f4);
      padding: 3rem 2rem 4rem;
    }
    .toc-inner { max-width: 680px; margin: 0 auto; }
    .toc-inner h2 {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.6rem; font-weight: 400;
      color: var(--text, #2c2420);
      margin-bottom: 1.5rem;
    }
    .toc-list { list-style: none; padding: 0; }
    .toc-list li { border-bottom: 1px solid rgba(107, 58, 42, 0.1); }
    .toc-list li:last-child { border-bottom: none; }
    .toc-list a {
      display: block; padding: 0.75rem 0;
      font-family: 'Libre Baskerville', serif; font-size: 0.95rem;
      color: var(--text, #2c2420); text-decoration: none; transition: color 0.2s;
    }
    .toc-list a:hover { color: var(--accent, #6b3a2a); }

    /* Bottom chapter nav — prominent and centered */
    .chapter-bottom-nav {
      display: flex;
      justify-content: center;
      align-items: stretch;
      gap: 1px;
      max-width: 780px;
      margin: 3rem auto 0;
      padding: 0;
      background: rgba(107, 58, 42, 0.12);
      border-radius: 6px;
      overflow: hidden;
    }
    .chapter-bottom-nav a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-family: 'Libre Baskerville', serif;
      font-size: 0.95rem;
      color: var(--text, #2c2420);
      text-decoration: none;
      padding: 20px 16px;
      background: var(--bg, #faf8f4);
      transition: background 0.2s, color 0.2s;
      text-align: center;
      line-height: 1.3;
    }
    .chapter-bottom-nav a:hover {
      background: var(--surface, #f0ece4);
      color: var(--accent, #6b3a2a);
    }
    .chapter-bottom-nav a[aria-disabled="true"] {
      color: rgba(90, 79, 66, 0.25);
      pointer-events: none;
    }
    .chapter-bottom-nav .nav-direction {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: rgba(90, 79, 66, 0.5);
    }
    .chapter-bottom-nav svg {
      width: 16px; height: 16px;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }

    @media (max-width: 600px) {
      .chapter-nav-brand { display: none; }
      .chapter-current-btn { max-width: 180px; font-size: 0.65rem; }
      .chapter-prev, .chapter-next { padding: 8px 8px; font-size: 0.6rem; }
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>`;
}

function chapterNav(chapter, chapterIdx) {
  const prev = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const next = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;
  const progress = Math.round(((chapterIdx + 1) / chapters.length) * 100);

  const prevLink = prev
    ? `<a class="chapter-prev" href="/books/moby-dick/${prev.id}/"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Prev</a>`
    : `<a class="chapter-prev" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Prev</a>`;

  const nextLink = next
    ? `<a class="chapter-next" href="/books/moby-dick/${next.id}/">Next <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`
    : `<a class="chapter-next" aria-disabled="true">Next <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;

  // Build chapter dropdown list
  let dropdownItems = '';
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const active = i === chapterIdx ? ' class="active"' : '';
    dropdownItems += `        <li><a${active} href="/books/moby-dick/${c.id}/">${c.title}</a></li>\n`;
  }

  return `
  <nav class="chapter-nav" aria-label="Chapter navigation">
    <div class="chapter-nav-inner">
      <a href="/books/moby-dick/" class="chapter-nav-brand">Moby-Dick</a>
      <div class="chapter-nav-controls">
        ${prevLink}
        <details class="chapter-current">
          <summary class="chapter-current-btn">
            <span class="chapter-current-label">${chapter.title}</span>
            <span class="chapter-current-progress">${progress}%</span>
            <span class="chapter-current-caret"></span>
          </summary>
          <ul class="chapter-dropdown-list">
${dropdownItems}          </ul>
        </details>
        ${nextLink}
      </div>
    </div>
  </nav>`;
}

function chapterBottomNav(chapterIdx) {
  const prev = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const next = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;

  const prevLink = prev
    ? `<a href="/books/moby-dick/${prev.id}/"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous Chapter</span>${prev.title}</a>`
    : `<a aria-disabled="true"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous Chapter</span></a>`;

  const nextLink = next
    ? `<a href="/books/moby-dick/${next.id}/"><span class="nav-direction">Next Chapter <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>${next.title}</a>`
    : `<a aria-disabled="true"><span class="nav-direction">Next Chapter <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></a>`;

  return `
    <div class="chapter-bottom-nav">
      ${prevLink}
      ${nextLink}
    </div>`;
}

const pageFoot = `
  <footer class="doc-footer">
    <div class="brand">Public Domain Classics</div>
    <p class="disclaimer">
      This text is sourced from <a href="https://www.gutenberg.org/ebooks/2701">Project Gutenberg</a>
      and is in the public domain in the United States.
      <br>Formatted for readability &mdash; original text preserved verbatim.
    </p>
  </footer>
</body>
</html>`;

// ─── Generate individual chapter pages ──────────────────────
const bookDir = resolve(__dirname, '../books/moby-dick');

for (let i = 0; i < chapters.length; i++) {
  const ch = chapters[i];
  const chapterDir = resolve(bookDir, ch.id);
  if (!existsSync(chapterDir)) mkdirSync(chapterDir, { recursive: true });

  const page = pageHead(ch, i) + chapterNav(ch, i) + `

  <header class="chapter-hero">
    <div class="chapter-hero-bg" aria-hidden="true"></div>
    <div class="chapter-hero-overlay" aria-hidden="true"></div>
    <div class="chapter-hero-inner">
      <img class="chapter-hero-cover" src="/books/moby-dick/images/default.jpg" alt="" loading="eager">
      <div class="chapter-hero-text">
        <div class="chapter-hero-book">Moby-Dick; or, The Whale &mdash; Herman Melville</div>
        <h1 class="chapter-hero-title">${ch.title}</h1>
      </div>
    </div>
  </header>

  <main id="main-content" class="article-body">
${ch.html}
${chapterBottomNav(i)}
  </main>
` + pageFoot;

  writeFileSync(resolve(chapterDir, 'index.html'), page, 'utf-8');
}

console.log(`Generated ${chapters.length} chapter pages`);

// ─── Generate table of contents / landing page ──────────────
let tocItems = '';
for (let i = 0; i < chapters.length; i++) {
  const ch = chapters[i];
  tocItems += `      <li><a href="/books/moby-dick/${ch.id}/">${ch.title}</a></li>\n`;
}

// Build the TOC nav — same chapter-nav style but with "Table of Contents" and no prev/next
let tocDropdownItems = '';
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  tocDropdownItems += `        <li><a href="/books/moby-dick/${c.id}/">${c.title}</a></li>\n`;
}

const tocPage = pageHead({ id: '', title: 'Table of Contents' }, -1) + `

  <nav class="chapter-nav" aria-label="Chapter navigation">
    <div class="chapter-nav-inner">
      <a href="/" class="chapter-nav-brand">Public Domain Classics</a>
      <div class="chapter-nav-controls">
        <a class="chapter-prev" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Prev</a>
        <details class="chapter-current">
          <summary class="chapter-current-btn">
            <span class="chapter-current-label">Table of Contents</span>
            <span class="chapter-current-caret"></span>
          </summary>
          <ul class="chapter-dropdown-list">
${tocDropdownItems}          </ul>
        </details>
        <a class="chapter-next" href="/books/moby-dick/${chapters[0].id}/">Next <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
      </div>
    </div>
  </nav>

  <header class="chapter-hero">
    <div class="chapter-hero-bg" aria-hidden="true"></div>
    <div class="chapter-hero-overlay" aria-hidden="true"></div>
    <div class="chapter-hero-inner">
      <img class="chapter-hero-cover" src="/books/moby-dick/images/default.jpg" alt="" loading="eager">
      <div class="chapter-hero-text">
        <div class="chapter-hero-book">Herman Melville &mdash; First published 1851</div>
        <h1 class="chapter-hero-title">Moby-Dick; or, The Whale</h1>
      </div>
    </div>
  </header>

  <main id="main-content" class="toc-section">
    <div class="toc-inner">
      <h2>Table of Contents</h2>
      <ul class="toc-list">
${tocItems}      </ul>
    </div>
  </main>

  <footer class="doc-footer">
    <div class="brand">Public Domain Classics</div>
    <p class="disclaimer">
      This text is sourced from <a href="https://www.gutenberg.org/ebooks/2701">Project Gutenberg</a>
      and is in the public domain in the United States.
      <br>Formatted for readability &mdash; original text preserved verbatim.
    </p>
  </footer>
</body>
</html>`;

writeFileSync(resolve(bookDir, 'index.html'), tocPage, 'utf-8');
console.log('Generated table of contents page');
console.log(`Total output: ${chapters.length + 1} files`);
