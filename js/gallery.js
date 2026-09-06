// Hotel Sky Inn — Gallery lightbox (page-specific, only used on gallery.html)

document.addEventListener('DOMContentLoaded', function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var lightbox = document.querySelector('.lightbox');
  if (!items.length || !lightbox) return;

  var img = lightbox.querySelector('.lightbox-figure img');
  var caption = lightbox.querySelector('.lightbox-caption');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');
  var currentIndex = 0;

  function open(index) {
    currentIndex = (index + items.length) % items.length;
    var item = items[currentIndex];
    var itemImg = item.querySelector('img');
    img.src = itemImg.src;
    img.alt = itemImg.alt;
    caption.textContent = item.getAttribute('data-caption') || '';
    lightbox.classList.add('is-open');
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
  }

  items.forEach(function (item, index) {
    item.addEventListener('click', function () { open(index); });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function () { open(currentIndex - 1); });
  nextBtn.addEventListener('click', function () { open(currentIndex + 1); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(currentIndex - 1);
    if (e.key === 'ArrowRight') open(currentIndex + 1);
  });
});
