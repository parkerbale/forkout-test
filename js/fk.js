// Forkout shared app behaviour: builds the status bar, tab bar, + menu, dark/light mode and screen list,
// shrinks the 1024px canvas to the phone, handles dark/light mode, and gives helpers (count-up numbers, rings, toast, haptics, milestones).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var FK = window.FK = { reduce: reduce, $: $ };
  var body = document.body;
  var tab = body.dataset.tab || '';           // which tab is lit: home | workouts | nutrition | progress | '' (no tab bar)
  var title = body.dataset.title || document.title;

  var SCREENS = [
    ['home.html', 'Home'], ['food.html', 'Nutrition (Food)'], ['scan.html', 'Scan a meal'], ['meals.html', 'Meal ideas'], ['food-ai.html', 'Food AI'],
    ['train.html', 'Workouts · your plan'], ['workout.html', 'Workout logger'], ['finish.html', 'Workout done'], ['plan.html', 'Your plan'], ['goal.html', 'Your goal'], ['form.html', 'Form guide'], ['coach.html', 'Forkout AI (coach)'],
    ['progress.html', 'Progress'], ['onboarding.html', 'Onboarding'], ['paywall.html', 'Paywall'], ['settings.html', 'Settings'],
    ['extras.html', 'Widgets · Watch · alerts']
  ];

  var ICON = {
    signal: '<svg width="31" height="21" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
    wifi: '<svg width="31" height="22" viewBox="0 0 15 11"><path d="M7.5 10.5l2-2.3a3 3 0 0 0-4 0z" fill="currentColor"/><path d="M3.9 6.6a5.2 5.2 0 0 1 7.2 0M1.5 4a8.6 8.6 0 0 1 12 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    battery: '<svg width="48" height="23" viewBox="0 0 25 12"><rect x=".7" y=".7" width="21" height="10.6" rx="3" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/><rect x="2.3" y="2.3" width="17.4" height="7.4" rx="1.6" fill="currentColor"/><rect x="22.8" y="4" width="1.7" height="4" rx=".8" fill="currentColor" fill-opacity=".5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 10.6L12 3.5l8.5 7.1V19a2 2 0 0 1-2 2H15v-6h-6v6H5.5a2 2 0 0 1-2-2z"/></svg>',
    workouts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 6v12M17 6v12M4.5 9v6M19.5 9v6M2.5 12h2M19.5 12h2M7 12h10M9.5 8v8M14.5 8v8"/></svg>',
    nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18a9 6.5 0 0 1-18 0z"/><path d="M6.5 12c.5-2 2-3 3.5-3M12 12c0-2.5 1.5-3.8 3.5-4M8.5 7.5l1-2.5M14 6l1.5-2"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 20v-3M8 20v-6M12 20v-9M16 20v-12M20 20V4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4.5v15M4.5 12h15"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><circle cx="12" cy="12" r="3"/></svg>',
    drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M1.5 12h2M20.5 12h2M6.5 12h11"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>'
  };
  FK.ICON = ICON;

  // Status bar + tab bar + + menu + toast
  var top = $('topLayer'), bottom = $('bottomLayer');
  if (top) top.innerHTML = '<div class="status"><div class="a t">9:41</div><div class="a ic">' + ICON.signal + ICON.wifi + ICON.battery + '</div></div>';
  if (bottom) {
    var t = function (id, x, w, label, href) {
      return '<a class="tab' + (tab === id ? ' on' : '') + '" style="left:' + x + 'px;width:' + w + 'px" href="' + href + '">' + ICON[id] + label + '</a>';
    };
    bottom.insertAdjacentHTML('afterbegin',
      '<div class="sheet-bg" id="sheetBg"></div>' +
      '<div class="sheet" id="sheet">' +
        '<a href="scan.html"><span class="ico acc">' + ICON.scan + '</span><span>Snap a meal<small>Macros in 2 sec</small></span></a>' +
        '<a href="coach.html"><span class="ico acc"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2.5l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4L3.2 9.8l5.4-1.9z"/></svg></span><span>Ask Forkout AI<small>10 questions a day</small></span></a>' +
        '<a href="workout.html"><span class="ico blue">' + ICON.dumbbell + '</span><span>Start workout<small>Upper Body Push</small></span></a>' +
        '<a href="progress.html#photo"><span class="ico purple">' + ICON.camera + '</span><span>Progress photo<small>Week 13</small></span></a>' +
      '</div>' +
      '<div class="toast" id="toast" role="status"></div>' +
      (tab !== 'none'
        ? '<nav class="tabbar" aria-label="App sections">' + t('home', 95, 90, 'Home', 'home.html') + t('workouts', 284, 100, 'Workouts', 'train.html') +
          '<button class="fab" id="fab" aria-label="Add" aria-expanded="false">' + ICON.plus + '</button>' +
          t('nutrition', 639, 100, 'Nutrition', 'food.html') + t('progress', 831, 100, 'Progress', 'progress.html') + '<div class="homeind"></div></nav>'
        : '<div class="homeind solo"></div>'));
  }

  // Streak pill at the top of the main pages (data-streak on <body>); tap it for Progress
  if (body.dataset.streak) {
    var head = document.querySelector('.head');
    if (head) {
      var last = head.lastElementChild, pill = document.createElement('a');
      pill.className = 'streakpill press'; pill.href = 'progress.html'; pill.setAttribute('aria-label', '12-day streak');
      pill.innerHTML = '<svg viewBox="0 0 24 24" fill="#FF9F5A"><path d="M12 2.5c1.2 4.2 5.8 5.6 5.8 11a5.8 5.8 0 0 1-11.6 0c0-3.4 2.2-4.6 2.3-7 1 1.2 2.1 2.2 3.3 2.3-.4-2.2-.6-4.3.2-6.3z"/></svg><b>12</b>';
      if (last && last !== head.firstElementChild) head.insertBefore(pill, last); else head.appendChild(pill);
    }
  }

  // Your own profile photo (Settings), saved on this device
  try { var AV = localStorage.getItem('fk-avatar'); if (AV) document.querySelectorAll('img[src$="avatar.jpg"]').forEach(function (im) { im.src = AV; }); } catch (e) {}

  // Shrink the canvas to the phone's width
  function fit() {
    var app = $('app'); if (!app) return;
    var z = app.clientWidth / 1024;
    document.querySelectorAll('.canvas,.layer').forEach(function (el) { el.style.zoom = z; });
    if (bottom) bottom.style.height = (app.clientHeight / z) + 'px';
    var c = document.querySelector('.canvas'); if (c && !c.dataset.fixed) c.style.minHeight = (app.clientHeight / z) + 'px';
  }
  fit(); addEventListener('resize', fit);

  // Desktop side panel: title, screen list, colour themes, replay
  var panel = document.querySelector('.panel');
  if (panel) {
    var here = location.pathname.split('/').pop() || 'home.html';
    panel.innerHTML = '<h1>' + title + '</h1><p>' + (body.dataset.note || 'Tap around. Everything responds.') + '</p>' +
      '<span class="plbl">Screens</span><nav>' + SCREENS.map(function (s) { return '<a href="' + s[0] + '"' + (s[0] === here ? ' class="on"' : '') + '>' + s[1] + '</a>'; }).join('') + '</nav>' +
      '<span class="plbl">Appearance</span><div class="seg themeSeg"><button data-t="light">Light</button><button data-t="dark">Dark</button><button data-t="auto">Auto</button></div>' +
      '<span class="plbl">Animation</span><button class="ghost" onclick="location.reload()">↻ Replay</button>';
  }

  // Appearance (Settings): dark is the default, or match the phone (auto), or dark. Saved on this device.
  FK.mode = function () { try { var m = localStorage.getItem('fk-look'); if (m === 'dark' || m === 'light' || m === 'auto') return m; } catch (e) {} return 'dark'; };
  FK.resolve = function (m) { return m === 'auto' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : m; };
  FK.theme = function () { return document.documentElement.dataset.fk === 'light' ? 'light' : 'dark'; };
  function paintTheme(m) {
    var t = document.body && document.body.dataset.dark === '1' ? 'dark' : FK.resolve(m);
    if (t === 'light') document.documentElement.dataset.fk = 'light'; else delete document.documentElement.dataset.fk;
    document.querySelectorAll('.themeSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === m)); });
  }
  FK.setTheme = function (m) { try { localStorage.setItem('fk-look', m); } catch (e) {} paintTheme(m); };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.themeSeg button'); if (b) { FK.setTheme(b.dataset.t); FK.haptic(); }
  });
  if (!/[?&]theme=(light|dark)/.test(location.search)) paintTheme(FK.mode());
  else document.querySelectorAll('.themeSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === FK.theme())); });
  if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (FK.mode() === 'auto' && !/[?&]theme=/.test(location.search)) paintTheme('auto'); }); } catch (e) {}

  // Haptics: a tiny buzz on taps (works on Android browsers; the real iPhone app uses the Haptics API)
  FK.haptic = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} };
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('button,a,.press,.tile,.sc')) FK.haptic();
  }, { passive: true });

  // Messages
  var tt; FK.toast = function (m) { var el = $('toast'); if (!el) return; el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('show'); }, 1900); };
  window.toast = FK.toast;

  // + menu
  var fab = $('fab');
  function setSheet(open) { if (!fab) return; fab.setAttribute('aria-expanded', String(open)); $('sheet').classList.toggle('open', open); $('sheetBg').classList.toggle('open', open); }
  if (fab) {
    fab.onclick = function () { setSheet(fab.getAttribute('aria-expanded') !== 'true'); };
    $('sheetBg').onclick = function () { setSheet(false); };
  }

  // Numbers that count up
  FK.count = function (el, from, to, ms, fmt) {
    fmt = fmt || function (v) { return Math.round(v).toLocaleString('en-US'); };
    if (!el) return;
    if (reduce) { el.textContent = fmt(to); return; }
    var s = performance.now();
    (function step(n) { var p = Math.min(1, (n - s) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); })(s);
  };
  // Rings: <circle class="ring-fill" r="..">
  FK.ring = function (c, pct) { var len = 2 * Math.PI * (+c.getAttribute('r')); c.style.strokeDasharray = (len * Math.max(0, Math.min(1, pct))) + ' ' + len; };

  // Neon burst for milestones (goal hit, streak milestones, PRs)
  FK.burst = function (x, y) {
    if (reduce) return;
    var host = $('bottomLayer') || body, b = document.createElement('div'); b.className = 'burst'; host.appendChild(b);
    var cols = ['var(--acc)', '#8EF0B4', '#6CB8FF', '#C9B2FA', '#FF9F5A'];
    for (var i = 0; i < 34; i++) {
      var p = document.createElement('i'); p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = cols[i % cols.length];
      b.appendChild(p);
      var ang = Math.random() * Math.PI * 2, dist = 160 + Math.random() * 260;
      p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + (Math.sin(ang) * dist + 220) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }],
        { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    }
    FK.haptic([10, 40, 20]);
    setTimeout(function () { b.remove(); }, 1800);
  };

  // Ask bar at the bottom of the screen. FK.askbar({ placeholder, onSend }) → { type(text) } types a message in, letter by letter, then sends it.
  FK.askbar = function (o) {
    var host = $('bottomLayer'); if (!host) return null;
    var low = tab === 'none';
    host.style.setProperty('--ab', low ? '64px' : '184px'); host.style.setProperty('--af', low ? '240px' : '360px');
    host.insertAdjacentHTML('afterbegin', '<div class="askfade"></div><label class="askbar empty" id="askbar"><svg class="sp" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2.5l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4L3.2 9.8l5.4-1.9z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" opacity=".7"/></svg>' +
      '<input id="askIn" autocomplete="off" placeholder="' + (o.placeholder || 'Ask Forkout AI…') + '"><span class="send" id="askSend" role="button" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg></span></label>');
    var c = document.querySelector('.canvas'); if (c) c.style.paddingBottom = (parseInt(getComputedStyle(c).paddingBottom, 10) + (low ? 140 : 120)) + 'px';
    var bar = $('askbar'), inp = $('askIn'), typing = [];
    var sync = function () { bar.classList.toggle('empty', !inp.value.trim()); };
    inp.addEventListener('input', sync);
    inp.addEventListener('focus', function () { bar.classList.add('focus'); });
    inp.addEventListener('blur', function () { bar.classList.remove('focus'); });
    var send = function () { var v = inp.value.trim(); if (!v) return; inp.value = ''; sync(); inp.blur(); FK.haptic(); o.onSend(v); };
    $('askSend').onclick = send;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    var api = {
      type: function (txt, ms) {
        typing.forEach(clearTimeout); typing = []; inp.value = ''; bar.classList.add('focus');
        if (reduce) { inp.value = txt; sync(); return send(); }
        ms = ms || 38;
        for (var i = 1; i <= txt.length; i++) (function (n) { typing.push(setTimeout(function () { inp.value = txt.slice(0, n); sync(); inp.scrollLeft = inp.scrollWidth; }, n * ms)); })(i);
        typing.push(setTimeout(function () { bar.classList.remove('focus'); send(); }, txt.length * ms + 350));
      },
      fill: function (txt) { inp.value = txt; sync(); inp.focus(); }
    };
    window.typeAsk = api.type;
    return api;
  };
  // Scroll the screen so an element sits near the top (used when new chat messages arrive)
  FK.scrollTo = function (el, offset) {
    var sc = document.querySelector('.scroll'), c = document.querySelector('.canvas'); if (!sc || !el) return;
    var z = parseFloat(c.style.zoom) || 1, y = 0, n = el;
    while (n && n !== c) { y += n.offsetTop; n = n.offsetParent; }
    sc.scrollTo({ top: Math.max(0, y * z - (offset || 120) * z), behavior: reduce ? 'auto' : 'smooth' });
  };

  // Start entrance animations once fonts are ready, then run the screen's own start code
  FK.ready = function (fn) {
    var go = function () { body.classList.add('ready'); if (fn) setTimeout(fn, reduce ? 0 : 300); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  };
})();
