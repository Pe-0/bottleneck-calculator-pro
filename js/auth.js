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
  var sb = null, user = null, cloudRows = [];

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function status(msg, isErr) {
    var el = $("#acctStatus");
    if (el) { el.textContent = msg || ""; el.classList.toggle("acct-err", !!isErr); }
  }

  function renderAccount() {
    var box = $("#accountBox");
    if (!box) return;
    if (!sb) {
      box.innerHTML = '<span class="muted">Cloud saves unavailable (offline).</span>';
      return;
    }
    if (!user) {
      box.innerHTML =
        '<div class="acct-title">Account <span class="muted">cloud saves</span></div>' +
        '<input type="email" id="acctEmail" placeholder="Email" autocomplete="email" />' +
        '<input type="password" id="acctPass" placeholder="Password" autocomplete="current-password" />' +
        '<div class="acct-btns">' +
        '  <button type="button" id="acctSignIn">Sign in</button>' +
        '  <button type="button" id="acctSignUp" class="acct-alt">Sign up</button>' +
        '</div>' +
        '<div class="acct-status muted" id="acctStatus"></div>';
      $("#acctSignIn").addEventListener("click", function () { doAuth("in"); });
      $("#acctSignUp").addEventListener("click", function () { doAuth("up"); });
    } else {
      box.innerHTML =
        '<div class="acct-title">Account</div>' +
        '<div class="acct-user" title="' + esc(user.email) + '">' + esc(user.email) + '</div>' +
        '<div class="acct-btns"><button type="button" id="acctSignOut" class="acct-alt">Sign out</button></div>' +
        '<div class="acct-status muted" id="acctStatus"></div>';
      $("#acctSignOut").addEventListener("click", doSignOut);
    }
    renderCloudArea();
  }

  function renderCloudArea() {
    var btn = $("#cloudSaveBtn");
    if (btn) btn.hidden = !user;
    var box = $("#cloudBuilds");
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
    import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(function (mod) {
      sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
      sb.auth.onAuthStateChange(function (_e, session) {
        user = session && session.user ? session.user : null;
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
