/* ============================================
   SITE NAV — Shared navigation component
   ============================================
   Injects site nav HTML into a mount point.
   Usage: <nav id="site-nav-mount" data-book-title="Frankenstein"
               data-book-url="/books/frankenstein/"></nav>
   Omit data-book-title for homepage (no centered title).
   Add data-settings="true" to show the settings cog (chapter pages).
   ============================================ */
(function () {
  'use strict';

  function init() {
    var mount = document.getElementById('site-nav-mount');
    if (!mount) return;

    var bookTitle = mount.getAttribute('data-book-title') || '';
    var bookUrl = mount.getAttribute('data-book-url') || '';
    var showSettings = mount.getAttribute('data-settings') === 'true';

    mount.className = 'site-nav';
    mount.setAttribute('aria-label', 'Site navigation');

    var titleLink = bookTitle
      ? '<a href="' + bookUrl + '" class="book-title-link">' + bookTitle.toUpperCase() + '</a>'
      : '';

    var navActionsHtml = '';
    if (showSettings) {
      var tocBtnHtml =
        '<button class="nav-toc-btn" id="nav-toc-btn" aria-label="Table of contents">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="12" r="1" fill="#C25335" stroke="none"/><circle cx="4" cy="18" r="1" fill="#C25335" stroke="none"/></svg>' +
        '</button>';
      var settingsBtnHtml =
        '<div id="mode-dropdown" class="settings-dropdown" style="position:relative">' +
          '<button id="mode-toggle" class="settings-btn" aria-label="Reading settings" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="12" cy="12" r="3"/>' +
              '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
            '</svg>' +
            '<span class="mode-current" style="display:none">Chapter</span>' +
          '</button>' +
          '<div class="settings-panel mode-dropdown-list">' +
            '<div class="settings-section-label">Reading Mode</div>' +
            '<a href="#" data-mode="scroll" class="settings-option active">' +
              '<span class="settings-option-name">Chapter</span>' +
              '<span class="settings-option-desc">Read by scrolling through the full text</span>' +
            '</a>' +
            '<a href="#" data-mode="sentence" class="settings-option">' +
              '<span class="settings-option-name">Sentence Focus</span>' +
              '<span class="settings-option-desc">Focus on one sentence at a time</span>' +
            '</a>' +
          '</div>' +
        '</div>';
      navActionsHtml =
        '<div class="nav-actions">' +
          tocBtnHtml +
          settingsBtnHtml +
        '</div>';
    }

    mount.innerHTML =
      '<div class="site-nav-inner">' +
        '<a href="/" class="site-nav-brand">' +
          '<img class="brand-logo" src="/assets/logo.svg" alt="Public Domain Classics">' +
        '</a>' +
        titleLink +
        navActionsHtml +
      '</div>';

    // Wire up TOC button
    var tocBtn = document.getElementById('nav-toc-btn');
    if (tocBtn) {
      tocBtn.addEventListener('click', function () {
        var overlay = document.getElementById('toc-overlay');
        if (overlay) overlay.classList.add('is-open');
      });
    }
  }

  // Run immediately if mount exists, otherwise wait for DOM
  if (document.getElementById('site-nav-mount')) {
    init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
