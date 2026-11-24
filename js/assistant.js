/* ============================================================
 * AI ASSISTANT - "Ask about this build"
 * Bring-your-own-key: the user pastes a Groq API key, stored in
 * localStorage only (never sent anywhere except api.groq.com).
 * The page is static; there is no server and no key in the repo.
 * Answers come from an LLM grounded on the current selection,
 * not from the curated database - the UI says so.
 * ============================================================ */

(function () {
  "use strict";
  var KEY_LS = "bcp_groq_key";
  var MODEL = "openai/gpt-oss-120b";
  var ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  var $ = function (sel) { return document.querySelector(sel); };

  function savedKey() {
    try { return localStorage.getItem(KEY_LS) || ""; } catch (e) { return ""; }
  }
  function storeKey(k) {
    try { localStorage.setItem(KEY_LS, k); } catch (e) {}
  }
  function clearKey() {
    try { localStorage.removeItem(KEY_LS); } catch (e) {}
  }

  function renderKeyRow() {
    var row = $("#aiKeyRow");
    if (!row) return;
    row.innerHTML = "";
    if (savedKey()) {
      var note = document.createElement("span");
      note.className = "muted ai-key-saved";
      note.textContent = "API key saved in this browser.";
      var rm = document.createElement("button");
      rm.className = "gen-load";
      rm.type = "button";
      rm.textContent = "Remove key";
      rm.addEventListener("click", function () { clearKey(); renderKeyRow(); });
      row.appendChild(note);
      row.appendChild(rm);
    } else {
      var inp = document.createElement("input");
      inp.type = "password";
      inp.id = "aiKeyInput";
      inp.placeholder = "Groq API key (free at console.groq.com)";
      inp.autocomplete = "off";
      var save = document.createElement("button");
      save.id = "aiKeySave";
      save.className = "gen-load";
      save.type = "button";
      save.textContent = "Save key";
      save.addEventListener("click", function () {
        var v = inp.value.trim();
        if (v.length < 10) { showMsg("That key looks too short. Paste the full key from console.groq.com."); return; }
        storeKey(v);
        showMsg("");
        renderKeyRow();
      });
      row.appendChild(inp);
      row.appendChild(save);
    }
  }

  function showMsg(t) {
    var box = $("#aiAnswer");
    if (box) box.textContent = t || "";
  }

  function systemPrompt() {
    var ctx = window.BCP && window.BCP.assistantContext;
    var base =
      "You are the built-in assistant of Bottleneck Calculator Pro, a PC part-picker. " +
      "Answer questions about the user's current build selection. Be concise, practical, and honest. " +
      "If something is uncertain or depends on information you do not have, say so instead of guessing. " +
      "FPS figures and prices in the app are estimates, not measured benchmarks or live quotes. " +
      "Do not invent specific prices or product models beyond the context. Keep answers under 150 words unless the user asks for detail.";
    if (!ctx) return base;
    return base + "\n\nCurrent build selection (live app state):\n" +
      "CPU: " + ctx.cpu + "\n" +
      "GPU: " + ctx.gpu + "\n" +
      "Motherboard: " + ctx.motherboard + "\n" +
      "Memory: " + ctx.memory + "\n" +
      "PSU: " + ctx.psu + "\n" +
      "Cooler: " + ctx.cooler + "\n" +
      "Storage: " + ctx.storage + "\n" +
      "Resolution: " + ctx.resolution + "\n" +
      "Workload: " + ctx.workload + "\n" +
      "Bottleneck estimate: " + ctx.bottleneckPct + "% (" + ctx.limiter + ")\n" +
      "Estimated total price: " + ctx.totalPrice + "\n" +
      "Compatibility notes currently shown: " + (ctx.advice && ctx.advice.length ? ctx.advice.join(" | ") : "none");
  }

  function ask() {
    var q = $("#aiQuestion").value.trim();
    if (!q) { showMsg("Type a question first."); return; }
    var key = savedKey();
    if (!key) { showMsg("Paste a free Groq API key above first (console.groq.com). It is stored only in this browser."); return; }
    var btn = $("#aiAskBtn");
    btn.disabled = true;
    showMsg("Thinking...");
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: q }
        ],
        max_tokens: 600,
        temperature: 0.3
      })
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var m = (j && j.error && j.error.message) ? j.error.message : ("HTTP " + r.status);
          if (r.status === 401) m = "The API key was rejected. Check it and save it again.";
          throw new Error(m);
        });
      }
      return r.json();
    }).then(function (j) {
      var text = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : "";
      showMsg(text ? text.trim() : "The model returned an empty answer. Try rephrasing.");
    }).catch(function (err) {
      showMsg("Could not get an answer: " + err.message);
    }).finally(function () {
      btn.disabled = false;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderKeyRow();
    var btn = $("#aiAskBtn");
    if (btn) btn.addEventListener("click", ask);
    var q = $("#aiQuestion");
    if (q) q.addEventListener("keydown", function (e) { if (e.key === "Enter") ask(); });
  });
})();
