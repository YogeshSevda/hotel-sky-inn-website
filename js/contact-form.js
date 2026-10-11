// Hotel Sky Inn — Contact form (page-specific, only used on contact.html)
// Submits to Netlify Forms (so the enquiry actually reaches us — dashboard +
// email notification), then opens WhatsApp with the same message so the
// guest also has the fastest channel open if they want it. If JS fails for
// any reason, the <form>'s own action/method/data-netlify attributes still
// do a real POST and redirect to thank-you.html — no enquiry is lost either way.

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var statusEl = document.getElementById('form-status');
  var WHATSAPP_NUMBER = '919414038601';

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'form-status is-visible ' + (type === 'error' ? 'is-error' : 'is-success');
  }

  function encodeFormData(data) {
    return Object.keys(data)
      .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]); })
      .join('&');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot: if this hidden field got filled in, silently drop the submission (likely a bot)
    var honeypot = form.querySelector('[name="company"]');
    if (honeypot && honeypot.value.trim() !== '') {
      showStatus('Thanks — your message has been sent.', 'success');
      form.reset();
      return;
    }

    var name = form.querySelector('[name="name"]').value.trim();
    var phone = form.querySelector('[name="phone"]').value.trim();
    var email = form.querySelector('[name="email"]').value.trim();
    var dates = form.querySelector('[name="dates"]').value.trim();
    var message = form.querySelector('[name="message"]').value.trim();

    if (!name || !phone || !message) {
      showStatus('Please fill in your name, phone number, and message.', 'error');
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeFormData({
        'form-name': 'contact',
        name: name,
        phone: phone,
        email: email,
        dates: dates,
        message: message
      })
    })
      .then(function () {
        showStatus('Thanks — your message has been sent to us. Opening WhatsApp too, in case you want a faster reply.', 'success');
      })
      .catch(function () {
        // Netlify Forms submission failed (offline, blocked, etc.) — WhatsApp still works below,
        // so the guest's enquiry still reaches us even if this particular channel didn't.
        showStatus('Opening WhatsApp with your message ready to send — just hit send there to reach us.', 'success');
      })
      .then(function () {
        var lines = [
          'Hi, I\'d like to enquire about a room at Hotel Sky Inn.',
          'Name: ' + name,
          'Phone: ' + phone
        ];
        if (email) lines.push('Email: ' + email);
        if (dates) lines.push('Dates: ' + dates);
        lines.push('Message: ' + message);

        var text = encodeURIComponent(lines.join('\n'));
        var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + text;
        window.open(url, '_blank', 'noopener');

        if (submitBtn) submitBtn.disabled = false;
        form.reset();
      });
  });
});
