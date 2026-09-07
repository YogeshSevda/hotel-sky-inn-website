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
});

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
