import { SupabaseStore, LocalStore, latestByQuestion } from "./store.js";

const CFG = window.CISSP_CONFIG || {};
const PASS = CFG.PASS_MARK || 70;
const DOMAINS = {
  1: "Sécurité et gestion des risques",
  2: "Sécurité des actifs",
  3: "Architecture et ingénierie de la sécurité",
  4: "Sécurité des communications et des réseaux",
  5: "Gestion des identités et des accès (IAM)",
  6: "Évaluation et tests de sécurité",
  7: "Opérations de sécurité",
  8: "Sécurité du développement logiciel",
};

const app = document.getElementById("app");
const state = {
  store: null, session: null,
  chapters: [], questions: [], byId: new Map(),
  attempts: [], latest: new Map(),
  quiz: null, timer: null, lastResult: null,
};

// ------------------------------------------------------------------ utils
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const letter = i => String.fromCharCode(65 + i);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmtTime = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const fmtDate = d => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function toast(msg, kind = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3800);
}
function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }

// ------------------------------------------------------------------ boot
async function boot() {
  const useSupabase = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase;
  state.store = useSupabase ? new SupabaseStore(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : new LocalStore(CFG.LOCAL_DATA);
  const badge = document.getElementById("mode-badge");
  badge.textContent = useSupabase ? "SUPABASE" : "MODE LOCAL";
  badge.classList.add(useSupabase ? "badge-ok" : "badge-warn");

  document.getElementById("btn-logout").addEventListener("click", async () => {
    stopTimer(); await state.store.signOut(); state.session = null; state.chapters = []; renderLogin();
  });
  window.addEventListener("hashchange", route);
  document.addEventListener("keydown", onKey);

  if (useSupabase && /type=recovery/.test(location.hash)) {
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
  const u = document.getElementById("user-label");
  u.textContent = state.session?.user?.email || "";
  document.getElementById("btn-logout").hidden = state.store.kind === "local";
  app.innerHTML = `<div class="boot"><p class="mono">&gt; déchiffrement de la base de questions<span class="cursor">_</span></p></div>`;
  try {
    const { chapters, questions } = await state.store.loadContent();
    state.chapters = chapters;
    state.questions = questions;
    state.byId = new Map(questions.map(q => [q.id, q]));
    if (!questions.length) throw new Error("Aucune question trouvée. Avez-vous exécuté private/seed_questions.sql dans Supabase ?");
    await refreshProgress();
    route();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="panel error-panel"><h2 class="mono">// ERREUR</h2><p>${esc(e.message || e)}</p>
      <p class="muted">Voir le README, section « Dépannage ».</p></section>`;
  }
}

async function refreshProgress() {
  const [attempts, answers] = await Promise.all([state.store.attempts(), state.store.answers()]);
  state.attempts = attempts;
  state.latest = latestByQuestion(answers);
}

function route() {
  if (!state.session || !state.chapters.length) return;
  const h = location.hash.replace(/^#\/?/, "");
  if (state.quiz && h !== "quiz") { if (!confirm("Quitter le quiz en cours ? Les réponses ne seront pas enregistrées.")) { history.replaceState(null, "", "#/quiz"); return; } stopTimer(); state.quiz = null; }
  if (h === "quiz" && state.quiz) return renderQuiz();
  if (h === "results" && state.lastResult) return renderResults();
  if (h === "history") return renderHistory();
  renderHome();
}
const go = h => { if (location.hash === `#/${h}`) route(); else location.hash = `#/${h}`; };

// ------------------------------------------------------------------ auth views
function renderLogin(mode = "login") {
  document.getElementById("user-label").textContent = "";
  document.getElementById("btn-logout").hidden = true;
  const signup = mode === "signup";
  app.innerHTML = `
  <section class="auth panel">
    <p class="mono kicker">&gt; authentification requise</p>
    <h1 class="glitch" data-text="ACCESS CONTROL">ACCESS CONTROL</h1>
    <p class="muted">${signup ? "Créez votre compte pour sauvegarder votre progression." : "Connectez-vous pour accéder aux 420 questions et à votre progression."}</p>
    <form id="auth-form" class="form">
      <label>Email<input type="email" name="email" autocomplete="email" required></label>
      <label>Mot de passe<input type="password" name="password" minlength="8" autocomplete="${signup ? "new-password" : "current-password"}" required></label>
      <button class="btn btn-primary" type="submit">${signup ? "Créer le compte" : "Se connecter"}</button>
    </form>
    <div class="auth-links">
      <a href="#" id="auth-toggle">${signup ? "J'ai déjà un compte" : "Créer un compte"}</a>
      ${signup ? "" : `<a href="#" id="auth-reset">Mot de passe oublié</a>`}
    </div>
  </section>`;
  document.getElementById("auth-toggle").onclick = e => { e.preventDefault(); renderLogin(signup ? "login" : "signup"); };
  const r = document.getElementById("auth-reset");
  if (r) r.onclick = async e => {
    e.preventDefault();
    const email = app.querySelector("input[name=email]").value.trim();
    if (!email) return toast("Saisissez d'abord votre email.", "warn");
    try { await state.store.resetPassword(email); toast("Email de réinitialisation envoyé.", "ok"); } catch (err) { toast(err.message, "err"); }
  };
  document.getElementById("auth-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      if (signup) {
        const r = await state.store.signUp(fd.get("email"), fd.get("password"));
        if (r === "check-email") { toast("Compte créé : confirmez via le lien reçu par email.", "ok"); renderLogin("login"); }
      } else {
        await state.store.signIn(fd.get("email"), fd.get("password"));
      }
    } catch (err) { toast(err.message, "err"); btn.disabled = false; }
  };
}

function renderNewPassword() {
  app.innerHTML = `<section class="auth panel"><h1 class="mono">Nouveau mot de passe</h1>
    <form id="np" class="form"><label>Mot de passe<input type="password" name="p" minlength="8" required autocomplete="new-password"></label>
    <button class="btn btn-primary">Enregistrer</button></form></section>`;
  document.getElementById("np").onsubmit = async e => {
    e.preventDefault();
    try { await state.store.updatePassword(new FormData(e.target).get("p")); toast("Mot de passe mis à jour.", "ok"); history.replaceState(null, "", location.pathname); start(); }
    catch (err) { toast(err.message, "err"); }
  };
}

// ------------------------------------------------------------------ stats helpers
function chapterStats(chId) {
  const qs = state.questions.filter(q => q.chapter_id === chId);
  let seen = 0, ok = 0;
  for (const q of qs) { const a = state.latest.get(q.id); if (a) { seen++; if (a.is_correct) ok++; } }
  const atts = state.attempts.filter(a => a.mode === "chapter" && a.chapter_id === chId);
  const best = atts.reduce((m, a) => Math.max(m, pct(a.correct, a.total)), -1);
  return { total: qs.length, seen, ok, attempts: atts.length, best };
}
function mistakes(filter = () => true) {
  return state.questions.filter(q => filter(q) && state.latest.has(q.id) && !state.latest.get(q.id).is_correct);
}

// ------------------------------------------------------------------ home
function renderHome() {
  stopTimer();
  const total = state.questions.length;
  let seen = 0, ok = 0;
  for (const a of state.latest.values()) { seen++; if (a.is_correct) ok++; }
  const mistakeCount = mistakes().length;
  const mastered = state.chapters.filter(c => chapterStats(c.id).best >= PASS).length;

  const domainBlocks = Object.entries(DOMAINS).map(([d, name]) => {
    const chs = state.chapters.filter(c => c.domain === +d);
    if (!chs.length) return "";
    const cards = chs.map(c => {
      const s = chapterStats(c.id);
      const best = s.best < 0 ? null : s.best;
      const cls = best === null ? "" : best >= PASS ? "is-pass" : "is-fail";
      return `
      <article class="chapter-card ${cls}">
        <button class="chapter-main" data-start-chapter="${c.id}" aria-label="Lancer le quiz du chapitre ${c.id}">
          <span class="ch-num mono">CH_${pad(c.id)}</span>
          <span class="ch-title">${esc(c.title)}</span>
          <span class="ch-meta mono">${s.total} Q · ${s.attempts} essai${s.attempts > 1 ? "s" : ""} · ${best === null ? "jamais fait" : `meilleur ${best}%`}</span>
          <span class="bar"><span style="width:${best ?? 0}%"></span></span>
        </button>
        <div class="ch-actions">
          <button class="btn btn-ghost btn-xs" data-start-chapter="${c.id}" data-shuffle="1" title="Questions dans le désordre">Mélanger</button>
          ${mistakes(q => q.chapter_id === c.id).length ? `<button class="btn btn-ghost btn-xs" data-mistakes-chapter="${c.id}">Erreurs (${mistakes(q => q.chapter_id === c.id).length})</button>` : ""}
        </div>
      </article>`;
    }).join("");
    const dq = state.questions.filter(q => chs.some(c => c.id === q.chapter_id)).length;
    return `
    <section class="domain">
      <div class="domain-head">
        <h2><span class="mono accent">D${d}</span> ${esc(name)}</h2>
        <button class="btn btn-ghost btn-sm" data-start-domain="${d}">Quiz domaine (${Math.min(dq, 30)} Q)</button>
      </div>
      <div class="chapter-grid">${cards}</div>
    </section>`;
  }).join("");

  app.innerHTML = `
  <section class="hero">
    <p class="mono kicker">&gt; root@cissp:~$ ./train --mode=qcm</p>
    <h1 class="glitch" data-text="CISSP TRAINING TERMINAL">CISSP TRAINING TERMINAL</h1>
    <p class="muted">${total} questions de révision réparties sur ${state.chapters.length} chapitres et les 8 domaines du CBK.</p>
    <div class="stats">
      <div class="stat"><span class="stat-val mono">${seen}<small>/${total}</small></span><span class="stat-lbl">questions vues</span></div>
      <div class="stat"><span class="stat-val mono">${seen ? pct(ok, seen) : 0}<small>%</small></span><span class="stat-lbl">réussite (dernière réponse)</span></div>
      <div class="stat"><span class="stat-val mono">${mastered}<small>/${state.chapters.length}</small></span><span class="stat-lbl">chapitres ≥ ${PASS}%</span></div>
      <div class="stat"><span class="stat-val mono">${state.attempts.length}</span><span class="stat-lbl">sessions</span></div>
    </div>
  </section>

  <section class="panel actions-panel">
    <div class="action">
      <h3 class="mono">// EXAMEN BLANC</h3>
      <p class="muted">Questions tirées au hasard dans tous les chapitres, chronométrées, correction à la fin.</p>
      <div class="row">
        <select id="exam-size" aria-label="Nombre de questions">
          <option value="25">25 questions</option><option value="50">50 questions</option>
          <option value="100" selected>100 questions</option><option value="125">125 questions</option>
          <option value="150">150 questions</option>
        </select>
        <button class="btn btn-primary" id="btn-exam">Lancer</button>
      </div>
    </div>
    <div class="action">
      <h3 class="mono">// REVOIR MES ERREURS</h3>
      <p class="muted">Les questions dont votre dernière réponse était fausse.</p>
      <button class="btn ${mistakeCount ? "btn-danger" : "btn-ghost"}" id="btn-mistakes" ${mistakeCount ? "" : "disabled"}>${mistakeCount} question${mistakeCount > 1 ? "s" : ""} à revoir</button>
    </div>
    <div class="action">
      <h3 class="mono">// HISTORIQUE</h3>
      <p class="muted">Toutes vos sessions et vos scores.</p>
      <button class="btn btn-ghost" id="btn-history">Voir l'historique</button>
    </div>
  </section>

  ${domainBlocks}`;

  app.querySelectorAll("[data-start-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.startChapter;
    const qs = state.questions.filter(q => q.chapter_id === id);
    startQuiz({ mode: "chapter", chapter_id: id, label: `CH_${pad(id)} · ${state.chapters.find(c => c.id === id).title}`, questions: b.dataset.shuffle ? shuffle(qs) : qs, feedback: true });
  });
  app.querySelectorAll("[data-mistakes-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.mistakesChapter;
    startQuiz({ mode: "mistakes", chapter_id: id, label: `Erreurs · CH_${pad(id)}`, questions: shuffle(mistakes(q => q.chapter_id === id)), feedback: true });
  });
  app.querySelectorAll("[data-start-domain]").forEach(b => b.onclick = () => {
    const d = +b.dataset.startDomain;
    const ids = state.chapters.filter(c => c.domain === d).map(c => c.id);
    const qs = shuffle(state.questions.filter(q => ids.includes(q.chapter_id))).slice(0, 30);
    startQuiz({ mode: "domain", chapter_id: null, label: `Domaine ${d} · ${DOMAINS[d]}`, questions: qs, feedback: true });
  });
  document.getElementById("btn-exam").onclick = () => {
    const n = +document.getElementById("exam-size").value;
    startQuiz({ mode: "exam", chapter_id: null, label: `Examen blanc · ${n} Q`, questions: shuffle(state.questions).slice(0, n), feedback: false, timed: n * 72 });
  };
  document.getElementById("btn-mistakes").onclick = () => {
    startQuiz({ mode: "mistakes", chapter_id: null, label: "Revoir mes erreurs", questions: shuffle(mistakes()), feedback: true });
  };
  document.getElementById("btn-history").onclick = () => go("history");
}

// ------------------------------------------------------------------ quiz
function startQuiz(opts) {
  if (!opts.questions.length) return toast("Aucune question disponible.", "warn");
  state.quiz = { ...opts, i: 0, picks: opts.questions.map(() => []), checked: opts.questions.map(() => false), startedAt: Date.now(), elapsed: 0 };
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
      if (left === 0) { toast("Temps écoulé !", "warn"); finishQuiz(); }
    } else el.textContent = fmtTime(q.elapsed);
  }, 1000);
  go("quiz");
}

function renderQuiz() {
  const z = state.quiz;
  const q = z.questions[z.i];
  const picks = z.picks[z.i];
  const checked = z.checked[z.i];
  const answered = z.picks.filter(p => p.length).length;
  const chapter = state.chapters.find(c => c.id === q.chapter_id);
  const isOk = checked && sameSet(picks, q.correct);

  const opts = q.options.map((o, idx) => {
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
  if (z.feedback && !checked) mainBtn = `<button class="btn btn-primary" id="btn-check" ${picks.length ? "" : "disabled"}>Valider</button>`;
  else if (isLast) mainBtn = `<button class="btn btn-primary" id="btn-finish">Terminer</button>`;
  else mainBtn = `<button class="btn btn-primary" id="btn-next">Suivante →</button>`;

  app.innerHTML = `
  <section class="quiz">
    <div class="quiz-head">
      <div>
        <p class="mono kicker">${esc(z.label)}</p>
        <p class="mono q-count">Q ${pad(z.i + 1)}<span class="muted">/${pad(z.questions.length)}</span>
          <span class="muted"> · CH_${pad(q.chapter_id)} #${q.number}</span></p>
      </div>
      <div class="quiz-head-right">
        <span id="timer" class="timer mono">${z.timed ? fmtTime(Math.max(0, z.timed - z.elapsed)) : fmtTime(z.elapsed)}</span>
        <button class="btn btn-ghost btn-sm" id="btn-quit">Quitter</button>
      </div>
    </div>
    <div class="progress"><span style="width:${pct(z.i + (checked ? 1 : 0), z.questions.length)}%"></span></div>

    <article class="panel question-panel">
      <p class="q-chapter mono muted">${esc(chapter?.title || "")}</p>
      <h2 class="q-text">${esc(q.question)}</h2>
      ${q.multi ? `<p class="hint mono">[ plusieurs réponses possibles ]</p>` : ""}
      <ol class="opts">${opts}</ol>
      ${checked ? `
      <div class="explain ${isOk ? "ok" : "ko"}">
        <p class="mono verdict">${isOk ? "&gt; ACCESS GRANTED : bonne réponse" : `&gt; ACCESS DENIED : réponse attendue ${q.correct.join(", ")}`}</p>
        <p>${esc(q.explanation)}</p>
      </div>` : ""}
    </article>

    <div class="quiz-nav">
      <button class="btn btn-ghost" id="btn-prev" ${z.i === 0 ? "disabled" : ""}>← Précédente</button>
      <span class="muted mono small">${answered}/${z.questions.length} répondues</span>
      <div class="row">
        ${!z.feedback && !isLast ? `<button class="btn btn-ghost" id="btn-finish-early">Terminer</button>` : ""}
        ${mainBtn}
      </div>
    </div>
    ${!z.feedback ? `<nav class="qmap" aria-label="Navigation entre questions">${z.questions.map((_, k) =>
      `<button class="qdot ${k === z.i ? "cur" : ""} ${z.picks[k].length ? "done" : ""}" data-goto="${k}">${k + 1}</button>`).join("")}</nav>` : ""}
  </section>`;

  app.querySelectorAll(".opt").forEach(b => b.onclick = () => toggle(b.dataset.letter));
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on("btn-check", check);
  on("btn-next", () => move(1));
  on("btn-prev", () => move(-1));
  on("btn-finish", () => { if (!z.feedback && answered < z.questions.length && !confirm(`${z.questions.length - answered} question(s) sans réponse compteront comme fausses. Terminer ?`)) return; finishQuiz(); });
  on("btn-finish-early", () => { if (confirm(`Terminer maintenant ? ${z.questions.length - answered} question(s) sans réponse compteront comme fausses.`)) finishQuiz(); });
  on("btn-quit", () => go(""));
  app.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { z.i = +b.dataset.goto; renderQuiz(); });
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
  // On n'enregistre que les questions auxquelles on a répondu (sauf examen : toutes comptent).
  const toSave = details.filter(d => z.mode === "exam" || d.picks.length);
  try {
    await state.store.saveAttempt(
      { mode: z.mode, chapter_id: z.chapter_id, total: details.length, correct, duration_s: duration },
      toSave.map(d => ({ question_id: d.q.id, selected: d.picks, is_correct: d.ok })));
    state.lastResult.saved = true;
    await refreshProgress();
  } catch (e) { console.error(e); toast("Résultat non enregistré : " + e.message, "err"); }
  go("results");
}

// ------------------------------------------------------------------ results
function renderResults() {
  const r = state.lastResult;
  const score = pct(r.correct, r.total);
  const pass = score >= PASS;
  const wrong = r.details.filter(d => !d.ok);
  const rows = r.details.map((d, k) => `
    <details class="review ${d.ok ? "ok" : "ko"}" ${d.ok ? "" : "open"}>
      <summary><span class="mono">${d.ok ? "✓" : "✗"} ${pad(k + 1)}</span> <span class="muted mono">CH_${pad(d.q.chapter_id)}#${d.q.number}</span> ${esc(d.q.question.slice(0, 110))}${d.q.question.length > 110 ? "…" : ""}</summary>
      <p class="q-text-sm">${esc(d.q.question)}</p>
      <ol class="opts opts-sm">${d.q.options.map((o, i) => {
        const L = letter(i); const c = d.q.correct.includes(L); const s = d.picks.includes(L);
        return `<li class="${c ? "correct" : s ? "wrong" : ""}"><span class="opt-key mono">${L}</span> ${esc(o)} ${s ? '<span class="mono muted">(votre choix)</span>' : ""}</li>`;
      }).join("")}</ol>
      <p class="muted">${d.picks.length ? "" : "<em>Sans réponse.</em> "}${esc(d.q.explanation)}</p>
    </details>`).join("");

  app.innerHTML = `
  <section class="results">
    <div class="panel score-panel ${pass ? "pass" : "fail"}">
      <p class="mono kicker">${esc(r.label)}</p>
      <h1 class="glitch" data-text="${pass ? "ACCESS GRANTED" : "ACCESS DENIED"}">${pass ? "ACCESS GRANTED" : "ACCESS DENIED"}</h1>
      <div class="ring" style="--p:${score}"><span class="mono">${score}%</span></div>
      <p class="mono">${r.correct}/${r.total} correctes · ${fmtTime(r.duration)} · seuil ${PASS}%</p>
      <p class="muted small mono">${r.saved ? "✓ résultat enregistré" : "✗ résultat non enregistré"}</p>
      <div class="row center">
        <button class="btn btn-primary" id="btn-retry">Recommencer</button>
        ${wrong.length ? `<button class="btn btn-danger" id="btn-retry-wrong">Refaire les ${wrong.length} erreurs</button>` : ""}
        <button class="btn btn-ghost" id="btn-home">Accueil</button>
      </div>
    </div>
    <h2 class="mono section-title">// CORRECTION DÉTAILLÉE</h2>
    ${rows}
  </section>`;
  document.getElementById("btn-home").onclick = () => go("");
  document.getElementById("btn-retry").onclick = () => startQuiz({ ...r.opts, questions: r.mode === "chapter" ? r.opts.questions : shuffle(r.opts.questions) });
  const rw = document.getElementById("btn-retry-wrong");
  if (rw) rw.onclick = () => startQuiz({ mode: "mistakes", chapter_id: r.chapter_id, label: "Erreurs · " + r.label, questions: shuffle(wrong.map(d => d.q)), feedback: true });
}

// ------------------------------------------------------------------ history
function renderHistory() {
  const modeName = { chapter: "Chapitre", exam: "Examen blanc", mistakes: "Erreurs", domain: "Domaine" };
  const rows = state.attempts.map(a => {
    const s = pct(a.correct, a.total);
    return `<tr><td class="mono">${fmtDate(a.created_at)}</td><td>${modeName[a.mode] || a.mode}${a.chapter_id ? ` · CH_${pad(a.chapter_id)}` : ""}</td>
      <td class="mono">${a.correct}/${a.total}</td><td class="mono ${s >= PASS ? "accent" : "danger"}">${s}%</td><td class="mono">${fmtTime(a.duration_s || 0)}</td></tr>`;
  }).join("");
  const chRows = state.chapters.map(c => {
    const s = chapterStats(c.id);
    return `<tr><td class="mono">CH_${pad(c.id)}</td><td>${esc(c.title)}</td><td class="mono">${s.seen}/${s.total}</td>
      <td class="mono">${s.seen ? pct(s.ok, s.seen) + "%" : "–"}</td><td class="mono">${s.best >= 0 ? s.best + "%" : "–"}</td></tr>`;
  }).join("");
  app.innerHTML = `
  <section>
    <div class="row between"><h1 class="mono">// HISTORIQUE</h1><button class="btn btn-ghost" id="btn-home">← Accueil</button></div>
    <h2 class="mono section-title">Par chapitre</h2>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>Chapitre</th><th>Vues</th><th>Réussite</th><th>Meilleur quiz</th></tr></thead><tbody>${chRows}</tbody></table></div>
    <h2 class="mono section-title">Sessions</h2>
    ${rows ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Score</th><th>%</th><th>Durée</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">Aucune session pour l'instant.</p>`}
    <p class="reset-zone"><button class="btn btn-danger btn-sm" id="btn-reset">Effacer toute ma progression</button></p>
  </section>`;
  document.getElementById("btn-home").onclick = () => go("");
  document.getElementById("btn-reset").onclick = async () => {
    if (!confirm("Effacer définitivement toutes vos sessions et réponses ?")) return;
    try { await state.store.resetProgress(); await refreshProgress(); toast("Progression effacée.", "ok"); renderHistory(); }
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
