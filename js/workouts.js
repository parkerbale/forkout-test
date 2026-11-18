// Forkout workouts: the person's plan, this week's schedule, saved workouts + sets, and progressive overload.
// The plan comes from Forkout AI (build-plan function) when the backend is live; otherwise (or if the AI fails)
// a built-in template makes a good plan instantly, so this screen never depends on the AI.
(function () {
  var FK = window.FK = window.FK || {};
  var live = !!(FK.db && FK.db.live);

  // ---------- Week patterns (Mon → Sun). Training slots are filled with plan.days in order. ----------
  var WEEK = {
    2: ['FB', '–', '–', 'FB', '–', '–', '–'],
    3: ['FB', '–', 'FB', '–', 'FB', '–', '–'],
    4: ['UP', 'LO', '–', 'UP', 'LO', '–', '–'],
    5: ['UP', 'LO', '–', 'PU', 'PL', 'LG', '–'],
    6: ['PU', 'PL', 'LG', 'PU', 'PL', 'LG', '–']
  };
  var SPLIT = {
    2: ['Full body × 2', 'Two full-body sessions: the most you can get from 2 days.'],
    3: ['Full body × 3', 'Every muscle three times a week. The best use of 3 days.'],
    4: ['Upper / Lower × 2', 'Each muscle twice a week, with time to recover.'],
    5: ['Upper / Lower + Push / Pull / Legs', 'Twice a week per muscle, with extra volume and variety.'],
    6: ['Push / Pull / Legs × 2', 'The classic 6-day split. High volume for every muscle.']
  };

  // ---------- Exercise library: [name, muscles, kind, start (× body weight)] ----------
  // kind: B big upper lift, L big lower lift, M other compound, S small/isolation, C core/bodyweight
  var GYM = {
    UP: [['Bench press', 'Chest · shoulders · triceps', 'B', .5], ['Barbell row', 'Back · biceps', 'B', .45], ['Seated shoulder press', 'Shoulders · triceps', 'M', .3], ['Lat pulldown', 'Lats · biceps', 'M', .45], ['Lateral raise', 'Side delts', 'S', .08], ['Triceps pushdown', 'Triceps', 'S', .25]],
    UP2: [['Incline dumbbell press', 'Upper chest', 'M', .16], ['Pull-up', 'Lats · biceps', 'C', 0], ['Seated cable row', 'Mid back', 'M', .45], ['Dumbbell shoulder press', 'Shoulders', 'M', .13], ['Biceps curl', 'Biceps', 'S', .1], ['Overhead triceps extension', 'Triceps', 'S', .1]],
    LO: [['Squat', 'Quads · glutes', 'L', .6], ['Romanian deadlift', 'Hamstrings · glutes', 'L', .5], ['Leg press', 'Quads', 'M', 1], ['Leg curl', 'Hamstrings', 'S', .3], ['Calf raise', 'Calves', 'S', .5], ['Plank', 'Core', 'C', 0]],
    LO2: [['Deadlift', 'Back · glutes · hamstrings', 'L', .7], ['Bulgarian split squat', 'Quads · glutes', 'M', .1], ['Leg extension', 'Quads', 'S', .3], ['Leg curl', 'Hamstrings', 'S', .3], ['Calf raise', 'Calves', 'S', .5], ['Hanging knee raise', 'Core', 'C', 0]],
    FB: [['Squat', 'Quads · glutes', 'L', .6], ['Bench press', 'Chest · shoulders · triceps', 'B', .5], ['Barbell row', 'Back · biceps', 'B', .45], ['Seated shoulder press', 'Shoulders', 'M', .3], ['Leg curl', 'Hamstrings', 'S', .3], ['Plank', 'Core', 'C', 0]],
    FB2: [['Deadlift', 'Back · glutes · hamstrings', 'L', .7], ['Incline dumbbell press', 'Upper chest', 'M', .16], ['Lat pulldown', 'Lats · biceps', 'M', .45], ['Walking lunge', 'Quads · glutes', 'M', .1], ['Biceps curl', 'Biceps', 'S', .1], ['Triceps pushdown', 'Triceps', 'S', .25]],
    FB3: [['Leg press', 'Quads', 'M', 1], ['Dumbbell shoulder press', 'Shoulders', 'M', .13], ['Seated cable row', 'Mid back', 'M', .45], ['Romanian deadlift', 'Hamstrings · glutes', 'L', .5], ['Lateral raise', 'Side delts', 'S', .08], ['Hanging knee raise', 'Core', 'C', 0]],
    PU: [['Bench press', 'Chest · shoulders · triceps', 'B', .5], ['Seated shoulder press', 'Shoulders · triceps', 'M', .3], ['Incline dumbbell press', 'Upper chest', 'M', .16], ['Lateral raise', 'Side delts', 'S', .08], ['Triceps pushdown', 'Triceps', 'S', .25], ['Overhead triceps extension', 'Triceps', 'S', .1]],
    PL: [['Barbell row', 'Back · biceps', 'B', .45], ['Lat pulldown', 'Lats · biceps', 'M', .45], ['Seated cable row', 'Mid back', 'M', .45], ['Face pull', 'Rear delts', 'S', .15], ['Biceps curl', 'Biceps', 'S', .1], ['Hammer curl', 'Biceps · forearms', 'S', .1]],
    LG: [['Squat', 'Quads · glutes', 'L', .6], ['Romanian deadlift', 'Hamstrings · glutes', 'L', .5], ['Leg press', 'Quads', 'M', 1], ['Leg curl', 'Hamstrings', 'S', .3], ['Calf raise', 'Calves', 'S', .5], ['Plank', 'Core', 'C', 0]]
  };
  var DB = { // dumbbells at home: start = per dumbbell
    UP: [['Dumbbell bench press', 'Chest · triceps', 'M', .16], ['One-arm dumbbell row', 'Back · biceps', 'M', .2], ['Dumbbell shoulder press', 'Shoulders', 'M', .13], ['Push-up', 'Chest · triceps', 'C', 0], ['Lateral raise', 'Side delts', 'S', .06], ['Dumbbell curl', 'Biceps', 'S', .1]],
    LO: [['Goblet squat', 'Quads · glutes', 'M', .2], ['Dumbbell Romanian deadlift', 'Hamstrings · glutes', 'M', .2], ['Bulgarian split squat', 'Quads · glutes', 'M', .1], ['Glute bridge', 'Glutes', 'S', .2], ['Calf raise', 'Calves', 'S', .2], ['Plank', 'Core', 'C', 0]],
    PU: [['Dumbbell bench press', 'Chest · triceps', 'M', .16], ['Dumbbell shoulder press', 'Shoulders', 'M', .13], ['Push-up', 'Chest · triceps', 'C', 0], ['Lateral raise', 'Side delts', 'S', .06], ['Overhead triceps extension', 'Triceps', 'S', .1], ['Plank', 'Core', 'C', 0]],
    PL: [['One-arm dumbbell row', 'Back · biceps', 'M', .2], ['Dumbbell pullover', 'Lats', 'S', .12], ['Rear delt fly', 'Rear delts', 'S', .05], ['Dumbbell curl', 'Biceps', 'S', .1], ['Hammer curl', 'Biceps · forearms', 'S', .1], ['Superman hold', 'Lower back', 'C', 0]]
  };
  DB.UP2 = DB.UP; DB.LO2 = DB.LO; DB.LG = DB.LO; DB.FB = [DB.LO[0], DB.UP[0], DB.UP[1], DB.LO[1], DB.UP[2], DB.LO[5]]; DB.FB2 = DB.FB; DB.FB3 = DB.FB;
  var BW = { // bodyweight or bands: progress by reps, not kg
    UP: [['Push-up', 'Chest · triceps', 'C', 0], ['Inverted row', 'Back · biceps', 'C', 0], ['Pike push-up', 'Shoulders', 'C', 0], ['Band pull-apart', 'Rear delts', 'C', 0], ['Chair dip', 'Triceps', 'C', 0], ['Band curl', 'Biceps', 'C', 0]],
    LO: [['Bodyweight squat', 'Quads · glutes', 'C', 0], ['Reverse lunge', 'Quads · glutes', 'C', 0], ['Glute bridge', 'Glutes', 'C', 0], ['Single-leg calf raise', 'Calves', 'C', 0], ['Wall sit', 'Quads', 'C', 0], ['Plank', 'Core', 'C', 0]]
  };
  BW.UP2 = BW.PU = BW.PL = BW.UP; BW.LO2 = BW.LG = BW.LO; BW.FB = BW.FB2 = BW.FB3 = [BW.LO[0], BW.UP[0], BW.UP[1], BW.LO[1], BW.UP[2], BW.LO[5]];

  var NAMES = { UP: ['Upper A', 'Upper B'], LO: ['Lower A', 'Lower B'], FB: ['Full body A', 'Full body B', 'Full body C'], PU: ['Push'], PL: ['Pull'], LG: ['Legs'] };
  var LISTS = { UP: ['UP', 'UP2'], LO: ['LO', 'LO2'], FB: ['FB', 'FB2', 'FB3'], PU: ['PU'], PL: ['PL'], LG: ['LG'] };
  var REPS = { // [min, max] by focus and kind
    strength: { B: [3, 6], L: [3, 6], M: [6, 8], S: [10, 12], C: [8, 15] },
    muscle: { B: [6, 10], L: [6, 10], M: [8, 12], S: [10, 15], C: [8, 15] },
    fat_loss: { B: [8, 12], L: [8, 12], M: [10, 12], S: [12, 15], C: [10, 20] }
  };

  function roundTo(x, s) { return Math.round(x / s) * s; }
  function stepFor(kind, equipment) { return kind === 'C' ? 0 : kind === 'L' ? 5 : kind === 'B' ? 2.5 : equipment === 'Gym' && kind === 'M' ? 2.5 : kind === 'S' ? 1 : 2; }

  // A plan without AI: same shape as the AI's plan.
  function template(o) {
    o = o || {};
    var days = Math.max(2, Math.min(6, +o.days || 4)), focus = REPS[o.focus] ? o.focus : 'muscle';
    var eq = o.equipment === 'Dumbbells' ? 'Dumbbells' : o.equipment === 'Bands' || o.equipment === 'Bodyweight' ? 'Bodyweight' : 'Gym';
    var lib = eq === 'Gym' ? GYM : eq === 'Dumbbells' ? DB : BW;
    var bw = +o.weight_kg || 75, scale = (o.sex === 'female' ? 0.6 : o.sex === 'other' ? 0.8 : 1) * ((+o.age || 25) < 18 ? 0.7 : 1);
    var count = Math.max(3, Math.min(6, Math.round((+o.minutes || 60) / 12)));
    var seen = {};
    var list = WEEK[days].filter(function (c) { return c !== '–'; }).map(function (code) {
      var k = seen[code] = (seen[code] || 0) + 1;
      var key = LISTS[code][(k - 1) % LISTS[code].length];
      return {
        name: NAMES[code][(k - 1) % NAMES[code].length], code: code,
        exercises: lib[key].slice(0, count).map(function (e) {
          var r = REPS[focus][e[2]], step = stepFor(e[2], eq);
          return {
            name: e[0], muscles: e[1], sets: e[2] === 'S' || e[2] === 'C' ? 3 : focus === 'strength' ? 5 : 4,
            reps_min: r[0], reps_max: r[1], rest_sec: e[2] === 'B' || e[2] === 'L' ? (focus === 'strength' ? 180 : 150) : e[2] === 'M' ? 105 : 60,
            start_kg: e[3] ? Math.max(step || 1, roundTo(bw * e[3] * scale, step >= 2.5 ? 2.5 : 1)) : 0, step_kg: step
          };
        })
      };
    });
    return {
      split_name: SPLIT[days][0], why: SPLIT[days][1], days: list,
      cardio: focus === 'fat_loss' ? 'After each session: incline walk, 10% incline, 5 km/h, 15–20 min. Builds each week.' : ''
    };
  }

  // This week as 7 slots (Mon → Sun): { code, day: index into plan.days, or -1 for rest }
  function schedule(plan) {
    var n = plan.days.length, pat = WEEK[n] || WEEK[4], i = 0;
    return pat.map(function (c) { return c === '–' ? { code: '–', day: -1 } : { code: plan.days[i] ? plan.days[i].code : c, day: i++ }; });
  }
  function weekday(d) { return ((d || new Date()).getDay() + 6) % 7; } // Mon = 0
  function monday(d) { d = new Date(d || new Date()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - weekday(d)); return d; }

  // ---------- Progressive overload ----------
  // last = the sets from the previous time (any order). Returns today's target.
  function next(ex, last) {
    var done = (last || []).filter(function (s) { return s.done !== false && +s.reps > 0; });
    var inc = ex.step_kg || 0, unit = inc >= 2.5 ? 2.5 : 1;
    if (!done.length) return { kg: ex.start_kg, reps: ex.reps_min, change: 'new', last: null };
    var kg = Math.max.apply(null, done.map(function (s) { return +s.weight_kg || 0; }));
    var top = done.filter(function (s) { return (+s.weight_kg || 0) === kg; });
    var reps = top.map(function (s) { return +s.reps; }), minR = Math.min.apply(null, reps);
    var avg = reps.reduce(function (a, b) { return a + b; }, 0) / reps.length;
    var lastTxt = (kg ? kg + ' kg × ' : '') + Math.max.apply(null, reps);
    if (top.length >= ex.sets && minR >= ex.reps_max) {
      return inc ? { kg: kg + inc, reps: ex.reps_min, change: 'up', last: lastTxt } : { kg: kg, reps: Math.min(ex.reps_max + 5, minR + 1), change: 'up', last: lastTxt };
    }
    if (avg < ex.reps_min - 1 && kg) return { kg: Math.max(unit, roundTo(kg * 0.9, unit)), reps: ex.reps_min, change: 'down', last: lastTxt };
    return { kg: kg, reps: Math.min(ex.reps_max, minR + 1), change: 'same', last: lastTxt };
  }
  function advice(ex, t) {
    if (t.change === 'new') return 'First time. Start light and nail the form.';
    if (t.change === 'up') return 'Last time ' + t.last + '. <b>Try ' + (t.kg ? t.kg + ' kg' : t.reps + ' reps') + ' today.</b>';
    if (t.change === 'down') return 'Last time ' + t.last + '. <b>Drop to ' + t.kg + ' kg and build back up.</b>';
    return 'Last time ' + t.last + '. <b>Same weight, aim for ' + t.reps + ' reps.</b>';
  }

  // ---------- Saving ----------
  function local(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function uid() { var u = FK.db.auth.user(); return u && u.id; }

  function get() {
    if (!live) return Promise.resolve(local('fk-program'));
    return FK.db.select('plans', { select: 'plan,created_at', user_id: 'eq.' + uid() }).then(function (r) { var p = r && r[0] ? r[0].plan : null; local('fk-program-cache', p); return p; },
      function (e) { var c = local('fk-program-cache'); if (c) return c; throw e; });
  }
  function save(plan) {
    if (!live) { local('fk-program', plan); return Promise.resolve(plan); }
    return FK.db.insert('plans', { plan: plan }, true).then(function () { local('fk-program-cache', plan); return plan; });
  }
  // Ask Forkout AI for a plan (live), or use the template. Always resolves with a plan and saves it.
  function build(o) {
    var input = { focus: o.focus || 'muscle', days: +o.days || 4, minutes: +o.minutes || 60, equipment: o.equipment || 'Gym' };
    ['sex', 'age', 'height_cm', 'weight_kg'].forEach(function (k) { if (o[k] != null && o[k] !== '') input[k] = k === 'sex' ? o[k] : +o[k]; });
    var ai = live ? FK.db.fn('build-plan', input).then(function (r) { r.plan.source = 'ai'; return r.plan; }) : Promise.reject(new Error('demo'));
    return ai.catch(function () { var t = template(Object.assign({}, input, o)); t.source = 'template'; return t; })
      .then(function (p) { p.input = input; p.created = new Date().toISOString(); return save(p); });
  }

  // The saved plan, or (if there isn't one yet, e.g. onboarding skipped) a free template made from the profile
  function ensure() {
    return get().then(function (p) {
      if (p && p.days && p.days.length) return p;
      return (FK.store ? FK.store.profile() : Promise.resolve({})).then(function (pr) {
        var t = template({ focus: pr.focus, days: pr.days_per_week || 4, equipment: pr.training_type, weight_kg: pr.weight_kg, sex: pr.sex, age: pr.birth_year ? new Date().getFullYear() - pr.birth_year : null });
        t.source = 'template'; t.input = { focus: pr.focus || 'muscle', days: t.days.length, minutes: 60, equipment: pr.training_type || 'Gym' }; t.created = new Date().toISOString();
        return save(t);
      });
    });
  }

  // Workouts + sets. Sets are saved as they're ticked, so closing the app mid-workout loses nothing.
  function startWorkout(name) {
    var row = { name: String(name).slice(0, 80), started_at: new Date().toISOString() };
    if (!live) { row.id = 'w' + Date.now(); var all = local('fk-workouts') || []; all.push(row); local('fk-workouts', all); return Promise.resolve(row); }
    return FK.db.insert('workouts', row).then(function (r) { return r[0]; });
  }
  function finishWorkout(id) {
    var at = new Date().toISOString();
    if (!live) { local('fk-workouts', (local('fk-workouts') || []).map(function (w) { if (w.id === id) w.finished_at = at; return w; })); return Promise.resolve(); }
    return FK.db.update('workouts', { id: 'eq.' + id }, { finished_at: at });
  }
  function logSet(workoutId, s) {
    var row = { workout_id: workoutId, exercise: String(s.exercise).slice(0, 80), set_no: s.set_no, reps: Math.round(+s.reps || 0), weight_kg: +s.weight_kg || 0, done: true, created_at: new Date().toISOString() };
    if (!live) { row.id = 's' + Date.now() + Math.random().toString(36).slice(2, 6); var all = local('fk-sets') || []; all.push(row); local('fk-sets', all); return Promise.resolve(row); }
    return FK.db.insert('workout_sets', row).then(function (r) { return r[0]; });
  }
  function unlogSet(id) {
    if (!live) { local('fk-sets', (local('fk-sets') || []).filter(function (s) { return s.id !== id; })); return Promise.resolve(); }
    return FK.db.remove('workout_sets', { id: 'eq.' + id });
  }
  // The sets from the most recent earlier workout that had this exercise
  function lastSets(exercise, notWorkout) {
    var pick = function (rows) {
      rows = rows.filter(function (s) { return s.workout_id !== notWorkout; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
      return rows.length ? rows.filter(function (s) { return s.workout_id === rows[0].workout_id; }) : [];
    };
    if (!live) return Promise.resolve(pick((local('fk-sets') || []).filter(function (s) { return s.exercise === exercise; })));
    return FK.db.select('workout_sets', { select: 'workout_id,reps,weight_kg,done,created_at', exercise: 'eq.' + exercise, order: 'created_at.desc', limit: 40 }).then(pick);
  }
  // Finished workouts since Monday
  function thisWeek() {
    var from = monday().toISOString();
    var keep = function (rows) { return rows.filter(function (w) { return w.finished_at && w.started_at >= from; }); };
    if (!live) return Promise.resolve(keep(local('fk-workouts') || []));
    return FK.db.select('workouts', { select: 'id,name,started_at,finished_at', started_at: 'gte.' + from, order: 'started_at.asc' }).then(keep);
  }

  FK.plan = {
    live: live, WEEK: WEEK, template: template, schedule: schedule, weekday: weekday, monday: monday, next: next, advice: advice,
    get: get, save: save, build: build, ensure: ensure, startWorkout: startWorkout, finishWorkout: finishWorkout, logSet: logSet, unlogSet: unlogSet,
    lastSets: lastSets, thisWeek: thisWeek
  };
})();
