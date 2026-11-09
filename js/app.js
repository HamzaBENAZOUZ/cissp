import { SupabaseStore, LocalStore, latestByQuestion } from "./store.js";
import { t, getLang, setLang, locale } from "./i18n.js";
import { offlineEnabled, registerSW, unregisterSW, autonomous, setAutonomous } from "./offline.js";
import { REVISION } from "./revision.js";
import { LMSUM } from "./lastmile-summary.js";

/** Vrai dans l'application Android (pont vocal AndroidTTS fourni par l'APK). */
const IN_APP = !!window.AndroidTTS;

const CFG = window.CISSP_CONFIG || {};
const PASS = CFG.PASS_MARK || 70;
const DOMAIN_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
/* Banques de questions (onglets) : CISSP (Study Guide 1-21, Practice Tests 101-112, Last Mile 401-408).
   Le CCSP (chapitres 201-210 et 301-308, même base Supabase) a son propre site : https://hamzabenazouz.github.io/ccsp/ */
const SECTIONS = ["guide", "practice", "lastmile", "lmsum", "revision", "book", "improve"];
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
let speakingId = null, speakSeq = 0, speakEnd = null;
/* Lecteur : lecture en cours (pour pause / reprise / vitesse depuis la barre du haut). */
let player = null;   // { key, units, lang, btn, idx, paused }
const RATES = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
let ttsRate = (() => { try { const v = parseFloat(localStorage.getItem("cissp-tts-rate")); return RATES.includes(v) ? v : 1; } catch { return 1; } })();
let lastCancel = 0;
function haltEngine() {
  speakSeq++;   // invalide les événements de la lecture en cours
  if (nativeTTS) nativeTTS.stop(); else if (canSpeak) { speechSynthesis.cancel(); lastCancel = Date.now(); }
}
function stopSpeak() {
  haltEngine();
  speakingId = null; player = null; hlClear(); keepAwake(false);
  const f = speakEnd; speakEnd = null; if (f) f();
  document.querySelectorAll(".btn-speak.on").forEach(b => b.classList.remove("on"));
  renderPlayer();
}
function pauseSpeak() {
  if (!player || player.paused) return;
  haltEngine(); player.paused = true; keepAwake(false); renderPlayer();
}
function resumeSpeak() {
  if (!player || !player.paused) return;
  player.paused = false; playFrom(player.idx);
}
function setRate(dir) {
  const i = RATES.indexOf(ttsRate);
  ttsRate = RATES[Math.max(0, Math.min(RATES.length - 1, i + dir))];
  try { localStorage.setItem("cissp-tts-rate", String(ttsRate)); } catch { /* ignore */ }
  if (player && !player.paused) { haltEngine(); playFrom(player.idx); } else renderPlayer();
}
/* Choix de la voix, par langue (appli Android : voix du téléphone ; navigateur : voix du navigateur). */
const VOICE_KEY = l => `cissp-voice-${l}`;
const voicePref = l => { try { return localStorage.getItem(VOICE_KEY(l)) || ""; } catch { return ""; } };
/** Voix disponibles pour une langue : [{ name, label }]. */
/** Appli : aucune voix installée pour cette langue (fréquent sur Android TV, qui n'a souvent que la voix française) :
 *  Android lirait alors l'anglais avec la voix française. On le signale une fois, avec le moyen d'installer la voix. */
const noVoiceWarned = new Set();
function warnNoVoice(lang) {
  if (noVoiceWarned.has(lang) || typeof nativeTTS.voices !== "function") return;
  if (voiceList(lang).length) { noVoiceWarned.add(lang); return; }   // voix présente : plus besoin de vérifier
  if (!voiceList(lang === "fr" ? "en" : "fr").length) return;   // moteur pas prêt   // voix présente, ou moteur pas prêt
  noVoiceWarned.add(lang);
  const fr = getLang() === "fr";
  toast(lang === "en"
    ? (fr ? "Aucune voix anglaise n'est installée sur cet appareil : l'anglais est lu avec une voix française. Choisis « Installer d'autres voix… » dans le menu des voix, puis télécharge Anglais (États-Unis)."
          : "No English voice is installed on this device: English is read with a French voice. Pick \"Install more voices…\" in the voice menu, then download English (United States).")
    : (fr ? "Aucune voix française n'est installée sur cet appareil. Choisis « Installer d'autres voix… » dans le menu des voix."
          : "No French voice is installed on this device. Pick \"Install more voices…\" in the voice menu."), "warn", 10000);
}
const nativeVoiceCache = {};
document.addEventListener("visibilitychange", () => { if (!document.hidden) for (const k in nativeVoiceCache) delete nativeVoiceCache[k]; });   // retour des réglages de voix
function voiceList(lang) {
  if (nativeTTS) {
    if (typeof nativeTTS.voices !== "function") return [];
    // la liste des voix d'Android est lente à obtenir : gardée 60 s (sinon chaque phrase lue retardait la lecture)
    const c = nativeVoiceCache[lang];
    let vs = [];
    if (c && Date.now() - c.at < 60000) vs = c.vs;
    else { try { vs = JSON.parse(nativeTTS.voices(lang)); } catch { return []; } if (vs.length) nativeVoiceCache[lang] = { vs, at: Date.now() }; }
    // déjà triées par l'appli (les plus naturelles d'abord) ; ★ = qualité « élevée » d'Android, 🌐 = demande Internet
    const country = { "fr-FR": "France", "en-US": "US", "en-GB": "UK" };
    return vs.slice(0, 12).map((v, i) => {
      const code = ((/-x-([a-z0-9]+)-/i.exec(v.name) || [])[1] || v.name).toUpperCase();
      return { name: v.name, label: `${country[v.locale] || v.locale} ${code}${v.q >= 400 ? " ★" : ""}${v.net ? " 🌐" : ""}` };
    });
  }
  if (!canSpeak) return [];
  // français de France, anglais US et UK ; voix neuronales (« Natural », « Online », « Neural ») d'abord
  const ok = lang === "fr" ? /^fr[-_]FR$/i : /^en[-_](US|GB)$/i, natural = v => /Natural|Online|Neural|Premium|Enhanced/i.test(v.name);
  return speechSynthesis.getVoices().filter(v => ok.test(v.lang))
    .sort((a, b) => natural(b) - natural(a))
    .map(v => ({ name: v.name, label: `${v.name.replace(/^Microsoft |^Google /, "").replace(/ - .*$/, "")}${natural(v) ? " ★" : ""} (${v.lang.slice(3)})` }));
}
function setVoicePref(lang, name) {
  try { if (name) localStorage.setItem(VOICE_KEY(lang), name); else localStorage.removeItem(VOICE_KEY(lang)); } catch { /* ignore */ }
  if (nativeTTS && typeof nativeTTS.setVoiceName === "function") nativeTTS.setVoiceName(lang, name || "");
}
// l'appli reçoit les voix choisies au démarrage
if (nativeTTS && typeof nativeTTS.setVoiceName === "function") for (const l of ["fr", "en"]) { const v = voicePref(l); if (v) nativeTTS.setVoiceName(l, v); }
const canInstallVoices = !!nativeTTS && typeof nativeTTS.openVoiceSettings === "function";
// retour dans l'appli (après l'installation de voix) : la liste des voix est relue
document.addEventListener("visibilitychange", () => { if (!document.hidden && player) renderPlayer(); });
/** Va à la phrase n° i (boutons précédent / suivant). */
function gotoUnit(i) {
  if (!player) return;
  i = Math.max(0, Math.min(player.units.length - 1, i));
  player.idx = i;
  if (player.paused) { hlShow(player.units[i]); renderPlayer(); return; }
  haltEngine(); playFrom(i);
}
/* Barre de lecture fixée en haut de l'écran (visible pendant une lecture, utile en mode paysage). */
/** Télé : fine barre de progression de la lecture en bas de l'écran. */
function renderTvProgress() {
  if (!IS_TV) return;
  let el = document.getElementById("tv-progress");
  if (!player) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement("div"); el.id = "tv-progress"; el.className = "tv-progress";
    el.innerHTML = `<span class="tv-progress-fill"></span><span class="tv-progress-txt mono"></span>`;
    document.body.appendChild(el);
  }
  const n = player.units.length, i = Math.min(player.idx + 1, n), p = n ? Math.round(i * 100 / n) : 0;
  el.hidden = false;
  el.querySelector(".tv-progress-fill").style.width = p + "%";
  el.querySelector(".tv-progress-txt").textContent = `${i}/${n} · ${p} %`;
}
function renderPlayer() {
  renderTvProgress();
  let bar = document.getElementById("tts-bar");
  if (!player) {   // mode Speed : le lecteur reste affiché entre deux lectures (chrono, question suivante)
    if (bar) { if (state.view === "quiz" && speedActive(state.quiz)) bar.classList.add("idle"); else bar.hidden = true; }
    return;
  }
  if (bar) bar.classList.remove("idle");
  if (!bar) {
    bar = document.createElement("div"); bar.id = "tts-bar"; bar.className = "tts-bar"; bar.setAttribute("role", "toolbar");
    bar.innerHTML = `<div class="tts-ctl"></div><select class="tts-voice"></select>`;
    document.body.appendChild(bar);
    bar.addEventListener("click", e => {
      const b = e.target.closest("button[data-tts-act]"); if (!b || !player) return;
      const act = b.dataset.ttsAct;
      if (act === "toggle") (player.paused ? resumeSpeak : pauseSpeak)();
      else if (act === "slower") setRate(-1);
      else if (act === "faster") setRate(1);
      else if (act === "prev") gotoUnit(player.idx - 1);
      else if (act === "next") gotoUnit(player.idx + 1);
      else if (act === "stop") stopSpeak();
    });
    bar.querySelector(".tts-voice").addEventListener("change", e => {
      if (!player) return;
      if (e.target.value === "__install") {   // appli : écran Android de téléchargement des voix
        e.target.value = voicePref(player.lang); e.target.dataset.sig = "";
        pauseSpeak(); nativeTTS.openVoiceSettings(); return;
      }
      setVoicePref(player.lang, e.target.value);
      if (!player.paused) { haltEngine(); playFrom(player.idx); }   // reprend la phrase avec la nouvelle voix
    });
  }
  const fr = getLang() === "fr", paused = player.paused, P = player;
  const btn = (act, label, body, cls = "") => `<button class="tts-btn${cls}" data-tts-act="${act}" title="${label}" aria-label="${label}">${body}</button>`;
  const svg = (d, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
  bar.setAttribute("aria-label", fr ? "Lecture à voix haute" : "Read aloud");
  bar.querySelector(".tts-ctl").innerHTML =
    btn("slower", fr ? "Ralentir" : "Slower", "−") +
    `<span class="tts-rate">${String(ttsRate).replace(".", fr ? "," : ".")}×</span>` +
    btn("faster", fr ? "Accélérer" : "Faster", "+") +
    btn("prev", fr ? "Phrase précédente" : "Previous sentence", svg("M6 5h2v14H6zM20 5v14L9 12z")) +
    btn("toggle", paused ? (fr ? "Reprendre" : "Play") : "Pause",
      paused ? svg("M8 5v14l11-7z", 18) : svg("M7 5h4v14H7zM13 5h4v14h-4z", 18), " tts-main") +
    btn("next", fr ? "Phrase suivante" : "Next sentence", svg("M16 5h2v14h-2zM4 5v14l11-7z")) +
    `<span class="tts-pos">${Math.min(P.idx + 1, P.units.length)}/${P.units.length}</span>` +
    btn("stop", fr ? "Arrêter" : "Stop", svg("M6 6h12v12H6z"));
  const sel = bar.querySelector(".tts-voice");
  const vs = voiceList(P.lang), cur = voicePref(P.lang);
  const sig = P.lang + "|" + fr + "|" + vs.map(v => v.name).join(",");
  if (sel.dataset.sig !== sig) {   // la liste n'est refaite que si elle change (sinon le menu ouvert se fermerait)
    sel.dataset.sig = sig;
    sel.innerHTML = `<option value="">${fr ? "🗣 Voix : automatique" : "🗣 Voice: automatic"}</option>` +
      vs.map(v => `<option value="${esc(v.name)}">🗣 ${esc(v.label)}</option>`).join("") +
      (canInstallVoices ? `<option value="__install">${fr ? "➕ Installer d'autres voix…" : "➕ Install more voices…"}</option>` : "");
    sel.title = sel.ariaLabel = fr ? "Choisir la voix" : "Choose the voice";
  }
  sel.value = vs.some(v => v.name === cur) ? cur : "";
  sel.hidden = vs.length < 2 && !canInstallVoices;
  bar.hidden = false;
}
/**
 * Texte lu à voix haute (voir quizParts) :
 *  - mode "answer"   : la bonne réponse puis l'explication ;
 *  - mode "question" : la question et ses propositions (avant validation : rien n'est dévoilé) ;
 *  - mode "all"      : la question, ses propositions, la bonne réponse et l'explication.
 */
/** Assemble des morceaux de texte avec un point entre eux, sauf s'ils finissent déjà par une ponctuation. */
const joinSpeech = parts => parts.filter(Boolean).map(x => String(x).trim()).filter(Boolean)
  .map(x => /[.?!:;…]$/.test(x) ? x : x + ".").join(" ");
/* Voix française : de préférence « Microsoft Denise Online (Natural) - French (France) » sur Edge,
   sinon une autre voix neuronale fr-FR, puis toute voix fr-FR, puis toute voix française. */
function pickVoiceFr() {
  const vs = speechSynthesis.getVoices();
  const chosen = voicePref("fr") && vs.find(v => v.name === voicePref("fr")); if (chosen) return chosen;
  const fr = vs.filter(v => /^fr[-_]FR$/i.test(v.lang));
  return fr.find(v => /\bDenise\b/i.test(v.name) && /Natural/i.test(v.name))
    || fr.find(v => /Natural|Online/i.test(v.name))
    || fr[0] || vs.find(v => /^fr/i.test(v.lang)) || null;
}
/* Voix préférée : « Microsoft Aria Online (Natural) - English (United States) » (voix neuronale native d'Edge),
   sinon n'importe quelle voix Aria en-US, puis une voix « Natural » en-US, puis toute voix en-US, puis anglais. */
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  const chosen = voicePref("en") && vs.find(v => v.name === voicePref("en")); if (chosen) return chosen;
  const us = vs.filter(v => /^en[-_]US$/i.test(v.lang));
  return us.find(v => /\bAria\b/i.test(v.name) && /Natural/i.test(v.name))
    || us.find(v => /\bAria\b/i.test(v.name))
    || us.find(v => /Natural|Online/i.test(v.name))
    || us[0] || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (canSpeak && !nativeTTS) speechSynthesis.getVoices();
try { if ("caches" in window) caches.delete("piper-v1").catch(() => {}); } catch { /* ignore */ }   // anciennes voix Piper (abandonnées) // précharge la liste des voix (chargée en asynchrone par Edge/Chrome)
// Lecture en français : navigateur, ou application Android 2.3+ (pont speakLang).
const canSpeakFr = canSpeak && (!nativeTTS || typeof nativeTTS.speakLang === "function");
/* ---- Surlignage de la phrase en cours de lecture ----
   Le texte lu est pris dans la page elle-même (éléments marqués), découpé en phrases ; chaque phrase est envoyée
   au moteur vocal séparément et surlignée quand sa lecture commence. Surlignage : API CSS Custom Highlight
   (sans toucher au HTML) ; à défaut, tout le paragraphe est surligné. */
/* Écran allumé pendant la lecture (navigateur : API Screen Wake Lock ; l'appli Android s'en charge elle-même). */
let wakeLock = null;
function keepAwake(on) {
  if (nativeTTS || !("wakeLock" in navigator)) return;
  if (on) {
    if (!wakeLock) navigator.wakeLock.request("screen").then(l => { if (speakingId && !wakeLock) wakeLock = l; else l.release().catch(() => {}); }).catch(() => {});
  } else if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
const HL_API = typeof CSS !== "undefined" && !!CSS.highlights && typeof Highlight === "function";
let hlEl = null;
function hlClear() {
  if (HL_API) CSS.highlights.delete("tts");
  if (hlEl) { hlEl.classList.remove("tts-on"); hlEl = null; }
}
function hlShow(u) {
  hlClear();
  if (!u || !u.el || !u.el.isConnected) return;
  let rect;
  if (HL_API && u.range) { CSS.highlights.set("tts", new Highlight(u.range)); rect = u.range.getBoundingClientRect(); }
  else { hlEl = u.el; hlEl.classList.add("tts-on"); rect = hlEl.getBoundingClientRect(); }
  // garde la phrase lue visible à l'écran
  const vh = window.innerHeight || 600;
  if (rect && rect.height && (rect.top < 70 || rect.bottom > vh - 24)) window.scrollBy({ top: rect.top - vh / 3, behavior: "smooth" });
}
/** Découpe un texte en phrases : liste de [début, fin] (espaces exclus). */
function sentenceSpans(text, lang) {
  const out = [];
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    for (const x of new Intl.Segmenter(lang, { granularity: "sentence" }).segment(text)) out.push([x.index, x.index + x.segment.length]);
  } else {
    const re = /[^.!?…]+(?:[.!?…]+["'»”)\]]*|$)\s*/g; let m;
    while ((m = re.exec(text)) && m[0]) out.push([m.index, m.index + m[0].length]);
  }
  return out.map(([a, b]) => { while (a < b && /\s/.test(text[a])) a++; while (b > a && /\s/.test(text[b - 1])) b--; return [a, b]; })
    .filter(([a, b]) => /[\p{L}\p{N}]/u.test(text.slice(a, b)));
}
/** Plage DOM couvrant les caractères [a, b[ du texte d'un élément. */
function textRange(el, a, b) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange();
  let pos = 0, n, started = false;
  while ((n = w.nextNode())) {
    const len = n.data.length;
    if (!started && a < pos + len) { r.setStart(n, a - pos); started = true; }
    if (started && b <= pos + len) { r.setEnd(n, b - pos); return r; }
    pos += len;
  }
  return null;
}
/**
 * Morceaux à lire -> phrases : une chaîne est lue sans surlignage (« Question », « Bonne réponse »…) ;
 * { el, prefix } lit le texte de l'élément phrase par phrase en le surlignant (prefix : « A : » devant une proposition).
 */
function speechUnits(parts, lang) {
  const units = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.pause) { units.push({ pause: p.pause, text: "" }); continue; }   // silence (mode Speed : 1 s entre les propositions)
    if (typeof p === "string") { const x = joinSpeech([p]); if (x) units.push({ text: x }); continue; }
    if (!p.el) continue;
    const text = p.el.textContent, spans = sentenceSpans(text, lang);
    spans.forEach(([a, b], i) => {
      let x = text.slice(a, b);
      if (i === spans.length - 1 && !/[.?!:;…]["'»”)\]]*$/.test(x)) x += ".";
      if (i === 0 && p.prefix) x = p.prefix + " " + x;
      units.push({ text: x, el: p.el, range: HL_API ? textRange(p.el, a, b) : null });
    });
  }
  return units;
}
/** Lit des phrases (anglais ou français) en surlignant celle en cours ; un second clic sur le même bouton arrête. */
function speakUnits(key, units, lang, btn, onEnd) {
  if (!canSpeak) return;
  if (speakingId === key) { stopSpeak(); return; }
  stopSpeak();
  units = units.filter(u => u.text || u.pause);
  while (units.length && units[units.length - 1].pause) units.pop();
  if (!units.some(u => u.text)) units = [];
  if (!units.length) { if (onEnd) onEnd(); return; }
  speakingId = key; speakEnd = onEnd || null; btn.classList.add("on");
  player = { key, units, lang, btn, idx: 0, paused: false };
  playFrom(0);
}
/** Lit les phrases du lecteur à partir de la n° « from », à la vitesse choisie. */
function playFrom(from) {
  const P = player; if (!P) return;
  const units = P.units.slice(from), lang = P.lang;
  const seq = ++speakSeq, alive = () => seq === speakSeq && player === P;
  keepAwake(true);
  let mark = i => { if (alive()) { P.idx = from + i; hlShow(units[i]); renderPlayer(); } };
  const done = () => {
    if (!alive()) return;
    speakSeq++; speakingId = null; player = null; P.btn.classList.remove("on"); hlClear(); keepAwake(false);
    const f = speakEnd; speakEnd = null; if (f) f();
    renderPlayer();
  };
  renderPlayer();
  const L = lang === "fr" ? "fr-FR" : "en-US";
  if (nativeTTS) warnNoVoice(lang);
  if (nativeTTS) {
    if (typeof nativeTTS.setRate === "function") nativeTTS.setRate(ttsRate);
    if (typeof nativeTTS.speakParts === "function") {   // appli récente : toutes les phrases d'un coup, repère à chaque phrase
      // L'appli renvoie l'identifiant de cette lecture : une marque ou une fin d'une lecture précédente, arrivée en
      // retard, est ignorée (sinon elle coupait cette lecture : dernière proposition sautée, enchaînement trop rapide).
      let sid = null, heard = false;
      window.__ttsMark = (i, x) => { if (sid && typeof x === "string" && x !== sid) return; heard = true; mark(i); };
      window.__ttsDone = x => { if (sid && typeof x === "string" && x !== sid) return; heard = true; done(); };
      // silences : envoyés à l'appli si elle sait les jouer, sinon ignorés (les repères restent alignés sur les phrases)
      const canPause = typeof nativeTTS.canPause === "function";
      const sent = [], at = [];
      units.forEach((u, k) => { if (u.pause && !canPause) return; sent.push(u.pause ? `##PAUSE:${u.pause}##` : u.text); at.push(k); });
      const markRaw = mark; mark = i => markRaw(at[i] ?? i);
      const go = () => { sid = nativeTTS.speakParts(JSON.stringify(sent), L) || null; };
      go();
      // Le moteur vocal d'Android ne démarre parfois pas (souvent la toute première lecture, moteur endormi) :
      // si rien n'a commencé au bout de 2,5 s, on relance une fois.
      setTimeout(() => { if (!heard && alive() && !P.paused && !P.retried) { P.retried = true; go(); } }, 2500);
    } else {   // appli plus ancienne : une phrase après l'autre
      let i = 0;
      const next = () => {
        if (!alive()) return;
        if (i >= units.length) { done(); return; }
        if (units[i].pause) { mark(i); setTimeout(next, units[i++].pause); return; }
        mark(i); const x = units[i++].text;
        window.__ttsDone = next;
        if (lang === "fr" && nativeTTS.speakLang) nativeTTS.speakLang(x, L); else nativeTTS.speak(x);
      };
      next();
    }
    return;
  }
  // Navigateur : une phrase après l'autre (les silences sont de vraies pauses), avec la même voix tout du long.
  const v = lang === "fr" ? pickVoiceFr() : pickVoice();
  let i = 0;
  const next = () => {
    if (!alive()) return;
    if (i >= units.length) { done(); return; }
    const k = i++, x = units[k];
    if (x.pause) { mark(k); setTimeout(next, x.pause); return; }
    let started = false, tries = 0;
    const say = () => {
      const u = new SpeechSynthesisUtterance(x.text);
      u.lang = L; u.rate = ttsRate;
      if (v) u.voice = v;
      const t0 = Date.now();
      u.onstart = () => { started = true; mark(k); };
      u.onend = () => {
        if (!alive()) return;
        // Chrome « avale » parfois une phrase juste après un arrêt (fin immédiate sans début) : on la redit une fois
        if (!started && Date.now() - t0 < 250 && tries++ < 1) { setTimeout(say, 150); return; }
        next();
      };
      u.onerror = e => { if (!alive() || e.error === "interrupted" || e.error === "canceled") return; next(); };
      speechSynthesis.speak(u);
    };
    say();
  };
  // juste après un arrêt, Chrome ignore parfois la lecture suivante : on lui laisse un instant
  const wait = Date.now() - lastCancel < 200 ? 150 : 0;
  renderPlayer();
  if (wait) setTimeout(next, wait); else next();
}
/** Lecture d'une question (page du quiz ou correction) : le texte lu est celui affiché dans la boîte de la question. */
function quizParts(q, box, lang, mode) {
  const fr = lang === "fr", el = k => box.querySelector(`[data-tts="${k}"]`);
  const opts = [...box.querySelectorAll('[data-tts="opt"]')];
  const opt = i => ({ el: opts[i], prefix: String.fromCharCode(65 + i) + (fr ? " :" : ":") });
  const question = ["Question", { el: el("scenario") }, { el: el("q") }, ...opts.map((_, i) => opt(i))];
  // Correction affichée : réponse fausse (ou pas de réponse) -> « Mauvaise réponse, la bonne réponse est… »
  const ex = box.querySelector(".explain"), wrong = !!(ex && ex.classList.contains("ko")), none = wrong && !box.querySelector(".opt.selected");
  const many = q.correct.length > 1;
  const head = wrong
    ? (fr ? `${none ? "Pas de réponse" : "Mauvaise réponse"}. ${many ? "Les bonnes réponses sont" : "La bonne réponse est"} :`
      : `${none ? "No answer" : "Wrong answer"}. The correct answer${many ? "s are" : " is"}:`)
    : (fr ? (many ? "Bonnes réponses" : "Bonne réponse") : `Correct answer${many ? "s" : ""}`);
  const answer = [head, ...q.correct.map(L => opt(L.charCodeAt(0) - 65)), { el: el("exp") }];
  return mode === "question" ? question : mode === "answer" ? answer : [...question, ...answer];
}
function speakAnswer(q, btn, lang = "en", mode = "all") {
  const box = btn.closest(".question-panel, .review") || app;
  speakUnits(q.id + ":" + lang + ":" + mode, speechUnits(quizParts(q, box, lang, mode), lang), lang, btn);
}
/**
 * Bouton de lecture, dans la langue affichée (français : « Lire… », anglais : « Listen… »).
 *  kind "all"    : « Lire la question » à côté de la question : question + propositions seulement ;
 *  kind "answer" : « Lire la correction » à côté de l'explication : bonne réponse + explication.
 */
const SPEAK_LABEL = {
  fr: { all: ["Lire la question", "Lire la question et les propositions, sans dévoiler la réponse"],
        answer: ["Lire la correction", "Lire la bonne réponse et l'explication"] },
  en: { all: ["Listen to question", "Read the question and the options aloud, without revealing the answer"],
        answer: ["Listen to explanation", "Read the correct answer and the explanation"] },
};
const speakBtn = (q, shown = "en", kind = "answer", revealed = true) => {
  if (!canSpeak) return "";
  const lang = shown === "fr" && hasFr(q) && canSpeakFr ? "fr" : "en";
  const mode = kind === "all" ? "question" : "answer";   // « Lire la question » ne dévoile jamais la réponse
  const [label, title] = SPEAK_LABEL[lang][kind];
  return `<button class="btn btn-ghost btn-xs btn-speak" data-speak="${q.id}" data-speaklang="${lang}" data-speakmode="${mode}" lang="${lang}"
    title="${esc(title)} (${lang === "fr" ? "cliquer à nouveau pour arrêter" : "click again to stop"})">🔊 ${esc(label)}</button>`;
};
/* Lecture automatique de la correction après chaque réponse (activée par défaut, interrupteur « Auto »). */
const AUTOREAD_KEY = "cissp-autoread";
const autoRead = () => { try { return canSpeak && localStorage.getItem(AUTOREAD_KEY) !== "off"; } catch { return canSpeak; } };
/** Bouton 🔊 / 🔇 dans l'en-tête : coupe la lecture automatique (et la lecture en cours). */
function renderMute() {
  if (!canSpeak) return;
  let b = document.getElementById("btn-mute");
  if (!b) {
    b = document.createElement("button"); b.id = "btn-mute"; b.type = "button"; b.className = "icon-btn mute-btn";
    const right = document.querySelector(".topbar-right"), ex = document.getElementById("btn-exam");
    right.insertBefore(b, ex ? ex.nextSibling : right.firstChild);
    b.addEventListener("click", () => {
      const on = !autoRead();
      try { localStorage.setItem(AUTOREAD_KEY, on ? "on" : "off"); } catch { /* ignore */ }
      if (!on) stopSpeak();
      renderMute();
      toast(getLang() === "fr" ? (on ? "🔊 Lecture automatique de la correction activée" : "🔇 Lecture automatique coupée")
        : (on ? "🔊 Automatic reading of the explanation on" : "🔇 Automatic reading off"), "info");
    });
  }
  const on = autoRead(), fr = getLang() === "fr";
  b.textContent = on ? "🔊" : "🔇";
  b.classList.toggle("muted", !on);
  b.setAttribute("aria-pressed", String(!on));
  b.title = fr ? (on ? "Son activé : la correction est lue après chaque réponse (cliquer pour couper)" : "Son coupé : pas de lecture automatique (cliquer pour activer)")
    : (on ? "Sound on: the explanation is read after each answer (click to mute)" : "Muted: no automatic reading (click to unmute)");
  b.setAttribute("aria-label", b.title);
}
/* Mode Speed (icône ⚡ en haut) : dans un quiz avec correction, la question est lue toute seule, puis 30 s pour répondre.
   Sans réponse : la bonne réponse s'affiche et est lue, la question compte comme fausse. Après la correction, question
   suivante 3 s plus tard. Une question à une seule réponse est validée dès qu'on la touche. */
const SPEED_KEY = "cissp-speed", SPEED_S = 30, SPEED_NEXT_S = 3;
const speedOn = () => { try { return localStorage.getItem(SPEED_KEY) === "on"; } catch { return false; } };
function renderSpeedBtn() {
  if (IS_TV) return;
  let b = document.getElementById("btn-speed");
  if (!b) {
    b = document.createElement("button"); b.id = "btn-speed"; b.type = "button"; b.className = "icon-btn speed-btn";
    const right = document.querySelector(".topbar-right"), m = document.getElementById("btn-mute");
    right.insertBefore(b, m ? m.nextSibling : right.firstChild);
    b.addEventListener("click", () => {
      const on = !speedOn();
      try { localStorage.setItem(SPEED_KEY, on ? "on" : "off"); } catch { /* ignore */ }
      renderSpeedBtn();
      const fr = getLang() === "fr";
      toast(on ? (fr ? `⚡ Mode Speed activé : lecture automatique, ${SPEED_S} s par question` : `⚡ Speed mode on: automatic reading, ${SPEED_S} s per question`)
        : (fr ? "Mode Speed désactivé" : "Speed mode off"), "info");
      if (state.view === "quiz" && state.quiz) { speedReset(); renderQuiz(); }
    });
  }
  const on = speedOn(), fr = getLang() === "fr";
  b.textContent = "⚡";
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", String(on));
  b.title = fr ? (on ? `Mode Speed activé : question lue, ${SPEED_S} s pour répondre, passage automatique (cliquer pour désactiver)` : "Mode Speed désactivé (cliquer pour activer)")
    : (on ? `Speed mode on: question read aloud, ${SPEED_S} s to answer, automatic next (click to turn off)` : "Speed mode off (click to turn on)");
  b.setAttribute("aria-label", b.title);
}
let speedClock = null, speedNextT = null;
function speedReset() {
  tvClock("");
  clearInterval(speedClock); speedClock = null; clearTimeout(speedNextT); speedNextT = null;
  if (state.quiz) state.quiz.sp = null;
}
const speedActive = z => !!(z && z.feedback && speedOn() && !IS_TV);
/** Affichage du chrono Speed (lecture / secondes restantes / question suivante dans…). */
function speedShow() {
  const z = state.quiz, el = document.getElementById("speed-clock"); if (!el || !z || !z.sp) return;
  const sp = z.sp, fr = getLang() === "fr";
  el.classList.toggle("danger", sp.phase === "count" && sp.left <= 10);
  el.textContent = sp.phase === "reading" ? "⚡ 🔊" : sp.phase === "count" ? `⏱ ${sp.left}` : sp.phase === "next" ? `⏭ ${sp.left}` : "⚡";
  tvClock(el.textContent, el.classList.contains("danger"));
  el.title = sp.phase === "count" ? (fr ? "Temps restant pour répondre" : "Time left to answer") : sp.phase === "next" ? (fr ? "Question suivante dans…" : "Next question in…") : (fr ? "Lecture de la question" : "Reading the question");
}
/** Télé connectée : le chrono Speed s'affiche aussi sur la télé (message « clock », texte vide = masqué). */
let tvClockLast = "";
function tvClock(txt, danger) {
  if (!tv || !tv.ok) return;
  const k = txt + "|" + !!danger; if (k === tvClockLast) return; tvClockLast = k;
  tv.link.send({ t: "clock", txt, danger: !!danger });
}
/** Télé : affiche le chrono reçu du téléphone, en bas à gauche. */
function tvShowClock(txt, danger) {
  let el = document.getElementById("speed-clock");
  if (!txt) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("span"); el.id = "speed-clock"; el.className = "speed-clock mono"; document.body.appendChild(el); }
  el.textContent = txt; el.classList.toggle("danger", !!danger);
}
/** Durée approximative d'une lecture faite sur la télé (le téléphone n'en voit pas la fin). */
const tvReadMs = box => Math.max(4000, (box ? box.textContent.split(/\s+/).length : 40) / 2.6 / ttsRate * 1000);
/** Appelé à la fin de renderQuiz : démarre ou reprend le déroulé Speed de la question affichée. */
function speedStep() {
  const z = state.quiz; if (!speedActive(z)) return;
  const i = z.i, q = z.questions[i], alive = () => state.quiz === z && z.i === i && state.view === "quiz";
  if (z.sp && z.sp.i !== i) speedReset();
  if (!z.sp) z.sp = { i, phase: z.checked[i] ? "done" : "reading", left: SPEED_S };
  const sp = z.sp;
  const box = app.querySelector(".question-panel");
  if (sp.phase === "reading" && !sp.started) {
    sp.started = true;
    const startCount = () => {
      if (!alive() || z.sp !== sp || sp.phase !== "reading" || z.checked[i]) return;
      sp.phase = "count"; sp.left = SPEED_S; speedShow();
      clearInterval(speedClock);
      speedClock = setInterval(() => {
        if (!alive() || z.sp !== sp || sp.phase !== "count") { clearInterval(speedClock); return; }
        sp.left--; speedShow();
        if (sp.left <= 0) { clearInterval(speedClock); speedTimeout(); }
      }, 1000);
    };
    // Question puis chaque proposition, 1 s de pause entre chaque, le tout lu deux fois ; le chrono démarre ensuite.
    sp.startCount = startCount;
    if (tv && tv.ok) {   // télé : c'est elle qui lit, et elle prévient quand elle a fini (repli : durée estimée)
      tvDoneCb = m => { if (m.mode === "speedq" && m.n === i + 1) startCount(); };
      tvSpeak("speedq"); setTimeout(startCount, 2 * tvReadMs(box) + 8000);
    } else if (canSpeak && box) {
      readTwice("speed:" + q.id + ":" + i, () => !alive() || z.sp !== sp || sp.phase !== "reading" || z.checked[i] ? "abort"
        : sp.touched || z.picks[i].length ? "done" : true, startCount);
    } else startCount();
  }
  speedShow();
}
/**
 * Lecture Speed de la question affichée : la question puis chaque proposition, 1 s de pause entre chaque, le tout deux fois.
 * cont() avant chaque morceau : true = continuer, "done" = arrêter et appeler onDone, "abort" = tout arrêter.
 */
function readTwice(key, cont, onDone) {
  const bx = app.querySelector(".question-panel"); if (!bx) { onDone(); return; }
  const lang = bx.lang || getLang(), fr = lang === "fr", el = x => bx.querySelector(`[data-tts="${x}"]`);
  const opts = [...bx.querySelectorAll('[data-tts="opt"]')], parts = [];
  // une seule lecture continue (même voix, lecteur stable) : silences d'1 s entre la question et chaque proposition
  for (const pass of [0, 1]) {
    parts.push(pass ? (fr ? "Je répète." : "Once again.") : "Question", { el: el("scenario") }, { el: el("q") });
    opts.forEach((o, j) => parts.push({ pause: 1000 }, { el: o, prefix: String.fromCharCode(65 + j) + (fr ? " :" : ":") }));
    if (!pass) parts.push({ pause: 1000 });
  }
  const btn = bx.querySelector('[data-speakmode="question"]') || document.getElementById("tv-speak-dummy") || document.createElement("button");
  speakUnits(key, speechUnits(parts, lang), lang, btn, () => { if (cont() !== "abort") onDone(); });
}
let tvDoneCb = null;   // téléphone : fin de lecture annoncée par la télé (mode Speed)
/** Temps écoulé : bonne réponse affichée et lue, question comptée fausse. */
function speedTimeout() {
  const z = state.quiz; if (!z || z.checked[z.i]) return;
  (z.timeouts ||= {})[z.i] = true;
  toast(getLang() === "fr" ? "⏱ Temps écoulé : question comptée fausse" : "⏱ Time's up: question counted as wrong", "warn", 2500);
  z.checked[z.i] = true; autoSave(); renderQuiz();
  speedAfterCheck();
}
/** Après la correction (réponse donnée ou temps écoulé) : lecture de la correction, puis question suivante 3 s après. */
function speedAfterCheck() {
  const z = state.quiz; if (!speedActive(z)) return false;
  const i = z.i, alive = () => state.quiz === z && z.i === i && state.view === "quiz";
  clearInterval(speedClock);
  const sp = z.sp = { i, phase: "answer", left: SPEED_NEXT_S, started: true };
  speedShow();
  const goNext = () => {
    if (!alive() || z.sp !== sp || sp.phase !== "answer") return;
    sp.phase = "next"; sp.left = SPEED_NEXT_S; speedShow();
    clearInterval(speedClock);
    speedClock = setInterval(() => {
      if (!alive() || z.sp !== sp) { clearInterval(speedClock); return; }
      sp.left--; speedShow();
      if (sp.left <= 0) {
        clearInterval(speedClock);
        if (z.i >= z.questions.length - 1) finishQuiz(); else move(1);
      }
    }, 1000);
  };
  const box = app.querySelector(".question-panel"), q = z.questions[i];
  if (tv && tv.ok) {
    tvDoneCb = m => { if (m.mode === "answer" && m.n === i + 1) goNext(); };
    tvSpeak("answer"); setTimeout(goNext, tvReadMs(box && box.querySelector(".explain")) + 8000);
  }
  else if (canSpeak && box) {
    const lang = box.lang || getLang();
    const btn = box.querySelector('.speak-row [data-speakmode="answer"]') || document.createElement("button");
    speakUnits("speed-a:" + q.id + ":" + i, speechUnits(quizParts(q, box, lang, "answer"), lang), lang, btn, goNext);
  } else goNext();
  return true;
}
function bindSpeak(list) {
  app.querySelectorAll("[data-speak]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const q = list.find(x => String(x.id) === b.dataset.speak);
    if (q && tv && tv.ok && state.view === "quiz") { tvSpeak(b.dataset.speakmode || "answer"); return; }
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
const hasSection = sec => sec === "improve" ? state.questions.length > 0 : (sec === "revision" || sec === "lmsum") ? state.chapters.some(c => c.id <= 100)
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
  renderHome(); tvSync();
}
/** Passe d'une certification à l'autre en gardant le même type de banque (Study Guide / Practice Tests). */
function setCert(cert) {
  const kind = state.section.endsWith("practice") ? "practice" : "guide";
  setSection(cert === "ccsp" ? "ccsp-" + kind : kind);
}

function toast(msg, kind = "info", ms = 3800) {
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, ms);
}
function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
function errorPanel(title, msg, hint) {
  app.innerHTML = `<section class="panel error-panel"><h2 class="mono">${esc(title)}</h2><p>${esc(msg)}</p>
    ${hint ? `<p class="muted">${esc(hint)}</p>` : ""}</section>`;
}

// Numéro de version affiché discrètement à côté du logo (même numéro que l'APK : à changer à chaque version).
const APP_VERSION = "8.8";
function renderVersion() {
  if (document.getElementById("app-ver")) return;
  const brand = document.querySelector(".brand"); if (!brand) return;
  const v = document.createElement("span"); v.id = "app-ver"; v.className = "app-ver"; v.textContent = "v" + APP_VERSION;
  if (nativeTTS && typeof nativeTTS.appVersion === "function") {   // appli : toucher le numéro = chercher une mise à jour
    v.title = getLang() === "fr" ? "Chercher une mise à jour" : "Check for updates";
    v.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); checkUpdate(true); });
  }
  brand.appendChild(v);
}
// ------------------------------------------------------------------ date d'examen (compte à rebours J-x)
const EXAM_KEY = "cissp-exam-date";
const examDate = () => { try { const v = localStorage.getItem(EXAM_KEY) || ""; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""; } catch { return ""; } };
/** Jours restants avant l'examen (0 = aujourd'hui, négatif = passé), ou null si pas de date. */
function examDaysLeft() {
  const d = examDate(); if (!d) return null;
  const [y, m, j] = d.split("-").map(Number), now = new Date();
  return Math.round((Date.UTC(y, m - 1, j) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function renderExam() {
  let b = document.getElementById("btn-exam");
  if (!b) {
    b = document.createElement("button"); b.id = "btn-exam"; b.type = "button"; b.className = "exam-pill";
    const right = document.querySelector(".topbar-right"); right.insertBefore(b, right.firstChild);
    b.addEventListener("click", e => { e.stopPropagation(); toggleExamPop(); });
  }
  const fr = getLang() === "fr", n = examDaysLeft(), d = examDate();
  const when = d ? new Date(d + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  b.classList.remove("soon", "today", "unset");
  if (n === null || n < 0) {
    b.classList.add("unset");
    b.innerHTML = `📅<span class="exam-txt">${fr ? " Date d'examen" : " Exam date"}</span>`;
    b.title = n === null ? (fr ? "Indiquer le jour de l'examen pour afficher le compte à rebours" : "Set your exam day to show the countdown")
      : (fr ? `Examen passé (${when}) : indiquer une nouvelle date` : `Exam passed (${when}): set a new date`);
  } else {
    if (n === 0) b.classList.add("today"); else if (n <= 7) b.classList.add("soon");
    b.innerHTML = n === 0 ? (fr ? "🍀 Jour J" : "🍀 Exam day") : `📅 J-${n}`;
    b.title = (fr ? `Examen le ${when}` : `Exam on ${when}`) + (n ? (fr ? ` : encore ${n} jour${n > 1 ? "s" : ""}` : `: ${n} day${n > 1 ? "s" : ""} left`) : "");
  }
  b.setAttribute("aria-label", b.title);
}
function toggleExamPop(force) {
  let pop = document.getElementById("exam-pop");
  const open = force ?? !(pop && !pop.hidden);
  if (!open) { if (pop) pop.hidden = true; return; }
  const fr = getLang() === "fr", today = new Date(), iso = x => x.toISOString().slice(0, 10);
  if (!pop) {
    pop = document.createElement("div"); pop.id = "exam-pop"; pop.className = "exam-pop panel"; document.body.appendChild(pop);
    pop.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", () => toggleExamPop(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape") toggleExamPop(false); });
  }
  const minD = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  pop.innerHTML = `<label class="exam-lbl" for="exam-input">${fr ? "📅 Jour de l'examen" : "📅 Exam day"}</label>
    <input type="date" id="exam-input" value="${examDate()}" min="${iso(minD)}">
    <div class="exam-actions">
      <button class="btn btn-primary btn-sm" id="exam-ok">${fr ? "Enregistrer" : "Save"}</button>
      ${examDate() ? `<button class="btn btn-ghost btn-sm" id="exam-clear">${fr ? "Effacer" : "Clear"}</button>` : ""}
    </div>`;
  pop.hidden = false;
  const inp = pop.querySelector("#exam-input");
  const save = v => { try { if (v) localStorage.setItem(EXAM_KEY, v); else localStorage.removeItem(EXAM_KEY); } catch { /* ignore */ } renderExam(); toggleExamPop(false); };
  pop.querySelector("#exam-ok").onclick = () => { if (inp.value) save(inp.value); else inp.focus(); };
  const clr = pop.querySelector("#exam-clear"); if (clr) clr.onclick = () => save("");
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && inp.value) save(inp.value); });
  setTimeout(() => inp.focus(), 50);
}
// le compte à rebours change à minuit : on le recalcule quand l'appli revient au premier plan
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderExam(); });

// ------------------------------------------------------------------ mise à jour de l'appli Android
// La dernière version est publiée sur le site (apk/version.json + apk/cissp-training.apk). L'appli compare
// avec sa propre version et propose d'installer la nouvelle d'un clic.
let updateInfo = null, updateChecked = 0;
async function checkUpdate(manual = false) {
  if (!nativeTTS || typeof nativeTTS.appVersion !== "function") return;
  if (!manual && Date.now() - updateChecked < 120000) return;   // au plus une vérification toutes les 2 min
  updateChecked = Date.now();
  if (manual) try { sessionStorage.removeItem("cissp-update-later"); } catch { /* ignore */ }
  try {
    const r = await fetch(new URL("apk/version.json", location.href).href + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const v = await r.json();
    if (+v.versionCode > nativeTTS.appVersion()) { updateInfo = v; renderUpdate(); }
    else if (manual) toast(getLang() === "fr" ? `Tu as déjà la dernière version (${APP_VERSION}).` : `You already have the latest version (${APP_VERSION}).`, "ok");
  } catch { if (manual) toast(getLang() === "fr" ? "Vérification impossible : pas de connexion ?" : "Could not check: no connection?", "warn"); }
}
function renderUpdate() {
  let bar = document.getElementById("update-bar");
  const v = updateInfo, skip = (() => { try { return sessionStorage.getItem("cissp-update-later"); } catch { return null; } })();
  if (!v || skip === String(v.versionCode)) { if (bar) bar.remove(); return; }
  const fr = getLang() === "fr";
  if (!bar) { bar = document.createElement("div"); bar.id = "update-bar"; bar.className = "update-bar"; document.body.appendChild(bar); }
  const notes = (fr ? v.notes_fr || v.notes : v.notes || v.notes_fr) || "";
  bar.innerHTML = `<div class="update-txt"><strong>⬆️ ${fr ? `Nouvelle version ${esc(v.versionName)} disponible` : `New version ${esc(v.versionName)} available`}</strong>
      ${notes ? `<span class="muted small">${esc(notes)}</span>` : ""}</div>
    <div class="update-actions">
      <button class="btn btn-primary btn-sm" id="update-go">${fr ? "Installer" : "Install"}</button>
      <button class="btn btn-ghost btn-sm" id="update-later">${fr ? "Plus tard" : "Later"}</button>
    </div>`;
  bar.querySelector("#update-go").onclick = () => {
    nativeTTS.installUpdate(new URL(v.apk || "apk/cissp-training.apk", new URL("apk/", location.href)).href + "?v=" + v.versionCode);
    toast(fr ? "Téléchargement de la nouvelle version… l'installation se lance ensuite." : "Downloading the new version… installation starts next.", "info");
  };
  bar.querySelector("#update-later").onclick = () => { try { sessionStorage.setItem("cissp-update-later", String(v.versionCode)); } catch { /* ignore */ } bar.remove(); };
}
window.__updateFailed = () => toast(getLang() === "fr" ? "Installation impossible : réessaie, ou télécharge l'APK depuis le site." : "Install failed: try again, or download the APK from the site.", "err");
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkUpdate(); });
setTimeout(checkUpdate, 3000);

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
  renderExam(); renderMute(); renderSpeedBtn(); renderTvBtn(); renderVersion(); if (updateInfo) renderUpdate();
}
function rerender() {
  applyStaticTexts();
  if (state.view === "login") return renderLogin(state.authMode);
  if (state.view === "quiz" && state.quiz) return renderQuiz();
  if (state.view === "results" && state.lastResult) return renderResults();
  if (state.view === "history") return renderHistory();
  if (state.view === "home") return renderHome();
}

// ------------------------------------------------------------------ mode TV
/* La même appli sert sur le téléphone et sur Android TV. Sur la télé, elle affiche un code et attend ; sur le téléphone,
   le bouton 📺 relie l'appli à ce code. Le téléphone envoie alors l'état du quiz (question, propositions, correction)
   à la télé, qui l'affiche en grand et fait la lecture audio. La liaison passe par Supabase Realtime (canal « broadcast »),
   sans compte ni connexion sur la télé : seul le téléphone, connecté, envoie le contenu. */
const IS_TV = (() => { try { return !!(nativeTTS && typeof nativeTTS.isTV === "function" && nativeTTS.isTV()); } catch { return false; } })()
  || /[?&]tv=1\b/.test(location.search);
const TV_KEY = "cissp-tv-code";
const TV_LAST = "cissp-tv-last";   // téléphone : dernière télé connectée, reconnectée automatiquement
const tvSaved = () => { try { const c = localStorage.getItem(TV_LAST) || ""; return /^\d{6}$/.test(c) ? c : ""; } catch { return ""; } };
const tvSave = c => { try { if (c) localStorage.setItem(TV_LAST, c); else localStorage.removeItem(TV_LAST); } catch { /* ignore */ } };
let tv = null;   // téléphone : { code, link, ok } ; télé : { code, link }
function tvChannel(code, onMsg) {
  if (window.__tvTransport) return window.__tvTransport(code, onMsg);   // tests
  const sb = state.store && state.store.sb; if (!sb) return null;
  const ch = sb.channel("cissp-tv-" + code, { config: { broadcast: { self: false } } });
  ch.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload || {}));
  let ready = false; const queue = [];
  const send = p => ch.send({ type: "broadcast", event: "m", payload: p });
  ch.subscribe(st => { if (st === "SUBSCRIBED") { ready = true; queue.splice(0).forEach(send); } });
  return { send: p => (ready ? send(p) : queue.push(p)), close: () => { try { sb.removeChannel(ch); } catch { /* ignore */ } } };
}

// ---- côté téléphone
function renderTvBtn() {
  if (IS_TV || !(window.__tvTransport || (state.store && state.store.sb))) return;
  let b = document.getElementById("btn-tv");
  if (!b) {
    b = document.createElement("button"); b.id = "btn-tv"; b.type = "button"; b.className = "icon-btn tv-btn";
    const right = document.querySelector(".topbar-right"), m = document.getElementById("btn-mute");
    right.insertBefore(b, m ? m.nextSibling : right.firstChild);
    b.addEventListener("click", e => { e.stopPropagation(); toggleTvPop(); });
  }
  const fr = getLang() === "fr";
  b.textContent = "📺";
  b.classList.toggle("on", !!(tv && tv.ok));
  b.title = tv && tv.ok ? (fr ? `Connecté à la télé (code ${tv.code})` : `Connected to the TV (code ${tv.code})`)
    : (fr ? "Afficher les questions sur la télé (Android TV)" : "Show the questions on the TV (Android TV)");
  b.setAttribute("aria-label", b.title);
}
function toggleTvPop(force) {
  let pop = document.getElementById("tv-pop");
  const open = force ?? !(pop && !pop.hidden);
  if (!open) { if (pop) pop.hidden = true; return; }
  const fr = getLang() === "fr";
  if (!pop) {
    pop = document.createElement("div"); pop.id = "tv-pop"; pop.className = "exam-pop panel"; document.body.appendChild(pop);
    pop.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", () => toggleTvPop(false));
  }
  if (tv) {
    pop.innerHTML = `<p class="exam-lbl">📺 ${tv.ok ? (fr ? `Télé connectée (code ${tv.code})` : `TV connected (code ${tv.code})`) : (tv.auto ? (fr ? `En attente de la télé ${tv.code} : ouvre l'appli sur la télé, la connexion se fera toute seule.` : `Waiting for TV ${tv.code}: open the app on the TV and it will connect by itself.`)
        : (fr ? `Connexion à la télé ${tv.code}…` : `Connecting to TV ${tv.code}…`))}</p>
      <p class="muted small">${fr ? "Réponds sur le téléphone : la question, la correction et la lecture audio passent sur la télé." : "Answer on the phone: the question, the explanation and the audio play on the TV."}</p>
      <div class="exam-actions"><button class="btn btn-ghost btn-sm" id="tv-off">${fr ? "Déconnecter" : "Disconnect"}</button></div>`;
    pop.querySelector("#tv-off").onclick = () => {
      const c = tv.code.slice(0, 3) + " " + tv.code.slice(3);
      if (!confirm(fr ? `Se déconnecter de la télé ${c} ?\n\nElle ne sera plus reconnectée automatiquement : il faudra retaper le code.`
        : `Disconnect from TV ${c}?\n\nIt will no longer reconnect automatically: you will need to type the code again.`)) return;
      tvSave(""); tvDisconnect(); toggleTvPop(false);
    };
  } else {
    pop.innerHTML = `<label class="exam-lbl" for="tv-input">📺 ${fr ? "Code affiché sur la télé" : "Code shown on the TV"}</label>
      <input id="tv-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="000000" class="tv-input mono">
      <p class="muted small">${fr ? "Ouvre l'appli CISSP Training sur ta télé Android TV : elle affiche ce code." : "Open the CISSP Training app on your Android TV: it shows this code."}</p>
      <div class="exam-actions"><button class="btn btn-primary btn-sm" id="tv-ok">${fr ? "Connecter" : "Connect"}</button></div>`;
    const inp = pop.querySelector("#tv-input");
    const ok = () => { const c = inp.value.replace(/\D/g, ""); if (c.length !== 6) { inp.focus(); return; } tvConnect(c); toggleTvPop(false); };
    pop.querySelector("#tv-ok").onclick = ok;
    inp.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
    setTimeout(() => inp.focus(), 50);
  }
  pop.hidden = false;
}
/** auto = reconnexion à la dernière télé : pas de message d'erreur, on attend que la télé s'ouvre (elle s'annonce). */
function tvConnect(code, auto = false) {
  tvDisconnect(true);
  const fr = getLang() === "fr";
  const link = tvChannel(code, m => {
    if (!tv || tv.link !== link) return;
    if (m.t === "done") { if (tvDoneCb) tvDoneCb(m); return; }
    if (m.t === "pick" || m.t === "check" || m.t === "listening") { tvRemoteAnswer(m); return; }
    if (m.t === "here") {   // la télé répond (ou vient de s'ouvrir)
      const first = !tv.ok; tv.ok = true; tvSave(code); renderTvBtn();
      if (first) toast(fr ? "📺 Télé connectée : réponds sur le téléphone" : "📺 TV connected: answer on the phone", "ok");
      tvSync();
    }
  });
  if (!link) return toast(fr ? "Mode TV indisponible (Supabase n'est pas configuré)" : "TV mode unavailable (Supabase not configured)", "err");
  tv = { code, link, ok: false, auto };
  link.send({ t: "hi" });
  renderTvBtn();
  setTimeout(() => {
    if (tv && tv.link === link && !tv.ok && !tv.auto) {
      toast(fr ? `Aucune télé n'a répondu au code ${code}. Vérifie le code et que l'appli est ouverte sur la télé.` : `No TV answered code ${code}. Check the code and that the app is open on the TV.`, "warn");
      tvDisconnect(true);
    }
  }, 10000);
}
/** Au démarrage du téléphone (et au retour dans l'appli) : on retrouve la dernière télé sans redemander le code. */
function tvAutoConnect() {
  if (IS_TV) return;
  const c = tvSaved(); if (!c || !(window.__tvTransport || (state.store && state.store.sb))) return;
  if (tv && tv.code === c) { if (!tv.ok) tv.link.send({ t: "hi" }); return; }
  if (!tv) tvConnect(c, true);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && state.store) tvAutoConnect(); });
function tvDisconnect(silent) {
  if (!tv) return;
  try { tv.link.send({ t: "bye" }); } catch { /* ignore */ }
  const l = tv.link; tv = null; setTimeout(() => l.close(), 500);
  renderTvBtn();
  if (!silent) toast(getLang() === "fr" ? "📺 Télé déconnectée" : "📺 TV disconnected", "info");
}
/** Envoie à la télé ce qui est affiché sur le téléphone (question en cours, ou attente hors quiz). */
let tvRev = null;   // fiche ouverte sur le téléphone : { sec, r, pane, lang }
/** Fiche (Révision, Résumé Last Mile, Livre) ouverte ou changée sur le téléphone : on l'affiche aussi sur la télé. */
function tvSheet(sec, r, pane, lang) { tvRev = r ? { sec, r, pane, lang } : null; tvSync(); }
function tvSync() {
  if (!tv || !tv.ok) return;
  const z = state.quiz;
  if (state.view === "home" && tvRev && tvRev.sec === state.section) {
    const { sec, r, pane, lang } = tvRev, c = chById(r.id);
    tv.link.send({
      t: "sheet", ui: getLang(), lang, key: sec + ":" + r.id + ":" + pane + ":" + lang,
      kicker: sec === "lmsum" ? t("lms.tab") : sec === "book" ? t("book.tab") : t("rev.tab"),
      title: r.lms ? `D${r.id} · ${t("domain." + r.id, {}, lang)}` : `${chLabel(r.id)} · ${chTitle(c) || ""}`,
      pane: t("rev.pane." + pane, {}, lang), head: revSpeech(r, pane, lang),
      kind: ["sum", "bsum", "bess"].includes(pane) ? "mixed" : "list", lines: revLines(r, pane, lang),
    });
    return;
  }
  if (state.view !== "quiz" || !z) { tv.link.send({ t: "idle", lang: getLang() }); return; }
  const q = z.questions[z.i], showLang = z.peek ? (getLang() === "fr" ? "en" : "fr") : getLang(), txt = qText(q, showLang);
  const picks = z.picks[z.i], checked = z.checked[z.i];
  tv.link.send({
    t: "q", lang: txt.lang, ui: getLang(), label: z.label(), n: z.i + 1, total: z.questions.length,
    chapter: chTitle(chById(q.chapter_id)), scenario: txt.scenario || "", question: txt.question, options: txt.options,
    multi: !!q.multi, picks, checked, correct: checked ? q.correct : [], explanation: checked ? txt.explanation : "",
    ok: checked && sameSet(picks, q.correct),
  });
}
/** Réponse donnée sur la télé (télécommande ou voix) : appliquée au quiz du téléphone comme un toucher. */
function tvRemoteAnswer(m) {
  const z = state.quiz; if (state.view !== "quiz" || !z || z.i + 1 !== m.n || z.checked[z.i]) return;
  const q = z.questions[z.i];
  if (m.t === "listening") {   // on parle à la télé : la lecture Speed s'arrête, le chrono continue
    if (z.sp && z.sp.i === z.i && z.sp.phase === "reading") { z.sp.touched = true; if (z.sp.startCount) z.sp.startCount(); }
    return;
  }
  if (m.t === "check") { if (z.picks[z.i].length && z.feedback) check(); return; }
  if (!/^[A-F]$/.test(m.L || "")) return;
  if (!q.multi && z.picks[z.i][0] === m.L) { if (z.feedback && !speedActive(z)) check(); return; }   // déjà choisie : on valide
  toggle(m.L);
  if (!q.multi && z.feedback && !speedActive(z) && !z.checked[z.i]) check();   // (en Speed, toggle valide déjà)
}
/** Lecture sur la télé à la place du téléphone (« question », « all » ou « answer »). */
function tvSpeak(mode) { if (tv && tv.ok) tv.link.send({ t: "speak", mode }); }

// ---- côté télé
let tvLast = null;
function tvCode() {
  let c = ""; try { c = localStorage.getItem(TV_KEY) || ""; } catch { /* ignore */ }
  if (!/^\d{6}$/.test(c)) {
    const a = new Uint32Array(1); crypto.getRandomValues(a); c = String(a[0] % 1000000).padStart(6, "0");
    try { localStorage.setItem(TV_KEY, c); } catch { /* ignore */ }
  }
  return c;
}
function renderTv() {
  document.body.classList.add("tv-mode");
  state.view = "tv";
  const code = tvCode();
  if (!tv) {
    const link = tvChannel(code, m => {
      if (m.t === "hi") { link.send({ t: "here" }); return; }
      if (m.t === "clock") { tvShowClock(m.txt, m.danger); return; }
      if (m.t === "hush") { tvReadTok++; stopSpeak(); return; }
      if (m.t === "bye" || m.t === "idle") tvShowClock("");
      if (m.t === "bye") { tvLast = null; stopSpeak(); tvRender(); return; }
      if (m.t === "idle") { tvLast = { t: "idle", ui: m.lang }; stopSpeak(); tvRender(); return; }
      // Même contenu renvoyé par le téléphone (il se réaffiche souvent) : on ne touche pas à l'écran, sinon la lecture
      // en cours perd le surlignage (les phrases surlignées appartiennent à l'ancien affichage).
      if ((m.t === "q" || m.t === "sheet") && tvLast && JSON.stringify(m) === JSON.stringify(tvLast)) return;
      if (m.t === "q") {
        const same = tvLast && tvLast.t === "q" && tvLast.n === m.n && tvLast.question === m.question && tvLast.checked === m.checked;
        if (!same) stopSpeak();
        tvLast = m; tvRender(); return;
      }
      if (m.t === "sheet") {
        if (!(tvLast && tvLast.t === "sheet" && tvLast.key === m.key)) stopSpeak();
        tvLast = m; tvRender(); return;
      }
      if (m.t === "speak" && tvLast && (tvLast.t === "q" || tvLast.t === "sheet")) tvRead(m.mode);
    });
    if (!link) return errorPanel(t("err.title"), "Supabase", "");
    tv = { code, link };
    link.send({ t: "here" });   // si un téléphone attend déjà sur ce code
  }
  tvRender();
}
function tvRender() {
  const code = tv ? tv.code : tvCode(), m = tvLast;
  const fr = (m && (m.ui || m.lang) ? (m.ui || m.lang) : getLang()) === "fr";
  if (m && m.t === "sheet") {
    let body = "";
    if (m.kind === "list") body = `<ul class="rev-list">${m.lines.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    else {
      let list = [];
      const flush = () => { if (list.length) { body += `<ul class="rev-list">${list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; list = []; } };
      for (const l of m.lines) {
        if (l.startsWith("- ")) { list.push(l.slice(2)); continue; }
        flush(); body += l.startsWith("## ") ? `<h4>${esc(l.slice(3))}</h4>` : `<p>${esc(l)}</p>`;
      }
      flush();
    }
    app.innerHTML = `<section class="quiz tv-quiz tv-sheet">
      <p class="mono kicker">${esc(m.kicker)} · ${esc(m.pane)}</p>
      <h1 class="tv-sheet-title">${esc(m.title)}</h1>
      <article class="panel rev-pane" lang="${m.lang}">${body}</article></section>`;
    window.scrollTo({ top: 0 });
    return;
  }
  if (!m || m.t !== "q") {
    app.innerHTML = `<section class="tv-wait">
      <p class="mono kicker">&gt; cissp-tv --listen</p>
      <h1>📺 ${m ? (fr ? "Téléphone connecté" : "Phone connected") : (fr ? "Mode télé" : "TV mode")}</h1>
      <p class="tv-code mono">${code.slice(0, 3)} ${code.slice(3)}</p>
      <p class="tv-help">${m ? (fr ? "Lance un quiz sur le téléphone : les questions s'afficheront ici." : "Start a quiz on the phone: the questions will show here.")
        : (fr ? "Sur le téléphone, touche 📺 en haut de l'appli et tape ce code." : "On the phone, tap 📺 at the top of the app and type this code.")}</p>
    </section>`;
    return;
  }
  const opts = m.options.map((o, idx) => {
    const L = letter(idx), sel = m.picks.includes(L);
    let cls = sel ? "selected" : "";
    if (m.checked) { if (m.correct.includes(L)) cls += " correct"; else if (sel) cls += " wrong"; }
    return `<li><div class="opt ${cls}" ${m.checked ? "" : `tabindex="0" data-letter="${L}"`}><span class="opt-key mono">${L}</span><span class="opt-txt" data-tts="opt">${esc(o)}</span>
      <span class="opt-mark mono">${m.checked ? (m.correct.includes(L) ? "✓" : sel ? "✗" : "") : ""}</span></div></li>`;
  }).join("");
  app.innerHTML = `<section class="quiz tv-quiz">
    <div class="quiz-head"><div><p class="mono kicker">${esc(m.label)}</p>
      <p class="mono q-count">Q ${pad(m.n)}<span class="muted">/${pad(m.total)}</span></p></div></div>
    <div class="progress"><span style="width:${pct(m.n - 1 + (m.checked ? 1 : 0), m.total)}%"></span></div>
    <article class="panel question-panel" lang="${m.lang}">
      <p class="q-chapter mono muted">${esc(m.chapter)}</p>
      ${m.scenario ? `<div class="scenario"><p data-tts="scenario">${esc(m.scenario)}</p></div>` : ""}
      <h2 class="q-text" data-tts="q">${esc(m.question)}</h2>
      ${m.multi ? `<p class="hint mono">${esc(t("quiz.multi", {}, m.lang))}</p>` : ""}
      <ol class="opts">${opts}</ol>
      ${m.checked ? "" : `<p class="tv-answer-help muted">${tvCanListen() ? `<button class="btn btn-ghost btn-sm" id="tv-mic" tabindex="0">🎤 ${(m.ui || m.lang) === "fr" ? "Répondre à la voix" : "Answer by voice"}</button>` : ""}
        ${(m.ui || m.lang) === "fr"
        ? `Choisis avec les flèches + OK${tvCanListen() ? `, ou va sur 🎤, appuie sur OK et dis « A », « B »… ${m.multi ? "puis « valider »" : ""}` : ""}`
        : `Pick with the arrows + OK${tvCanListen() ? `, or go to 🎤, press OK and say "A", "B"… ${m.multi ? "then \"check\"" : ""}` : ""}`}
        ${m.multi ? `<button class="btn btn-primary btn-sm" id="tv-check" tabindex="0">${(m.ui || m.lang) === "fr" ? "Valider" : "Check"}</button>` : ""}</p>`}
      ${m.checked ? `<div class="explain ${m.ok ? "ok" : "ko"}">
        <p class="mono verdict">${esc(m.ok ? t("quiz.granted", {}, m.ui) : t("quiz.denied", { a: m.correct.join(", ") }, m.ui))}</p>
        <p data-tts="exp">${esc(m.explanation)}</p></div>` : ""}
    </article>
  </section>`;
  if (m.checked) setTimeout(() => { const e = app.querySelector(".explain"); if (e) e.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
  else {
    window.scrollTo({ top: 0 });
    // télécommande : le focus reste sur la proposition choisie (ou la première), sans faire défiler l'écran
    if (tvFocusN !== m.n) { tvFocusN = m.n; tvFocusL = ""; }
    const f = (tvFocusL && app.querySelector(`.tv-quiz .opt[data-letter="${tvFocusL}"]`)) || app.querySelector(".tv-quiz .opt[data-letter]");
    if (f) f.focus({ preventScroll: true });
    const c = document.getElementById("tv-check"); if (c) c.onclick = () => tvAnswer({ t: "check" });
    const mic = document.getElementById("tv-mic"); if (mic) mic.onclick = () => window.__tvVoiceKey();
  }
}
/* ---- Télé : répondre depuis la télé (télécommande ou voix), la réponse part au téléphone qui la valide. */
let tvFocusL = "", tvFocusN = 0;
const tvCanListen = () => !!(nativeTTS && typeof nativeTTS.listen === "function");
function tvAnswer(msg) {
  const m = tvLast; if (!tv || !m || m.t !== "q" || m.checked) return;
  tv.link.send({ ...msg, n: m.n });
}
if (IS_TV) document.addEventListener("keydown", e => {
  const m = tvLast; if (!m || m.t !== "q" || m.checked) return;
  const opts = [...app.querySelectorAll(".tv-quiz .opt[data-letter]")]; if (!opts.length) return;
  const cur = opts.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const extra = ["tv-check", "tv-mic"].map(id => document.getElementById(id)).filter(Boolean);
    const list = [...opts, ...extra], at = list.indexOf(document.activeElement);
    const nx = list[Math.max(0, Math.min(list.length - 1, at < 0 ? 0 : at + (e.key === "ArrowDown" ? 1 : -1)))];
    nx.focus({ preventScroll: false }); if (nx.dataset.letter) tvFocusL = nx.dataset.letter;
    e.preventDefault(); return;
  }
  if ((e.key === "Enter" || e.key === " ") && cur >= 0) { e.preventDefault(); tvFocusL = opts[cur].dataset.letter; tvAnswer({ t: "pick", L: tvFocusL }); return; }
  if (/^[1-6]$/.test(e.key) && opts[+e.key - 1]) { e.preventDefault(); tvAnswer({ t: "pick", L: opts[+e.key - 1].dataset.letter }); }
});
/** Lettres et « valider » reconnus dans ce qui a été dit (« réponse C », « B », « la deuxième », « A et C »…). */
function tvParseVoice(list, nOpt) {
  const W = { a: 0, ah: 0, b: 1, be: 1, bee: 1, c: 2, ce: 2, see: 2, sea: 2, d: 3, de: 3, dee: 3, e: 4, f: 5,
    un: 0, une: 0, one: 0, premier: 0, premiere: 0, first: 0, deux: 1, two: 1, deuxieme: 1, second: 1,
    trois: 2, three: 2, troisieme: 2, third: 2, quatre: 3, four: 3, quatrieme: 3, fourth: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
  for (const said of list || []) {
    const words = said.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const check = words.some(w => /^(valider|valide|verifier|verifie|confirmer|check|confirm|submit|ok)$/.test(w));
    const letters = [];
    words.forEach((w, i) => {
      if (!(w in W) || W[w] >= nOpt) return;
      if (w === "de" && i < words.length - 1) return;   // « de » au milieu d'une phrase n'est pas la lettre D
      if (w === "un" || w === "une") { if (i < words.length - 1) return; }
      const L = letter(W[w]); if (!letters.includes(L)) letters.push(L);
    });
    if (letters.length || check) return { letters, check, said };
  }
  return null;
}
let tvVoiceTip = null;
function tvVoiceInfo(txt, ms = 0) {
  if (!tvVoiceTip) { tvVoiceTip = document.createElement("div"); tvVoiceTip.className = "tv-voice-tip"; document.body.appendChild(tvVoiceTip); }
  tvVoiceTip.textContent = txt; tvVoiceTip.hidden = !txt;
  clearTimeout(tvVoiceTip._t); if (ms) tvVoiceTip._t = setTimeout(() => { tvVoiceTip.hidden = true; }, ms);
}
window.__tvVoiceKey = () => {
  const m = tvLast, fr = ((m && (m.ui || m.lang)) || getLang()) === "fr";
  if (!m || m.t !== "q" || m.checked) { tvVoiceInfo(fr ? "🎤 Pas de question en attente de réponse" : "🎤 No question waiting for an answer", 2500); return; }
  if (!nativeTTS || typeof nativeTTS.listen !== "function") return;
  if (tv) tv.link.send({ t: "listening", n: m.n });   // le téléphone met le chrono Speed en pause d'écoute
  if (player) stopSpeak();
  nativeTTS.listen(m.lang || m.ui || getLang());
};
window.__tvVoice = (list, stateMsg) => {
  const m = tvLast, fr = ((m && (m.ui || m.lang)) || getLang()) === "fr";
  if (stateMsg === "listening") { tvVoiceInfo(fr ? "🎤 Je t'écoute… dis « A », « B », « C » ou « D »" : "🎤 Listening… say \"A\", \"B\", \"C\" or \"D\""); return; }
  if (stateMsg === "perm") { tvVoiceInfo(fr ? "🎤 Autorise le micro, puis appuie à nouveau sur le bouton" : "🎤 Allow the microphone, then press the button again", 5000); return; }
  if (stateMsg) { tvVoiceInfo(fr ? "🎤 Je n'ai pas compris, réessaie" : "🎤 I didn't catch that, try again", 3000); return; }
  if (!m || m.t !== "q" || m.checked) { tvVoiceInfo("", 0); return; }
  const r = tvParseVoice(list, m.options.length);
  if (!r) { tvVoiceInfo((fr ? "🎤 Pas compris : « " : "🎤 Didn't get: \"") + ((list && list[0]) || "") + (fr ? " »" : "\""), 3500); return; }
  tvVoiceInfo("🎤 " + (r.letters.join(", ") || "") + (r.check ? (fr ? " · valider" : " · check") : ""), 2500);
  if (m.multi) { r.letters.forEach(L => { if (!m.picks.includes(L)) tvAnswer({ t: "pick", L }); }); if (r.check) setTimeout(() => tvAnswer({ t: "check" }), 400); }
  else if (r.letters.length) tvAnswer({ t: "pick", L: r.letters[r.letters.length - 1] });
};
function tvRead(mode) {
  const m = tvLast; if (!m || !canSpeak) return;
  let btn = document.getElementById("tv-speak-dummy");
  if (!btn) { btn = document.createElement("button"); btn.id = "tv-speak-dummy"; btn.hidden = true; document.body.appendChild(btn); }
  if (player) stopSpeak();
  if (m.t === "sheet") {
    const pane = app.querySelector(".tv-sheet .rev-pane"); if (!pane) return;
    speakUnits("tv:" + m.key, speechUnits([m.head, ...[...pane.querySelectorAll("h4, p, li")].map(el => ({ el }))], m.lang), m.lang, btn);
    return;
  }
  if (m.t !== "q") return;
  const box = app.querySelector(".question-panel"); if (!box) return;
  const tok = ++tvReadTok, n = m.n, done = () => { if (tv && tok === tvReadTok) tv.link.send({ t: "done", mode, n }); };
  if (mode === "speedq") {   // mode Speed : question + propositions deux fois, puis on prévient le téléphone
    readTwice("tv:" + n + ":speedq", () => tok !== tvReadTok || !tvLast || tvLast.n !== n || tvLast.checked ? "abort" : true, done);
    return;
  }
  speakUnits("tv:" + n + ":" + mode, speechUnits(quizParts({ correct: m.correct }, box, m.lang, mode), m.lang), m.lang, btn, done);
}
let tvReadTok = 0;

// ------------------------------------------------------------------ Android Auto
/* L'appli prépare le contenu à écouter en voiture (fiches et quiz audio) dans la langue de l'appli ;
   le lecteur Android Auto (AutoService.java) le lit phrase par phrase : lecture / pause, suivant / précédent. */
const AUTO_PAUSE = "##PAUSE##";
function exportAuto() {
  if (!nativeTTS || typeof nativeTTS.saveAuto !== "function" || !state.questions) return;
  try {
    // les deux langues sont préparées : la voiture peut passer du français à l'anglais (bouton 🌐) sans le téléphone
    const langs = {};
    for (const lang of ["fr", "en"]) langs[lang] = { groups: autoGroups(lang) };
    nativeTTS.saveAuto(JSON.stringify({ v: 3, lang: getLang(), rate: ttsRate, pauseMs: 6000,
      voice: { fr: voicePref("fr"), en: voicePref("en") }, langs }));
  } catch (e) { console.error("exportAuto", e); }
}
/** Contenu à écouter en voiture dans une langue : fiches et quiz audio, en groupes. */
function autoGroups(lang) {
  {
    const fr = lang === "fr";
    // « § » = début de section : le lecteur de la voiture permet d'y sauter (section suivante / précédente, liste des sections).
    const clean = l => l.startsWith("## ") ? "§ " + l.slice(3) + "." : l.startsWith("- ") ? l.slice(2) : l;
    const lines = (r, panes, L = lang) => panes.flatMap(p => ["§ " + t("rev.pane." + p, {}, L) + ".", ...revLines(r, p, L).map(clean)]);
    const groups = [];
    groups.push({ title: t("lms.tab", {}, lang), subtitle: fr ? "8 domaines" : "8 domains",
      items: LMSUM.map(r => ({ key: "lms-" + r.id + "-" + lang, title: (fr ? "Domaine " : "Domain ") + r.id + " · " + t("domain." + r.id, {}, lang), subtitle: t("lms.tab", {}, lang),
        lang, parts: lines(r, REV_PANES) })) });
    const chTitle = id => { const c = chById(id); return c ? (fr && c.title_fr ? c.title_fr : c.title) : ""; };
    groups.push({ title: t("rev.tab", {}, lang), subtitle: REVISION.length + (fr ? " chapitres" : " chapters"),
      items: REVISION.map(r => ({ key: "rev-" + r.id + "-" + lang, title: (fr ? "Chapitre " : "Chapter ") + r.id + " · " + chTitle(r.id), subtitle: t("rev.tab", {}, lang),
        lang, parts: lines(r, REV_PANES) })) });
    if (state.notes && state.notes.size) {
      const ids = [...state.notes.keys()].sort((a, b) => a - b);
      groups.push({ title: t("book.tab", {}, lang), subtitle: ids.length + (fr ? " chapitres" : " chapters"),
        items: ids.map(id => {
          const n = state.notes.get(id) || {}, hasFrTxt = !!(n.summary_fr && n.summary_fr.length);
          const L = fr && hasFrTxt ? "fr" : "en";
          return { key: "book-" + id + "-" + L, title: (L === "fr" ? "Chapitre " : "Chapter ") + id + " · " + chTitle(id), subtitle: t("book.tab", {}, lang),
            lang: L, parts: lines({ id }, BOOK_PANES, L) };
        }) });
    }
    // Quiz audio : question et propositions, un temps de réflexion, puis la bonne réponse et l'explication.
    const quizItem = (q, k) => {
      const x = qText(q, lang), Lq = x.lang, f = Lq === "fr";
      const opts = (x.options || []).map((o, i) => String.fromCharCode(65 + i) + (f ? " : " : ": ") + o);
      const ok = q.correct.map(L => L + (f ? " : " : ": ") + ((x.options || [])[L.charCodeAt(0) - 65] || ""));
      const head = f ? (q.correct.length > 1 ? "Bonnes réponses" : "Bonne réponse") : (q.correct.length > 1 ? "Correct answers" : "Correct answer");
      return { key: "q-" + q.id + "-" + Lq, title: "Question " + (k + 1), subtitle: chTitle(q.chapter_id) || "", lang: Lq,
        parts: [x.scenario || "", x.question || "", ...opts, AUTO_PAUSE, head + ".", ...ok, x.explanation || ""] };
    };
    const pool = qs => (fr ? [...qs.filter(hasFr), ...qs.filter(q => !hasFr(q))] : qs);
    const pick = (qs, n) => { const a = [...qs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    const own = s => state.questions.filter(q => secOf(q.chapter_id) === s);
    const wrong = mistakes();
    if (wrong.length) groups.push({ title: fr ? "Quiz audio · Mes erreurs" : "Audio quiz · My mistakes",
      subtitle: Math.min(wrong.length, 60) + " questions", items: pick(pool(wrong), 60).map(quizItem) });
    const lm = own("lastmile");
    if (lm.length) groups.push({ title: fr ? "Quiz audio · Last Mile" : "Audio quiz · Last Mile",
      subtitle: fr ? "40 questions au hasard" : "40 random questions", items: pick(fr ? lm.filter(hasFr).length ? lm.filter(hasFr) : lm : lm, 40).map(quizItem) });
    const cs = [...own("guide"), ...own("practice")];
    if (cs.length) groups.push({ title: fr ? "Quiz audio · CISSP" : "Audio quiz · CISSP",
      subtitle: fr ? "40 questions au hasard" : "40 random questions", items: pick(fr ? cs.filter(hasFr).length ? cs.filter(hasFr) : cs : cs, 40).map(quizItem) });
    return groups;
  }
}

// ------------------------------------------------------------------ boot
async function boot() {
  setTheme(currentTheme());
  document.getElementById("btn-theme").addEventListener("click", () => setTheme(currentTheme() === "light" ? "dark" : "light"));
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => { setLang(b.dataset.lang); rerender(); exportAuto(); }));
  applyStaticTexts();

  const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  if (configured && !window.supabase) return errorPanel(t("err.title"), t("err.cdn"), t("err.cdnHint"));
  if (!configured && location.hostname.endsWith("github.io")) return errorPanel(t("err.cfgTitle"), t("err.cfg"), t("err.cfgHint"));

  state.store = configured ? new SupabaseStore(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : new LocalStore(CFG.LOCAL_DATA);
  const badge = document.getElementById("mode-badge");
  badge.classList.add(configured ? "badge-ok" : "badge-warn");
  applyStaticTexts();
  if (IS_TV) return renderTv();   // télé : pas de connexion, on attend le téléphone

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
    exportAuto();
    tvAutoConnect();
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
  const auto = autonomous(), busy = state.store.offline ? "disabled" : "";
  // Barre compacte, en haut de tous les onglets (accueil, révision, livre).
  return `<div class="offline-bar" title="${esc(status)}">
    <span class="off-status">📥 ${esc(on ? t("off.short", { n: info.n, d: info.at ? fmtDate(info.at) : "?" }) + (info.pending ? " · " + t("off.pending", { n: info.pending }) : "") : t("off.title"))}</span>
    <button class="switch switch-sm${auto ? " on" : ""}" id="btn-auto" role="switch" aria-checked="${auto}" title="${esc(auto ? t("auto.onDesc") : t("auto.offDesc"))}"><span class="knob"></span><span class="mono">✈️ ${esc(t("auto.short"))} ${auto ? "ON" : "OFF"}</span></button>
    ${on ? `<button class="btn btn-ghost btn-xs" id="btn-off-dl" ${busy}>${esc(t("off.update"))}</button>
      <button class="btn btn-ghost btn-xs" id="btn-off-rm" ${busy}>${esc(t("off.remove"))}</button>`
      : `<button class="btn btn-primary btn-xs" id="btn-off-dl">${esc(t("off.download"))}</button>`}
  </div>`;
}
/** Affiche la barre « Hors ligne » dans #offline-slot de la vue courante et branche ses boutons. */
function mountOffline() {
  offlinePanel().then(html => {
    const slot = document.getElementById("offline-slot");
    if (!slot || !html) return;
    slot.innerHTML = html;
    const dl = document.getElementById("btn-off-dl"), rm = document.getElementById("btn-off-rm");
    if (dl) dl.onclick = () => { downloadOffline(dl); checkUpdate(true); };   // « Mettre à jour » vérifie aussi la version de l'appli
    const au = document.getElementById("btn-auto");
    if (au) au.onclick = () => toggleAutonomous(au);
    if (rm) rm.onclick = async () => {
      if (!confirm(t("off.removeConfirm"))) return;
      await state.store.clearOffline(); await unregisterSW(); toast(t("off.removed"), "info"); renderHome();
    };
  });
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
  setTimeout(renderPlayer, 0);   // nouvel écran : le lecteur gardé du mode Speed disparaît hors du quiz
  if (!state.session || !state.chapters.length) return;
  const h = location.hash.replace(/^#\/?/, "");
  if (state.quiz && h !== "quiz") {
    if (state.quiz.saveId) { saveQuiz(true); flushSave(); }  // quiz déjà sauvegardé : on enregistre tout de suite, pas besoin de confirmer
    else if (answeredOf(state.quiz) && !confirm(t("quiz.leave"))) { history.replaceState(null, "", "#/quiz"); return; }
    stopTimer(); state.quiz = null;
  }
  if (h === "quiz" && state.quiz) return renderQuiz();
  if (h === "results" && state.lastResult) return renderResults();
  if (h === "history") { renderHistory(); tvSync(); return; }
  renderHome(); tvSync();
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
    <h1 class="glitch">${esc(t("auth.title"))}</h1>
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
  const nIn = s => s === "improve" ? mistakes().length : s === "revision" ? REVISION.length : s === "lmsum" ? LMSUM.length : s === "book" ? state.notes.size : state.questions.filter(q => secOf(q.chapter_id) === s).length;
  const SEC_NAMES = { guide: "CISSP", practice: "CISSP Practice", lastmile: "CISSP Last Mile", lmsum: t("lms.tab"), revision: t("rev.tab"), book: t("book.tab"),
    improve: getLang() === "fr" ? "Axes d'amélioration" : "Improvement areas",
  };
  const secs = Object.keys(SEC_NAMES).filter(hasSection);
  return secs.length > 1 ? `
    <div class="seg sec-tabs" role="group" aria-label="${esc(t("sec.label"))}">
      ${secs.map(k => `<button class="seg-btn" data-section="${k}" aria-pressed="${k === sec}">${esc(SEC_NAMES[k])}
        <small class="mono">${nIn(k)}</small></button>`).join("")}
    </div>` : "";
}

/* ---- Onglet « Axes d'amélioration » : alimenté par les mauvaises réponses (dernière réponse fausse à une question),
   regroupé par domaine. Pour chaque erreur : la bonne réponse, l'explication et les passages des fiches de révision
   qui en parlent (rapprochement par mots-clés, sans IA), plus les chapitres à relire en priorité. */
const IMP_STOP = new Set(("the that which with from this what following would best most should must into their they there these those when where while about "
  + "after before other than then have will your also each such only more less does were been being could which whose them some many much very same within "
  + "between because under over upon used using uses what dans pour avec plus mais elle ils leur sont cette sont être fait").split(" "));
const impToks = s => (String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]{4,}/g) || []).filter(w => !IMP_STOP.has(w));
let impIdx = null;
/** Index des lignes des fiches (texte anglais) : { lines: [{ ch, pane, i, set }], df, N }. */
function impIndex() {
  if (impIdx) return impIdx;
  const lines = [], df = new Map();
  for (const r of REVISION) for (const pane of ["mem", "tips", "sum"]) {
    (pane === "sum" ? r.sum.en : r[pane].en).forEach((l, i) => {
      if (l.startsWith("## ")) return;
      const set = new Set(impToks(l)); if (set.size < 3) return;
      lines.push({ ch: r.id, pane, i, set }); set.forEach(w => df.set(w, (df.get(w) || 0) + 1));
    });
  }
  return (impIdx = { lines, df, N: lines.length || 1 });
}
const impLineText = (x, lang) => {
  const r = REVISION.find(y => y.id === x.ch); if (!r) return "";
  const arr = x.pane === "sum" ? r.sum : r[x.pane];
  return String((arr[lang] && arr[lang][x.i]) || arr.en[x.i] || "").replace(/^- /, "");
};
/** Les passages des fiches les plus proches d'une question (et la question elle-même, pour le domaine). */
const impCache = new Map();
function impExtracts(q, k = 2) {
  if (impCache.has(q.id)) return impCache.get(q.id);
  const { lines, df, N } = impIndex();
  const correct = (q.correct || []).map(L => (q.options || [])[L.charCodeAt(0) - 65]);
  const qs = new Set(impToks([q.scenario, q.question, ...correct, q.explanation].join(" ")));
  const own = REVISION.some(r => r.id === q.chapter_id) ? q.chapter_id : null;          // question du Study Guide : sa fiche
  const dom = (chById(q.chapter_id) || {}).domain || null;
  const inDom = id => !dom || (chById(id) || {}).domain === dom;
  const scored = [];
  for (const x of lines) {
    if (own ? x.ch !== own : !inDom(x.ch)) continue;
    let s = 0; x.set.forEach(w => { if (qs.has(w)) s += Math.log(N / df.get(w)); });
    if (s > 0) scored.push([s / Math.sqrt(x.set.size), x]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const best = scored.filter(([s]) => s >= 1.2).slice(0, k).map(([, x]) => x);
  if (!best.length && scored.length) best.push(scored[0][1]);
  const res = { best, domain: dom || (best[0] ? (chById(best[0].ch) || {}).domain : null) };
  impCache.set(q.id, res);
  return res;
}
const IMP_CERT = "cissp";
const IMP_PANE = { mem: { fr: "À mémoriser", en: "To memorize" }, tips: { fr: "Préparer l'examen", en: "Exam prep" }, sum: { fr: "Résumé", en: "Summary" } };
let impDom = null;
const impCanSpeak = () => canSpeak && (getLang() === "en" || canSpeakFr);   // domaine affiché dans l'onglet
function renderImprove() {
  const lang = getLang(), fr = lang === "fr";
  const wrong = mistakes();
  const answered = state.questions.filter(q => state.latest.has(q.id));
  const byDom = new Map();
  for (const q of wrong) {
    const d = impExtracts(q).domain || 0;
    if (!byDom.has(d)) byDom.set(d, []); byDom.get(d).push(q);
  }
  const doms = [...byDom.keys()].sort((a, b) => byDom.get(b).length - byDom.get(a).length || a - b);
  const rate = d => {
    const qs = answered.filter(q => (impExtracts(q).domain || 0) === d);
    return qs.length ? pct(qs.filter(q => state.latest.get(q.id).is_correct).length, qs.length) : null;
  };
  const qCard = q => {
    const tx = qText(q, lang), ex = impExtracts(q);
    const corr = (q.correct || []).map(L => `<li><b>${esc(L)}</b> ${esc((tx.options || [])[L.charCodeAt(0) - 65] || "")}</li>`).join("");
    const reads = ex.best.map(x => {
      const c = chById(x.ch);
      return `<li><button class="imp-ch mono" data-imp-rev="${x.ch}" data-imp-pane="${x.pane}" title="${esc(fr ? "Ouvrir la fiche de révision" : "Open the study sheet")}">${esc(chLabel(x.ch))}</button>
        <span class="muted small">${esc(chTitle(c))} · ${esc(IMP_PANE[x.pane][lang])}</span><br><span class="imp-read-txt">${esc(impLineText(x, lang))}</span></li>`;
    }).join("");
    return `<details class="imp-q" data-impq="${q.id}">
      <summary><span class="mono muted small">${esc(chLabel(q.chapter_id))}</span> ${esc(String(tx.question).slice(0, 160))}${String(tx.question).length > 160 ? "…" : ""}</summary>
      <div class="imp-body">
        ${impCanSpeak() ? `<div class="row"><button class="btn btn-ghost btn-xs btn-speak" data-imp-speak="${q.id}" lang="${lang}">🔊 ${fr ? "Lire" : "Listen"}</button></div>` : ""}
        ${tx.scenario ? `<p class="muted imp-scen">${esc(tx.scenario)}</p>` : ""}
        <p class="imp-qtext">${esc(tx.question)}</p>
        <p class="imp-lbl ok">✓ ${esc(fr ? ((q.correct || []).length > 1 ? "Bonnes réponses" : "Bonne réponse") : "Correct answer")}</p>
        <ul class="imp-correct">${corr}</ul>
        ${tx.explanation ? `<p class="imp-lbl">💡 ${fr ? "Pourquoi" : "Why"}</p><p class="imp-exp">${esc(tx.explanation)}</p>` : ""}
        ${reads ? `<p class="imp-lbl">📖 ${fr ? "À relire dans les fiches" : "Read again in the study sheets"}</p><ul class="imp-reads">${reads}</ul>` : ""}
      </div>
    </details>`;
  };
  if (!byDom.has(impDom)) impDom = doms[0];
  const domName = d => d ? domainName(d, IMP_CERT) : (fr ? "Autres questions" : "Other questions");
  const nav = doms.map(d => `<button class="imp-tab" data-imp-dom="${d}" aria-selected="${d === impDom}" role="tab">
      <span class="mono accent">${d ? "D" + d : "?"}</span><span class="imp-tab-name">${esc(domName(d))}</span><span class="imp-tab-n">${byDom.get(d).length}</span></button>`).join("");
  const pane = d => {
    const qs = byDom.get(d), r = rate(d);
    const chs = new Map();
    qs.forEach(q => impExtracts(q).best.slice(0, 1).forEach(x => chs.set(x.ch, (chs.get(x.ch) || 0) + 1)));
    const top = [...chs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return `<div class="domain-head"><h2><span class="mono accent">${d ? "D" + d : "?"}</span> ${esc(domName(d))}</h2>
        <div class="row">${impCanSpeak() ? `<button class="btn btn-ghost btn-sm btn-speak" data-imp-speakall lang="${lang}">🔊 ${fr ? "Lire tout le domaine" : "Listen to the whole domain"}</button>` : ""}
        <button class="btn btn-ghost btn-sm" data-imp-quiz="${d}">${esc(fr ? `Refaire ces ${qs.length} questions` : `Retry these ${qs.length} questions`)}</button></div></div>
      <p class="imp-stats"><span class="imp-err">${qs.length} ${fr ? (qs.length > 1 ? "erreurs" : "erreur") : (qs.length > 1 ? "mistakes" : "mistake")}</span>
        ${r !== null ? `<span class="muted">· ${r} % ${fr ? "de réussite sur ce domaine" : "success on this domain"}</span>` : ""}</p>
      ${top.length ? `<div class="imp-prio"><span class="muted small">${fr ? "Chapitres à relire en priorité :" : "Chapters to read again first:"}</span>
        ${top.map(([ch, n]) => `<button class="imp-ch mono" data-imp-rev="${ch}" data-imp-pane="mem">${esc(chLabel(ch))} · ${esc(chTitle(chById(ch)))} <b>${n}</b></button>`).join("")}</div>` : ""}
      <div class="imp-list">${qs.map(qCard).join("")}</div>`;
  };
  const blocks = doms.length ? `<div class="imp-layout"><nav class="imp-nav" role="tablist" aria-label="${fr ? "Domaines" : "Domains"}">${nav}</nav>
    <section class="imp-pane" role="tabpanel">${pane(impDom)}</section></div>` : "";
  app.innerHTML = `
  <div id="offline-slot"></div>
  <section class="hero">
    <h1>${fr ? "Axes d'amélioration" : "Improvement areas"}</h1>
    ${secTabs("improve")}
    <p class="muted">${esc(fr
      ? `Tes ${wrong.length} questions ratées (dernière réponse fausse), regroupées par domaine, du plus faible au plus solide. Pour chacune : la bonne réponse, l'explication et les passages des fiches de révision à relire. Une question réussie plus tard disparaît d'ici.`
      : `Your ${wrong.length} missed questions (last answer wrong), grouped by domain, weakest first. For each one: the correct answer, the explanation and the study sheet passages to read again. A question you later get right disappears from here.`)}</p>
  </section>
  ${blocks || `<section class="panel"><p>${fr ? "Aucune erreur pour l'instant : fais quelques QCM, tes axes d'amélioration apparaîtront ici." : "No mistakes yet: take a few quizzes and your improvement areas will show up here."}</p></section>`}`;
  app.querySelectorAll("[data-section]").forEach(b => b.onclick = () => { stopSpeak(); setSection(b.dataset.section); });
  /** Morceaux lus pour une question (texte pris dans la page, dans la langue affichée). */
  const impParts = det => {
    const el = sel => det.querySelector(sel), all = sel => [...det.querySelectorAll(sel)].map(e => ({ el: e }));
    return [fr ? "Question" : "Question", { el: el(".imp-scen") }, { el: el(".imp-qtext") },
      el(".imp-lbl.ok") ? el(".imp-lbl.ok").textContent.replace(/^✓\s*/, "") : "", ...all(".imp-correct li"),
      el(".imp-exp") ? (fr ? "Explication" : "Explanation") : "", { el: el(".imp-exp") },
      el(".imp-reads") ? (fr ? "À relire" : "Read again") : "", ...all(".imp-read-txt")].filter(x => x && (typeof x === "string" || x.el));
  };
  app.querySelectorAll("[data-imp-speak]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const det = b.closest(".imp-q");
    speakUnits("imp:" + b.dataset.impSpeak + ":" + lang, speechUnits(impParts(det), lang), lang, b);
  });
  app.querySelectorAll("[data-imp-speakall]").forEach(b => b.onclick = e => {
    e.preventDefault();
    const dets = [...app.querySelectorAll(".imp-pane .imp-q")];
    dets.forEach(d => { d.open = true; });
    const parts = [];
    dets.forEach((d, i) => parts.push((fr ? "Question " : "Question ") + (i + 1) + ".", ...impParts(d).slice(1)));
    speakUnits("imp:dom:" + impDom + ":" + lang, speechUnits(parts, lang), lang, b);
  });
  app.querySelectorAll("[data-imp-dom]").forEach(b => b.onclick = () => { impDom = +b.dataset.impDom; renderImprove(); });
  app.querySelectorAll("[data-imp-quiz]").forEach(b => b.onclick = () => {
    const d = +b.dataset.impQuiz, qs = byDom.get(d) || [];
    startQuiz({ mode: "mistakes", chapter_id: null, lab: { k: "mistakesDom", d, c: IMP_CERT }, questions: shuffle(qs), feedback: true });
  });
  app.querySelectorAll("[data-imp-rev]").forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const id = +b.dataset.impRev;
    revOpen.set("revision:" + id, b.dataset.impPane || "mem");
    setSection("revision");
    const card = app.querySelector(`.rev-card[data-rev="${id}"]`);
    if (card) { card.open = true; card.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  mountOffline();
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
  const v = r[pane] || {};
  return v[lang] || v.fr || v.en || [];   // Résumé Last Mile : texte en français uniquement
}
/** En-tête lu avant la fiche (« Chapitre n. Titre. Volet. ») ; le texte lui-même est lu depuis la page. */
function revSpeech(r, pane, lang) {
  if (r.lms) return joinSpeech([(lang === "fr" ? "Domaine " : "Domain ") + r.id, t("domain." + r.id, {}, lang), t("rev.pane." + pane, {}, lang)]);
  const c = chById(r.id), title = c ? (lang === "fr" && c.title_fr ? c.title_fr : c.title) : "";
  const head = t("rev.pane." + pane, {}, lang);
  return joinSpeech([(lang === "fr" ? "Chapitre " : "Chapter ") + r.id, title, head]);
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
  return `<ul class="rev-list">${revLines(r, pane, lang).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
}
function renderRevision(sec = "revision") {
  const lang = getLang(), isBook = sec === "book", isLms = sec === "lmsum";
  const PANES = isBook ? BOOK_PANES : REV_PANES;
  const ITEMS = isBook ? [...state.notes.keys()].sort((a, b) => a - b).map(id => ({ id }))
    : isLms ? LMSUM.map(r => ({ ...r, lms: true })) : REVISION;
  const key = id => sec + ":" + id;
  const paneOf = id => { const p = revOpen.get(key(id)); return PANES.includes(p) ? p : PANES[0]; };
  const card = r => {
    const c = chById(r.id), pane = paneOf(r.id);
    return `
    <details class="rev-card" data-rev="${r.id}" ${revOpen.has(key(r.id)) ? "open" : ""}>
      <summary>${isLms ? `<span class="ch-num mono">D${r.id}</span> <span class="ch-title">${esc(domainName(r.id, "cissp"))}</span>`
        : `<span class="ch-num mono">${chLabel(r.id)}</span> <span class="ch-title">${esc(chTitle(c) || "")}</span>`}</summary>
      <div class="rev-body">
        <div class="rev-tools">
          <div class="seg rev-panes" role="group">
            ${PANES.map(p => `<button class="seg-btn" data-revpane="${p}" aria-pressed="${p === pane}">${esc(t("rev.pane." + p))}</button>`).join("")}
          </div>
          <div class="row rev-speak">
            ${`
            ${canSpeak && !(lang === "fr" && canSpeakFr) ? `<button class="btn btn-ghost btn-xs btn-speak" data-revspeak="en" lang="en" title="Read this sheet aloud in English (click again to stop)">🔊 Listen</button>` : ""}
            ${canSpeakFr && lang === "fr" ? `<button class="btn btn-ghost btn-xs btn-speak" data-revspeak="fr" lang="fr" title="Lire cette fiche en français (cliquer à nouveau pour arrêter)">🔊 Lire</button>` : ""}`}
          </div>
        </div>
        <div class="rev-pane">${revPaneHtml(r, pane, lang)}</div>
      </div>
    </details>`;
  };
  const blocks = isLms ? `<section class="domain"><div class="rev-grid">${ITEMS.map(card).join("")}</div></section>` : DOMAIN_IDS.map(d => {
    const rs = ITEMS.filter(r => (chById(r.id) || {}).domain === d);
    if (!rs.length) return "";
    return `<section class="domain"><div class="domain-head"><h2><span class="mono accent">D${d}</span> ${esc(domainName(d, "cissp"))}</h2></div>
      <div class="rev-grid">${rs.map(card).join("")}</div></section>`;
  }).join("");
  app.innerHTML = `
  <div id="offline-slot"></div>
  <section class="hero">
    <p class="mono kicker">&gt; root@cissp:~$ ./${isBook ? "book" : isLms ? "last-mile-summary" : "review"} --lang=${lang}</p>
    <h1 class="glitch" data-text="${isBook ? "CISSP Book" : isLms ? "Last Mile Summary" : "CISSP Review"}">${isBook ? "CISSP Book" : isLms ? "Last Mile Summary" : "CISSP Review"}</h1>
    ${secTabs(sec)}
    <p class="muted">${esc(t(isBook ? "book.sub" : isLms ? "lms.sub" : "rev.sub", { n: ITEMS.length }))}</p>
    <div class="row"><button class="btn btn-ghost btn-sm" id="rev-open-all">${esc(t("rev.openAll"))}</button>
      <button class="btn btn-ghost btn-sm" id="rev-close-all">${esc(t("rev.closeAll"))}</button></div>
  </section>
  ${blocks}`;
  app.querySelectorAll("[data-section]").forEach(b => b.onclick = () => { stopSpeak(); setSection(b.dataset.section); });
  app.querySelectorAll(".rev-card").forEach(d => {
    const id = +d.dataset.rev, r = ITEMS.find(x => x.id === id);
    const shownLang = () => getLang();
    d.addEventListener("toggle", () => {
      if (d.open) { if (!revOpen.has(key(id))) revOpen.set(key(id), PANES[0]); tvSheet(sec, r, paneOf(id), shownLang()); }
      else { revOpen.delete(key(id)); if (tvRev && tvRev.sec === sec && tvRev.r.id === id) tvSheet(sec, null); }
    });
    d.querySelectorAll("[data-revpane]").forEach(b => b.onclick = () => {
      const pane = b.dataset.revpane; revOpen.set(key(id), pane); stopSpeak(); tvSheet(sec, r, pane, shownLang());
      d.querySelectorAll("[data-revpane]").forEach(x => x.setAttribute("aria-pressed", x === b));
      d.querySelector(".rev-pane").innerHTML = revPaneHtml(r, pane, getLang());
    });
    d.querySelectorAll("[data-revspeak]").forEach(b => b.onclick = e => {
      e.preventDefault();
      const l = b.dataset.revspeak, pane = paneOf(id), k = `${sec}:${id}:${pane}:${l}`;
      if (tv && tv.ok) { tvSheet(sec, r, pane, l); tvSpeak("sheet"); return; }   // télé connectée : lecture sur la télé
      if (speakingId === k) { stopSpeak(); return; }
      stopSpeak();
      // Lecture dans l'autre langue (Listen alors que le site est en français) : on affiche le texte lu le temps
      // de la lecture, pour pouvoir le suivre, puis on remet la langue du site.
      const box = d.querySelector(".rev-pane"), shown = getLang();
      let restore = null;
      if (l !== shown) {
        box.innerHTML = revPaneHtml(r, pane, l); box.lang = l;
        restore = () => { if (box.isConnected && (paneOf(id)) === pane) { box.innerHTML = revPaneHtml(r, pane, getLang()); box.removeAttribute("lang"); } };
      }
      const parts = [revSpeech(r, pane, l), ...[...box.querySelectorAll("h4, p, li")].map(el => ({ el }))];
      speakUnits(k, speechUnits(parts, l), l, b, restore);
    });
  });
  const all = open => () => app.querySelectorAll(".rev-card").forEach(d => { d.open = open; });
  document.getElementById("rev-open-all").onclick = all(true);
  document.getElementById("rev-close-all").onclick = all(false);
  mountOffline();
}

function renderHome() {
  stopTimer();
  state.view = "home";
  if (!hasSection(state.section)) state.section = "guide";
  if (state.section === "improve") { renderImprove(); return; }
  if (state.section === "revision" || state.section === "book" || state.section === "lmsum") { renderRevision(state.section); return; }
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
  <div id="offline-slot"></div>
  <section class="hero">
    <p class="mono kicker">&gt; root@${cert}:~$ ./train --mode=qcm --lang=${getLang()}</p>
    <h1 class="glitch hero-title"><img class="hero-logo" src="assets/logo-cissp.png" alt="" width="64" height="59"><span>${CERT} Training</span></h1>
    ${tabs}
    <p class="muted">${esc(t(subKey, { n: total, c: SC.length }))}</p>
    <div class="stats">
      <div class="stat"><span class="stat-val mono">${seen}<small>/${total}</small></span><span class="stat-lbl">${esc(t("home.seen"))}</span></div>
      <div class="stat"><span class="stat-val mono">${seen ? pct(ok, seen) : 0}<small>%</small></span><span class="stat-lbl">${esc(t("home.rate"))}</span></div>
      <div class="stat"><span class="stat-val mono">${mastered}<small>/${SC.length}</small></span><span class="stat-lbl">${esc(t("home.mastered", { p: PASS }))}</span></div>
      <div class="stat"><span class="stat-val mono">${state.attempts.length}</span><span class="stat-lbl">${esc(t("home.sessions"))}</span></div>
    </div>
  </section>

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
  mountOffline();
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
    case "mistakesDom": return t("mode.mistakesCh", { n: (lab.c === "ccsp" ? "CCSP " : "") + "D" + lab.d });
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
    const listed = (await state.store.listSaved()).filter(x => (x.qids || []).some(id => own.has(id)) && !droppedIds.has(x.id));
    // une sauvegarde automatique peut être encore en cours d'écriture : on garde les plus récentes en mémoire (< 1 min)
    const byId = new Map(listed.map(x => [x.id, x]));
    for (const m of loadSaved()) {
      const l = byId.get(m.id);
      if (l ? (m.savedAt || 0) > (l.savedAt || 0) : Date.now() - (m.savedAt || 0) < 60000) byId.set(m.id, m);
    }
    state.saved = [...byId.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, 20);
    state.savedErr = null;
  }
  catch (e) { console.error(e); state.saved = []; state.savedErr = e; }
}
const droppedIds = new Set();
function dropSaved(id) {
  if (!id) return Promise.resolve();
  droppedIds.add(id);
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
/* Sauvegarde automatique : dès la première réponse, sans cliquer sur « Sauvegarder ».
   Un même QCM (même mode, même chapitre / domaine / test) n'a qu'une sauvegarde : elle n'est remplacée que si
   le quiz en cours est mieux avancé (plus de questions répondues). */
const answeredOf = x => (x.picks || []).filter(p => p && p.length).length;
const qcmKey = x => JSON.stringify([x.mode || "", x.chapter_id ?? null, x.lab ?? null]);
function autoSave() {
  const z = state.quiz; if (!z) return;
  if (!z.saveId) {
    const done = answeredOf(z); if (!done) return;
    const same = loadSaved().filter(x => qcmKey(x) === qcmKey(z));
    const best = same.reduce((a, x) => (!a || answeredOf(x) > answeredOf(a) ? x : a), null);
    if (best && answeredOf(best) >= done) return;   // la sauvegarde existante est plus avancée : on la garde
    if (best) z.saveId = best.id;                      // on l'écrase (même QCM, moins avancé)
    same.filter(x => x !== best).forEach(x => dropSaved(x.id));
  }
  saveQuiz(true);
}
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
      <span class="opt-key mono">${L}</span><span class="opt-txt" data-tts="opt">${esc(o)}</span>
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
        ${speedActive(z) ? `<span id="speed-clock" class="speed-clock mono" aria-live="off"></span>` : ""}
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
      ${txt.scenario ? `<div class="scenario"><p class="mono kicker">${esc(t("quiz.scenario"))}</p><p data-tts="scenario">${esc(txt.scenario)}</p></div>` : ""}
      <h2 class="q-text" data-tts="q">${esc(txt.question)}</h2>
      ${getLang() === "fr" && !z.peek && !hasFr(q) ? `<p class="hint mono">${esc(t("quiz.untranslated"))}</p>` : ""}
      ${q.multi ? `<p class="hint mono">${esc(t("quiz.multi"))}</p>` : ""}
      <ol class="opts">${opts}</ol>
      ${checked ? `
      <div class="explain ${isOk ? "ok" : "ko"}">
        <div class="verdict-row"><p class="mono verdict">${esc(isOk ? t("quiz.granted") : t("quiz.denied", { a: q.correct.join(", ") }))}</p><div class="speak-row">${speakBtn(q, txt.lang, "answer")}</div></div>
        <p data-tts="exp">${esc(txt.explanation)}</p>
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
  tvSync();
  speedStep();
}

function toggle(L) {
  const z = state.quiz; if (!z || z.checked[z.i]) return;
  const q = z.questions[z.i];
  if (letter(q.options.length - 1) < L) return;
  let p = z.picks[z.i];
  if (q.multi) p = p.includes(L) ? p.filter(x => x !== L) : [...p, L];
  else p = p[0] === L ? [] : [L];
  z.picks[z.i] = p;
  if (z.sp && z.sp.i === z.i) {   // mode Speed : plus de relecture de la question
    z.sp.touched = true;
    if (tv && tv.ok && z.sp.phase === "reading") { tv.link.send({ t: "hush" }); if (z.sp.startCount) z.sp.startCount(); }
  }
  autoSave();
  if (speedActive(z) && !q.multi && p.length) { check(); return; }   // Speed : une seule réponse = validée tout de suite
  renderQuiz();
}
function check() {
  const z = state.quiz; if (!z.picks[z.i].length) return;
  z.checked[z.i] = true; autoSave(); renderQuiz();
  if (speedAfterCheck()) return;   // mode Speed : correction lue puis question suivante
  // lecture automatique de la correction (langue affichée, voix et vitesse déjà choisies)
  if (!autoRead()) return;
  if (tv && tv.ok) { tvSpeak("answer"); return; }   // télé connectée : la lecture se fait sur la télé
  const b = app.querySelector('.speak-row [data-speakmode="answer"]'); if (b) b.click();
}
function move(d) {
  const z = state.quiz;
  speedReset();
  z.i = Math.min(z.questions.length - 1, Math.max(0, z.i + d));
  z.peek = false;
  autoSave();
  renderQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function finishQuiz() {
  const z = state.quiz; if (!z) return;
  speedReset();
  stopTimer();
  const details = z.questions.map((q, k) => ({ q, picks: z.picks[k], ok: sameSet(z.picks[k], q.correct) }));
  const correct = details.filter(d => d.ok).length;
  const duration = Math.floor((Date.now() - z.startedAt) / 1000);
  state.lastResult = { label: z.label, mode: z.mode, chapter_id: z.chapter_id, details, correct, total: details.length, duration, saved: false, opts: z };
  state.quiz = null;
  clearTimeout(saveTimer); savePending = null;
  await dropSaved(z.saveId);  // quiz terminé : la sauvegarde de reprise n'a plus lieu d'être
  // On n'enregistre que les questions répondues (sauf examen : toutes comptent).
  const toSave = details.filter((d, k) => z.mode === "exam" || d.picks.length || (z.timeouts && z.timeouts[k]));
  try {
    await state.store.saveAttempt(
      { mode: z.mode, chapter_id: z.chapter_id, total: details.length, correct, duration_s: duration },
      toSave.map(d => ({ question_id: d.q.id, selected: d.picks, is_correct: d.ok })));
    state.lastResult.saved = true;
    await refreshProgress();
    exportAuto();
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
      ${txt.scenario ? `<p class="muted small" data-tts="scenario">${esc(txt.scenario)}</p>` : ""}
      <p class="q-text-sm" data-tts="q">${esc(txt.question)}</p>
      <ol class="opts opts-sm">${txt.options.map((o, i) => {
        const L = letter(i); const c = d.q.correct.includes(L); const s = d.picks.includes(L);
        return `<li class="${c ? "correct" : s ? "wrong" : ""}"><span class="opt-key mono">${L}</span> <span data-tts="opt">${esc(o)}</span> ${s ? `<span class="mono muted">${esc(t("res.yourChoice"))}</span>` : ""}</li>`;
      }).join("")}</ol>
      <p class="muted">${d.picks.length ? "" : `<em>${esc(t("res.noAnswer"))}</em> `}<span data-tts="exp">${esc(txt.explanation)}</span></p>
      <div class="review-tools">${speakBtn(d.q, txt.lang, "all")} ${speakBtn(d.q, txt.lang, "answer")} ${flagBtn(d.q)}</div>
    </details>`;
  }).join("");

  app.innerHTML = `
  <section class="results">
    <div class="panel score-panel ${pass ? "pass" : "fail"}">
      <p class="mono kicker">${esc(r.label())}</p>
      <h1 class="glitch">${esc(t(pass ? "res.pass" : "res.fail"))}</h1>
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
