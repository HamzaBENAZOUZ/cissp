// Couche données : Supabase (production) ou navigateur (mode local).
// Les deux exposent la même interface.

const DOMAIN_OF = {1:1,2:1,3:1,4:1,5:2,6:3,7:3,8:3,9:3,10:3,11:4,12:4,13:5,14:5,15:6,16:7,17:7,18:7,19:7,20:8,21:8};

/** Garde, pour chaque question, uniquement la réponse la plus récente. */
export function latestByQuestion(answers) {
  const map = new Map();
  for (const a of answers) {
    const prev = map.get(a.question_id);
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) map.set(a.question_id, a);
  }
  return map;
}

// ------------------------------------------------------------------ Supabase
export class SupabaseStore {
  constructor(url, key) {
    this.kind = "supabase";
    this.sb = window.supabase.createClient(url, key);
  }
  async session() {
    const { data } = await this.sb.auth.getSession();
    return data.session;
  }
  onAuth(cb) { this.sb.auth.onAuthStateChange((_e, s) => cb(s)); }
  async signIn(email, password) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async signUp(email, password) {
    const redirect = location.origin + location.pathname;
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
    if (error) throw error;
    return data.session ? "signed-in" : "check-email";
  }
  async resetPassword(email) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  async updatePassword(password) {
    const { error } = await this.sb.auth.updateUser({ password });
    if (error) throw error;
  }
  async signOut() { await this.sb.auth.signOut(); }

  async loadContent() {
    const [ch, qs] = await Promise.all([
      this.sb.from("chapters").select("*").order("id"),
      this.sb.from("questions").select("*").order("chapter_id").order("number").range(0, 4999),
    ]);
    if (ch.error) throw ch.error;
    if (qs.error) throw qs.error;
    return { chapters: ch.data, questions: qs.data };
  }
  async attempts() {
    const { data, error } = await this.sb.from("attempts").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  }
  async answers() {
    const { data, error } = await this.sb.from("answers")
      .select("question_id,is_correct,created_at").order("created_at", { ascending: false }).range(0, 9999);
    if (error) throw error;
    return data;
  }
  async saveAttempt(attempt, answers) {
    const { data, error } = await this.sb.from("attempts").insert(attempt).select("id").single();
    if (error) throw error;
    if (answers.length) {
      const rows = answers.map(a => ({ ...a, attempt_id: data.id }));
      const r = await this.sb.from("answers").insert(rows);
      if (r.error) throw r.error;
    }
    return data.id;
  }
  async resetProgress() {
    const s = await this.session();
    const { error } = await this.sb.from("attempts").delete().eq("user_id", s.user.id);
    if (error) throw error;
  }
}

// ------------------------------------------------------------------ Local
const LS_KEY = "cissp-qcm-progress-v1";

export class LocalStore {
  constructor(dataUrl) {
    this.kind = "local";
    this.dataUrl = dataUrl;
  }
  _read() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { attempts: [], answers: [] }; }
    catch { return { attempts: [], answers: [] }; }
  }
  _write(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
  async session() { return { user: { email: "mode local" } }; }
  onAuth() {}
  async signOut() {}

  async loadContent() {
    const res = await fetch(this.dataUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Impossible de lire ${this.dataUrl} (HTTP ${res.status}). Configurez Supabase dans js/config.js ou ajoutez le fichier local.`);
    const raw = await res.json();
    const chapters = raw.map(c => ({ id: c.chapter, title: c.title, title_fr: c.title_fr || null, domain: DOMAIN_OF[c.chapter] }));
    const questions = [];
    for (const c of raw) for (const q of c.questions) {
      questions.push({
        id: c.chapter * 1000 + q.n, chapter_id: c.chapter, number: q.n, question: q.q,
        options: q.opts, correct: q.ans, explanation: q.exp,
        multi: q.ans.length > 1 || /choose all that apply/i.test(q.q),
        question_fr: q.q_fr || null, options_fr: q.opts_fr || null, explanation_fr: q.exp_fr || null,
      });
    }
    return { chapters, questions };
  }
  async attempts() { return [...this._read().attempts].sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  async answers() { return this._read().answers; }
  async saveAttempt(attempt, answers) {
    const db = this._read();
    const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
    const now = new Date().toISOString();
    db.attempts.push({ ...attempt, id, created_at: now });
    for (const a of answers) db.answers.push({ ...a, attempt_id: id, created_at: now });
    this._write(db);
    return id;
  }
  async resetProgress() { this._write({ attempts: [], answers: [] }); }
}
