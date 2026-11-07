/* Voix naturelles Piper, calculées sur l'appareil (Web Worker).
 *  - moteur : onnxruntime-web (WASM, 1 fil) + piper_phonemize (espeak-ng compilé en WASM), dans vendor/piper/ ;
 *  - voix : fichiers .onnx de rhasspy/piper-voices (Hugging Face), téléchargés une fois puis gardés
 *    dans le cache du navigateur (« piper-v1 ») : ensuite tout marche hors ligne.
 * Messages reçus  : {id, cmd:"load"|"fetch", voice}  {id, cmd:"cancel"}  {id, cmd:"synth", voice, text, rate}  {id, cmd:"stored", voices}
 *                   {id, cmd:"remove", voices}
 * Messages envoyés : {id, ok, ...} ou {id, error} ; pendant un téléchargement : {type:"progress", voice, loaded, total}
 */
const VENDOR = new URL("../vendor/piper/", self.location.href).href;
const HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main/";
const CACHE = "piper-v1";
// Le moteur lui-même (≈ 29 Mo) est aussi gardé dans « piper-v1 » : la voix marche hors ligne même sans le mode hors ligne du site.
const ENGINE = ["ort.wasm.min.js", "ort-wasm-simd.wasm", "piper_phonemize.js", "piper_phonemize.wasm", "piper_phonemize.data"];
let ORT = null, engine = null;
const blobUrl = (buf, type) => URL.createObjectURL(new Blob([buf], { type }));
function loadEngine(onProgress) {
  if (!engine) {
    engine = (async () => {
      const bufs = {};
      let done = 0;
      for (const f of ENGINE) {
        bufs[f] = await cachedBuffer(VENDOR + f, (l, t) => onProgress && onProgress(done + l, 0));
        done += bufs[f].byteLength;
      }
      importScripts(blobUrl(bufs["ort.wasm.min.js"], "text/javascript"), blobUrl(bufs["piper_phonemize.js"], "text/javascript"));
      ORT = self.ort;
      ORT.env.wasm.numThreads = 1;          // pas d'isolation cross-origin sur GitHub Pages
      ORT.env.wasm.wasmPaths = { "ort-wasm-simd.wasm": blobUrl(bufs["ort-wasm-simd.wasm"], "application/wasm") };
      return { wasm: bufs["piper_phonemize.wasm"], data: bufs["piper_phonemize.data"] };
    })();
    engine.catch(() => { engine = null; });
  }
  return engine;
}

const voices = {};     // clé -> Promise<{session, cfg}>

/** Chemin Hugging Face d'une voix : « fr_FR-siwis-medium » -> fr/fr_FR/siwis/medium/fr_FR-siwis-medium */
function voicePath(key) {
  const [loc, name, q] = key.split("-");
  return `${loc.split("_")[0]}/${loc}/${name}/${q}/${key}`;
}
const urls = key => [HF + voicePath(key) + ".onnx.json", HF + voicePath(key) + ".onnx"];

/** Lit une URL depuis le cache, sinon la télécharge (avec progression) et la met en cache. */
async function cachedBuffer(url, onProgress) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return hit.arrayBuffer();
  const resp = await fetch(url, { mode: "cors" });
  if (!resp.ok) throw new Error("HTTP " + resp.status + " " + url);
  const total = +resp.headers.get("content-length") || 0;
  const reader = resp.body.getReader(), chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    if (onProgress) onProgress(loaded, total);
  }
  const blob = new Blob(chunks);
  await cache.put(url, new Response(blob, { headers: { "content-type": "application/octet-stream" } }));
  return blob.arrayBuffer();
}

function loadVoice(key) {
  if (!voices[key]) {
    voices[key] = (async () => {
      const [cfgUrl, modelUrl] = urls(key);
      const cfg = JSON.parse(new TextDecoder().decode(await cachedBuffer(cfgUrl)));
      await loadEngine(loaded => postMessage({ type: "progress", voice: "engine", loaded, total: 29.6e6 }));
      const model = await cachedBuffer(modelUrl, (loaded, total) => postMessage({ type: "progress", voice: key, loaded, total }));
      // une seule voix en mémoire à la fois (la voix anglaise « high » pèse lourd sur un téléphone)
      for (const k in voices) if (k !== key) { voices[k].then(v => v.session.release && v.session.release()).catch(() => {}); delete voices[k]; }
      const session = await ORT.InferenceSession.create(model, { executionProviders: ["wasm"] });
      return { session, cfg };
    })();
    voices[key].catch(() => { delete voices[key]; });
  }
  return voices[key];
}

/** Texte -> identifiants de phonèmes (espeak-ng). Le module est recréé à chaque appel (callMain ne se rappelle pas). */
async function phonemeIds(text, espeakVoice) {
  const { wasm, data } = await loadEngine();
  return new Promise((resolve, reject) => {
    let out = "";
    createPiperPhonemize({
      wasmBinary: wasm,
      getPreloadedPackage: () => data.slice(0),
      locateFile: f => VENDOR + f,
      print: line => { out += line; },
      printErr: () => {},
      noExitRuntime: false,
    }).then(m => {
      try {
        m.callMain(["-l", espeakVoice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
        resolve(JSON.parse(out).phoneme_ids);
      } catch (e) { reject(e); }
    }, reject);
  });
}

async function synth(key, text, rate) {
  const { session, cfg } = await loadVoice(key);
  const ids = await phonemeIds(text, cfg.espeak.voice);
  const inf = cfg.inference || {};
  const feeds = {
    input: new ORT.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ORT.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ORT.Tensor("float32", Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / (rate || 1), inf.noise_w ?? 0.8]), [3]),
  };
  if (cfg.num_speakers > 1) feeds.sid = new ORT.Tensor("int64", BigInt64Array.from([0n]), [1]);
  const { output } = await session.run(feeds);
  return { pcm: output.data, sampleRate: cfg.audio.sample_rate };
}

async function stored(keys) {
  const cache = await caches.open(CACHE), res = {};
  for (const k of keys) res[k] = !!(await cache.match(urls(k)[1])) && !!(await cache.match(VENDOR + ENGINE[ENGINE.length - 1]));
  return res;
}
async function remove(keys, e_all) {
  const cache = await caches.open(CACHE);
  for (const k of keys) { for (const u of urls(k)) await cache.delete(u); delete voices[k]; }
  if (e_all) for (const f of ENGINE) await cache.delete(VENDOR + f);
}

/** Téléchargement seul (moteur + voix), sans charger le modèle en mémoire. */
async function fetchVoice(key) {
  await loadEngine(loaded => postMessage({ type: "progress", voice: "engine", loaded, total: 29.6e6 }));
  const [cfgUrl, modelUrl] = urls(key);
  await cachedBuffer(cfgUrl);
  await cachedBuffer(modelUrl, (loaded, total) => postMessage({ type: "progress", voice: key, loaded, total }));
}

// Les synthèses passent une par une ; « cancel » abandonne celles qui attendent encore.
let queue = Promise.resolve(), cancelBefore = 0;
self.onmessage = async e => {
  const { id, cmd } = e.data;
  try {
    if (cmd === "cancel") { cancelBefore = id; return; }
    if (cmd === "load") { await loadVoice(e.data.voice); postMessage({ id, ok: true }); }
    else if (cmd === "fetch") { await fetchVoice(e.data.voice); postMessage({ id, ok: true }); }
    else if (cmd === "synth") {
      const job = queue.then(() => {
        if (id < cancelBefore) throw new Error("cancelled");
        return synth(e.data.voice, e.data.text, e.data.rate);
      });
      queue = job.catch(() => {});
      const { pcm, sampleRate } = await job;
      postMessage({ id, ok: true, pcm, sampleRate }, [pcm.buffer]);
    }
    else if (cmd === "stored") postMessage({ id, ok: true, stored: await stored(e.data.voices) });
    else if (cmd === "remove") { await remove(e.data.voices, e.data.engine); postMessage({ id, ok: true }); }
  } catch (err) {
    postMessage({ id, error: String(err && err.message || err) });
  }
};
