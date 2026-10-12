/* ALVELIONS MC cinematic atmosphere: stronger golden aurora, ember particles and visible lightning. */
(function () {
  'use strict';
  if (!document.body || !(document.body.classList.contains('theme-dashboard') || document.body.classList.contains('theme-home'))) return;
  if (document.querySelector('.av-atmosphere-underlay')) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var underlay = document.createElement('div');
  underlay.className = 'av-atmosphere-underlay';
  underlay.setAttribute('aria-hidden', 'true');
  var particleMarkup = '';
  var particles = [
    [7,17,2,0],[15,71,3,2],[22,36,2,1],[31,84,2,4],[38,15,3,3],
    [46,58,2,1],[54,25,2,5],[61,78,3,2],[68,43,2,4],[73,12,2,1],
    [81,65,3,3],[88,32,2,5],[94,80,2,2],[12,48,2,3],[42,92,2,0],
    [57,9,2,4],[77,91,2,1],[28,60,3,5]
  ];
  particles.forEach(function (p, i) {
    particleMarkup += '<span class="av-ember" style="--x:' + p[0] + '%;--y:' + p[1] + '%;--size:' + p[2] + 'px;--delay:' + p[3] + 's;--duration:' + (7 + (i % 5) * 2) + 's"></span>';
  });
  underlay.innerHTML = '<div class="av-aurora-orb av-aurora-orb-a"></div>' +
    '<div class="av-aurora-orb av-aurora-orb-b"></div>' +
    '<div class="av-aurora-orb av-aurora-orb-c"></div>' +
    '<div class="av-atmosphere-grid"></div>' + particleMarkup;
  // Keep the atmosphere above the body's background but behind the actual dashboard UI.
  document.body.insertBefore(underlay, document.body.firstChild);

  if (reduceMotion) return;

  var overlay = document.createElement('div');
  overlay.className = 'av-lightning-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="av-lightning-flash"></div>' +
    '<svg viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false" aria-hidden="true">' +
    '<path class="bolt bolt-main" d="M1260 -35 L1177 118 L1236 92 L1120 305 L1190 254 L1088 518 L1215 347 L1152 370 L1283 105 L1229 135 L1320 -12" />' +
    '<path class="bolt bolt-branch" d="M1177 118 L1064 170 L1123 174 L1065 239 M1190 254 L1295 303 L1235 306 L1288 377" />' +
    '<path class="bolt bolt-secondary" d="M260 -20 L214 91 L250 78 L191 199 L246 163 L205 277" />' +
    '</svg>';
  document.body.appendChild(overlay);

  var timer = null;
  var removeTimer = null;
  var strikeCount = 0;
  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }
  function strike() {
    if (document.visibilityState !== 'visible' || !isDark()) return;
    strikeCount += 1;
    overlay.classList.remove('is-striking', 'is-alternate');
    if (strikeCount % 2 === 0) overlay.classList.add('is-alternate');
    // Force reflow so the visual strike sequence replays every time.
    void overlay.offsetWidth;
    overlay.classList.add('is-striking');
    if (removeTimer) window.clearTimeout(removeTimer);
    removeTimer = window.setTimeout(function () {
      overlay.classList.remove('is-striking', 'is-alternate');
    }, 720);
  }
  function schedule() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    if (document.visibilityState !== 'visible') return;
    timer = window.setTimeout(function runStrike() {
      strike();
      timer = window.setTimeout(runStrike, 5000);
    }, 1000);
  }
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', function () {
    if (timer) window.clearTimeout(timer);
    if (removeTimer) window.clearTimeout(removeTimer);
  });
  schedule();
})();
