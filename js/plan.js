// Forkout training plan: goal, days, session length, split, calories. Saved on this device.
window.FKPlan = (function () {
  var KEY = 'fk-plan';
  var DEF = { sex: '', goal: 'Build muscle', days: 4, len: 60, split: 'ul', kcal: 2800, auto: true, time: 18, times: null, weight: 80.6, goalW: 80.6, height: 178, age: 25, pace: 'steady', macros: null, equipment: 'Gym' };
  var KCAL = { 'Build muscle': 2800, 'Lose fat': 2300, 'Get stronger': 2800, 'Tone & recomp': 2500 };
  // pattern: Mon=0 … Sun=6
  var DAYPAT = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  var SPLITS = [
    { id: 'ul2', days: 2, name: 'Upper / Lower', note: 'The simplest week. Two full sessions.', s: ['Upper Body', 'Lower Body'] },
    { id: 'fb2', days: 2, name: 'Full body × 2', note: 'Every muscle, twice a week.', s: ['Full Body A', 'Full Body B'] },
    { id: 'fb3', days: 3, name: 'Full body × 3', note: 'Every muscle three times. Great for beginners.', s: ['Full Body A', 'Full Body B', 'Full Body C'] },
    { id: 'ulf', days: 3, name: 'Upper / Lower / Full', note: 'A balanced mix with a full-body finish.', s: ['Upper Body', 'Lower Body', 'Full Body'] },
    { id: 'ppl3', days: 3, name: 'Push / Pull / Legs', note: 'Each muscle once a week with high volume.', s: ['Push', 'Pull', 'Legs'] },
    { id: 'ul', days: 4, name: 'Upper / Lower × 2', note: 'Each muscle twice a week. Easy to recover from.', s: ['Upper Body Pull', 'Lower Body A', 'Upper Body Push', 'Lower Body B'] },
    { id: 'ulglute', days: 4, name: 'Lower / Upper · glute focus', note: 'Two lower days built around glutes and legs.', s: ['Lower · Glutes & Hamstrings', 'Upper Body', 'Lower · Quads & Glutes', 'Upper Body & Core'], women: true },
    { id: 'ppl4', days: 4, name: 'Push / Pull / Legs / Upper', note: 'PPL with one extra upper-body day.', s: ['Push', 'Pull', 'Legs', 'Upper Body'] },
    { id: 'legs4', days: 4, name: 'Legs × 2 + Upper × 2', note: 'More leg days, with upper body twice.', s: ['Legs · Quads', 'Upper Body', 'Legs · Glutes & Hamstrings', 'Upper Body'], women: true },
    { id: 'ulppl', days: 5, name: 'Upper / Lower + PPL', note: 'Twice a week per muscle, with extra volume.', s: ['Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs'] },
    { id: 'gluteboost', days: 5, name: 'Glute focus × 3 + Upper × 2', note: 'Three glute and leg days, two upper days.', s: ['Glutes & Hamstrings', 'Upper Body', 'Quads & Glutes', 'Upper Body', 'Glutes & Core'], women: true },
    { id: 'bro', days: 5, name: 'Body-part split', note: 'One muscle group a day. Chest, back, shoulders, arms, legs.', s: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'] },
    { id: 'ppl6', days: 6, name: 'Push / Pull / Legs × 2', note: 'The classic 6-day split. Highest volume.', s: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'] },
    { id: 'arnold', days: 6, name: 'Arnold split', note: 'Chest and back, shoulders and arms, legs. Twice.', s: ['Chest & Back', 'Shoulders & Arms', 'Legs', 'Chest & Back', 'Shoulders & Arms', 'Legs'] }
  ];
  var REC = { f: { 2: 'ul2', 3: 'ulf', 4: 'ulglute', 5: 'gluteboost', 6: 'ppl6' }, m: { 2: 'fb2', 3: 'fb3', 4: 'ul', 5: 'ulppl', 6: 'ppl6' } };
  function hm(h) { var H = Math.floor(h), m = Math.round((h - H) * 60); return (H % 12 || 12) + (m ? ':' + ('0' + m).slice(-2) : '') + (H < 12 ? 'am' : 'pm'); }
  function timeFor(p, d) { p = p || get(); var t = p.times && p.times[d]; return typeof t === 'number' ? t : p.time; }
  function timeLabel(h) { return { 6: 'Morning', 12: 'Lunch', 16: 'Afternoon', 18: 'Evening' }[h] || hm(h); }
  function get() { var p = {}; try { p = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {} var o = {}; for (var k in DEF) o[k] = p[k] !== undefined ? p[k] : DEF[k]; return o; }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} return p; }
  function find(id) { for (var i = 0; i < SPLITS.length; i++) if (SPLITS[i].id === id) return SPLITS[i]; return SPLITS[5]; }
  function rec(sex, days) { return (REC[sex === 'f' ? 'f' : 'm'][days]) || 'ul'; }
  function forDays(d) { return SPLITS.filter(function (s) { return s.days === d; }); }
  function week(p) {
    p = p || get();
    var sp = find(p.split); if (sp.days !== p.days) sp = find(rec(p.sex, p.days));
    var pat = DAYPAT[sp.days], n = Math.max(3, Math.round(p.len / 9)), out = [];
    for (var i = 0; i < 7; i++) out.push({ rest: true, name: 'Rest day' });
    pat.forEach(function (d, i) { out[d] = { rest: false, name: sp.s[i % sp.s.length], ex: n - (i % 2 ? 1 : 0), min: p.len }; });
    return out;
  }
  function today() { return (new Date().getDay() + 6) % 7; }
  // Streak = days in a row with at least one meal logged.
  function dkey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function mealDays() {
    var s = null; try { s = JSON.parse(localStorage.getItem('fk-meal-days') || 'null'); } catch (e) {}
    if (!s) { s = {}; for (var i = 0; i < 12; i++) { var d = new Date(); d.setDate(d.getDate() - i); s[dkey(d)] = 1; } try { localStorage.setItem('fk-meal-days', JSON.stringify(s)); } catch (e) {} }
    return s;
  }
  function logMeal() { var s = mealDays(); s[dkey(new Date())] = 1; try { localStorage.setItem('fk-meal-days', JSON.stringify(s)); } catch (e) {} return streak(); }
  function streak() { var s = mealDays(), d = new Date(), n = 0; if (!s[dkey(d)]) d.setDate(d.getDate() - 1); while (s[dkey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
  function loggedToday() { return !!mealDays()[dkey(new Date())]; }
  // Weight goal maths. Mifflin-St Jeor BMR x 1.55 (trains 3-5 days), 1 kg of body weight ~ 7,700 kcal.
  var PACE = { slow: { gain: 0.25, lose: 0.25 }, steady: { gain: 0.5, lose: 0.5 }, fast: { gain: 0.75, lose: 1.0 } };
  function calc(p) {
    p = p || get();
    var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5), tdee = Math.round(bmr * 1.55 / 10) * 10;
    var diff = Math.round((p.goalW - p.weight) * 10) / 10, dir = Math.abs(diff) < 0.5 ? 0 : diff > 0 ? 1 : -1;
    var rate = dir ? PACE[p.pace][dir > 0 ? 'gain' : 'lose'] : 0;
    var teen = p.age < 18, adj = Math.round(rate * 7700 / 7 / 10) * 10;
    if (dir < 0) adj = Math.min(adj, Math.round(tdee * 0.25 / 10) * 10, teen ? 300 : 1000); // never more than 25% under (300 for under-18s)
    var kcal = tdee + dir * adj;
    kcal = Math.max(teen ? (p.sex === 'f' ? 1700 : 2000) : (p.sex === 'f' ? 1200 : 1500), Math.min(tdee + 1000, kcal));
    if (dir < 0 && adj < rate * 1100) rate = Math.round(adj * 7 / 7700 * 100) / 100 || rate; // slower pace if capped
    var weeks = dir ? Math.ceil(Math.abs(diff) / rate) : 0, end = new Date(); end.setDate(end.getDate() + weeks * 7);
    var prot = Math.min(220, Math.round(p.weight * 2)), fat = Math.round(kcal * 0.25 / 9), carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
    return { tdee: tdee, kcal: kcal, diff: diff, dir: dir, rate: rate, weeks: weeks, end: end, p: prot, c: carb, f: fat };
  }
  // Macros: the ones you set, else worked out from your calories (protein ~2 g/kg, fat 25%, carbs the rest)
  function macros(p) {
    p = p || get(); if (p.macros) return p.macros;
    var k = +p.kcal || 2800, pr = Math.min(220, Math.round((+p.weight || 80) * 2)), f = Math.round(k * 0.25 / 9);
    return { p: pr, c: Math.max(0, Math.round((k - pr * 4 - f * 9) / 4)), f: f };
  }
  return { calc: calc, macros: macros, PACE: PACE, streak: streak, logMeal: logMeal, loggedToday: loggedToday, timeFor: timeFor, hm: hm, timeLabel: timeLabel, get: get, save: save, find: find, rec: rec, forDays: forDays, week: week, today: today, SPLITS: SPLITS, KCAL: KCAL, DAYPAT: DAYPAT };
})();
