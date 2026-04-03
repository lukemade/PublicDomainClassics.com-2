/**
 * build-frankenstein-chapters.mjs
 * Splits Frankenstein into individual chapter pages with prev/next navigation.
 * The hero and chapter nav are combined into one element that shrinks on scroll.
 * Usage: node scripts/build-frankenstein-chapters.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, '../source-texts/frankenstein/content.html'), 'utf-8');

// ─── Parse content.html into individual sections ────────────
const sectionRegex = /<h2 class="section-heading" id="([^"]+)">([^<]+)<\/h2>\s*<div class="section-body\s*">([\s\S]*?)<\/div>\s*(?=<h2 class="section-heading"|$)/g;

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

// ─── Accent color cycling ───────────────────────────────────
const accentColors = ['#C25335', '#6b5ce7', '#2eb8a6']; // red, purple-blue, turquoise
function getAccent(idx) {
  return accentColors[((idx % accentColors.length) + accentColors.length) % accentColors.length];
}

// ─── Page template ──────────────────────────────────────────

function pageHead(chapter, chapterIdx, isCover) {
  const plainTitle = chapter.title.replace(/&mdash;/g, '\u2014').replace(/&amp;/g, '&');
  const coverClass = isCover ? ' is-cover' : '';
  const accent = getAccent(chapterIdx);
  const metaDesc = isCover
    ? 'Read Frankenstein by Mary Shelley online for free. The complete 1831 edition, beautifully formatted with chapter navigation. Every word verbatim from Project Gutenberg.'
    : 'Read ' + plainTitle + ' of Mary Shelley\'s Frankenstein (1831 edition) online for free. Beautifully formatted with clean typography. No ads, no signup.';
  const chapterUrl = 'https://publicdomainclassics.com/books/frankenstein/' + (chapter.id ? chapter.id + '/' : '');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': isCover ? 'Book' : 'Chapter',
    'name': isCover ? 'Frankenstein; or, The Modern Prometheus' : plainTitle,
    ...(isCover ? {} : { 'isPartOf': {
      '@type': 'Book',
      'name': 'Frankenstein; or, The Modern Prometheus',
      'author': { '@type': 'Person', 'name': 'Mary Shelley' },
      'datePublished': '1818',
      'genre': 'Gothic Fiction',
      'inLanguage': 'en',
      'url': 'https://publicdomainclassics.com/books/frankenstein/'
    }, 'position': chapterIdx + 1 }),
    ...(isCover ? {
      'author': { '@type': 'Person', 'name': 'Mary Shelley' },
      'datePublished': '1818',
      'genre': 'Gothic Fiction',
      'inLanguage': 'en',
    } : {}),
    'url': chapterUrl
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <title>${plainTitle} \u2014 Frankenstein \u2014 Public Domain Classics</title>
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${plainTitle} \u2014 Frankenstein \u2014 Public Domain Classics">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${chapterUrl}">
  <meta property="og:image" content="https://publicdomainclassics.com/books/frankenstein/images/default.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${jsonLd}</script>
  <link rel="canonical" href="${chapterUrl}">
  <!-- Cookie Consent (Consent Mode v2) -->
  <script src="/src/js/cookie-consent.js"></script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-835823373"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-835823373');
    gtag('config', 'G-X3J8M8XNSJ');
  </script>
  <!-- Event snippet for Page view conversion page -->
  <script>
    gtag('event', 'conversion', {'send_to': 'AW-835823373/67QnCKC-vJQcEI3Oxo4D'});
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@300;400;500;600;700&family=Cormorant+Unicase:wght@300;400;500;600;700&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+DW+Pica+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/document-template.css">
  <style>
    :root { --chapter-accent: ${accent}; }

    /* Fraunces for all headings */
    h1, h2, h3, .book-header-chapter, .hero-title,
    .toc-inner h2, .book-header-title {
      font-family: 'Fraunces', serif !important;
      font-optical-sizing: auto;
    }

    /* Drop cap uses chapter accent */
    .drop-cap::first-letter { color: #C25335 !important; }

    /* ── Site nav ── */
    .site-nav {
      position: sticky;
      top: 0;
      z-index: 200;
      background: #faf8f4;
      height: 64px;
      display: flex;
      align-items: center;
      padding: 10px 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .site-nav-inner {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
    }
    .site-nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .site-nav-brand:hover { opacity: 1; }
    .brand-logo {
      height: 40px;
      width: auto;
      opacity: 0.85;
      transition: opacity 0.2s;
    }
    .site-nav-brand:hover .brand-logo { opacity: 1; }
    .book-title-link {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Fraunces', serif;
      font-size: 0.8rem;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(44, 36, 32, 0.6);
      text-decoration: none;
      transition: color 0.2s;
    }
    .book-title-link:hover { color: #2c2420; }
    .brand-beta {
      position: absolute;
      right: 0;
      font-family: 'Fraunces', serif;
      font-size: 0.5rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #C25335;
      border: 1px solid rgba(194, 83, 53, 0.4);
      border-radius: 3px;
      padding: 1px 5px;
      line-height: 1.4;
    }

    /* Centered book title with library icon */
    .book-switch {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      letter-spacing: 0.02em;
      color: rgba(44, 36, 32, 0.6);
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
    }
    .book-switch:hover {
      color: #2c2420;
      background: rgba(0, 0, 0, 0.04);
    }
    .book-switch-icon {
      width: 16px; height: 16px;
      stroke: #C25335; fill: none;
      stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
    }
    .book-switch-label { color: rgba(44, 36, 32, 0.4); }
    .book-switch-title { color: rgba(44, 36, 32, 0.8); }

    /* Library overlay removed for MVP launch — saved for later */

    /* ── Book header (static hero) ── */
    .book-header {
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .book-header-bg {
      display: none;
    }
    .book-header-overlay {
      display: none;
    }
    .book-header-inner {
      position: relative;
      z-index: 2;
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      flex-direction: row;
      align-items: center;
      text-align: left;
      gap: 24px;
      padding: 120px 32px 120px;
    }
    .book-header-inner .book-header-cover-wrap {
      flex: 0 0 auto;
    }
    .book-header-inner .book-header-text-wrap {
      flex: 1;
    }
    .book-header-title {
      font-family: 'Fraunces', serif;
      font-size: 0.875rem;
      letter-spacing: 0.12em;
      color: #5a4f42;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .book-header-chapter {
      font-family: 'IM Fell French Canon', serif;
      font-size: 3.8rem;
      font-weight: 400;
      color: #2c2420;
      line-height: 1.05;
      margin-bottom: 12px;
      text-align: left;
    }

    /* ── Bottom bar — sticky to bottom ── */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 500;
      background: rgba(250, 248, 244, 0.97);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 56px;
      padding: 0 1rem;
      transition: height 0.4s ease, background 0.4s ease, border-top-color 0.4s ease;
    }
    .bottom-bar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 1000px;
      gap: 8px;
    }
    .ch-prev, .ch-next {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px; height: 36px;
      border-radius: 50%;
      background: transparent;
      text-decoration: none;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    .ch-prev:hover, .ch-next:hover {
      background: rgba(0, 0, 0, 0.06);
    }
    .ch-prev[aria-disabled="true"],
    .ch-next[aria-disabled="true"] {
      opacity: 0.2;
      pointer-events: none;
    }
    .ch-prev-title, .ch-next-title {
      display: none;
    }
    .ch-prev svg, .ch-next svg {
      width: 16px; height: 16px;
      stroke: #2c2420; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }

    /* Center of bottom bar: chapter name + colorful plus */
    .bottom-bar-center {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .bottom-bar-center:hover { background: rgba(0, 0, 0, 0.04); }
    .bottom-bar-chapter {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #2c2420;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .toc-icon {
      width: 24px; height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .bottom-bar-center:hover .toc-icon {
      transform: scale(1.15);
    }
    .toc-icon svg {
      width: 20px; height: 20px;
      stroke: #C25335; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }

    /* ── Fullscreen TOC overlay ── */
    .toc-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(250, 248, 244, 0.98);
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
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .toc-overlay-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.2rem;
      color: #2c2420;
    }
    .toc-close {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.04);
      border: none;
      color: rgba(44, 36, 32, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .toc-close:hover { background: rgba(0, 0, 0, 0.08); color: #2c2420; }
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
      color: rgba(44, 36, 32, 0.5);
      text-decoration: none;
      transition: color 0.15s, background 0.15s;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .toc-overlay-list a:hover {
      color: #2c2420;
      background: rgba(0, 0, 0, 0.03);
    }
    .toc-overlay-list a.active {
      color: #2c2420;
      background: rgba(107, 58, 42, 0.2);
      border-left: 3px solid rgba(107, 58, 42, 0.6);
    }

    /* Add bottom padding to body so content isn't hidden behind bottom bar */
    body { padding-bottom: 56px; }



    /* ── Cover page — side-by-side ── */
    .book-header.is-cover .book-header-bg {
      opacity: 0.3;
    }
    .book-header.is-cover .book-header-inner {
      flex-direction: row;
      text-align: left;
      padding: 48px 2rem 84px;
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
      font-size: 0.875rem;
      margin-bottom: 10px;
      color: #2c2420;
    }
    .book-header.is-cover .book-header-chapter {
      font-family: 'IM Fell French Canon', serif;
      font-size: clamp(2rem, 4vw, 2.8rem);
      margin-bottom: 10px;
      line-height: 1.1;
      text-align: left;
    }
    .book-header-author {
      font-family: 'Fraunces', serif;
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      color: rgba(44, 36, 32, 0.85);
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .book-header.is-cover .chapter-selector {
      justify-content: flex-start;
    }
    .begin-reading {
      display: inline-block;
      margin-top: 12px;
      font-family: 'Fraunces', serif;
      font-size: 1rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: #fff;
      background: #C25335;
      padding: 14px 32px;
      border-radius: 5px;
      text-decoration: none;
      transition: background 0.2s, transform 0.2s;
    }
    .begin-reading:hover {
      background: #a8472e;
      transform: translateY(-1px);
    }
    .book-header:not(.is-cover) .begin-reading { display: none; }
    .book-header:not(.is-cover) .book-header-author {
      display: none;
    }
    .book-header:not(.is-cover) .book-header-cover-wrap {
      position: relative;
      width: 120px;
      height: 180px;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 3px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
    .book-header:not(.is-cover) .book-header-cover {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 1.5s ease;
    }
    .book-header:not(.is-cover) .book-header-cover.is-active {
      opacity: 1;
    }
    .chapter-eyebrow {
      font-family: 'IM Fell DW Pica SC', serif;
      font-size: 1.1rem;
      letter-spacing: 0.1em;
      color: #C25335;
      margin-bottom: 8px;
    }
    .book-header:not(.is-cover) .book-header-chapter {
      font-size: clamp(2.2rem, 6vw, 3.8rem);
      margin-bottom: 0;
      line-height: 1.05;
    }
    @media (max-width: 480px) {
      .book-header.is-cover .book-header-inner {
        flex-direction: column;
        text-align: center;
        gap: 24px;
      }
      .book-header.is-cover .book-header-cover { max-width: 200px; }
      .book-header-text-wrap { align-items: flex-start; }
      .book-header.is-cover .book-header-chapter { text-align: left; }
      .book-header.is-cover .chapter-selector { justify-content: center; }
    }

    /* ── Reading area ── */
    .article-body, .toc-section {
      margin-top: 0;
      border-radius: 0;
      position: relative;
      z-index: 3;
    }
    body {
      background: #ffffff;
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
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      letter-spacing: 0.02em;
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
      max-width: 760px;
      margin-left: auto;
      margin-right: auto;
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
      .site-nav { padding: 0 0.75rem; height: 44px; }
      .site-nav-inner { flex-direction: row; align-items: center; gap: 0; }
      .brand-logo { height: 28px; }
      .brand-beta { display: none; }
      .book-title-link {
        position: static !important;
        transform: none !important;
        font-size: 0.65rem;
        margin-left: 10px;
        padding-left: 10px;
        border-left: 1px solid rgba(0, 0, 0, 0.12);
      }
      .epigraph { font-size: 0.85rem !important; }
      .epigraph-attribution { font-size: 0.75rem !important; }
      .book-switch { font-size: 0.6rem; padding: 4px 8px; }
      .book-switch-label { display: none; }
      .book-header-chapter { font-size: 1.5rem; }
      .book-header-inner { padding: 40px 16px 40px !important; gap: 16px; }
      .book-header:not(.is-cover) .book-header-cover-wrap { width: 80px; height: 120px; }
      .article-body, .toc-section { margin-top: 0 !important; border-radius: 0; max-width: 100%; }
      .book-header-title { font-size: 0.65rem; margin-bottom: 6px; }
      .book-header-author { font-size: 0.65rem; margin-bottom: 6px; }
      .book-header.is-cover .book-header-chapter { font-size: 1.8rem; }
      .book-header.is-cover .book-header-cover { max-width: 120px; }
      .book-header.is-cover .book-header-inner { padding: 24px 1rem 16px; }
      .book-header-overlay { display: none !important; }
      .ch-prev-title, .ch-next-title { display: none; }
      .bottom-bar { height: 44px; background: rgba(250, 248, 244, 0.97); border-top: 1px solid rgba(0,0,0,0.08); }
      .bottom-bar-chapter { display: inline-block; font-size: 0.65rem; max-width: 120px; }
      .ch-prev, .ch-next {
        width: auto; height: auto;
        border-radius: 0;
        background: none !important;
        padding: 8px;
      }
      .ch-prev svg, .ch-next svg { width: 18px; height: 18px; stroke: #2c2420; }
      .ch-prev:hover svg, .ch-next:hover svg { stroke: #C25335; }
      body { padding-bottom: 50px; }
      .chapter-bottom-nav a { font-size: 0.85rem; padding: 16px 12px; }
    }

    /* Epigraph override — Libre Franklin with accent border */
    .epigraph {
      font-family: 'Libre Franklin', sans-serif !important;
      font-weight: 300 !important;
      font-style: italic !important;
      font-size: 1rem !important;
      line-height: 1.7 !important;
      color: #5a4f42 !important;
      border-left: 3px solid #C25335 !important;
      padding: 16px 0 16px 20px !important;
      margin-left: 0 !important;
    }
    .epigraph-attribution {
      font-family: 'Libre Franklin', sans-serif !important;
      font-size: 0.85rem !important;
      font-weight: 400 !important;
      font-style: normal !important;
      color: #8a7e6e !important;
    }

    /* Sentence mode removed for MVP launch — saved for later */
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>

  <nav class="site-nav" aria-label="Site navigation">
    <div class="site-nav-inner">
      <a href="/" class="site-nav-brand">
        <img class="brand-logo" src="/assets/logo.svg" alt="Public Domain Classics">
      </a>
      <span class="brand-beta">Beta</span>
      <a href="/books/frankenstein/" class="book-title-link">Frankenstein</a>
    </div>
  </nav>`;
}

// ─── Library data (10 books, 2 real + 8 placeholder) ────────
// Library data removed for MVP launch — saved for later

function bookHeader(chapter, chapterIdx, isCover) {
  const prev = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const next = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;
  const coverClass = isCover ? ' is-cover' : '';
  const accent = getAccent(chapterIdx);

  // First chapter's prev goes to Cover, cover's prev is disabled
  let prevLink;
  if (isCover) {
    prevLink = `<a class="ch-prev" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">Prev</span></a>`;
  } else if (prev) {
    prevLink = `<a class="ch-prev" href="/books/frankenstein/${prev.id}/"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">${prev.title}</span></a>`;
  } else {
    prevLink = `<a class="ch-prev" href="/books/frankenstein/"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span class="ch-prev-title">Cover</span></a>`;
  }

  const nextLink = next
    ? `<a class="ch-next" href="/books/frankenstein/${next.id}/"><span class="ch-next-title">${next.title}</span><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`
    : `<a class="ch-next" aria-disabled="true"><span class="ch-next-title">Next</span><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;

  let dropdownItems = '';
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const active = i === chapterIdx ? ' class="active"' : '';
    dropdownItems += `      <li><a${active} href="/books/frankenstein/${c.id}/">${c.title}</a></li>\n`;
  }

  // On cover: side-by-side layout with cover image and text
  // On chapters: centered with book label + chapter title
  let innerContent;
  if (isCover) {
    innerContent = `
      <div class="book-header-cover-wrap">
        <img class="book-header-cover" src="/books/frankenstein/images/default.jpg" alt="Frankenstein cover" loading="eager">
      </div>
      <div class="book-header-text-wrap">
        <div class="book-header-title">A Gothic Novel</div>
        <h1 class="book-header-chapter">Frankenstein; or, The Modern Prometheus</h1>
        <div class="book-header-author">Mary Shelley &middot; 1818</div>
        <a href="/books/frankenstein/${chapters[0].id}/" class="begin-reading">Begin Reading &rarr;</a>`;
  } else {
    // Split "Chapter N. Title" into eyebrow + large name
    // Frankenstein sections are just "Letter 1" or "Chapter 1" (no subtitle)
    // Use the full title as the large heading
    const chapterName = chapter.title;
    const eyebrowHtml = '';
    innerContent = `
      <div class="book-header-cover-wrap">
        <img class="book-header-cover is-active" src="/books/frankenstein/images/default.jpg" alt="Frankenstein cover" loading="eager">
        <img class="book-header-cover" src="/books/frankenstein/images/3421default.jpg" alt="" loading="lazy">
        <img class="book-header-cover" src="/books/frankenstein/images/Frankenstein_engraved.jpg" alt="" loading="lazy">
        <img class="book-header-cover" src="/books/frankenstein/images/r23rdefault (1).jpg" alt="" loading="lazy">
      </div>
      <div class="book-header-text-wrap">
        ${eyebrowHtml}
        <h1 class="book-header-chapter">${chapterName}</h1>
      </div>`;
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

  <!-- Bottom bar: prev / chapter name + plus / next -->
  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      ${prevLink}
      <button class="bottom-bar-center" id="toc-open" aria-label="Open table of contents">
        <span class="bottom-bar-chapter">${chapter.title}</span>
        <span class="toc-icon"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="12" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="18" r="1" fill="#C25335" stroke="none"/></svg></span>
      </button>
      ${nextLink}
    </div>
  </div>

  <!-- Fullscreen TOC overlay -->
  <div class="toc-overlay" id="toc-overlay">
    <div class="toc-overlay-header">
      <div class="toc-overlay-title">Frankenstein &mdash; Table of Contents</div>
      <button class="toc-close" id="toc-close" aria-label="Close table of contents">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <ul class="toc-overlay-list">
      <li><a href="/books/frankenstein/"${isCover ? ' class="active"' : ''}>Cover</a></li>
${dropdownItems}    </ul>
  </div>

`;
}

function pageScript() {
  return `  <script>
    (function() {

      // Hide top/bottom bars on scroll down, show on scroll up or bottom 10%
      var siteNav = document.querySelector('.site-nav');
      var bottomBar = document.querySelector('.bottom-bar');
      var lastScrollY = 0;
      if (siteNav) siteNav.style.transition = 'transform 0.3s ease';
      if (bottomBar) bottomBar.style.transition += ', transform 0.3s ease';
      window.addEventListener('scroll', function() {
        var y = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var nearBottom = docHeight > 0 && y / docHeight >= 0.9;
        if (y > lastScrollY && y > 100 && !nearBottom) {
          if (siteNav) siteNav.style.transform = 'translateY(-100%)';
          if (bottomBar) bottomBar.style.transform = 'translateY(100%)';
        } else {
          if (siteNav) siteNav.style.transform = 'translateY(0)';
          if (bottomBar) bottomBar.style.transform = 'translateY(0)';
        }
        lastScrollY = y;
      }, { passive: true });

      // Cover slideshow in chapter headers
      var headerCovers = document.querySelectorAll('.book-header:not(.is-cover) .book-header-cover');
      if (headerCovers.length > 1) {
        var hci = 0;
        setInterval(function() {
          headerCovers[hci].classList.remove('is-active');
          hci = (hci + 1) % headerCovers.length;
          headerCovers[hci].classList.add('is-active');
        }, 3000);
      }

      // TOC overlay
      var tocOpen = document.getElementById('toc-open');
      var tocClose = document.getElementById('toc-close');
      var tocOverlay = document.getElementById('toc-overlay');
      if (tocOpen && tocOverlay) {
        tocOpen.addEventListener('click', function() { tocOverlay.classList.add('is-open'); });
        tocClose.addEventListener('click', function() { tocOverlay.classList.remove('is-open'); });
        tocOverlay.addEventListener('click', function(e) { if (e.target === tocOverlay) tocOverlay.classList.remove('is-open'); });
      }
      // Escape closes TOC
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (tocOverlay) tocOverlay.classList.remove('is-open');
        }
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
    prevLink = `<a href="/books/frankenstein/${prev.id}/"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous Chapter</span>${prev.title}</a>`;
  } else {
    prevLink = `<a href="/books/frankenstein/"><span class="nav-direction"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous</span>Cover</a>`;
  }

  const nextLink = next
    ? `<a href="/books/frankenstein/${next.id}/"><span class="nav-direction">Next Chapter <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>${next.title}</a>`
    : `<a aria-disabled="true"><span class="nav-direction">Next Chapter <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></a>`;

  return `
    <div class="chapter-bottom-nav">
      ${prevLink}
      ${nextLink}
    </div>`;
}

const pageFoot = `
</body>
</html>`;

// ─── Generate individual chapter pages ──────────────────────
const bookDir = resolve(__dirname, '../books/frankenstein');

for (let i = 0; i < chapters.length; i++) {
  const ch = chapters[i];
  const chapterDir = resolve(bookDir, ch.id);
  if (!existsSync(chapterDir)) mkdirSync(chapterDir, { recursive: true });

  // Strip the h2 heading from chapter content — it's already in the hero
  const chapterContent = ch.html.replace(/<h2 class="section-heading"[^>]*>[^<]*<\/h2>\s*/, '');
  const nextCh = i < chapters.length - 1 ? chapters[i + 1] : null;

  // Add epigraph before first chapter (Letter 1)
  const epigraph = i === 0 ? `
    <div class="section-intro">
      <blockquote class="epigraph">
        Did I request thee, Maker, from my clay<br>
        To mould me Man, did I solicit thee<br>
        From darkness to promote me?
        <span class="epigraph-attribution">&mdash; John Milton, <em>Paradise Lost</em> (X. 743&ndash;45)</span>
      </blockquote>
    </div>` : '';

  const page = pageHead(ch, i, false) + bookHeader(ch, i, false) + `

  <main id="main-content" class="article-body">
${epigraph}
${chapterContent}
${nextCh ? `    <div style="text-align:center;padding:3rem 0 1rem;">
      <a href="/books/frankenstein/${nextCh.id}/" class="begin-reading">Next Chapter &rarr;</a>
    </div>` : ''}
  </main>

${pageScript()}
` + pageFoot;

  writeFileSync(resolve(chapterDir, 'index.html'), page, 'utf-8');
}

console.log(`Generated ${chapters.length} chapter pages`);

// ─── Generate cover page ────────────────────────────────────
const coverChapter = { id: '', title: 'Frankenstein' };
const coverAccent = getAccent(-1);

const coverPage = pageHead(coverChapter, -1, true) + `

  <style>
    .cover-hero {
      background: #f0ece4;
      padding: 48px 2rem 72px;
    }
    .cover-hero-inner {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      gap: 48px;
      align-items: center;
    }
    .cover-hero-img {
      flex: 0 0 auto;
    }
    .cover-hero-img {
      position: relative;
      width: 220px;
      height: 330px;
    }
    .cover-hero-img img {
      position: absolute;
      top: 0; left: 0;
      width: 220px;
      border-radius: 4px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transition: opacity 1.5s ease;
    }
    .cover-hero-img img.is-active {
      opacity: 1;
    }
    .cover-hero-text {
      flex: 1;
    }
    .cover-label {
      font-family: 'Fraunces', serif;
      font-size: 0.875rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5a4f42;
      margin-bottom: 12px;
    }
    .cover-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: clamp(1.8rem, 4vw, 2.6rem);
      font-weight: 400;
      color: #2c2420;
      line-height: 1.1;
      margin-bottom: 12px;
    }
    .cover-author {
      font-family: 'Fraunces', serif;
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #5a4f42;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .author-headshot {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      border: 2px solid rgba(44, 36, 32, 0.1);
    }
    .author-headshot img {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 1.2s ease;
    }
    .author-headshot img.is-active { opacity: 1; }
    .cover-cta {
      display: inline-block;
      font-family: 'Fraunces', serif;
      font-size: 1rem;
      font-weight: 400;
      color: #fff;
      background: #C25335;
      padding: 14px 32px;
      border-radius: 5px;
      text-decoration: none;
      transition: background 0.2s, transform 0.2s;
    }
    .cover-cta:hover { background: #a8472e; transform: translateY(-1px); }

    /* Content sections */
    .cover-section {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 2rem;
      border-bottom: 1px solid rgba(107, 58, 42, 0.1);
    }
    .cover-section:last-of-type { border-bottom: none; }
    .cover-section-label {
      font-family: 'Fraunces', serif;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #C25335;
      margin-bottom: 16px;
    }
    .cover-section p {
      font-family: 'Libre Baskerville', serif;
      font-size: 1.05rem;
      line-height: 1.8;
      color: #2c2420;
      margin-bottom: 1em;
    }
    .cover-section p:last-child { margin-bottom: 0; }
    .cover-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .cover-tag {
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5a4f42;
      border: 1px solid rgba(107, 58, 42, 0.2);
      border-radius: 3px;
      padding: 4px 10px;
    }

    /* Blockquote */
    .cover-quote {
      font-family: 'Libre Franklin', sans-serif;
      font-size: clamp(1.05rem, 2.5vw, 1.25rem);
      font-weight: 300;
      font-style: italic;
      color: #5a4f42;
      line-height: 1.7;
      margin: 0 0 16px;
      padding: 16px 0 16px 24px;
      border: none;
      border-left: 4px double #C25335;
    }
    .cover-quote-attr {
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.8rem;
      font-weight: 400;
      color: #8a7e6e;
      letter-spacing: 0.02em;
    }

    /* Author bio — 67/33 split */
    .cover-bio-layout {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }
    .cover-bio-text {
      flex: 2;
    }
    .cover-bio-portrait {
      flex: 1;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    .cover-bio-portrait img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      max-height: 269px;
    }
    .cover-bio-name {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.3rem;
      color: #2c2420;
      margin-bottom: 12px;
    }
    @media (max-width: 600px) {
      .cover-bio-layout { flex-direction: column; }
    }

    /* Edition details */
    .cover-details {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .cover-detail {
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.85rem;
      font-weight: 400;
      color: #5a4f42;
      line-height: 1.6;
    }
    .cover-detail strong {
      display: block;
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #2c2420;
      margin-bottom: 4px;
    }

    /* Bottom CTA */
    /* Source citations */
    .cover-source {
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.75rem;
      font-weight: 400;
      color: #8a7e6e;
      margin-top: 16px;
      line-height: 1.6;
    }
    .cover-source a {
      color: #C25335;
      text-decoration: none;
    }
    .cover-source a:hover { text-decoration: underline; }
    .cover-ai-label {
      display: inline-block;
      font-family: 'Libre Franklin', sans-serif;
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a7e6e;
      border: 1px solid rgba(138, 126, 110, 0.3);
      border-radius: 3px;
      padding: 1px 5px;
      margin-left: 6px;
      vertical-align: middle;
    }

    .cover-bottom-cta {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 2rem 60px;
      text-align: center;
    }

    .cover-content {
      max-width: 760px;
      margin: -30px auto 0;
      border-radius: 12px 12px 0 0;
      position: relative;
      z-index: 3;
      background: #fff;
      box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.08);
    }
    @media (max-width: 600px) {
      .cover-content { margin-top: 0; border-radius: 0; max-width: 100%; box-shadow: none; }
      .cover-hero { padding: 40px 1rem 32px; }
      .cover-hero-inner { flex-direction: column; gap: 24px; align-items: flex-start; }
      .cover-hero-img { width: 140px; height: 210px; }
      .cover-hero-img img { width: 140px; }
      .cover-title { font-size: 2rem; }
      .cover-section { padding: 32px 1rem; }
      .cover-details { flex-direction: column; gap: 16px; }
    }
  </style>

  <div class="cover-hero">
    <div class="cover-hero-inner">
      <div class="cover-hero-img">
        <img src="/books/frankenstein/images/default.jpg" alt="Frankenstein book cover" class="is-active">
        <img src="/books/frankenstein/images/3421default.jpg" alt="">
        <img src="/books/frankenstein/images/Frankenstein_engraved.jpg" alt="">
        <img src="/books/frankenstein/images/r23rdefault (1).jpg" alt="">
      </div>
      <div class="cover-hero-text">
        <div class="cover-label">A Gothic Novel</div>
        <h1 class="cover-title">Frankenstein; or, The Modern Prometheus</h1>
        <div class="cover-author">
          <span class="author-headshot">
            <img src="/books/frankenstein/images/shelley-headshot.jpg" alt="Mary Shelley" class="is-active">
            <img src="/books/frankenstein/images/shelley-2.jpg" alt="">
          </span>
          Mary Shelley &middot; 1818
        </div>
        <a href="/books/frankenstein/${chapters[0].id}/" class="cover-cta">Begin Reading &rarr;</a>
      </div>
    </div>
  </div>

  <main id="main-content" class="cover-content">

    <div class="cover-section">
      <div class="cover-section-label">About</div>
      <blockquote class="cover-quote">&ldquo;An extraordinary tale, in which the author seems to us to disclose uncommon powers of poetic imagination.&rdquo;</blockquote>
      <div class="cover-quote-attr">&mdash; Sir Walter Scott, 1818</div>
      <p style="margin-top: 20px;">A young scientist, consumed by ambition, pushes the boundaries of nature and creates something he never expected. Told through letters and confessions, Shelley&rsquo;s novel asks questions about responsibility, compassion, and what it means to be human that remain unsettling two centuries later. Widely considered one of the greatest Romantic and Gothic novels, and one of the first works of science fiction ever written. First published anonymously in January 1818. Mary Shelley&rsquo;s name appeared on the revised edition of 1831.</p>
      <div class="cover-tags">
        <span class="cover-tag">Gothic Fiction</span>
        <span class="cover-tag">Science Fiction</span>
        <span class="cover-tag">Horror</span>
        <span class="cover-tag">Romantic Literature</span>
      </div>
      <div class="cover-source">Quote from Walter Scott&rsquo;s review in <em>Blackwood&rsquo;s Edinburgh Magazine</em>, March 1818. Summary <span class="cover-ai-label">AI Generated</span>. Publication facts from <a href="https://en.wikipedia.org/wiki/Frankenstein" target="_blank" rel="noopener">Wikipedia</a>. Genre categories from <a href="https://www.gutenberg.org/ebooks/84" target="_blank" rel="noopener">Project Gutenberg</a>.</div>
    </div>

    <div class="cover-section">
      <div class="cover-section-label">About the Author</div>
      <div class="cover-bio-layout">
        <div class="cover-bio-text">
          <h2 class="cover-bio-name">Mary Wollstonecraft Shelley (1797&ndash;1851)</h2>
          <p>Daughter of the philosopher William Godwin and the pioneering feminist writer Mary Wollstonecraft, who died eleven days after her birth. Mary began writing Frankenstein at the age of eighteen during a stay near Lake Geneva with Percy Bysshe Shelley, Lord Byron, and John Polidori. The novel was published anonymously two years later, when she was just twenty years old. She married the poet Percy Bysshe Shelley and continued writing novels, short stories, and biographical works throughout her life.</p>
          <div class="cover-source">Biographical facts from <a href="https://en.wikipedia.org/wiki/Mary_Shelley" target="_blank" rel="noopener">Wikipedia: Mary Shelley</a>.</div>
        </div>
        <div class="cover-bio-portrait">
          <img src="/books/frankenstein/images/RothwellMaryShelley.jpg" alt="Portrait of Mary Shelley by Richard Rothwell, 1840">
        </div>
      </div>
    </div>

    <div class="cover-section">
      <div class="cover-section-label">This Edition</div>
      <div class="cover-details">
        <div class="cover-detail"><strong>Text</strong>1831 revised edition</div>
        <div class="cover-detail"><strong>Source</strong><a href="https://www.gutenberg.org/ebooks/84" style="color: #C25335; text-decoration: none;">Project Gutenberg (#84)</a></div>
        <div class="cover-detail"><strong>Popularity</strong>176,000+ monthly downloads</div>
        <div class="cover-detail"><strong>Accuracy</strong>Every word verified verbatim</div>
      </div>
      <div class="cover-source">Download statistics from <a href="https://www.gutenberg.org/ebooks/84" target="_blank" rel="noopener">Project Gutenberg</a> (as of March 2026). Text accuracy verified using word-level diff against the original Gutenberg source.</div>
    </div>

    <div class="cover-bottom-cta">
      <a href="/books/frankenstein/${chapters[0].id}/" class="cover-cta">Begin Reading &rarr;</a>
    </div>

  </main>

  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <a class="ch-prev" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></a>
      <button class="bottom-bar-center" id="toc-open" aria-label="Open table of contents">
        <span class="bottom-bar-chapter">Cover</span>
        <span class="toc-icon"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="12" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="18" r="1" fill="#C25335" stroke="none"/></svg></span>
      </button>
      <a class="ch-next" href="/books/frankenstein/${chapters[0].id}/"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
    </div>
  </div>

${pageScript()}
  <script>
    (function() {
      // Cover image slideshow
      var imgs = document.querySelectorAll('.cover-hero-img img');
      if (imgs.length > 1) {
        var idx = 0;
        setInterval(function() {
          imgs[idx].classList.remove('is-active');
          idx = (idx + 1) % imgs.length;
          imgs[idx].classList.add('is-active');
        }, 3000);
      }
      // Author headshot slideshow
      var heads = document.querySelectorAll('.author-headshot img');
      if (heads.length > 1) {
        var hi = 0;
        setInterval(function() {
          heads[hi].classList.remove('is-active');
          hi = (hi + 1) % heads.length;
          heads[hi].classList.add('is-active');
        }, 4000);
      }
    })();
  </script>
` + pageFoot;

writeFileSync(resolve(bookDir, 'index.html'), coverPage, 'utf-8');
console.log('Generated cover page');

// ─── Generate sitemap.xml ───────────────────────────────────
const today = new Date().toISOString().split('T')[0];
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://publicdomainclassics.com/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
  <url><loc>https://publicdomainclassics.com/books/frankenstein/</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>
`;
for (const ch of chapters) {
  sitemap += `  <url><loc>https://publicdomainclassics.com/books/frankenstein/${ch.id}/</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>\n`;
}
sitemap += `</urlset>`;
writeFileSync(resolve(__dirname, '../public/sitemap.xml'), sitemap, 'utf-8');
writeFileSync(resolve(__dirname, '../dist/sitemap.xml'), sitemap, 'utf-8');
console.log('Generated sitemap.xml');

console.log(`Total output: ${chapters.length + 2} files (pages + sitemap)`);
