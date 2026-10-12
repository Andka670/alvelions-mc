(function () {
  'use strict';

  // Automatic theme is based on WIB (Asia/Jakarta), regardless of the visitor device timezone.
  // Light 06:00-17:59 WIB; dark 18:00-05:59 WIB.
  var OVERRIDE_KEY = 'alvelions-theme-override-v5';
  var DAY_START = 6;
  var NIGHT_START = 18;
  var root = document.documentElement;
  var timer = null;

  function jakartaParts(date) {
    date = date || new Date();
    var formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    });
    var result = {};
    formatter.formatToParts(date).forEach(function (part) {
      if (part.type !== 'literal') result[part.type] = Number(part.value);
    });
    return result;
  }

  function jakartaHour(date) {
    try { return jakartaParts(date).hour; }
    catch (error) { return new Date(((date || new Date()).getTime()) + 7 * 60 * 60 * 1000).getUTCHours(); }
  }

  function autoTheme(date) {
    var hour = jakartaHour(date || new Date());
    return hour >= DAY_START && hour < NIGHT_START ? 'light' : 'dark';
  }

  // Return the next 06:00 or 18:00 WIB boundary as a Unix timestamp.
  // WIB is UTC+7 without daylight-saving transitions, so conversion is deterministic.
  function nextBoundary(date) {
    date = date || new Date();
    var parts = jakartaParts(date);
    var dayOffset = 0;
    var boundaryHour;
    if (parts.hour < DAY_START) {
      boundaryHour = DAY_START;
    } else if (parts.hour < NIGHT_START) {
      boundaryHour = NIGHT_START;
    } else {
      boundaryHour = DAY_START;
      dayOffset = 1;
    }
    // Convert Jakarta wall clock to UTC by subtracting seven hours.
    return Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, boundaryHour - 7, 0, 0, 0);
  }

  function readOverride() {
    try {
      var raw = localStorage.getItem(OVERRIDE_KEY);
      if (!raw) return null;
      var value = JSON.parse(raw);
      if (!value || (value.theme !== 'light' && value.theme !== 'dark') || !Number.isFinite(value.until)) {
        localStorage.removeItem(OVERRIDE_KEY);
        return null;
      }
      if (value.until <= Date.now()) {
        localStorage.removeItem(OVERRIDE_KEY);
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  function timeText(timestamp) {
    try {
      return new Date(timestamp).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }) + ' WIB';
    } catch (error) {
      return '';
    }
  }

  function iconSun() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>';
  }

  function iconMoon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.3A8.7 8.7 0 0 1 9.7 3.5 8.8 8.8 0 1 0 20.5 14.3Z"></path></svg>';
  }

  function updateButton(theme) {
    var button = document.getElementById('av-theme-toggle');
    if (!button) return;
    var override = readOverride();
    var next = theme === 'dark' ? 'light' : 'dark';
    button.innerHTML = (next === 'light' ? iconSun() : iconMoon()) +
      '<span class="av-theme-toggle-label">Mode ' + (next === 'light' ? 'Terang' : 'Gelap') + '</span>';
    button.setAttribute('aria-label', 'Beralih ke mode ' + (next === 'light' ? 'terang' : 'gelap'));
    button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    if (override) {
      button.setAttribute('title', 'Mode ' + (theme === 'light' ? 'terang' : 'gelap') + ' dipilih manual sampai ' + timeText(override.until) + '. Otomatis berdasarkan WIB: terang 06.00–17.59, gelap 18.00–05.59.');
      button.setAttribute('data-theme-mode', 'manual');
    } else {
      button.setAttribute('title', 'Mode otomatis mengikuti waktu WIB: terang 06.00–17.59, gelap 18.00–05.59. Klik untuk mengganti tema sampai pergantian waktu berikutnya.');
      button.setAttribute('data-theme-mode', 'auto');
    }
  }

  function applyTheme(theme) {
    theme = theme === 'light' ? 'light' : 'dark';
    if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme);
    updateButton(theme);
  }

  function refreshFromClock() {
    var override = readOverride();
    applyTheme(override ? override.theme : autoTheme(new Date()));
  }

  function setManualOverride(theme) {
    var expires = nextBoundary(new Date());
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ theme: theme, until: expires }));
    } catch (error) {
      // The theme still changes for this page if storage is unavailable.
    }
    applyTheme(theme);
  }

  function addToggle() {
    if (!document.body || document.getElementById('av-theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'av-theme-toggle';
    button.className = 'av-theme-toggle';
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setManualOverride(current === 'dark' ? 'light' : 'dark');
    });
    document.body.appendChild(button);
    refreshFromClock();
  }

  function startClockSync() {
    if (timer !== null) window.clearInterval(timer);
    timer = window.setInterval(refreshFromClock, 15000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshFromClock();
    });
    window.addEventListener('focus', refreshFromClock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      addToggle();
      startClockSync();
    }, { once: true });
  } else {
    addToggle();
    startClockSync();
  }

  window.addEventListener('storage', function (event) {
    if (event.key === OVERRIDE_KEY) refreshFromClock();
  });
})();
