# Public Domain Classics

Beautiful, readable editions of public domain classic texts. Every word matches the Project Gutenberg source verbatim.

## Repository

GitHub: https://github.com/lukemade/PublicDomainClassics.com-2

## Project structure

```
source-texts/<slug>/
  gutenberg-raw.txt        — Raw downloaded Gutenberg plain text (never edit)
  content.html             — Generated HTML fragment (output of gutenberg-to-html script)

books/<slug>/
  index.html               — Full assembled page (output of build script)
  images/                  — Cover art and other images

src/
  css/document-template.css  — Shared styles for all book pages
  js/document-template.js    — Shared JS (side nav, scroll spy, breadcrumb chapter dropdown)

scripts/
  gutenberg-to-html.mjs      — Converts Gutenberg raw text → HTML content fragment
  build-<slug>-page.mjs      — Assembles head + content fragment + foot → books/<slug>/index.html
  verify-<slug>.mjs          — Verifies HTML text matches Gutenberg source word-for-word

index.html                 — Homepage (standalone, styles inlined)
vite.config.js             — Multi-page Vite build; each book page is a separate entry
```

## Dev commands

- `npm run dev` — Start Vite dev server (port 5174)
- `npm run build` — Production build to `dist/`
- `node scripts/gutenberg-to-html-<slug>.mjs` — Regenerate HTML fragment from source text
- `node scripts/build-<slug>-page.mjs` — Assemble full book page
- `node scripts/verify-<slug>.mjs` — Run accuracy verification

## Adding a new book (quick reference)

To add a new book, the user only needs to provide:
1. A **Gutenberg URL** (e.g., `https://www.gutenberg.org/ebooks/2701`)
2. A **cover image** (public domain book cover or historical illustration)

Claude will then follow the full pipeline below to generate the book page, verify accuracy, and add it to the site.

## Pipeline for a new book

Follow these steps in order. Do not skip steps.

1. **Get the source text** — Download the Gutenberg plain text file (usually at `https://www.gutenberg.org/files/<id>/<id>-0.txt`) and save it to `source-texts/<slug>/gutenberg-raw.txt`. Never edit this file. It is the canonical source of truth.

2. **Get a cover image** — Find or receive a public domain cover image. Save it to `books/<slug>/images/default.jpg`. This is used in the hero background and as the cover thumbnail.

3. **Write a conversion script** — Create `scripts/gutenberg-to-html-<slug>.mjs`. It must:
   - Strip the Gutenberg header and footer (everything outside `*** START OF THE PROJECT GUTENBERG EBOOK ***` and `*** END OF THE PROJECT GUTENBERG EBOOK ***`)
   - Strip the table of contents and title block (non-narrative content before the first chapter/letter)
   - Parse the remaining content into structured blocks: chapters/letters, paragraphs, poetry, salutations, datelines, attributions
   - Output a clean HTML fragment to `source-texts/<slug>/content.html`
   - Be deterministic: same input always produces the same output

4. **Run the conversion** — `node scripts/gutenberg-to-html-<slug>.mjs`

5. **Write a build script** — Create `scripts/build-<slug>-page.mjs`. It assembles the full page: `<head>` + nav + hero + content fragment + footer + script tags → `books/<slug>/index.html`. Model it on `build-frankenstein-page.mjs` or `build-moby-dick-page.mjs`.

6. **Run the build** — `node scripts/build-<slug>-page.mjs`

7. **Write a verification script** — Create `scripts/verify-<slug>.mjs`. See **Verification** section below for what it must check. Model it on `verify-moby-dick.mjs`.

8. **Run verification** — `node scripts/verify-<slug>.mjs`. The report must show `PASS` before the book page is considered complete. A `NEEDS_REVIEW` result means you must find and fix the discrepancies.

9. **Add to Vite config** — Add an entry to `vite.config.js` under `build.rollupOptions.input`.

10. **Add to homepage** — Add a book card to `index.html` with cover image, title, author, genre, and year. Replace a "Coming Soon" placeholder card.

## Verification (CRITICAL)

Every word in the HTML must match the Gutenberg source text. This is non-negotiable.

### What the verification script must do

The verification script compares two text sources:

**Source A — Gutenberg canonical text:**
1. Read `source-texts/<slug>/gutenberg-raw.txt`
2. Strip BOM and normalize line endings (`\r\n` → `\n`)
3. Extract content between `*** START OF THE PROJECT GUTENBERG EBOOK ***` and `*** END OF THE PROJECT GUTENBERG EBOOK ***`
4. Strip the table of contents / title block (everything before the first narrative section heading, e.g. "Letter 1" or "Chapter 1")
5. Apply text normalization (see below)

**Source B — HTML extracted text:**
1. Read `books/<slug>/index.html`
2. Remove all non-content elements: `<nav>`, `<header>`, `<footer>`, `<aside>`, `.source-banner`, `.accuracy-widget`, `<script>`, `<style>`
3. Strip all remaining HTML tags
4. Decode HTML entities back to their Unicode equivalents
5. Apply the same text normalization

**Normalization (applied identically to both sources):**
- Decode/normalize quotes: `"` `"` → `"`, `'` `'` → `'`
- Normalize dashes: `—` `–` → `-`
- Collapse all whitespace to single spaces
- Trim
- Lowercase

**Checks the script must perform:**

1. **Word count comparison** — Report total word count for both sources. A difference of more than 10 words is a hard failure.

2. **Exact word sequence diff (LCS)** — Compute the Longest Common Subsequence of the word arrays from both sources. Report:
   - Words present in source but missing from HTML (`source_only`) — these are omissions and are always errors
   - Words present in HTML but not in source (`html_only`) — these are additions and are always errors
   - Overall similarity as a percentage

3. **Section heading check** — Extract all chapter/letter headings from the Gutenberg source (lines that are exactly "Letter N" or "Chapter N"). Verify each one appears as a heading in the HTML with matching text.

4. **Pass/fail verdict** — The report's top-level `status` field must be:
   - `"PASS"` — zero omissions, zero additions, all section headings present
   - `"NEEDS_REVIEW"` — any discrepancy found

5. **Save reports** — Write `source-texts/<slug>/gutenberg-extracted.txt` (the normalized Gutenberg text), `source-texts/<slug>/html-extracted.txt` (the normalized HTML text), and `source-texts/<slug>/verification-report.json`.

### Accuracy rules when editing book HTML

- **Never paraphrase, reorder, or add words.** The text in the HTML must be verbatim from the Gutenberg source.
- **Formatting is not content.** You may wrap text in `<em>`, `<strong>`, `<p>`, `<div>`, etc. freely — these tags are stripped during verification. What matters is the text content.
- **HTML entities for special characters are fine.** `&mdash;` for —, `&ldquo;` for ", `&rsquo;` for ', etc. The verification normalizes these before comparing.
- **The content fragment (`source-texts/<slug>/content.html`) is generated.** Never hand-edit it. If the output is wrong, fix the conversion script and regenerate.
- **After any edit to the build or conversion scripts, rerun both scripts and then verification.**

### What counts as a verification failure

- Any word from the Gutenberg source missing from the HTML
- Any word in the HTML not present in the Gutenberg source
- A section heading in the Gutenberg source that is absent or renamed in the HTML
- Word count difference greater than 10 words

### What does NOT count as a failure

- Whitespace differences (all whitespace is normalized)
- Quote style differences (all quotes are normalized)
- Dash style differences (all dashes are normalized)
- Case differences (comparison is lowercased)
- HTML structural elements (nav, hero, footer) not matching — these are excluded from verification

## Coding conventions

- **Three-script pipeline per book:** `gutenberg-to-html` → `build-<slug>-page` → `verify-<slug>`. Each is a standalone Node.js ESM script (`import`/`export`, `.mjs` extension).
- **Scripts are self-contained.** They use only Node.js built-ins (`fs`, `path`, `url`). No npm dependencies for the pipeline scripts.
- **Deterministic output.** Given the same `gutenberg-raw.txt`, the conversion and build scripts must always produce byte-identical output.
- **Source text is read-only.** `gutenberg-raw.txt` is never modified by any script.
- CSS uses custom properties defined in `:root`:
  - `--bg: #faf8f4` — warm off-white page background
  - `--text: #2c2420` — dark warm brown body text
  - `--accent: #6b3a2a` — reddish-brown (drop caps, links, borders)
  - `--muted: #5a4f42`
  - `--nav-bg: #1a1510` — near-black nav and footer background
  - `--surface: #f0ece4` — slightly darker card/surface background
- Fonts (loaded from Google Fonts):
  - **Libre Baskerville** — body prose, hero meta, footer, poetry body text
  - **Cormorant Unicase** — drop caps (`.drop-cap::first-letter`), blockquotes
  - **IM Fell French Canon** — hero book title (`.hero-title`)
  - **IM Fell English SC** — hero author name, "first published" label, footer brand, salutations, datelines
  - **IM Fell DW Pica SC** — hero meta field labels (Author, Genre, Source, etc.)
  - **IM Fell English** — epigraph / blockquote italic, poetry attribution
  - **Libre Franklin** — top nav and breadcrumb UI elements
- Google Fonts link for book pages (as of Frankenstein build):
  `Libre+Baskerville:ital,wght@0,400;0,700;1,400&Cormorant+Unicase:wght@300;400;500;600;700&IM+Fell+English:ital@0;1&IM+Fell+English+SC&IM+Fell+French+Canon:ital@0;1&IM+Fell+DW+Pica+SC`
- Accessibility: skip links, ARIA labels, focus-visible outlines, WCAG AA contrast.
- New book pages must be added as entries in `vite.config.js` under `build.rollupOptions.input`.
