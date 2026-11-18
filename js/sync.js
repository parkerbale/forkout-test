// Keeps the screens' on-phone planner (FKPlan, saved as 'fk-plan') in step with the person's account.
// - Every FKPlan.save() also saves to the account (profile columns + the whole planner in profiles.settings).
// - Signing in on a new phone pulls the planner back down.
// Demo mode (no backend set up): does nothing, everything stays on the phone like before.
(function () {
  var FK = window.FK = window.FK || {};
  var live = !!(FK.db && FK.db.live && FK.store);
  var SEX = { f: 'female', m: 'male' }, FOCUS = { 'Build muscle': 'muscle', 'Lose fat': 'fat_loss', 'Get stronger': 'strength', 'Tone & recomp': 'muscle' };
  var timer = 0;

  function clamp(x, lo, hi) { x = +x; return isFinite(x) ? Math.max(lo, Math.min(hi, x)) : null; }
  // The planner → database columns (the screens keep using the planner; the columns are for the server + AI)
  function toProfile(p) {
    var r = window.FKPlan ? FKPlan.calc(p) : { dir: 0, rate: 0 }, m = window.FKPlan ? FKPlan.macros(p) : {};
    return {
      settings: p, sex: SEX[p.sex] || 'other', birth_year: p.age ? new Date().getFullYear() - Math.round(p.age) : null,
      height_cm: clamp(p.height, 80, 260), weight_kg: clamp(p.weight, 25, 400), goal_weight_kg: clamp(p.goalW, 25, 400),
      goal: r.dir > 0 ? 'gain' : r.dir < 0 ? 'lose' : 'maintain', rate_kg_week: r.rate ? clamp(r.rate, 0.1, 1) : null,
      days_per_week: clamp(p.days, 1, 7), focus: FOCUS[p.goal] || 'muscle',
      kcal_target: clamp(Math.round(p.kcal), 800, 7000), protein_g: clamp(Math.round(m.p), 0, 600), carbs_g: clamp(Math.round(m.c), 0, 1200), fat_g: clamp(Math.round(m.f), 0, 400)
    };
  }
  function signedIn() { return live && !!FK.db.auth.user(); }
  function push(p, extra) {
    if (!signedIn()) return Promise.resolve(false);
    var patch = toProfile(p || (window.FKPlan ? FKPlan.get() : JSON.parse(localStorage.getItem('fk-plan') || '{}')));
    for (var k in (extra || {})) patch[k] = extra[k];
    return FK.store.saveProfile(patch).then(function () { try { localStorage.removeItem('fk-sync-pending'); } catch (e) {} return true; },
      function (e) { try { localStorage.setItem('fk-sync-pending', '1'); } catch (x) {} console.warn('Forkout: saved on this phone, will sync later', e); return false; });
  }
  // Account → phone. Resolves { onboarded } so sign-in knows where to go.
  function pull() {
    if (!signedIn()) return Promise.resolve({ onboarded: false });
    return FK.store.profile().then(function (pr) {
      if (pr.settings && typeof pr.settings === 'object') { try { localStorage.setItem('fk-plan', JSON.stringify(pr.settings)); } catch (e) {} }
      return { onboarded: !!pr.onboarded, profile: pr };
    });
  }
  // Right after signing in / up: where to go next
  function afterLogin(next) {
    return pull().then(function (r) {
      if (r.onboarded) return next || 'home.html';
      var did = null; try { did = localStorage.getItem('fk-onboarded'); } catch (e) {}
      if (did) return push(null, { onboarded: true }).then(function () { return next || 'home.html'; }); // did onboarding before making the account
      return 'onboarding.html';
    }, function () { return next || 'home.html'; });
  }

  if (live && window.FKPlan) {
    var save = FKPlan.save;
    FKPlan.save = function (p) { var out = save(p); clearTimeout(timer); timer = setTimeout(function () { push(p); }, 300); return out; };
  }
  // Each page: retry a save that failed while offline, and quietly refresh the planner from the account
  if (signedIn()) {
    var pending = null; try { pending = localStorage.getItem('fk-sync-pending'); } catch (e) {}
    (pending ? push() : pull()).catch(function () {});
  }

  FK.sync = { live: live, push: push, pull: pull, afterLogin: afterLogin, toProfile: toProfile };
})();
