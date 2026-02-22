/* PhonoCoach FR – MVP (front-end only)
   Fix important: IDs IPA encodés/décodés dans le hash router.
*/

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

/* -----------------------------
   Données: sons (MVP)
------------------------------ */
const SOUND_CATEGORIES = [
  { id:"nasales", label:"Voyelles nasales", hint:"/ɑ̃ ɛ̃ ɔ̃ œ̃/", emoji:"🌫️" },
  { id:"midvowels", label:"Voyelles moyennes", hint:"/e~ɛ, ø~œ, o~ɔ/", emoji:"🎯" },
  { id:"endings", label:"Terminaisons", hint:"-ent, -eux/-eur", emoji:"🧩" },
  { id:"liaison", label:"Liaison", hint:"bientôt", emoji:"🔗", disabled:true },
];

const SOUNDS = [
  {
    id:"an-ɑ̃",
    cat:"nasales",
    title:"AN / EN",
    ipa:"/ɑ̃/",
    articulatory:"Bouche assez ouverte, langue basse; air qui sort par le nez (nasal). Le n/m écrit ne se prononce pas comme consonne séparée.",
    spellings:["an","en","am","em"],
    examples:["sans","dans","enfant","temps"],
    practicePrompts:["an","en","sans","dans","enfant","temps"],
    readingText:"Dans le grand vent, un enfant attend en chantant, sans trop penser au temps.",
    minimalPairs:[
      {a:"sans", b:"son", note:"/ɑ̃/ vs /ɔ̃/"},
      {a:"lent", b:"lait", note:"nasal vs oral (approx)"},
    ],
  },
  {
    id:"on-ɔ̃",
    cat:"nasales",
    title:"ON",
    ipa:"/ɔ̃/",
    articulatory:"Lèvres plutôt arrondies, voyelle arrière; nasalité marquée.",
    spellings:["on","om"],
    examples:["son","mon","bonbon","tombe"],
    practicePrompts:["on","son","mon","bon","bonbon","tombe"],
    readingText:"Mon oncle a un bon ton: il raconte une histoire longue, puis répond “non”.",
    minimalPairs:[
      {a:"son", b:"sans", note:"/ɔ̃/ vs /ɑ̃/"},
      {a:"bon", b:"beau", note:"nasal vs /o/"},
    ],
  },
  {
    id:"in-ɛ̃",
    cat:"nasales",
    title:"IN / IM / AIN / EIN",
    ipa:"/ɛ̃/",
    articulatory:"Voyelle plus “devant”; nasalité; bouche moins ouverte que /ɑ̃/.",
    spellings:["in","im","ain","ein","yn","ym"],
    examples:["vin","pain","plein","important"],
    practicePrompts:["in","vin","pain","plein","important"],
    readingText:"Un pain bien chaud, du vin fin, et un matin plein de soleil.",
    minimalPairs:[
      {a:"vin", b:"vent", note:"/ɛ̃/ vs /ɑ̃/"},
      {a:"pain", b:"pont", note:"/ɛ̃/ vs /ɔ̃/"},
    ],
  },
  {
    id:"eu-øœ",
    cat:"midvowels",
    title:"EU / ŒU (peu vs peur)",
    ipa:"/ø/ ~ /œ/",
    articulatory:"Lèvres arrondies, langue moyenne. Objectif: distinguer “peu” et “peur”.",
    spellings:["eu","œu","eû"],
    examples:["peu","peur","deux","heure"],
    practicePrompts:["peu","peur","deux","heure","heureusement"],
    readingText:"Peu à peu, il a moins peur; à deux, ils restent heureux une heure de plus.",
    minimalPairs:[
      {a:"peu", b:"peur", note:"/ø/ vs /œ/"},
      {a:"deux", b:"d’heure", note:"approx /ø/ vs /œ/"},
    ],
  },
  {
    id:"ent-muet",
    cat:"endings",
    title:"-ENT (verbes -er)",
    ipa:"(muet)",
    articulatory:"Dans beaucoup de verbes en -er au présent (ils parlent), “-ent” ne se prononce pas.",
    spellings:["-ent"],
    examples:["ils parlent","elles regardent","ils chantent"],
    practicePrompts:["ils parlent","elles regardent","ils chantent","elles aiment"],
    readingText:"Ils parlent et elles regardent; ils chantent, puis ils mangent et ils rentrent.",
    minimalPairs:[
      {a:"il parle", b:"ils parlent", note:"souvent identique à l’oral"},
      {a:"il chante", b:"ils chantent", note:"souvent identique à l’oral"},
    ],
  },
  {
    id:"eux-eur",
    cat:"endings",
    title:"-EUX / -EUR / -EUSE",
    ipa:"/ø/ ~ /œ/ (selon mot)",
    articulatory:"Famille orthographique utile pour automatiser le bon “EU”. Pratique en mots + en contexte.",
    spellings:["-eux","-eur","-euse"],
    examples:["heureux","chanteur","chanteuse","travailleur"],
    practicePrompts:["heureux","chanteur","chanteuse","travailleur","travailleuse"],
    readingText:"Le chanteur est heureux; la chanteuse a peur, puis peu à peu elle devient plus sûre.",
    minimalPairs:[
      {a:"heureux", b:"heure", note:"famille EU"},
      {a:"chanteur", b:"chanteuse", note:"variation en contexte"},
    ],
  },
];

const DEFAULTS = {
  theme: "dark",
  ttsVoice: "auto",
  provider: "none", // none | proxy
  proxyUrl: "",
  openrouterKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  azureKey: "",
  azureRegion: "",
  speechaceKey: "",
};

const STORE_KEYS = {
  settings: "phonocoach_settings_v1",
  scores: "phonocoach_scores_v1",
};

function safeJson(str, fallback){
  try { return JSON.parse(str); } catch { return fallback; }
}

function loadSettings(){
  const raw = localStorage.getItem(STORE_KEYS.settings);
  const obj = raw ? safeJson(raw, {}) : {};
  return {...DEFAULTS, ...obj};
}
function saveSettings(s){
  localStorage.setItem(STORE_KEYS.settings, JSON.stringify(s));
}

function loadScores(){
  const raw = localStorage.getItem(STORE_KEYS.scores);
  return raw ? safeJson(raw, {}) : {};
}
function saveScores(scores){
  localStorage.setItem(STORE_KEYS.scores, JSON.stringify(scores));
}
function updateScore(soundId, newScore){
  const scores = loadScores();
  const prev = scores[soundId] || { best: 0, last: 0, attempts: 0, updatedAt: 0 };
  const best = Math.max(prev.best || 0, newScore);
  scores[soundId] = {
    best,
    last: newScore,
    attempts: (prev.attempts || 0) + 1,
    updatedAt: Date.now(),
  };
  saveScores(scores);
}

/* -----------------------------
   PWA
------------------------------ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

/* -----------------------------
   Routing (hash) — FIX IPA IDs
------------------------------ */
const view = $("#view");
const subtitle = $("#subtitle");
const btnBack = $("#btnBack");
const btnSettings = $("#btnSettings");
const btnTheme = $("#btnTheme");
const toast = $("#toast");

function setSubtitle(t){ subtitle.textContent = t || "Pratique des sons"; }

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 2200);
}

function navigate(hash){
  location.hash = hash;
}
function currentHash(){
  return location.hash || "#/";
}

// IMPORTANT: decodeURIComponent sur chaque segment
function parseRoute(hash){
  const h = hash.replace(/^#/, "");
  const parts = h.split("/").filter(Boolean).map(p => decodeURIComponent(p));
  const [a,b,c] = parts;
  return { a: a||"", b: b||"", c: c||"" };
}

function setActiveNav(){
  const h = currentHash();
  $$(".navbtn").forEach(btn=>{
    const target = btn.getAttribute("data-nav");
    btn.classList.toggle("active", target === h || (target !== "#/" && h.startsWith(target)));
  });
}

window.addEventListener("hashchange", render);
btnBack.addEventListener("click", () => history.back());
btnSettings.addEventListener("click", ()=> navigate("#/settings"));

btnTheme.addEventListener("click", ()=>{
  const s = loadSettings();
  const next = (document.documentElement.getAttribute("data-theme") === "light") ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  s.theme = next;
  saveSettings(s);
  btnTheme.textContent = next === "dark" ? "🌙" : "☀️";
});

$$(".navbtn").forEach(btn=>{
  btn.addEventListener("click", ()=> navigate(btn.getAttribute("data-nav")));
});

/* -----------------------------
   Thème init
------------------------------ */
(function initTheme(){
  const s = loadSettings();
  document.documentElement.setAttribute("data-theme", s.theme || "dark");
  btnTheme.textContent = (s.theme || "dark") === "dark" ? "🌙" : "☀️";
})();

/* -----------------------------
   Audio (MediaRecorder)
------------------------------ */
async function getMicStream(){
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

function pickBestMimeType(){
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4"
  ];
  return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}

async function startRecorder(maxMs=12000){
  const stream = await getMicStream();
  const mimeType = pickBestMimeType();
  const rec = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
  const chunks = [];
  let stopped = false;

  const stopAll = () => stream.getTracks().forEach(t=>t.stop());
  rec.ondataavailable = (e)=> { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start();

  const timer = setTimeout(()=>{ if(!stopped) rec.stop(); }, maxMs);

  return {
    stop: () => { if(!stopped) rec.stop(); },
    wait: () => new Promise((resolve)=>{
      rec.onstop = ()=>{
        stopped = true;
        clearTimeout(timer);
        stopAll();
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        resolve({ blob, mimeType: rec.mimeType || blob.type || "audio/webm" });
      };
    })
  };
}

function blobToObjectUrl(blob){
  return URL.createObjectURL(blob);
}

/* -----------------------------
   TTS (navigator speechSynthesis)
------------------------------ */
function listFrenchVoices(){
  const voices = speechSynthesis.getVoices() || [];
  return voices.filter(v => /fr(-|_)?/i.test(v.lang || "") || /French/i.test(v.name || ""));
}

function speakText(text){
  const s = loadSettings();
  if (!("speechSynthesis" in window)){
    showToast("TTS non supporté sur ce navigateur.");
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  const frVoices = listFrenchVoices();
  if (s.ttsVoice && s.ttsVoice !== "auto"){
    const v = frVoices.find(v=> v.voiceURI === s.ttsVoice) || frVoices.find(v=> v.name === s.ttsVoice);
    if (v) u.voice = v;
  } else {
    u.voice = frVoices.find(v=> /fr-CA/i.test(v.lang)) || frVoices.find(v=> /fr-FR/i.test(v.lang)) || frVoices[0] || null;
  }
  u.rate = 1.0;
  u.pitch = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* -----------------------------
   Providers (placeholder)
------------------------------ */
async function scoreWithProvider({ audioBlob, referenceText, mode, soundId }){
  const s = loadSettings();

  if (s.provider === "none"){
    return { ok:true, provider:"none", overallScore:null, details:null, note:"Scoring désactivé." };
  }

  if (s.provider === "proxy"){
    if (!s.proxyUrl){
      return { ok:false, error:"Proxy URL manquante (Paramètres → Proxy URL)." };
    }
    const fd = new FormData();
    fd.append("mode", mode || "practice");
    fd.append("referenceText", referenceText || "");
    fd.append("soundId", soundId || "");
    fd.append("providerHint", inferProviderHint(s));
    fd.append("audio", audioBlob, "audio.webm");

    // (optionnel) si tu veux forward key côté proxy (pas recommandé)
    if (s.azureKey) fd.append("azureKey", s.azureKey);
    if (s.azureRegion) fd.append("azureRegion", s.azureRegion);
    if (s.speechaceKey) fd.append("speechaceKey", s.speechaceKey);

    const resp = await fetch(s.proxyUrl.replace(/\/$/,"") + "/score", { method:"POST", body: fd });
    if (!resp.ok){
      const t = await resp.text().catch(()=> "");
      return { ok:false, error:`Proxy error: ${resp.status} ${t.slice(0,180)}` };
    }
    const data = await resp.json().catch(()=>null);
    if (!data) return { ok:false, error:"Réponse proxy invalide (JSON)." };

    return {
      ok:true,
      provider: data.provider || "proxy",
      overallScore: data.overallScore ?? null,
      details: data.details ?? null,
      raw: data
    };
  }

  return { ok:false, error:"Provider inconnu." };
}

function inferProviderHint(s){
  if (s.azureKey && s.azureRegion) return "azure";
  if (s.speechaceKey) return "speechace";
  return "auto";
}

/* -----------------------------
   OpenRouter (feedback + texte)
------------------------------ */
async function callOpenRouter(messages, {temperature=0.3}={}){
  const s = loadSettings();
  if (!s.openrouterKey) return { ok:false, error:"OpenRouter key manquante." };

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": `Bearer ${s.openrouterKey}`,
    },
    body: JSON.stringify({
      model: s.openrouterModel || DEFAULTS.openrouterModel,
      temperature,
      messages,
    })
  });

  if (!resp.ok){
    const t = await resp.text().catch(()=> "");
    return { ok:false, error:`OpenRouter error: ${resp.status} ${t.slice(0,220)}` };
  }
  const data = await resp.json().catch(()=>null);
  const text = data?.choices?.[0]?.message?.content || "";
  return { ok:true, text, raw:data };
}

async function generateCoachFeedback({sound, referenceText, scoreResult, userNote=""}){
  const s = loadSettings();
  if (!s.openrouterKey){
    return { ok:true, text:"Astuce: enregistre-toi, réécoute, puis compare avec le TTS. Recommence 3 fois en exagérant légèrement l’articulation." };
  }

  const sys = `Tu es un coach de prononciation du français. Conseils courts, concrets, actionnables.`;
  const user = {
    role:"user",
    content:
`Son cible: ${sound.title} (${sound.ipa})
Description: ${sound.articulatory}
Référence: ${referenceText || "(aucun)"}
Scoring: ${JSON.stringify({
  overallScore: scoreResult?.overallScore ?? null,
  details: scoreResult?.details ?? null,
  provider: scoreResult?.provider ?? null
}).slice(0,1600)}
Note: ${userNote || "(aucune)"}

Donne:
- 3 observations max
- 3 corrections physiques (langue/lèvres/air/rythme)
- 3 mini-exercices (10–20 sec)
Pas de blabla.`
  };

  return await callOpenRouter([{role:"system", content:sys}, user], {temperature:0.2});
}

async function generateTargetedReading(sound){
  const s = loadSettings();
  if (!s.openrouterKey){
    return { ok:true, text: sound.readingText };
  }
  const sys = `Tu écris des mini-textes A2–B1 en français, naturels et agréables à lire à voix haute.`;
  const user = {
    role:"user",
    content:
`Écris un texte de 2–3 phrases max qui contient beaucoup d'occurrences de ce son:
Son/graphies: ${sound.title} (${sound.ipa}) | graphies: ${(sound.spellings||[]).join(", ")}
Vocabulaire facile. Retourne uniquement le texte.`
  };
  const r = await callOpenRouter([{role:"system", content:sys}, user], {temperature:0.5});
  return r.ok ? r : { ok:true, text: sound.readingText };
}

/* -----------------------------
   Helpers
------------------------------ */
function scoreToPct(score){
  if (score === null || score === undefined) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

/* -----------------------------
   Rendering
------------------------------ */
function render(){
  setActiveNav();
  const r = parseRoute(currentHash());

  btnBack.style.visibility = (currentHash() === "#/" || currentHash() === "") ? "hidden" : "visible";

  if (r.a === "" ){ renderHome(); return; }
  if (r.a === "dashboard"){ renderDashboard(); return; }
  if (r.a === "settings"){ renderSettings(); return; }
  if (r.a === "test"){ renderTest(); return; }
  if (r.a === "category" && r.b){ renderCategory(r.b); return; }
  if (r.a === "sound" && r.b){ renderSound(r.b); return; }

  renderHome();
}

function renderHome(){
  setSubtitle("Accueil");
  const settings = loadSettings();

  view.innerHTML = `
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="h1">Catégories</div>
          <div class="grid" id="catGrid"></div>

          <div class="hr"></div>
          <div class="btnrow">
            <button class="btn primary" id="goDashboard">Mes scores</button>
            <button class="btn" id="goTest">Test rapide</button>
            <button class="btn" id="goSettings">Paramètres</button>
          </div>

          <div class="hr"></div>
          <div class="row">
            <div class="col"><div class="badge">Thème <strong>${settings.theme === "dark" ? "Sombre" : "Clair"}</strong></div></div>
            <div class="col"><div class="badge">Scoring <strong>${settings.provider}</strong></div></div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card">
          <div class="h1">Commencer</div>
          <p class="p">Choisis une catégorie → un son → <strong>Pratique</strong> ou <strong>Lecture</strong>.</p>
          <div class="grid">
            <div class="item" id="quick1">
              <div class="label">🎧 Écoute</div>
              <div class="meta">TTS navigateur</div>
            </div>
            <div class="item" id="quick2">
              <div class="label">🎙️ Enregistre</div>
              <div class="meta">Réécoute instant</div>
            </div>
            <div class="item" id="quick3">
              <div class="label">📈 Score</div>
              <div class="meta">Proxy (optionnel)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const grid = $("#catGrid");
  SOUND_CATEGORIES.forEach(cat=>{
    const el = document.createElement("div");
    el.className = "item";
    el.style.opacity = cat.disabled ? "0.55" : "1";
    el.innerHTML = `
      <div class="label">${cat.emoji} ${cat.label}</div>
      <div class="meta">${cat.hint}</div>
    `;
    el.addEventListener("click", ()=>{
      if (cat.disabled){
        showToast("Bientôt 🙂");
        return;
      }
      navigate(`#/category/${encodeURIComponent(cat.id)}`);
    });
    grid.appendChild(el);
  });

  $("#goDashboard").onclick = ()=> navigate("#/dashboard");
  $("#goTest").onclick = ()=> navigate("#/test");
  $("#goSettings").onclick = ()=> navigate("#/settings");

  $("#quick1").onclick = ()=> showToast("Astuce: écoute puis imite ✨");
  $("#quick2").onclick = ()=> showToast("Astuce: enregistre 3 fois 🔁");
  $("#quick3").onclick = ()=> showToast("Astuce: proxy = scores 🔐");
}

function renderCategory(catId){
  const cat = SOUND_CATEGORIES.find(c=>c.id===catId);
  setSubtitle(cat ? cat.label : "Catégorie");

  const sounds = SOUNDS.filter(s=>s.cat===catId);
  view.innerHTML = `
    <div class="card">
      <div class="h1">${cat?.emoji || "🔎"} ${cat?.label || "Catégorie"}</div>
      <div class="grid" id="soundGrid"></div>
    </div>
  `;
  const grid = $("#soundGrid");
  sounds.forEach(sound=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="label">${sound.title}</div>
      <div class="meta">${sound.ipa} • ${(sound.examples||[]).slice(0,2).join(", ")}</div>
    `;
    el.onclick = ()=> navigate(`#/sound/${encodeURIComponent(sound.id)}`);
    grid.appendChild(el);
  });
}

function renderDashboard(){
  setSubtitle("Scores");
  const scores = loadScores();

  const rows = SOUNDS.map(s=>{
    const sc = scores[s.id] || null;
    const best = sc?.best ?? 0;
    const last = sc?.last ?? null;
    const attempts = sc?.attempts ?? 0;
    return { sound:s, best, last, attempts };
  }).sort((a,b)=> (b.best - a.best) || (b.attempts - a.attempts));

  view.innerHTML = `
    <div class="card">
      <div class="h1">Mes scores</div>

      <table class="table">
        <thead>
          <tr>
            <th>Son</th>
            <th>IPA</th>
            <th>Meilleur</th>
            <th>Dernier</th>
            <th>#</th>
          </tr>
        </thead>
        <tbody id="scoreBody"></tbody>
      </table>

      <div class="hr"></div>
      <div class="btnrow">
        <button class="btn danger" id="resetScores">Réinitialiser</button>
      </div>
      <p class="small">Stocké localement (localStorage).</p>
    </div>
  `;

  const body = $("#scoreBody");
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="clicklink" data-sid="${escapeHtml(r.sound.id)}">${escapeHtml(r.sound.title)}</span></td>
      <td>${escapeHtml(r.sound.ipa)}</td>
      <td><strong>${Math.round(r.best)}%</strong></td>
      <td>${r.last===null ? "—" : `${Math.round(r.last)}%`}</td>
      <td>${r.attempts}</td>
    `;
    body.appendChild(tr);
  });

  $$(".clicklink").forEach(el=>{
    el.onclick = ()=> navigate(`#/sound/${encodeURIComponent(el.getAttribute("data-sid"))}`);
  });

  $("#resetScores").onclick = ()=>{
    if (!confirm("Réinitialiser tous les scores ?")) return;
    localStorage.removeItem(STORE_KEYS.scores);
    showToast("OK");
    renderDashboard();
  };
}

function renderSound(soundId){
  const sound = SOUNDS.find(s=>s.id===soundId);
  if (!sound){ renderHome(); return; }
  setSubtitle(sound.title);

  const scores = loadScores();
  const sc = scores[soundId] || { best:0, last:null, attempts:0 };
  const best = Math.round(sc.best || 0);
  const last = sc.last===null || sc.last===undefined ? null : Math.round(sc.last);
  const attempts = sc.attempts || 0;

  view.innerHTML = `
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="h1">${escapeHtml(sound.title)} <span class="badge"><strong>${escapeHtml(sound.ipa)}</strong></span></div>

          <div class="row">
            <div class="col">
              <div class="badge">Meilleur <strong>${best}%</strong></div>
              <div class="badge">Dernier <strong>${last===null?"—":last+"%"}</strong></div>
              <div class="badge">Essais <strong>${attempts}</strong></div>
            </div>
            <div class="col">
              <div class="scorebar"><div style="width:${best}%"></div></div>
              <div class="small" style="margin-top:8px;">
                Graphies: <span class="kbd">${(sound.spellings||[]).map(escapeHtml).join(" • ")}</span>
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="btnrow">
            <button class="btn primary" id="tabPractice">Pratique</button>
            <button class="btn" id="tabReading">Lecture</button>
            <button class="btn" id="tabExtras">Exercices</button>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card" id="modeCard"></div>
      </div>
    </div>
  `;

  $("#tabPractice").onclick = ()=> renderModePractice(sound);
  $("#tabReading").onclick = ()=> renderModeReading(sound);
  $("#tabExtras").onclick = ()=> renderModeExtras(sound);
  renderModePractice(sound);
}

function renderModePractice(sound){
  const modeCard = $("#modeCard");
  modeCard.innerHTML = `
    <div class="h2">Pratique</div>

    <div class="field">
      <label>Prompt</label>
      <select id="practicePrompt"></select>
    </div>

    <div class="btnrow">
      <button class="btn" id="btnSpeak">Écouter</button>
      <button class="btn primary" id="btnRec">🎙️ Enregistrer</button>
      <button class="btn" id="btnStop" disabled>Stop</button>
    </div>

    <audio class="audio" id="audioPlayback" controls style="display:none"></audio>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnScore" disabled>Score</button>
      <button class="btn" id="btnCoach" disabled>Feedback IA</button>
    </div>

    <div id="result" class="small" style="margin-top:10px;"></div>
    <div id="coach" class="p" style="white-space:pre-wrap; margin-top:10px;"></div>
  `;

  const sel = $("#practicePrompt");
  (sound.practicePrompts || []).forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });

  let recorder = null;
  let lastBlob = null;
  let lastScoreResult = null;

  $("#btnSpeak").onclick = ()=> speakText(sel.value);

  $("#btnRec").onclick = async ()=>{
    try{
      recorder = await startRecorder(10000);
      $("#btnRec").disabled = true;
      $("#btnStop").disabled = false;
      showToast("Enregistrement…");
    }catch{
      alert("Micro refusé ou indisponible.");
    }
  };

  $("#btnStop").onclick = async ()=>{
    if (!recorder) return;
    $("#btnStop").disabled = true;
    recorder.stop();
    const { blob } = await recorder.wait();
    lastBlob = blob;
    recorder = null;

    const url = blobToObjectUrl(blob);
    const a = $("#audioPlayback");
    a.src = url;
    a.style.display = "block";

    $("#btnRec").disabled = false;
    $("#btnScore").disabled = false;
    $("#btnCoach").disabled = true;
    $("#result").textContent = "Audio prêt.";
  };

  $("#btnScore").onclick = async ()=>{
    if (!lastBlob) return;
    $("#result").textContent = "Analyse…";
    $("#coach").textContent = "";
    lastScoreResult = null;

    const referenceText = sel.value;
    const res = await scoreWithProvider({
      audioBlob: lastBlob,
      referenceText,
      mode: "practice",
      soundId: sound.id
    });

    if (!res.ok){
      $("#result").innerHTML = `<span class="warn">Erreur:</span> ${escapeHtml(res.error || "inconnue")}`;
      $("#btnCoach").disabled = false;
      lastScoreResult = { overallScore:null, details:null, provider:"none" };
      return;
    }

    const pct = scoreToPct(res.overallScore);
    if (pct !== null) updateScore(sound.id, pct);

    $("#result").innerHTML = `
      <div class="badge">Provider <strong>${escapeHtml(res.provider)}</strong></div>
      <div class="badge">Score <strong>${pct===null ? "—" : pct+"%"}</strong></div>
      <details style="margin-top:10px;">
        <summary class="small">Brut</summary>
        <pre style="overflow:auto; font-family:var(--mono); font-size:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(res.raw || res, null, 2))}</pre>
      </details>
    `;
    $("#btnCoach").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "OK" : `Score ${pct}%`);
    setTimeout(()=> renderSound(sound.id), 400);
  };

  $("#btnCoach").onclick = async ()=>{
    $("#coach").textContent = "Coach IA…";
    const referenceText = sel.value;
    const r = await generateCoachFeedback({
      sound,
      referenceText,
      scoreResult: lastScoreResult,
    });
    $("#coach").textContent = r.ok ? r.text : `Erreur IA: ${r.error}`;
  };
}

function renderModeReading(sound){
  const modeCard = $("#modeCard");
  modeCard.innerHTML = `
    <div class="h2">Lecture</div>

    <div class="field">
      <label>Texte</label>
      <textarea id="readingText"></textarea>
    </div>

    <div class="btnrow">
      <button class="btn" id="btnSpeakRead">Écouter</button>
      <button class="btn" id="btnGenText">✨ Nouveau texte</button>
    </div>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnRecR">🎙️ Enregistrer</button>
      <button class="btn" id="btnStopR" disabled>Stop</button>
    </div>

    <audio class="audio" id="audioPlaybackR" controls style="display:none"></audio>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnScoreR" disabled>Score</button>
      <button class="btn" id="btnCoachR" disabled>Feedback IA</button>
    </div>

    <div id="resultR" class="small" style="margin-top:10px;"></div>
    <div id="coachR" class="p" style="white-space:pre-wrap; margin-top:10px;"></div>
  `;

  const ta = $("#readingText");
  ta.value = sound.readingText || "";

  $("#btnSpeakRead").onclick = ()=> speakText(ta.value);

  $("#btnGenText").onclick = async ()=>{
    $("#resultR").textContent = "Génération…";
    const r = await generateTargetedReading(sound);
    ta.value = r.text || ta.value;
    $("#resultR").textContent = r.ok ? "OK" : `Erreur: ${r.error}`;
  };

  let recorder = null;
  let lastBlob = null;
  let lastScoreResult = null;

  $("#btnRecR").onclick = async ()=>{
    try{
      recorder = await startRecorder(14000);
      $("#btnRecR").disabled = true;
      $("#btnStopR").disabled = false;
      showToast("Enregistrement…");
    }catch{
      alert("Micro refusé ou indisponible.");
    }
  };

  $("#btnStopR").onclick = async ()=>{
    if (!recorder) return;
    $("#btnStopR").disabled = true;
    recorder.stop();
    const { blob } = await recorder.wait();
    lastBlob = blob;
    recorder = null;

    const url = blobToObjectUrl(blob);
    const a = $("#audioPlaybackR");
    a.src = url;
    a.style.display = "block";

    $("#btnRecR").disabled = false;
    $("#btnScoreR").disabled = false;
    $("#btnCoachR").disabled = true;
    $("#resultR").textContent = "Audio prêt.";
  };

  $("#btnScoreR").onclick = async ()=>{
    if (!lastBlob) return;
    $("#resultR").textContent = "Analyse…";
    $("#coachR").textContent = "";
    lastScoreResult = null;

    const res = await scoreWithProvider({
      audioBlob: lastBlob,
      referenceText: ta.value,
      mode: "reading",
      soundId: sound.id
    });

    if (!res.ok){
      $("#resultR").innerHTML = `<span class="warn">Erreur:</span> ${escapeHtml(res.error || "inconnue")}`;
      $("#btnCoachR").disabled = false;
      lastScoreResult = { overallScore:null, details:null, provider:"none" };
      return;
    }

    const pct = scoreToPct(res.overallScore);
    if (pct !== null) updateScore(sound.id, pct);

    $("#resultR").innerHTML = `
      <div class="badge">Provider <strong>${escapeHtml(res.provider)}</strong></div>
      <div class="badge">Score <strong>${pct===null ? "—" : pct+"%"}</strong></div>
      <details style="margin-top:10px;">
        <summary class="small">Brut</summary>
        <pre style="overflow:auto; font-family:var(--mono); font-size:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(res.raw || res, null, 2))}</pre>
      </details>
    `;
    $("#btnCoachR").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "OK" : `Score ${pct}%`);
    setTimeout(()=> renderSound(sound.id), 400);
  };

  $("#btnCoachR").onclick = async ()=>{
    $("#coachR").textContent = "Coach IA…";
    const r = await generateCoachFeedback({
      sound,
      referenceText: ta.value,
      scoreResult: lastScoreResult,
    });
    $("#coachR").textContent = r.ok ? r.text : `Erreur IA: ${r.error}`;
  };
}

function renderModeExtras(sound){
  const modeCard = $("#modeCard");
  modeCard.innerHTML = `
    <div class="h2">Exercices</div>

    <div class="h2" style="margin-top:12px;">Paires minimales</div>
    <div id="pairs"></div>

    <div class="hr"></div>

    <div class="h2">Prompts</div>
    <div class="p">${(sound.practicePrompts||[]).map(x=>`<span class="badge"><strong>${escapeHtml(x)}</strong></span>`).join(" ")}</div>
  `;

  const pairs = $("#pairs");
  (sound.minimalPairs||[]).forEach(p=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="label">${escapeHtml(p.a)} <span class="kbd">vs</span> ${escapeHtml(p.b)}</div>
      <div class="meta">${escapeHtml(p.note || "")}</div>
      <div class="btnrow" style="justify-content:center;">
        <button class="btn" data-say="${escapeHtml(p.a)}">Écouter A</button>
        <button class="btn" data-say="${escapeHtml(p.b)}">Écouter B</button>
      </div>
    `;
    $$("button[data-say]", div).forEach(btn=>{
      btn.onclick = ()=> speakText(btn.getAttribute("data-say"));
    });
    pairs.appendChild(div);
  });
}

function renderTest(){
  setSubtitle("Test");

  const TEST_TEXT =
`Un bon pain bien chaud, un enfant content, et mon oncle heureux.
Peu à peu, ils parlent et ils chantent sans peur, dans un grand vent.`.trim();

  view.innerHTML = `
    <div class="card">
      <div class="h1">Test rapide</div>

      <div class="field">
        <label>Texte</label>
        <textarea id="testText">${escapeHtml(TEST_TEXT)}</textarea>
      </div>

      <div class="btnrow">
        <button class="btn" id="btnSpeakTest">Écouter</button>
        <button class="btn primary" id="btnRecT">🎙️ Enregistrer</button>
        <button class="btn" id="btnStopT" disabled>Stop</button>
      </div>

      <audio class="audio" id="audioPlaybackT" controls style="display:none"></audio>

      <div class="hr"></div>

      <div class="btnrow">
        <button class="btn primary" id="btnScoreT" disabled>Score</button>
        <button class="btn" id="btnCoachT" disabled>Feedback IA</button>
      </div>

      <div id="resultT" class="small" style="margin-top:10px;"></div>
      <div id="reco" style="margin-top:10px;"></div>
      <div id="coachT" class="p" style="white-space:pre-wrap; margin-top:10px;"></div>
    </div>
  `;

  const ta = $("#testText");
  $("#btnSpeakTest").onclick = ()=> speakText(ta.value);

  let recorder = null;
  let lastBlob = null;
  let lastScoreResult = null;

  $("#btnRecT").onclick = async ()=>{
    try{
      recorder = await startRecorder(17000);
      $("#btnRecT").disabled = true;
      $("#btnStopT").disabled = false;
      showToast("Enregistrement…");
    }catch{
      alert("Micro refusé ou indisponible.");
    }
  };

  $("#btnStopT").onclick = async ()=>{
    if (!recorder) return;
    $("#btnStopT").disabled = true;
    recorder.stop();
    const { blob } = await recorder.wait();
    lastBlob = blob;
    recorder = null;

    const url = blobToObjectUrl(blob);
    const a = $("#audioPlaybackT");
    a.src = url;
    a.style.display = "block";

    $("#btnRecT").disabled = false;
    $("#btnScoreT").disabled = false;
    $("#btnCoachT").disabled = true;
    $("#resultT").textContent = "Audio prêt.";
  };

  $("#btnScoreT").onclick = async ()=>{
    if (!lastBlob) return;
    $("#resultT").textContent = "Analyse…";
    $("#reco").innerHTML = "";
    $("#coachT").textContent = "";
    lastScoreResult = null;

    const res = await scoreWithProvider({
      audioBlob: lastBlob,
      referenceText: ta.value,
      mode: "test",
      soundId: ""
    });

    if (!res.ok){
      $("#resultT").innerHTML = `<span class="warn">Erreur:</span> ${escapeHtml(res.error || "inconnue")}`;
      $("#btnCoachT").disabled = false;
      lastScoreResult = { overallScore:null, details:null, provider:"none" };
      return;
    }

    const pct = scoreToPct(res.overallScore);
    $("#resultT").innerHTML = `
      <div class="badge">Provider <strong>${escapeHtml(res.provider)}</strong></div>
      <div class="badge">Score global <strong>${pct===null ? "—" : pct+"%"}</strong></div>
    `;

    const suggested = suggestSoundsFromDetails(res.details);
    $("#reco").innerHTML = suggested.length ? `
      <div class="h2">À travailler</div>
      <div class="grid">
        ${suggested.map(s=>`
          <div class="item" data-sid="${escapeHtml(s.id)}">
            <div class="label">${escapeHtml(s.title)}</div>
            <div class="meta">${escapeHtml(s.ipa)}</div>
          </div>
        `).join("")}
      </div>
    ` : `<p class="small">Pas de suggestions (détails phonèmes manquants). Va dans “Scores”.</p>`;

    $$("[data-sid]").forEach(el=>{
      el.onclick = ()=> navigate(`#/sound/${encodeURIComponent(el.getAttribute("data-sid"))}`);
    });

    $("#btnCoachT").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "OK" : `Score ${pct}%`);
  };

  $("#btnCoachT").onclick = async ()=>{
    $("#coachT").textContent = "Coach IA…";
    const pseudoSound = {
      title:"Test global",
      ipa:"(lecture)",
      articulatory:"Lecture fluide, liaisons naturelles, voyelles nettes, nasalité stable.",
    };
    const r = await generateCoachFeedback({
      sound: pseudoSound,
      referenceText: ta.value,
      scoreResult: lastScoreResult,
    });
    $("#coachT").textContent = r.ok ? r.text : `Erreur IA: ${r.error}`;
  };
}

function suggestSoundsFromDetails(details){
  if (!details) return [];
  let weak = [];

  if (Array.isArray(details.weakPhonemes)) weak = details.weakPhonemes.slice(0,6);
  else if (details.scoresByPhoneme && typeof details.scoresByPhoneme === "object"){
    weak = Object.entries(details.scoresByPhoneme)
      .map(([k,v])=>({k, v:Number(v)}))
      .filter(x=>Number.isFinite(x.v))
      .sort((a,b)=>a.v-b.v)
      .slice(0,6)
      .map(x=>x.k);
  } else {
    const s = JSON.stringify(details);
    const candidates = ["ɑ̃","ɔ̃","ɛ̃","œ̃","ø","œ"];
    weak = candidates.filter(c=> s.includes(c));
  }

  const map = new Map();
  weak.forEach(w=>{
    if (w.includes("ɑ̃")) map.set("an-ɑ̃", true);
    if (w.includes("ɔ̃")) map.set("on-ɔ̃", true);
    if (w.includes("ɛ̃")) map.set("in-ɛ̃", true);
    if (w.includes("ø") || w.includes("œ")) { map.set("eu-øœ", true); map.set("eux-eur", true); }
  });

  return SOUNDS.filter(s=> map.has(s.id)).slice(0,4);
}

function renderSettings(){
  setSubtitle("Paramètres");
  const s = loadSettings();

  view.innerHTML = `
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="h1">Paramètres</div>

          <div class="h2">Apparence</div>
          <div class="field">
            <label>Thème</label>
            <select id="themeSel">
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>

          <div class="h2">TTS</div>
          <div class="field">
            <label>Voix française</label>
            <select id="voiceSel"></select>
          </div>

          <div class="hr"></div>

          <div class="h2">Scoring</div>
          <div class="field">
            <label>Provider</label>
            <select id="providerSel">
              <option value="none">none</option>
              <option value="proxy">proxy</option>
            </select>
          </div>

          <div class="field">
            <label>Proxy URL (recommandé)</label>
            <input id="proxyUrl" placeholder="https://..." value="${escapeHtml(s.proxyUrl)}" />
          </div>

          <div class="btnrow">
            <button class="btn primary" id="saveSettings">Enregistrer</button>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card">
          <div class="h2">Clés (optionnel)</div>

          <div class="field">
            <label>OpenRouter API Key</label>
            <input id="openrouterKey" placeholder="sk-or-..." value="${escapeHtml(s.openrouterKey)}" />
          </div>
          <div class="field">
            <label>OpenRouter model</label>
            <input id="openrouterModel" placeholder="${escapeHtml(DEFAULTS.openrouterModel)}" value="${escapeHtml(s.openrouterModel)}" />
          </div>

          <div class="hr"></div>

          <div class="field">
            <label>Azure Speech Key</label>
            <input id="azureKey" placeholder="Azure key..." value="${escapeHtml(s.azureKey)}" />
          </div>
          <div class="field">
            <label>Azure Region</label>
            <input id="azureRegion" placeholder="eastus" value="${escapeHtml(s.azureRegion)}" />
          </div>

          <div class="hr"></div>

          <div class="field">
            <label>Speechace Key</label>
            <input id="speechaceKey" placeholder="Speechace key..." value="${escapeHtml(s.speechaceKey)}" />
          </div>

          <div class="btnrow">
            <button class="btn danger" id="clearKeys">Effacer</button>
          </div>

          <p class="small">⚠️ Sur GitHub Pages, tout est côté client. Pour partager, passe par un proxy.</p>
        </div>
      </div>
    </div>
  `;

  $("#themeSel").value = s.theme || "dark";

  const voiceSel = $("#voiceSel");
  const addOpt = (value, label)=>{
    const o = document.createElement("option");
    o.value = value; o.textContent = label;
    voiceSel.appendChild(o);
  };

  const fillVoices = ()=>{
    const voices = listFrenchVoices();
    addOpt("auto", "Auto (fr-CA → fr-FR)");
    voices.forEach(v=> addOpt(v.voiceURI, `${v.name} • ${v.lang}`));
    voiceSel.value = s.ttsVoice || "auto";
  };
  fillVoices();

  speechSynthesis.onvoiceschanged = ()=> {
    voiceSel.innerHTML = "";
    fillVoices();
  };

  $("#providerSel").value = s.provider || "none";

  $("#saveSettings").onclick = ()=>{
    const next = loadSettings();
    next.theme = $("#themeSel").value;
    next.ttsVoice = $("#voiceSel").value;
    next.provider = $("#providerSel").value;
    next.proxyUrl = ($("#proxyUrl").value || "").trim();

    next.openrouterKey = ($("#openrouterKey").value || "").trim();
    next.openrouterModel = ($("#openrouterModel").value || DEFAULTS.openrouterModel).trim();

    next.azureKey = ($("#azureKey").value || "").trim();
    next.azureRegion = ($("#azureRegion").value || "").trim();
    next.speechaceKey = ($("#speechaceKey").value || "").trim();

    saveSettings(next);

    document.documentElement.setAttribute("data-theme", next.theme);
    btnTheme.textContent = next.theme === "dark" ? "🌙" : "☀️";

    showToast("Enregistré");
  };

  $("#clearKeys").onclick = ()=>{
    if (!confirm("Effacer toutes les clés ?")) return;
    const next = loadSettings();
    next.openrouterKey = "";
    next.azureKey = "";
    next.azureRegion = "";
    next.speechaceKey = "";
    saveSettings(next);
    showToast("OK");
    renderSettings();
  };
}

/* -----------------------------
   Boot
------------------------------ */
render();
