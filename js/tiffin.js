// Hotel Sky Inn — Daily Tiffin Booking
// Self-contained logic for the tiffin ordering widget on tiffin.html.
// No backend yet: "Confirm Booking" logs the order payload to the console
// (see buildPayload) so it can be wired up to a real backend later.

(function () {
  'use strict';

  var BASE_PRICE = 80;
  var BAAHAR_PRICE = 15;
  var SHAGUN_PRICE_EARLY = 10;
  var SHAGUN_PRICE_LATE = 20;
  var EARLY_BIRD_CUTOFF_HOUR = 14; // 2:00 PM

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Weekly menu — edit these values to change what's on offer.
  // "shagun" is the premium curry that the Shagun Plate upgrade swaps in.
  var TIFFIN_MENU = {
    Monday: { dal: 'Dal Fry', curries: ['Paneer Curry', 'Soya Chaap Masala'], shagun: 'Shahi Paneer' },
    Tuesday: { dal: 'Dal Tadka', curries: ['Mix Veg', 'Chana Masala'], shagun: 'Kadhai Paneer' },
    Wednesday: { dal: 'Dal Makhani', curries: ['Bhindi Masala', 'Rajma'], shagun: 'Malai Kofta' },
    Thursday: { dal: 'Dal Fry', curries: ['Aloo Gobi', 'Kadhi Pakora'], shagun: 'Butter Chicken' },
    Friday: { dal: 'Dal Tadka', curries: ['Paneer Bhurji', 'Chole Masala'], shagun: 'Paneer Lababdar' },
    Saturday: { dal: 'Dal Makhani', curries: ['Lauki Kofta', 'Egg Curry'], shagun: 'Butter Paneer' }
  };

  var state = {
    selectedDate: null,   // ISO yyyy-mm-dd
    selectedDay: null,    // 'Monday' etc.
    curryIndex: null,     // 0 or 1
    curryName: null,
    shagun: false,
    baahar: false,
    pickupZone: '',
    roomInfo: ''
  };

  var els = {};

  document.addEventListener('DOMContentLoaded', function () {
    var strip = document.getElementById('tiffinDayStrip');
    if (!strip) return; // tiffin widget isn't on this page

    els.strip = strip;
    els.summaryLine = document.getElementById('tiffinSummaryLine');
    els.earlyBirdBanner = document.getElementById('earlyBirdBanner');
    els.earlyBirdCountdown = document.getElementById('earlyBirdCountdown');
    els.shagunPriceTag = document.getElementById('shagunPriceTag');
    els.shagunToggle = document.getElementById('shagunToggle');
    els.baaharToggle = document.getElementById('baaharToggle');
    els.pickupZone = document.getElementById('pickupZone');
    els.roomInfo = document.getElementById('roomInfo');
    els.roomInfoHint = document.getElementById('roomInfoHint');
    els.breakdownList = document.getElementById('priceBreakdown');
    els.grandTotal = document.getElementById('grandTotal');
    els.grandTotalSticky = document.getElementById('grandTotalSticky');
    els.confirmBtn = document.getElementById('confirmBookingBtn');
    els.successNote = document.getElementById('bookingSuccessNote');
    els.closedNote = document.getElementById('kitchenClosedNote');

    buildDayStrip();
    wireUpgradeToggles();
    wireDeliveryFields();
    wireConfirmButton();
    tick(); // first paint of the early-bird banner + prices
    setInterval(tick, 15000); // keep countdown + 2pm cutoff live while the page is open
  });

  // ---------- Time helpers (IST, since the hotel and its guests are in Sikar) ----------

  function getISTNow() {
    var now = new Date();
    var istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(istString);
  }

  function formatISODate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function isEarlyBird(istNow) {
    return istNow.getHours() < EARLY_BIRD_CUTOFF_HOUR;
  }

  function shagunPrice(istNow) {
    return isEarlyBird(istNow) ? SHAGUN_PRICE_EARLY : SHAGUN_PRICE_LATE;
  }

  // ---------- Building the Monday–Saturday strip ----------

  function buildDayStrip() {
    var istNow = getISTNow();
    var todayISO = formatISODate(istNow);
    var dow = istNow.getDay(); // 0 = Sunday

    // Find this week's Monday. If it's Sunday, show the upcoming week instead
    // (the kitchen is closed Sundays, so there's nothing "current" to show).
    var mondayOffset = dow === 0 ? 1 : -(dow - 1);
    var monday = new Date(istNow);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    if (dow === 0 && els.closedNote) {
      els.closedNote.hidden = false;
    }

    var order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var frag = document.createDocumentFragment();
    var autoSelectDay = null;

    order.forEach(function (dayName, i) {
      var date = new Date(monday);
      date.setDate(monday.getDate() + i);
      var iso = formatISODate(date);
      var menu = TIFFIN_MENU[dayName];

      var isPast = iso < todayISO;
      var isToday = iso === todayISO;
      if (isToday) autoSelectDay = { dayName: dayName, iso: iso };

      var card = document.createElement('div');
      card.className = 'tiffin-day-card' + (isPast ? ' is-past' : '') + (isToday ? ' is-today' : '');
      card.dataset.day = dayName;
      card.dataset.date = iso;

      var dateLabel = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      card.innerHTML =
        '<div class="tiffin-day-head">' +
          '<span class="tiffin-day-name">' + DAY_SHORT[date.getDay()] + '</span>' +
          '<span class="tiffin-day-date">' + dateLabel + '</span>' +
          (isToday ? '<span class="tiffin-today-badge">Today</span>' : '') +
        '</div>' +
        '<p class="tiffin-day-dal">' + menu.dal + '</p>' +
        '<div class="tiffin-curry-choices">' +
          menu.curries.map(function (c, idx) {
            return '<button type="button" class="curry-choice" data-curry-index="' + idx + '"' + (isPast ? ' disabled' : '') + '>' +
              '<span class="curry-letter">' + (idx === 0 ? 'A' : 'B') + '</span> ' + c +
            '</button>';
          }).join('') +
        '</div>';

      if (isPast) {
        var closedTag = document.createElement('span');
        closedTag.className = 'tiffin-past-tag';
        closedTag.textContent = 'Closed';
        card.appendChild(closedTag);
      } else {
        card.querySelectorAll('.curry-choice').forEach(function (btn) {
          btn.addEventListener('click', function () {
            selectDayAndCurry(dayName, iso, parseInt(btn.dataset.curryIndex, 10));
          });
        });
      }

      frag.appendChild(card);
    });

    els.strip.innerHTML = '';
    els.strip.appendChild(frag);

    // Scroll today's card into view so it's visible without swiping.
    var todayCard = els.strip.querySelector('.is-today');
    if (todayCard) {
      todayCard.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  function selectDayAndCurry(dayName, iso, curryIndex) {
    state.selectedDay = dayName;
    state.selectedDate = iso;
    state.curryIndex = curryIndex;
    state.curryName = TIFFIN_MENU[dayName].curries[curryIndex];

    // update selected styling
    els.strip.querySelectorAll('.tiffin-day-card').forEach(function (card) {
      var isThisDay = card.dataset.date === iso;
      card.classList.toggle('is-selected', isThisDay);
      card.querySelectorAll('.curry-choice').forEach(function (btn, idx) {
        btn.classList.toggle('is-active', isThisDay && idx === curryIndex);
      });
    });

    updateSummary();
    updateTotals();
  }

  function updateSummary() {
    if (!els.summaryLine) return;
    if (!state.selectedDay) {
      els.summaryLine.textContent = 'Pick a day and a curry above to start your order.';
      els.summaryLine.classList.remove('is-set');
      return;
    }
    var istNow = getISTNow();
    var dateObj = new Date(state.selectedDate + 'T00:00:00');
    var dateLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
    var isToday = state.selectedDate === formatISODate(istNow);
    els.summaryLine.innerHTML = 'Ordering for <strong>' + dateLabel + (isToday ? ' (today)' : '') + '</strong> — ' +
      TIFFIN_MENU[state.selectedDay].dal + ' with <strong>' + state.curryName + '</strong>';
    els.summaryLine.classList.add('is-set');
  }

  // ---------- Upgrades ----------

  function wireUpgradeToggles() {
    if (els.shagunToggle) {
      els.shagunToggle.addEventListener('change', function () {
        state.shagun = els.shagunToggle.checked;
        updateTotals();
      });
    }
    if (els.baaharToggle) {
      els.baaharToggle.addEventListener('change', function () {
        state.baahar = els.baaharToggle.checked;
        updateTotals();
      });
    }
  }

  function wireDeliveryFields() {
    if (els.pickupZone) {
      els.pickupZone.addEventListener('change', function () {
        state.pickupZone = els.pickupZone.value;
        updateTotals();
      });
    }
    if (els.roomInfo) {
      els.roomInfo.addEventListener('input', function () {
        state.roomInfo = els.roomInfo.value.trim();
        if (els.roomInfoHint) {
          els.roomInfoHint.hidden = state.roomInfo.length > 0;
        }
      });
    }
  }

  // ---------- Live ticking: early-bird banner + price refresh ----------

  function tick() {
    var istNow = getISTNow();
    var early = isEarlyBird(istNow);
    var price = shagunPrice(istNow);

    if (els.earlyBirdBanner) {
      els.earlyBirdBanner.classList.toggle('is-late', !early);
      if (early) {
        var target = new Date(istNow);
        target.setHours(EARLY_BIRD_CUTOFF_HOUR, 0, 0, 0);
        var diffMs = target - istNow;
        var h = Math.floor(diffMs / 3600000);
        var m = Math.floor((diffMs % 3600000) / 60000);
        var left = h > 0 ? (h + 'h ' + m + 'm') : (m + 'm');
        els.earlyBirdBanner.querySelector('.early-bird-text').textContent = 'Book by 2:00 PM to save ₹10 on the Shagun Plate!';
        if (els.earlyBirdCountdown) els.earlyBirdCountdown.textContent = left + ' left';
      } else {
        els.earlyBirdBanner.querySelector('.early-bird-text').textContent = 'Early-bird window closed for today — Shagun Plate is ₹20 now.';
        if (els.earlyBirdCountdown) els.earlyBirdCountdown.textContent = '';
      }
    }

    if (els.shagunPriceTag) {
      els.shagunPriceTag.textContent = '+₹' + price;
      els.shagunPriceTag.classList.toggle('is-discounted', early);
    }

    updateTotals();
  }

  // ---------- Totals + submit gating ----------

  function updateTotals() {
    var istNow = getISTNow();
    var price = shagunPrice(istNow);
    var lines = [];
    var total = BASE_PRICE;
    lines.push({ label: 'Core Tiffin', amount: BASE_PRICE });

    if (state.shagun) {
      total += price;
      lines.push({ label: 'Shagun Plate upgrade', amount: price });
    }
    if (state.baahar) {
      total += BAAHAR_PRICE;
      lines.push({ label: 'Baahar ka Tiffin', amount: BAAHAR_PRICE });
    }

    if (els.breakdownList) {
      els.breakdownList.innerHTML = lines.map(function (l) {
        return '<li><span>' + l.label + '</span><span>₹' + l.amount + '</span></li>';
      }).join('');
    }
    if (els.grandTotal) {
      els.grandTotal.textContent = '₹' + total;
    }
    if (els.grandTotalSticky) {
      els.grandTotalSticky.textContent = '₹' + total;
    }

    var canConfirm = !!state.curryName && !!state.pickupZone;
    if (els.confirmBtn) {
      els.confirmBtn.disabled = !canConfirm;
    }

    return total;
  }

  function wireConfirmButton() {
    if (!els.confirmBtn) return;
    els.confirmBtn.addEventListener('click', function () {
      if (els.confirmBtn.disabled) return;

      if (!state.roomInfo) {
        if (els.roomInfoHint) els.roomInfoHint.hidden = false;
        if (els.roomInfo) els.roomInfo.focus();
        return;
      }

      var total = updateTotals();
      var payload = {
        date: state.selectedDate,
        selected_curry: state.curryName,
        shagun_plate: state.shagun,
        baahar_tiffin: state.baahar,
        total_price: total,
        pickup_zone: state.pickupZone,
        room_no: state.roomInfo
      };

      // eslint-disable-next-line no-console
      console.log('Tiffin booking confirmed:', payload);

      if (els.successNote) {
        els.successNote.hidden = false;
        els.successNote.textContent = '🎉 Order noted! ' + TIFFIN_MENU[state.selectedDay].dal + ' + ' + state.curryName +
          ' for pickup at ' + state.pickupZone + '. We’ll have it ready — total ₹' + total + '.';
        els.successNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
