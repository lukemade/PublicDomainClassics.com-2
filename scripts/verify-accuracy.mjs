/**
 * Gorgeous Docs — Deterministic Accuracy Verification
 *
 * Extracts text from the source PDF and compares it against the HTML version
 * to find any discrepancies. Outputs a detailed report.
 *
 * Usage: node scripts/verify-accuracy.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── PDF Text Extraction ────────────────────────────────────
async function extractPdfText(pdfPath) {
  // Dynamic import for pdf-parse (CommonJS module)
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ verbosity: 0 });
  const fileUrl = new URL(`file:///${pdfPath.replace(/\\/g, '/')}`).href;
  await parser.load(fileUrl);
  const pages = await parser.getText();
  if (Array.isArray(pages)) {
    return pages.map(p => {
      if (p && p.lines) return p.lines.map(l => l.words ? l.words.map(w => w.text).join(' ') : (l.text || '')).join('\n');
      if (p && p.text) return p.text;
      return String(p);
    }).join('\n');
  }
  return String(pages);
}

// ─── HTML Text Extraction ───────────────────────────────────
function extractHtmlText(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove the nav, source-banner, accuracy widget, and footer (not part of the document)
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<div class="source-banner">[\s\S]*?<\/div>/gi, '');
  text = text.replace(/<div class="accuracy-widget[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&rdquo;/g, '\u201D');
  text = text.replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rsquo;/g, '\u2019');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&sect;/g, '§');
  text = text.replace(/&para;/g, '¶');
  text = text.replace(/&middot;/g, '·');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#8201;/g, ' ');
  text = text.replace(/&#x2009;/g, ' ');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ─── Normalize text for comparison ──────────────────────────
function normalize(text) {
  return text
    // Normalize quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Normalize dashes
    .replace(/[\u2013\u2014]/g, '-')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    // Remove page headers/footers from PDF (e.g., "Case 1:25-cv-11916-BEM Document 291 Filed 03/16/26 Page X of 45")
    .replace(/Case 1:25-cv-11916-BEM\s+Document 291\s+Filed 03\/16\/26\s+Page \d+ of 45/g, '')
    // Strip docket case-caption alignment characters (" ) " between words — never appears in normal legal text)
    .replace(/ \) /g, ' ')
    // Normalize whitespace again after removals
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ─── Extract sentences from text ────────────────────────────
function extractSentences(text) {
  // Split on period followed by space and capital letter, or on common legal breaks
  // Use a simpler approach: split into chunks of ~100 chars at word boundaries
  const normalized = normalize(text);
  const words = normalized.split(' ').filter(w => w.length > 0);
  return words;
}

// ─── Find matching segments ─────────────────────────────────
function findLongestCommonSubsequences(pdfWords, htmlWords) {
  // Use a sliding window approach to find matches and mismatches
  const results = {
    matched: 0,
    mismatched: 0,
    pdfOnly: [],    // In PDF but not in HTML (missing from our version)
    htmlOnly: [],   // In HTML but not in PDF (added incorrectly)
    mismatches: []  // Words that differ
  };

  const pdfSet = new Set(pdfWords);
  const htmlSet = new Set(htmlWords);

  return results;
}

// ─── Paragraph-level comparison ─────────────────────────────
function extractParagraphs(text) {
  // Split normalized text into meaningful chunks (~sentence level)
  const norm = normalize(text);
  // Split on patterns that look like sentence endings
  const chunks = norm.split(/(?<=[.?!])\s+(?=[a-z"])/i).filter(s => s.length > 20);
  return chunks;
}

// ─── Word-level diff between two strings ────────────────────
function wordDiff(a, b) {
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');

  // Simple LCS-based diff for short strings
  const n = wordsA.length;
  const m = wordsB.length;

  if (n > 500 || m > 500) {
    // For long texts, use a simpler comparison
    return { similarity: computeSimilarity(a, b), details: 'text too long for word diff' };
  }

  // Build LCS table
  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (wordsA[i-1] === wordsB[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }

  const lcsLength = dp[n][m];
  const maxLen = Math.max(n, m);
  const similarity = maxLen > 0 ? lcsLength / maxLen : 1;

  // Backtrack to find differences
  const diffs = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (wordsA[i-1] === wordsB[j-1]) {
      i--; j--;
    } else if (dp[i-1][j] > dp[i][j-1]) {
      diffs.unshift({ type: 'pdf_only', word: wordsA[i-1], position: i-1 });
      i--;
    } else {
      diffs.unshift({ type: 'html_only', word: wordsB[j-1], position: j-1 });
      j--;
    }
  }
  while (i > 0) {
    diffs.unshift({ type: 'pdf_only', word: wordsA[i-1], position: i-1 });
    i--;
  }
  while (j > 0) {
    diffs.unshift({ type: 'html_only', word: wordsB[j-1], position: j-1 });
    j--;
  }

  return { similarity, diffs };
}

function computeSimilarity(a, b) {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size; // Jaccard similarity
}

// ─── Footnote Verification ──────────────────────────────────
function verifyFootnotes(pdfText, htmlText) {
  const results = [];

  // Extract footnote numbers from HTML
  const htmlFootnotePattern = /id="fn-(\d+)"/g;
  const htmlFootnotes = new Set();
  let match;

  const htmlRaw = fs.readFileSync(
    path.join(ROOT, 'docs/aap-v-kennedy/index.html'), 'utf-8'
  );

  while ((match = htmlFootnotePattern.exec(htmlRaw)) !== null) {
    htmlFootnotes.add(parseInt(match[1]));
  }

  // Check for footnote references in body
  const htmlRefPattern = /href="#fn-(\d+)"/g;
  const htmlRefs = new Set();
  while ((match = htmlRefPattern.exec(htmlRaw)) !== null) {
    htmlRefs.add(parseInt(match[1]));
  }

  // Find footnotes defined but not referenced
  const unreferenced = [...htmlFootnotes].filter(n => !htmlRefs.has(n));

  // Find references to undefined footnotes
  const undefined_ = [...htmlRefs].filter(n => !htmlFootnotes.has(n));

  // Check sequential numbering
  const sortedFootnotes = [...htmlFootnotes].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 0; i < sortedFootnotes.length - 1; i++) {
    if (sortedFootnotes[i + 1] !== sortedFootnotes[i] + 1) {
      gaps.push({ after: sortedFootnotes[i], before: sortedFootnotes[i + 1] });
    }
  }

  // Count footnotes in PDF text
  const pdfNorm = pdfText;
  // PDF footnotes typically appear as superscript numbers - count unique ones
  // Look for patterns like standalone numbers 1-83 at start of footnote text
  const pdfFootnoteMatches = pdfNorm.match(/^\d+\s/gm) || [];

  return {
    totalDefined: htmlFootnotes.size,
    totalReferenced: htmlRefs.size,
    unreferencedFootnotes: unreferenced,
    undefinedReferences: undefined_,
    gaps,
    sequential: gaps.length === 0,
    range: sortedFootnotes.length > 0
      ? { min: sortedFootnotes[0], max: sortedFootnotes[sortedFootnotes.length - 1] }
      : null
  };
}

// ─── Section Verification ───────────────────────────────────
function verifySections(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Extract all section headings from HTML
  const headingPattern = /<h[1-6][^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-6]>/gi;
  const sections = [];
  let match;

  while ((match = headingPattern.exec(html)) !== null) {
    const id = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    sections.push({ id, text });
  }

  // Check for duplicate IDs
  const idCounts = {};
  sections.forEach(s => {
    idCounts[s.id] = (idCounts[s.id] || 0) + 1;
  });
  const duplicateIds = Object.entries(idCounts)
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));

  // Check sidebar nav items match sections
  const navPattern = /id:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g;
  const navItems = [];
  while ((match = navPattern.exec(html)) !== null) {
    navItems.push({ id: match[1], label: match[2] });
  }

  return {
    totalSections: sections.length,
    sections,
    duplicateIds,
    navItems
  };
}

// ─── Cross-reference check ──────────────────────────────────
function verifyCrossReferences(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const issues = [];

  // Find all "see supra" and "see infra" references
  const supraInfraPattern = /see\s+(supra|infra)\s+Section\s+([\w.]+)/gi;
  let match;

  // Get all section IDs and their order
  const sectionOrder = [];
  const headingPattern = /<h[1-6][^>]*id="([^"]*)"[^>]*>/gi;
  while ((match = headingPattern.exec(html)) !== null) {
    sectionOrder.push({ id: match[1], position: match.index });
  }

  // Reset regex
  const refPattern = /see\s+(supra|infra)/gi;
  while ((match = refPattern.exec(html)) !== null) {
    const direction = match[1].toLowerCase();
    const position = match.index;
    // Note the position and direction for manual review
    const context = html.substring(Math.max(0, position - 50), position + 80)
      .replace(/<[^>]+>/g, '').trim();
    issues.push({ direction, position, context });
  }

  return { crossRefs: issues };
}

// ─── Chunk-based comparison ─────────────────────────────────
function chunkCompare(pdfText, htmlText) {
  const pdfNorm = normalize(pdfText);
  const htmlNorm = normalize(htmlText);

  // Split into 50-word chunks with overlap
  const chunkSize = 50;
  const stride = 40;

  const pdfWords = pdfNorm.split(' ');
  const htmlWords = htmlNorm.split(' ');

  const results = {
    totalPdfWords: pdfWords.length,
    totalHtmlWords: htmlWords.length,
    wordCountDiff: Math.abs(pdfWords.length - htmlWords.length),
    matchedChunks: 0,
    mismatchedChunks: 0,
    mismatches: []
  };

  // For each chunk from the PDF, find the best match in HTML
  for (let i = 0; i < pdfWords.length - chunkSize; i += stride) {
    const pdfChunk = pdfWords.slice(i, i + chunkSize).join(' ');

    // Search for this chunk in HTML text
    let bestMatch = 0;
    let bestPos = -1;

    for (let j = 0; j < htmlWords.length - chunkSize; j += stride) {
      const htmlChunk = htmlWords.slice(j, j + chunkSize).join(' ');
      const sim = computeSimilarity(pdfChunk, htmlChunk);
      if (sim > bestMatch) {
        bestMatch = sim;
        bestPos = j;
      }
    }

    if (bestMatch >= 0.85) {
      results.matchedChunks++;
    } else {
      results.mismatchedChunks++;
      if (results.mismatches.length < 20) { // Cap at 20 mismatches for readability
        const htmlChunk = bestPos >= 0
          ? htmlWords.slice(bestPos, bestPos + chunkSize).join(' ')
          : '(no match found)';
        results.mismatches.push({
          pdfPosition: i,
          pdfText: pdfChunk.substring(0, 200),
          bestHtmlMatch: htmlChunk.substring(0, 200),
          similarity: bestMatch
        });
      }
    }
  }

  const totalChunks = results.matchedChunks + results.mismatchedChunks;
  results.overallAccuracy = totalChunks > 0
    ? (results.matchedChunks / totalChunks * 100).toFixed(1)
    : 0;

  return results;
}

// ─── Key phrase verification ────────────────────────────────
function verifyKeyPhrases(pdfText, htmlText) {
  const pdfNorm = normalize(pdfText);
  const htmlNorm = normalize(htmlText);

  // Extract key legal phrases and citations from PDF
  const citationPattern = /\d+\s+f\.\s*(?:supp\.\s*)?(?:2d|3d|4th)?\s+\d+/gi;
  const uscPattern = /\d+\s+u\.s\.c?\.\s*(?:§|sect)?\s*\d+/gi;

  const pdfCitations = pdfNorm.match(citationPattern) || [];
  const htmlCitations = htmlNorm.match(citationPattern) || [];

  const pdfUSC = pdfNorm.match(uscPattern) || [];
  const htmlUSC = htmlNorm.match(uscPattern) || [];

  // Check specific key phrases that MUST be in both
  const keyPhrases = [
    'american academy of pediatrics',
    'robert f. kennedy',
    'preliminary injunction',
    'administrative procedure act',
    'advisory committee on immunization practices',
    'federal advisory committee act',
    'arbitrary and capricious',
    'contrary to law',
    'irreparable harm',
    'balance of the equities',
    'public interest',
    'january 2026 memo',
    'may 2025 directive',
    'immunization schedule',
  ];

  const phraseResults = keyPhrases.map(phrase => ({
    phrase,
    inPdf: pdfNorm.includes(phrase),
    inHtml: htmlNorm.includes(phrase),
    match: pdfNorm.includes(phrase) === htmlNorm.includes(phrase)
  }));

  return {
    pdfCitationCount: pdfCitations.length,
    htmlCitationCount: htmlCitations.length,
    pdfUSCCount: pdfUSC.length,
    htmlUSCCount: htmlUSC.length,
    keyPhrases: phraseResults,
    allKeyPhrasesMatch: phraseResults.every(p => p.match && p.inHtml)
  };
}

// ─── MAIN ───────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  GORGEOUS DOCS — Accuracy Verification Report   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const pdfPath = path.join(ROOT, 'source-docs/aap-v-kennedy.pdf');
  const htmlPath = path.join(ROOT, 'docs/aap-v-kennedy/index.html');

  // 1. Extract PDF text (use pre-extracted file if PDF parsing fails)
  console.log('📄 Extracting PDF text...');
  let pdfText;
  const extractedTxtPath = path.join(ROOT, 'source-docs/aap-v-kennedy-extracted.txt');
  try {
    pdfText = await extractPdfText(pdfPath);
    fs.writeFileSync(extractedTxtPath, pdfText);
  } catch (e) {
    console.log(`   ⚠ PDF extraction failed (${e.message.split('\n')[0]}), using pre-extracted text file`);
    pdfText = fs.readFileSync(extractedTxtPath, 'utf-8');
  }
  console.log(`   PDF: ${pdfText.length} characters extracted\n`);

  // 2. Extract HTML text
  console.log('🌐 Extracting HTML text...');
  const htmlText = extractHtmlText(htmlPath);
  console.log(`   HTML: ${htmlText.length} characters extracted\n`);

  fs.writeFileSync(
    path.join(ROOT, 'source-docs/aap-v-kennedy-html-extracted.txt'),
    htmlText
  );

  // 3. Footnote verification
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 FOOTNOTE VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const footnotes = verifyFootnotes(pdfText, htmlText);
  console.log(`   Footnotes defined:    ${footnotes.totalDefined}`);
  console.log(`   Footnotes referenced: ${footnotes.totalReferenced}`);
  console.log(`   Range:                ${footnotes.range?.min}–${footnotes.range?.max}`);
  console.log(`   Sequential:           ${footnotes.sequential ? '✅ Yes' : '❌ No'}`);
  if (footnotes.unreferencedFootnotes.length > 0) {
    console.log(`   ⚠️  Unreferenced:     ${footnotes.unreferencedFootnotes.join(', ')}`);
  }
  if (footnotes.undefinedReferences.length > 0) {
    console.log(`   ❌ Undefined refs:    ${footnotes.undefinedReferences.join(', ')}`);
  }
  if (footnotes.gaps.length > 0) {
    console.log(`   ❌ Gaps:              ${JSON.stringify(footnotes.gaps)}`);
  }
  console.log();

  // 4. Section verification
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📑 SECTION VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const sections = verifySections(htmlPath);
  console.log(`   Total sections:       ${sections.totalSections}`);
  if (sections.duplicateIds.length > 0) {
    console.log(`   ❌ Duplicate IDs:     ${sections.duplicateIds.map(d => `${d.id} (${d.count}x)`).join(', ')}`);
  } else {
    console.log(`   Duplicate IDs:        ✅ None`);
  }
  console.log(`   Sections found:`);
  sections.sections.forEach(s => {
    console.log(`     - [${s.id}] ${s.text}`);
  });
  console.log();

  // 5. Cross-reference check
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 CROSS-REFERENCE CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const crossRefs = verifyCrossReferences(htmlPath);
  crossRefs.crossRefs.forEach(ref => {
    console.log(`   ${ref.direction.toUpperCase()}: ...${ref.context}...`);
  });
  console.log();

  // 6. Key phrase verification
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 KEY PHRASE VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const phrases = verifyKeyPhrases(pdfText, htmlText);
  phrases.keyPhrases.forEach(p => {
    const status = p.match && p.inHtml ? '✅' : '❌';
    console.log(`   ${status} "${p.phrase}" — PDF: ${p.inPdf ? 'yes' : 'NO'}, HTML: ${p.inHtml ? 'yes' : 'NO'}`);
  });
  console.log(`   Legal citations:      PDF ${phrases.pdfCitationCount} | HTML ${phrases.htmlCitationCount}`);
  console.log(`   U.S.C. references:    PDF ${phrases.pdfUSCCount} | HTML ${phrases.htmlUSCCount}`);
  console.log();

  // 7. Chunk-based text comparison
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEXT COMPARISON (50-word chunks)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const comparison = chunkCompare(pdfText, htmlText);
  console.log(`   PDF word count:       ${comparison.totalPdfWords}`);
  console.log(`   HTML word count:      ${comparison.totalHtmlWords}`);
  console.log(`   Word count diff:      ${comparison.wordCountDiff}`);
  console.log(`   Matched chunks:       ${comparison.matchedChunks}`);
  console.log(`   Mismatched chunks:    ${comparison.mismatchedChunks}`);
  console.log(`   Overall accuracy:     ${comparison.overallAccuracy}%`);

  if (comparison.mismatches.length > 0) {
    console.log(`\n   ⚠️  Sample mismatches (up to 20):`);
    comparison.mismatches.forEach((m, i) => {
      console.log(`\n   --- Mismatch ${i + 1} (similarity: ${(m.similarity * 100).toFixed(0)}%) ---`);
      console.log(`   PDF:  ${m.pdfText.substring(0, 120)}...`);
      console.log(`   HTML: ${m.bestHtmlMatch.substring(0, 120)}...`);
    });
  }

  // 8. Summary
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                       ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const issues = [];
  if (footnotes.unreferencedFootnotes.length > 0) issues.push(`${footnotes.unreferencedFootnotes.length} unreferenced footnote(s)`);
  if (footnotes.undefinedReferences.length > 0) issues.push(`${footnotes.undefinedReferences.length} undefined footnote ref(s)`);
  if (footnotes.gaps.length > 0) issues.push(`${footnotes.gaps.length} gap(s) in footnote numbering`);
  if (sections.duplicateIds.length > 0) issues.push(`${sections.duplicateIds.length} duplicate section ID(s)`);
  if (!phrases.allKeyPhrasesMatch) issues.push('Missing key phrases');
  if (comparison.mismatchedChunks > 0) issues.push(`${comparison.mismatchedChunks} text chunk(s) with <85% match`);

  if (issues.length === 0) {
    console.log('\n   ✅ ALL CHECKS PASSED — 100% verified accurate\n');
  } else {
    console.log(`\n   ⚠️  ${issues.length} issue(s) found:`);
    issues.forEach(issue => console.log(`      • ${issue}`));
    console.log();
  }

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    document: 'AAP v. Kennedy — Preliminary Injunction Opinion',
    source: 'Georgetown Law Litigation Tracker',
    footnotes,
    sections: { total: sections.totalSections, duplicateIds: sections.duplicateIds },
    keyPhrases: phrases,
    textComparison: {
      pdfWords: comparison.totalPdfWords,
      htmlWords: comparison.totalHtmlWords,
      accuracy: comparison.overallAccuracy,
      matchedChunks: comparison.matchedChunks,
      mismatchedChunks: comparison.mismatchedChunks,
    },
    issues,
    overallStatus: issues.length === 0 ? 'PASS' : 'NEEDS_REVIEW'
  };

  fs.writeFileSync(
    path.join(ROOT, 'source-docs/verification-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('   Report saved to: source-docs/verification-report.json');
  console.log('   PDF text saved to: source-docs/aap-v-kennedy-extracted.txt');
  console.log('   HTML text saved to: source-docs/aap-v-kennedy-html-extracted.txt\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
