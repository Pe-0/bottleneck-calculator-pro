/* ============================================================
 * AI ASSISTANT - "Ask about this build"
 * Bring-your-own-key: the user pastes a Groq API key. It is sent
 * directly from this browser to api.groq.com and nowhere else.
 * Default handling is memory-only: the key lives in a JS variable
 * and is gone when the tab closes. Persistence is opt-in via the
 * "Remember on this device" checkbox (localStorage). There is no
 * server and no key in the repo.
 * Answers come from an LLM grounded on the current selection,
 * not from the curated database - the UI says so.
 * ============================================================ */

(function () {
  "use strict";
  var LS_REMEMBER = "bcp_groq_key_remember"; // opt-in persistence only
  var LS_LEGACY = "bcp_groq_key";            // v1 key, always cleared on load
  var MODEL = "openai/gpt-oss-120b";
  var ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  var memKey = ""; // session-scoped, lost on tab close

  var $ = function (sel) { return document.querySelector(sel); };

  // Migration: v1 persisted the key without asking. Never keep it.
  try { localStorage.removeItem(LS_LEGACY); } catch (e) {}

  function rememberedKey() {
    try { return localStorage.getItem(LS_REMEMBER) || ""; } catch (e) { return ""; }
  }
  function activeKey() {
    if (memKey) return memKey;
    var r = rememberedKey();
    if (r) memKey = r;
    return r;
  }
  function isRemembered() { return !!rememberedKey(); }

  function saveKey(v, remember) {
    memKey = v;
    try {
      if (remember) localStorage.setItem(LS_REMEMBER, v);
      else localStorage.removeItem(LS_REMEMBER);
    } catch (e) {}
  }
  function clearKey() {
    memKey = "";
    try { localStorage.removeItem(LS_REMEMBER); } catch (e) {}
  }

  function renderKeyRow() {
    var row = $("#aiKeyRow");
    if (!row) return;
    row.innerHTML = "";
    if (!window.isSecureContext) {
      var warn = document.createElement("span");
      warn.className = "muted ai-key-saved";
      warn.textContent = "API key entry is disabled on this insecure (HTTP) connection. It comes back automatically once HTTPS is active on bcalc.mooo.com.";
      row.appendChild(warn);
      return;
    }
    if (activeKey()) {
      var note = document.createElement("span");
      note.className = "muted ai-key-saved";
      note.textContent = isRemembered()
        ? "Key remembered on this device."
        : "Key ready (this tab only).";
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
        var cb = $("#aiRemember");
        saveKey(v, !!(cb && cb.checked));
        showMsg("");
        renderKeyRow();
      });
      var remWrap = document.createElement("label");
      remWrap.className = "ai-remember";
      var rem = document.createElement("input");
      rem.type = "checkbox";
      rem.id = "aiRemember";
      var remTxt = document.createElement("span");
      remTxt.textContent = "Remember on this device";
      remWrap.appendChild(rem);
      remWrap.appendChild(remTxt);
      row.appendChild(inp);
      row.appendChild(remWrap);
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
      "Do not invent specific prices or product models beyond the context. Keep answers under 150 words unless the user asks for detail." + (window.I18N && I18N.active ? " Answer in Arabic (Modern Standard, simple), keeping part names, model numbers and units in Latin script." : "");
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
    var key = activeKey();
    if (!key) { showMsg("Paste a free Groq API key above first (console.groq.com). It is sent straight to Groq from this browser and kept only for this visit unless you opt in to remembering it."); return; }
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
