/* ============================================
   GORGEOUS DOCS — Document Template JS
   Side nav builder, scroll spy, accordion toggle
   ============================================ */

// Side nav — show after hero scrolls out of view
(function () {
  const nav = document.getElementById('side-nav');
  if (!nav) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const obs = new IntersectionObserver(([entry]) => {
    nav.classList.toggle('nav-visible', !entry.isIntersecting);
  }, { threshold: 0 });
  obs.observe(hero);
})();

// Side nav — build from h2 section headings + scroll spy
(function () {
  const nav = document.querySelector('#side-nav ul');
  if (!nav) return;

  const headings = Array.from(document.querySelectorAll('h2.section-heading[id]'));
  if (!headings.length) return;

  function cleanLabel(text) {
    return text.replace(/^[+\u2212]\s*/, '').trim();
  }

  const h2Links = [];

  headings.forEach(h2 => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h2.id;
    const fullText = cleanLabel(h2.textContent);
    const truncated = fullText.length > 38 ? fullText.slice(0, 35).trimEnd() + '\u2026' : fullText;
    a.textContent = truncated;
    if (fullText.length > 38) a.dataset.full = fullText;
    a.dataset.id = h2.id;
    li.appendChild(a);

    // Build sub-nav from h3 headings inside the section body
    let body = h2.nextElementSibling;
    while (body && !body.classList.contains('section-body')) body = body.nextElementSibling;
    if (body) {
      const h3s = Array.from(body.querySelectorAll('h3[id]'));
      if (h3s.length > 1) {
        const subUl = document.createElement('ul');
        subUl.className = 'sub-nav';
        h3s.forEach(h3 => {
          const subLi = document.createElement('li');
          const subA = document.createElement('a');
          subA.href = '#' + h3.id;
          const subText = h3.textContent.trim();
          subA.textContent = subText.length > 36 ? subText.slice(0, 33).trimEnd() + '\u2026' : subText;
          subA.dataset.id = h3.id;
          subA.addEventListener('click', e => {
            e.preventDefault();
            if (body.classList.contains('is-collapsed')) {
              body.classList.remove('is-collapsed');
              h2.classList.add('is-expanded');
            }
            setTimeout(() => h3.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
          });
          subLi.appendChild(subA);
          subUl.appendChild(subLi);
        });
        li.appendChild(subUl);
      }
    }

    nav.appendChild(li);
    h2Links.push(a);

    // Click on h2 nav link — expand and scroll
    a.addEventListener('click', e => {
      e.preventDefault();
      let navBody = h2.nextElementSibling;
      while (navBody && !navBody.classList.contains('section-body')) navBody = navBody.nextElementSibling;
      if (navBody && navBody.classList.contains('is-collapsed')) {
        navBody.classList.remove('is-collapsed');
        h2.classList.add('is-expanded');
      }
      setTimeout(() => h2.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    });
  });

  // Scroll spy — highlight active section in side nav
  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    h2Links.forEach(a => {
      const isActive = a.dataset.id === id;
      a.classList.toggle('active', isActive);
      // Show sub-nav for active section
      const subNav = a.parentElement.querySelector('.sub-nav');
      if (subNav) subNav.classList.toggle('is-visible', isActive);
    });
  }

  const visible = new Map();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity);
    });
    let best = null, bestTop = Infinity;
    visible.forEach((top, id) => {
      if (top >= 0 && top < bestTop) { bestTop = top; best = id; }
    });
    if (!best) {
      let lastPast = null;
      headings.forEach(h => {
        if (h.getBoundingClientRect().top < 60) lastPast = h.id;
      });
      best = lastPast;
    }
    if (best) setActive(best);
  }, {
    rootMargin: '-40px 0px -70% 0px',
    threshold: 0
  });

  headings.forEach(h => observer.observe(h));
})();

// Section accordion — toggle collapse on heading click
document.querySelectorAll('h2.section-heading').forEach(function (h2) {
  let body = h2.nextElementSibling;
  while (body && !body.classList.contains('section-body')) body = body.nextElementSibling;
  if (!body) return;

  h2.addEventListener('click', function () {
    const collapsed = body.classList.toggle('is-collapsed');
    h2.classList.toggle('is-expanded', !collapsed);
  });
});

// Footnote references — scroll to footnote on click, back on click
document.querySelectorAll('.footnote-ref').forEach(function (ref) {
  ref.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.getElementById(ref.getAttribute('href').slice(1));
    if (target) {
      // Expand the section if collapsed
      let parent = target.closest('.section-body');
      if (parent && parent.classList.contains('is-collapsed')) {
        parent.classList.remove('is-collapsed');
        const h2 = parent.previousElementSibling;
        if (h2) h2.classList.add('is-expanded');
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.background = '#fffde0';
      setTimeout(() => { target.style.background = ''; }, 2000);
    }
  });
});
