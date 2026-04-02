/* ============================================
   COOKIE CONSENT — Google Consent Mode v2
   ============================================
   Must load BEFORE gtag/GTM scripts.
   Sets default consent to denied, shows banner
   if no stored preference, updates consent on
   user action.
   ============================================ */

(function () {
  'use strict';

  var GA_ID = 'G-X3J8M8XNSJ';
  var STORAGE_KEY = 'cookie_consent';

  // 1. Set consent defaults (denied) — must happen before gtag('config')
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  // 2. Check stored preference
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private browsing */ }

  if (stored === 'accepted') {
    gtag('consent', 'update', {
      analytics_storage: 'granted'
    });
  }
  // If 'declined' or 'accepted', no banner needed

  // 3. Configure GA (runs after consent state is set)
  gtag('js', new Date());
  gtag('config', GA_ID);

  // 4. Show banner if no stored preference
  if (!stored) {
    showBanner();
  }

  function showBanner() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createBanner);
    } else {
      createBanner();
    }
  }

  function createBanner() {
    var banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="consent-banner-inner">' +
        '<p class="consent-banner-text">' +
          'This site uses cookies for anonymous analytics to help improve the reading experience. ' +
          'No personal data is collected or shared with advertisers.' +
        '</p>' +
        '<div class="consent-banner-actions">' +
          '<button class="consent-btn consent-btn--decline" type="button">Decline</button>' +
          '<button class="consent-btn consent-btn--accept" type="button">Accept</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('is-visible');
      });
    });

    // Event handlers
    banner.querySelector('.consent-btn--accept').addEventListener('click', function () {
      savePreference('accepted');
      gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
      hideBanner(banner);
    });

    banner.querySelector('.consent-btn--decline').addEventListener('click', function () {
      savePreference('declined');
      hideBanner(banner);
    });
  }

  function hideBanner(banner) {
    banner.classList.remove('is-visible');
    banner.addEventListener('transitionend', function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    });
  }

  function savePreference(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private browsing */ }
  }
})();
