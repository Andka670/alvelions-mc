(function () {
  'use strict';
  var nav = document.getElementById('avDesktopNav');
  var progress = document.getElementById('avScrollProgressBar');
  if (!nav) return;
  var lastY = window.scrollY || 0;
  var ticking = false;
  var desktopQuery = window.matchMedia('(min-width: 900px)');

  function update() {
    var y = window.scrollY || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.width = Math.min(100, Math.max(0, y / max * 100)).toFixed(2) + '%';
    if (desktopQuery.matches) {
      nav.classList.toggle('av-nav-scrolled', y > 40);
      if (y <= 80) nav.classList.remove('av-nav-hidden');
      else if (y > lastY + 5) nav.classList.add('av-nav-hidden');
      else if (y < lastY - 5) nav.classList.remove('av-nav-hidden');
    } else {
      nav.classList.remove('av-nav-scrolled', 'av-nav-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('pageshow', update);
  update();
})();
