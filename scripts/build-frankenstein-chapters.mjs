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
const accentColors = ['#d4564c', '#6b5ce7', '#2eb8a6']; // red, purple-blue, turquoise
function getAccent(idx) {
  return accentColors[((idx % accentColors.length) + accentColors.length) % accentColors.length];
}

// ─── Page template ──────────────────────────────────────────

function pageHead(chapter, chapterIdx, isCover, nextChapter) {
  const plainTitle = chapter.title.replace(/&mdash;/g, '\u2014').replace(/&amp;/g, '&');
  const coverClass = isCover ? ' is-cover' : '';
  const accent = getAccent(chapterIdx);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${plainTitle} \u2014 Frankenstein \u2014 Public Domain Classics</title>
  <link rel="canonical" href="https://publicdomainclassics.com/books/frankenstein/${chapter.id}/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Unicase:wght@300;400;500;600;700&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+DW+Pica+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/document-template.css">
  <style>
    :root { --chapter-accent: ${accent}; }

    /* Drop cap uses chapter accent */
    .drop-cap::first-letter { color: #d4564c !important; }

    /* ── Site nav ── */
    .site-nav {
      position: sticky;
      top: 0;
      z-index: 200;
      background: #1a1510;
      height: 44px;
      display: flex;
      align-items: center;
      padding: 0 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .site-nav-inner {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
    }
    .site-nav-brand {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
      color: rgba(232, 223, 208, 0.35);
      text-decoration: none;
      flex-shrink: 0;
    }
    .site-nav-brand:hover { color: rgba(232, 223, 208, 0.7); }

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
      color: rgba(232, 223, 208, 0.7);
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
    }
    .book-switch:hover {
      color: #e8dfd0;
      background: rgba(255, 255, 255, 0.06);
    }
    .book-switch-icon {
      width: 16px; height: 16px;
      stroke: #d4564c; fill: none;
      stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
    }
    .book-switch-label { color: rgba(232, 223, 208, 0.45); }
    .book-switch-title { color: rgba(232, 223, 208, 0.85); }

    /* ── Library overlay (fullscreen book picker) ── */
    .library-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(26, 21, 16, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: none;
      flex-direction: column;
      overflow-y: auto;
    }
    .library-overlay.is-open { display: flex; }
    .library-overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .library-overlay-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.4rem;
      color: #e8dfd0;
    }
    .library-close {
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
    .library-close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    .library-close svg {
      width: 18px; height: 18px;
      stroke: currentColor; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }
    .library-list {
      max-width: 700px;
      margin: 0 auto;
      width: 100%;
      padding: 16px 24px 60px;
    }
    .library-card {
      display: flex;
      gap: 20px;
      padding: 20px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      text-decoration: none;
      transition: background 0.15s;
      border-radius: 6px;
      padding-left: 12px;
      padding-right: 12px;
    }
    .library-card:hover { background: rgba(255, 255, 255, 0.04); }
    .library-card.is-current {
      background: rgba(107, 58, 42, 0.15);
      border-left: 3px solid #d4564c;
    }
    .library-card-cover {
      width: 70px; height: 100px;
      object-fit: cover;
      border-radius: 3px;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.05);
    }
    .library-card-info { flex: 1; min-width: 0; }
    .library-card-title {
      font-family: 'IM Fell French Canon', serif;
      font-size: 1.1rem;
      color: #e8dfd0;
      margin-bottom: 4px;
      line-height: 1.25;
    }
    .library-card-meta {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      letter-spacing: 0.02em;
      color: rgba(196, 185, 154, 0.4);
      margin-bottom: 8px;
    }
    .library-card-desc {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      color: rgba(196, 185, 154, 0.45);
      line-height: 1.6;
    }
    .library-card-badge {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      color: #d4564c;
      margin-top: 6px;
      display: inline-block;
    }
    .library-card--placeholder .library-card-title {
      color: rgba(232, 223, 208, 0.25);
    }
    .library-card--placeholder .library-card-desc {
      color: rgba(196, 185, 154, 0.2);
    }

    /* ── Book header (static hero) ── */
    .book-header {
      background: #111;
      position: relative;
      overflow: hidden;
    }
    .book-header-bg {
      position: absolute; inset: 0;
      background: url('/books/frankenstein/images/default.jpg') center/cover no-repeat;
      opacity: 0.25;
    }
    .book-header-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(10, 8, 5, 0.7) 0%, rgba(10, 8, 5, 0.92) 100%);
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
      padding: 40px 29px 36px;
    }
    .book-header-inner .book-header-cover-wrap {
      flex: 0 0 auto;
    }
    .book-header-inner .book-header-text-wrap {
      flex: 1;
    }
    .book-header-title {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
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
      font-family: 'Libre Baskerville', serif;
      font-size: 0.75rem;
      letter-spacing: 0.02em;
      transition: font-size 0.4s ease, color 0.4s ease;
      color: rgba(232, 223, 208, 0.7);
      text-decoration: none;
      padding: 10px 16px;
      transition: color 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ch-prev { flex-shrink: 0; }
    .ch-next { flex-shrink: 0; }
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
      stroke: #d4564c; fill: none;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }
    .ch-prev[aria-disabled="true"] svg,
    .ch-next[aria-disabled="true"] svg {
      stroke: rgba(232, 223, 208, 0.15);
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
    .bottom-bar-center:hover { background: rgba(255, 255, 255, 0.06); }
    .bottom-bar-chapter {
      font-family: 'Libre Baskerville', serif;
      font-size: 0.75rem;
      letter-spacing: 0.02em;
      transition: font-size 0.4s ease, color 0.4s ease;
      color: rgba(232, 223, 208, 0.7);
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
      stroke: #d4564c; fill: none;
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

    /* Bottom bar expanded state — when user reaches end of chapter */
    .bottom-bar.is-expanded {
      height: 80px;
      background: rgba(107, 58, 42, 0.97);
      border-top-color: rgba(212, 86, 76, 0.3);
      transition: height 0.4s ease, background 0.4s ease, border-top-color 0.4s ease;
    }
    .bottom-bar.is-expanded .ch-prev,
    .bottom-bar.is-expanded .ch-next {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.85);
    }
    .bottom-bar.is-expanded .ch-prev svg,
    .bottom-bar.is-expanded .ch-next svg {
      stroke: #fff;
      width: 18px; height: 18px;
    }
    .bottom-bar.is-expanded .ch-next {
      animation: pulseNext 2s ease infinite;
    }
    @keyframes pulseNext {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .bottom-bar.is-expanded .bottom-bar-chapter {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
    }
    .bottom-bar.is-expanded .toc-icon svg {
      stroke: #fff;
    }
    .bottom-bar.is-expanded .toc-icon svg circle {
      fill: #fff;
    }


    /* ── Cover page — side-by-side ── */
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
      font-size: 0.875rem;
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
      font-family: 'Libre Baskerville', serif;
      font-size: 0.875rem;
      letter-spacing: 0.04em;
      color: rgba(196, 185, 154, 0.45);
      margin-bottom: 24px;
    }
    .book-header.is-cover .chapter-selector {
      justify-content: flex-start;
    }
    .book-header:not(.is-cover) .book-header-author {
      display: none;
    }
    .book-header:not(.is-cover) .book-header-cover {
      width: 80px;
      height: auto;
      object-fit: contain;
      border-radius: 3px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }
    .chapter-eyebrow {
      font-family: 'IM Fell DW Pica SC', serif;
      font-size: 1.1rem;
      letter-spacing: 0.1em;
      color: #d4564c;
      margin-bottom: 8px;
    }
    .book-header:not(.is-cover) .book-header-chapter {
      font-size: clamp(2.2rem, 6vw, 3.8rem);
      margin-bottom: 0;
      line-height: 1.05;
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
      .site-nav { padding: 0 0.75rem; height: 40px; }
      .book-switch { font-size: 0.6rem; padding: 4px 8px; }
      .book-switch-label { display: none; }
      .book-header-chapter { font-size: 2rem; }
      .book-header.is-cover .book-header-chapter { font-size: 1.8rem; }
      .book-header.is-cover .book-header-cover { max-width: 160px; }
      .book-header.is-cover .book-header-inner { padding: 24px 1rem 16px; }
      .ch-prev-title, .ch-next-title { display: none; }
      .bottom-bar { height: 50px; }
      .bottom-bar-chapter { display: none; }
      body { padding-bottom: 50px; }
      .chapter-bottom-nav a { font-size: 0.85rem; padding: 16px 12px; }
    }

    /* ── Sentence mode ── */
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>

  <nav class="site-nav" aria-label="Site navigation">
    <div class="site-nav-inner">
      <a href="/" class="site-nav-brand">PDC</a>
      <button class="book-switch" id="library-open" aria-label="Switch book">
        <svg class="book-switch-icon" viewBox="0 0 24 24"><rect x="2" y="4" width="4" height="16" rx="0.5"/><rect x="7" y="2" width="4" height="18" rx="0.5"/><rect x="12" y="5" width="4" height="15" rx="0.5"/><rect x="17" y="3" width="4" height="17" rx="0.5"/></svg>
        <span class="book-switch-title">Frankenstein</span>
        <svg width="10" height="10" viewBox="0 0 10 10" style="stroke: #d4564c; fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round;"><path d="M2 4l3 3 3-3"/></svg>
      </button>
      <div class="mode-dropdown" id="mode-dropdown" style="position:relative;margin-left:auto;${isCover ? 'display:none;' : ''}">
        <button class="mode-toggle" id="mode-toggle" onclick="document.getElementById('mode-dropdown').classList.toggle('is-open');event.stopPropagation();" style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:rgba(255,255,255,0.5);font-family:'Libre Baskerville',serif;font-size:0.8rem;cursor:pointer;padding:6px 10px;border-radius:4px;">
          <span>Mode: </span><span class="mode-current" id="mode-current-label">Chapter</span>
          <svg width="10" height="10" viewBox="0 0 10 10" style="stroke:rgba(255,255,255,0.4);fill:none;stroke-width:1.5;stroke-linecap:round;"><path d="M2 4l3 3 3-3"/></svg>
        </button>
        <ul class="mode-dropdown-list" style="position:absolute;top:calc(100% + 6px);right:0;min-width:180px;background:#2a2520;border:1px solid rgba(255,255,255,0.1);border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,0.5);list-style:none;margin:0;padding:6px 0;display:none;z-index:9999;">
          <li><a href="#" id="mode-scroll-btn" data-mode="scroll" class="active" style="display:block;padding:10px 16px 6px;font-family:'Libre Baskerville',serif;font-size:0.85rem;color:rgba(232,223,208,0.6);text-decoration:none;">Chapter<span style="display:block;font-size:0.7rem;color:rgba(196,185,154,0.55);margin-top:2px;">Read the full chapter with scroll</span></a></li>
          <li><a href="#" id="mode-sentence-btn" data-mode="sentence" style="display:block;padding:10px 16px 6px;font-family:'Libre Baskerville',serif;font-size:0.85rem;color:rgba(232,223,208,0.6);text-decoration:none;">Sentence<span style="display:block;font-size:0.7rem;color:rgba(196,185,154,0.55);margin-top:2px;">One sentence at a time, focused</span></a></li>
        </ul>
      </div>
      <script>
        // Inline mode dropdown — no dependency on shared JS
        (function(){
          var dd = document.getElementById('mode-dropdown');
          var list = dd.querySelector('.mode-dropdown-list');
          document.addEventListener('click', function(e) {
            if (!dd.contains(e.target)) { dd.classList.remove('is-open'); list.style.display='none'; }
          });
          // Show/hide list when is-open toggles
          new MutationObserver(function() {
            list.style.display = dd.classList.contains('is-open') ? 'block' : 'none';
          }).observe(dd, { attributes: true, attributeFilter: ['class'] });

          // Sentence mode
          var scrollBtn = document.getElementById('mode-scroll-btn');
          var sentenceBtn = document.getElementById('mode-sentence-btn');
          var label = document.getElementById('mode-current-label');
          var sentences = [], idx = 0, overlay = null;

          function extract() {
            if (sentences.length) return;
            var main = document.getElementById('main-content');
            if (!main) return;
            var ps = main.querySelectorAll('p:not(.letter-salutation):not(.letter-dateline):not(.poetry-line):not(.epigraph-attribution)');
            var txt = '';
            ps.forEach(function(p) { txt += p.textContent + ' '; });
            // Split on sentence-ending punctuation
            var raw = txt.replace(/([.!?]) +/g, '$1|||').split('|||');
            var result = [];
            raw.forEach(function(s) {
              s = s.trim();
              if (!s || s.length < 3) return;
              // Split long sentences (>200 chars) at comma boundaries
              if (s.length > 200) {
                // Split at commas, semicolons, or em-dashes
                var parts = s.split(/(, +|; +|\u2014 *)/);
                var chunk = '';
                for (var pi = 0; pi < parts.length; pi++) {
                  var p = parts[pi];
                  if (chunk.length + p.length > 180 && chunk.length > 30) {
                    result.push(chunk.trim());
                    chunk = p;
                  } else {
                    chunk += p;
                  }
                }
                if (chunk.trim()) result.push(chunk.trim());
              } else {
                result.push(s);
              }
            });
            sentences = result;
          }

          function show() {
            if (!overlay) return;
            var t = overlay.querySelector('.s-text');
            var bc = overlay.querySelector('.s-breadcrumb-pos');
            if (!t) return;
            t.style.opacity = '0';
            t.style.transition = 'none';
            setTimeout(function() {
              t.textContent = sentences[idx];
              if (bc) bc.textContent = 'Sentence ' + (idx+1) + '/' + sentences.length;
              void t.offsetWidth;
              t.style.transition = 'opacity 0.5s';
              t.style.opacity = '1';
            }, 50);
          }

          function enter(startIdx) {
            extract();
            if (!sentences.length) return;
            idx = startIdx || 0;
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#faf8f4;display:flex;flex-direction:column;';
              overlay.innerHTML = ''
                // Top bar with chapter name and X
                + '<div class="s-chrome" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid rgba(107,58,42,0.08);transition:opacity 0.4s;">'
                + '<div style="font-family:Libre Baskerville,serif;font-size:0.85rem;color:rgba(90,79,66,0.55);display:flex;align-items:center;gap:6px;">'
                + '<a href="/" style="color:rgba(90,79,66,0.55);text-decoration:none;">PDC</a>'
                + '<span style="color:rgba(90,79,66,0.3);">&rsaquo;</span>'
                + '<a href="/books/frankenstein/" style="color:rgba(90,79,66,0.55);text-decoration:none;">Frankenstein</a>'
                + '<span style="color:rgba(90,79,66,0.3);">&rsaquo;</span>'
                + '<span>${chapter.title}</span>'
                + '<span style="color:rgba(90,79,66,0.3);">&rsaquo;</span>'
                + '<span class="s-breadcrumb-pos">Sentence 1</span>'
                + '</div>'
                + '<button id="s-close" style="width:36px;height:36px;border-radius:50%;background:rgba(44,36,32,0.06);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" style="stroke:#2c2420;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
                + '</div>'
                // Content area
                + '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px 2rem;">'
                + '<div style="max-width:1200px;width:100%;text-align:left;">'
                + '<div class="s-text" style="font-family:Libre Baskerville,serif;font-size:clamp(1.6rem,4vw,2.8rem);line-height:1.55;color:#2c2420;opacity:0;transition:opacity 0.5s;"></div>'
                + '</div></div>'
                // Bottom bar with arrows and counter
                + '<div class="s-chrome" style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-top:1px solid rgba(107,58,42,0.08);transition:opacity 0.4s;">'
                + '<button id="s-prev" style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;font-family:Libre Baskerville,serif;font-size:0.85rem;color:#d4564c;padding:8px 12px;border-radius:4px;"><svg width="16" height="16" viewBox="0 0 24 24" style="stroke:#d4564c;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Previous</button>'
                + ''
                + '<div style="font-size:0.8rem;color:rgba(90,79,66,0.55);">\u2190 \u2192 keyboard</div>'
                + '<button id="s-next" style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;font-family:Libre Baskerville,serif;font-size:0.85rem;color:#d4564c;padding:8px 12px;border-radius:4px;">Next <svg width="16" height="16" viewBox="0 0 24 24" style="stroke:#d4564c;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>'
                + '</div>';
              document.body.appendChild(overlay);

              var nextChapterUrl = '${nextChapter ? '/books/frankenstein/' + nextChapter.id + '/#sentence/1' : ''}';
              var nextChapterTitle = '${nextChapter ? nextChapter.title : ''}';

              function advance() {
                if (idx >= sentences.length - 1) {
                  showNextChapter();
                } else {
                  idx++;
                  show();
                  updateHash();
                  hideNextChapter();
                }
              }

              function showNextChapter() {
                if (!nextChapterUrl) return;
                var bar = overlay.querySelector('.s-next-chapter');
                if (!bar) {
                  bar = document.createElement('div');
                  bar.className = 's-next-chapter';
                  bar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:#d4564c;padding:20px 24px;display:flex;align-items:center;justify-content:center;gap:12px;transform:translateY(100%);transition:transform 0.4s ease;cursor:pointer;';
                  bar.innerHTML = '<span style="font-family:Libre Baskerville,serif;font-size:1rem;color:#fff;">Next: ' + nextChapterTitle + '</span><svg width="18" height="18" viewBox="0 0 24 24" style="stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
                  bar.addEventListener('click', function() { window.location.href = nextChapterUrl; });
                  overlay.appendChild(bar);
                }
                setTimeout(function() { bar.style.transform = 'translateY(0)'; }, 50);
              }

              function hideNextChapter() {
                var bar = overlay.querySelector('.s-next-chapter');
                if (bar) bar.style.transform = 'translateY(100%)';
              }

              // Auto-hide controls after 3s, show on mouse move (desktop only)
              var chromeEls = overlay.querySelectorAll('.s-chrome');
              var hideTimer = null;
              var isMobile = window.matchMedia('(max-width: 768px)').matches;
              function showChrome() {
                chromeEls.forEach(function(el) { el.style.opacity = '1'; });
                clearTimeout(hideTimer);
                if (!isMobile) {
                  hideTimer = setTimeout(function() {
                    chromeEls.forEach(function(el) { el.style.opacity = '0'; });
                  }, 3000);
                }
              }
              overlay.addEventListener('mousemove', showChrome);
              overlay.addEventListener('touchstart', showChrome, {passive:true});
              showChrome();

              document.getElementById('s-close').addEventListener('click', exit);
              document.getElementById('s-prev').addEventListener('click', function() { idx = Math.max(idx-1, 0); show(); updateHash(); hideNextChapter(); showChrome(); });
              document.getElementById('s-next').addEventListener('click', function() { advance(); showChrome(); });
              // Click content area to advance
              overlay.querySelector('.s-text').parentElement.parentElement.addEventListener('click', function(e) {
                if (e.target.closest('button')) return;
                advance();
              });
            }
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            label.textContent = 'Sentence';
            dd.classList.remove('is-open');
            list.style.display = 'none';
            show();
            updateHash();
          }

          function exit() {
            if (overlay) overlay.style.display = 'none';
            document.body.style.overflow = '';
            label.textContent = 'Chapter';
            dd.classList.remove('is-open');
            list.style.display = 'none';
            // Remove sentence hash
            if (location.hash.startsWith('#sentence')) {
              history.replaceState(null, '', location.pathname);
            }
          }

          function updateHash() {
            history.replaceState(null, '', '#sentence/' + (idx + 1));
          }

          // Check URL hash on load
          if (location.hash.startsWith('#sentence/')) {
            var startIdx = Math.max((parseInt(location.hash.split('/')[1]) || 1) - 1, 0);
            setTimeout(function() { enter(startIdx); }, 100);
          }

          sentenceBtn.addEventListener('click', function(e) { e.preventDefault(); enter(); });
          scrollBtn.addEventListener('click', function(e) { e.preventDefault(); exit(); });
          document.addEventListener('keydown', function(e) {
            if (!overlay || overlay.style.display === 'none') return;
            if (e.key === 'Escape') { exit(); return; }
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advance(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); idx = Math.max(idx-1, 0); show(); updateHash(); hideNextChapter(); }
          });

          // Touch swipe
          var touchX = 0;
          document.addEventListener('touchstart', function(e) { if (overlay && overlay.style.display !== 'none') touchX = e.touches[0].clientX; }, {passive:true});
          document.addEventListener('touchend', function(e) {
            if (!overlay || overlay.style.display === 'none') return;
            var diff = e.changedTouches[0].clientX - touchX;
            if (Math.abs(diff) > 50) {
              if (diff < 0) { advance(); }
              else { idx = Math.max(idx-1, 0); show(); updateHash(); hideNextChapter(); }
            }
          }, {passive:true});
        })();
      </script>
    </div>
  </nav>`;
}

// ─── Library data (10 books, 2 real + 8 placeholder) ────────
const libraryBooks = [
  { title: 'Frankenstein; or, The Modern Prometheus', author: 'Mary Shelley', year: 1818, genre: 'Gothic Fiction', desc: 'A tale of ambition, creation, and consequence\u2014widely considered the first science fiction novel.', url: '/books/frankenstein/', cover: '/books/frankenstein/images/default.jpg', current: true },
  { title: 'Moby-Dick; or, The Whale', author: 'Herman Melville', year: 1851, genre: 'Adventure', desc: 'Captain Ahab\u2019s obsessive quest for the great white whale\u2014a towering work of American literature.', url: '/books/moby-dick/', cover: '/books/moby-dick/images/default.jpg' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', year: 1813, genre: 'Romance', desc: 'A witty exploration of love, class, and the perils of hasty judgment in Regency-era England.' },
  { title: 'Dracula', author: 'Bram Stoker', year: 1897, genre: 'Gothic Horror', desc: 'The classic vampire tale told through diaries, letters, and newspaper clippings.' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925, genre: 'Literary Fiction', desc: 'The decadence and disillusionment of the Jazz Age on Long Island.' },
  { title: 'Jane Eyre', author: 'Charlotte Bront\\u00eb', year: 1847, genre: 'Gothic Romance', desc: 'An orphan governess navigates love, independence, and dark secrets at Thornfield Hall.' },
  { title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', year: 1892, genre: 'Mystery', desc: 'Twelve tales of the world\\u2019s greatest consulting detective and his companion Dr. Watson.' },
  { title: 'A Tale of Two Cities', author: 'Charles Dickens', year: 1859, genre: 'Historical Fiction', desc: 'Paris and London during the turmoil of the French Revolution.' },
  { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', year: 1890, genre: 'Philosophical Fiction', desc: 'Beauty, corruption, and a portrait that ages so its subject never will.' },
  { title: 'Wuthering Heights', author: 'Emily Bront\\u00eb', year: 1847, genre: 'Gothic Romance', desc: 'A dark, passionate tale of obsession and revenge on the Yorkshire moors.' },
];

function libraryOverlayHtml() {
  let cards = '';
  for (const book of libraryBooks) {
    const currentClass = book.current ? ' is-current' : '';
    const placeholderClass = !book.url ? ' library-card--placeholder' : '';
    const tag = book.url ? 'a' : 'div';
    const hrefAttr = book.url ? ' href="' + book.url + '"' : '';
    const coverImg = book.cover
      ? '<img class="library-card-cover" src="' + book.cover + '" alt="" loading="lazy">'
      : '<div class="library-card-cover"></div>';
    const badge = book.current ? '<div class="library-card-badge">Currently Reading</div>' : '';
    const comingSoon = !book.url ? '<div class="library-card-badge" style="color: rgba(196,185,154,0.3);">Coming Soon</div>' : '';

    cards += '<' + tag + hrefAttr + ' class="library-card' + currentClass + placeholderClass + '">'
      + coverImg
      + '<div class="library-card-info">'
      + '<div class="library-card-title">' + book.title + '</div>'
      + '<div class="library-card-meta">' + book.author + ' \u00b7 ' + book.year + ' \u00b7 ' + book.genre + '</div>'
      + '<div class="library-card-desc">' + book.desc + '</div>'
      + badge + comingSoon
      + '</div>'
      + '</' + tag + '>';
  }
  return cards;
}

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
        <h1 class="book-header-chapter">Frankenstein;<br>or, The Modern<br>Prometheus</h1>
        <div class="book-header-author">Mary Shelley &middot; 1818</div>`;
  } else {
    // Split "Chapter N. Title" into eyebrow + large name
    // Frankenstein sections are just "Letter 1" or "Chapter 1" (no subtitle)
    // Use the full title as the large heading
    const chapterName = chapter.title;
    const eyebrowHtml = '';
    innerContent = `
      <div class="book-header-cover-wrap">
        <img class="book-header-cover" src="/books/frankenstein/images/default.jpg" alt="" loading="eager">
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
        <span class="toc-icon"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="#d4564c" stroke="none"/><circle cx="4" cy="12" r="1" fill="#d4564c" stroke="none"/><circle cx="4" cy="18" r="1" fill="#d4564c" stroke="none"/></svg></span>
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

  <!-- Library overlay (book picker) -->
  <div class="library-overlay" id="library-overlay">
    <div class="library-overlay-header">
      <div class="library-overlay-title">Library</div>
      <button class="library-close" id="library-close" aria-label="Close library">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="library-list">
      ${libraryOverlayHtml()}
    </div>
  </div>

  <script>
    (function() {
      // Bottom bar expand when near end of page
      var bottomBar = document.querySelector('.bottom-bar');
      if (bottomBar) {
        var expanded = false;
        window.addEventListener('scroll', function() {
          var scrollBottom = window.scrollY + window.innerHeight;
          var docHeight = document.documentElement.scrollHeight;
          var nearEnd = (docHeight - scrollBottom) < 300;
          if (nearEnd !== expanded) {
            expanded = nearEnd;
            bottomBar.classList.toggle('is-expanded', expanded);
          }
        }, { passive: true });
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
      // Library overlay
      var libOpen = document.getElementById('library-open');
      var libClose = document.getElementById('library-close');
      var libOverlay = document.getElementById('library-overlay');
      if (libOpen && libOverlay) {
        libOpen.addEventListener('click', function() { libOverlay.classList.add('is-open'); });
        libClose.addEventListener('click', function() { libOverlay.classList.remove('is-open'); });
        libOverlay.addEventListener('click', function(e) { if (e.target === libOverlay) libOverlay.classList.remove('is-open'); });
      }
      // Escape closes overlays and sentence mode
      // Escape closes overlays
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (tocOverlay) tocOverlay.classList.remove('is-open');
          if (libOverlay) libOverlay.classList.remove('is-open');
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
  <footer class="doc-footer">
    <div class="brand">Public Domain Classics</div>
    <p class="disclaimer">
      This text is sourced from <a href="https://www.gutenberg.org/ebooks/84">Project Gutenberg</a>
      and is in the public domain in the United States.
      <br>Formatted for readability &mdash; original text preserved verbatim.
    </p>
  </footer>
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

  const nextCh = i < chapters.length - 1 ? chapters[i + 1] : null;
  const page = pageHead(ch, i, false, nextCh) + bookHeader(ch, i, false) + `

  <main id="main-content" class="article-body">
${epigraph}
${chapterContent}
  </main>

` + pageFoot;

  writeFileSync(resolve(chapterDir, 'index.html'), page, 'utf-8');
}

console.log(`Generated ${chapters.length} chapter pages`);

// ─── Generate table of contents / landing page ──────────────
let tocItems = '';
for (let i = 0; i < chapters.length; i++) {
  const ch = chapters[i];
  tocItems += `      <li><a href="/books/frankenstein/${ch.id}/">${ch.title}</a></li>\n`;
}

const tocChapter = { id: '', title: 'Table of Contents' };

const tocPage = pageHead(tocChapter, -1, true, null) + bookHeader(tocChapter, -1, true) + `

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
