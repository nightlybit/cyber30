"use strict";
/* Cyber30 — one app for Linux and Android. Progress lives on the device and is
   synced (last-write-wins) to the shared SQLite database on your Kali machine. */

// ------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
const pad = (n) => String(n).padStart(2, "0");
const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return today(d); };
const nowS = () => Date.now() / 1000;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const lsJSON = (k) => { try { return JSON.parse(lsGet(k)); } catch { return null; } };
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

function toast(msg, ms = 2600) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), ms);
}
function confetti() {
  const colors = ["#3ddc97", "#4cc9f0", "#ffb703", "#a78bfa", "#ef476f"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("i"); c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw"; c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s"; c.style.animationDelay = Math.random() * 0.4 + "s";
    document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
  }
}

// ------------------------------------------------------------ curriculum map
const WEEKS = [
  [1, 6, "Week 1 · Foundations & mindset"], [7, 12, "Week 2 · Recon & network attacks"],
  [13, 18, "Week 3 · Network & web attacks"], [19, 24, "Week 4 · Web, exploitation & privilege escalation"],
  [25, 30, "Final stretch · The defender's view & pro practice"],
];
const PLANNED = {
  1: "The hacker mindset", 2: "Linux terminal essentials", 3: "Users, permissions & processes", 4: "Networking 101",
  5: "How the web works", 6: "Seeing traffic", 7: "Threat modeling & attack surface", 8: "OSINT & passive recon",
  9: "Nmap deep dive", 10: "Service enumeration", 11: "CVE, CWE, CVSS & zero-days", 12: "Passwords & cracking",
  13: "Man-in-the-middle", 14: "Wireless security", 15: "Burp Suite & web proxying", 16: "OWASP Top 10 & access control",
  17: "SQL injection", 18: "Cross-site scripting", 19: "Authentication & sessions", 20: "SSRF, traversal, uploads & command injection",
  21: "API security", 22: "Exploitation & shells", 23: "Linux privilege escalation", 24: "Windows & Active Directory",
  25: "Malware & social engineering", 26: "Blue team & detection", 27: "Cloud & container security",
  28: "Zero-days & vulnerability research", 29: "Speaking & writing like a pro", 30: "Capstone & career roadmap",
};
// Days without an in-app lesson: study them with free, legal outside training instead.
const EXTERNAL = {
  14: { note: "Learn how home and office Wi-Fi is secured, then check your own router.", links: [
    ["Wi-Fi Alliance: Wi-Fi security explained (WPA2 / WPA3)", "https://www.wi-fi.org/discover-wi-fi/security"]],
    check: ["Your router uses WPA3, or WPA2 with AES", "Your Wi-Fi password is long and random (20+ characters)", "WPS is turned off in the router settings", "Router firmware is up to date and the admin password was changed"] },
  15: { note: "Install and learn Burp Suite, the tool web testers use to see and edit what the browser sends.", links: [
    ["PortSwigger: Getting started with Burp Suite", "https://portswigger.net/burp/documentation/desktop/getting-started"],
    ["PortSwigger Web Security Academy (free labs)", "https://portswigger.net/web-security"]] },
  16: { note: "Learn the OWASP Top 10 and access control: why apps must check who is allowed to do what.", links: [
    ["OWASP Top 10", "https://owasp.org/Top10/"],
    ["PortSwigger Academy: Access control", "https://portswigger.net/web-security/access-control"]] },
  17: { note: "Learn how SQL injection works and how parameterized queries prevent it, with free legal labs.", links: [
    ["PortSwigger Academy: SQL injection", "https://portswigger.net/web-security/sql-injection"],
    ["OWASP: SQL Injection Prevention Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"]] },
  18: { note: "Learn cross-site scripting and how output encoding and CSP stop it, with free legal labs.", links: [
    ["PortSwigger Academy: Cross-site scripting", "https://portswigger.net/web-security/cross-site-scripting"],
    ["OWASP: XSS Prevention Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"]] },
};
function vExternal(n) {
  const x = EXTERNAL[n], comp = dayComplete(n);
  view().innerHTML = `
    <div class="player-top"><a class="x" href="#/path" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></a></div>
    <div class="eyebrow">Day ${n} · Study with a free outside course</div><h1>${esc(PLANNED[n])}</h1>
    <p class="body">${esc(x.note)}</p>
    <div class="card">${x.links.map(([t, u]) => `<p><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a></p>`).join("")}
      <p class="small muted">Tip: work through the reading in short sessions, then try one lab. Only practise on the provider's own labs or your own devices.</p></div>
    ${x.check ? `<div class="card"><h3>Check your own setup</h3>${x.check.map((c) => `<label class="row" style="font-weight:500"><input type="checkbox" style="width:auto"> ${esc(c)}</label>`).join("")}</div>` : ""}
    <div class="box defend"><h4>Reflect</h4>Write in your journal: what's the one thing a defender must do to stop this kind of attack?</div>
    <textarea id="reflectBox" placeholder="Your notes…">${esc((S.journal[n] || {}).text || "")}</textarea>
    <div class="player-nav"><button class="btn" data-act="extDone" data-day="${n}">${comp ? "Studied ✓ (back to path)" : "Mark as studied ✓"}</button></div>`;
  const ta = $("#reflectBox"); let t;
  ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => put("journal", { day: n, text: ta.value }), 600); });
}
const LEVELS = [[0, "Curious Beginner"], [400, "Script Apprentice"], [1200, "Recon Scout"], [2500, "Junior Analyst"], [4200, "Pentester"], [6500, "Security Pro"]];
// Plain-English meaning of common weakness types (CWE), linked to the day that teaches them.
const CWE = {
  "CWE-78": ["OS command injection — the app passes your text to the system shell, so attackers can run their own commands.", 20],
  "CWE-77": ["Command injection — attacker-controlled text becomes part of a command.", 20],
  "CWE-89": ["SQL injection — attacker text is treated as database commands.", 17],
  "CWE-79": ["Cross-site scripting — attacker script runs in other users' browsers.", 18],
  "CWE-22": ["Path traversal — '../' tricks let attackers read files they shouldn't.", 20],
  "CWE-918": ["SSRF — the server is tricked into making requests for the attacker.", 20],
  "CWE-287": ["Broken authentication — the 'who are you?' check can be fooled.", 19],
  "CWE-288": ["Authentication bypass through a side door.", 19],
  "CWE-306": ["Missing authentication — an important function doesn't ask who you are at all.", 19],
  "CWE-862": ["Missing authorization — it knows who you are but never checks if you're allowed.", 16],
  "CWE-863": ["Incorrect authorization — the permission check is wrong.", 16],
  "CWE-639": ["IDOR — change an ID in the request, see someone else's data.", 16],
  "CWE-284": ["Improper access control — the wrong people can reach things.", 16],
  "CWE-502": ["Unsafe deserialization — the app rebuilds objects from attacker data, which can run code.", 21],
  "CWE-434": ["Unrestricted file upload — attackers upload a file the server then runs.", 20],
  "CWE-94": ["Code injection — attacker text gets executed as program code.", 20],
  "CWE-611": ["XXE — malicious XML makes the server read files or make requests.", 21],
  "CWE-787": ["Out-of-bounds write — memory corruption; writing past the end of a buffer.", 28],
  "CWE-125": ["Out-of-bounds read — reading memory it shouldn't, leaking secrets.", 28],
  "CWE-416": ["Use-after-free — using memory after it was released; often leads to code execution.", 28],
  "CWE-843": ["Type confusion — the program treats one kind of data as another (common in browser bugs).", 28],
  "CWE-122": ["Heap buffer overflow — memory corruption in the heap.", 28],
  "CWE-121": ["Stack buffer overflow — classic memory corruption.", 28],
  "CWE-190": ["Integer overflow — a number wraps around and breaks size checks.", 28],
  "CWE-20": ["Improper input validation — trusting input that should have been checked.", 7],
  "CWE-269": ["Improper privilege management — users get more power than intended.", 23],
  "CWE-276": ["Incorrect default permissions — files or settings open to everyone.", 3],
  "CWE-798": ["Hard-coded credentials — a password baked into the product.", 12],
  "CWE-352": ["CSRF — tricking your browser into sending a request you didn't intend.", 19],
  "CWE-200": ["Information exposure — leaking data that helps attackers.", 8],
  "CWE-400": ["Uncontrolled resource consumption — can be used to crash a service (DoS).", 26],
  "CWE-1321": ["Prototype pollution — tampering with JavaScript object templates.", 21],
};

// ------------------------------------------------------------ local state + sync
const PK = { kv: "key", progress: "id", quiz: "day", journal: "day", flash: "term", activity: "date" };
const S = lsJSON("c30state") || {};
for (const t in PK) S[t] = S[t] || {};
const save = () => lsSet("c30state", JSON.stringify(S));
const kv = (k, d = "") => (S.kv[k] && S.kv[k].value != null && S.kv[k].value !== "" ? S.kv[k].value : d);
function put(table, rec) {
  rec.updated = nowS(); S[table][rec[PK[table]]] = rec;
  if (table !== "kv" && table !== "activity") { const d = today(); if (!S.activity[d]) S.activity[d] = { date: d, updated: nowS() }; }
  save(); queueSync(); renderStats();
}
const setKV = (key, value) => put("kv", { key, value });

let needKey = false, syncT;
const queueSync = () => { clearTimeout(syncT); syncT = setTimeout(sync, 700); };
async function api(path, opts = {}) {
  const key = lsGet("c30key");
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(key ? { "X-Key": key } : {}) } });
  if (r.status === 401) { needKey = true; throw new Error("Access key needed"); }
  if (!r.ok) throw new Error("HTTP " + r.status);
  needKey = false; return r.json();
}
async function sync() {
  const dot = $("#syncDot");
  try {
    const body = {}; for (const t in PK) body[t] = Object.values(S[t]);
    const srv = await api("/api/sync", { method: "POST", body: JSON.stringify(body) });
    let changed = false;
    for (const t in PK) for (const rec of srv[t] || []) {
      const k = rec[PK[t]], cur = S[t][k];
      if (!cur || rec.updated > (cur.updated || 0)) { S[t][k] = rec; changed = true; }
    }
    save(); dot.className = "sync-dot ok"; dot.title = "Synced with your Kali machine";
    return changed;
  } catch (e) {
    dot.className = "sync-dot off"; dot.title = needKey ? "Access key needed — see Me tab" : "Offline — progress saved on this device";
    return false;
  }
}

// ------------------------------------------------------------ lessons
const DAYS = {};
async function loadDays() {
  await Promise.all(Array.from({ length: 30 }, (_, i) => i + 1).map(async (n) => {
    try { const r = await fetch(`/content/days/day${pad(n)}.json`); if (r.ok) DAYS[n] = await r.json(); } catch {}
  }));
}
function segments(d) {
  const s = ["mindset"];
  (d.cards || []).forEach((_, i) => s.push("card" + i));
  (d.attacks || []).forEach((_, i) => s.push("atk" + i));
  if (d.story) s.push("story");
  if (d.hunt) s.push("hunt");
  if (d.lab) s.push("lab");
  if ((d.quiz || []).length) s.push("quiz");
  if ((d.terms || []).length) s.push("terms");
  if (d.talk) s.push("talk");
  if (d.reflect) s.push("reflect");
  return s;
}
const done = (day, seg) => !!(S.progress[`${day}:${seg}`] || {}).done;
const dayComplete = (n) => done(n, "complete");
const dayPct = (n) => { const d = DAYS[n]; if (!d) return 0; const s = segments(d); return Math.round((100 * s.filter((x) => done(n, x)).length) / s.length); };
function calendarDay() {
  const st = kv("start_date"); if (!st) return 0;
  const diff = Math.round((new Date(today() + "T12:00:00") - new Date(st + "T12:00:00")) / 86400000);
  return Math.max(1, Math.min(30, diff + 1));
}
const unlocked = (n) => n === 1 || dayComplete(n - 1) || n <= calendarDay();
const focusDay = () => { for (let n = 1; n <= 30; n++) if (!dayComplete(n)) return n; return 30; };
function xp() {
  let x = 0;
  for (const p of Object.values(S.progress)) if (p.done) x += p.id.endsWith(":complete") ? 50 : 10;
  for (const q of Object.values(S.quiz)) x += (q.score || 0) * 20;
  for (const f of Object.values(S.flash)) x += ((f.box || 1) - 1) * 5;
  return x;
}
function level(x = xp()) {
  let i = 0; while (i + 1 < LEVELS.length && x >= LEVELS[i + 1][0]) i++;
  const next = LEVELS[i + 1];
  return { name: LEVELS[i][1], pct: next ? Math.round((100 * (x - LEVELS[i][0])) / (next[0] - LEVELS[i][0])) : 100, next: next && next[1], toNext: next ? next[0] - x : 0 };
}
function streak() {
  let d = today(), n = 0;
  if (!S.activity[d]) d = addDays(d, -1);
  while (S.activity[d]) { n++; d = addDays(d, -1); }
  return n;
}
function renderStats() { $("#streakChip").textContent = "🔥 " + streak(); $("#xpChip").textContent = "⚡ " + xp(); }

// ------------------------------------------------------------ views
const view = () => $("#view");
const routes = { today: vToday, path: vPath, day: vDay, done: vDone, cards: vCards, glossary: vGlossary, threats: vThreats, me: vMe, journal: vJournal };
function route() {
  const [name, ...args] = (location.hash.replace(/^#\/?/, "") || "today").split("/");
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (name === "day" || name === "done" ? "path" : name === "glossary" ? "cards" : name === "journal" ? "me" : name)));
  (routes[name] || vToday)(...args);
  renderStats();
  window.scrollTo(0, 0);
}

function vToday() {
  if (!kv("start_date")) {
    view().innerHTML = `
      <div class="card hero">
        <div class="eyebrow">Welcome</div>
        <h1>30 days to think like a security pro.</h1>
        <p>Every day you get <b>bite-sized steps</b> (about 2–4 minutes each). Read one, tap next, stop whenever you like. Your progress is saved.</p>
      </div>
      <div class="card">
        <h3>How each day works</h3>
        <ol class="steps">
          <li><b>Mindset</b> — one idea that changes how you look at systems.</li>
          <li><b>Micro-lessons</b> — short cards with everyday analogies.</li>
          <li><b>Attack breakdowns</b> — how it works, what the attacker thinks, how defenders spot it.</li>
          <li><b>Hands-on lab</b> on your Kali machine, against legal practice targets only.</li>
          <li><b>Quiz, vocabulary and a "talk like a pro" drill</b> so you can hold your own with peers.</li>
        </ol>
      </div>
      <div class="card">
        <label for="ntime">Daily reminder time</label>
        <input type="time" id="ntime" value="${esc(kv("notify_time", "08:00"))}">
        <p class="small muted">Science-backed tip: same time, same place every day builds the habit faster.</p>
        <button class="btn block" data-act="start">Start Day 1 →</button>
      </div>`;
    return;
  }
  const n = focusDay(), d = DAYS[n], cal = calendarDay(), pct = dayPct(n);
  const due = Object.values(S.flash).filter((f) => f.due <= today()).length;
  const allDone = dayComplete(30);
  const pace = n > cal ? `You're ahead of schedule (calendar day ${cal}). Nice.` : n < cal ? `Calendar says day ${cal} — no stress, consistency beats speed.` : "Right on schedule.";
  view().innerHTML = `
    ${needKey ? `<div class="card"><b>Connect to your Kali machine</b><p class="small muted">Sync is paused. Add your access key on the Me tab.</p><a class="btn ghost" href="#/me">Open Me tab</a></div>` : ""}
    <div class="card hero">
      <div class="eyebrow">${allDone ? "Course complete" : `Day ${n} of 30 · ${esc(d ? d.theme : "")}`}</div>
      <h1>${allDone ? "You did all 30 days. 🛡️" : esc(d ? d.title : PLANNED[n])}</h1>
      ${d ? `<p class="mindset">${md(d.mindset)}</p>` : EXTERNAL[n] ? `<p>${esc(EXTERNAL[n].note)}</p><a class="btn block" href="#/day/${n}/0">Open today's study links →</a>` : `<p>This lesson isn't available yet.</p>`}
      <div class="bar"><i style="width:${pct}%"></i></div>
      <p class="small muted">${pct}% done · about ${d ? d.minutes || 40 : "?"} min total · ${pace}</p>
      ${d && !allDone ? `<a class="btn block" href="#/day/${n}/${firstUndone(n)}">${pct ? "Continue" : "Start today's lesson"} →</a>` : ""}
    </div>
    <div class="grid2">
      <a class="card" href="#/cards" style="text-decoration:none;color:inherit"><div class="eyebrow">Recall</div><b style="font-size:1.6rem">${due}</b><div class="small muted">flashcards due</div></a>
      <a class="card" href="#/threats" style="text-decoration:none;color:inherit"><div class="eyebrow">Live threats</div><b style="font-size:1.6rem" id="kevCount">…</b><div class="small muted">exploited in the wild</div></a>
    </div>
    <div class="card" id="threatTeaser"><div class="eyebrow">Threat of the day</div><p class="muted small">Loading…</p></div>`;
  loadThreats().then((t) => {
    if (!t || !t.items.length) { $("#threatTeaser") && ($("#threatTeaser").innerHTML = `<div class="eyebrow">Threat of the day</div><p class="small muted">Offline — threats load when you're connected.</p>`); return; }
    const c = $("#kevCount"); if (c) c.textContent = t.count;
    const el = $("#threatTeaser"); if (el) el.innerHTML = `<div class="eyebrow">Threat of the day</div>${threatCard(t.items[0], true)}<a href="#/threats">See all →</a>`;
  });
}
const firstUndone = (n) => { const s = segments(DAYS[n]); const i = s.findIndex((x) => !done(n, x)); return i < 0 ? 0 : i; };

function vPath() {
  let h = `<h1>Your 30-day path</h1><p class="muted">Each day unlocks on schedule, or as soon as you finish the one before it.</p>`;
  const cur = focusDay();
  for (const [a, b, label] of WEEKS) {
    h += `<div class="week">${label}</div>`;
    for (let n = a; n <= b; n++) {
      const d = DAYS[n], open = unlocked(n), comp = dayComplete(n), pct = dayPct(n);
      const cls = comp ? "done" : n === cur ? "current" : open ? "" : "locked";
      const href = open && (d || EXTERNAL[n]) ? `#/day/${n}/${comp || !d ? 0 : firstUndone(n)}` : "";
      h += `<a class="day-row ${cls}" ${href ? `href="${href}"` : `aria-disabled="true"`} data-act="${href ? "" : "locked"}">
        <div class="day-num">${comp ? "✓" : n}</div>
        <div class="t"><b>${esc(d ? d.title : PLANNED[n])}</b><span class="small muted">${d ? esc(d.theme) + " · " + (d.minutes || 40) + " min" : EXTERNAL[n] ? "Free outside course" : "Lesson not available yet"}${pct && !comp ? ` · ${pct}%` : ""}</span></div>
        <span>${open ? (comp ? "" : "›") : "🔒"}</span></a>`;
    }
  }
  view().innerHTML = h;
}

// ---- lesson player
let quizState = null;
function vDay(nStr, iStr) {
  const n = +nStr, d = DAYS[n];
  if (!d && EXTERNAL[n] && unlocked(n)) return vExternal(n);
  if (!d) { view().innerHTML = `<div class="empty"><h2>Lesson not available yet</h2><p>Day ${n} (${esc(PLANNED[n] || "")}) hasn't been added.</p><a class="btn ghost" href="#/path">Back to path</a></div>`; return; }
  if (!unlocked(n)) { view().innerHTML = `<div class="empty"><h2>🔒 Day ${n} is locked</h2><p>Finish Day ${n - 1} first — or come back on schedule.</p><a class="btn ghost" href="#/path">Back to path</a></div>`; return; }
  const segs = segments(d), i = Math.max(0, Math.min(segs.length - 1, +iStr || 0)), seg = segs[i];
  const pct = Math.round((100 * i) / segs.length);
  if (seg !== "quiz") quizState = null;
  view().innerHTML = `
    <div class="player-top">
      <a class="x" href="#/path" aria-label="Close lesson"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></a>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <span class="small muted">${i + 1}/${segs.length}</span>
    </div>
    <div class="seg">${renderSeg(d, seg)}</div>
    <div class="player-nav">
      ${i > 0 ? `<a class="btn ghost" href="#/day/${n}/${i - 1}">← Back</a>` : ""}
      <button class="btn" data-act="next" data-day="${n}" data-i="${i}">${i === segs.length - 1 ? "Finish day ✓" : "Got it →"}</button>
    </div>`;
  if (seg === "quiz") renderQuiz(d);
  if (seg === "reflect") {
    const ta = $("#reflectBox"); let t;
    ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => put("journal", { day: n, text: ta.value }), 600); });
  }
}
function renderSeg(d, seg) {
  if (seg === "mindset") return `
    <div class="eyebrow">Day ${d.day} · ${esc(d.theme)}</div><h1>${esc(d.title)}</h1>
    <p class="mindset">${md(d.mindset)}</p>
    <p class="muted">${segments(d).length} bite-sized steps · ~${d.minutes || 40} min. Stop anytime — progress is saved after every step.</p>`;
  if (seg.startsWith("card")) {
    const k = +seg.slice(4), c = d.cards[k];
    return `<div class="eyebrow">Lesson ${k + 1} of ${d.cards.length}</div><h2>${esc(c.title)}</h2><div class="body">${md(c.body)}</div>`;
  }
  if (seg.startsWith("atk")) {
    const k = +seg.slice(3), a = d.attacks[k];
    return `<div class="eyebrow">Attack breakdown ${k + 1} of ${d.attacks.length}</div><h2>${esc(a.name)}</h2>
      <div class="box analogy"><h4>In everyday terms</h4>${md(a.analogy)}</div>
      <h3>How it works</h3><ol class="steps">${(a.how || []).map((s) => `<li>${md(s)}</li>`).join("")}</ol>
      <div class="box think"><h4>🧠 The attacker's thinking</h4>${md(a.thinking)}</div>
      <div class="box detect"><h4>🔍 How defenders spot it</h4>${md(a.signs)}</div>
      <div class="box defend"><h4>🛡 How to stop it</h4>${md(a.defend)}</div>`;
  }
  if (seg === "story") return `<div class="eyebrow">Real-world story</div><h2>${esc(d.story.title)}</h2><div class="body">${md(d.story.body)}</div>`;
  if (seg === "hunt") {
    const [q, ...ans] = String(d.hunt).split(/Answer:/i);
    return `<div class="eyebrow">Spot the vulnerability</div><h2>Think like a hunter</h2><div class="body">${md(q.trim())}</div>
      <p class="muted small">Pause. Write down or say what's wrong before revealing.</p>
      <button class="btn ghost" data-act="reveal">Reveal answer</button>
      <div class="reveal box defend" hidden><h4>Answer</h4>${md(ans.join("Answer:").trim())}</div>`;
  }
  if (seg === "lab") {
    const L = d.lab;
    return `<div class="eyebrow">Hands-on lab</div><h2>${esc(L.title)}</h2><p><b>Goal:</b> ${md(L.goal)}</p>
      <ol class="steps">${(L.steps || []).map((s) => `<li>${md(s)}</li>`).join("")}</ol>
      ${(L.commands || []).map((c) => `<div class="cmd"><button class="copy" data-act="copy" data-cmd="${esc(c.cmd)}">Copy</button><pre>${esc(c.cmd)}</pre><div class="ex">${md(c.explain)}</div></div>`).join("")}
      <div class="box detect"><h4>⚖ Stay legal</h4>${md(L.safety)}</div>`;
  }
  if (seg === "quiz") return `<div class="eyebrow">Quick check</div><div id="quiz"></div>`;
  if (seg === "terms") return `<div class="eyebrow">Speak the language</div><h2>Today's vocabulary</h2>
      <p class="muted small">These go straight into your Recall flashcards when you tap next.</p>
      ${d.terms.map((t) => `<div class="term"><b>${esc(t.term)}</b> — ${md(t.def)}<i>💬 “${md(t.use)}”</i></div>`).join("")}`;
  if (seg === "talk") return `<div class="eyebrow">Talk like a pro</div><h2>Your turn</h2><div class="box analogy"><h4>Scenario</h4>${md(d.talk.scenario)}</div>
      <p class="muted small">Answer out loud (or type) first. Use today's vocabulary. Then compare.</p>
      <textarea placeholder="Your answer…" aria-label="Your answer"></textarea>
      <p><button class="btn ghost" data-act="reveal">Show a model answer</button></p>
      <div class="reveal box defend" hidden><h4>Model answer</h4>${md(d.talk.model)}</div>`;
  if (seg === "reflect") return `<div class="eyebrow">Reflect</div><h2>Lock it in</h2><p class="body">${md(d.reflect)}</p>
      <textarea id="reflectBox" placeholder="Write in your own words. Explaining it simply is how you know you understand it.">${esc((S.journal[d.day] || {}).text || "")}</textarea>
      <p class="small muted">Saved automatically to your journal.</p>`;
  return "";
}
function renderQuiz(d) {
  const qs = d.quiz;
  if (!quizState || quizState.day !== d.day) quizState = { day: d.day, i: 0, score: 0, picked: null };
  const st = quizState, box = $("#quiz"), nav = $(".player-nav");
  if (nav) nav.hidden = st.i < qs.length; // the quiz has its own buttons until it's finished
  if (st.i >= qs.length) {
    const prev = S.quiz[d.day];
    if (!st.saved) { st.saved = true; if (!prev || st.score >= (prev.score || 0)) put("quiz", { day: d.day, score: st.score, total: qs.length }); }
    box.innerHTML = `<h2>${st.score}/${qs.length} correct ${st.score === qs.length ? "🎯" : ""}</h2>
      <p class="muted">${st.score === qs.length ? "Perfect. You really get this." : "Mistakes are how you learn. Re-read the cards you missed later."}</p>
      <button class="btn ghost" data-act="quizRetry">Try again</button>`;
    return;
  }
  const q = qs[st.i];
  box.innerHTML = `<p class="small muted">Question ${st.i + 1} of ${qs.length}</p><h2>${md(q.q)}</h2>
    ${q.options.map((o, k) => `<button class="opt ${st.picked == null ? "" : k === q.answer ? "right" : k === st.picked ? "wrong" : ""}" data-act="answer" data-k="${k}" ${st.picked != null ? "disabled" : ""}>${md(o)}</button>`).join("")}
    ${st.picked != null ? `<div class="box ${st.picked === q.answer ? "defend" : "detect"}"><h4>${st.picked === q.answer ? "Correct" : "Not quite"}</h4>${md(q.why)}</div><button class="btn" data-act="quizNext">Next question →</button>` : ""}`;
}

function vDone(nStr) {
  const n = +nStr, d = DAYS[n], q = S.quiz[n], next = DAYS[n + 1];
  view().innerHTML = `<div class="card hero" style="text-align:center">
      <div style="font-size:3rem">🛡️</div><h1>Day ${n} complete!</h1>
      <p>${esc(d ? d.title : "")}</p>
      <div class="grid2"><div class="stat"><b>${q ? `${q.score}/${q.total}` : "–"}</b>quiz</div><div class="stat"><b>${(d && d.terms || []).length}</b>new terms</div><div class="stat"><b>🔥 ${streak()}</b>day streak</div></div>
    </div>
    <div class="card"><div class="eyebrow">Coming up</div><h3>Day ${n + 1}: ${esc(next ? next.title : PLANNED[n + 1] || "You finished!")}</h3>
      <p class="muted small">Best practice: stop here and let it sink in. Sleep helps your brain store what you learned. Review your flashcards tomorrow.</p>
      <div class="row"><a class="btn" href="#/cards">Review flashcards</a><a class="btn ghost" href="#/path">Back to path</a></div></div>`;
  confetti();
}

// ---- flashcards (Leitner spaced repetition)
const INTERVAL = [0, 1, 2, 4, 7, 15]; // days until next review, by box
const allTerms = () => { const m = {}; for (const n in DAYS) for (const t of DAYS[n].terms || []) m[t.term] = { ...t, day: +n }; return m; };
let flipped = false;
function vCards() {
  const terms = allTerms();
  const due = Object.values(S.flash).filter((f) => f.due <= today() && terms[f.term]).sort((a, b) => a.box - b.box);
  const total = Object.keys(S.flash).length, mastered = Object.values(S.flash).filter((f) => f.box >= 5).length;
  let h = `<div class="row spread"><h1>Recall</h1><a class="btn ghost" href="#/glossary">Glossary</a></div>
    <p class="muted small">Spaced repetition: cards you know come back less often; tricky ones come back sooner. ${total} learned · ${mastered} mastered.</p>`;
  if (!due.length) { view().innerHTML = h + `<div class="empty"><div style="font-size:2.5rem">✅</div><h2>All caught up</h2><p>${total ? "Come back tomorrow for more reviews." : "Finish your first lesson to unlock flashcards."}</p></div>`; return; }
  const f = due[0], t = terms[f.term];
  flipped = false;
  view().innerHTML = h + `<p class="small muted">${due.length} due today · box ${f.box}/5</p>
    <div class="flash" data-act="flip" role="button" aria-label="Flip card"><div class="in">
      <div class="face front">${esc(t.term)}<span class="small muted" style="font-weight:400;font-size:.85rem;margin-top:12px">Tap to flip — explain it to yourself first</span></div>
      <div class="face back"><p>${md(t.def)}</p><p class="muted small">💬 “${md(t.use)}”</p><p class="small"><a href="#/day/${t.day}/0">From Day ${t.day}</a></p></div>
    </div></div>
    <div class="row"><button class="btn ghost" style="flex:1" data-act="grade" data-ok="0" data-term="${esc(f.term)}">↺ Again</button>
    <button class="btn" style="flex:1" data-act="grade" data-ok="1" data-term="${esc(f.term)}">✓ Got it</button></div>`;
}
function vGlossary() {
  const terms = Object.values(allTerms()).sort((a, b) => a.term.localeCompare(b.term));
  view().innerHTML = `<div class="row spread"><h1>Glossary</h1><a class="btn ghost" href="#/cards">Recall</a></div>
    <input type="search" id="gq" placeholder="Search ${terms.length} terms…" aria-label="Search terms">
    <div class="card" style="margin-top:12px" id="glist"></div>`;
  const draw = (q = "") => {
    const ql = q.toLowerCase(), list = terms.filter((t) => !ql || (t.term + " " + t.def).toLowerCase().includes(ql));
    $("#glist").innerHTML = list.map((t) => `<div class="term"><b>${esc(t.term)}</b> <span class="badge">Day ${t.day}</span><br>${md(t.def)}<i>💬 “${md(t.use)}”</i></div>`).join("") || `<p class="muted">No match.</p>`;
  };
  draw(); $("#gq").addEventListener("input", (e) => draw(e.target.value));
}

// ---- live threats (CISA Known Exploited Vulnerabilities)
let threatCache = null;
async function loadThreats() {
  if (threatCache) return threatCache;
  try { threatCache = await api("/api/threats?limit=40"); lsSet("c30threats", JSON.stringify(threatCache)); }
  catch { threatCache = lsJSON("c30threats"); }
  return threatCache;
}
function threatCard(v, compact) {
  const cwes = (v.cwes || []).map((c) => CWE[c] ? `<div class="box think"><h4>${esc(c)} in plain words</h4>${esc(CWE[c][0])} <a href="#/day/${CWE[c][1]}/0">Learn it: Day ${CWE[c][1]} →</a></div>` : `<span class="badge">${esc(c)}</span> `).join("");
  return `<div class="row" style="gap:6px"><span class="badge blue">${esc(v.cveID)}</span><span class="badge">${esc(v.dateAdded)}</span>${v.knownRansomwareCampaignUse === "Known" ? `<span class="badge red">used by ransomware</span>` : ""}</div>
    <h3 style="margin-top:8px">${esc(v.vulnerabilityName)}</h3>
    <p class="small muted">${esc(v.vendorProject)} · ${esc(v.product)}</p>
    ${compact ? "" : `<p class="small">${esc(v.shortDescription)}</p>`}${cwes}
    ${compact ? "" : `<p class="small"><b>What defenders must do:</b> ${esc(v.requiredAction)}</p>`}`;
}
async function vThreats() {
  view().innerHTML = `<h1>Live threats</h1><div class="card"><p class="small">These are <b>real vulnerabilities attackers are exploiting right now</b>, from the US CISA "Known Exploited Vulnerabilities" (KEV) list — the list security teams use to decide what to patch first. Many started life as <b>zero-days</b>. Updated automatically every day.</p>
    <label class="row small" style="font-weight:500"><input type="checkbox" id="rw" style="width:auto"> Only show ones used by ransomware gangs</label></div><div id="tlist"><p class="muted">Loading…</p></div>`;
  const t = await loadThreats();
  const draw = () => {
    if (!t || !t.items) { $("#tlist").innerHTML = `<div class="empty">Couldn't load threats. Check that your Kali server is running and online.</div>`; return; }
    const only = $("#rw").checked;
    $("#tlist").innerHTML = `<p class="small muted">${t.count} known exploited vulnerabilities in total · newest first</p>` +
      t.items.filter((v) => !only || v.knownRansomwareCampaignUse === "Known").map((v) => `<div class="card">${threatCard(v)}</div>`).join("");
  };
  draw(); $("#rw").addEventListener("change", draw);
}

// ---- me / settings
async function vMe() {
  const L = level(), x = xp(), completed = Array.from({ length: 30 }, (_, i) => i + 1).filter(dayComplete).length;
  const qs = Object.values(S.quiz), qavg = qs.length ? Math.round((100 * qs.reduce((a, q) => a + q.score, 0)) / qs.reduce((a, q) => a + q.total, 0)) : 0;
  view().innerHTML = `
    <div class="card hero"><div class="eyebrow">Level</div><h1>${esc(L.name)}</h1>
      <div class="bar"><i style="width:${L.pct}%"></i></div>
      <p class="small muted">${x} XP${L.next ? ` · ${L.toNext} XP to ${esc(L.next)}` : " · max level"}</p></div>
    <div class="grid2" style="margin-bottom:14px">
      <div class="stat"><b>${completed}/30</b>days done</div><div class="stat"><b>🔥 ${streak()}</b>day streak</div>
      <div class="stat"><b>${qavg}%</b>quiz average</div><div class="stat"><b>${Object.keys(S.flash).length}</b>terms learned</div></div>
    <div class="card"><div class="row spread"><h3>Journal</h3><a href="#/journal">Open →</a></div><p class="small muted">${Object.keys(S.journal).length} reflections written.</p></div>
    <div class="card"><h3>Reminders</h3>
      <label class="row" style="font-weight:500"><input type="checkbox" id="nen" style="width:auto" ${kv("notify_enabled", "1") === "1" ? "checked" : ""}> Daily reminders on</label>
      <div class="grid2"><div><label for="nt">Morning lesson</label><input type="time" id="nt" value="${esc(kv("notify_time", "08:00"))}"></div>
      <div><label for="nn">Evening streak nudge</label><input type="time" id="nn" value="${esc(kv("nudge_time", "20:00"))}"></div></div>
      <p class="small muted">Your Kali machine sends these: a desktop pop-up on Linux, and a push to your phone through the free <b>ntfy</b> app (Play Store / F-Droid).</p>
      <label for="ntfy">ntfy topic for your phone (optional)</label>
      <div class="row" style="flex-wrap:nowrap"><input id="ntfy" value="${esc(kv("ntfy_topic"))}" placeholder="e.g. cyber30-x7k2m9q4" autocomplete="off"><button class="btn ghost" data-act="genTopic">New</button></div>
      <p class="small muted">In the ntfy app tap + and subscribe to the same topic. Use a long random name — anyone who knows it can read the reminders.</p>
      <div class="row"><button class="btn" data-act="saveNotify">Save</button><button class="btn ghost" data-act="testNotify">Send test</button></div></div>
    <div class="card" id="connectCard"><h3>Your devices</h3>${isLocal ? `<p class="small muted">Loading phone link…</p>` : `
      <p class="small muted">This device syncs with your Kali machine using an access key.</p>
      <label for="akey">Access key</label><div class="row" style="flex-wrap:nowrap"><input id="akey" value="${esc(lsGet("c30key") || "")}" autocomplete="off"><button class="btn ghost" data-act="saveKey">Save</button></div>`}</div>
    <div class="card"><h3>Appearance & data</h3>
      <label for="theme">Theme</label><select id="theme"><option value="">Match system</option><option value="dark">Dark</option><option value="light">Light</option></select>
      <div class="row" style="margin-top:12px"><button class="btn ghost" data-act="export">Export backup</button><label class="btn ghost" style="margin:0">Import<input type="file" id="imp" accept="application/json" hidden></label></div>
      <p class="small muted" style="margin-top:10px">Started: ${esc(kv("start_date", "not yet"))}</p></div>`;
  $("#theme").value = lsGet("c30theme") || "";
  $("#theme").addEventListener("change", (e) => { lsSet("c30theme", e.target.value); applyTheme(); });
  $("#imp").addEventListener("change", importBackup);
  if (isLocal) {
    try {
      const c = await api("/api/connect");
      $("#connectCard").innerHTML = `<h3>Add your Android phone</h3>
        <ol class="steps small"><li>Connect the phone to the <b>same Wi-Fi</b> as this Kali machine.</li>
        <li>Scan this code with the phone camera (or type the link) to open it in <b>Chrome</b>.</li>
        <li>Chrome menu ⋮ → <b>Add to Home screen / Install app</b>.</li></ol>
        <div id="qr" class="qr"></div><p class="small" style="word-break:break-all"><code>${esc(c.url)}</code></p>
        <p class="small muted">The link contains your private access key. Don't share it — it lets someone change your progress.</p>`;
      drawQR($("#qr"), c.url);
    } catch { $("#connectCard").innerHTML = `<h3>Your devices</h3><p class="small muted">Start the server to connect your phone.</p>`; }
  }
}
function drawQR(el, text) {
  const go = () => { try { new window.QRCode(el, { text, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M }); } catch { el.remove(); } };
  if (window.QRCode) return go();
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  s.onload = go; s.onerror = () => el.remove(); document.head.appendChild(s);
}
function vJournal() {
  const entries = Object.values(S.journal).filter((j) => j.text).sort((a, b) => a.day - b.day);
  view().innerHTML = `<div class="row spread"><h1>Journal</h1><a class="btn ghost" href="#/me">Back</a></div>
    <p class="muted small">Re-reading your own words is one of the best ways to see how your thinking has changed.</p>` +
    (entries.map((j) => `<div class="card"><div class="eyebrow">Day ${j.day} · ${esc(DAYS[j.day] ? DAYS[j.day].title : "")}</div><p class="small muted">${md(DAYS[j.day] ? DAYS[j.day].reflect : "")}</p><p>${md(j.text)}</p></div>`).join("") || `<div class="empty">No reflections yet. They appear at the end of each day.</div>`);
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cyber30-backup-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importBackup(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    for (const t in PK) for (const rec of Object.values(data[t] || {})) { const k = rec[PK[t]]; if (k != null && (!S[t][k] || rec.updated > S[t][k].updated)) S[t][k] = rec; }
    save(); await sync(); toast("Backup imported"); route();
  } catch { toast("That file isn't a Cyber30 backup"); }
}
function applyTheme() { const t = lsGet("c30theme"); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }

// ------------------------------------------------------------ actions
const ACT = {
  start() { const t = $("#ntime").value || "08:00"; setKV("notify_time", t); setKV("start_date", today()); location.hash = "#/day/1/0"; },
  locked() { toast("Finish the previous day to unlock this one"); },
  next(el) {
    const n = +el.dataset.day, i = +el.dataset.i, d = DAYS[n], segs = segments(d), seg = segs[i];
    put("progress", { id: `${n}:${seg}`, day: n, done: 1 });
    if (seg === "terms") for (const t of d.terms) if (!S.flash[t.term]) put("flash", { term: t.term, box: 1, due: addDays(today(), 1) });
    if (i + 1 < segs.length) { location.hash = `#/day/${n}/${i + 1}`; return; }
    put("progress", { id: `${n}:complete`, day: n, done: 1 });
    location.hash = `#/done/${n}`;
  },
  reveal(el) { const r = el.parentElement.parentElement.querySelector(".reveal") || el.nextElementSibling; if (r) r.hidden = false; el.remove(); },
  copy(el) { navigator.clipboard?.writeText(el.dataset.cmd).then(() => toast("Copied — paste it in your Kali terminal"), () => toast("Select the text to copy")); },
  answer(el) {
    const d = DAYS[quizState.day], k = +el.dataset.k; quizState.picked = k; if (k === d.quiz[quizState.i].answer) quizState.score++;
    renderQuiz(d); $("#quiz [data-act=quizNext]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
  skipQuiz() { quizState.i = DAYS[quizState.day].quiz.length; renderQuiz(DAYS[quizState.day]); },
  quizNext() { quizState.i++; quizState.picked = null; renderQuiz(DAYS[quizState.day]); },
  quizRetry() { const day = quizState.day; quizState = null; renderQuiz(DAYS[day]); },
  flip(el) { flipped = !flipped; el.classList.toggle("flipped", flipped); },
  grade(el) {
    const f = S.flash[el.dataset.term], ok = el.dataset.ok === "1";
    const box = ok ? Math.min(5, (f.box || 1) + 1) : 1;
    put("flash", { term: f.term, box, due: ok ? addDays(today(), INTERVAL[box]) : today() });
    if (!ok) { S.flash[f.term].updated -= 0; } // stays due today, goes to the back of the queue
    toast(ok ? (box >= 5 ? "Mastered! 🏆" : "Nice — see you in " + INTERVAL[box] + " day(s)") : "No problem — it'll come back soon");
    vCards();
  },
  genTopic() { const a = new Uint8Array(9); crypto.getRandomValues(a); $("#ntfy").value = "cyber30-" + Array.from(a, (b) => (b % 36).toString(36)).join(""); },
  saveNotify() {
    const topic = $("#ntfy").value.trim();
    if (topic && !/^[A-Za-z0-9_-]{6,64}$/.test(topic)) return toast("Topic: 6–64 letters, numbers, - or _");
    setKV("notify_enabled", $("#nen").checked ? "1" : "0"); setKV("notify_time", $("#nt").value || "08:00");
    setKV("nudge_time", $("#nn").value || "20:00"); setKV("ntfy_topic", topic); toast("Reminder settings saved");
  },
  async testNotify() { await sync(); try { await api("/api/test-notify", { method: "POST", body: "{}" }); toast("Test sent — check your desktop and phone"); } catch (e) { toast("Couldn't reach the server: " + e.message); } },
  async saveKey() { lsSet("c30key", $("#akey").value.trim()); const ok = await sync(); toast(needKey ? "That key didn't work" : "Connected ✓"); if (ok) route(); },
  extDone(el) {
    const n = +el.dataset.day;
    if (!dayComplete(n)) { put("progress", { id: `${n}:complete`, day: n, done: 1 }); toast(`Day ${n} marked as studied ✓`); }
    location.hash = "#/path";
  },
  export: exportBackup,
};
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el || !el.dataset.act || !ACT[el.dataset.act]) return;
  e.preventDefault(); ACT[el.dataset.act](el, e);
});

// ------------------------------------------------------------ focus timer (break every 25 min)
let focusStart = Date.now();
setInterval(() => {
  if (!location.hash.startsWith("#/day/")) { focusStart = Date.now(); return; }
  if (Date.now() - focusStart > 25 * 60 * 1000) { toast("25 minutes of focus 🧠 Take a 5-minute break — it helps memory.", 7000); focusStart = Date.now(); }
}, 60 * 1000);

// ------------------------------------------------------------ boot
(async function boot() {
  applyTheme();
  const k = new URLSearchParams(location.search).get("k");
  if (k) { lsSet("c30key", k); history.replaceState(null, "", location.pathname + (location.hash || "#/today")); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  window.addEventListener("hashchange", route);
  view().innerHTML = `<div class="empty">Loading your lessons…</div>`;
  await Promise.all([loadDays(), sync()]);
  route();
  setInterval(async () => { if (await sync() && !location.hash.startsWith("#/day/")) route(); }, 60 * 1000);
  document.addEventListener("visibilitychange", async () => { if (!document.hidden && await sync() && !location.hash.startsWith("#/day/")) route(); });
})();
