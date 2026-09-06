// Hotel Sky Inn — Contact form (page-specific, only used on contact.html)
// No backend: builds a pre-filled WhatsApp message from the form fields and opens it.

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var statusEl = document.getElementById('form-status');
  var WHATSAPP_NUMBER = '919414038601';

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'form-status is-visible ' + (type === 'error' ? 'is-error' : 'is-success');
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

    showStatus('Opening WhatsApp with your message ready to send — just hit send there to reach us.', 'success');
    window.open(url, '_blank', 'noopener');
  });
});
