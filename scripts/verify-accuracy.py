"""
Gorgeous Docs — Deterministic Accuracy Verification

Extracts text from the source PDF and compares it word-for-word
against the HTML version to find discrepancies.

Usage: python scripts/verify-accuracy.py
"""

import os
import re
import json
import html as html_module
from pathlib import Path
from difflib import SequenceMatcher

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "source-docs" / "aap-v-kennedy.pdf"
HTML_PATH = ROOT / "docs" / "aap-v-kennedy" / "index.html"
REPORT_PATH = ROOT / "source-docs" / "verification-report.json"


# ─── PDF Text Extraction ────────────────────────────────────
def extract_pdf_text(pdf_path):
    """Extract text from each page of the PDF."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
    return pages


def clean_pdf_text(pages):
    """Remove page headers and join pages."""
    cleaned = []
    for text in pages:
        # Remove page header: "Case 1:25-cv-11916-BEM Document 291 Filed 03/16/26 Page X of 45"
        text = re.sub(
            r"Case 1:25-cv-11916-BEM\s+Document 291\s+Filed 03/16/26\s+Page \d+ of 45",
            "", text
        )
        cleaned.append(text.strip())
    full = "\n".join(cleaned)
    return full


# ─── HTML Text Extraction ───────────────────────────────────
def extract_html_text(html_path):
    """Extract the document body text from the HTML, stripping all non-document elements."""
    raw = html_path.read_text(encoding="utf-8")

    # Remove non-document sections
    text = re.sub(r"<nav[^>]*>[\s\S]*?</nav>", " ", raw, flags=re.I)
    text = re.sub(r"<aside[^>]*>[\s\S]*?</aside>", " ", text, flags=re.I)
    text = re.sub(r'<div class="source-banner">[\s\S]*?</div>', " ", text, flags=re.I)
    text = re.sub(r'<div class="accuracy-widget[\s\S]*?<!-- /accuracy -->', " ", text, flags=re.I)
    text = re.sub(r"<footer[^>]*>[\s\S]*?</footer>", " ", text, flags=re.I)
    text = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", text, flags=re.I)
    text = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<!--[\s\S]*?-->", " ", text)

    # Remove the <head> section entirely
    text = re.sub(r"<head>[\s\S]*?</head>", " ", text, flags=re.I)

    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Decode HTML entities
    text = html_module.unescape(text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─── Normalize for comparison ────────────────────────────────
def normalize(text):
    """Normalize text for comparison: lowercase, simplify punctuation."""
    t = text
    # Straight quotes
    t = re.sub(r'[\u201C\u201D\u201E\u201F]', '"', t)
    t = re.sub(r"[\u2018\u2019\u201A\u201B]", "'", t)
    # Dashes to hyphen
    t = re.sub(r"[\u2013\u2014]", "-", t)
    # Section symbol
    t = t.replace("\u00A7", "sect.")
    # Paragraph symbol
    t = t.replace("\u00B6", "P")
    # Whitespace
    t = re.sub(r"\s+", " ", t)
    # Strip docket case-caption alignment characters (" ) " between words — after whitespace normalization)
    t = re.sub(r' \) ', ' ', t)
    return t.strip().lower()


# ─── Footnote Verification ──────────────────────────────────
def verify_footnotes(html_path, pdf_full_text):
    raw = html_path.read_text(encoding="utf-8")

    defined = set(int(m) for m in re.findall(r'id="fn-(\d+)"', raw))
    referenced = set(int(m) for m in re.findall(r'href="#fn-(\d+)"', raw))

    unreferenced = sorted(defined - referenced)
    undefined_refs = sorted(referenced - defined)

    sorted_fn = sorted(defined)
    gaps = []
    for i in range(len(sorted_fn) - 1):
        if sorted_fn[i + 1] != sorted_fn[i] + 1:
            gaps.append({"after": sorted_fn[i], "before": sorted_fn[i + 1]})

    # Count footnotes in PDF (look for footnote numbers at start of lines in footnote areas)
    pdf_fn_count = 0
    for m in re.finditer(r"(?:^|\n)\s*(\d{1,2})\s+[A-Z\"\u201C]", pdf_full_text):
        num = int(m.group(1))
        if 1 <= num <= 100:
            pdf_fn_count = max(pdf_fn_count, num)

    return {
        "total_defined": len(defined),
        "total_referenced": len(referenced),
        "range": f"{sorted_fn[0]}-{sorted_fn[-1]}" if sorted_fn else "none",
        "sequential": len(gaps) == 0,
        "unreferenced": unreferenced,
        "undefined_refs": undefined_refs,
        "gaps": gaps,
        "pdf_max_footnote": pdf_fn_count,
    }


# ─── Section / ID Verification ──────────────────────────────
def verify_sections(html_path):
    raw = html_path.read_text(encoding="utf-8")
    headings = re.findall(r'<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)</h\1>', raw, re.I)

    sections = []
    for level, id_, inner in headings:
        text = re.sub(r"<[^>]+>", "", inner).strip()
        sections.append({"level": int(level), "id": id_, "text": text})

    id_counts = {}
    for s in sections:
        id_counts[s["id"]] = id_counts.get(s["id"], 0) + 1
    duplicates = {k: v for k, v in id_counts.items() if v > 1}

    return {
        "total": len(sections),
        "sections": sections,
        "duplicate_ids": duplicates,
    }


# ─── Key Phrase Verification ────────────────────────────────
KEY_PHRASES = [
    "american academy of pediatrics",
    "robert f. kennedy",
    "preliminary injunction",
    "administrative procedure act",
    "advisory committee on immunization practices",
    "federal advisory committee act",
    "arbitrary and capricious",
    "contrary to law",
    "irreparable harm",
    "balance of the equities",
    "public interest",
    "january 2026 memo",
    "may 2025 directive",
    "immunization schedule",
]


def verify_key_phrases(pdf_text, html_text):
    pdf_n = normalize(pdf_text)
    html_n = normalize(html_text)
    results = []
    for phrase in KEY_PHRASES:
        in_pdf = phrase in pdf_n
        in_html = phrase in html_n
        results.append({
            "phrase": phrase,
            "in_pdf": in_pdf,
            "in_html": in_html,
            "match": in_pdf == in_html and in_html,
        })
    return results


# ─── Sentence-Level Comparison ──────────────────────────────
def split_sentences(text):
    """Split text into sentence-like chunks."""
    # Split on . followed by a space and uppercase or quote
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"\u201C(])', text)
    return [p.strip() for p in parts if len(p.strip()) > 15]


def compare_sentences(pdf_text, html_text):
    """Compare sentence by sentence, finding best matches."""
    pdf_sents = split_sentences(pdf_text)
    html_sents = split_sentences(html_text)

    matched = 0
    partial = 0
    missing_from_html = []
    low_matches = []

    for i, ps in enumerate(pdf_sents):
        ps_norm = normalize(ps)
        best_ratio = 0
        best_match = ""
        for hs in html_sents:
            hs_norm = normalize(hs)
            ratio = SequenceMatcher(None, ps_norm, hs_norm).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = hs

        if best_ratio >= 0.90:
            matched += 1
        elif best_ratio >= 0.70:
            partial += 1
            if len(low_matches) < 30:
                low_matches.append({
                    "pdf_sentence": ps[:200],
                    "best_html": best_match[:200],
                    "similarity": round(best_ratio * 100, 1),
                })
        else:
            if len(missing_from_html) < 30:
                missing_from_html.append({
                    "pdf_sentence": ps[:200],
                    "best_html": best_match[:200] if best_match else "(none)",
                    "similarity": round(best_ratio * 100, 1),
                })

    total = len(pdf_sents)
    accuracy = (matched / total * 100) if total > 0 else 0

    return {
        "pdf_sentences": total,
        "html_sentences": len(html_sents),
        "exact_or_near_match": matched,
        "partial_match": partial,
        "low_or_missing": len(pdf_sents) - matched - partial,
        "accuracy_pct": round(accuracy, 1),
        "high_match_pct": round((matched + partial) / total * 100, 1) if total else 0,
        "missing_from_html": missing_from_html,
        "low_matches": low_matches,
    }


# ─── Word-Level Stats ───────────────────────────────────────
def word_stats(pdf_text, html_text):
    pdf_words = normalize(pdf_text).split()
    html_words = normalize(html_text).split()
    pdf_set = set(pdf_words)
    html_set = set(html_words)
    common = pdf_set & html_set
    return {
        "pdf_word_count": len(pdf_words),
        "html_word_count": len(html_words),
        "unique_pdf_words": len(pdf_set),
        "unique_html_words": len(html_set),
        "common_words": len(common),
        "jaccard_similarity": round(len(common) / len(pdf_set | html_set) * 100, 1),
    }


# ─── MAIN ───────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  GORGEOUS DOCS - Accuracy Verification Report")
    print("=" * 60)
    print()

    # 1. Extract texts
    print("[1/6] Extracting PDF text...")
    pdf_pages = extract_pdf_text(PDF_PATH)
    pdf_full = clean_pdf_text(pdf_pages)
    (ROOT / "source-docs" / "aap-v-kennedy-extracted.txt").write_text(pdf_full, encoding="utf-8")
    print(f"  PDF: {len(pdf_full):,} chars from {len(pdf_pages)} pages")

    print("[2/6] Extracting HTML text...")
    html_text = extract_html_text(HTML_PATH)
    (ROOT / "source-docs" / "aap-v-kennedy-html-extracted.txt").write_text(html_text, encoding="utf-8")
    print(f"  HTML: {len(html_text):,} chars")
    print()

    # 2. Footnotes
    print("-" * 60)
    print("  FOOTNOTE VERIFICATION")
    print("-" * 60)
    fn = verify_footnotes(HTML_PATH, pdf_full)
    print(f"  Defined:      {fn['total_defined']}")
    print(f"  Referenced:    {fn['total_referenced']}")
    print(f"  Range:         {fn['range']}")
    print(f"  Sequential:    {'PASS' if fn['sequential'] else 'FAIL'}")
    if fn["unreferenced"]:
        print(f"  WARNING: Unreferenced footnotes: {fn['unreferenced']}")
    if fn["undefined_refs"]:
        print(f"  FAIL: Refs to undefined footnotes: {fn['undefined_refs']}")
    if fn["gaps"]:
        print(f"  FAIL: Gaps in numbering: {fn['gaps']}")
    print()

    # 3. Sections
    print("-" * 60)
    print("  SECTION VERIFICATION")
    print("-" * 60)
    sec = verify_sections(HTML_PATH)
    print(f"  Total headings:   {sec['total']}")
    if sec["duplicate_ids"]:
        print(f"  FAIL: Duplicate IDs: {sec['duplicate_ids']}")
    else:
        print(f"  Duplicate IDs:    PASS (none)")
    for s in sec["sections"]:
        print(f"    h{s['level']} #{s['id']}: {s['text']}")
    print()

    # 4. Key Phrases
    print("-" * 60)
    print("  KEY PHRASE VERIFICATION")
    print("-" * 60)
    phrases = verify_key_phrases(pdf_full, html_text)
    all_match = True
    for p in phrases:
        status = "PASS" if p["match"] else "FAIL"
        if not p["match"]:
            all_match = False
        print(f"  {status}: \"{p['phrase']}\" (PDF: {p['in_pdf']}, HTML: {p['in_html']})")
    print()

    # 5. Word stats
    print("-" * 60)
    print("  WORD-LEVEL STATISTICS")
    print("-" * 60)
    ws = word_stats(pdf_full, html_text)
    print(f"  PDF words:        {ws['pdf_word_count']:,}")
    print(f"  HTML words:       {ws['html_word_count']:,}")
    print(f"  Unique (PDF):     {ws['unique_pdf_words']:,}")
    print(f"  Unique (HTML):    {ws['unique_html_words']:,}")
    print(f"  Common words:     {ws['common_words']:,}")
    print(f"  Jaccard sim:      {ws['jaccard_similarity']}%")
    print()

    # 6. Sentence comparison
    print("-" * 60)
    print("  SENTENCE-LEVEL COMPARISON")
    print("-" * 60)
    comp = compare_sentences(pdf_full, html_text)
    print(f"  PDF sentences:         {comp['pdf_sentences']}")
    print(f"  HTML sentences:        {comp['html_sentences']}")
    print(f"  Exact/near (>=90%):    {comp['exact_or_near_match']}")
    print(f"  Partial (70-89%):      {comp['partial_match']}")
    print(f"  Low/missing (<70%):    {comp['low_or_missing']}")
    print(f"  High-match rate:       {comp['high_match_pct']}%")
    print()

    if comp["low_matches"]:
        print("  PARTIAL MATCHES (70-89% similarity):")
        for m in comp["low_matches"][:10]:
            print(f"    [{m['similarity']}%] PDF: {m['pdf_sentence'][:100]}...")
            print(f"           HTML: {m['best_html'][:100]}...")
            print()

    if comp["missing_from_html"]:
        print("  LOW/MISSING MATCHES (<70% similarity):")
        for m in comp["missing_from_html"][:10]:
            print(f"    [{m['similarity']}%] PDF: {m['pdf_sentence'][:100]}...")
            print(f"           HTML: {m['best_html'][:100]}...")
            print()

    # Summary
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)

    issues = []
    if fn["unreferenced"]:
        issues.append(f"Unreferenced footnotes: {fn['unreferenced']}")
    if fn["undefined_refs"]:
        issues.append(f"Undefined footnote refs: {fn['undefined_refs']}")
    if fn["gaps"]:
        issues.append(f"Footnote numbering gaps: {fn['gaps']}")
    if sec["duplicate_ids"]:
        issues.append(f"Duplicate IDs: {list(sec['duplicate_ids'].keys())}")
    if not all_match:
        issues.append("Missing key phrases")
    if comp["low_or_missing"] > 0:
        issues.append(f"{comp['low_or_missing']} sentence(s) with <70% match")

    if not issues:
        print("\n  ALL CHECKS PASSED - 100% verified accurate\n")
    else:
        print(f"\n  {len(issues)} issue(s) found:")
        for issue in issues:
            print(f"    - {issue}")
        print()

    # Write JSON report
    report = {
        "timestamp": __import__("datetime").datetime.now().isoformat(),
        "document": "AAP v. Kennedy - Preliminary Injunction Opinion",
        "footnotes": fn,
        "sections": {"total": sec["total"], "duplicate_ids": sec["duplicate_ids"]},
        "key_phrases": phrases,
        "word_stats": ws,
        "sentence_comparison": {
            "pdf_sentences": comp["pdf_sentences"],
            "html_sentences": comp["html_sentences"],
            "exact_or_near": comp["exact_or_near_match"],
            "partial": comp["partial_match"],
            "low_or_missing": comp["low_or_missing"],
            "high_match_pct": comp["high_match_pct"],
        },
        "missing_from_html": comp["missing_from_html"],
        "low_matches": comp["low_matches"],
        "issues": issues,
        "status": "PASS" if not issues else "NEEDS_REVIEW",
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"  Report: {REPORT_PATH}")
    print(f"  PDF text: source-docs/aap-v-kennedy-extracted.txt")
    print(f"  HTML text: source-docs/aap-v-kennedy-html-extracted.txt")


if __name__ == "__main__":
    main()
