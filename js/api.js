// Forkout AI calls (meal scan + typed fixes). Needs js/db.js first: calls go out with the person's login,
// so only signed-in users can use the AI. FK.api.live is false until js/config.js is filled in; screens then keep their demo behaviour.
(function () {
  var FK = window.FK = window.FK || {};
  var live = !!(FK.db && FK.db.live);

  // Shrinks a photo to at most 1024 px on its long side as JPEG: faster upload and ~4x cheaper AI calls.
  function shrink(file, max) {
    max = max || 1024;
    return new Promise(function (ok, fail) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('Could not read that photo')); };
      img.src = url;
    });
  }

  // ---------- Forkout AI chat ----------
  // What the AI knows about today: goal, what's eaten, today's workout. Built fresh for every question.
  function context(extra) {
    var c = {}, P = window.FKPlan ? FKPlan.get() : {};
    try {
      var MX = FKPlan.macros(P), w = FKPlan.week(P)[FKPlan.today()], sp = FKPlan.find(P.split);
      c = { sex: P.sex === 'f' ? 'female' : P.sex === 'm' ? 'male' : undefined, age: P.age, weight_kg: P.weight, goal_weight_kg: P.goalW, goal: P.goal,
        kcal_goal: P.kcal, protein_goal: MX.p, days_per_week: P.days, split: sp && sp.name, today_workout: w && !w.rest ? w.name : 'Rest day' };
    } catch (e) {}
    var d = new Date(); c.local_time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var meals = FK.store ? FK.store.meals().catch(function () { return []; }) : Promise.resolve([]);
    var prof = FK.store ? FK.store.profile().catch(function () { return {}; }) : Promise.resolve({});
    return Promise.all([meals, prof]).then(function (r) {
      var t = FK.store.totals(r[0]);
      c.kcal_eaten = Math.round(t.kcal); c.protein_eaten = Math.round(t.protein); c.carbs_eaten = Math.round(t.carbs); c.fat_eaten = Math.round(t.fat);
      c.meals_today = r[0].slice(0, 12).map(function (m) { return String(m.name || 'Meal').slice(0, 80); });
      if (r[1] && r[1].name) c.name = String(r[1].name).slice(0, 40);
      for (var k in extra || {}) c[k] = extra[k];
      for (var j in c) if (c[j] == null || c[j] === '' || (typeof c[j] === 'number' && !isFinite(c[j]))) delete c[j];
      return c;
    });
  }
  var HIST = {}; // the last messages per thread, sent with each question so the AI remembers the conversation
  function history(thread, n) {
    if (!live) return Promise.resolve([]);
    return FK.db.select('chat_messages', { select: 'role,content,created_at', thread: 'eq.' + thread, order: 'created_at.desc', limit: n || 30 })
      .then(function (rows) { rows = (rows || []).reverse(); HIST[thread] = rows.map(function (m) { return { role: m.role, content: m.content }; }); return rows; });
  }
  function remember(thread, role, content) {
    (HIST[thread] = HIST[thread] || []).push({ role: role, content: content });
    if (live) FK.db.insert('chat_messages', { thread: thread, role: role, content: String(content).slice(0, 8000) }).catch(function () {});
  }
  function chat(thread, message, extra) {
    message = String(message || '').trim().slice(0, 1000);
    return context(extra).then(function (ctx) {
      var h = (HIST[thread] || []).slice(-12).map(function (m) { return { role: m.role, content: String(m.content).slice(0, 2000) }; });
      return FK.db.fn('chat', { thread: thread, message: message, history: h, context: ctx });
    }).then(function (r) {
      remember(thread, 'user', message);
      remember(thread, 'assistant', r.reply + (r.meal ? '\n[Meal idea: ' + r.meal.name + ', ' + r.meal.kcal + ' kcal]' : ''));
      return r;
    });
  }
  // How many questions are left today (from the account's usage counter)
  function chatLeft(limit) {
    limit = limit || 40;
    if (!live) return Promise.resolve(limit);
    var d = new Date().toISOString().slice(0, 10);
    return FK.db.select('ai_usage', { select: 'count', kind: 'eq.chat', day: 'eq.' + d }).then(function (r) { return Math.max(0, limit - (r && r[0] ? r[0].count : 0)); });
  }
  // **bold** and "- " bullets from the AI, made safe for the page (no HTML from the AI is ever used)
  function fmt(s) {
    var esc = String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    esc = esc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    var lines = esc.split('\n'), out = '', ul = false;
    lines.forEach(function (l) {
      var m = /^\s*[-•]\s+(.*)/.exec(l);
      if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + m[1] + '</li>'; }
      else { if (ul) { out += '</ul>'; ul = false; } if (l.trim()) out += (out && !/<\/ul>$/.test(out) ? '<br>' : '') + l; }
    });
    return out + (ul ? '</ul>' : '');
  }

  FK.api = {
    live: live,
    shrink: shrink,
    scanMeal: function (file) { return shrink(file).then(function (b64) { return FK.db.fn('scan-meal', { image: b64, media_type: 'image/jpeg' }); }); },
    fixMeal: function (previousMeal, text) { return FK.db.fn('scan-meal', { previous: previousMeal, fix: text }); },
    chat: chat, chatHistory: history, chatLeft: chatLeft, chatContext: context, fmt: fmt,
    LINKS: { plan: ['train.html', 'Open my plan'], workout: ['workout.html', 'Start the workout'], form: ['form.html', '▶ Watch the form'], food: ['food-ai.html', 'Find a meal'], scan: ['scan.html', 'Snap a meal'], progress: ['progress.html', 'See my progress'] }
  };
})();
