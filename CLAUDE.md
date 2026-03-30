# Gorgeous Docs

Public documents in the news (court opinions, indictments, government reports), converted into readable, searchable HTML.

## Project structure

- `index.html` — Homepage (standalone, styles inlined)
- `docs/<slug>/index.html` — Individual document pages (e.g. `docs/aap-v-kennedy/`)
- `src/css/document-template.css` — Shared styles for document pages
- `src/js/document-template.js` — Shared JS for document pages (side nav, scroll spy, accordion)
- `source-docs/` — Original PDFs and extracted text used as source material
- `scripts/` — Verification tooling (e.g. `verify-accuracy.mjs` compares HTML against source PDFs)
- `vite.config.js` — Multi-page Vite build; each document page is a separate entry

## Dev commands

- `npm run dev` — Start Vite dev server (port 5174 via launch.json)
- `npm run build` — Production build to `dist/`
- `node scripts/verify-accuracy.mjs` — Compare HTML output against source PDF text

## Document accuracy (CRITICAL)

Every word in the HTML must match the source PDF. This is non-negotiable — these are legal documents where a missing word or changed phrase can change the meaning.

### Pipeline for new documents

1. **Source PDF** — Place the original PDF in `source-docs/<slug>.pdf`.
2. **Extract text** — Run `python scripts/verify-accuracy.py` (uses `pdfplumber`) or `node scripts/verify-accuracy.mjs` (uses `pdf-parse`). Both extract text from the PDF and save it to `source-docs/<slug>-extracted.txt`.
3. **Write HTML** — Convert the extracted text into a document page at `docs/<slug>/index.html` using the shared template. Preserve every word, footnote, citation, and cross-reference from the source.
4. **Verify** — Run verification again. It compares the HTML text against the PDF text and produces `source-docs/verification-report.json`.

### What verification checks

- **Footnotes** — All footnotes defined (`id="fn-N"`) have matching references (`href="#fn-N"`), numbering is sequential with no gaps, and the count matches the PDF.
- **Sections** — All heading IDs are unique, no duplicate IDs exist, heading hierarchy is correct.
- **Key phrases** — Critical legal terms (party names, legal standards, statute names) appear in both PDF and HTML.
- **Legal citations** — Case citations (e.g. `F.3d`, `F. Supp.`) and statutory references (`U.S.C. §`) are present in both.
- **Cross-references** — `see supra` and `see infra` references are noted for manual review.
- **Sentence-level comparison** — Each PDF sentence is matched against the HTML using `SequenceMatcher`. Sentences with <70% similarity are flagged.
- **Word-level stats** — Jaccard similarity between PDF and HTML word sets.

### Accuracy rules when editing document HTML

- **Never paraphrase, summarize, or reword** any part of the document text. Copy it verbatim.
- **Footnotes** must use `id="fn-N"` for definitions and `href="#fn-N"` for in-text references. Numbers must be sequential starting from 1.
- **Legal citations** must preserve exact formatting: case names in italics, volume/reporter/page numbers intact, parenthetical descriptions unchanged.
- **Quotation marks** — Use proper curly quotes (`&ldquo;`/`&rdquo;`, `&lsquo;`/`&rsquo;`) matching the source. Internal quotations within blockquotes must be preserved.
- **Special characters** — Preserve section symbols (`&sect;`), paragraph symbols (`&para;`), em dashes (`&mdash;`), en dashes (`&ndash;`), and non-breaking spaces exactly.
- **Page headers/footers** from the PDF (e.g. docket numbers, "Page X of Y") should be stripped — they are not part of the document content.
- Non-document elements (nav, sidebar, footer, accuracy widget, source banner) are excluded from verification and do not need to match the PDF.
- After any edit to document text, run verification and check for regressions.

### Verification output

The report JSON at `source-docs/verification-report.json` has a top-level `status` field: `"PASS"` or `"NEEDS_REVIEW"`. Low-similarity sentences in `missing_from_html` are usually caused by PDF extraction artifacts (line breaks splitting sentences, footnote text interleaved with body text) rather than actual content errors — but each must be manually reviewed.

## Key conventions

- Document pages use the shared template (`src/css/document-template.css` + `src/js/document-template.js`). The homepage has its own inlined styles.
- CSS uses custom properties defined in `:root` (see `--bg`, `--text`, `--accent`, `--surface`, etc.).
- Fonts: Atkinson Hyperlegible (body), Libre Franklin (headings/UI), loaded from Google Fonts.
- Accent color: `#0033CC`. Surface/card background: `#F3F0E8`.
- New document pages must be added as entries in `vite.config.js` `build.rollupOptions.input`.
- Accessibility: skip links, ARIA labels, focus-visible outlines, WCAG AA contrast.
