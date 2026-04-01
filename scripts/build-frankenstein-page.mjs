/**
 * build-frankenstein-page.mjs
 * Assembles the full Frankenstein book page from the generated content fragment.
 * Usage: node scripts/build-frankenstein-page.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, '../source-texts/frankenstein/content.html'), 'utf-8');

const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frankenstein; or, The Modern Prometheus — Public Domain Classics</title>
  <meta name="description" content="Mary Shelley's Frankenstein (1831 edition), beautifully formatted with clean typography and structured navigation.">
  <meta property="og:title" content="Frankenstein; or, The Modern Prometheus — Public Domain Classics">
  <meta property="og:description" content="Mary Shelley's groundbreaking novel, beautifully formatted for the modern reader.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://publicdomainclassics.com/books/frankenstein/">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="https://publicdomainclassics.com/books/frankenstein/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Unicase:wght@300;400;500;600;700&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+DW+Pica+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/document-template.css">
  <style>
    /* Page-specific: hero cover image, parallax bg */
    .hero {
      clip-path: inset(0);
    }
    .hero-bg-image {
      position: fixed;
      inset: 0;
      background: url('/books/frankenstein/images/default.jpg') center/cover no-repeat;
      z-index: 0;
    }
    .hero-bg-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 7, 3, 0.82);
      z-index: 0;
    }
    .hero::before { opacity: 0.2; z-index: 1; }
    .hero-inner {
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      padding: 0;
    }
    .hero-content { flex: 1; min-width: 0; padding-right: 40px; }
    .hero-thumbnail-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .hero-cover {
      display: block;
      width: 100%;
      max-width: 340px;
      max-height: calc(100vh - 200px);
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .hero-cover:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.65), 0 6px 20px rgba(0, 0, 0, 0.4);
    }
    @media (max-width: 900px) {
      .hero-content { padding-right: 0; }
      .hero-thumbnail-wrap { flex: none; }
      .hero-cover { max-width: 220px; }
    }
    @media (max-width: 600px) {
      .hero {
        padding: 32px 24px 36px !important;
      }
      .hero-content { padding-right: 0; }
      .hero-thumbnail-wrap { flex: none; }
      .hero-cover {
        width: clamp(140px, 42vw, 200px);
        max-width: none;
        max-height: none;
        border-radius: 4px;
      }
    }
  </style>
</head>
<body>

  <a href="#main-content" class="skip-link">Skip to content</a>

  <nav id="top-nav" aria-label="Main navigation">
    <div class="top-nav-inner">
      <a href="/" class="top-nav-brand">Public Domain Classics</a>
      <ol class="breadcrumb" aria-label="Breadcrumb">
        <li><a href="/">Home</a></li>
        <li><span class="breadcrumb-sep" aria-hidden="true">&rsaquo;</span></li>
        <li><span class="breadcrumb-title">Frankenstein; or, The Modern Prometheus</span></li>
        <li><span class="breadcrumb-sep" aria-hidden="true">&rsaquo;</span></li>
        <li class="breadcrumb-dropdown">
          <button id="breadcrumb-chapter" aria-expanded="false" aria-haspopup="listbox">
            <span class="breadcrumb-chapter-label">Letter 1</span>
            <span class="breadcrumb-caret" aria-hidden="true"></span>
          </button>
          <ul class="breadcrumb-dropdown-list" role="listbox"></ul>
        </li>
      </ol>
      <!-- FEATURE: Sentence-at-a-time mode (disabled for now)
      <div class="mode-dropdown" id="mode-dropdown">
        <button class="mode-toggle" id="mode-toggle">
          <span>Mode: </span><span class="mode-current">Scroll</span>
          <span class="breadcrumb-caret" aria-hidden="true"></span>
        </button>
        <ul class="mode-dropdown-list">
          <li><a href="#" data-mode="scroll" class="active">Scroll</a></li>
          <li><a href="#" data-mode="sentence">Sentence at a Time</a></li>
        </ul>
      </div>
      -->
    </div>
  </nav>

  <header class="hero">
    <div class="hero-bg-image" aria-hidden="true"></div>
    <div class="hero-bg-overlay" aria-hidden="true"></div>
    <div class="hero-line"></div>
    <div class="hero-inner">
      <div class="hero-content">
        <div class="hero-court">Mary Wollstonecraft Shelley</div>
        <h1 class="hero-title">Frankenstein;<br>or, The Modern<br>Prometheus</h1>
        <div class="hero-label">First published 1818 &middot; Revised edition 1831</div>
      </div>
      <div class="hero-thumbnail-wrap">
        <img class="hero-cover" src="/books/frankenstein/images/default.jpg" alt="Frankenstein book cover, Lion Books 1953 edition" loading="eager">
      </div>
    </div>
  </header>

  <main id="main-content" class="article-body">
    <div class="section-intro">
      <blockquote class="epigraph">
        Did I request thee, Maker, from my clay<br>
        To mould me Man, did I solicit thee<br>
        From darkness to promote me?
        <span class="epigraph-attribution">&mdash; John Milton, <em>Paradise Lost</em> (X. 743&ndash;45)</span>
      </blockquote>
    </div>
`;

const foot = `
  </main>

  <footer class="doc-footer">
    <div class="brand">Public Domain Classics</div>
    <p class="disclaimer">
      This text is sourced from <a href="https://www.gutenberg.org/ebooks/84">Project Gutenberg</a>
      and is in the public domain in the United States.
      <br>Formatted for readability &mdash; original text preserved verbatim.
    </p>
  </footer>

  <script type="module" src="/src/js/document-template.js"></script>
</body>
</html>`;

const page = head + content + foot;
writeFileSync(resolve(__dirname, '../books/frankenstein/index.html'), page, 'utf-8');
console.log('Built books/frankenstein/index.html');
console.log('Size:', (Buffer.byteLength(page) / 1024).toFixed(0), 'KB');
