/* ============================================
   BOOK CHROME — Page Shell Behavior
   ============================================
   Scroll hide/show for nav + bottom bar,
   cover image slideshow, TOC overlay,
   download dropdown.
   ============================================ */
(function () {
  'use strict';

  // ── Scroll hide/show for nav + bottom bar ──
  var siteNav = document.querySelector('.site-nav');
  var bottomBar = document.querySelector('.bottom-bar');
  var lastScrollY = 0;
  if (siteNav) siteNav.style.transition = 'transform 0.3s ease';
  if (bottomBar) bottomBar.style.transition += ', transform 0.3s ease';

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var nearBottom = docHeight > 0 && y / docHeight >= 0.9;
    if (y > lastScrollY && y > 100 && !nearBottom) {
      if (siteNav) siteNav.style.transform = 'translateY(-100%)';
      if (bottomBar) bottomBar.style.transform = 'translateY(100%)';
    } else {
      if (siteNav) siteNav.style.transform = 'translateY(0)';
      if (bottomBar) bottomBar.style.transform = 'translateY(0)';
    }
    lastScrollY = y;
  }, { passive: true });

  // ── Cover slideshow in chapter headers ──
  var headerCovers = document.querySelectorAll('.book-header:not(.is-cover) .book-header-cover');
  if (headerCovers.length > 1) {
    var hci = 0;
    setInterval(function () {
      headerCovers[hci].classList.remove('is-active');
      hci = (hci + 1) % headerCovers.length;
      headerCovers[hci].classList.add('is-active');
    }, 3000);
  }

  // ── Cover page hero slideshow ──
  var heroImgs = document.querySelectorAll('.cover-hero-img img');
  if (heroImgs.length > 1) {
    var idx = 0;
    setInterval(function () {
      heroImgs[idx].classList.remove('is-active');
      idx = (idx + 1) % heroImgs.length;
      heroImgs[idx].classList.add('is-active');
    }, 3000);
  }

  // ── Author headshot slideshow ──
  var heads = document.querySelectorAll('.author-headshot img');
  if (heads.length > 1) {
    var hi = 0;
    setInterval(function () {
      heads[hi].classList.remove('is-active');
      hi = (hi + 1) % heads.length;
      heads[hi].classList.add('is-active');
    }, 4000);
  }

  // ── TOC overlay ──
  // TOC overlay close handlers (opened by nav-toc-btn in site-nav.js)
  var tocClose = document.getElementById('toc-close');
  var tocOverlay = document.getElementById('toc-overlay');
  if (tocOverlay) {
    if (tocClose) tocClose.addEventListener('click', function () { tocOverlay.classList.remove('is-open'); });
    tocOverlay.addEventListener('click', function (e) {
      if (e.target === tocOverlay) tocOverlay.classList.remove('is-open');
    });
  }

  // ── Download dropdown ──
  var dlToggle = document.getElementById('download-toggle');
  var dlMenu = document.getElementById('download-menu');
  if (dlToggle && dlMenu) {
    dlToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dlMenu.classList.toggle('is-open');
      dlToggle.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function (e) {
      if (!dlMenu.contains(e.target) && e.target !== dlToggle) {
        dlMenu.classList.remove('is-open');
        dlToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Escape closes TOC + download menu ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (tocOverlay) tocOverlay.classList.remove('is-open');
      if (dlMenu) dlMenu.classList.remove('is-open');
    }
  });
})();
