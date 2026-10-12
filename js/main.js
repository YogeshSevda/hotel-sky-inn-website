// Hotel Sky Inn — shared site behavior (no framework, no build step)

document.addEventListener('DOMContentLoaded', function () {
  renderRoomRates();

  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // close the mobile menu after a nav link is chosen
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  initHeaderScrollState();
  initScrollReveal();
  initLogoPopup();
});

// Clicking the logo mark (header or footer) opens an enlarged view instead
// of navigating away — the brand NAME text next to it still links home.
function initLogoPopup() {
  var marks = document.querySelectorAll('.brand-mark');
  if (!marks.length) return;

  var overlay, popupImg;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'logo-popup';
    overlay.innerHTML =
      '<div class="logo-popup-card" role="dialog" aria-modal="true" aria-label="Hotel Sky Inn logo">' +
        '<button type="button" class="logo-popup-close" aria-label="Close">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
        '<img src="assets/logo.png" alt="Hotel Sky Inn logo">' +
      '</div>';
    document.body.appendChild(overlay);
    popupImg = overlay.querySelector('img');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.logo-popup-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
  }

  function open() {
    if (!overlay) build();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.logo-popup-close').focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  marks.forEach(function (mark) {
    mark.setAttribute('tabindex', '0');
    mark.setAttribute('role', 'button');
    mark.setAttribute('aria-label', 'View Hotel Sky Inn logo larger');
    mark.style.cursor = 'zoom-in';

    mark.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open();
    });
    mark.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        open();
      }
    });
  });
}

// Adds/removes .is-scrolled on the header so it can pick up a subtle
// shadow/backdrop once the page has scrolled past the hero.
function initHeaderScrollState() {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function update() {
    if (window.scrollY > 12) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
}

// Fades/slides elements marked .reveal (and staggers children of
// .reveal-stagger) into place as they enter the viewport. Falls back to
// showing everything immediately if IntersectionObserver isn't available.
function initScrollReveal() {
  var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-stagger'));
  if (!targets.length) return;

  if (typeof window.IntersectionObserver === 'undefined') {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) { observer.observe(el); });

  // Safety net: if anything above the fold fails to trigger (unlikely, but
  // cheap to guard against), reveal it after a short delay rather than
  // leaving content permanently invisible.
  window.setTimeout(function () {
    targets.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('is-visible');
      }
    });
  }, 1200);
}

// Fills in [data-rate-room] elements from assets/data/rates.js, if present
// on the page. Editing rates.js is all that's needed to change displayed
// prices — this function just reads and inserts them.
function renderRoomRates() {
  if (typeof window.HOTEL_RATES === 'undefined') return;

  var rates = window.HOTEL_RATES;
  var els = document.querySelectorAll('[data-rate-room]');

  els.forEach(function (el) {
    var key = el.getAttribute('data-rate-room');
    var room = rates.rooms[key];
    if (!room) return;

    var amountEl = el.querySelector('[data-rate-amount]');
    var noteEl = el.querySelector('[data-rate-note]');

    if (amountEl) {
      amountEl.textContent = rates.currencySymbol + room.amount.toLocaleString('en-IN') + ' ' + rates.period;
    }
    if (noteEl && room.note) {
      noteEl.textContent = room.note;
    }
  });
}
