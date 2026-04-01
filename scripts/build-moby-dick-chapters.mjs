/**
 * build-moby-dick-chapters.mjs
 * Splits Moby-Dick into individual chapter pages with prev/next navigation.
 * The hero and chapter nav are combined into one element that shrinks on scroll.
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

// ─── Page template ──────────────────────────────────────────

function pageHead(chapter, chapterIdx, isCover) {
  const plainTitle = chapter.title.replace(/&mdash;/g, '\u2014').replace(/&amp;/g, '&');
  const coverClass = isCover ? ' is-cover' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${plainTitle} \u2014 Moby-Dick \u2014 Public Domain Classics</title>
  <link rel="canonical" href="https://publicdomainclassics.com/books/moby-dick/${chapter.id}/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Unicase:wght@300;400;500;600;700&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+DW+Pica+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/document-template.css">
  <style>
    /* ── Site nav (always slim, always on top) ── */
    .site-nav {
      position: sticky;
      top: 0;
      z-index: 200;
      background: #1a1510;
      height: 36px;
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .site-nav-brand {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      color: rgba(232, 223, 208, 0.4);
      text-decoration: none;
    }
    .site-nav-brand:hover { color: rgba(232, 223, 208, 0.7); }

    /* ── Book header (static hero) ── */
    .book-header {
      background: #111;
      position: relative;
      overflow: hidden;
    }
    .book-header-bg {
      position: absolute; inset: 0;
      background: url('/books/moby-dick/images/default.jpg') center/cover no-repeat;
      opacity: 0.25;
    }
    .book-header-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(10, 8, 5, 0.7) 0%, rgba(10, 8, 5, 0.92) 100%);
    }

    .book-header-inner {
      position: relative;
      z-index: 2;
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px 1.5rem 20px;
    }
    .book-header-title {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      color: rgba(196, 185, 154, 0.45);
      margin-bottom: 8px;
    }
    .book-header-chapter {
      font-family: 'IM Fell French Canon', serif;
      font-size: 3.8rem;
      font-weight: 400;
      color: #e8dfd0;
      line-height: 1.05;
      margin-bottom: 16px;
    }

    /* ── Bottom bar — sticky to bottom ── */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 500;
      background: rgba(26, 21, 16, 0.97);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 56px;
      padding: 0 1rem;
    }
    .bottom-bar-inner {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 1000px;
    }
    .ch-prev, .ch-next {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      color: rgba(232, 223, 208, 0.7);
      text-decoration: none;
      padding: 10px 16px;
      transition: color 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ch-prev { margin-right: auto; }
    .ch-next { margin-left: auto; }
    .ch-prev:hover, .ch-next:hover { color: #fff; }
    .ch-prev[aria-disabled="true"],
    .ch-next[aria-disabled="true"] {
      color: rgba(232, 223, 208, 0.15);
      pointer-events: none;
    }
    .ch-prev-title, .ch-next-title {
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .ch-prev svg, .ch-next svg {
      width: 14px; height: 14px; flex-shrink: 0;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }

    /* TOC toggle button (center of bottom bar) */
    .toc-toggle {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 40px; height: 40px;
      border-radius: 50%;
      background: rgba(107, 58, 42, 0.8);
      border: 2px solid rgba(232, 223, 208, 0.2);
      color: #e8dfd0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
    }
    .toc-toggle:hover {
      background: rgba(107, 58, 42, 1);
      transform: translateX(-50%) scale(1.1);
    }
    .toc-toggle svg {
      width: 20px; height: 20px;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }

    /* ── Fullscreen TOC overlay ── */
    .toc-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(26, 21, 16, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: none;
      flex-direction: column;
      overflow-y: auto;
    }
    .toc-overlay.is-open { display: flex; }
    .toc-overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .toc-overlay-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.2rem;
      color: #e8dfd0;
    }
    .toc-close {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      border: none;
      color: rgba(232, 223, 208, 0.7);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .toc-close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    .toc-close svg {
      width: 18px; height: 18px;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }
    .toc-overlay-list {
      list-style: none;
      padding: 12px 0;
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }
    .toc-overlay-list a {
      display: block;
      padding: 12px 24px;
      font-family: 'Libre Baskerville', serif;
      font-size: 1rem;
      color: rgba(232, 223, 208, 0.6);
      text-decoration: none;
      transition: color 0.15s, background 0.15s;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .toc-overlay-list a:hover {
      color: #e8dfd0;
      background: rgba(255, 255, 255, 0.04);
    }
    .toc-overlay-list a.active {
      color: #e8dfd0;
      background: rgba(107, 58, 42, 0.2);
      border-left: 3px solid rgba(107, 58, 42, 0.6);
    }

    /* Add bottom padding to body so content isn't hidden behind bottom bar */
    body { padding-bottom: 56px; }


    /* ── Cover page — side-by-side like Frankenstein ── */
    .book-header.is-cover .book-header-bg {
      opacity: 0.3;
    }
    .book-header.is-cover .book-header-inner {
      flex-direction: row;
      text-align: left;
      padding: 48px 2rem 44px;
      gap: 40px;
      align-items: center;
    }
    .book-header-cover-wrap {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .book-header.is-cover .book-header-cover {
      width: 100%;
      max-width: 300px;
      max-height: 400px;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .book-header.is-cover .book-header-cover:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.65);
    }
    .book-header-text-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .book-header.is-cover .book-header-title {
      font-size: 0.8rem;
      margin-bottom: 10px;
      color: rgba(196, 185, 154, 0.5);
    }
    .book-header.is-cover .book-header-chapter {
      font-family: 'IM Fell French Canon', serif;
      font-size: clamp(2rem, 4vw, 2.8rem);
      margin-bottom: 10px;
      line-height: 1.1;
      text-align: left;
    }
    .book-header-author {
      font-family: 'IM Fell English SC', serif;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      color: rgba(196, 185, 154, 0.45);
      margin-bottom: 24px;
    }
    .book-header.is-cover .chapter-selector {
      justify-content: flex-start;
    }
    .book-header:not(.is-cover) .book-header-cover-wrap,
    .book-header:not(.is-cover) .book-header-text-wrap,
    .book-header:not(.is-cover) .book-header-cover,
    .book-header:not(.is-cover) .book-header-author {
      display: none;
    }
    @media (max-width: 700px) {
      .book-header.is-cover .book-header-inner {
        flex-direction: column;
        text-align: center;
        gap: 24px;
      }
      .book-header.is-cover .book-header-cover { max-width: 200px; }
      .book-header-text-wrap { align-items: center; }
      .book-header.is-cover .book-header-chapter { text-align: center; }
      .book-header.is-cover .chapter-selector { justify-content: center; }
    }

    /* ── Reading area ── */
    .article-body {
      margin-top: 0 !important;
      border-radius: 0;
    }

    /* ── Bottom chapter nav ── */
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

    /* ── TOC page styles ── */
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

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .site-nav { padding: 0 1rem; height: 32px; }
      .book-header-chapter { font-size: 2rem; }
      .book-header.is-cover .book-header-chapter { font-size: 1.8rem; }
      .book-header.is-cover .book-header-cover { max-width: 160px; }
      .book-header.is-cover .book-header-inner { padding: 24px 1rem 16px; }
      .ch-prev-title, .ch-next-title { display: none; }
      .bottom-bar { height: 50px; }
      body { padding-bottom: 50px; }
      .chapter-bottom-nav a { font-size: 0.85rem; padding: 16px 12px; }
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>

  <nav class="site-nav" aria-label="Site navigation">
    <a href="/" class="site-nav-brand">Public Domain Classics</a>
  </nav>`;
}

function bookHeader(chapter, chapterIdx, isCover) {
  const prev = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const next = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;
  const coverClass = isCover ? ' is-cover' : '';

  // First chapter's prev goes to Cover, cover's prev is disabled
  let prevLink;
  if (isCover) {
    prevLink = `<a class="ch-prev" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">Prev</span></a>`;
  } else if (prev) {
    prevLink = `<a class="ch-prev" href="/books/moby-dick/${prev.id}/"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">${prev.title}</span></a>`;
  } else {
    prevLink = `<a class="ch-prev" href="/books/moby-dick/"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">Cover</span></a>`;
  }

  const nextLink = next
    ? `<a class="ch-next" href="/books/moby-dick/${next.id}/"><span class="ch-next-title">${next.title}</span><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`
    : `<a class="ch-next" aria-disabled="true"><span class="ch-next-title">Next</span><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;

  let dropdownItems = '';
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const active = i === chapterIdx ? ' class="active"' : '';
    dropdownItems += `      <li><a${active} href="/books/moby-dick/${c.id}/">${c.title}</a></li>\n`;
  }

  // On cover: side-by-side layout with cover image and text
  // On chapters: centered with book label + chapter title
  let innerContent;
  if (isCover) {
    innerContent = `
      <div class="book-header-cover-wrap">
        <img class="book-header-cover" src="/books/moby-dick/images/default.jpg" alt="Moby-Dick cover" loading="eager">
      </div>
      <div class="book-header-text-wrap">
        <div class="book-header-title">A Novel</div>
        <h1 class="book-header-chapter">Moby-Dick;<br>or, The Whale</h1>
        <div class="book-header-author">Herman Melville &middot; 1851</div>`;
  } else {
    innerContent = `
      <div class="book-header-title">Moby-Dick</div>
      <h1 class="book-header-chapter">${chapter.title}</h1>`;
  }

  // Close text-wrap div if cover
  const closeTextWrap = isCover ? `</div>` : '';

  return `
  <div class="book-header${coverClass}" id="book-header">
    <div class="book-header-bg" aria-hidden="true"></div>
    <div class="book-header-overlay" aria-hidden="true"></div>
    <div class="book-header-inner">
      ${innerContent}
      ${closeTextWrap}
    </div>
  </div>

  <!-- Bottom bar: prev / TOC button / next -->
  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      ${prevLink}
      <button class="toc-toggle" id="toc-open" aria-label="Open table of contents">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      ${nextLink}
    </div>
  </div>

  <!-- Fullscreen TOC overlay -->
  <div class="toc-overlay" id="toc-overlay">
    <div class="toc-overlay-header">
      <div class="toc-overlay-title">Moby-Dick &mdash; Table of Contents</div>
      <button class="toc-close" id="toc-close" aria-label="Close table of contents">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <ul class="toc-overlay-list">
      <li><a href="/books/moby-dick/"${isCover ? ' class="active"' : ''}>Cover</a></li>
${dropdownItems}    </ul>
  </div>

  <script>
    (function() {
      var openBtn = document.getElementById('toc-open');
      var closeBtn = document.getElementById('toc-close');
      var overlay = document.getElementById('toc-overlay');
      if (!openBtn || !overlay) return;
      openBtn.addEventListener('click', function() { overlay.classList.add('is-open'); });
      closeBtn.addEventListener('click', function() { overlay.classList.remove('is-open'); });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('is-open');
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') overlay.classList.remove('is-open');
      });
    })();
  </script>`;
}

function chapterBottomNav(chapterIdx) {
  const prev = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const next = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;

  // First chapter's prev goes to Cover
  let prevLink;
  if (prev) {
    prevLink = `<a href="/books/moby-dick/${prev.id}/"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous Chapter</span>${prev.title}</a>`;
  } else {
    prevLink = `<a href="/books/moby-dick/"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous</span>Cover</a>`;
  }

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

  // Strip the h2 heading from chapter content — it's already in the hero
  const chapterContent = ch.html.replace(/<h2 class="section-heading"[^>]*>[^<]*<\/h2>\s*/, '');

  const page = pageHead(ch, i, false) + bookHeader(ch, i, false) + `

  <main id="main-content" class="article-body">
${chapterContent}
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

const tocChapter = { id: '', title: 'Table of Contents' };

const tocPage = pageHead(tocChapter, -1, true) + bookHeader(tocChapter, -1, true) + `

  <main id="main-content" class="toc-section">
    <div class="toc-inner">
      <h2>Table of Contents</h2>
      <ul class="toc-list">
${tocItems}      </ul>
    </div>
  </main>
` + pageFoot;

writeFileSync(resolve(bookDir, 'index.html'), tocPage, 'utf-8');
console.log('Generated table of contents page');
console.log(`Total output: ${chapters.length + 1} files`);
