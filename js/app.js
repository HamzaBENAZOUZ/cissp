import { SupabaseStore, LocalStore, latestByQuestion } from "./store.js";
import { t, getLang, setLang, locale } from "./i18n.js";

const CFG = window.CISSP_CONFIG || {};
const PASS = CFG.PASS_MARK || 70;
const DOMAIN_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

const app = document.getElementById("app");
const state = {
  store: null, session: null,
  chapters: [], questions: [], byId: new Map(),
  attempts: [], latest: new Map(),
  quiz: null, timer: null, lastResult: null,
  view: "boot", authMode: "login",
  section: (() => { try { return localStorage.getItem("cissp-section") === "practice" ? "practice" : "guide"; } catch { return "guide"; } })(),
};

// ------------------------------------------------------------------ utils
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const letter = i => String.fromCharCode(65 + i);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmtTime = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const fmtDate = d => new Date(d).toLocaleString(locale(), { dateStyle: "short", timeStyle: "short" });
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Texte d'une question dans la langue voulue (repli sur l'anglais si pas de traduction). */
function qText(q, lang = getLang()) {
  if (lang === "fr" && q.question_fr) {
    return { question: q.question_fr, options: q.options_fr || q.options, explanation: q.explanation_fr || q.explanation,
      scenario: q.scenario_fr || q.scenario, lang: "fr" };
  }
  return { question: q.question, options: q.options, explanation: q.explanation, scenario: q.scenario, lang: "en" };
}
const hasFr = q => !!q.question_fr;

/* Lecture à voix haute (anglais uniquement) via l'API Web Speech du navigateur. */
const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
let speakingId = null;
function stopSpeak() { if (canSpeak) speechSynthesis.cancel(); speakingId = null; document.querySelectorAll(".btn-speak.on").forEach(b => b.classList.remove("on")); }
function answerSpeech(q) {
  const en = qText(q, "en");
  const ans = q.correct.map(L => `${L}: ${en.options[L.charCodeAt(0) - 65] || ""}`).join(". ");
  return `Correct answer${q.correct.length > 1 ? "s" : ""}. ${ans}. ${en.explanation}`;
}
/* Voix préférée : « Microsoft Aria Online (Natural) - English (United States) » (voix neuronale native d'Edge),
   sinon n'importe quelle voix Aria en-US, puis une voix « Natural » en-US, puis toute voix en-US, puis anglais. */
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  const us = vs.filter(v => /^en[-_]US$/i.test(v.lang));
  return us.find(v => /\bAria\b/i.test(v.name) && /Natural/i.test(v.name))
    || us.find(v => /\bAria\b/i.test(v.name))
    || us.find(v => /Natural|Online/i.test(v.name))
    || us[0] || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (canSpeak) speechSynthesis.getVoices(); // précharge la liste des voix (chargée en asynchrone par Edge/Chrome)
function speakAnswer(q, btn) {
  if (!canSpeak) return;
  if (speakingId === q.id) { stopSpeak(); return; }
  stopSpeak();
  const u = new SpeechSynthesisUtterance(answerSpeech(q));
  u.lang = "en-US"; u.rate = 1;
  const v = pickVoice();
  if (v) u.voice = v;
  u.onend = u.onerror = () => { if (speakingId === q.id) { speakingId = null; btn.classList.remove("on"); } };
  speakingId = q.id; btn.classList.add("on");
  speechSynthesis.speak(u);
}
const speakBtn = q => canSpeak ? `<button class="btn btn-ghost btn-xs btn-speak" data-speak="${q.id}" lang="${getLang()}" title="${esc(t("quiz.listenTitle"))}">🔊 ${esc(t("quiz.listen"))}</button>` : "";
function bindSpeak(list) {
  app.querySelectorAll("[data-speak]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const q = list.find(x => String(x.id) === b.dataset.speak); if (q) speakAnswer(q, b);
  });
}
const chTitle = c => (c ? (getLang() === "fr" && c.title_fr ? c.title_fr : c.title) : "");
const chById = id => state.chapters.find(c => c.id === id);

// ---- Sections : « guide » = Study Guide (chapitres 1-21), « practice » = Official Practice Tests (101-112)
const secOf = chId => (chId > 100 ? "practice" : "guide");
const secChapters = () => state.chapters.filter(c => secOf(c.id) === state.section);
const secQuestions = () => state.questions.filter(q => secOf(q.chapter_id) === state.section);
const hasPractice = () => state.chapters.some(c => c.id > 100);
/** Étiquette courte d'un chapitre : CH_07, PT_D3 (practice, domaine 3), TEST_2 (test complet). */
function chLabel(id) {
  if (id <= 100) return `CH_${pad(id)}`;
  const c = chById(id);
  return c && c.domain ? `PT_D${c.domain}` : `TEST_${id - 108}`;
}
function setSection(sec) {
  state.section = sec;
  try { localStorage.setItem("cissp-section", sec); } catch { /* ignore */ }
  renderHome();
}

function toast(msg, kind = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3800);
}
function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
function errorPanel(title, msg, hint) {
  app.innerHTML = `<section class="panel error-panel"><h2 class="mono">${esc(title)}</h2><p>${esc(msg)}</p>
    ${hint ? `<p class="muted">${esc(hint)}</p>` : ""}</section>`;
}

// ------------------------------------------------------------------ theme & language
function currentTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
function setTheme(th) {
  document.documentElement.dataset.theme = th;
  try { localStorage.setItem("cissp-theme", th); } catch { /* ignore */ }
  const b = document.getElementById("btn-theme");
  if (b) b.setAttribute("aria-pressed", th === "light");
}
function applyStaticTexts() {
  document.getElementById("btn-logout").textContent = t("top.logout");
  document.getElementById("btn-theme").title = t("top.theme");
  document.getElementById("btn-theme").setAttribute("aria-label", t("top.theme"));
  document.getElementById("footer-src").textContent = t("footer.src");
  document.getElementById("footer-keys").textContent = t("footer.keys");
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === getLang()));
  const badge = document.getElementById("mode-badge");
  if (state.store) badge.textContent = state.store.kind === "supabase" ? "SUPABASE" : t("top.local");
}
function rerender() {
  applyStaticTexts();
  if (state.view === "login") return renderLogin(state.authMode);
  if (state.view === "quiz" && state.quiz) return renderQuiz();
  if (state.view === "results" && state.lastResult) return renderResults();
  if (state.view === "history") return renderHistory();
  if (state.view === "home") return renderHome();
}

// ------------------------------------------------------------------ boot
async function boot() {
  setTheme(currentTheme());
  document.getElementById("btn-theme").addEventListener("click", () => setTheme(currentTheme() === "light" ? "dark" : "light"));
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => { setLang(b.dataset.lang); rerender(); }));
  applyStaticTexts();

  const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  if (configured && !window.supabase) return errorPanel(t("err.title"), t("err.cdn"), t("err.cdnHint"));
  if (!configured && location.hostname.endsWith("github.io")) return errorPanel(t("err.cfgTitle"), t("err.cfg"), t("err.cfgHint"));

  state.store = configured ? new SupabaseStore(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : new LocalStore(CFG.LOCAL_DATA);
  const badge = document.getElementById("mode-badge");
  badge.classList.add(configured ? "badge-ok" : "badge-warn");
  applyStaticTexts();

  document.getElementById("btn-logout").addEventListener("click", async () => {
    stopTimer(); await state.store.signOut(); state.session = null; state.chapters = []; renderLogin();
  });
  window.addEventListener("hashchange", route);
  document.addEventListener("keydown", onKey);

  if (configured && /type=recovery/.test(location.hash)) {
    state.store.onAuth(s => { if (s) { state.session = s; renderNewPassword(); } });
    return;
  }
  state.session = await state.store.session();
  state.store.onAuth(s => {
    const was = !!state.session; state.session = s;
    if (s && !was) start();
  });
  if (!state.session) return renderLogin();
  start();
}

async function start() {
  document.getElementById("user-label").textContent = state.session?.user?.email || "";
  document.getElementById("btn-logout").hidden = state.store.kind === "local";
  state.view = "boot";
  app.innerHTML = `<div class="boot"><p class="mono">&gt; ${esc(t("boot.load"))}<span class="cursor">_</span></p></div>`;
  try {
    const { chapters, questions } = await state.store.loadContent();
    state.chapters = chapters;
    state.questions = questions;
    state.byId = new Map(questions.map(q => [q.id, q]));
    if (!questions.length) throw new Error(t("err.noQuestions"));
    await refreshProgress();
    route();
  } catch (e) {
    console.error(e);
    errorPanel(t("err.title"), e.message || String(e), t("err.seeReadme"));
  }
}

async function refreshProgress() {
  const [attempts, answers] = await Promise.all([state.store.attempts(), state.store.answers()]);
  state.attempts = attempts;
  state.latest = latestByQuestion(answers);
}

function route() {
  stopSpeak();
  if (!state.session || !state.chapters.length) return;
  const h = location.hash.replace(/^#\/?/, "");
  if (state.quiz && h !== "quiz") {
    if (!confirm(t("quiz.leave"))) { history.replaceState(null, "", "#/quiz"); return; }
    stopTimer(); state.quiz = null;
  }
  if (h === "quiz" && state.quiz) return renderQuiz();
  if (h === "results" && state.lastResult) return renderResults();
  if (h === "history") return renderHistory();
  renderHome();
}
const go = h => { if (location.hash === `#/${h}`) route(); else location.hash = `#/${h}`; };

// ------------------------------------------------------------------ auth views
function renderLogin(mode = "login") {
  state.view = "login"; state.authMode = mode;
  document.getElementById("user-label").textContent = "";
  document.getElementById("btn-logout").hidden = true;
  const signup = mode === "signup";
  app.innerHTML = `
  <section class="auth panel">
    <p class="mono kicker">&gt; ${esc(t("auth.required"))}</p>
    <h1 class="glitch" data-text="ACCESS CONTROL">ACCESS CONTROL</h1>
    <p class="muted">${esc(signup ? t("auth.introSignup") : t("auth.introLogin"))}</p>
    <form id="auth-form" class="form">
      <label>${esc(t("auth.email"))}<input type="email" name="email" autocomplete="email" required></label>
      <label>${esc(t("auth.password"))}<input type="password" name="password" minlength="8" autocomplete="${signup ? "new-password" : "current-password"}" required></label>
      <button class="btn btn-primary" type="submit">${esc(signup ? t("auth.create") : t("auth.login"))}</button>
    </form>
    <div class="auth-links">
      <a href="#" id="auth-toggle">${esc(signup ? t("auth.haveAccount") : t("auth.createAccount"))}</a>
      ${signup ? "" : `<a href="#" id="auth-reset">${esc(t("auth.forgot"))}</a>`}
    </div>
  </section>`;
  document.getElementById("auth-toggle").onclick = e => { e.preventDefault(); renderLogin(signup ? "login" : "signup"); };
  const r = document.getElementById("auth-reset");
  if (r) r.onclick = async e => {
    e.preventDefault();
    const email = app.querySelector("input[name=email]").value.trim();
    if (!email) return toast(t("auth.emailFirst"), "warn");
    try { await state.store.resetPassword(email); toast(t("auth.resetSent"), "ok"); } catch (err) { toast(err.message, "err"); }
  };
  document.getElementById("auth-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      if (signup) {
        const res = await state.store.signUp(fd.get("email"), fd.get("password"));
        if (res === "check-email") { toast(t("auth.checkEmail"), "ok"); renderLogin("login"); }
      } else {
        await state.store.signIn(fd.get("email"), fd.get("password"));
      }
    } catch (err) { toast(err.message, "err"); btn.disabled = false; }
  };
}

function renderNewPassword() {
  state.view = "newpw";
  app.innerHTML = `<section class="auth panel"><h1 class="mono">${esc(t("auth.newPassword"))}</h1>
    <form id="np" class="form"><label>${esc(t("auth.password"))}<input type="password" name="p" minlength="8" required autocomplete="new-password"></label>
    <button class="btn btn-primary">${esc(t("auth.save"))}</button></form></section>`;
  document.getElementById("np").onsubmit = async e => {
    e.preventDefault();
    try { await state.store.updatePassword(new FormData(e.target).get("p")); toast(t("auth.pwUpdated"), "ok"); history.replaceState(null, "", location.pathname); start(); }
    catch (err) { toast(err.message, "err"); }
  };
}

// ------------------------------------------------------------------ stats helpers
function chapterStats(chId) {
  const qs = state.questions.filter(q => q.chapter_id === chId);
  let seen = 0, ok = 0;
  for (const q of qs) { const a = state.latest.get(q.id); if (a) { seen++; if (a.is_correct) ok++; } }
  const atts = state.attempts.filter(a => (a.mode === "chapter" || a.mode === "exam") && a.chapter_id === chId);
  const best = atts.reduce((m, a) => Math.max(m, pct(a.correct, a.total)), -1);
  return { total: qs.length, seen, ok, attempts: atts.length, best };
}
function mistakes(filter = () => true) {
  return state.questions.filter(q => filter(q) && state.latest.has(q.id) && !state.latest.get(q.id).is_correct);
}

// ------------------------------------------------------------------ home
function renderHome() {
  stopTimer();
  state.view = "home";
  if (state.section === "practice" && !hasPractice()) state.section = "guide";
  const sec = state.section;
  const inSec = q => secOf(q.chapter_id) === sec;
  const SQ = secQuestions(), SC = secChapters();
  const total = SQ.length;
  let seen = 0, ok = 0;
  for (const q of SQ) { const a = state.latest.get(q.id); if (a) { seen++; if (a.is_correct) ok++; } }
  const mistakeCount = mistakes(inSec).length;
  const mastered = SC.filter(c => chapterStats(c.id).best >= PASS).length;

  const card = c => {
      const s = chapterStats(c.id);
      const best = s.best < 0 ? null : s.best;
      const cls = best === null ? "" : best >= PASS ? "is-pass" : "is-fail";
      const nErr = mistakes(q => q.chapter_id === c.id).length;
      return `
      <article class="chapter-card ${cls}">
        <button class="chapter-main" data-start-chapter="${c.id}" aria-label="${esc(t("home.launchChapter", { n: chLabel(c.id) }))}">
          <span class="ch-num mono">${chLabel(c.id)}</span>
          <span class="ch-title">${esc(chTitle(c))}</span>
          <span class="ch-meta mono">${s.total} Q · ${esc(t("home.attempts", { n: s.attempts }))} · ${esc(best === null ? t("home.never") : t("home.best", { p: best }))}</span>
          <span class="bar"><span style="width:${best ?? 0}%"></span></span>
        </button>
        <div class="ch-actions">
          ${c.domain ? "" : `<button class="btn btn-ghost btn-xs" data-exam-chapter="${c.id}">${esc(t("home.examMode"))}</button>`}
          <button class="btn btn-ghost btn-xs" data-start-chapter="${c.id}" data-shuffle="1" title="${esc(t("home.shuffleTitle"))}">${esc(t("home.shuffle"))}</button>
          ${nErr ? `<button class="btn btn-ghost btn-xs" data-mistakes-chapter="${c.id}">${esc(t("home.errors", { n: nErr }))}</button>` : ""}
        </div>
      </article>`;
  };
  const domainBlocks = DOMAIN_IDS.map(d => {
    const chs = SC.filter(c => c.domain === d);
    if (!chs.length) return "";
    const cards = chs.map(card).join("");
    const dq = state.questions.filter(q => chs.some(c => c.id === q.chapter_id)).length;
    return `
    <section class="domain">
      <div class="domain-head">
        <h2><span class="mono accent">D${d}</span> ${esc(t("domain." + d))}</h2>
        <button class="btn btn-ghost btn-sm" data-start-domain="${d}">${esc(t("home.domainQuiz", { n: Math.min(dq, 30) }))}</button>
      </div>
      <div class="chapter-grid">${cards}</div>
    </section>`;
  }).join("");
  const tests = SC.filter(c => !c.domain);
  const testsBlock = tests.length ? `
    <section class="domain">
      <div class="domain-head"><h2><span class="mono accent">TEST</span> ${esc(t("home.tests"))}</h2></div>
      <p class="muted small">${esc(t("home.testsDesc"))}</p>
      <div class="chapter-grid">${tests.map(card).join("")}</div>
    </section>` : "";
  const tabs = hasPractice() ? `
    <div class="seg sec-tabs" role="group" aria-label="${esc(t("sec.label"))}">
      ${["guide", "practice"].map(k => `<button class="seg-btn" data-section="${k}" aria-pressed="${k === sec}">${esc(t("sec." + k))}
        <small class="mono">${state.questions.filter(q => secOf(q.chapter_id) === k).length}</small></button>`).join("")}
    </div>` : "";

  const sizes = [25, 50, 100, 125, 150];
  app.innerHTML = `
  <section class="hero">
    <p class="mono kicker">&gt; root@cissp:~$ ./train --mode=qcm --lang=${getLang()}</p>
    <h1 class="glitch" data-text="CISSP TRAINING TERMINAL">CISSP TRAINING TERMINAL</h1>
    ${tabs}
    <p class="muted">${esc(sec === "practice" ? t("home.subPractice", { n: total }) : t("home.sub", { n: total, c: SC.length }))}</p>
    <div class="stats">
      <div class="stat"><span class="stat-val mono">${seen}<small>/${total}</small></span><span class="stat-lbl">${esc(t("home.seen"))}</span></div>
      <div class="stat"><span class="stat-val mono">${seen ? pct(ok, seen) : 0}<small>%</small></span><span class="stat-lbl">${esc(t("home.rate"))}</span></div>
      <div class="stat"><span class="stat-val mono">${mastered}<small>/${SC.length}</small></span><span class="stat-lbl">${esc(t("home.mastered", { p: PASS }))}</span></div>
      <div class="stat"><span class="stat-val mono">${state.attempts.length}</span><span class="stat-lbl">${esc(t("home.sessions"))}</span></div>
    </div>
  </section>

  <section class="panel actions-panel">
    <div class="action">
      <h3 class="mono">${esc(t("home.exam"))}</h3>
      <p class="muted">${esc(t("home.examDesc"))}</p>
      <div class="row">
        <select id="exam-size" aria-label="${esc(t("home.nQuestions", { n: "" }))}">
          ${sizes.map(n => `<option value="${n}" ${n === 100 ? "selected" : ""}>${esc(t("home.nQuestions", { n }))}</option>`).join("")}
        </select>
        <button class="btn btn-primary" id="btn-exam">${esc(t("home.start"))}</button>
      </div>
    </div>
    <div class="action">
      <h3 class="mono">${esc(t("home.mistakes"))}</h3>
      <p class="muted">${esc(t("home.mistakesDesc"))}</p>
      <button class="btn ${mistakeCount ? "btn-danger" : "btn-ghost"}" id="btn-mistakes" ${mistakeCount ? "" : "disabled"}>${esc(t("home.toReview", { n: mistakeCount }))}</button>
    </div>
    <div class="action">
      <h3 class="mono">${esc(t("home.history"))}</h3>
      <p class="muted">${esc(t("home.historyDesc"))}</p>
      <button class="btn btn-ghost" id="btn-history">${esc(t("home.seeHistory"))}</button>
    </div>
  </section>

  ${domainBlocks}
  ${testsBlock}`;

  app.querySelectorAll("[data-section]").forEach(b => b.onclick = () => setSection(b.dataset.section));
  app.querySelectorAll("[data-exam-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.examChapter;
    const qs = state.questions.filter(q => q.chapter_id === id);
    startQuiz({ mode: "exam", chapter_id: id, label: () => t("mode.test", { name: chTitle(chById(id)) }), questions: qs, feedback: false, timed: qs.length * 72 });
  });

  app.querySelectorAll("[data-start-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.startChapter;
    const qs = state.questions.filter(q => q.chapter_id === id);
    startQuiz({ mode: "chapter", chapter_id: id, label: () => `${chLabel(id)} · ${chTitle(chById(id))}`, questions: b.dataset.shuffle ? shuffle(qs) : qs, feedback: true });
  });
  app.querySelectorAll("[data-mistakes-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.mistakesChapter;
    startQuiz({ mode: "mistakes", chapter_id: id, label: () => t("mode.mistakesCh", { n: chLabel(id) }), questions: shuffle(mistakes(q => q.chapter_id === id)), feedback: true });
  });
  app.querySelectorAll("[data-start-domain]").forEach(b => b.onclick = () => {
    const d = +b.dataset.startDomain;
    const ids = SC.filter(c => c.domain === d).map(c => c.id);
    const qs = shuffle(state.questions.filter(q => ids.includes(q.chapter_id))).slice(0, 30);
    startQuiz({ mode: "domain", chapter_id: null, label: () => t("mode.domain", { d, name: t("domain." + d) }), questions: qs, feedback: true });
  });
  document.getElementById("btn-exam").onclick = () => {
    const n = +document.getElementById("exam-size").value;
    startQuiz({ mode: "exam", chapter_id: null, label: () => t("mode.exam", { n }), questions: shuffle(SQ).slice(0, n), feedback: false, timed: n * 72 });
  };
  document.getElementById("btn-mistakes").onclick = () => {
    startQuiz({ mode: "mistakes", chapter_id: null, label: () => t("mode.mistakes"), questions: shuffle(mistakes(inSec)), feedback: true });
  };
  document.getElementById("btn-history").onclick = () => go("history");
}

// ------------------------------------------------------------------ quiz
function startQuiz(opts) {
  if (!opts.questions.length) return toast(t("quiz.none"), "warn");
  state.quiz = { ...opts, i: 0, peek: false, picks: opts.questions.map(() => []), checked: opts.questions.map(() => false), startedAt: Date.now(), elapsed: 0 };
  stopTimer();
  state.timer = setInterval(() => {
    const q = state.quiz; if (!q) return stopTimer();
    q.elapsed = Math.floor((Date.now() - q.startedAt) / 1000);
    const el = document.getElementById("timer");
    if (!el) return;
    if (q.timed) {
      const left = Math.max(0, q.timed - q.elapsed);
      el.textContent = fmtTime(left);
      el.classList.toggle("danger", left < 300);
      if (left === 0) { toast(t("quiz.timeUp"), "warn"); finishQuiz(); }
    } else el.textContent = fmtTime(q.elapsed);
  }, 1000);
  go("quiz");
}

function renderQuiz() {
  stopSpeak();
  state.view = "quiz";
  const z = state.quiz;
  const q = z.questions[z.i];
  // "peek" = afficher temporairement l'autre langue pour cette question
  const showLang = z.peek ? (getLang() === "fr" ? "en" : "fr") : getLang();
  const txt = qText(q, showLang);
  const picks = z.picks[z.i];
  const checked = z.checked[z.i];
  const answered = z.picks.filter(p => p.length).length;
  const isOk = checked && sameSet(picks, q.correct);
  const canPeek = hasFr(q);
  const peekLabel = showLang === "fr" ? t("quiz.original") : t("quiz.translated");

  const opts = txt.options.map((o, idx) => {
    const L = letter(idx);
    const sel = picks.includes(L);
    let cls = sel ? "selected" : "";
    if (checked) {
      if (q.correct.includes(L)) cls += " correct";
      else if (sel) cls += " wrong";
    }
    return `<li><button class="opt ${cls}" data-letter="${L}" ${checked ? "disabled" : ""} role="${q.multi ? "checkbox" : "radio"}" aria-checked="${sel}">
      <span class="opt-key mono">${L}</span><span class="opt-txt">${esc(o)}</span>
      <span class="opt-mark mono">${checked ? (q.correct.includes(L) ? "✓" : sel ? "✗" : "") : ""}</span></button></li>`;
  }).join("");

  const isLast = z.i === z.questions.length - 1;
  let mainBtn;
  if (z.feedback && !checked) mainBtn = `<button class="btn btn-primary" id="btn-check" ${picks.length ? "" : "disabled"}>${esc(t("quiz.check"))}</button>`;
  else if (isLast) mainBtn = `<button class="btn btn-primary" id="btn-finish">${esc(t("quiz.finish"))}</button>`;
  else mainBtn = `<button class="btn btn-primary" id="btn-next">${esc(t("quiz.next"))}</button>`;

  app.innerHTML = `
  <section class="quiz">
    <div class="quiz-head">
      <div>
        <p class="mono kicker">${esc(z.label())}</p>
        <p class="mono q-count">Q ${pad(z.i + 1)}<span class="muted">/${pad(z.questions.length)}</span>
          <span class="muted"> · ${chLabel(q.chapter_id)} #${q.number}</span></p>
      </div>
      <div class="quiz-head-right">
        <span id="timer" class="timer mono">${z.timed ? fmtTime(Math.max(0, z.timed - z.elapsed)) : fmtTime(z.elapsed)}</span>
        <button class="btn btn-ghost btn-sm" id="btn-quit">${esc(t("quiz.quit"))}</button>
      </div>
    </div>
    <div class="progress"><span style="width:${pct(z.i + (checked ? 1 : 0), z.questions.length)}%"></span></div>

    <article class="panel question-panel" lang="${txt.lang}">
      <div class="q-top">
        <p class="q-chapter mono muted">${esc(chTitle(chById(q.chapter_id)))}</p>
        ${canPeek ? `<button class="btn btn-ghost btn-xs" id="btn-peek" lang="${getLang()}">${esc(peekLabel)}</button>` : ""}
      </div>
      ${txt.scenario ? `<div class="scenario"><p class="mono kicker">${esc(t("quiz.scenario"))}</p><p>${esc(txt.scenario)}</p></div>` : ""}
      <h2 class="q-text">${esc(txt.question)}</h2>
      ${getLang() === "fr" && !z.peek && !hasFr(q) ? `<p class="hint mono">${esc(t("quiz.untranslated"))}</p>` : ""}
      ${q.multi ? `<p class="hint mono">${esc(t("quiz.multi"))}</p>` : ""}
      <ol class="opts">${opts}</ol>
      ${checked ? `
      <div class="explain ${isOk ? "ok" : "ko"}">
        <div class="verdict-row"><p class="mono verdict">${esc(isOk ? t("quiz.granted") : t("quiz.denied", { a: q.correct.join(", ") }))}</p>${speakBtn(q)}</div>
        <p>${esc(txt.explanation)}</p>
      </div>` : ""}
    </article>

    <div class="quiz-nav">
      <button class="btn btn-ghost" id="btn-prev" ${z.i === 0 ? "disabled" : ""}>${esc(t("quiz.prev"))}</button>
      <span class="muted mono small">${esc(t("quiz.answered", { a: answered, n: z.questions.length }))}</span>
      <div class="row">
        ${!z.feedback && !isLast ? `<button class="btn btn-ghost" id="btn-finish-early">${esc(t("quiz.finish"))}</button>` : ""}
        ${mainBtn}
      </div>
    </div>
    ${!z.feedback ? `<nav class="qmap" aria-label="${esc(t("quiz.nav"))}">${z.questions.map((_, k) =>
      `<button class="qdot ${k === z.i ? "cur" : ""} ${z.picks[k].length ? "done" : ""}" data-goto="${k}">${k + 1}</button>`).join("")}</nav>` : ""}
  </section>`;

  app.querySelectorAll(".opt").forEach(b => b.onclick = () => toggle(b.dataset.letter));
  bindSpeak([q]);
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on("btn-check", check);
  on("btn-next", () => move(1));
  on("btn-prev", () => move(-1));
  on("btn-peek", () => { z.peek = !z.peek; renderQuiz(); });
  on("btn-finish", () => {
    const left = z.questions.length - answered;
    if (!z.feedback && left > 0 && !confirm(t("quiz.unanswered", { n: left }))) return;
    finishQuiz();
  });
  on("btn-finish-early", () => { if (confirm(t("quiz.finishEarly", { n: z.questions.length - answered }))) finishQuiz(); });
  on("btn-quit", () => go(""));
  app.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { z.i = +b.dataset.goto; z.peek = false; renderQuiz(); });
}

function toggle(L) {
  const z = state.quiz; if (!z || z.checked[z.i]) return;
  const q = z.questions[z.i];
  if (letter(q.options.length - 1) < L) return;
  let p = z.picks[z.i];
  if (q.multi) p = p.includes(L) ? p.filter(x => x !== L) : [...p, L];
  else p = p[0] === L ? [] : [L];
  z.picks[z.i] = p;
  renderQuiz();
}
function check() {
  const z = state.quiz; if (!z.picks[z.i].length) return;
  z.checked[z.i] = true; renderQuiz();
}
function move(d) {
  const z = state.quiz;
  z.i = Math.min(z.questions.length - 1, Math.max(0, z.i + d));
  z.peek = false;
  renderQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function finishQuiz() {
  const z = state.quiz; if (!z) return;
  stopTimer();
  const details = z.questions.map((q, k) => ({ q, picks: z.picks[k], ok: sameSet(z.picks[k], q.correct) }));
  const correct = details.filter(d => d.ok).length;
  const duration = Math.floor((Date.now() - z.startedAt) / 1000);
  state.lastResult = { label: z.label, mode: z.mode, chapter_id: z.chapter_id, details, correct, total: details.length, duration, saved: false, opts: z };
  state.quiz = null;
  // On n'enregistre que les questions répondues (sauf examen : toutes comptent).
  const toSave = details.filter(d => z.mode === "exam" || d.picks.length);
  try {
    await state.store.saveAttempt(
      { mode: z.mode, chapter_id: z.chapter_id, total: details.length, correct, duration_s: duration },
      toSave.map(d => ({ question_id: d.q.id, selected: d.picks, is_correct: d.ok })));
    state.lastResult.saved = true;
    await refreshProgress();
  } catch (e) { console.error(e); toast(t("quiz.notSaved") + e.message, "err"); }
  go("results");
}

// ------------------------------------------------------------------ results
function renderResults() {
  state.view = "results";
  const r = state.lastResult;
  const score = pct(r.correct, r.total);
  const pass = score >= PASS;
  const wrong = r.details.filter(d => !d.ok);
  const rows = r.details.map((d, k) => {
    const txt = qText(d.q);
    return `
    <details class="review ${d.ok ? "ok" : "ko"}" ${d.ok ? "" : "open"} lang="${txt.lang}">
      <summary><span class="mono">${d.ok ? "✓" : "✗"} ${pad(k + 1)}</span> <span class="muted mono">${chLabel(d.q.chapter_id)}#${d.q.number}</span> ${esc(txt.question.slice(0, 110))}${txt.question.length > 110 ? "…" : ""}</summary>
      ${txt.scenario ? `<p class="muted small">${esc(txt.scenario)}</p>` : ""}
      <p class="q-text-sm">${esc(txt.question)}</p>
      <ol class="opts opts-sm">${txt.options.map((o, i) => {
        const L = letter(i); const c = d.q.correct.includes(L); const s = d.picks.includes(L);
        return `<li class="${c ? "correct" : s ? "wrong" : ""}"><span class="opt-key mono">${L}</span> ${esc(o)} ${s ? `<span class="mono muted">${esc(t("res.yourChoice"))}</span>` : ""}</li>`;
      }).join("")}</ol>
      <p class="muted">${d.picks.length ? "" : `<em>${esc(t("res.noAnswer"))}</em> `}${esc(txt.explanation)}</p>
      ${speakBtn(d.q)}
    </details>`;
  }).join("");

  app.innerHTML = `
  <section class="results">
    <div class="panel score-panel ${pass ? "pass" : "fail"}">
      <p class="mono kicker">${esc(r.label())}</p>
      <h1 class="glitch" data-text="${pass ? "ACCESS GRANTED" : "ACCESS DENIED"}">${pass ? "ACCESS GRANTED" : "ACCESS DENIED"}</h1>
      <div class="ring" style="--p:${score}"><span class="mono">${score}%</span></div>
      <p class="mono">${esc(t("res.stats", { c: r.correct, t: r.total, time: fmtTime(r.duration), p: PASS }))}</p>
      <p class="muted small mono">${esc(r.saved ? t("res.saved") : t("res.notSaved"))}</p>
      <div class="row center">
        <button class="btn btn-primary" id="btn-retry">${esc(t("res.retry"))}</button>
        ${wrong.length ? `<button class="btn btn-danger" id="btn-retry-wrong">${esc(t("res.retryWrong", { n: wrong.length }))}</button>` : ""}
        <button class="btn btn-ghost" id="btn-home">${esc(t("res.home"))}</button>
      </div>
    </div>
    <h2 class="mono section-title">${esc(t("res.detail"))}</h2>
    ${rows}
  </section>`;
  bindSpeak(r.details.map(d => d.q));
  document.getElementById("btn-home").onclick = () => go("");
  document.getElementById("btn-retry").onclick = () => startQuiz({ ...r.opts, questions: r.mode === "chapter" ? r.opts.questions : shuffle(r.opts.questions) });
  const rw = document.getElementById("btn-retry-wrong");
  if (rw) rw.onclick = () => startQuiz({ mode: "mistakes", chapter_id: r.chapter_id, label: () => t("mode.errorsOf", { label: r.label() }), questions: shuffle(wrong.map(d => d.q)), feedback: true });
}

// ------------------------------------------------------------------ history
function renderHistory() {
  state.view = "history";
  const rows = state.attempts.map(a => {
    const s = pct(a.correct, a.total);
    return `<tr><td class="mono">${fmtDate(a.created_at)}</td><td>${esc(t("type." + a.mode))}${a.chapter_id ? ` · ${chLabel(a.chapter_id)}` : ""}</td>
      <td class="mono">${a.correct}/${a.total}</td><td class="mono ${s >= PASS ? "accent" : "danger"}">${s}%</td><td class="mono">${fmtTime(a.duration_s || 0)}</td></tr>`;
  }).join("");
  const chRows = state.chapters.map(c => {
    const s = chapterStats(c.id);
    return `<tr><td class="mono">${chLabel(c.id)}</td><td>${esc(chTitle(c))}</td><td class="mono">${s.seen}/${s.total}</td>
      <td class="mono">${s.seen ? pct(s.ok, s.seen) + "%" : "–"}</td><td class="mono">${s.best >= 0 ? s.best + "%" : "–"}</td></tr>`;
  }).join("");
  app.innerHTML = `
  <section>
    <div class="row between"><h1 class="mono">${esc(t("hist.title"))}</h1><button class="btn btn-ghost" id="btn-home">${esc(t("hist.back"))}</button></div>
    <h2 class="mono section-title">${esc(t("hist.byChapter"))}</h2>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>${esc(t("hist.colChapter"))}</th><th>${esc(t("hist.colSeen"))}</th><th>${esc(t("hist.colRate"))}</th><th>${esc(t("hist.colBest"))}</th></tr></thead><tbody>${chRows}</tbody></table></div>
    <h2 class="mono section-title">${esc(t("hist.sessions"))}</h2>
    ${rows ? `<div class="table-wrap"><table><thead><tr><th>${esc(t("hist.colDate"))}</th><th>${esc(t("hist.colType"))}</th><th>${esc(t("hist.colScore"))}</th><th>%</th><th>${esc(t("hist.colTime"))}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">${esc(t("hist.none"))}</p>`}
    <p class="reset-zone"><button class="btn btn-danger btn-sm" id="btn-reset">${esc(t("hist.reset"))}</button></p>
  </section>`;
  document.getElementById("btn-home").onclick = () => go("");
  document.getElementById("btn-reset").onclick = async () => {
    if (!confirm(t("hist.resetConfirm"))) return;
    try { await state.store.resetProgress(); await refreshProgress(); toast(t("hist.resetDone"), "ok"); renderHistory(); }
    catch (e) { toast(e.message, "err"); }
  };
}

// ------------------------------------------------------------------ keyboard
function onKey(e) {
  if (!state.quiz || location.hash !== "#/quiz") return;
  if (e.target.matches("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toUpperCase();
  if (/^[A-K]$/.test(k)) { e.preventDefault(); toggle(k); return; }
  if (e.key === "Enter") {
    e.preventDefault();
    const btn = document.getElementById("btn-check") || document.getElementById("btn-next") || document.getElementById("btn-finish");
    if (btn && !btn.disabled) btn.click();
  }
  if (e.key === "ArrowRight") { const b = document.getElementById("btn-next"); if (b) b.click(); }
  if (e.key === "ArrowLeft") { const b = document.getElementById("btn-prev"); if (b && !b.disabled) b.click(); }
}

boot();
