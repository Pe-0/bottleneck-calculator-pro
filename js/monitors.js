/* ============================================================
 * MONITORS — monitor planner: curated catalog matched against
 * the Calculator build (can this build feed that panel?).
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };
  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }

  function gameFpsAt(g, cpuGaming, gpuScore, mon, workload, vramGB) {
    var base = eng.gameFps(g, cpuGaming, gpuScore, mon.fpsRes, workload, vramGB);
    return Math.round(base * mon.fpsScale);
  }

  function verdictFor(avgFps, medFps, refreshHz) {
    if (medFps >= refreshHz) {
      if (medFps >= refreshHz * 1.8) {
        return { cls: "mid", text: "This build far exceeds the panel - consider a higher-resolution or faster monitor to let it stretch." };
      }
      return { cls: "good", text: "Great match - the build can saturate this refresh rate in most games (est.)." };
    }
    if (medFps >= refreshHz * 0.6) {
      return { cls: "good", text: "Good match - near the refresh rate in most games; esports titles will exceed it." };
    }
    if (medFps >= refreshHz * 0.35) {
      return { cls: "mid", text: "Playable, but the panel is faster than this build can feed in demanding games." };
    }
    return { cls: "bad", text: "Underpowered for this panel - most demanding games will sit far below the refresh rate." };
  }

  function renderMonitors(sel) {
    var box = $("#mnList");
    box.innerHTML = "";
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    BCP.monitors.items.forEach(function (m) {
      var fpss = BCP.games.items.map(function (g) {
        return gameFpsAt(g, cpuBench.gaming, gpuScore, m, sel.workload, sel.gpu.vramGB);
      }).sort(function (a, b) { return a - b; });
      var med = fpss[Math.floor(fpss.length / 2)];
      var avg = Math.round(fpss.reduce(function (s, f) { return s + f; }, 0) / fpss.length);
      var v = verdictFor(avg, med, m.refreshHz);

      var card = document.createElement("div");
      card.className = "gm-card mn-card";
      card.innerHTML =
        '<div class="gm-head"><strong></strong><span class="gm-genre muted"></span></div>' +
        '<div class="gm-stats">' +
          '<span class="gm-fps"><b>' + med + "</b> fps median est.</span>" +
          '<span class="muted">' + m.refreshHz + " Hz · avg " + avg + " fps</span>" +
          '<span class="mn-price">' + fmtUsd(m.priceUSD) + "</span>" +
        "</div>" +
        '<ul class="warn-list mn-verdict"><li class="warn ' + v.cls + '"></li></ul>' +
        '<div class="mn-actions"><button type="button" class="gen-load mn-set">Set calculator to ' + m.res + "</button></div>";
      card.querySelector(".gm-head strong").textContent = m.name;
      card.querySelector(".gm-genre").textContent = m.panel + " · " + m.res;
      card.querySelector(".mn-verdict li").textContent = v.text;
      card.querySelector(".mn-set").addEventListener("click", function () {
        if (!BCP.currentBuildCode || !BCP.applyBuildCode) return;
        var parts = BCP.currentBuildCode().split(",");
        parts[8] = m.fpsRes;
        if (BCP.applyBuildCode(parts.join(","))) {
          try { history.replaceState(null, "", "#b=" + parts.join(",")); } catch (e) {}
          document.querySelector('.tab-btn[data-view="calc"]').click();
        }
      });
      box.appendChild(card);
    });
  }

  function renderAll() {
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    $("#mnBuildLine").textContent = sel.cpu.name + " + " + sel.gpu.name + " · " + eng.WORKLOADS[sel.workload].label + " (from the Calculator tab)";
    renderMonitors(sel);
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "monitors") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          ["viewCalc", "viewCompare", "viewUpgrade", "viewPower", "viewGames", "viewDash"].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.classList.add("hidden");
          });
          $("#viewMonitors").classList.remove("hidden");
          window.scrollTo(0, 0);
          renderAll();
        });
      } else {
        b.addEventListener("click", function () { var v = $("#viewMonitors"); if (v) v.classList.add("hidden"); });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
