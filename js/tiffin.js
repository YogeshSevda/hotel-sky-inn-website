// Hotel Sky Inn — Daily Tiffin Booking
// Self-contained logic for the tiffin ordering widget on tiffin.html.
// No backend yet: "Confirm Booking" / "Start Monthly Plan" log the order
// payload to the console so it can be wired up to a real backend later.

(function () {
  'use strict';

  var BASE_PRICE = 80;
  var BAAHAR_PRICE = 15;

  // Shagun Thali: priced up from the old ₹20/₹10 scheme, but the early-bird
  // window still saves a real ₹15 (37.5% off) — attractive discount, higher
  // floor price either way.
  var SHAGUN_PRICE_EARLY = 25;
  var SHAGUN_PRICE_LATE = 40;
  var SHAGUN_DISCOUNT = SHAGUN_PRICE_LATE - SHAGUN_PRICE_EARLY;
  var EARLY_BIRD_CUTOFF_HOUR = 14; // 2:00 PM

  // Monthly plan: 30 tiffins for a fixed price, cheaper per-day than ordering
  // daily, with a discounted bulk rate to upgrade every tiffin to Shagun Thali.
  var MONTHLY_DAYS = 30;
  var MONTHLY_PRICE = 2100; // ~₹70/day, ₹300 cheaper than 30 × ₹80
  var MONTHLY_SHAGUN_PRICE = 600; // ₹20/day bulk rate — cheaper than any daily rate

  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Weekly menu — edit these values to change what's on offer.
  // "shagun" is the premium curry that the Shagun Thali upgrade swaps in.
  var TIFFIN_MENU = {
    Monday: { dal: 'Dal Fry', curries: ['Paneer Curry', 'Soya Chaap Masala'], shagun: 'Shahi Paneer' },
    Tuesday: { dal: 'Dal Tadka', curries: ['Mix Veg', 'Chana Masala'], shagun: 'Kadhai Paneer' },
    Wednesday: { dal: 'Dal Makhani', curries: ['Bhindi Masala', 'Rajma'], shagun: 'Malai Kofta' },
    Thursday: { dal: 'Dal Fry', curries: ['Aloo Gobi', 'Kadhi Pakora'], shagun: 'Butter Chicken' },
    Friday: { dal: 'Dal Tadka', curries: ['Paneer Bhurji', 'Chole Masala'], shagun: 'Paneer Lababdar' },
    Saturday: { dal: 'Dal Makhani', curries: ['Lauki Kofta', 'Egg Curry'], shagun: 'Butter Paneer' }
  };

  var state = {
    mode: 'daily',         // 'daily' | 'monthly'

    selectedDate: null,    // ISO yyyy-mm-dd
    selectedDay: null,     // 'Monday' etc.
    curryIndex: null,      // 0 or 1
    curryName: null,
    shagun: false,
    baahar: false,

    monthlyShagun: false,

    deliveryType: 'pickup', // 'pickup' | 'delivery'
    pickupZone: '',
    deliveryAddress: '',
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

    els.modeBtnDaily = document.getElementById('modeBtnDaily');
    els.modeBtnMonthly = document.getElementById('modeBtnMonthly');
    els.dailyPanel = document.getElementById('dailyPanel');
    els.monthlyPanel = document.getElementById('monthlyPanel');
    els.monthlyShagunToggle = document.getElementById('monthlyShagunToggle');

    els.deliveryTypePickup = document.getElementById('deliveryTypePickup');
    els.deliveryTypeDelivery = document.getElementById('deliveryTypeDelivery');
    els.pickupZoneField = document.getElementById('pickupZoneField');
    els.deliveryAddressField = document.getElementById('deliveryAddressField');
    els.pickupZone = document.getElementById('pickupZone');
    els.deliveryAddress = document.getElementById('deliveryAddress');

    els.roomInfo = document.getElementById('roomInfo');
    els.roomInfoHint = document.getElementById('roomInfoHint');
    els.breakdownList = document.getElementById('priceBreakdown');
    els.grandTotal = document.getElementById('grandTotal');
    els.grandTotalSticky = document.getElementById('grandTotalSticky');
    els.confirmBtn = document.getElementById('confirmBookingBtn');
    els.successNote = document.getElementById('bookingSuccessNote');
    els.closedNote = document.getElementById('kitchenClosedNote');

    buildDayStrip();
    wireModeSwitch();
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

  // ---------- Daily / Monthly mode switch ----------

  function wireModeSwitch() {
    if (!els.modeBtnDaily || !els.modeBtnMonthly) return;
    els.modeBtnDaily.addEventListener('click', function () { setMode('daily'); });
    els.modeBtnMonthly.addEventListener('click', function () { setMode('monthly'); });
  }

  function setMode(mode) {
    state.mode = mode;
    var isDaily = mode === 'daily';

    els.modeBtnDaily.classList.toggle('is-active', isDaily);
    els.modeBtnDaily.setAttribute('aria-selected', isDaily ? 'true' : 'false');
    els.modeBtnMonthly.classList.toggle('is-active', !isDaily);
    els.modeBtnMonthly.setAttribute('aria-selected', !isDaily ? 'true' : 'false');

    if (els.dailyPanel) els.dailyPanel.hidden = !isDaily;
    if (els.monthlyPanel) els.monthlyPanel.hidden = isDaily;

    if (els.confirmBtn) {
      els.confirmBtn.textContent = isDaily ? 'Confirm Booking' : 'Start Monthly Plan';
    }

    updateTotals();
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

    order.forEach(function (dayName, i) {
      var date = new Date(monday);
      date.setDate(monday.getDate() + i);
      var iso = formatISODate(date);
      var menu = TIFFIN_MENU[dayName];

      var isPast = iso < todayISO;
      var isToday = iso === todayISO;

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
    if (els.monthlyShagunToggle) {
      els.monthlyShagunToggle.addEventListener('change', function () {
        state.monthlyShagun = els.monthlyShagunToggle.checked;
        updateTotals();
      });
    }
  }

  // ---------- Pickup vs delivery + delivery fields ----------

  function wireDeliveryFields() {
    if (els.deliveryTypePickup) {
      els.deliveryTypePickup.addEventListener('change', function () {
        if (els.deliveryTypePickup.checked) setDeliveryType('pickup');
      });
    }
    if (els.deliveryTypeDelivery) {
      els.deliveryTypeDelivery.addEventListener('change', function () {
        if (els.deliveryTypeDelivery.checked) setDeliveryType('delivery');
      });
    }
    if (els.pickupZone) {
      els.pickupZone.addEventListener('change', function () {
        state.pickupZone = els.pickupZone.value;
        updateTotals();
      });
    }
    if (els.deliveryAddress) {
      els.deliveryAddress.addEventListener('input', function () {
        state.deliveryAddress = els.deliveryAddress.value.trim();
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

  function setDeliveryType(type) {
    state.deliveryType = type;
    var isPickup = type === 'pickup';
    if (els.pickupZoneField) els.pickupZoneField.hidden = !isPickup;
    if (els.deliveryAddressField) els.deliveryAddressField.hidden = isPickup;
    updateTotals();
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
        els.earlyBirdBanner.querySelector('.early-bird-text').textContent =
          'Book by 2:00 PM to save ₹' + SHAGUN_DISCOUNT + ' on the Shagun Thali!';
        if (els.earlyBirdCountdown) els.earlyBirdCountdown.textContent = left + ' left';
      } else {
        els.earlyBirdBanner.querySelector('.early-bird-text').textContent =
          'Early-bird window closed for today — Shagun Thali is ₹' + SHAGUN_PRICE_LATE + ' now.';
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
    var lines = [];
    var total;

    if (state.mode === 'monthly') {
      total = MONTHLY_PRICE;
      lines.push({ label: 'Monthly Tiffin Plan (' + MONTHLY_DAYS + ' days)', amount: MONTHLY_PRICE });
      if (state.monthlyShagun) {
        total += MONTHLY_SHAGUN_PRICE;
        lines.push({ label: 'Shagun Thali upgrade — every day', amount: MONTHLY_SHAGUN_PRICE });
      }
    } else {
      var istNow = getISTNow();
      var price = shagunPrice(istNow);
      total = BASE_PRICE;
      lines.push({ label: 'Core Tiffin', amount: BASE_PRICE });
      if (state.shagun) {
        total += price;
        lines.push({ label: 'Shagun Thali upgrade', amount: price });
      }
      if (state.baahar) {
        total += BAAHAR_PRICE;
        lines.push({ label: 'Baahar ka Tiffin', amount: BAAHAR_PRICE });
      }
    }

    if (els.breakdownList) {
      els.breakdownList.innerHTML = lines.map(function (l) {
        return '<li><span>' + l.label + '</span><span>₹' + l.amount + '</span></li>';
      }).join('');
    }
    if (els.grandTotal) els.grandTotal.textContent = '₹' + total;
    if (els.grandTotalSticky) els.grandTotalSticky.textContent = '₹' + total;

    var hasDropoffDetails = state.deliveryType === 'pickup' ? !!state.pickupZone : state.deliveryAddress.length > 0;
    var canConfirm = state.mode === 'monthly'
      ? hasDropoffDetails
      : !!state.curryName && hasDropoffDetails;

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

      if (state.mode === 'monthly') {
        var istNow = getISTNow();
        var payload = {
          order_type: 'monthly',
          start_date: formatISODate(istNow),
          shagun_upgrade: state.monthlyShagun,
          monthly_price: total,
          delivery_type: state.deliveryType,
          pickup_zone: state.deliveryType === 'pickup' ? state.pickupZone : null,
          delivery_address: state.deliveryType === 'delivery' ? state.deliveryAddress : null,
          room_no: state.roomInfo
        };

        // eslint-disable-next-line no-console
        console.log('Monthly tiffin plan started:', payload);

        if (els.successNote) {
          els.successNote.hidden = false;
          els.successNote.textContent = '🎉 Monthly plan started! ' +
            (state.monthlyShagun ? 'Shagun Thali every day, ' : '') +
            (state.deliveryType === 'pickup' ? 'pickup at ' + state.pickupZone : 'delivery to your address') +
            ' — total ₹' + total + '/month.';
          els.successNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      var dailyPayload = {
        date: state.selectedDate,
        selected_curry: state.curryName,
        shagun_plate: state.shagun,
        baahar_tiffin: state.baahar,
        total_price: total,
        delivery_type: state.deliveryType,
        pickup_zone: state.deliveryType === 'pickup' ? state.pickupZone : null,
        delivery_address: state.deliveryType === 'delivery' ? state.deliveryAddress : null,
        room_no: state.roomInfo
      };

      // eslint-disable-next-line no-console
      console.log('Tiffin booking confirmed:', dailyPayload);

      if (els.successNote) {
        els.successNote.hidden = false;
        els.successNote.textContent = '🎉 Order noted! ' + TIFFIN_MENU[state.selectedDay].dal + ' + ' + state.curryName +
          ' for ' + (state.deliveryType === 'pickup' ? 'pickup at ' + state.pickupZone : 'delivery to your address') +
          '. We’ll have it ready — total ₹' + total + '.';
        els.successNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
