/* ============================================================
 * AUTH + CLOUD SAVES — Supabase-backed accounts
 * Guests keep the local-only flow untouched; signing in adds
 * cloud-saved builds synced to the user's account.
 * Project: bottleneck-calculator-pro (jejnmtjugnckzdhzceiq)
 * The publishable key is browser-safe: every table is behind
 * row-level security, so it can only ever reach the signed-in
 * user's own rows.
 * ============================================================ */
(function () {
  "use strict";
  var SUPABASE_URL = "https://jejnmtjugnckzdhzceiq.supabase.co";
  var SUPABASE_KEY = "sb_publishable_UYtzt5bsvas8UH8J1ahyJQ_YMjqf3Sm";
  var $ = function (sel) { return document.querySelector(sel); };
  var sb = null, user = null, cloudRows = [], recoveryMode = false;

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function status(msg, isErr) {
    var el = $("#acctStatus");
    if (el) { el.textContent = msg || ""; el.classList.toggle("acct-err", !!isErr); }
  }

  function renderNavAuth() {
    var btn = $("#navAuthBtn");
    if (!btn) return;
    if (user) {
      btn.textContent = "Log out";
      btn.classList.remove("login");
      btn.classList.add("logout");
    } else {
      btn.textContent = "Log in";
      btn.classList.remove("logout");
      btn.classList.add("login");
    }
  }

  function showAuthView() {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.add("hidden"); });
    document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.remove("active"); });
    var v = $("#viewAuth");
    if (v) v.classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function renderAccount() {
    renderNavAuth();
    var box = $("#viewAuthBody");
    if (!box) return;
    if (!sb) {
      box.innerHTML = '<span class="muted">Cloud saves unavailable (offline).</span>';
      return;
    }
    if ((!user || recoveryMode) && !window.isSecureContext) {
      box.innerHTML =
        '<div class="auth-head"><h2>Secure sign-in only.</h2>' +
        '<p class="muted">This page was loaded over an insecure (HTTP) connection, where a password could be intercepted or the page modified in transit. Sign-in and cloud sync are disabled here.</p></div>' +
        '<a class="auth-primary auth-secure-link" href="https://pe-0.github.io/bottleneck-calculator-pro/">Open the secure HTTPS version</a>' +
        '<div class="acct-status muted">Full HTTPS on bcalc.mooo.com is being provisioned - everything else on this page works as usual.</div>';
      renderNavAuth();
      return;
    }
    if (recoveryMode) {
      box.innerHTML =
        '<div class="auth-head"><h2>Choose a new password.</h2>' +
        '<p class="muted">You opened a password-reset link. Set a new password for your account below.</p></div>' +
        '<label class="auth-field"><span>New password</span>' +
        '<input type="password" id="acctNewPass" placeholder="At least 6 characters" autocomplete="new-password" /></label>' +
        '<label class="auth-field"><span>Repeat new password</span>' +
        '<input type="password" id="acctNewPass2" placeholder="Same password again" autocomplete="new-password" /></label>' +
        '<button type="button" id="acctSetPass" class="auth-primary">Update password</button>' +
        '<div class="acct-status muted" id="acctStatus"></div>';
      $("#acctSetPass").addEventListener("click", doSetPassword);
      $("#acctNewPass2").addEventListener("keydown", function (e) { if (e.key === "Enter") doSetPassword(); });
      return;
    }
    if (!user) {
      box.innerHTML =
        '<div class="auth-head"><h2>Welcome back.</h2>' +
        '<p class="muted">Sign in to sync your builds and share them to the community gallery.</p></div>' +
        '<label class="auth-field"><span>Email</span>' +
        '<input type="email" id="acctEmail" placeholder="you@example.com" autocomplete="email" /></label>' +
        '<label class="auth-field"><span>Password</span>' +
        '<input type="password" id="acctPass" placeholder="Your password" autocomplete="current-password" /></label>' +
        '<button type="button" id="acctSignIn" class="auth-primary">Sign in</button>' +
        '<button type="button" id="acctForgot" class="auth-forgot">Forgot password?</button>' +
        '<div class="auth-divider"><span>New to Bottleneck Calculator Pro?</span></div>' +
        '<button type="button" id="acctSignUp" class="auth-secondary">Create an account</button>' +
        '<div class="acct-status muted" id="acctStatus"></div>';
      $("#acctSignIn").addEventListener("click", function () { doAuth("in"); });
      $("#acctSignUp").addEventListener("click", function () { doAuth("up"); });
      $("#acctForgot").addEventListener("click", doReset);
      $("#acctPass").addEventListener("keydown", function (e) { if (e.key === "Enter") doAuth("in"); });
    } else {
      var initial = (user.email || "?").charAt(0).toUpperCase();
      box.innerHTML =
        '<div class="auth-user-row">' +
        '  <span class="auth-avatar" aria-hidden="true"></span>' +
        '  <div class="auth-user-meta"><strong></strong><span class="muted">Signed in - cloud sync is on</span></div>' +
        '</div>' +
        '<button type="button" id="acctSignOut" class="auth-secondary">Sign out</button>' +
        '<div class="acct-status muted" id="acctStatus"></div>';
      box.querySelector(".auth-avatar").textContent = initial;
      box.querySelector(".auth-user-meta strong").textContent = user.email;
      $("#acctSignOut").addEventListener("click", doSignOut);
    }
    renderCloudArea();
  }

  function renderCloudArea() {
    var btn = $("#cloudSaveBtn");
    if (btn) btn.hidden = !user;
    ["#cloudBuilds", "#cloudBuildsAuth"].forEach(function (sel) {
      var box = $(sel);
      if (!box) return;
      if (!user) { box.innerHTML = ""; return; }
      if (!cloudRows.length) {
        box.innerHTML = '<p class="muted" style="font-size:0.85rem;">No cloud saves yet - use "Save to cloud" to keep builds on your account.</p>';
        return;
      }
      box.innerHTML = '<h3 class="sb-cloud-title">Cloud saves</h3>';
      cloudRows.forEach(function (r) {
        var row = document.createElement("div");
        row.className = "saved-row";
        row.innerHTML = '<span class="saved-name"></span>' +
          '<span class="saved-actions"><button type="button" class="gen-load saved-load">Load</button>' +
          '<button type="button" class="gen-load saved-del">Delete</button></span>';
        row.querySelector(".saved-name").textContent = r.name + " · " + new Date(r.created_at).toLocaleDateString();
        row.querySelector(".saved-load").addEventListener("click", function () {
          if (r.code && BCP.applyBuildCode && BCP.applyBuildCode(r.code)) {
            try { history.replaceState(null, "", "#b=" + r.code); } catch (e) {}
            document.querySelector('.tab-btn[data-view="calc"]').click();
            status("Loaded: " + r.name);
          } else status("Could not load that build.", true);
        });
        row.querySelector(".saved-del").addEventListener("click", function () { delBuild(r.id); });
        box.appendChild(row);
      });
    });
  }

  function doAuth(mode) {
    var email = ($("#acctEmail") || {}).value, pass = ($("#acctPass") || {}).value;
    if (!email || !pass) { status("Enter email and password.", true); return; }
    status(mode === "up" ? "Creating account..." : "Signing in...");
    var p = mode === "up" ? sb.auth.signUp({ email: email, password: pass })
                          : sb.auth.signInWithPassword({ email: email, password: pass });
    p.then(function (res) {
      if (res.error) { status(res.error.message, true); return; }
      if (mode === "up" && !res.data.session) {
        status("Account created - confirm it from the email we sent, then sign in.");
      } else {
        status("");
      }
    }).catch(function (e) { status(String(e), true); });
  }

  function doReset() {
    var email = ($("#acctEmail") || {}).value;
    if (!email) { status("Enter your email above first, then click Forgot password.", true); return; }
    status("Sending reset link...");
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
      .then(function (res) {
        if (res.error) { status(res.error.message, true); return; }
        status("Reset link sent - check your email and open the link on this device.");
      }).catch(function (e) { status(String(e), true); });
  }

  function doSetPassword() {
    var p1 = ($("#acctNewPass") || {}).value, p2 = ($("#acctNewPass2") || {}).value;
    if (!p1 || p1.length < 6) { status("Password needs at least 6 characters.", true); return; }
    if (p1 !== p2) { status("The two passwords do not match.", true); return; }
    status("Updating password...");
    sb.auth.updateUser({ password: p1 }).then(function (res) {
      if (res.error) { status(res.error.message, true); return; }
      recoveryMode = false;
      status("");
      renderAccount();
    }).catch(function (e) { status(String(e), true); });
  }

  function doSignOut() {
    sb.auth.signOut().then(function () { cloudRows = []; });
  }

  function loadCloudBuilds() {
    if (!user) return;
    sb.from("builds").select("id,name,code,created_at").order("created_at", { ascending: false }).limit(50)
      .then(function (res) {
        if (res.error) { status(res.error.message, true); return; }
        cloudRows = res.data || [];
        renderCloudArea();
      });
  }

  function saveCloud() {
    if (!user || !BCP.currentBuildCode) return;
    var code = BCP.currentBuildCode();
    var ctx = BCP.assistantContext || {};
    var name = (ctx.cpu && ctx.gpu) ? (ctx.cpu + " + " + ctx.gpu) : ("Build " + new Date().toLocaleDateString());
    status("Saving to cloud...");
    sb.from("builds").insert({ user_id: user.id, name: name, code: code })
      .then(function (res) {
        if (res.error) { status(res.error.message, true); return; }
        status("Saved to your account.");
        loadCloudBuilds();
      });
  }

  function delBuild(id) {
    sb.from("builds").delete().eq("id", id).then(function (res) {
      if (res.error) { status(res.error.message, true); return; }
      cloudRows = cloudRows.filter(function (r) { return r.id !== id; });
      renderCloudArea();
    });
  }

  function init() {
    var btn = $("#cloudSaveBtn");
    if (btn) btn.addEventListener("click", saveCloud);
    var navBtn = $("#navAuthBtn");
    if (navBtn) navBtn.addEventListener("click", function () {
      if (user) doSignOut(); else showAuthView();
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = $("#viewAuth");
        if (v) v.classList.add("hidden");
      });
    });
    import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(function (mod) {
      sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
      sb.auth.onAuthStateChange(function (evt, session) {
        user = session && session.user ? session.user : null;
        if (evt === "PASSWORD_RECOVERY") { recoveryMode = true; showAuthView(); }
        renderAccount();
        if (user) loadCloudBuilds();
      });
      sb.auth.getSession().then(function (res) {
        user = res.data && res.data.session ? res.data.session.user : null;
        renderAccount();
        if (user) loadCloudBuilds();
      });
    }).catch(function () { renderAccount(); });
    renderAccount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
