/* ============================================
   PUBLIC DOMAIN CLASSICS — Document Template JS
   Breadcrumb chapter nav, scroll spy, back-to-top
   ============================================ */

// Enable Picture Book (illustrated) mode for all book pages
window.PDC_ILLUSTRATED_ENABLED = true;

// ── SENTENCE MODE AUTO-ENTER (must run before anything else) ──
(function () {
  if (window.location.hash.indexOf('#sentence/') === 0) {
    window._autoEnterSentenceMode = true;
    window._sentenceModeActive = true;
  }
})();

// ── URL HASH ROUTING — unique URL per chapter ──
(function () {
  var headings = document.querySelectorAll('h2.section-heading[id]');
  if (!headings.length) return;

  if (window.location.hash && window.location.hash.indexOf('#sentence/') !== 0) {
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      setTimeout(function () {
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 60);
      }, 200);
    }
  }

  var hashTimer = null;
  var currentHashId = window.location.hash ? window.location.hash.slice(1) : null;

  window._updateChapterHash = function (id) {
    if (window._suppressHashUpdate) return;
    if (id === currentHashId) return;
    currentHashId = id;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      history.replaceState(null, '', '#' + id);
    }, 300);
  };
})();

// ── BREADCRUMB CHAPTER DROPDOWN + SCROLL SPY + PROGRESS ──
(function () {
  var breadcrumbChapter = document.getElementById('breadcrumb-chapter');
  var dropdownList = document.querySelector('.breadcrumb-dropdown-list');
  if (!breadcrumbChapter || !dropdownList) return;

  var headings = Array.from(document.querySelectorAll('h2.section-heading[id]'));
  if (!headings.length) return;
  var total = headings.length;

  function cleanLabel(text) {
    return text.replace(/^[+\u2212]\s*/, '').trim();
  }

  // Progress counter next to the chapter label
  var progressEl = document.createElement('span');
  progressEl.className = 'breadcrumb-progress';
  breadcrumbChapter.insertBefore(progressEl, breadcrumbChapter.querySelector('.breadcrumb-caret'));

  var dropdownLinks = [];

  headings.forEach(function (h2) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h2.id;
    a.textContent = cleanLabel(h2.textContent);
    a.dataset.id = h2.id;
    li.appendChild(a);
    dropdownList.appendChild(li);
    dropdownLinks.push(a);

    a.addEventListener('click', function (e) {
      e.preventDefault();
      breadcrumbChapter.closest('.breadcrumb-dropdown').classList.remove('is-open');
      // If sentence mode is active, jump to that chapter's first sentence
      if (window._sentenceGoToChapter) {
        window._sentenceGoToChapter(h2.id);
      } else {
        window.scrollTo(0, h2.getBoundingClientRect().top + window.scrollY - 60);
      }
    });
  });

  // Toggle dropdown
  var dropdownWrap = breadcrumbChapter.closest('.breadcrumb-dropdown');
  breadcrumbChapter.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdownWrap.classList.toggle('is-open');
  });
  document.addEventListener('click', function (e) {
    if (!dropdownWrap.contains(e.target)) dropdownWrap.classList.remove('is-open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') dropdownWrap.classList.remove('is-open');
  });

  // Scroll spy
  var activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    var h2 = document.getElementById(id);
    if (h2) {
      var idx = headings.indexOf(h2);
      if (idx < 0) idx = 0;
      breadcrumbChapter.querySelector('.breadcrumb-chapter-label').textContent = cleanLabel(h2.textContent);
      var pct = Math.round(((idx + 1) / total) * 100);
      progressEl.textContent = pct + '%';
    }
    dropdownLinks.forEach(function (a) {
      a.classList.toggle('active', a.dataset.id === id);
    });
    if (!window._sentenceModeActive && window._updateChapterHash) window._updateChapterHash(id);
  }

  var visible = new Map();
  var spyObserver = new IntersectionObserver(function (entries) {
    // Don't update breadcrumb from scroll spy when sentence mode is active
    if (window._sentenceModeActive) return;
    entries.forEach(function (e) {
      visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity);
    });
    var best = null, bestTop = Infinity;
    visible.forEach(function (top, id) {
      if (top >= 0 && top < bestTop) { bestTop = top; best = id; }
    });
    if (!best) {
      var lastPast = null;
      headings.forEach(function (h) {
        if (h.getBoundingClientRect().top < 60) lastPast = h.id;
      });
      best = lastPast;
    }
    if (best) setActive(best);
  }, { rootMargin: '-40px 0px -70% 0px', threshold: 0 });

  headings.forEach(function (h) { spyObserver.observe(h); });
  if (!window._sentenceModeActive) setActive(headings[0].id);

  // Expose for sentence mode to update breadcrumb
  window._breadcrumbSetActive = setActive;
})();

// Section headings — no accordion
document.querySelectorAll('h2.section-heading').forEach(function (h2) {
  h2.style.cursor = 'default';
});

// Footnote references
document.querySelectorAll('.footnote-ref').forEach(function (ref) {
  ref.addEventListener('click', function (e) {
    e.preventDefault();
    var target = document.getElementById(ref.getAttribute('href').slice(1));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.background = '#fffde0';
      setTimeout(function () { target.style.background = ''; }, 2000);
    }
  });
});

// ── TOP NAV IDLE FADE ──
(function () {
  var article = document.getElementById('main-content');
  if (!article) return;

  // Scroll handler — top nav on scroll-up only
  var lastScrollY = 0;
  var ticking = false;

  function onScroll() {
    var topNav = document.getElementById('top-nav');
    var scrollingUp = window.scrollY < lastScrollY;
    var nearTop = window.scrollY < 400;

    if (topNav) {
      if (nearTop || scrollingUp) {
        topNav.classList.add('is-active');
        topNav.classList.remove('is-idle');
      } else {
        topNav.classList.remove('is-active');
        topNav.classList.add('is-idle');
      }
    }

    lastScrollY = window.scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  // Hover near top edge reveals nav
  var topNav = document.getElementById('top-nav');
  var topZone = document.createElement('div');
  topZone.className = 'top-nav-hover-zone';
  document.body.appendChild(topZone);
  function showNav() {
    if (topNav) { topNav.classList.add('is-active'); topNav.classList.remove('is-idle'); }
  }
  topZone.addEventListener('mouseenter', showNav);
  if (topNav) topNav.addEventListener('mouseenter', showNav);

  onScroll();
})();

// ── MODE DROPDOWN + SENTENCE READER ──
(function () {
  var modeDropdown = document.getElementById('mode-dropdown');
  var modeToggle = document.getElementById('mode-toggle');
  if (!modeDropdown || !modeToggle) return;

  var modeCurrentLabel = modeToggle.querySelector('.mode-current');
  var modeLinks = modeDropdown.querySelectorAll('.mode-dropdown-list a');
  var currentMode = 'scroll';

  // Toggle dropdown (or open reading modal if available)
  modeToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (typeof window.openReadingModal === 'function') {
      window.openReadingModal({
        mode: currentMode,
        isCover: false,
        onConfirm: function (chosenMode) {
          if (chosenMode === currentMode) return;
          // On cover page (no .article-body), just save the preference and stay
          var isOnCoverPage = !document.querySelector('.article-body');
          if (isOnCoverPage) {
            try {
              if (chosenMode !== 'scroll') sessionStorage.setItem('pdc-mode', chosenMode);
              else sessionStorage.removeItem('pdc-mode');
            } catch (e) {}
            currentMode = chosenMode;
            return;
          }
          var prevMode = currentMode;
          currentMode = chosenMode;
          var matchingLink = null;
          modeLinks.forEach(function (l) {
            if (l.dataset.mode === chosenMode) matchingLink = l;
            l.classList.toggle('active', l.dataset.mode === chosenMode);
          });
          if (matchingLink) modeCurrentLabel.textContent = matchingLink.querySelector('.settings-option-name') ? matchingLink.querySelector('.settings-option-name').textContent : matchingLink.textContent;
          if (chosenMode === 'illustrated' && !window.PDC_ILLUSTRATED_ENABLED) chosenMode = 'scroll';
          if (chosenMode === 'sentence') {
            if (prevMode === 'illustrated') exitIllustratedMode();
            enterSentenceMode();
          } else if (chosenMode === 'illustrated') {
            if (prevMode === 'sentence') exitSentenceMode();
            enterIllustratedMode();
          } else {
            if (prevMode === 'sentence') exitSentenceMode();
            if (prevMode === 'illustrated') exitIllustratedMode();
          }
        }
      });
    } else {
      modeDropdown.classList.toggle('is-open');
    }
  });
  document.addEventListener('click', function (e) {
    if (!modeDropdown.contains(e.target)) modeDropdown.classList.remove('is-open');
  });

  // Mode selection
  modeLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var mode = a.dataset.mode;
      if (mode === 'illustrated' && !window.PDC_ILLUSTRATED_ENABLED) return;
      if (mode === currentMode) { modeDropdown.classList.remove('is-open'); return; }
      var prevMode = currentMode;
      currentMode = mode;
      modeCurrentLabel.textContent = a.textContent;
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === mode); });
      modeDropdown.classList.remove('is-open');

      if (mode === 'sentence') {
        if (prevMode === 'illustrated') exitIllustratedMode();
        enterSentenceMode();
      } else if (mode === 'illustrated') {
        if (prevMode === 'sentence') exitSentenceMode();
        enterIllustratedMode();
      } else {
        if (prevMode === 'sentence') exitSentenceMode();
        if (prevMode === 'illustrated') exitIllustratedMode();
      }
    });
  });

  // ── Sentence extraction ──
  var sentences = [];
  var sentenceIndex = -1;
  var reader = null;

  // Get all chapter URLs from the TOC overlay
  function getChapterUrls() {
    var urls = [];
    var links = document.querySelectorAll('.toc-overlay-list a');
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      // Skip cover page
      if (href && href !== '/books/frankenstein/' && !a.textContent.match(/cover/i)) {
        urls.push({ url: href, title: a.textContent.trim() });
      }
    });
    return urls;
  }

  // Extract sentences from a DOM element
  function extractSentencesFromElement(article, chapterTitle) {
    var result = [];
    var chapterId = chapterTitle ? chapterTitle.toLowerCase().replace(/\s+/g, '-') : 'chapter';

    // Add chapter heading
    if (chapterTitle) {
      result.push({ text: chapterTitle, type: 'heading', chapterId: chapterId, chapterLabel: chapterTitle });
    }

    // Check for epigraph
    var epigraph = article.querySelector('.epigraph');
    if (epigraph) {
      var clone = epigraph.cloneNode(true);
      clone.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
      var epText = clone.textContent.trim().replace(/\s+/g, ' ');
      if (epText) {
        result.push({ text: epText, type: 'epigraph', chapterId: chapterId, chapterLabel: chapterTitle });
      }
    }

    // Extract from section bodies
    var bodies = article.querySelectorAll('.section-body');
    bodies.forEach(function (body) {
      extractFromBody(body, chapterId, chapterTitle, result);
    });

    return result;
  }

  // Fetch all chapters and build full-book sentence list
  function extractAllChapters(callback) {
    if (sentences.length) { callback(); return; }

    var chapters = getChapterUrls();
    if (!chapters.length) {
      // Fallback: extract from current page only
      extractSentencesFromCurrentPage();
      callback();
      return;
    }

    var loaded = 0;
    var allResults = new Array(chapters.length);

    chapters.forEach(function (ch, idx) {
      fetch(ch.url)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var article = doc.getElementById('main-content') || doc.querySelector('.article-body');
          if (article) {
            allResults[idx] = extractSentencesFromElement(article, ch.title);
          } else {
            allResults[idx] = [];
          }
        })
        .catch(function () { allResults[idx] = []; })
        .finally(function () {
          loaded++;
          if (loaded === chapters.length) {
            // Flatten in order
            for (var i = 0; i < allResults.length; i++) {
              sentences = sentences.concat(allResults[i]);
            }
            callback();
          }
        });
    });
  }

  function extractSentencesFromCurrentPage() {
    var article = document.getElementById('main-content');
    if (!article) return;

    // Start with the epigraph if present
    var epigraph = article.querySelector('.epigraph');
    if (epigraph) {
      // Collect full text, replacing <br> with spaces
      var clone = epigraph.cloneNode(true);
      clone.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
      var epText = clone.textContent.trim().replace(/\s+/g, ' ');
      if (epText) {
        sentences.push({ text: epText, type: 'heading', chapterId: null });
      }
    }

    // Derive chapter title from page <title> ("Letter 1 — Frankenstein — …" → "Letter 1")
    var chapterTitleEl = document.querySelector('.book-header-chapter');
    var chTitle = chapterTitleEl
      ? chapterTitleEl.textContent.trim()
      : (document.title.split('—')[0].trim() || 'Chapter');
    var chId = chTitle.toLowerCase().replace(/\s+/g, '-');
    sentences.push({ text: chTitle, type: 'heading', chapterId: chId, chapterLabel: chTitle });

    var bodies = article.querySelectorAll('.section-body');
    bodies.forEach(function (body) {
      extractFromBody(body, chId, chTitle, sentences);
    });

    return sentences;
  }

  // Extract whole paragraphs (for picture book mode)
  function extractParagraphsFromCurrentPage() {
    var article = document.getElementById('main-content');
    if (!article) return;

    var epigraph = article.querySelector('.epigraph');
    if (epigraph) {
      var clone = epigraph.cloneNode(true);
      clone.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
      var epText = clone.textContent.trim().replace(/\s+/g, ' ');
      if (epText) sentences.push({ text: epText, type: 'epigraph', chapterId: null });
    }

    var chapterTitleEl = document.querySelector('.book-header-chapter');
    var chTitle = chapterTitleEl
      ? chapterTitleEl.textContent.trim()
      : (document.title.split('—')[0].trim() || 'Chapter');
    var chId = chTitle.toLowerCase().replace(/\s+/g, '-');
    sentences.push({ text: chTitle, type: 'heading', chapterId: chId, chapterLabel: chTitle });

    var bodies = article.querySelectorAll('.section-body');
    bodies.forEach(function (body) {
      var children = body.children;
      for (var c = 0; c < children.length; c++) {
        var el = children[c];

        if (el.classList.contains('letter-salutation') || el.classList.contains('letter-dateline')) {
          var groupParts = [];
          while (c < children.length &&
            (children[c].classList.contains('letter-salutation') || children[c].classList.contains('letter-dateline'))) {
            var t = children[c].textContent.trim();
            if (t) groupParts.push(t);
            c++;
          }
          c--;
          if (groupParts.length) {
            sentences.push({ text: groupParts.join('\n'), type: 'sentence', chapterId: chId, chapterLabel: chTitle });
          }
          continue;
        }

        if (el.classList.contains('poetry-block')) {
          var lines = [];
          el.querySelectorAll('.poetry-line').forEach(function (pl) {
            var lt = pl.textContent.trim();
            if (lt) lines.push(lt);
          });
          if (lines.length) {
            sentences.push({ text: lines.join('\n'), type: 'sentence', chapterId: chId, chapterLabel: chTitle });
          }
          continue;
        }

        if (el.classList.contains('poetry-attribution')) continue;

        if (el.tagName === 'P') {
          var raw = el.textContent.trim();
          if (raw) {
            // Split long paragraphs at sentence boundaries (~300 chars per chunk)
            if (raw.length > 300) {
              var chunks = [];
              var remaining = raw;
              while (remaining.length > 300) {
                // Find sentence ends in the first 350 chars, pick the one nearest 300
                var bestSplit = -1, bestDist = remaining.length;
                var re = /[.;!?]\s/g, m;
                while ((m = re.exec(remaining)) !== null) {
                  if (m.index < 50) continue; // don't split too early
                  var dist = Math.abs(m.index - 280);
                  if (dist < bestDist) { bestDist = dist; bestSplit = m.index + 1; }
                }
                if (bestSplit > 0 && bestSplit < remaining.length - 30) {
                  chunks.push(remaining.substring(0, bestSplit).trim());
                  remaining = remaining.substring(bestSplit).trim();
                } else {
                  break; // no good split point, keep as-is
                }
              }
              chunks.push(remaining.trim());
              for (var ci = 0; ci < chunks.length; ci++) {
                if (chunks[ci]) sentences.push({ text: chunks[ci], type: 'sentence', chapterId: chId, chapterLabel: chTitle });
              }
            } else {
              sentences.push({ text: raw, type: 'sentence', chapterId: chId, chapterLabel: chTitle });
            }
          }
        }

        if (el.classList.contains('letter-closing') || el.classList.contains('letter-signature')) {
          var t = el.textContent.trim();
          if (t) sentences.push({ text: t, type: 'sentence', chapterId: chId, chapterLabel: chTitle });
        }
      }
    });

    // Merge short consecutive paragraphs so two fit on one slide
    var merged = [];
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      if (s.type === 'sentence' && s.text.length < 150 &&
          i + 1 < sentences.length && sentences[i + 1].type === 'sentence' &&
          sentences[i + 1].text.length < 150 &&
          s.text.length + sentences[i + 1].text.length < 300) {
        merged.push({
          text: s.text + '\n\n' + sentences[i + 1].text,
          type: 'sentence',
          chapterId: s.chapterId,
          chapterLabel: s.chapterLabel
        });
        i++; // skip next
      } else {
        merged.push(s);
      }
    }
    sentences.length = 0;
    for (var i = 0; i < merged.length; i++) sentences.push(merged[i]);

    return sentences;
  }

  var MAX_SENTENCE_LEN = 180;

  function extractFromBody(body, chapterId, chapterLabel, result) {
    var children = body.children;
    var c = 0;
    while (c < children.length) {
      var el = children[c];

      if (el.classList.contains('letter-salutation') || el.classList.contains('letter-dateline')) {
        var groupParts = [];
        while (c < children.length &&
          (children[c].classList.contains('letter-salutation') || children[c].classList.contains('letter-dateline'))) {
          var t = children[c].textContent.trim();
          if (t) groupParts.push(t);
          c++;
        }
        if (groupParts.length) {
          result.push({ text: groupParts.join('\n'), type: 'sentence', chapterId: chapterId, chapterLabel: chapterLabel });
        }
        continue;
      }

      if (el.classList.contains('poetry-block')) {
        var lines = [];
        el.querySelectorAll('.poetry-line').forEach(function (pl) {
          var lt = pl.textContent.trim();
          if (lt) lines.push(lt);
        });
        if (lines.length) {
          result.push({ text: lines.join('\n'), type: 'sentence', chapterId: chapterId, chapterLabel: chapterLabel });
        }
        c++;
        continue;
      }

      if (el.classList.contains('poetry-attribution')) { c++; continue; }

      if (el.tagName === 'P') {
        var raw = el.textContent.trim();
        if (raw) {
          splitIntoSentences(raw, chapterId, chapterLabel, result);
        }
      }

      c++;
    }
  }

  function maybeSplitLong(text, chapterId, chapterLabel, result) {
    if (text.length <= MAX_SENTENCE_LEN) {
      result.push({ text: text, type: 'sentence', chapterId: chapterId, chapterLabel: chapterLabel });
      return;
    }
    var delimiters = /([;:\u2014—])\s+|,\s+(?:and|but|or|for|nor|yet|so|which|where|when|while|though|although|if|because|as|since)\s+|,\s+(?=[a-z])/gi;
    var bestSplit = -1;
    var mid = text.length / 2;
    var match;
    while ((match = delimiters.exec(text)) !== null) {
      var pos = match.index + match[0].length;
      if (bestSplit === -1 || Math.abs(pos - mid) < Math.abs(bestSplit - mid)) {
        bestSplit = pos;
      }
    }
    if (bestSplit > 25 && bestSplit < text.length - 25) {
      maybeSplitLong(text.substring(0, bestSplit).trim(), chapterId, chapterLabel, result);
      maybeSplitLong(text.substring(bestSplit).trim(), chapterId, chapterLabel, result);
    } else {
      result.push({ text: text, type: 'sentence', chapterId: chapterId, chapterLabel: chapterLabel });
    }
  }

  function splitIntoSentences(raw, chapterId, chapterLabel, result) {
    var protected_ = raw.replace(/\b(Mrs?|Ms|Dr|St|Jr|Sr|Prof|Rev|Gen|Col|Sgt|Lt|Mt|Ft)\.\s/gi, function(m, abbr) {
      return abbr + '\x00 ';
    });
    var parts = protected_.match(/[^.!?]*[.!?]+(?=\s+[A-Z"\u201c\u2018(]|$)/g);
    if (parts) {
      parts = parts.map(function(p) { return p.replace(/\x00/g, '.'); });
    }
    if (!parts || parts.length === 0) {
      maybeSplitLong(raw, chapterId, chapterLabel, result);
      return;
    }
    var captured = parts.join('').length;
    if (captured < protected_.length) {
      var remainder = protected_.substring(captured).replace(/\x00/g, '.').trim();
      if (remainder) parts.push(remainder);
    }
    parts.forEach(function (s) {
      var trimmed = s.trim();
      if (trimmed) {
        maybeSplitLong(trimmed, chapterId, chapterLabel, result);
      }
    });
  }

  var transitioning = false;
  var fragmentTimers = [];

  function buildReader() {
    if (reader) return reader;

    reader = document.createElement('div');
    reader.className = 'sentence-reader';
    reader.id = 'sentence-reader';

    // Cover slide — exact clone of the hero + start prompt
    var cover = document.createElement('div');
    cover.className = 'sentence-reader-cover';
    cover.id = 'sr-cover';

    // Clone the actual hero element (or book header on chapter pages)
    var heroEl = document.querySelector('.hero') || document.querySelector('.book-header');
    if (heroEl) {
      var heroClone = heroEl.cloneNode(true);
      heroClone.removeAttribute('id');
      heroClone.classList.add('sr-cover-hero');
      // Remove the animated line (it's a one-time animation)
      var line = heroClone.querySelector('.hero-line');
      if (line) line.remove();
      // No inline start prompt — tooltip on the arrow handles this
      cover.appendChild(heroClone);
    }
    reader.appendChild(cover);

    // Sentence body (hidden when cover is shown)
    var body = document.createElement('div');
    body.className = 'sentence-reader-body';
    body.id = 'sr-body';
    body.style.display = 'none';
    body.innerHTML = '<div class="sentence-reader-text" id="sr-text"></div>';
    reader.appendChild(body);

    // No nav inside reader — bottom bar is repurposed instead

    document.body.appendChild(reader);

    // Clicking anywhere on the cover advances
    cover.addEventListener('click', function () { go(1); });

    return reader;
  }

  function escHtml(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  // Split sentence into meaningful clause-level fragments for typewriter effect
  function splitFragments(text) {
    // Line breaks are always fragment boundaries
    if (text.indexOf('\n') >= 0) {
      return text.split('\n').filter(function (l) { return l.trim(); });
    }

    // Split at major clause boundaries only:
    // semicolons, colons, em-dashes, and coordinating conjunctions (and/but/or/for/yet/so/nor)
    // but only when the conjunction follows a comma
    var pattern = /(;\s+|:\s+|\u2014\s*|—\s*|,\s+(?=and\s|but\s|or\s|for\s|yet\s|so\s|nor\s|which\s|where\s|when\s|while\s|although\s|though\s))/;
    var parts = text.split(pattern);

    if (parts.length <= 1) return [text];

    // Recombine: merge delimiters back onto the preceding fragment
    var fragments = [];
    var current = '';
    for (var i = 0; i < parts.length; i++) {
      if (pattern.test(parts[i])) {
        current += parts[i];
      } else {
        if (current.trim()) fragments.push(current.trim());
        current = parts[i];
      }
    }
    if (current.trim()) fragments.push(current.trim());

    // Only use fragments if we got 2-5 meaningful chunks (not too many)
    if (fragments.length < 2 || fragments.length > 5) return [text];
    // Reject if any fragment is too short (< 20 chars) — probably a bad split
    for (var j = 0; j < fragments.length; j++) {
      if (fragments[j].length < 15) return [text];
    }
    return fragments;
  }

  function renderSentence(direction) {
    var coverEl = document.getElementById('sr-cover');
    var bodyEl = document.getElementById('sr-body');
    var textEl = document.getElementById('sr-text');
    var counterEl = document.getElementById('sr-bar-counter');

    // Clear any pending fragment timers
    fragmentTimers.forEach(function (t) { clearTimeout(t); });
    fragmentTimers = [];

    coverEl.style.display = 'none';
    bodyEl.style.display = '';

    var s = sentences[sentenceIndex];
    if (!s) return;

    // Set font style
    if (s.type === 'heading') {
      textEl.style.fontFamily = "'IM Fell French Canon', serif";
      textEl.style.fontSize = 'clamp(36px, 5.5vw, 60px)';
      textEl.style.fontWeight = '400';
      textEl.style.color = 'var(--accent, #6b3a2a)';
    } else {
      textEl.style.fontFamily = '';
      textEl.style.fontSize = '';
      textEl.style.fontWeight = '';
      textEl.style.color = '';
    }

    // Simple crossfade: fade out, swap content, fade in
    var rawText = s.text;
    textEl.classList.add('is-fading');

    setTimeout(function () {
      if (rawText.indexOf('\n') >= 0) {
        textEl.innerHTML = escHtml(rawText).replace(/\n/g, '<br>');
      } else {
        textEl.textContent = rawText;
      }
      textEl.classList.remove('is-fading');
    }, 250);

    if (counterEl) {
      var pct = Math.round(((sentenceIndex + 1) / sentences.length) * 100);
      counterEl.textContent = (sentenceIndex + 1) + ' / ' + sentences.length + '  (' + pct + '%)';
    }
    var chapterLabel = document.getElementById('sr-bar-chapter-label');
    if (chapterLabel && s && s.chapterLabel) chapterLabel.textContent = s.chapterLabel;
    var prevBtn = document.getElementById('sr-bar-prev');
    var nextBtn = document.getElementById('sr-bar-next');
    if (prevBtn) prevBtn.setAttribute('aria-disabled', sentenceIndex <= 0 ? 'true' : 'false');
    if (nextBtn) nextBtn.setAttribute('aria-disabled', sentenceIndex === sentences.length - 1 ? 'true' : 'false');
  }

  // Build a map of chapter-local sentence indices for URL hashing
  function getSentenceLocalIndex(globalIdx) {
    var s = sentences[globalIdx];
    if (!s || !s.chapterId) return 0;
    var count = 0;
    for (var i = 0; i < globalIdx; i++) {
      if (sentences[i].chapterId === s.chapterId) count++;
    }
    return count;
  }

  function findSentenceByHash(hash) {
    // Format: #sentence/chapter-id/N
    var parts = hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'sentence' || !parts[1]) return -1;
    var chapterId = parts[1];
    var localIdx = parseInt(parts[2] || '0', 10);
    var count = 0;
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i].chapterId === chapterId) {
        if (count === localIdx) return i;
        count++;
      }
    }
    // Fallback: first sentence of the chapter
    for (var j = 0; j < sentences.length; j++) {
      if (sentences[j].chapterId === chapterId) return j;
    }
    return -1;
  }

  function updateBreadcrumbForSentence() {
    if (sentenceIndex < 0) return;
    var s = sentences[sentenceIndex];
    if (!s) return;
    // Update breadcrumb label (but suppress its hash update)
    window._suppressHashUpdate = true;
    if (s.chapterId && window._breadcrumbSetActive) {
      window._breadcrumbSetActive(s.chapterId);
    }
    window._suppressHashUpdate = false;
    // Set the sentence-specific URL hash
    var chapterId = s.chapterId || 'cover';
    var localIdx = s.chapterId ? getSentenceLocalIndex(sentenceIndex) : 0;
    history.replaceState(null, '', '#sentence/' + chapterId + '/' + localIdx);
  }

  function goToSentenceIndex(idx) {
    if (idx < -1 || idx >= sentences.length) return;
    transitioning = true;
    sentenceIndex = idx;
    renderSentence(1);
    updateBreadcrumbForSentence();
    setTimeout(function () { transitioning = false; }, 280);
  }

  function go(delta) {
    if (transitioning) return;
    var next = sentenceIndex + delta;
    // Back from first sentence → go to cover page
    if (next < 0 && delta < 0) {
      var navMount = document.getElementById('site-nav-mount');
      var coverUrl = navMount ? (navMount.getAttribute('data-book-url') || '/') : '/';
      window.location.href = coverUrl;
      return;
    }
    if (next >= sentences.length) return;
    transitioning = true;
    sentenceIndex = next;
    renderSentence(delta);
    updateBreadcrumbForSentence();
    setTimeout(function () { transitioning = false; }, 280);
  }

  // Expose for breadcrumb chapter dropdown
  window._sentenceGoToChapter = function (chapterId) {
    if (currentMode !== 'sentence') return;
    extractSentences();
    // Find first sentence with this chapterId
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i].chapterId === chapterId && sentences[i].type === 'heading') {
        goToSentenceIndex(i);
        return;
      }
    }
    // Fallback: find any sentence with this chapterId
    for (var j = 0; j < sentences.length; j++) {
      if (sentences[j].chapterId === chapterId) {
        goToSentenceIndex(j);
        return;
      }
    }
  };

  var savedBottomBarHTML = null;

  function setupSentenceBottomBar() {
    var bottomBar = document.querySelector('.bottom-bar');
    if (!bottomBar) return;
    var inner = bottomBar.querySelector('.bottom-bar-inner');
    if (!inner) return;

    savedBottomBarHTML = inner.innerHTML;
    inner.innerHTML =
      '<a class="ch-prev" id="sr-bar-prev" role="button" aria-label="Previous sentence"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></a>' +
      '<div class="bottom-bar-sentence-info">' +
        '<span class="bottom-bar-chapter" id="sr-bar-chapter-label">Loading...</span>' +
        '<span class="bottom-bar-sentence-sep">&middot;</span>' +
        '<span class="bottom-bar-sentence-counter" id="sr-bar-counter">0 / 0</span>' +
      '</div>' +
      '<a class="ch-next" id="sr-bar-next" role="button" aria-label="Next sentence"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>';

    document.getElementById('sr-bar-prev').addEventListener('click', function () { go(-1); });
    document.getElementById('sr-bar-next').addEventListener('click', function () { go(1); });

    bottomBar.classList.add('sentence-mode');
    bottomBar.style.transform = 'translateY(0)';
  }

  function enterSentenceMode() {
    try { sessionStorage.setItem('pdc-mode', 'sentence'); } catch (e) {}
    buildReader();
    setupSentenceBottomBar();

    // Show loading state
    reader.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    window._sentenceModeActive = true;

    // Show keyboard hint toast
    var toast = document.createElement('div');
    toast.className = 'sentence-toast';
    toast.innerHTML = 'Use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> arrow keys to navigate';
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 3000);

    extractAllChapters(function () {
      if (!sentences.length) return;

      // Start at first sentence unless deep-linking to a specific sentence
      sentenceIndex = 0;

      // Restore from URL hash
      var hash = window.location.hash;
      if (hash.indexOf('#sentence/') === 0) {
        var restored = findSentenceByHash(hash);
        if (restored >= 0) sentenceIndex = restored;
      }

      renderSentence(1);
    });
  }

  // Jump to a chapter's first sentence (used by TOC in sentence mode)
  function goToChapterInSentenceMode(chapterLabel) {
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i].chapterLabel === chapterLabel) {
        sentenceIndex = i;
        renderSentence(1);
        return true;
      }
    }
    return false;
  }

  // Expose for TOC interception
  window._sentenceGoToChapter = null;

  // Intercept TOC overlay clicks when in sentence mode
  document.addEventListener('click', function (e) {
    if (!window._sentenceModeActive) return;
    var link = e.target.closest('.toc-overlay-list a');
    if (!link) return;
    var text = link.textContent.trim();
    // Skip cover link
    if (text.toLowerCase() === 'cover') return;
    if (goToChapterInSentenceMode(text)) {
      e.preventDefault();
      var tocOverlay = document.getElementById('toc-overlay');
      if (tocOverlay) tocOverlay.classList.remove('is-open');
    }
  });

  function exitSentenceMode() {
    try { sessionStorage.removeItem('pdc-mode'); } catch (e) {}
    window._sentenceModeActive = false;
    window._sentenceGoToChapter = null;
    if (reader) {
      reader.classList.remove('is-active');
    }
    document.body.style.overflow = '';
    var topNav = document.getElementById('top-nav');
    if (topNav) topNav.classList.remove('is-locked');

    // Restore bottom bar
    var bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) {
      bottomBar.classList.remove('sentence-mode');
      var inner = bottomBar.querySelector('.bottom-bar-inner');
      if (inner && savedBottomBarHTML) {
        inner.innerHTML = savedBottomBarHTML;
      }
    }

    // Scroll to the chapter the user was reading
    if (sentenceIndex >= 0 && sentences[sentenceIndex] && sentences[sentenceIndex].chapterId) {
      var h = document.getElementById(sentences[sentenceIndex].chapterId);
      if (h) {
        window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 60);
      }
    }
  }

  // Auto-enter sentence mode if URL hash says so
  if (window._autoEnterSentenceMode) {
    currentMode = 'sentence';
    modeCurrentLabel.textContent = 'Sentence at a Time';
    modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'sentence'); });
    enterSentenceMode();
  }

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (currentMode !== 'sentence' && currentMode !== 'illustrated') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentMode === 'illustrated') ilHideNav();
      go(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentMode === 'illustrated') ilHideNav();
      go(-1);
    } else if (e.key === 'Escape') {
      currentMode = 'scroll';
      modeCurrentLabel.textContent = 'Scroll';
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'scroll'); });
      exitSentenceMode();
      exitIllustratedMode();
    }
  });

  // Mouse move shows nav bars, auto-hides after timeout
  document.addEventListener('mousemove', function () {
    if (currentMode !== 'illustrated') return;
    if (!ilNavVisible) ilShowNav();
    else {
      clearTimeout(ilNavTimeout);
      ilNavTimeout = setTimeout(ilHideNav, 3000);
    }
  });

  // Swipe navigation (touch)
  var touchStartX = 0;
  var touchStartY = 0;
  var SWIPE_THRESHOLD = 50;

  document.addEventListener('touchstart', function (e) {
    if (currentMode !== 'sentence' && currentMode !== 'illustrated') return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (currentMode !== 'sentence' && currentMode !== 'illustrated') return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;

    if (currentMode === 'illustrated') {
      // TikTok-style: vertical swipe to navigate, tap to toggle UI
      if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.2) {
        ilHideNav();
        if (dy < 0) go(1);   // Swipe up = next
        else go(-1);          // Swipe down = prev
      } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        // Tap: toggle navigation overlay
        ilToggleNav();
      }
      return;
    }

    // Sentence mode: original horizontal swipe + tap behavior
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) go(1);
      else go(-1);
    } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      var tapX = e.changedTouches[0].clientX;
      if (tapX > window.innerWidth * 0.35) go(1);
      else go(-1);
    }
  }, { passive: true });

  // ── ILLUSTRATED MODE NAV OVERLAY & TOAST ─────────────────────────────────

  var ilNavVisible = false;
  var ilNavTimeout = null;

  function ilToggleNav() {
    if (ilNavVisible) ilHideNav();
    else ilShowNav();
  }

  function ilShowNav() {
    ilNavVisible = true;
    var siteNav = document.getElementById('site-nav-mount');
    var bottomBar = document.querySelector('.bottom-bar');
    if (siteNav) siteNav.classList.add('il-nav-show');
    if (bottomBar) bottomBar.classList.remove('il-bar-hidden');
    clearTimeout(ilNavTimeout);
    ilNavTimeout = setTimeout(ilHideNav, 4000);
  }

  function ilHideNav() {
    ilNavVisible = false;
    var siteNav = document.getElementById('site-nav-mount');
    var bottomBar = document.querySelector('.bottom-bar');
    if (siteNav) siteNav.classList.remove('il-nav-show');
    if (bottomBar) bottomBar.classList.add('il-bar-hidden');
    clearTimeout(ilNavTimeout);
  }

  function ilIsMobile() { return window.innerWidth <= 768; }

  function ilShowToast() {
    if (!ilIsMobile()) return; // Toast only on mobile
    try {
      if (sessionStorage.getItem('pdc-il-toast-shown')) return;
      sessionStorage.setItem('pdc-il-toast-shown', '1');
    } catch (e) {}
    var toast = document.createElement('div');
    toast.className = 'il-toast';
    toast.textContent = 'Swipe up to continue reading. Tap to navigate or exit.';
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('il-toast-visible');
    });
    setTimeout(function () {
      toast.classList.remove('il-toast-visible');
      setTimeout(function () { toast.remove(); }, 500);
    }, 3500);
  }

  // ── ILLUSTRATED MODE ──────────────────────────────────────────────────────

  var illustratedReader = null;
  var ilSavedBottomBarHTML = null;
  var ilManifest = null;          // loaded from pd/manifest.json
  var ilFallback = null;          // per-chapter fallback: {src, caption, url, positions}
  var ilPersistent = false;       // when true, images cycle instead of being consumed
  var ilCompletedSrcs = {};       // images that were shown then left — can never return
  var ilCurrentSrc = null;        // the image currently being shown
  var ilLastSrc = null;           // last successfully loaded image src
  var ilLastPanPos = null;        // last pan position for fallback panning
  var ilLastCaption = '';
  var ilLastPosition = null;      // {left, top} from open-space detection
  var ilKbIndex = 0;
  var ilSlot = 'a';             // which img slot is currently active ('a' or 'b')
  var ilLastMode = null;      // 'thought' | 'collage' | null
  var ilChapterOffset = 0;    // sentences in chapters before this one
  var ilGlobalTotal = 0;      // total sentences across all chapters
  var ilNextChapterUrl = null;
  var ilPrevChapterUrl = null;
  var ilLastRowsKey = null;   // JSON key of last rendered rows (detects scene change)
  var ilThoughtMode = false;  // true when manifest uses {bg, scenes} format
  var IL_KB = ['il-kb1','il-kb2','il-kb3','il-kb4'];
  var IL_LOW_RES_SCALE = 1.5;

  function ilGetBookUrl() {
    var navMount = document.getElementById('site-nav-mount');
    return navMount ? (navMount.getAttribute('data-book-url') || '/') : '/';
  }

  // Load the manifest JSON once, then call cb(manifest)
  // Supports flat array (single chapter) or keyed object {"chapter-slug": [...]}
  function ilLoadManifest(cb) {
    if (ilManifest) { cb(ilManifest); return; }
    var url = ilGetBookUrl() + 'illustrations/pd/manifest.json';
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        if (Array.isArray(data)) {
          ilManifest = data;
        } else {
          // Extract chapter slug from URL path: /books/frankenstein/letter-1/ → 'letter-1'
          var pathParts = location.pathname.replace(/\/$/, '').split('/');
          var chapterSlug = pathParts[pathParts.length - 1];
          var chapterData = data && data[chapterSlug];
          if (Array.isArray(chapterData)) {
            ilManifest = chapterData;
          } else if (chapterData && Array.isArray(chapterData.images)) {
            // New format: {fallback: {...}, images: [...]}
            ilManifest = chapterData.images;
            ilFallback = chapterData.fallback || null;
            ilPersistent = !!chapterData.persistent;
          } else {
            ilManifest = [];
          }
        }
        cb(ilManifest);
      })
      .catch(function () { ilManifest = []; cb([]); });
  }

  // Deterministic image selection by sentence number.
  // Manifest images use "from" (1-based, matching #pb=N) to specify
  // which sentence an image starts at. The image persists until the
  // next "from" threshold. Fallback shows for sentences before the
  // first "from" value.
  function ilFindImage(text) {
    var found = null;
    var pbIndex = sentenceIndex + 1; // 1-based to match #pb=N
    if (ilManifest && ilManifest.length) {
      for (var i = 0; i < ilManifest.length; i++) {
        var entry = ilManifest[i];
        if (entry.from && pbIndex >= entry.from) {
          found = entry;
        }
      }
    }
    // No image matched yet — use fallback
    if (!found && ilFallback && ilFallback.src) {
      found = {
        src: ilFallback.src,
        caption: ilFallback.caption || '',
        url: ilFallback.url || '',
        cover: true
      };
    }
    if (found) ilCurrentSrc = found.src;
    return found;
  }

  // Snap-to-zone positioning: sample 5 fixed anchor zones, pick the calmest
  // Zones: top-centre, bottom-centre, left-mid, right-mid, centre
  var IL_ZONES = [
    { left: 50, top: 20 },   // top-centre
    { left: 50, top: 80 },   // bottom-centre
    { left: 22, top: 50 },   // left-mid
    { left: 78, top: 50 },   // right-mid
    { left: 50, top: 50 }    // centre
  ];

  function ilFindOpenRegion(img) {
    try {
      var SAMPLE = 120;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = SAMPLE;
      var ctx = canvas.getContext('2d');
      var best = { variance: Infinity, zone: IL_ZONES[4] };

      for (var z = 0; z < IL_ZONES.length; z++) {
        var zone = IL_ZONES[z];
        // Sample a 30%×25% region of the image centred on the zone
        var rx = (zone.left / 100 - 0.15) * img.naturalWidth;
        var ry = (zone.top  / 100 - 0.125) * img.naturalHeight;
        var rw = 0.30 * img.naturalWidth;
        var rh = 0.25 * img.naturalHeight;
        ctx.drawImage(img, rx, ry, rw, rh, 0, 0, SAMPLE, SAMPLE);
        var data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
        var sum = 0, n = data.length / 4;
        for (var i = 0; i < data.length; i += 4)
          sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        var mean = sum / n, vsum = 0;
        for (var i = 0; i < data.length; i += 4) {
          var b = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          vsum += (b - mean) * (b - mean);
        }
        if (vsum / n < best.variance) best = { variance: vsum / n, zone: zone };
      }
      return best.zone;
    } catch (e) { return null; }
  }

  function ilApplyTextPosition() {
    // CSS handles all positioning — nothing to do here
  }

  function ilApplyKenBurns(img) {
    var name = IL_KB[ilKbIndex % IL_KB.length];
    ilKbIndex++;
    img.style.animationName           = name;
    img.style.animationDuration       = '28s';
    img.style.animationTimingFunction = 'ease-in-out';
    img.style.animationIterationCount = 'infinite';
    img.style.animationDirection      = 'alternate';
    img.style.animationFillMode       = 'both';
  }

  function buildIllustratedReader() {
    if (illustratedReader) return illustratedReader;

    illustratedReader = document.createElement('div');
    illustratedReader.className = 'illustrated-reader';
    illustratedReader.id = 'illustrated-reader';
    illustratedReader.innerHTML =
      '<div class="il-img-wrap" id="il-img-wrap">' +
        '<img id="il-img-a" alt="">' +
        '<img id="il-img-b" alt="">' +
        '<video id="il-video" muted loop playsinline></video>' +
      '</div>' +
      '<div class="il-grid" id="il-grid"></div>' +
      '<div class="il-overlay" id="il-overlay">' +
        '<div class="il-text-box" id="il-text-box">' +
          '<div class="il-text" id="il-text"></div>' +
        '</div>' +
        '<div class="il-caption" id="il-caption"></div>' +
      '</div>' +
      '<div class="il-nav-overlay" id="il-nav-overlay">' +
        '<div class="il-nav-inner">' +
          '<span class="il-nav-chapter" id="il-nav-chapter"></span>' +
          '<span class="il-nav-counter" id="il-nav-counter"></span>' +
        '</div>' +
        '<div class="il-nav-actions">' +
          '<button class="il-nav-btn" id="il-nav-prev" aria-label="Previous">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
          '</button>' +
          '<button class="il-nav-btn il-nav-exit" id="il-nav-exit" aria-label="Exit Picture Book">Exit</button>' +
          '<button class="il-nav-btn" id="il-nav-next" aria-label="Next">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(illustratedReader);

    // Wire nav overlay buttons
    document.getElementById('il-nav-prev').addEventListener('click', function (e) { e.stopPropagation(); go(-1); ilHideNav(); });
    document.getElementById('il-nav-next').addEventListener('click', function (e) { e.stopPropagation(); go(1); ilHideNav(); });
    document.getElementById('il-nav-exit').addEventListener('click', function (e) {
      e.stopPropagation();
      ilHideNav();
      currentMode = 'scroll';
      modeCurrentLabel.textContent = 'Chapter';
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'scroll'); });
      exitIllustratedMode();
    });

    return illustratedReader;
  }

  // ── Thought mode renderer: fixed bg, floating thought images ──
  function renderThoughtIllustrated(entry, s) {
    if (ilLastMode !== 'thought') {
      ilLastMode = 'thought';
      illustratedReader.classList.add('il-thought');
      illustratedReader.classList.remove('il-portrait','il-small','il-no-image','il-collage');

      // Load persistent bg once
      var bgSrc = ilGetBookUrl() + 'illustrations/' + ilManifest.bg;
      var imgEl = document.getElementById('il-bg');
      if (imgEl && imgEl.getAttribute('src') !== bgSrc) {
        imgEl.src = bgSrc;
        imgEl.onload = function() { imgEl.classList.add('il-bg-visible'); };
        if (imgEl.complete && imgEl.naturalWidth > 0) imgEl.classList.add('il-bg-visible');
      }
    }

    var textEl     = document.getElementById('il-text');
    var bubbleEl   = document.getElementById('il-thought-bubble');
    var bubbleImg  = document.getElementById('il-thought-img');
    var captionEl  = document.getElementById('il-thought-caption');
    var tooltipEl  = document.getElementById('il-info-tooltip');
    var infoEl     = document.getElementById('il-info');

    // Fade text
    if (textEl) textEl.classList.add('il-fading');

    // Handle thought image: new image, explicit clear, or carry-forward
    var newThoughtSrc = (entry && entry.thought)
      ? (ilGetBookUrl() + 'illustrations/' + entry.thought)
      : null;
    var explicitlyClear = entry && !entry.thought;

    if (newThoughtSrc && newThoughtSrc !== ilLastSrc) {
      if (bubbleEl) bubbleEl.classList.remove('il-thought-visible');
      var thisSrc = newThoughtSrc;
      var thisEntry = entry;
      setTimeout(function () {
        if (!bubbleImg) return;
        bubbleImg.onload = function () {
          if (bubbleEl) bubbleEl.classList.add('il-thought-visible');
        };
        bubbleImg.src = thisSrc;
        ilLastSrc = thisSrc;
        ilLastCaption = thisEntry.caption || '';
        if (captionEl) captionEl.textContent = ilLastCaption;
        if (tooltipEl) tooltipEl.textContent = ilLastCaption;
        if (infoEl) {
          if (ilLastCaption) infoEl.classList.add('il-info-visible');
          else infoEl.classList.remove('il-info-visible');
        }
      }, 250);
    } else if (explicitlyClear && ilLastSrc) {
      if (bubbleEl) bubbleEl.classList.remove('il-thought-visible');
      ilLastSrc = null;
      ilLastCaption = '';
      if (infoEl) infoEl.classList.remove('il-info-visible');
    }
    // else: carry forward — keep current thought visible

    // Update text
    setTimeout(function () {
      if (!textEl) return;
      if (s.type === 'heading') {
        textEl.className = 'il-text il-heading';
        textEl.textContent = s.text;
      } else if (s.type === 'epigraph') {
        textEl.className = 'il-text il-epigraph';
        textEl.textContent = s.text;
      } else {
        textEl.className = 'il-text';
        if (s.text.indexOf('\n\n') >= 0) {
          textEl.innerHTML = s.text.split('\n\n').map(function(p) {
            return '<p style="margin:0 0 1em">' + escHtml(p).replace(/\n/g, '<br>') + '</p>';
          }).join('');
        } else if (s.text.indexOf('\n') >= 0) {
          textEl.innerHTML = escHtml(s.text).replace(/\n/g, '<br>');
        } else {
          textEl.textContent = s.text;
        }
      }
      textEl.classList.remove('il-fading');
    }, 200);
  }

  // Show title-only cover slide (no image grid)
  function ilShowGrid() {
    var imgA  = document.getElementById('il-img-a');
    var imgB  = document.getElementById('il-img-b');
    var capEl = document.getElementById('il-caption');
    if (imgA) { imgA.classList.remove('il-img-visible', 'il-img-shrink'); imgA.src = ''; }
    if (imgB) { imgB.classList.remove('il-img-visible', 'il-img-shrink'); imgB.src = ''; }
    if (capEl) capEl.innerHTML = '';
    // Reset so returning from the grid always reloads the image
    ilLastSrc = null;
    ilSlot = 'a';
    if (illustratedReader) illustratedReader.classList.add('il-title-slide');
  }

  // Restore normal image-left / text-right layout
  function ilHideGrid() {
    if (illustratedReader) illustratedReader.classList.remove('il-title-slide');
  }

  // Fetch all chapters in the background to compute global sentence offset + total
  function ilComputeGlobalCounts() {
    var chapters = getChapterUrls();
    if (!chapters.length) { ilGlobalTotal = sentences.length; return; }
    var currentPath = location.pathname.replace(/\/$/, '');
    var counts = new Array(chapters.length);
    var pending = chapters.length;
    chapters.forEach(function (ch, idx) {
      fetch(ch.url)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var article = doc.getElementById('main-content');
          var chTitle = doc.title.split('—')[0].trim();
          counts[idx] = { url: ch.url, count: extractSentencesFromElement(article, chTitle).length };
        })
        .catch(function () { counts[idx] = { url: ch.url, count: 0 }; })
        .then(function () {
          if (--pending > 0) return;
          var offset = 0, total = 0, found = false;
          for (var i = 0; i < counts.length; i++) {
            if (!counts[i]) continue;
            var chPath = counts[i].url.replace(/\/$/, '');
            if (chPath === currentPath) found = true;
            if (!found) offset += counts[i].count;
            total += counts[i].count;
          }
          ilChapterOffset = offset;
          ilGlobalTotal = total;
          // Refresh counter with global numbers
          var counterEl = document.getElementById('sr-bar-counter');
          if (counterEl) {
            var gpos = ilChapterOffset + sentenceIndex + 1;
            var pct = Math.round((gpos / ilGlobalTotal) * 100);
            counterEl.textContent = gpos + ' / ' + ilGlobalTotal + '  (' + pct + '%)';
          }
        });
    });
  }

  // Update URL hash to reflect current picture book position (1-based, matching footer display)
  function ilUpdateHash() {
    try {
      history.replaceState(null, '', location.pathname + '#pb=' + (sentenceIndex + 1));
    } catch (e) {}
  }

  function renderIllustrated() {
    var s = sentences[sentenceIndex];
    if (!s) return;

    // Update URL hash for deep-linking
    ilUpdateHash();

    // Update bottom bar
    var counterEl = document.getElementById('sr-bar-counter');
    var chLabelEl = document.getElementById('sr-bar-chapter-label');
    var prevBtn   = document.getElementById('sr-bar-prev');
    var nextBtn   = document.getElementById('sr-bar-next');
    if (counterEl) {
      var gpos = ilChapterOffset + sentenceIndex + 1;
      var gtotal = ilGlobalTotal || sentences.length;
      var pct = Math.round((gpos / gtotal) * 100);
      counterEl.textContent = gpos + ' / ' + gtotal + '  (' + pct + '%)';
    }
    if (chLabelEl && s.chapterLabel) chLabelEl.textContent = s.chapterLabel;
    if (prevBtn) prevBtn.setAttribute('aria-disabled', (sentenceIndex <= 0 && !ilPrevChapterUrl) ? 'true' : 'false');
    if (nextBtn) nextBtn.setAttribute('aria-disabled', sentenceIndex === sentences.length - 1 ? 'true' : 'false');

    var entry  = ilFindImage(s.text);
    var textEl = document.getElementById('il-text');
    var textBox = document.getElementById('il-text-box');
    var capEl  = document.getElementById('il-caption');

    // Slide text out on mobile, fade on desktop
    if (textBox && ilIsMobile() && ilSwipeDir !== 0) {
      textBox.classList.remove('il-slide-up', 'il-slide-down', 'il-slide-enter-up', 'il-slide-enter-down');
      textBox.classList.add(ilSwipeDir > 0 ? 'il-slide-up' : 'il-slide-down');
    } else if (textEl) {
      textEl.classList.add('il-fading');
    }

    // Always use image+text layout (no title slide grid)
    ilHideGrid();

    // Cross-fade to new image or video
    var newSrc = entry ? (ilGetBookUrl() + 'illustrations/' + entry.src) : null;
    var isVideo = newSrc && /\.(mp4|webm|mov)(\?|$)/i.test(newSrc);
    var videoEl = document.getElementById('il-video');

    if (newSrc && newSrc !== ilLastSrc) {
      var thisSrc    = newSrc;
      var thisCap    = entry.caption || '';
      var thisUrl    = entry.url || '';
      var thisCover  = !!(entry && entry.cover);
      var thisPos    = entry.position || '';

      if (isVideo) {
        // Show video, hide image slots
        var imgA = document.getElementById('il-img-a');
        var imgB = document.getElementById('il-img-b');
        if (imgA) imgA.classList.remove('il-img-visible');
        if (imgB) imgB.classList.remove('il-img-visible');
        if (videoEl) {
          videoEl.src = thisSrc;
          videoEl.style.objectPosition = thisPos;
          videoEl.classList.add('il-img-visible');
          videoEl.play().catch(function () {});
        }
        ilLastSrc = thisSrc;
      } else {
        // Hide video if it was playing
        if (videoEl) {
          videoEl.classList.remove('il-img-visible');
          videoEl.pause();
        }
        var nextSlot   = ilSlot === 'a' ? 'b' : 'a';
        var nextEl     = document.getElementById('il-img-' + nextSlot);
        var currEl     = document.getElementById('il-img-' + ilSlot);
        var probe      = new Image();
        probe.onload   = function () {
          probe.onload = null;
          ilLastSrc     = thisSrc;
          ilLastCaption = thisCap;

          nextEl.src = thisSrc;
          nextEl.classList.remove('il-img-visible', 'il-img-cover', 'il-kb-b', 'il-img-shrink', 'il-img-panning');
          nextEl.style.objectPosition = thisPos;
          void nextEl.offsetWidth;
          if (thisCover) nextEl.classList.add('il-img-cover');
          ilKbIndex++;
          if (ilKbIndex % 2 === 0) nextEl.classList.add('il-kb-b');

          nextEl.classList.add('il-img-visible');
          if (currEl) currEl.classList.remove('il-img-visible');

          setTimeout(function () {
            ilSlot = nextSlot;
          }, 1500);
        };
        probe.src = thisSrc;
        if (probe.complete) probe.onload && probe.onload();
      }
    }

    // Update text after slide-out / fade
    var slideDelay = (textBox && ilIsMobile() && ilSwipeDir !== 0) ? 250 : 200;
    setTimeout(function () {
      if (!textEl) return;
      if (s.type === 'heading') {
        textEl.className = 'il-text il-heading';
        textEl.textContent = s.text;
      } else if (s.type === 'epigraph') {
        textEl.className = 'il-text il-epigraph';
        textEl.textContent = s.text;
      } else {
        textEl.className = 'il-text';
        if (s.text.indexOf('\n\n') >= 0) {
          textEl.innerHTML = s.text.split('\n\n').map(function(p) {
            return '<p style="margin:0 0 1em">' + escHtml(p).replace(/\n/g, '<br>') + '</p>';
          }).join('');
        } else if (s.text.indexOf('\n') >= 0) {
          textEl.innerHTML = escHtml(s.text).replace(/\n/g, '<br>');
        } else {
          textEl.textContent = s.text;
        }
      }
      textEl.classList.remove('il-fading');
      // Slide new text in from opposite direction
      if (textBox && ilIsMobile() && ilSwipeDir !== 0) {
        textBox.classList.remove('il-slide-up', 'il-slide-down');
        textBox.classList.add(ilSwipeDir > 0 ? 'il-slide-enter-up' : 'il-slide-enter-down');
        void textBox.offsetWidth; // force reflow
        textBox.classList.remove('il-slide-enter-up', 'il-slide-enter-down');
      }
    }, slideDelay);
  }

  function enterIllustratedMode() {
    try { sessionStorage.setItem('pdc-mode', 'illustrated'); } catch (e) {}
    buildIllustratedReader();

    // Capture prev/next chapter URLs before replacing the bottom bar
    var bottomBar = document.querySelector('.bottom-bar');
    ilNextChapterUrl = null;
    ilPrevChapterUrl = null;
    ilChapterOffset = 0;
    ilGlobalTotal = 0;
    ilCompletedSrcs = {};
    ilPersistent = false;
    ilCurrentSrc = null;
    if (bottomBar) {
      var chNextEl = bottomBar.querySelector('.ch-next');
      var chPrevEl = bottomBar.querySelector('.ch-prev');
      if (chNextEl) ilNextChapterUrl = chNextEl.getAttribute('href');
      if (chPrevEl) ilPrevChapterUrl = chPrevEl.getAttribute('href');
    }

    if (bottomBar) {
      var inner = bottomBar.querySelector('.bottom-bar-inner');
      if (inner) ilSavedBottomBarHTML = inner.innerHTML;
    }

    // Hide top nav on both mobile and desktop
    var siteNav = document.getElementById('site-nav-mount');
    if (siteNav) siteNav.classList.add('il-nav-hidden');

    if (ilIsMobile()) {
      // Mobile: hide bottom bar entirely
      if (bottomBar) bottomBar.style.display = 'none';
    } else {
      // Desktop: keep bottom bar with sentence navigation, but hidden initially
      if (bottomBar && bottomBar.querySelector('.bottom-bar-inner')) {
        var inner = bottomBar.querySelector('.bottom-bar-inner');
        inner.innerHTML =
          '<a class="ch-prev" id="sr-bar-prev" role="button" aria-label="Previous sentence"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></a>' +
          '<div class="bottom-bar-sentence-info">' +
            '<span class="bottom-bar-chapter" id="sr-bar-chapter-label">Loading...</span>' +
            '<span class="bottom-bar-sentence-sep">&middot;</span>' +
            '<span class="bottom-bar-sentence-counter" id="sr-bar-counter">0 / 0</span>' +
          '</div>' +
          '<a class="ch-next" id="sr-bar-next" role="button" aria-label="Next sentence"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>';
        document.getElementById('sr-bar-prev').addEventListener('click', function () { go(-1); });
        document.getElementById('sr-bar-next').addEventListener('click', function () { go(1); });
        bottomBar.classList.add('sentence-mode');
        bottomBar.classList.add('il-bar-hidden');
        bottomBar.style.transform = 'translateY(0)';
      }
    }

    ilLastSrc = null;
    ilLastCaption = '';
    ilSlot = 'a';
    var imgA = document.getElementById('il-img-a');
    var imgB = document.getElementById('il-img-b');
    if (imgA) { imgA.src = ''; imgA.classList.remove('il-img-visible', 'il-img-cover', 'il-kb-b', 'il-img-shrink'); }
    if (imgB) { imgB.src = ''; imgB.classList.remove('il-img-visible', 'il-img-cover', 'il-kb-b', 'il-img-shrink'); }
    illustratedReader.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    window._sentenceModeActive = true;

    ilLoadManifest(function () {
      // Picture book uses sentences (same as sentence mode)
      sentences = [];
      extractSentencesFromCurrentPage();
      if (!sentences.length) return;
      // Deep-link: if URL has #pb=N (1-based), start at that sentence
      var hashMatch = location.hash.match(/^#pb=(\d+)$/);
      var startIdx = hashMatch ? Math.min(parseInt(hashMatch[1], 10) - 1, sentences.length - 1) : 0;
      if (startIdx < 0) startIdx = 0;
      sentenceIndex = startIdx;
      renderIllustrated();
      ilShowToast();
      // Fetch all chapters in background to compute global count
      ilComputeGlobalCounts();
    });
  }

  function exitIllustratedMode() {
    if (!illustratedReader) return;
    try { sessionStorage.removeItem('pdc-mode'); } catch (e) {}
    window._sentenceModeActive = false;
    illustratedReader.classList.remove('is-active');
    document.body.style.overflow = '';
    // Clear picture book hash from URL
    try { history.replaceState(null, '', location.pathname); } catch (e) {}

    // Restore bottom bar and top nav
    var bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) {
      bottomBar.style.display = '';
      bottomBar.classList.remove('sentence-mode');
      bottomBar.classList.remove('il-bar-hidden');
      var inner = bottomBar.querySelector('.bottom-bar-inner');
      if (inner && ilSavedBottomBarHTML) inner.innerHTML = ilSavedBottomBarHTML;
    }
    var siteNav = document.getElementById('site-nav-mount');
    if (siteNav) { siteNav.classList.remove('il-nav-hidden'); siteNav.classList.remove('il-nav-show'); }
    clearTimeout(ilNavTimeout);

    if (sentenceIndex >= 0 && sentences[sentenceIndex] && sentences[sentenceIndex].chapterId) {
      var h = document.getElementById(sentences[sentenceIndex].chapterId);
      if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 60);
    }
  }

  // go() illustrated override + #pb= auto-enter
  var ilSwipeDir = 0; // +1 = next (swipe up), -1 = prev (swipe down)
  var _originalGo = go;
  go = function (delta) {
    if (currentMode === 'illustrated') {
      if (transitioning) return;
      ilSwipeDir = delta;
      var next = sentenceIndex + delta;
      if (next >= sentences.length && ilNextChapterUrl) { window.location.href = ilNextChapterUrl + '#pb=1'; return; }
      if (next < 0 && ilPrevChapterUrl) { window.location.href = ilPrevChapterUrl + '#pb=99999'; return; }
      if (next < 0 || next >= sentences.length) return;
      transitioning = true;
      sentenceIndex = next;
      renderIllustrated();
      setTimeout(function () { transitioning = false; }, 280);
    } else {
      _originalGo(delta);
    }
  };
  if (window.PDC_ILLUSTRATED_ENABLED && /^#pb=\d+$/.test(location.hash) && document.querySelector('.article-body')) {
    setTimeout(function () {
      if (currentMode !== 'illustrated') {
        currentMode = 'illustrated';
        modeCurrentLabel.textContent = 'Picture Book';
        modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'illustrated'); });
        enterIllustratedMode();
      }
    }, 300);
  }

  // Auto-enter mode from sessionStorage when navigating between chapters
  // (skip if a URL-based trigger already handles it)
  if (!window._autoEnterSentenceMode && !/^#pb=\d+$/.test(location.hash)) {
    var _storedMode = null;
    try { _storedMode = sessionStorage.getItem('pdc-mode'); } catch (e) {}
    var _hasChapterContent = !!document.querySelector('.article-body');
    if (_storedMode === 'sentence' && _hasChapterContent) {
      currentMode = 'sentence';
      modeCurrentLabel.textContent = 'Sentence Focus';
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'sentence'); });
      enterSentenceMode();
    } else if (window.PDC_ILLUSTRATED_ENABLED && _storedMode === 'illustrated' && _hasChapterContent) {
      setTimeout(function () {
        if (currentMode !== 'illustrated') {
          currentMode = 'illustrated';
          modeCurrentLabel.textContent = 'Picture Book';
          modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'illustrated'); });
          enterIllustratedMode();
        }
      }, 300);
    }
  }

})();
