/* ============================================================
 * COMMUNITY BUILDS — public build sharing via Supabase
 * Browsing is open to everyone (RLS public read). Sharing and
 * deleting require a signed-in account; users can only delete
 * their own rows. Emails are never shown - only the display
 * name the sharer picked.
 * ============================================================ */
(function () {
  "use strict";
  var SUPABASE_URL = "https://jejnmtjugnckzdhzceiq.supabase.co";
  var SUPABASE_KEY = "sb_publishable_UYtzt5bsvas8UH8J1ahyJQ_YMjqf3Sm";
  var $ = function (sel) { return document.querySelector(sel); };
  var sb = null, user = null, rows = [];

  function setStatus(msg, isErr) {
    var el = $("#commStatus");
    if (el) { el.textContent = msg || ""; el.classList.toggle("acct-err", !!isErr); }
  }

  function renderShare() {
    var area = $("#commShareArea");
    if (!area) return;
    if (!sb) {
      area.innerHTML = '<p class="muted">Sharing is unavailable while offline; browsing still works from cache.</p>';
      return;
    }
    if (!user) {
      area.innerHTML = '<p class="muted">Sign in from the sidebar to share your build publicly. Browsing is open to everyone, no account needed.</p>';
      return;
    }
    area.innerHTML =
      '<div class="comm-share-form">' +
      '<input type="text" id="commTitle" maxlength="80" placeholder="Build title (e.g. Quiet 1440p rig)" />' +
      '<input type="text" id="commName" maxlength="40" placeholder="Display name" />' +
      '<button type="button" id="commShareBtn" class="gen-load">Share current build</button>' +
      '</div>' +
      '<p class="muted comm-note">Shared builds are public: anyone can see and load them. Your email is never shown - only the display name above.</p>' +
      '<div class="acct-status muted" id="commStatus"></div>';
    var saved = null;
    try { saved = localStorage.getItem("bcp.comm.name"); } catch (e) {}
    if (saved) $("#commName").value = saved;
    $("#commShareBtn").addEventListener("click", share);
  }

  function summaryFromCtx() {
    var c = (window.BCP && BCP.assistantContext) || {};
    var parts = [c.cpu, c.gpu].filter(Boolean).join(" + ");
    if (c.resolution) parts += " · " + c.resolution;
    if (c.workload) parts += " · " + c.workload;
    if (typeof c.bottleneckPct === "number") parts += " · " + c.bottleneckPct + "% bottleneck";
    return (parts || "Custom build").slice(0, 160);
  }

  function share() {
    if (!user) return;
    var title = (($("#commTitle") || {}).value || "").trim();
    var name = (($("#commName") || {}).value || "").trim();
    if (!title) { setStatus("Give your build a title.", true); return; }
    if (!name) { setStatus("Pick a display name.", true); return; }
    if (!BCP.currentBuildCode) { setStatus("Build code unavailable.", true); return; }
    setStatus("Sharing...");
    sb.from("community_builds").insert({
      user_id: user.id,
      owner_name: name,
      title: title,
      summary: summaryFromCtx(),
      code: BCP.currentBuildCode()
    }).then(function (res) {
      if (res.error) { setStatus(res.error.message, true); return; }
      try { localStorage.setItem("bcp.comm.name", name); } catch (e) {}
      $("#commTitle").value = "";
      setStatus("Shared - it is live in the list below.");
      loadRows();
    });
  }

  function renderList() {
    var box = $("#communityList");
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<p class="muted">No shared builds yet - be the first.</p>';
      return;
    }
    box.innerHTML = "";
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "saved-row comm-row";
      var mid = document.createElement("span");
      mid.className = "saved-name comm-mid";
      var t = document.createElement("strong");
      t.textContent = r.title;
      var meta = document.createElement("span");
      meta.className = "muted comm-meta";
      meta.textContent = " by " + r.owner_name + " · " + new Date(r.created_at).toLocaleDateString();
      var sum = document.createElement("span");
      sum.className = "comm-sum muted";
      sum.textContent = r.summary;
      mid.appendChild(t);
      mid.appendChild(meta);
      mid.appendChild(sum);
      var act = document.createElement("span");
      act.className = "saved-actions";
      var load = document.createElement("button");
      load.type = "button";
      load.className = "gen-load saved-load";
      load.textContent = "Load";
      load.addEventListener("click", function () {
        if (BCP.applyBuildCode && BCP.applyBuildCode(r.code)) {
          try { history.replaceState(null, "", "#b=" + r.code); } catch (e) {}
          document.querySelector('.tab-btn[data-view="calc"]').click();
        }
      });
      act.appendChild(load);
      if (user && user.id === r.user_id) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "gen-load saved-del";
        del.textContent = "Delete";
        del.addEventListener("click", function () { delRow(r.id); });
        act.appendChild(del);
      }
      row.appendChild(mid);
      row.appendChild(act);
      box.appendChild(row);
    });
  }

  function loadRows() {
    if (!sb) return;
    sb.from("community_builds")
      .select("id,user_id,owner_name,title,summary,code,created_at")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(function (res) {
        var box = $("#communityList");
        if (res.error) {
          if (box) box.innerHTML = '<p class="muted">Could not load community builds right now.</p>';
          return;
        }
        rows = res.data || [];
        renderList();
      });
  }

  function delRow(id) {
    sb.from("community_builds").delete().eq("id", id).then(function (res) {
      if (res.error) { setStatus(res.error.message, true); return; }
      rows = rows.filter(function (r) { return r.id !== id; });
      renderList();
    });
  }

  function wireTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var el = $("#viewCommunity");
        if (!el) return;
        if (b.getAttribute("data-view") === "community") {
          el.classList.remove("hidden");
          loadRows();
          window.scrollTo(0, 0);
        } else {
          el.classList.add("hidden");
        }
      });
    });
  }

  function init() {
    wireTabs();
    renderShare();
    import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(function (mod) {
      sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
      sb.auth.onAuthStateChange(function (_e, session) {
        user = session && session.user ? session.user : null;
        renderShare();
        renderList();
      });
      sb.auth.getSession().then(function (res) {
        user = res.data && res.data.session ? res.data.session.user : null;
        renderShare();
      });
      loadRows();
    }).catch(function () {
      sb = null;
      renderShare();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
