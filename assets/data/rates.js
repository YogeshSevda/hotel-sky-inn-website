/* =========================================================
   Hotel Sky Inn — Room Rates
   =========================================================
   EDIT THIS FILE TO UPDATE PRICES ON THE WEBSITE.
   Change only the numbers below — nothing else needs to change,
   and the update applies everywhere the rate is shown.

   "amount"   — the per-night rate in whole rupees (no commas, no symbol)
   "note"     — short text shown under the price (e.g. "+ taxes", or leave "")
   currently interim rates converted from the hotel's MakeMyTrip
   OTA listing (AUD -> INR) — replace with the real direct rate
   whenever it's confirmed.
   ========================================================= */

window.HOTEL_RATES = {
  currencySymbol: "₹",
  period: "per night",
  lastUpdated: "2026-09-06",
  rooms: {
    deluxe: {
      amount: 2500,
      note: "approx., taxes extra"
    },
    superDeluxe: {
      amount: 3000,
      note: "approx., taxes extra"
    }
  }
};
