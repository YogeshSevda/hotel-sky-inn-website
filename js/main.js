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
});

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
