/* ============================================
   PUBLIC DOMAIN CLASSICS — Document Template JS
   Breadcrumb chapter nav, scroll spy, back-to-top
   ============================================ */

// ── URL HASH ROUTING — unique URL per chapter ──
(function () {
  var headings = document.querySelectorAll('h2.section-heading[id]');
  if (!headings.length) return;

  if (window.location.hash) {
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
      window.scrollTo(0, h2.getBoundingClientRect().top + window.scrollY - 60);
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
    if (window._updateChapterHash) window._updateChapterHash(id);
  }

  var visible = new Map();
  var spyObserver = new IntersectionObserver(function (entries) {
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
  setActive(headings[0].id);
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
