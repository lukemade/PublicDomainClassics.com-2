/* ============================================
   READING SETTINGS MODAL
   ============================================
   Shared modal for selecting reading mode.
   Used by:
     1. "Begin Reading" / "cover-cta" links on the cover page
     2. The settings cog on chapter pages (via window.openReadingModal)
   ============================================ */
(function () {
  'use strict';

  // ── Build modal DOM ──────────────────────────────────────────
  function buildModal() {
    var overlay = document.createElement('div');
    overlay.id = 'rdg-overlay';
    overlay.className = 'rdg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'rdg-title');

    overlay.innerHTML =
      '<div class="rdg-modal">' +
        '<button class="rdg-close" id="rdg-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
        '<div id="rdg-title" class="rdg-title">Reading Settings</div>' +
        '<div class="rdg-modes">' +
          '<button class="rdg-mode-card" data-mode="scroll" type="button">' +
            '<div class="rdg-radio"></div>' +
            '<div class="rdg-mode-name">Chapter</div>' +
            '<div class="rdg-mode-desc">Scroll through the full chapter text</div>' +
          '</button>' +
          '<button class="rdg-mode-card" data-mode="sentence" type="button">' +
            '<div class="rdg-radio"></div>' +
            '<div class="rdg-mode-name">Sentence Focus</div>' +
            '<div class="rdg-mode-desc">Read one sentence at a time</div>' +
          '</button>' +
          (window.PDC_ILLUSTRATED_ENABLED ?
          '<button class="rdg-mode-card rdg-mode-card--wide" data-mode="illustrated" type="button">' +
            '<div class="rdg-radio"></div>' +
            '<div class="rdg-mode-name">Picture Book</div>' +
            '<div class="rdg-mode-desc">One sentence at a time with paintings</div>' +
          '</button>' : '') +
        '</div>' +
        '<button class="rdg-cta" id="rdg-cta" type="button">Begin Reading &rarr;</button>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  var overlay = null;
  var _onConfirm = null;
  var _destHref = null;
  var _selectedMode = 'scroll';
  var _isCover = false;

  function getOverlay() {
    if (!overlay) overlay = buildModal();
    return overlay;
  }

  function setMode(mode) {
    _selectedMode = mode;
    var cards = getOverlay().querySelectorAll('.rdg-mode-card');
    cards.forEach(function (c) {
      c.classList.toggle('active', c.dataset.mode === mode);
    });
  }

  function open(opts) {
    // opts: { mode, href, onConfirm, isCover }
    opts = opts || {};
    _selectedMode = opts.mode || 'scroll';
    _destHref = opts.href || null;
    _onConfirm = opts.onConfirm || null;
    _isCover = !!opts.isCover;

    var ov = getOverlay();

    // Update CTA label
    var cta = ov.querySelector('#rdg-cta');
    cta.innerHTML = _isCover ? 'Begin Reading &rarr;' : 'Done';

    setMode(_selectedMode);

    // Show
    ov.classList.add('is-open');
    ov.querySelector('#rdg-close').focus();
  }

  function close() {
    getOverlay().classList.remove('is-open');
  }

  function confirm() {
    close();
    if (_onConfirm) {
      _onConfirm(_selectedMode);
    } else if (_destHref) {
      if (_selectedMode !== 'scroll') {
        sessionStorage.setItem('pdc-mode', _selectedMode);
      } else {
        sessionStorage.removeItem('pdc-mode');
      }
      window.location.href = _destHref;
    }
  }

  // ── Wire events (delegated, fires after DOM is ready) ────────
  function wireEvents() {
    var ov = getOverlay();

    // Close button
    ov.addEventListener('click', function (e) {
      if (e.target.closest('#rdg-close')) close();
    });

    // Backdrop click
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('is-open')) close();
    });

    // Mode card selection
    ov.addEventListener('click', function (e) {
      var card = e.target.closest('.rdg-mode-card');
      if (card) setMode(card.dataset.mode);
    });

    // CTA
    ov.querySelector('#rdg-cta').addEventListener('click', confirm);
  }

  // ── Intercept Begin Reading / cover-cta links ────────────────
  function interceptBeginReading() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('.begin-reading, .cover-cta');
      if (!link) return;
      e.preventDefault();
      var href = link.getAttribute('href');
      // Determine current stored mode to pre-select
      var stored = sessionStorage.getItem('pdc-mode') || 'scroll';
      open({ mode: stored, href: href, isCover: true });
    });
  }

  // ── Expose for document-template.js cog ─────────────────────
  window.openReadingModal = function (opts) {
    open(opts);
  };

  // ── Expose current mode for document-template.js ─────────────
  window._getReadingMode = function () {
    return _selectedMode;
  };

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    wireEvents();
    interceptBeginReading();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
