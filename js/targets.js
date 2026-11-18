// Daily calorie, macro and water targets, worked out by formula (not AI): same answer every time, free, instant.
// Mifflin-St Jeor resting burn × activity, then adjusted for the weight goal and pace.
// FK.targets.calc({ sex, age, height_cm, weight_kg, goal_weight_kg, rate, activity, days, focus })
(function () {
  var FK = window.FK = window.FK || {};

  // How active the person's normal day is (before training). Saved as profiles.activity.
  var LIFE = { low: 1.2, moderate: 1.35, high: 1.5 };
  var PER_SESSION = 0.05;          // each weekly training session adds a little
  var KCAL_PER_KG = 7700;          // ≈ energy in 1 kg of body weight
  var MIN_KCAL = { male: 1500, female: 1200, other: 1350 };
  var MIN_KCAL_TEEN = { male: 2000, female: 1700, other: 1850 };

  function r(x, step) { return Math.round(x / step) * step; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function calc(p) {
    var sex = p.sex === 'male' || p.sex === 'female' ? p.sex : 'other';
    var age = clamp(+p.age || 25, 13, 100), h = clamp(+p.height_cm || 175, 120, 230), w = clamp(+p.weight_kg || 75, 30, 300);
    var goalW = +p.goal_weight_kg || w, rate = clamp(+p.rate || 0.5, 0.1, 1), days = clamp(+p.days || 0, 0, 7);
    var teen = age < 18;

    // 1. Resting burn (Mifflin-St Jeor). "other" uses the middle of the two.
    var bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : sex === 'female' ? -161 : -78);
    // 2. Total daily burn
    var tdee = bmr * ((LIFE[p.activity] || LIFE.low) + days * PER_SESSION);

    // 3. Goal: lose / gain / stay, from the goal weight
    var d = goalW - w, goal = d < -0.25 ? 'lose' : d > 0.25 ? 'gain' : 'maintain';
    var adj = 0;
    if (goal === 'lose') adj = -Math.min(rate * KCAL_PER_KG / 7, tdee * 0.25, teen ? 300 : 1000); // never more than 25% under
    if (goal === 'gain') adj = Math.min(rate, 0.5) * KCAL_PER_KG / 7 * 0.5;                        // lean gain: a smaller surplus
    var floor = (teen ? MIN_KCAL_TEEN : MIN_KCAL)[sex];
    var kcal = clamp(r(Math.max(floor, tdee + adj), 10), 800, 7000);

    // 4. Macros. Protein from a "healthy weight" so heavier people don't get silly numbers.
    var ref = Math.min(w, 25 * Math.pow(h / 100, 2));
    var protein = r(ref * (goal === 'lose' ? 2.2 : 2.0), 5);
    var fat = r(Math.max(kcal * 0.25 / 9, ref * 0.6), 5);
    var carbs = r(Math.max(50, (kcal - protein * 4 - fat * 9) / 4), 5);
    if (protein * 4 + fat * 9 + carbs * 4 > kcal + 60) protein = r((kcal - fat * 9 - carbs * 4) / 4, 5); // keep it adding up

    // 5. Water: ~35 ml per kg plus a bit for training days
    var water = clamp(r(35 * w + days * 70, 100), 1500, 5000);

    // 6. When they'll reach the goal (weeks), at the pace they chose
    var weeks = goal === 'maintain' ? 0 : Math.ceil(Math.abs(d) / (goal === 'gain' ? Math.min(rate, 0.5) : Math.min(rate, -adj * 7 / KCAL_PER_KG)));

    return {
      goal: goal, kcal_target: kcal, protein_g: protein, carbs_g: carbs, fat_g: fat, water_ml: water,
      bmr: Math.round(bmr), tdee: Math.round(tdee), weeks: weeks, teen: teen
    };
  }

  FK.targets = { calc: calc, LIFE: LIFE };
})();
