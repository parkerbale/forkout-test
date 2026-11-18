// Forkout data for the screens: profile + targets, food diary, water.
// Live (backend set up + signed in): saved to the person's account. Demo: saved on this device only.
// Every function returns a Promise so the screens work the same either way.
(function () {
  var FK = window.FK = window.FK || {};
  var live = !!(FK.db && FK.db.live);
  var DEFAULTS = { name: '', kcal_target: 2800, protein_g: 180, carbs_g: 350, fat_g: 90, water_ml: 3200 };

  // The person's LOCAL date as YYYY-MM-DD (not UTC: a 7 pm dinner in Perth is still "today")
  function day(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function slotNow() { var h = new Date().getHours(); return h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snack'; }
  function local(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  function num(x) { return Math.round((+x || 0) * 10) / 10; }
  function withDefaults(p) { var o = {}; for (var k in DEFAULTS) o[k] = DEFAULTS[k]; for (k in (p || {})) if (p[k] !== null && p[k] !== undefined) o[k] = p[k]; return o; }

  // ---------- Profile + daily targets ----------
  function profile() {
    if (!live) return Promise.resolve(withDefaults(local('fk-profile')));
    var u = FK.db.auth.user();
    return FK.db.select('profiles', { select: '*', id: 'eq.' + (u && u.id) }).then(function (rows) {
      var p = withDefaults(rows && rows[0]); local('fk-profile-cache', p); return p;
    }, function (e) { var c = local('fk-profile-cache'); if (c) return c; throw e; }); // offline: last known
  }
  function saveProfile(patch) {
    if (!live) { var p = withDefaults(local('fk-profile')); for (var k in patch) p[k] = patch[k]; local('fk-profile', p); return Promise.resolve(p); }
    var u = FK.db.auth.user();
    return FK.db.update('profiles', { id: 'eq.' + u.id }, patch).then(function (rows) { var p = withDefaults(rows && rows[0]); local('fk-profile-cache', p); return p; });
  }

  // ---------- Food diary ----------
  function clean(m) {
    return {
      day: m.day || day(), slot: m.slot || slotNow(), name: String(m.name || 'Meal').slice(0, 120),
      kcal: Math.max(0, Math.round(+m.kcal || 0)), protein: num(m.protein), carbs: num(m.carbs), fat: num(m.fat),
      items: m.items || [], source: m.source || 'manual', eaten_at: m.eaten_at || new Date().toISOString()
    };
  }
  function meals(d) {
    d = d || day();
    if (!live) return Promise.resolve((local('fk-diary') || []).filter(function (m) { return m.day === d; }));
    return FK.db.select('meals', { select: 'id,day,eaten_at,slot,name,kcal,protein,carbs,fat,source', day: 'eq.' + d, order: 'eaten_at.asc' });
  }
  function addMeal(m) {
    var row = clean(m);
    if (!live) { row.id = 'l' + Date.now(); var all = local('fk-diary') || []; all.push(row); local('fk-diary', all); return Promise.resolve(row); }
    return FK.db.insert('meals', row).then(function (r) { return r[0]; });
  }
  function removeMeal(id) {
    if (!live) { local('fk-diary', (local('fk-diary') || []).filter(function (m) { return m.id !== id; })); return Promise.resolve(); }
    return FK.db.remove('meals', { id: 'eq.' + id });
  }
  function totals(list) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: list.length };
    list.forEach(function (m) { t.kcal += +m.kcal || 0; t.protein += +m.protein || 0; t.carbs += +m.carbs || 0; t.fat += +m.fat || 0; });
    t.protein = Math.round(t.protein); t.carbs = Math.round(t.carbs); t.fat = Math.round(t.fat);
    return t;
  }
  // Calories per day for a date range (for the week strip). { 'YYYY-MM-DD': kcal }
  function kcalByDay(from, to) {
    if (!live) {
      var o = {}; (local('fk-diary') || []).forEach(function (m) { if (m.day >= from && m.day <= to) o[m.day] = (o[m.day] || 0) + m.kcal; }); return Promise.resolve(o);
    }
    return FK.db.select('meals', { select: 'day,kcal', and: '(day.gte.' + from + ',day.lte.' + to + ')' }).then(function (rows) {
      var o = {}; rows.forEach(function (m) { o[m.day] = (o[m.day] || 0) + m.kcal; }); return o;
    });
  }

  // ---------- Water ----------
  function water(d) {
    d = d || day();
    if (!live) return Promise.resolve((local('fk-water') || []).filter(function (w) { return w.day === d; }).reduce(function (a, w) { return a + w.ml; }, 0));
    return FK.db.select('water', { select: 'ml', day: 'eq.' + d }).then(function (rows) { return rows.reduce(function (a, w) { return a + w.ml; }, 0); });
  }
  function addWater(ml, d) {
    var row = { day: d || day(), ml: Math.round(ml) };
    if (!live) { var all = local('fk-water') || []; all.push(row); local('fk-water', all); return Promise.resolve(row); }
    return FK.db.insert('water', row).then(function (r) { return r[0]; });
  }

  FK.store = {
    live: live, day: day, slotNow: slotNow, DEFAULTS: DEFAULTS,
    profile: profile, saveProfile: saveProfile,
    meals: meals, addMeal: addMeal, removeMeal: removeMeal, totals: totals, kcalByDay: kcalByDay,
    water: water, addWater: addWater
  };
})();
