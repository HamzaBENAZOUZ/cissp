import { SupabaseStore, LocalStore, latestByQuestion } from "./store.js";
import { t, getLang, setLang, locale } from "./i18n.js";
import { offlineEnabled, registerSW, unregisterSW, autonomous, setAutonomous } from "./offline.js";
import { REVISION } from "./revision.js";

/** Vrai dans l'application Android (pont vocal AndroidTTS fourni par l'APK). */
const IN_APP = !!window.AndroidTTS;

const CFG = window.CISSP_CONFIG || {};
const PASS = CFG.PASS_MARK || 70;
const DOMAIN_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
/* Banques de questions (onglets) : CISSP (Study Guide 1-21, Practice Tests 101-112, Last Mile 401-408).
   Le CCSP (chapitres 201-210 et 301-308, même base Supabase) a son propre site : https://hamzabenazouz.github.io/ccsp/ */
const SECTIONS = ["guide", "practice", "lastmile", "revision", "book"];
/** Chapitres de ce site (les chapitres CCSP 201-399 sont ignorés). */
const isOwnChapter = id => id <= 200 || id >= 400;

const app = document.getElementById("app");
const state = {
  store: null, session: null,
  chapters: [], questions: [], byId: new Map(), notes: new Map(),
  attempts: [], latest: new Map(),
  quiz: null, timer: null, lastResult: null,
  view: "boot", authMode: "login",
  section: (() => { try { const v = localStorage.getItem("cissp-section"); return SECTIONS.includes(v) ? v : "guide"; } catch { return "guide"; } })(),
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

/* Mise en forme des listes collées dans le texte du livre (« 1. … 2. … 3. … », « I. … II. … III. … ») :
   on passe à la ligne avant chaque élément, seulement si au moins 3 éléments se suivent dans l'ordre
   (évite les faux positifs comme « Type I. » isolé). Affichage via CSS white-space: pre-line. */
const SEQS = [
  ["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."],
  ["I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII."],
];
function breakSeq(t, labels) {
  const at = []; let pos = 0;
  for (const lab of labels) {
    const i = t.indexOf(" " + lab + " ", pos);
    if (i < 0) break;
    at.push(i); pos = i + lab.length + 1;
  }
  if (at.length < 3) return t;
  let out = t;
  for (const i of at.reverse()) out = out.slice(0, i) + "\n" + out.slice(i + 1);
  return out;
}
function listBreaks(t) {
  if (!t) return t;
  for (const s of SEQS) t = breakSeq(t, s);
  return t;
}

/** Texte d'une question dans la langue voulue (repli sur l'anglais si pas de traduction). */
function qText(q, lang = getLang()) {
  const f = o => ({ ...o, question: listBreaks(o.question), explanation: listBreaks(o.explanation) });
  if (lang === "fr" && q.question_fr) {
    return f({ question: q.question_fr, options: q.options_fr || q.options, explanation: q.explanation_fr || q.explanation,
      scenario: q.scenario_fr || q.scenario, lang: "fr" });
  }
  return f({ question: q.question, options: q.options, explanation: q.explanation, scenario: q.scenario, lang: "en" });
}
const hasFr = q => !!q.question_fr;

/* Lecture à voix haute (anglais, et français quand la question est affichée en français) via l'API Web Speech. */
// Dans l'application Android, la WebView ne parle pas : on passe par le moteur vocal du téléphone (pont AndroidTTS).
const nativeTTS = window.AndroidTTS || null;
const canSpeak = !!nativeTTS || ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
let speakingId = null;
function stopSpeak() { if (nativeTTS) nativeTTS.stop(); else if (canSpeak) speechSynthesis.cancel(); speakingId = null; document.querySelectorAll(".btn-speak.on").forEach(b => b.classList.remove("on")); }
/**
 * Texte lu à voix haute.
 *  - mode "answer"   : la bonne réponse puis l'explication ;
 *  - mode "question" : la question et ses propositions (avant validation : rien n'est dévoilé) ;
 *  - mode "all"      : la question, ses propositions, la bonne réponse et l'explication.
 */
/** Assemble des morceaux de texte avec un point entre eux, sauf s'ils finissent déjà par une ponctuation. */
const joinSpeech = parts => parts.filter(Boolean).map(x => String(x).trim()).filter(Boolean)
  .map(x => /[.?!:;…]$/.test(x) ? x : x + ".").join(" ");
function answerSpeech(q, lang = "en", mode = "all") {
  const x = qText(q, lang), fr = lang === "fr";
  const opt = L => `${L}${fr ? " :" : ":"} ${x.options[L.charCodeAt(0) - 65] || ""}`;
  const letters = x.options.map((_, i) => String.fromCharCode(65 + i));
  const question = joinSpeech(["Question", x.scenario, x.question, ...letters.map(opt)]);
  const head = fr ? (q.correct.length > 1 ? "Bonnes réponses" : "Bonne réponse") : `Correct answer${q.correct.length > 1 ? "s" : ""}`;
  const answer = joinSpeech([head, ...q.correct.map(opt), x.explanation]);
  if (mode === "question") return question;
  if (mode === "answer") return answer;
  return `${question} ${answer}`;
}
/* Voix française : de préférence « Microsoft Denise Online (Natural) - French (France) » sur Edge,
   sinon une autre voix neuronale fr-FR, puis toute voix fr-FR, puis toute voix française. */
function pickVoiceFr() {
  const vs = speechSynthesis.getVoices();
  const fr = vs.filter(v => /^fr[-_]FR$/i.test(v.lang));
  return fr.find(v => /\bDenise\b/i.test(v.name) && /Natural/i.test(v.name))
    || fr.find(v => /Natural|Online/i.test(v.name))
    || fr[0] || vs.find(v => /^fr/i.test(v.lang)) || null;
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
if (canSpeak && !nativeTTS) speechSynthesis.getVoices(); // précharge la liste des voix (chargée en asynchrone par Edge/Chrome)
// Lecture en français : navigateur, ou application Android 2.3+ (pont speakLang).
const canSpeakFr = canSpeak && (!nativeTTS || typeof nativeTTS.speakLang === "function");
function speakAnswer(q, btn, lang = "en", mode = "all") {
  speakText(q.id + ":" + lang + ":" + mode, answerSpeech(q, lang, mode), lang, btn);
}
/** Lit un texte (anglais ou français) ; un second clic sur le même bouton arrête la lecture. */
function speakText(key, text, lang, btn) {
  if (!canSpeak) return;
  if (speakingId === key) { stopSpeak(); return; }
  stopSpeak();
  const done = () => { if (speakingId === key) { speakingId = null; btn.classList.remove("on"); } };
  speakingId = key; btn.classList.add("on");
  if (nativeTTS) {
    window.__ttsDone = done;
    if (lang === "fr") nativeTTS.speakLang(text, "fr-FR"); else nativeTTS.speak(text);
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "fr" ? "fr-FR" : "en-US"; u.rate = 1;
  const v = lang === "fr" ? pickVoiceFr() : pickVoice();
  if (v) u.voice = v;
  u.onend = u.onerror = done;
  speechSynthesis.speak(u);
}
/**
 * Bouton de lecture, dans la langue affichée (français : « Lire… », anglais : « Listen… »).
 *  kind "all"    : « Lire tout » à côté de la question (question + propositions, puis réponse et explication
 *                  une fois la réponse validée : revealed = true) ;
 *  kind "answer" : « Lire la réponse » à côté de l'explication.
 */
const SPEAK_LABEL = {
  fr: { all: ["Lire tout", "Lire la question, les propositions, puis la bonne réponse et l'explication une fois la réponse validée"],
        answer: ["Lire la réponse", "Lire la bonne réponse et l'explication"] },
  en: { all: ["Listen all", "Read the question and options, then the correct answer and explanation once answered"],
        answer: ["Listen to answer", "Read the correct answer and the explanation"] },
};
const speakBtn = (q, shown = "en", kind = "answer", revealed = true) => {
  if (!canSpeak) return "";
  const lang = shown === "fr" && hasFr(q) && canSpeakFr ? "fr" : "en";
  const mode = kind === "all" ? (revealed ? "all" : "question") : "answer";
  const [label, title] = SPEAK_LABEL[lang][kind];
  return `<button class="btn btn-ghost btn-xs btn-speak" data-speak="${q.id}" data-speaklang="${lang}" data-speakmode="${mode}" lang="${lang}"
    title="${esc(title)} (${lang === "fr" ? "cliquer à nouveau pour arrêter" : "click again to stop"})">🔊 ${esc(label)}</button>`;
};
function bindSpeak(list) {
  app.querySelectorAll("[data-speak]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const q = list.find(x => String(x.id) === b.dataset.speak);
    if (q) speakAnswer(q, b, b.dataset.speaklang || "en", b.dataset.speakmode || "answer");
  });
}
const chTitle = c => (c ? (getLang() === "fr" && c.title_fr ? c.title_fr : c.title) : "");
const chById = id => state.chapters.find(c => c.id === id);

// ---- Sections : « guide » = Study Guide CISSP (chapitres 1-21), « practice » = Official Practice Tests CISSP (101-112),
// « ccsp-guide » = Study Guide CCSP (201-210), « ccsp-practice » = Official Practice Tests CCSP (301-308).
// « lastmile » = QCM originaux rédigés d'après « CISSP: The Last Mile » (401-408 = domaines 1-8).
const secOf = chId => (chId > 400 ? "lastmile" : chId > 300 ? "ccsp-practice" : chId > 200 ? "ccsp-guide" : chId > 100 ? "practice" : "guide");
const certOf = sec => (String(sec).startsWith("ccsp") ? "ccsp" : "cissp");
const secCert = () => certOf(state.section);
const secChapters = () => state.chapters.filter(c => secOf(c.id) === state.section);
const secQuestions = () => state.questions.filter(q => secOf(q.chapter_id) === state.section);
// « revision » : fiches de révision (js/revision.js), sans questions ; visible dès que le CISSP est chargé.
// « book » : sections Summary / Study Essentials du livre (table cissp_book_notes), visible si la table est remplie.
const hasSection = sec => sec === "revision" ? state.chapters.some(c => c.id <= 100)
  : sec === "book" ? !!(state.notes && state.notes.size) : state.chapters.some(c => secOf(c.id) === sec);
const hasCcsp = () => hasSection("ccsp-guide") || hasSection("ccsp-practice");
/** Nom d'un domaine, selon la certification (8 domaines CISSP, 6 domaines CCSP). */
const domainName = (d, cert = secCert()) => t((cert === "ccsp" ? "ccspDomain." : "domain.") + d);
/** Étiquette courte d'un chapitre : CH_07, PT_D3 (practice, domaine 3), TEST_2 (test complet) ; préfixe CCSP pour le CCSP. */
function chLabel(id) {
  if (id > 400) return `LM_D${id - 400}`;
  if (id > 200) {
    const c = chById(id), base = id > 300 ? 300 : 200;
    if (id < 300) return `CCSP CH_${pad(id - base)}`;
    return c && c.domain ? `CCSP PT_D${c.domain}` : `CCSP TEST_${id - 306}`;
  }
  if (id <= 100) return `CH_${pad(id)}`;
  const c = chById(id);
  return c && c.domain ? `PT_D${c.domain}` : `TEST_${id - 108}`;
}
function setSection(sec) {
  if (!hasSection(sec)) sec = certOf(sec) === "ccsp" ? (hasSection("ccsp-guide") ? "ccsp-guide" : "ccsp-practice") : "guide";
  state.section = sec;
  try { localStorage.setItem("cissp-section", sec); } catch { /* ignore */ }
  renderHome();
}
/** Passe d'une certification à l'autre en gardant le même type de banque (Study Guide / Practice Tests). */
function setCert(cert) {
  const kind = state.section.endsWith("practice") ? "practice" : "guide";
  setSection(cert === "ccsp" ? "ccsp-" + kind : kind);
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
  if (state.store) badge.textContent = state.store.kind !== "supabase" ? t("top.local") : state.store.offline ? t("off.badge") : "SUPABASE";
  if (state.store && state.store.autonomous) badge.textContent = t("auto.badge");
  badge.classList.toggle("badge-off", !!(state.store && state.store.offline));
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
    stopTimer(); await state.store.signOut(); unregisterSW(); state.session = null; state.chapters = []; renderLogin();
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("online", () => setTimeout(backOnline, 1500));
  // Dans l'application Android, le code du site est embarqué dans l'APK : pas besoin de service worker.
  if (IN_APP) unregisterSW();
  else if (configured && offlineEnabled()) registerSW();
  window.addEventListener("pagehide", flushSave);
  window.__flushSave = flushSave;  // appelé par l'application Android quand elle passe en arrière-plan
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });
  document.addEventListener("keydown", onKey);

  if (configured && /type=recovery/.test(location.hash)) {
    state.store.onAuth(s => { if (s) { state.session = s; renderNewPassword(); } });
    return;
  }
  state.session = await state.store.session();
  state.store.onAuth(s => {
    if (s && state.store.offline) backOnline();   // jeton renouvelé : la connexion est revenue
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
    const { chapters, questions, notes } = await state.store.loadContent();
    state.notes = new Map((notes || []).map(n => [n.chapter_id, n]));
    state.chapters = chapters.filter(c => isOwnChapter(c.id));
    state.questions = questions.filter(q => isOwnChapter(q.chapter_id));
    state.byId = new Map(questions.map(q => [q.id, q]));
    if (!questions.length) throw new Error(t("err.noQuestions"));
    if (state.store.syncOutbox && !state.store.offline) {   // envoie ce qui a été fait hors ligne la dernière fois
      const n = await state.store.syncOutbox().catch(() => 0);
      if (n) toast(t("off.synced", { n }), "ok");
    }
    await refreshProgress();
    applyStaticTexts();
    // Application Android : tout est téléchargé automatiquement pour pouvoir réviser hors ligne.
    if (IN_APP && state.store.kind === "supabase" && !state.store.offline && !offlineEnabled()) {
      state.store.downloadOffline({ chapters, questions })
        .then(() => { toast(t("off.done", { n: questions.length }), "ok"); if (state.view === "home") renderHome(); })
        .catch(e => { console.error(e); toast(t("off.fail") + (e.message || e), "err"); });
    }
    route();
  } catch (e) {
    console.error(e);
    errorPanel(t("err.title"), e.message || String(e), t("err.seeReadme"));
  }
}

/** La connexion est revenue : envoie ce qui a été fait hors ligne, puis recharge la progression. */
let goingOnline = false;
async function backOnline() {
  if (goingOnline || !state.store || !state.store.offline) return;
  goingOnline = true;
  try {
    const pending = (await state.store.offlineInfo()).pending;
    if (await state.store.goOnline()) {
      await refreshProgress();
      applyStaticTexts();
      if (state.view === "home" || state.view === "history") rerender();
      toast(pending ? t("off.synced", { n: pending }) : t("off.online"), "ok");
    }
  } catch (e) { console.error(e); }
  finally { goingOnline = false; }
}

async function downloadOffline(btn) {
  btn.disabled = true; btn.textContent = t("off.downloading");
  try {
    await state.store.downloadOffline({ chapters: state.chapters, questions: state.questions });
    const sw = IN_APP || await registerSW();
    toast(sw ? t("off.done", { n: state.questions.length }) : t("off.doneNoSW"), "ok");
  } catch (e) { console.error(e); toast(t("off.fail") + (e.message || e), "err"); }
  renderHome();
}

/** Interrupteur du mode autonome : ON = l'appli n'utilise plus Internet ni l'authentification. */
async function toggleAutonomous(btn) {
  if (autonomous()) {
    const pending = (await state.store.offlineInfo()).pending;
    if (!confirm(t("auto.offConfirm", { n: pending }))) return;
    setAutonomous(false);
    location.reload();   // redémarre en mode normal : connexion, puis envoi de ce qui a été fait hors ligne
    return;
  }
  if (!confirm(t("auto.onConfirm"))) return;
  btn.disabled = true;
  try {
    if (!state.store.offline) {   // copie fraîche avant de partir
      await state.store.downloadOffline({ chapters: state.chapters, questions: state.questions });
    } else if (!offlineEnabled()) throw new Error(t("auto.needDownload"));
    setAutonomous(true);
    location.reload();
  } catch (e) { console.error(e); toast(t("off.fail") + (e.message || e), "err"); btn.disabled = false; }
}

async function offlinePanel() {
  if (state.store.kind !== "supabase") return "";
  const on = offlineEnabled(), info = on ? await state.store.offlineInfo() : null;
  const status = !on ? t("off.desc")
    : t("off.status", { n: info.n, d: info.at ? fmtDate(info.at) : "?" }) + (info.pending ? " " + t("off.pending", { n: info.pending }) : "");
  const auto = autonomous();
  return `<section class="panel offline-panel">
    <div><h3 class="mono">📥 ${esc(t("off.title"))}</h3><p class="muted">${esc(status)}</p>
      <div class="auto-row">
        <button class="switch${auto ? " on" : ""}" id="btn-auto" role="switch" aria-checked="${auto}"><span class="knob"></span><span class="mono">${auto ? "ON" : "OFF"}</span></button>
        <span><strong>✈️ ${esc(t("auto.title"))}</strong> <span class="muted">${esc(auto ? t("auto.onDesc") : t("auto.offDesc"))}</span></span>
      </div></div>
    <div class="row">${on
      ? `<button class="btn btn-ghost btn-sm" id="btn-off-dl" ${state.store.offline ? "disabled" : ""}>${esc(t("off.update"))}</button>
         <button class="btn btn-ghost btn-sm" id="btn-off-rm" ${state.store.offline ? "disabled" : ""}>${esc(t("off.remove"))}</button>`
      : `<button class="btn btn-primary btn-sm" id="btn-off-dl">${esc(t("off.download"))}</button>`}</div>
  </section>`;
}

async function refreshProgress() {
  const [attempts, allAnswers] = await Promise.all([state.store.attempts(), state.store.answers()]);
  // Base partagée avec le site CCSP : on ne garde que les réponses et sessions qui portent sur des questions CISSP.
  const own = new Set(state.questions.map(q => q.id));
  const answers = allAnswers.filter(a => own.has(a.question_id));
  const ownAtt = new Set(answers.map(a => a.attempt_id).filter(Boolean));
  state.attempts = attempts.filter(a => (a.chapter_id ? isOwnChapter(a.chapter_id) : ownAtt.has(a.id)));
  state.latest = latestByQuestion(answers);
  try { state.flags = new Set((await state.store.flags()).filter(id => own.has(id))); }
  catch (e) { console.warn("flags", e); state.flags = state.flags || new Set(); }
  await refreshSaved();
}

function route() {
  stopSpeak();
  if (!state.session || !state.chapters.length) return;
  const h = location.hash.replace(/^#\/?/, "");
  if (state.quiz && h !== "quiz") {
    if (state.quiz.saveId) { saveQuiz(true); flushSave(); }  // quiz déjà sauvegardé : on enregistre tout de suite, pas besoin de confirmer
    else if (!confirm(t("quiz.leave"))) { history.replaceState(null, "", "#/quiz"); return; }
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
// ---- Questions marquées « à réviser » (bouton 🔖, même bouton pour démarquer)
const isFlagged = q => !!(state.flags && state.flags.has(q.id));
const flagged = (filter = () => true) => state.questions.filter(q => filter(q) && isFlagged(q));
const flagBtn = q => `<button class="btn btn-ghost btn-xs btn-flag${isFlagged(q) ? " on" : ""}" data-flag="${q.id}" aria-pressed="${isFlagged(q)}"
  title="${esc(t("flag.title"))}">🔖 ${esc(isFlagged(q) ? t("flag.on") : t("flag.off"))}</button>`;
async function toggleFlag(qid) {
  const q = state.byId.get(qid); if (!q) return;
  state.flags = state.flags || new Set();
  const on = !state.flags.has(qid);
  on ? state.flags.add(qid) : state.flags.delete(qid);
  paintFlags(qid);
  try {
    const err = await state.store.setFlag(qid, on);
    toast(err ? t("flag.localOnly", { e: err }) : (on ? t("flag.added") : t("flag.removed")), err ? "warn" : "info");
  }
  catch (e) {
    console.error(e);
    on ? state.flags.delete(qid) : state.flags.add(qid); paintFlags(qid);
    toast(t("flag.fail"), "err");
  }
}
function paintFlags(qid) {
  const q = state.byId.get(qid);
  app.querySelectorAll(`[data-flag="${qid}"]`).forEach(b => { b.outerHTML = flagBtn(q); });
  bindFlags();
}
function bindFlags() {
  app.querySelectorAll("[data-flag]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation(); toggleFlag(Number(b.dataset.flag));
  });
}

function mistakes(filter = () => true) {
  return state.questions.filter(q => filter(q) && state.latest.has(q.id) && !state.latest.get(q.id).is_correct);
}

// ------------------------------------------------------------------ home
function bindSaved() {
  app.querySelectorAll("[data-resume]").forEach(b => b.onclick = () => resumeQuiz(b.dataset.resume));
  app.querySelectorAll("[data-drop]").forEach(b => b.onclick = () => {
    if (confirm(t("save.dropConfirm"))) { dropSaved(b.dataset.drop); renderHome(); }
  });
}
/** Relit les quiz sauvegardés (ex. sauvegardés sur un autre appareil) et met à jour le bloc de l'accueil. */
async function refreshSavedSlot() {
  const before = JSON.stringify(loadSaved());
  await refreshSaved();
  const slot = document.getElementById("saved-slot");
  if (!slot || state.view !== "home" || JSON.stringify(loadSaved()) === before) return;
  slot.innerHTML = savedPanel(); bindSaved();
}
// Application Android revenue au premier plan : on relit les sauvegardes faites ailleurs.
window.__appResume = () => { if (state.view === "home" && state.session) refreshSavedSlot(); };
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") window.__appResume(); });

function savedPanel() {
  const list = loadSaved();
  if (!list.length) return "";
  return `<section class="panel saved-panel">
    <h3 class="mono">💾 ${esc(t("save.title2"))}</h3>
    <ul class="saved-list">${list.map(e => {
      const done = e.feedback ? e.checked.filter(Boolean).length : e.picks.filter(p => p && p.length).length;
      return `<li class="saved-item">
        <div><strong>${esc(labelOf(e.lab))}</strong>
          <span class="muted mono">${esc(t("save.meta", { a: done, n: e.qids.length, q: e.i + 1, d: fmtDate(e.savedAt) }))}</span></div>
        <div class="row"><button class="btn btn-primary btn-sm" data-resume="${esc(e.id)}">${esc(t("save.resume"))}</button>
          <button class="btn btn-ghost btn-sm" data-drop="${esc(e.id)}">${esc(t("save.drop"))}</button></div>
      </li>`;
    }).join("")}</ul></section>`;
}

/** Une seule rangée d'onglets : CISSP / CISSP Practice / CISSP Last Mile / Révision CISSP
 *  (seulement ceux qui ont du contenu). Le chiffre est le nombre de questions (de fiches pour la révision). */
function secTabs(sec) {
  const nIn = s => s === "revision" ? REVISION.length : s === "book" ? state.notes.size : state.questions.filter(q => secOf(q.chapter_id) === s).length;
  const SEC_NAMES = { guide: "CISSP", practice: "CISSP Practice", lastmile: "CISSP Last Mile", revision: t("rev.tab"), book: t("book.tab"),
  };
  const secs = Object.keys(SEC_NAMES).filter(hasSection);
  return secs.length > 1 ? `
    <div class="seg sec-tabs" role="group" aria-label="${esc(t("sec.label"))}">
      ${secs.map(k => `<button class="seg-btn" data-section="${k}" aria-pressed="${k === sec}">${esc(SEC_NAMES[k])}
        <small class="mono">${nIn(k)}</small></button>`).join("")}
    </div>` : "";
}

/* ---- Onglet « Révision CISSP » : une fiche par chapitre du Study Guide (résumé, préparer l'examen, à mémoriser),
   avec « Listen » (lecture en anglais) et, quand le site est en français, « Lire » (lecture en français). */
const REV_PANES = ["sum", "tips", "mem"];
const BOOK_PANES = ["bsum", "bess"];   // onglet « Livre CISSP » : Summary / Study Essentials (texte exact du livre)
const revOpen = new Map();   // "section:chapitre" -> volet affiché
/** Lignes d'un volet : fiche (revision.js) ou texte du livre (state.notes, version FR si elle existe). */
function revLines(r, pane, lang) {
  if (pane === "bsum" || pane === "bess") {
    const n = state.notes.get(r.id) || {};
    const en = pane === "bsum" ? n.summary : n.essentials, fr = pane === "bsum" ? n.summary_fr : n.essentials_fr;
    return (lang === "fr" && fr && fr.length ? fr : en) || [];
  }
  return pane === "sum" ? r.sum[lang] : r[pane][lang];
}
function revSpeech(r, pane, lang) {
  const c = chById(r.id), title = c ? (lang === "fr" && c.title_fr ? c.title_fr : c.title) : "";
  const head = t("rev.pane." + pane, {}, lang);
  return joinSpeech([(lang === "fr" ? "Chapitre " : "Chapter ") + r.id, title, head, ...revLines(r, pane, lang).map(l => l.replace(/^(## |- )/, ""))]);
}
function revPaneHtml(r, pane, lang) {
  if (pane === "sum" || pane === "bsum" || pane === "bess") {
    // Lignes « ## » = sous-titre, « - » = puce (regroupées en liste), sinon paragraphe.
    let html = "", list = [];
    const flush = () => { if (list.length) { html += `<ul class="rev-list">${list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; list = []; } };
    for (const l of revLines(r, pane, lang)) {
      if (l.startsWith("- ")) { list.push(l.slice(2)); continue; }
      flush();
      html += l.startsWith("## ") ? `<h4>${esc(l.slice(3))}</h4>` : `<p>${esc(l)}</p>`;
    }
    flush();
    return html;
  }
  return `<ul class="rev-list">${r[pane][lang].map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
}
function renderRevision(sec = "revision") {
  const lang = getLang(), isBook = sec === "book";
  const PANES = isBook ? BOOK_PANES : REV_PANES;
  const ITEMS = isBook ? [...state.notes.keys()].sort((a, b) => a - b).map(id => ({ id })) : REVISION;
  const key = id => sec + ":" + id;
  const paneOf = id => { const p = revOpen.get(key(id)); return PANES.includes(p) ? p : PANES[0]; };
  const card = r => {
    const c = chById(r.id), pane = paneOf(r.id);
    return `
    <details class="rev-card" data-rev="${r.id}" ${revOpen.has(key(r.id)) ? "open" : ""}>
      <summary><span class="ch-num mono">${chLabel(r.id)}</span> <span class="ch-title">${esc(chTitle(c) || "")}</span></summary>
      <div class="rev-body">
        <div class="rev-tools">
          <div class="seg rev-panes" role="group">
            ${PANES.map(p => `<button class="seg-btn" data-revpane="${p}" aria-pressed="${p === pane}">${esc(t("rev.pane." + p))}</button>`).join("")}
          </div>
          <div class="row rev-speak">
            ${canSpeak ? `<button class="btn btn-ghost btn-xs btn-speak" data-revspeak="en" lang="en" title="Read this sheet aloud in English (click again to stop)">🔊 Listen</button>` : ""}
            ${canSpeakFr && lang === "fr" ? `<button class="btn btn-ghost btn-xs btn-speak" data-revspeak="fr" lang="fr" title="Lire cette fiche en français (cliquer à nouveau pour arrêter)">🔊 Lire</button>` : ""}
          </div>
        </div>
        <div class="rev-pane">${revPaneHtml(r, pane, lang)}</div>
      </div>
    </details>`;
  };
  const blocks = DOMAIN_IDS.map(d => {
    const rs = ITEMS.filter(r => (chById(r.id) || {}).domain === d);
    if (!rs.length) return "";
    return `<section class="domain"><div class="domain-head"><h2><span class="mono accent">D${d}</span> ${esc(domainName(d, "cissp"))}</h2></div>
      <div class="rev-grid">${rs.map(card).join("")}</div></section>`;
  }).join("");
  app.innerHTML = `
  <section class="hero">
    <p class="mono kicker">&gt; root@cissp:~$ ./${isBook ? "book" : "review"} --lang=${lang}</p>
    <h1 class="glitch" data-text="${isBook ? "CISSP BOOK" : "CISSP REVIEW"}">${isBook ? "CISSP BOOK" : "CISSP REVIEW"}</h1>
    ${secTabs(sec)}
    <p class="muted">${esc(t(isBook ? "book.sub" : "rev.sub", { n: ITEMS.length }))}</p>
    <div class="row"><button class="btn btn-ghost btn-sm" id="rev-open-all">${esc(t("rev.openAll"))}</button>
      <button class="btn btn-ghost btn-sm" id="rev-close-all">${esc(t("rev.closeAll"))}</button></div>
  </section>
  ${blocks}`;
  app.querySelectorAll("[data-section]").forEach(b => b.onclick = () => { stopSpeak(); setSection(b.dataset.section); });
  app.querySelectorAll(".rev-card").forEach(d => {
    const id = +d.dataset.rev, r = ITEMS.find(x => x.id === id);
    d.addEventListener("toggle", () => { if (d.open) { if (!revOpen.has(key(id))) revOpen.set(key(id), PANES[0]); } else revOpen.delete(key(id)); });
    d.querySelectorAll("[data-revpane]").forEach(b => b.onclick = () => {
      const pane = b.dataset.revpane; revOpen.set(key(id), pane); stopSpeak();
      d.querySelectorAll("[data-revpane]").forEach(x => x.setAttribute("aria-pressed", x === b));
      d.querySelector(".rev-pane").innerHTML = revPaneHtml(r, pane, getLang());
    });
    d.querySelectorAll("[data-revspeak]").forEach(b => b.onclick = e => {
      e.preventDefault();
      const l = b.dataset.revspeak, pane = paneOf(id);
      speakText(`rev:${id}:${pane}:${l}`, revSpeech(r, pane, l), l, b);
    });
  });
  const all = open => () => app.querySelectorAll(".rev-card").forEach(d => { d.open = open; });
  document.getElementById("rev-open-all").onclick = all(true);
  document.getElementById("rev-close-all").onclick = all(false);
}

function renderHome() {
  stopTimer();
  state.view = "home";
  if (!hasSection(state.section)) state.section = "guide";
  if (state.section === "revision" || state.section === "book") { renderRevision(state.section); return; }
  const sec = state.section, cert = certOf(sec), CERT = cert.toUpperCase();
  const kind = sec.endsWith("practice") ? "practice" : "guide";
  const inSec = q => secOf(q.chapter_id) === sec;
  const SQ = secQuestions(), SC = secChapters();
  const total = SQ.length;
  let seen = 0, ok = 0;
  for (const q of SQ) { const a = state.latest.get(q.id); if (a) { seen++; if (a.is_correct) ok++; } }
  const mistakeCount = mistakes(inSec).length;
  const flagCount = flagged(inSec).length;
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
        <h2><span class="mono accent">D${d}</span> ${esc(domainName(d, cert))}</h2>
        <button class="btn btn-ghost btn-sm" data-start-domain="${d}">${esc(t("home.domainQuiz", { n: Math.min(dq, 30) }))}</button>
      </div>
      <div class="chapter-grid">${cards}</div>
    </section>`;
  }).join("");
  const tests = SC.filter(c => !c.domain);
  const testsBlock = tests.length ? `
    <section class="domain">
      <div class="domain-head"><h2><span class="mono accent">TEST</span> ${esc(t("home.tests"))}</h2></div>
      <p class="muted small">${esc(t(cert === "ccsp" ? "ccsp.testsDesc" : "home.testsDesc"))}</p>
      <div class="chapter-grid">${tests.map(card).join("")}</div>
    </section>` : "";
  const tabs = secTabs(sec);
  const subKey = sec === "lastmile" ? "lm.sub" : cert === "ccsp" ? (kind === "practice" ? "ccsp.subPractice" : "ccsp.sub") : (kind === "practice" ? "home.subPractice" : "home.sub");

  const sizes = [25, 50, 100, 125, 150];
  app.innerHTML = `
  <section class="hero">
    <p class="mono kicker">&gt; root@${cert}:~$ ./train --mode=qcm --lang=${getLang()}</p>
    <h1 class="glitch" data-text="${CERT} TRAINING TERMINAL">${CERT} TRAINING TERMINAL</h1>
    ${tabs}
    <p class="muted">${esc(t(subKey, { n: total, c: SC.length }))}</p>
    <div class="stats">
      <div class="stat"><span class="stat-val mono">${seen}<small>/${total}</small></span><span class="stat-lbl">${esc(t("home.seen"))}</span></div>
      <div class="stat"><span class="stat-val mono">${seen ? pct(ok, seen) : 0}<small>%</small></span><span class="stat-lbl">${esc(t("home.rate"))}</span></div>
      <div class="stat"><span class="stat-val mono">${mastered}<small>/${SC.length}</small></span><span class="stat-lbl">${esc(t("home.mastered", { p: PASS }))}</span></div>
      <div class="stat"><span class="stat-val mono">${state.attempts.length}</span><span class="stat-lbl">${esc(t("home.sessions"))}</span></div>
    </div>
  </section>

  <div id="offline-slot"></div>
  <div id="saved-slot">${savedPanel()}</div>
  <section class="panel actions-panel">
    <div class="action">
      <h3 class="mono">${esc(t("home.exam"))}</h3>
      <p class="muted">${esc(t(cert === "ccsp" ? "ccsp.examDesc" : "home.examDesc"))}</p>
      <div class="row">
        <select id="exam-size" aria-label="${esc(t("home.nQuestions", { n: "" }))}">
          ${sizes.map(n => `<option value="${n}" ${n === (cert === "ccsp" ? 150 : 100) ? "selected" : ""}>${esc(t("home.nQuestions", { n }))}</option>`).join("")}
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
      <h3 class="mono">${esc(t("home.flagged"))}</h3>
      <p class="muted">${esc(t("home.flaggedDesc"))}</p>
      <button class="btn ${flagCount ? "btn-flagged" : "btn-ghost"}" id="btn-flagged" ${flagCount ? "" : "disabled"}>🔖 ${esc(t("home.flaggedN", { n: flagCount }))}</button>
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
  app.querySelectorAll("[data-cert]").forEach(b => b.onclick = () => setCert(b.dataset.cert));
  const secPerQ = cert === "ccsp" ? 96 : 72;   // CCSP : 150 questions en 4 h ; CISSP : 72 s par question
  app.querySelectorAll("[data-exam-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.examChapter;
    const qs = state.questions.filter(q => q.chapter_id === id);
    startQuiz({ mode: "exam", chapter_id: id, lab: { k: "test", id }, questions: qs, feedback: false, timed: qs.length * secPerQ });
  });

  app.querySelectorAll("[data-start-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.startChapter;
    const qs = state.questions.filter(q => q.chapter_id === id);
    startQuiz({ mode: "chapter", chapter_id: id, lab: { k: "chapter", id }, questions: b.dataset.shuffle ? shuffle(qs) : qs, feedback: true });
  });
  app.querySelectorAll("[data-mistakes-chapter]").forEach(b => b.onclick = () => {
    const id = +b.dataset.mistakesChapter;
    startQuiz({ mode: "mistakes", chapter_id: id, lab: { k: "mistakesCh", id }, questions: shuffle(mistakes(q => q.chapter_id === id)), feedback: true });
  });
  app.querySelectorAll("[data-start-domain]").forEach(b => b.onclick = () => {
    const d = +b.dataset.startDomain;
    const ids = SC.filter(c => c.domain === d).map(c => c.id);
    const qs = shuffle(state.questions.filter(q => ids.includes(q.chapter_id))).slice(0, 30);
    startQuiz({ mode: "domain", chapter_id: null, lab: { k: "domain", d, c: cert }, questions: qs, feedback: true });
  });
  bindSaved();
  refreshSavedSlot();
  document.getElementById("btn-exam").onclick = () => {
    const n = +document.getElementById("exam-size").value;
    startQuiz({ mode: "exam", chapter_id: null, lab: { k: "exam", n, c: cert }, questions: shuffle(SQ).slice(0, n), feedback: false, timed: n * secPerQ });
  };
  document.getElementById("btn-mistakes").onclick = () => {
    startQuiz({ mode: "mistakes", chapter_id: null, lab: { k: "mistakes" }, questions: shuffle(mistakes(inSec)), feedback: true });
  };
  document.getElementById("btn-flagged").onclick = () => {
    startQuiz({ mode: "mistakes", chapter_id: null, lab: { k: "flagged" }, questions: shuffle(flagged(inSec)), feedback: true });
  };
  document.getElementById("btn-history").onclick = () => go("history");
  offlinePanel().then(html => {
    const slot = document.getElementById("offline-slot");
    if (!slot || !html) return;
    slot.innerHTML = html;
    const dl = document.getElementById("btn-off-dl"), rm = document.getElementById("btn-off-rm");
    if (dl) dl.onclick = () => downloadOffline(dl);
    const au = document.getElementById("btn-auto");
    if (au) au.onclick = () => toggleAutonomous(au);
    if (rm) rm.onclick = async () => {
      if (!confirm(t("off.removeConfirm"))) return;
      await state.store.clearOffline(); await unregisterSW(); toast(t("off.removed"), "info"); renderHome();
    };
  });
}

// ------------------------------------------------------------------ quiz
/* Libellé d'un quiz, reconstruit à partir d'une description sérialisable (pour pouvoir le sauvegarder). */
function labelOf(lab) {
  if (!lab) return "";
  switch (lab.k) {
    case "test": return t("mode.test", { name: chTitle(chById(lab.id)) });
    case "chapter": return `${chLabel(lab.id)} · ${chTitle(chById(lab.id))}`;
    case "mistakesCh": return t("mode.mistakesCh", { n: chLabel(lab.id) });
    case "domain": return (lab.c === "ccsp" ? "CCSP · " : "") + t("mode.domain", { d: lab.d, name: domainName(lab.d, lab.c || "cissp") });
    case "exam": return (lab.c === "ccsp" ? "CCSP · " : "") + t("mode.exam", { n: lab.n });
    case "mistakes": return t("mode.mistakes");
    case "flagged": return t("mode.flagged");
    case "errorsOf": return t("mode.errorsOf", { label: labelOf(lab.of) });
    default: return "";
  }
}

// ---- Quiz sauvegardés (reprise plus tard) : dans Supabase (table saved_quizzes), donc sur tous les
// appareils du compte ; en mode local, dans le navigateur. state.saved en garde une copie en mémoire.
const SAVE_MAX = 10;
const loadSaved = () => state.saved || [];
async function refreshSaved() {
  try {
    const own = new Set(state.questions.map(q => q.id));   // quiz sauvegardés du site CCSP : ignorés ici
    state.saved = (await state.store.listSaved()).filter(x => (x.qids || []).some(id => own.has(id))).slice(0, 20);
    state.savedErr = null;
  }
  catch (e) { console.error(e); state.saved = []; state.savedErr = e; }
}
function dropSaved(id) {
  if (!id) return Promise.resolve();
  state.saved = loadSaved().filter(x => x.id !== id);
  return state.store.deleteSaved(id).catch(e => console.error(e));
}
let saveTimer = null, savePending = null;
let savedErrShown = false;
async function pushSaved(entry) {
  savePending = null;
  try {
    const err = await state.store.putSaved(entry);
    if (err && !savedErrShown) { savedErrShown = true; toast(t("save.localOnly", { e: err }), "warn"); }
    // Au-delà de SAVE_MAX, on supprime les plus anciennes.
    loadSaved().slice(SAVE_MAX).forEach(x => dropSaved(x.id));
    return true;
  } catch (e) { console.error(e); return false; }
}
function flushSave() { clearTimeout(saveTimer); if (savePending) pushSaved(savePending); }
async function saveQuiz(silent = false) {
  const z = state.quiz; if (!z) return;
  if (!z.saveId) z.saveId = "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const entry = {
    id: z.saveId, savedAt: Date.now(), mode: z.mode, chapter_id: z.chapter_id, lab: z.lab, feedback: !!z.feedback,
    timed: z.timed || 0, elapsed: Math.floor((Date.now() - z.startedAt) / 1000), i: z.i,
    qids: z.questions.map(q => q.id), picks: z.picks, checked: z.checked,
    section: secOf(z.questions[0].chapter_id),
  };
  state.saved = [entry, ...loadSaved().filter(x => x.id !== entry.id)];
  if (silent) {  // sauvegarde automatique : regroupée (au plus une écriture toutes les 1,5 s)
    savePending = entry; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1500);
    return;
  }
  clearTimeout(saveTimer);
  savedErrShown = false;
  const ok = await pushSaved(entry);
  if (!savedErrShown) toast(ok ? t("save.done") : t("save.fail"), ok ? "info" : "err");
}
// Après une première sauvegarde manuelle, chaque réponse met à jour la sauvegarde automatiquement.
const autoSave = () => { if (state.quiz && state.quiz.saveId) saveQuiz(true); };
function resumeQuiz(id) {
  const e = loadSaved().find(x => x.id === id); if (!e) return;
  const byId = new Map(state.questions.map(q => [q.id, q]));
  const keep = e.qids.map((qid, k) => [byId.get(qid), k]).filter(([q]) => q);
  if (!keep.length) { dropSaved(id); return toast(t("quiz.none"), "warn"); }
  startQuiz({ mode: e.mode, chapter_id: e.chapter_id, lab: e.lab, feedback: e.feedback, timed: e.timed || undefined,
    questions: keep.map(([q]) => q) }, {
    saveId: e.id, i: Math.min(e.i, keep.length - 1), elapsed: e.elapsed || 0,
    picks: keep.map(([, k]) => e.picks[k] || []), checked: keep.map(([, k]) => !!e.checked[k]),
  });
}

function startQuiz(opts, resume = null) {
  if (!opts.questions.length) return toast(t("quiz.none"), "warn");
  const lab = opts.lab;
  state.quiz = { ...opts, saveId: undefined, label: () => labelOf(lab), i: 0, peek: false, picks: opts.questions.map(() => []), checked: opts.questions.map(() => false), startedAt: Date.now(), elapsed: 0 };
  if (resume) Object.assign(state.quiz, resume, { startedAt: Date.now() - (resume.elapsed || 0) * 1000 });
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
        <button class="btn btn-ghost btn-sm" id="btn-save" title="${esc(t("save.title"))}">💾 ${esc(t("save.btn"))}</button>
        <button class="btn btn-ghost btn-sm" id="btn-quit">${esc(t("quiz.quit"))}</button>
      </div>
    </div>
    <div class="progress"><span style="width:${pct(z.i + (checked ? 1 : 0), z.questions.length)}%"></span></div>

    <article class="panel question-panel" lang="${txt.lang}">
      <div class="q-top">
        <p class="q-chapter mono muted">${esc(chTitle(chById(q.chapter_id)))}</p>
        <div class="q-tools">${speakBtn(q, txt.lang, "all", checked)}${flagBtn(q)}
        ${canPeek ? `<button class="btn btn-ghost btn-xs" id="btn-peek" lang="${getLang()}">${esc(peekLabel)}</button>` : ""}</div>
      </div>
      ${txt.scenario ? `<div class="scenario"><p class="mono kicker">${esc(t("quiz.scenario"))}</p><p>${esc(txt.scenario)}</p></div>` : ""}
      <h2 class="q-text">${esc(txt.question)}</h2>
      ${getLang() === "fr" && !z.peek && !hasFr(q) ? `<p class="hint mono">${esc(t("quiz.untranslated"))}</p>` : ""}
      ${q.multi ? `<p class="hint mono">${esc(t("quiz.multi"))}</p>` : ""}
      <ol class="opts">${opts}</ol>
      ${checked ? `
      <div class="explain ${isOk ? "ok" : "ko"}">
        <div class="verdict-row"><p class="mono verdict">${esc(isOk ? t("quiz.granted") : t("quiz.denied", { a: q.correct.join(", ") }))}</p><div class="speak-row">${speakBtn(q, txt.lang, "answer")}</div></div>
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
  bindFlags();
  on("btn-finish", () => {
    const left = z.questions.length - answered;
    if (!z.feedback && left > 0 && !confirm(t("quiz.unanswered", { n: left }))) return;
    finishQuiz();
  });
  on("btn-finish-early", () => { if (confirm(t("quiz.finishEarly", { n: z.questions.length - answered }))) finishQuiz(); });
  on("btn-save", () => saveQuiz());
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
  autoSave();
  renderQuiz();
}
function check() {
  const z = state.quiz; if (!z.picks[z.i].length) return;
  z.checked[z.i] = true; autoSave(); renderQuiz();
}
function move(d) {
  const z = state.quiz;
  z.i = Math.min(z.questions.length - 1, Math.max(0, z.i + d));
  z.peek = false;
  autoSave();
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
  clearTimeout(saveTimer); savePending = null;
  await dropSaved(z.saveId);  // quiz terminé : la sauvegarde de reprise n'a plus lieu d'être
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
      <div class="review-tools">${speakBtn(d.q, txt.lang, "all")} ${speakBtn(d.q, txt.lang, "answer")} ${flagBtn(d.q)}</div>
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
  bindFlags();
  document.getElementById("btn-home").onclick = () => go("");
  document.getElementById("btn-retry").onclick = () => startQuiz({ ...r.opts, questions: r.mode === "chapter" ? r.opts.questions : shuffle(r.opts.questions) });
  const rw = document.getElementById("btn-retry-wrong");
  if (rw) rw.onclick = () => startQuiz({ mode: "mistakes", chapter_id: r.chapter_id, lab: { k: "errorsOf", of: r.opts.lab }, questions: shuffle(wrong.map(d => d.q)), feedback: true });
}

// ------------------------------------------------------------------ history
function renderHistory() {
  state.view = "history";
  const rows = state.attempts.map(a => {
    const s = pct(a.correct, a.total);
    return `<tr><td class="mono">${fmtDate(a.created_at)}</td><td>${esc(t("type." + a.mode))}${a.chapter_id ? ` · ${chLabel(a.chapter_id)}` : ""}</td>
      <td class="mono">${a.correct}/${a.total}</td><td class="mono ${s >= PASS ? "accent" : "danger"}">${s}%</td><td class="mono">${fmtTime(a.duration_s || 0)}</td></tr>`;
  }).join("");
  const chRows = state.chapters.filter(c => certOf(secOf(c.id)) === secCert()).map(c => {
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
    try { await state.store.resetProgress(state.attempts.map(a => a.id)); await refreshProgress(); toast(t("hist.resetDone"), "ok"); renderHistory(); }
    catch (e) { toast(e.message, "err"); }
  };
}

// ------------------------------------------------------------------ keyboard
function onKey(e) {
  if (!state.quiz || location.hash !== "#/quiz") return;
  if (e.target.matches("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toUpperCase();
  if (/^[A-K]$/.test(k)) { e.preventDefault(); toggle(k); return; }
  if (k === "M") { e.preventDefault(); toggleFlag(state.quiz.questions[state.quiz.i].id); return; }
  if (e.key === "Enter") {
    e.preventDefault();
    const btn = document.getElementById("btn-check") || document.getElementById("btn-next") || document.getElementById("btn-finish");
    if (btn && !btn.disabled) btn.click();
  }
  if (e.key === "ArrowRight") { const b = document.getElementById("btn-next"); if (b) b.click(); }
  if (e.key === "ArrowLeft") { const b = document.getElementById("btn-prev"); if (b && !b.disabled) b.click(); }
}

boot();
