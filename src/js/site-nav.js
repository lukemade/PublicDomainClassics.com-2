/* ============================================
   SITE NAV — Shared navigation component
   ============================================
   Injects site nav HTML into a mount point.
   Usage: <nav id="site-nav-mount" data-book-title="Frankenstein"
               data-book-url="/books/frankenstein/"></nav>
   Omit data-book-title for homepage (no centered title).
   ============================================ */
(function () {
  'use strict';

  function init() {
    var mount = document.getElementById('site-nav-mount');
    if (!mount) return;

  var bookTitle = mount.getAttribute('data-book-title') || '';
  var bookUrl = mount.getAttribute('data-book-url') || '';

  mount.className = 'site-nav';
  mount.setAttribute('aria-label', 'Site navigation');

  var titleLink = bookTitle
    ? '<a href="' + bookUrl + '" class="book-title-link">' + bookTitle.toUpperCase() + '</a>'
    : '';

  mount.innerHTML =
    '<div class="site-nav-inner">' +
      '<a href="/" class="site-nav-brand">' +
        '<img class="brand-logo" src="/assets/logo.svg" alt="Public Domain Classics">' +
      '</a>' +
      '<span class="brand-beta">Beta</span>' +
      titleLink +
    '</div>';
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
