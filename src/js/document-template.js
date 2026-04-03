/* ============================================
   PUBLIC DOMAIN CLASSICS — Document Template JS
   Breadcrumb chapter nav, scroll spy, back-to-top
   ============================================ */

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

  // If URL has a sentence hash, auto-enter sentence mode after page loads
  if (window.location.hash.indexOf('#sentence/') === 0) {
    window._autoEnterSentenceMode = true;
    window._sentenceModeActive = true; // suppress scroll spy immediately
  }
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

// ── BACK TO TOP + TOP NAV IDLE FADE ──
(function () {
  var article = document.getElementById('main-content');
  if (!article) return;

  // Create floating action buttons container
  var actions = document.createElement('div');
  actions.className = 'floating-actions';
  actions.id = 'floating-actions';

  // Fullscreen toggle
  var btnFs = document.createElement('button');
  btnFs.className = 'floating-btn';
  btnFs.title = 'Toggle fullscreen';
  btnFs.setAttribute('aria-label', 'Toggle fullscreen');
  var fsExpandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var fsCollapseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  btnFs.innerHTML = fsExpandIcon;
  actions.appendChild(btnFs);

  btnFs.addEventListener('click', function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', function () {
    btnFs.innerHTML = document.fullscreenElement ? fsCollapseIcon : fsExpandIcon;
    btnFs.title = document.fullscreenElement ? 'Exit fullscreen' : 'Toggle fullscreen';
  });

  // Back to top
  var btn = document.createElement('button');
  btn.className = 'floating-btn';
  btn.title = 'Back to top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  actions.appendChild(btn);

  document.body.appendChild(actions);

  btn.addEventListener('click', function () {
    window.scrollTo(0, 0);
  });

  // Scroll handler — show/hide button + top nav on scroll-up only
  var lastScrollY = 0;
  var ticking = false;

  function onScroll() {
    var scrolled = window.scrollY - article.offsetTop;
    var topNav = document.getElementById('top-nav');
    var scrollingUp = window.scrollY < lastScrollY;
    var nearTop = window.scrollY < 400;

    // Show floating buttons when past the hero
    if (scrolled > 200) {
      actions.classList.add('is-visible');
    } else {
      actions.classList.remove('is-visible');
    }

    // Top nav: show on scroll up or near top, hide on scroll down
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

  // Toggle dropdown
  modeToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    modeDropdown.classList.toggle('is-open');
  });
  document.addEventListener('click', function (e) {
    if (!modeDropdown.contains(e.target)) modeDropdown.classList.remove('is-open');
  });

  // Mode selection
  modeLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var mode = a.dataset.mode;
      if (mode === currentMode) { modeDropdown.classList.remove('is-open'); return; }
      currentMode = mode;
      modeCurrentLabel.textContent = a.textContent;
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === mode); });
      modeDropdown.classList.remove('is-open');

      if (mode === 'sentence') {
        enterSentenceMode();
      } else {
        exitSentenceMode();
      }
    });
  });

  // ── Sentence extraction ──
  var sentences = [];
  var sentenceIndex = -1;
  var reader = null;

  function extractSentences() {
    if (sentences.length) return sentences;
    var article = document.getElementById('main-content');
    if (!article) return [];

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

    // Walk all section headings and their body paragraphs
    var headings = Array.from(article.querySelectorAll('h2.section-heading'));

    // Fallback for individual chapter pages (no h2.section-heading)
    if (headings.length === 0) {
      var chapterTitle = document.querySelector('.book-header-chapter');
      var chapterId = chapterTitle ? chapterTitle.textContent.trim().toLowerCase().replace(/\s+/g, '-') : 'chapter';
      if (chapterTitle) {
        sentences.push({ text: chapterTitle.textContent.trim(), type: 'heading', chapterId: chapterId });
      }
      var bodies = article.querySelectorAll('.section-body');
      bodies.forEach(function (body) {
        extractFromBody(body, chapterId);
      });
    }

    headings.forEach(function (h2) {
      var label = h2.textContent.replace(/^[+\u2212]\s*/, '').trim();
      sentences.push({ text: label, type: 'heading', chapterId: h2.id });

      var body = h2.nextElementSibling;
      if (!body || !body.classList.contains('section-body')) return;
      extractFromBody(body, h2.id);
    });

    function extractFromBody(body, chapterId) {
      // Get all text-bearing elements
      var children = body.children;
      var c = 0;
      while (c < children.length) {
        var el = children[c];

        // Group consecutive salutation + dateline into one "sentence" with line breaks
        if (el.classList.contains('letter-salutation') || el.classList.contains('letter-dateline')) {
          var groupParts = [];
          while (c < children.length &&
            (children[c].classList.contains('letter-salutation') || children[c].classList.contains('letter-dateline'))) {
            var t = children[c].textContent.trim();
            if (t) groupParts.push(t);
            c++;
          }
          if (groupParts.length) {
            sentences.push({ text: groupParts.join('\n'), type: 'sentence', chapterId: chapterId });
          }
          continue;
        }

        // Poetry block — treat as one sentence with line breaks
        if (el.classList.contains('poetry-block')) {
          var lines = [];
          el.querySelectorAll('.poetry-line').forEach(function (pl) {
            var lt = pl.textContent.trim();
            if (lt) lines.push(lt);
          });
          if (lines.length) {
            sentences.push({ text: lines.join('\n'), type: 'sentence', chapterId: chapterId });
          }
          c++;
          continue;
        }

        // Poetry attribution — skip (context from poetry block)
        if (el.classList.contains('poetry-attribution')) {
          c++;
          continue;
        }

        // Regular paragraphs
        if (el.tagName === 'P') {
          var raw = el.textContent.trim();
          if (raw) {
            splitIntoSentences(raw, chapterId);
          }
        }

        c++;
      }
    }

    // (headings.forEach already calls extractFromBody above)

    var MAX_SENTENCE_LEN = 450;

    function maybeSplitLong(text, chapterId) {
      if (text.length <= MAX_SENTENCE_LEN) {
        sentences.push({ text: text, type: 'sentence', chapterId: chapterId });
        return;
      }
      // Split at clause boundaries: semicolons, colons, em-dashes, or commas near the midpoint
      var delimiters = /([;:\u2014—])\s+|,\s+(?=[a-z])/g;
      var bestSplit = -1;
      var mid = text.length / 2;
      var match;
      while ((match = delimiters.exec(text)) !== null) {
        var pos = match.index + match[0].length;
        if (bestSplit === -1 || Math.abs(pos - mid) < Math.abs(bestSplit - mid)) {
          bestSplit = pos;
        }
      }
      if (bestSplit > 40 && bestSplit < text.length - 40) {
        var part1 = text.substring(0, bestSplit).trim();
        var part2 = text.substring(bestSplit).trim();
        // Recursively split if still too long
        maybeSplitLong(part1, chapterId);
        maybeSplitLong(part2, chapterId);
      } else {
        // Can't find a good split point — just push it
        sentences.push({ text: text, type: 'sentence', chapterId: chapterId });
      }
    }

    // Common abbreviations that shouldn't end a sentence
    var ABBREVS = /(?:Mrs?|Ms|Dr|St|Jr|Sr|Prof|Rev|Gen|Col|Sgt|Lt|Mt|Ft|etc|vs|vol|ed|dept|div|approx)\.\s*/i;

    function splitIntoSentences(raw, chapterId) {
      // Protect abbreviations by temporarily replacing their periods
      var protected_ = raw.replace(/\b(Mrs?|Ms|Dr|St|Jr|Sr|Prof|Rev|Gen|Col|Sgt|Lt|Mt|Ft)\.\s/gi, function(m, abbr) {
        return abbr + '\x00 ';
      });
      var parts = protected_.match(/[^.!?]*[.!?]+(?=\s+[A-Z"\u201c\u2018(]|$)/g);
      // Restore periods
      if (parts) {
        parts = parts.map(function(p) { return p.replace(/\x00/g, '.'); });
      }
      if (!parts || parts.length === 0) {
        maybeSplitLong(raw, chapterId);
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
          maybeSplitLong(trimmed, chapterId);
        }
      });
    }

    return sentences;
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

    // No cover slide — go straight to sentences
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

    if (counterEl) counterEl.textContent = (sentenceIndex + 1) + ' / ' + sentences.length;
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
    if (next < -1 || next >= sentences.length) return;
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

  function enterSentenceMode() {
    extractSentences();
    if (!sentences.length) return;

    buildReader();

    // Swap bottom bar to sentence mode
    var bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) {
      var inner = bottomBar.querySelector('.bottom-bar-inner');
      if (inner) {
        savedBottomBarHTML = inner.innerHTML;
        inner.innerHTML =
          '<a class="ch-prev" id="sr-bar-prev" role="button" aria-label="Previous sentence"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></a>' +
          '<div class="bottom-bar-sentence-info">' +
            '<span class="bottom-bar-sentence-counter" id="sr-bar-counter">0 / ' + sentences.length + '</span>' +
            '<span class="bottom-bar-sentence-hint">Use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> arrow keys</span>' +
          '</div>' +
          '<a class="ch-next" id="sr-bar-next" role="button" aria-label="Next sentence"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>';
        document.getElementById('sr-bar-prev').addEventListener('click', function () { go(-1); });
        document.getElementById('sr-bar-next').addEventListener('click', function () { go(1); });
      }
      bottomBar.classList.add('sentence-mode');
      bottomBar.style.transform = 'translateY(0)';
    }

    // Start at first sentence (skip cover slide)
    sentenceIndex = 0;

    // Restore from URL hash if it's a sentence hash
    var hash = window.location.hash;
    if (hash.indexOf('#sentence/') === 0) {
      var restored = findSentenceByHash(hash);
      if (restored >= 0) sentenceIndex = restored;
    }

    renderSentence(1);
    if (sentenceIndex >= 0) updateBreadcrumbForSentence();
    window._sentenceModeActive = true;
    reader.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    var topNav = document.getElementById('top-nav');
    if (topNav) topNav.classList.add('is-locked');
  }

  function exitSentenceMode() {
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
    if (currentMode !== 'sentence') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'Escape') {
      // Switch back to scroll mode
      currentMode = 'scroll';
      modeCurrentLabel.textContent = 'Scroll';
      modeLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.mode === 'scroll'); });
      exitSentenceMode();
    }
  });

  // Swipe navigation (touch)
  var touchStartX = 0;
  var touchStartY = 0;
  var SWIPE_THRESHOLD = 50;

  document.addEventListener('touchstart', function (e) {
    if (currentMode !== 'sentence') return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (currentMode !== 'sentence') return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        go(1);  // swipe left = next
      } else {
        go(-1); // swipe right = prev
      }
    }
  }, { passive: true });
})();
