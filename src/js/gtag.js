/* ============================================
   GOOGLE TAGS — GA4 + Google Ads + Conversion
   ============================================
   Single source for all Google tag configuration.
   Loaded after cookie-consent.js sets consent defaults.
   ============================================ */
(function () {
  'use strict';

  var GA_ID = 'G-X3J8M8XNSJ';
  var ADS_ID = 'AW-835823373';
  var CONVERSION_LABEL = 'AW-835823373/67QnCKC-vJQcEI3Oxo4D';

  // Ensure dataLayer and gtag exist (cookie-consent.js creates them)
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () { dataLayer.push(arguments); };
  }

  // Load gtag.js library
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ADS_ID;
  document.head.appendChild(script);

  // Configure tags
  gtag('js', new Date());
  gtag('config', ADS_ID);
  gtag('config', GA_ID);

  // Page view conversion event
  gtag('event', 'conversion', { 'send_to': CONVERSION_LABEL });
})();
