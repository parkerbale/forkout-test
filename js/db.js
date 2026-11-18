// Forkout accounts + database. Talks straight to Supabase (sign-in = Supabase Auth, data = its REST API).
// No backend set up in js/config.js → FK.db.live is false and every screen keeps its demo behaviour.
// The login (session) is kept on this device in localStorage 'fk-auth' and refreshed automatically.
(function () {
  var FK = window.FK = window.FK || {};
  var C = window.FK_CONFIG || {};
  // Developer override for local testing only: localStorage 'fk-dev-api' = {"supabaseUrl": "...", "supabaseKey": "..."}
  try { var dev = JSON.parse(localStorage.getItem('fk-dev-api') || 'null'); if (dev && dev.supabaseUrl) C = dev; } catch (e) {}
  var URL0 = (C.supabaseUrl || '').replace(/\/$/, ''), KEY = C.supabaseKey || '';
  var live = !!(URL0 && KEY);
  var SKEY = 'fk-auth';

  function load() { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } }
  function save(s) { try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) {} }
  // Supabase sends expires_in (seconds). We store an absolute time.
  function keep(d) {
    var s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: d.user || null };
    save(s); return s;
  }

  // Plain-English messages for the errors people actually hit
  function friendly(msg, status) {
    var m = String(msg || '');
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
    if (/already registered|already been registered|user_already_exists/i.test(m)) return 'There’s already an account with that email. Sign in instead.';
    if (/email not confirmed/i.test(m)) return 'Check your email and tap the link to confirm your account first.';
    if (/password should be|weak.?password/i.test(m)) return 'Use a password with at least 8 characters.';
    if (/rate limit|too many requests/i.test(m)) return 'Too many tries. Wait a minute and try again.'; // our own 429s (e.g. scan limit) keep their message
    if (/provider is not enabled|unsupported provider/i.test(m)) return 'That sign-in option isn’t switched on yet. Use email for now.';
    if (/failed to fetch|networkerror|load failed/i.test(m)) return 'No connection. Check your internet and try again.';
    return m || ('Something went wrong (' + status + ')');
  }

  function req(path, opts, token) {
    opts = opts || {};
    var h = { apikey: KEY, 'Content-Type': 'application/json' };
    h.Authorization = 'Bearer ' + (token || KEY);
    for (var k in (opts.headers || {})) h[k] = opts.headers[k];
    return fetch(URL0 + path, { method: opts.method || 'GET', headers: h, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
      .catch(function (e) { throw new Error(friendly(e.message, 0)); })
      .then(function (r) {
        return r.text().then(function (t) {
          var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
          if (!r.ok) {
            var msg = d && (d.error_description || d.msg || d.message || d.error) || ('Error ' + r.status);
            var err = new Error(friendly(msg, r.status)); err.status = r.status; throw err;
          }
          return d;
        });
      });
  }

  // ---------- Auth ----------
  var refreshing = null;
  function refresh(s) {
    if (refreshing) return refreshing;
    refreshing = req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } })
      .then(keep, function (e) { if (e.status === 400 || e.status === 401) save(null); throw e; })
      .then(function (x) { refreshing = null; return x; }, function (e) { refreshing = null; throw e; });
    return refreshing;
  }
  // The current login, refreshed if it expires within a minute. null = signed out.
  function session() {
    var s = load();
    if (!s || !s.refresh_token) return Promise.resolve(null);
    if (s.expires_at - Date.now() > 60000) return Promise.resolve(s);
    return refresh(s).catch(function (e) { return e.status ? null : s; }); // offline: keep the old one
  }
  function token() { return session().then(function (s) { if (!s) { var e = new Error('Please sign in again.'); e.status = 401; throw e; } return s.access_token; }); }

  var auth = {
    session: session,
    user: function () { var s = load(); return s && s.user; },
    signUp: function (email, password, name) {
      return req('/auth/v1/signup', { method: 'POST', body: { email: email, password: password, data: { name: name || '' } } })
        .then(function (d) { if (d && d.access_token) { keep(d); return { signedIn: true }; } return { confirmEmail: true }; });
    },
    signIn: function (email, password) {
      return req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }).then(keep);
    },
    // Apple / Google: goes to the provider, which comes back to signin.html with the login in the address (#access_token=…)
    oauth: function (provider, back) {
      location.href = URL0 + '/auth/v1/authorize?provider=' + encodeURIComponent(provider) + '&redirect_to=' + encodeURIComponent(back || location.href.split('#')[0]);
    },
    // Call on the page the provider returns to. Resolves true when a login was found in the address.
    fromRedirect: function () {
      var h = new URLSearchParams(location.hash.slice(1));
      if (h.get('error_description')) return Promise.reject(new Error(friendly(h.get('error_description'))));
      if (!h.get('access_token')) return Promise.resolve(false);
      var d = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: +h.get('expires_in') || 3600 };
      history.replaceState(null, '', location.pathname + location.search);
      return req('/auth/v1/user', {}, d.access_token).then(function (u) { d.user = u; keep(d); return true; });
    },
    resetPassword: function (email, back) {
      return req('/auth/v1/recover', { method: 'POST', body: { email: email, redirect_to: back } });
    },
    signOut: function () {
      var s = load(); save(null);
      try { localStorage.removeItem('fk-profile-cache'); } catch (e) {}
      if (!s) return Promise.resolve();
      return req('/auth/v1/logout', { method: 'POST' }, s.access_token).catch(function () {});
    },
    // Deletes the account and ALL its data (Apple requires an in-app delete option). Done by the delete-account function.
    deleteAccount: function () { return fn('delete-account', {}).then(function () { return auth.signOut(); }); }
  };

  // ---------- Data (REST). Row-level security on the server makes sure you only ever see your own rows. ----------
  function q(params) { return Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&'); }
  var db = {
    select: function (table, params) { return token().then(function (t) { return req('/rest/v1/' + table + '?' + q(params), {}, t); }); },
    insert: function (table, rows, upsert) {
      return token().then(function (t) {
        return req('/rest/v1/' + table, { method: 'POST', body: rows, headers: { Prefer: 'return=representation' + (upsert ? ',resolution=merge-duplicates' : '') } }, t);
      });
    },
    update: function (table, match, patch) { return token().then(function (t) { return req('/rest/v1/' + table + '?' + q(match), { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } }, t); }); },
    remove: function (table, match) { return token().then(function (t) { return req('/rest/v1/' + table + '?' + q(match), { method: 'DELETE' }, t); }); },
    rpc: function (name, args) { return token().then(function (t) { return req('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} }, t); }); }
  };

  // ---------- Edge Functions (AI). Sent with your login so the server knows who's asking. ----------
  function fn(name, body) { return token().then(function (t) { return req('/functions/v1/' + name, { method: 'POST', body: body }, t); }); }

  // ---------- Pages that need a login send you to sign in (only when the backend is set up) ----------
  // <body data-auth="none"> = open page (sign-in, onboarding intro, paywall).
  function guard() {
    if (!live || document.body.dataset.auth === 'none') return;
    if (!load()) { location.replace('signin.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash)); return; }
    session().then(function (s) { if (!s) location.replace('signin.html'); });
  }

  FK.db = { live: live, auth: auth, select: db.select, insert: db.insert, update: db.update, remove: db.remove, rpc: db.rpc, fn: fn, friendly: friendly };
  guard();
})();
