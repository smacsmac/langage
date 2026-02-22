/* PhonoCoach FR – MVP (front-end only)
   - PWA + offline cache
   - Sons -> pages dédiées (Pratique / Lecture / Exercices)
   - Tableau de bord (scores % par son) + clic -> page du son
   - Test rapide (lecture) -> suggestions (si provider de scoring configuré)
   - Paramètres: clés (OpenRouter, Azure, Speechace) + Proxy URL recommandé

   IMPORTANT: Pour Azure Pronunciation Assessment / Speechace, utilise un proxy backend
   (Azure Function, Cloudflare Worker, etc.) pour protéger tes clés.
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
  { id:"liaison", label:"Liaison & enchaînement", hint:"module (bientôt)", emoji:"🔗", disabled:true },
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
    tags:["nasal","vowel"]
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
    tags:["nasal","vowel"]
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
    tags:["nasal","vowel"]
  },
  {
    id:"eu-øœ",
    cat:"midvowels",
    title:"EU / ŒU (peu vs peur)",
    ipa:"/ø/ ~ /œ/",
    articulatory:"Lèvres arrondies, langue moyenne. Souvent /ø/ en syllabe fermée? (selon mot). Objectif: distinguer “peu” et “peur”.",
    spellings:["eu","œu","eû"],
    examples:["peu","peur","deux","heure"],
    practicePrompts:["peu","peur","deux","heure","heureusement"],
    readingText:"Peu à peu, il a moins peur; à deux, ils restent heureux une heure de plus.",
    minimalPairs:[
      {a:"peu", b:"peur", note:"/ø/ vs /œ/"},
      {a:"deux", b:"d’heure", note:"approx /ø/ vs /œ/"},
    ],
    tags:["vowel","contrast"]
  },
  {
    id:"ent-muet",
    cat:"endings",
    title:"-ENT (verbes -er)",
    ipa:"(muet)",
    articulatory:"Dans beaucoup de verbes en -er au présent (ils parlent), “-ent” ne se prononce pas. Attention aux cas où la consonne du radical se fait entendre (selon le verbe).",
    spellings:["-ent"],
    examples:["ils parlent","elles regardent","ils chantent"],
    practicePrompts:["ils parlent","elles regardent","ils chantent","elles aiment"],
    readingText:"Ils parlent et elles regardent; ils chantent, puis ils mangent et ils rentrent.",
    minimalPairs:[
      {a:"il parle", b:"ils parlent", note:"souvent identique à l’oral"},
      {a:"il chante", b:"ils chantent", note:"souvent identique à l’oral"},
    ],
    tags:["ending","silent"]
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
    tags:["ending","vowel"]
  },
];

const DEFAULTS = {
  theme: "dark", // dark par défaut
  ttsVoice: "auto",
  provider: "none", // none | proxy
  proxyUrl: "",    // recommandé
  openrouterKey: "",
  openrouterModel: "openai/gpt-4o-mini", // exemple; modifie si tu veux
  azureKey: "",
  azureRegion: "",
  speechaceKey: "",
};

const STORE_KEYS = {
  settings: "phonocoach_settings_v1",
  scores: "phonocoach_scores_v1",
  history: "phonocoach_history_v1",
};

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
  const obj = raw ? safeJson(raw, {}) : {};
  // structure: { [soundId]: { best: number, last: number, attempts: number, updatedAt: ts } }
  return obj;
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
   Routing (hash)
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

function parseRoute(hash){
  // routes:
  // #/  home
  // #/dashboard
  // #/test
  // #/settings
  // #/category/:id
  // #/sound/:id
  const h = hash.replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
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
   Audio utils (MediaRecorder)
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

async function recordAudio({maxMs=12000}={}){
  const stream = await getMicStream();
  const mimeType = pickBestMimeType();
  const rec = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
  const chunks = [];
  return await new Promise((resolve, reject)=>{
    let stopped = false;
    const stopAll = () => {
      stream.getTracks().forEach(t=>t.stop());
    };
    const timer = setTimeout(()=>{
      if (!stopped) rec.stop();
    }, maxMs);

    rec.ondataavailable = (e)=> { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = (e)=> { clearTimeout(timer); stopAll(); reject(e.error || e); };
    rec.onstop = ()=>{
      stopped = true;
      clearTimeout(timer);
      stopAll();
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      resolve({ blob, mimeType: rec.mimeType || blob.type || "audio/webm" });
    };
    rec.start();
    resolve({
      stop: ()=> { if (!stopped) rec.stop(); },
      wait: ()=> new Promise(res=> { rec.onstop = ()=>{ stopped=true; clearTimeout(timer); stopAll(); const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"}); res({blob,mimeType:rec.mimeType||"audio/webm"}); }; })
    });
  });
}

// Alternative record flow (UI-friendly)
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
    // tente fr-CA puis fr-FR
    u.voice = frVoices.find(v=> /fr-CA/i.test(v.lang)) || frVoices.find(v=> /fr-FR/i.test(v.lang)) || frVoices[0] || null;
  }
  u.rate = 1.0;
  u.pitch = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* -----------------------------
   Providers (scoring)
   - "none": aucun scoring, mais OpenRouter peut donner des conseils généraux
   - "proxy": POST vers settings.proxyUrl (recommandé)
------------------------------ */
async function scoreWithProvider({ audioBlob, referenceText, mode, soundId }){
  const s = loadSettings();

  if (s.provider === "none"){
    return {
      ok: true,
      provider: "none",
      overallScore: null,
      details: null,
      note: "Aucun provider de scoring configuré. Utilise la réécoute + conseils."
    };
  }

  if (s.provider === "proxy"){
    if (!s.proxyUrl){
      return { ok:false, error:"Proxy URL manquante (Paramètres → Proxy URL)." };
    }
    // Le proxy doit accepter multipart/form-data:
    // fields: providerHint (azure|speechace), mode (practice|reading|test), referenceText, soundId
    // file: audio
    const fd = new FormData();
    fd.append("mode", mode || "practice");
    fd.append("referenceText", referenceText || "");
    fd.append("soundId", soundId || "");
    fd.append("providerHint", inferProviderHint(s));
    fd.append("audio", audioBlob, "audio.webm");

    // optionnel: si tu veux aussi forward keys côté proxy (pas recommandé côté client)
    // on les envoie seulement si tu le veux
    if (s.azureKey) fd.append("azureKey", s.azureKey);
    if (s.azureRegion) fd.append("azureRegion", s.azureRegion);
    if (s.speechaceKey) fd.append("speechaceKey", s.speechaceKey);

    const resp = await fetch(s.proxyUrl.replace(/\/$/,"") + "/score", {
      method:"POST",
      body: fd,
    });

    if (!resp.ok){
      const t = await resp.text().catch(()=> "");
      return { ok:false, error:`Proxy error: ${resp.status} ${t.slice(0,180)}` };
    }
    const data = await resp.json().catch(()=>null);
    if (!data) return { ok:false, error:"Réponse proxy invalide (JSON)." };

    // attendus (libres): { overallScore:number(0-100), details:any, provider:string }
    return { ok:true, provider: data.provider || "proxy", overallScore: data.overallScore ?? null, details: data.details ?? null, raw: data };
  }

  return { ok:false, error:"Provider inconnu." };
}

function inferProviderHint(s){
  // simple préférence: Azure si région+clé, sinon Speechace si clé, sinon "auto"
  if (s.azureKey && s.azureRegion) return "azure";
  if (s.speechaceKey) return "speechace";
  return "auto";
}

/* -----------------------------
   OpenRouter (feedback + génération)
------------------------------ */
async function callOpenRouter(messages, {temperature=0.3}={}){
  const s = loadSettings();
  if (!s.openrouterKey) return { ok:false, error:"OpenRouter key manquante." };

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": `Bearer ${s.openrouterKey}`,
      // OpenRouter recommande des headers optionnels (référer/nom), mais pas obligatoires
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
  if (!s.openrouterKey) return { ok:true, text:"(OpenRouter non configuré) Conseil rapide: enregistre-toi, réécoute, puis compare avec le TTS. Recommence 3 fois en exagérant légèrement l’articulation." };

  const sys = `Tu es un coach de prononciation du français (pédagogie très concrète). Donne des conseils actionnables, courts, et adaptés à un anglophone apprenant le français.`;
  const user = {
    role:"user",
    content:
`Son cible: ${sound.title} (${sound.ipa})
Description articulatoire: ${sound.articulatory}
Texte de référence: ${referenceText || "(aucun)"}
Résultat scoring (peut être nul): ${JSON.stringify({
  overallScore: scoreResult?.overallScore ?? null,
  details: scoreResult?.details ?? null,
  provider: scoreResult?.provider ?? null
}).slice(0,1600)}

Note utilisateur (optionnel): ${userNote || "(aucune)"}

Tâche:
1) Donne 3 observations max (bullet points).
2) Donne 3 corrections physiques (langue/lèvres/air/rythme).
3) Propose 3 mini-exercices immédiats (10–20 sec chacun) liés à ce son.
N'invente pas des chiffres: si pas de détails, reste général mais utile.`
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
- Son/graphies: ${sound.title} (${sound.ipa}) | graphies: ${(sound.spellings||[]).join(", ")}
- Vocabulaire facile (A2–B1).
- Pas de noms propres.
- Évite la ponctuation trop complexe.
Retourne uniquement le texte.`
  };
  const r = await callOpenRouter([{role:"system", content:sys}, user], {temperature:0.5});
  return r.ok ? r : { ok:true, text: sound.readingText };
}

/* -----------------------------
   Rendering
------------------------------ */
function safeJson(str, fallback){
  try { return JSON.parse(str); } catch { return fallback; }
}

function scoreToPct(score){
  if (score === null || score === undefined) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function render(){
  setActiveNav();
  const r = parseRoute(currentHash());

  // back button enable/disable
  btnBack.style.visibility = (currentHash() === "#/" || currentHash() === "") ? "hidden" : "visible";

  if (r.a === "" ){ renderHome(); return; }
  if (r.a === "dashboard"){ renderDashboard(); return; }
  if (r.a === "settings"){ renderSettings(); return; }
  if (r.a === "test"){ renderTest(); return; }
  if (r.a === "category" && r.b){ renderCategory(r.b); return; }
  if (r.a === "sound" && r.b){ renderSound(r.b); return; }

  // fallback
  renderHome();
}

function renderHome(){
  setSubtitle("Accueil");
  const settings = loadSettings();

  view.innerHTML = `
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="h1">Choisis une catégorie</div>
          <p class="p">Tu commences par un son, puis tu passes en <span class="badge"><strong>Pratique</strong></span> ou <span class="badge"><strong>Lecture</strong></span> (spécifique au son).</p>
          <div class="grid" id="catGrid"></div>
          <div class="hr"></div>
          <div class="row">
            <div class="col">
              <div class="badge">Mode sombre: <strong>${settings.theme === "dark" ? "ON" : "OFF"}</strong></div>
            </div>
            <div class="col">
              <div class="badge">Scoring: <strong>${settings.provider}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card">
          <div class="h2">Démarrage rapide</div>
          <p class="p">• Va à <strong>Scores</strong> pour voir ton % par son et cliquer pour pratiquer.<br>• Ou fais un <strong>Test rapide</strong> (lecture) pour recevoir des suggestions.</p>
          <div class="btnrow">
            <button class="btn primary" id="goDashboard">Voir mes scores</button>
            <button class="btn" id="goTest">Test rapide</button>
            <button class="btn" id="goSettings">Paramètres</button>
          </div>
          <div class="hr"></div>
          <p class="small">
            Astuce: même sans IA, l’app est utile pour <strong>enregistrer</strong> et <strong>réécouter</strong>. Avec un provider (proxy), tu obtiens des scores.
          </p>
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
        showToast("Module bientôt 🙂");
        return;
      }
      navigate(`#/category/${cat.id}`);
    });
    grid.appendChild(el);
  });

  $("#goDashboard").onclick = ()=> navigate("#/dashboard");
  $("#goTest").onclick = ()=> navigate("#/test");
  $("#goSettings").onclick = ()=> navigate("#/settings");
}

function renderCategory(catId){
  const cat = SOUND_CATEGORIES.find(c=>c.id===catId);
  setSubtitle(cat ? cat.label : "Catégorie");

  const sounds = SOUNDS.filter(s=>s.cat===catId);
  view.innerHTML = `
    <div class="card">
      <div class="h1">${cat?.emoji || "🔎"} ${cat?.label || "Catégorie"}</div>
      <p class="p">${cat?.hint || ""}</p>
      <div class="grid" id="soundGrid"></div>
    </div>
  `;
  const grid = $("#soundGrid");
  sounds.forEach(sound=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="label">${sound.title}</div>
      <div class="meta">${sound.ipa} • ex: ${(sound.examples||[]).slice(0,2).join(", ")}</div>
    `;
    el.onclick = ()=> navigate(`#/sound/${sound.id}`);
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
      <p class="p">Clique un son pour aller directement à sa page de pratique.</p>

      <table class="table">
        <thead>
          <tr>
            <th>Son</th>
            <th>IPA</th>
            <th>Meilleur</th>
            <th>Dernier</th>
            <th>Tentatives</th>
          </tr>
        </thead>
        <tbody id="scoreBody"></tbody>
      </table>

      <div class="hr"></div>
      <div class="btnrow">
        <button class="btn danger" id="resetScores">Réinitialiser les scores</button>
      </div>
      <p class="small">Les scores sont stockés localement (localStorage).</p>
    </div>
  `;

  const body = $("#scoreBody");
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="clicklink" data-sid="${r.sound.id}">${r.sound.title}</span></td>
      <td>${r.sound.ipa}</td>
      <td><strong>${Math.round(r.best)}%</strong></td>
      <td>${r.last===null ? "—" : `${Math.round(r.last)}%`}</td>
      <td>${r.attempts}</td>
    `;
    body.appendChild(tr);
  });

  $$(".clicklink").forEach(el=>{
    el.onclick = ()=> navigate(`#/sound/${el.getAttribute("data-sid")}`);
  });

  $("#resetScores").onclick = ()=>{
    if (!confirm("Réinitialiser tous les scores ?")) return;
    localStorage.removeItem(STORE_KEYS.scores);
    showToast("Scores réinitialisés");
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
          <div class="h1">${sound.title} <span class="badge"><strong>${sound.ipa}</strong></span></div>
          <p class="p">${sound.articulatory}</p>

          <div class="row">
            <div class="col">
              <div class="badge">Meilleur <strong>${best}%</strong></div>
              <div class="badge">Dernier <strong>${last===null?"—":last+"%"}</strong></div>
              <div class="badge">Tentatives <strong>${attempts}</strong></div>
            </div>
            <div class="col">
              <div class="scorebar"><div style="width:${best}%"></div></div>
              <div class="small" style="margin-top:6px;">
                Graphies: <span class="kbd">${(sound.spellings||[]).join(" • ")}</span>
              </div>
            </div>
          </div>

          <div class="hr"></div>
          <div class="h2">Exemples</div>
          <p class="p">${(sound.examples||[]).join(" • ")}</p>

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

  // default: pratique
  renderModePractice(sound);
}

function renderModePractice(sound){
  const modeCard = $("#modeCard");
  modeCard.innerHTML = `
    <div class="h2">Mode: Pratique (mots / syllabes)</div>
    <p class="p">Choisis un prompt, écoute si tu veux, enregistre-toi, puis demande un score (si configuré) + feedback.</p>

    <div class="field">
      <label>Prompt</label>
      <select id="practicePrompt"></select>
    </div>

    <div class="btnrow">
      <button class="btn" id="btnSpeak">Écouter (TTS)</button>
      <button class="btn primary" id="btnRec">🎙️ Enregistrer</button>
      <button class="btn" id="btnStop" disabled>Stop</button>
    </div>

    <audio class="audio" id="audioPlayback" controls style="display:none"></audio>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnScore" disabled>Analyser / Score</button>
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
    }catch(e){
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
    $("#result").textContent = "Audio prêt. Lance “Analyser / Score”.";
  };

  $("#btnScore").onclick = async ()=>{
    if (!lastBlob) return;
    $("#result").textContent = "Analyse en cours…";
    $("#coach").textContent = "";
    lastScoreResult = null;

    const referenceText = sel.value; // en pratique, c’est ok (mot/phrase)
    const res = await scoreWithProvider({
      audioBlob: lastBlob,
      referenceText,
      mode: "practice",
      soundId: sound.id
    });

    if (!res.ok){
      $("#result").innerHTML = `<span class="warn">Erreur:</span> ${escapeHtml(res.error || "inconnue")}`;
      $("#btnCoach").disabled = false; // IA peut quand même donner conseils généraux
      lastScoreResult = { overallScore:null, details:null, provider:"none" };
      return;
    }

    const pct = scoreToPct(res.overallScore);
    if (pct !== null){
      updateScore(sound.id, pct);
    }

    $("#result").innerHTML = `
      <div class="badge">Provider <strong>${escapeHtml(res.provider)}</strong></div>
      <div class="badge">Score <strong>${pct===null ? "—" : pct+"%"}</strong></div>
      <div class="small" style="margin-top:8px;">${res.note ? escapeHtml(res.note) : "Détails: voir ci-dessous si disponibles."}</div>
      <details style="margin-top:10px;">
        <summary class="small">Voir la réponse brute</summary>
        <pre style="overflow:auto; font-family:var(--mono); font-size:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(res.raw || res, null, 2))}</pre>
      </details>
    `;
    $("#btnCoach").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "Analyse terminée" : `Score: ${pct}%`);
    // rafraîchit la jauge “best” sans changer de page
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
    <div class="h2">Mode: Lecture (texte riche en occurrences)</div>
    <p class="p">Écoute le texte, lis-le à voix haute, puis analyse. Tu peux aussi demander un nouveau texte généré.</p>

    <div class="field">
      <label>Texte</label>
      <textarea id="readingText"></textarea>
    </div>

    <div class="btnrow">
      <button class="btn" id="btnSpeakRead">Écouter (TTS)</button>
      <button class="btn" id="btnGenText">✨ Générer un texte</button>
    </div>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnRecR">🎙️ Enregistrer ma lecture</button>
      <button class="btn" id="btnStopR" disabled>Stop</button>
    </div>

    <audio class="audio" id="audioPlaybackR" controls style="display:none"></audio>

    <div class="hr"></div>

    <div class="btnrow">
      <button class="btn primary" id="btnScoreR" disabled>Analyser / Score</button>
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
    $("#resultR").textContent = r.ok ? "Texte prêt." : `Erreur: ${r.error}`;
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
    $("#resultR").textContent = "Audio prêt. Lance “Analyser / Score”.";
  };

  $("#btnScoreR").onclick = async ()=>{
    if (!lastBlob) return;
    $("#resultR").textContent = "Analyse en cours…";
    $("#coachR").textContent = "";
    lastScoreResult = null;

    const referenceText = ta.value;
    const res = await scoreWithProvider({
      audioBlob: lastBlob,
      referenceText,
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
    if (pct !== null){
      updateScore(sound.id, pct);
    }

    $("#resultR").innerHTML = `
      <div class="badge">Provider <strong>${escapeHtml(res.provider)}</strong></div>
      <div class="badge">Score <strong>${pct===null ? "—" : pct+"%"}</strong></div>
      <details style="margin-top:10px;">
        <summary class="small">Voir la réponse brute</summary>
        <pre style="overflow:auto; font-family:var(--mono); font-size:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(res.raw || res, null, 2))}</pre>
      </details>
    `;
    $("#btnCoachR").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "Analyse terminée" : `Score: ${pct}%`);
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
    <div class="h2">Mode: Exercices</div>
    <p class="p">Paires minimales + liste de prompts rapides. (Tu peux les utiliser en Pratique.)</p>

    <div class="h2">Paires minimales</div>
    <div id="pairs"></div>

    <div class="hr"></div>

    <div class="h2">Prompts rapides</div>
    <p class="p">${(sound.practicePrompts||[]).map(x=>`<span class="badge"><strong>${escapeHtml(x)}</strong></span>`).join(" ")}</p>
  `;

  const pairs = $("#pairs");
  (sound.minimalPairs||[]).forEach(p=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="label">${escapeHtml(p.a)} <span class="kbd">vs</span> ${escapeHtml(p.b)}</div>
      <div class="meta">${escapeHtml(p.note || "")}</div>
      <div class="btnrow">
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
  setSubtitle("Test rapide");
  const settings = loadSettings();

  const TEST_TEXT =
`Un bon pain bien chaud, un enfant content, et mon oncle heureux.
Peu à peu, ils parlent et ils chantent sans peur, dans un grand vent.`.trim();

  view.innerHTML = `
    <div class="card">
      <div class="h1">Test rapide (lecture)</div>
      <p class="p">
        Lis ce texte à voix haute. Si un provider de scoring (via proxy) est configuré, l’app essaie de te suggérer quels sons travailler en priorité.
      </p>

      <div class="field">
        <label>Texte du test</label>
        <textarea id="testText">${escapeHtml(TEST_TEXT)}</textarea>
      </div>

      <div class="btnrow">
        <button class="btn" id="btnSpeakTest">Écouter (TTS)</button>
        <button class="btn primary" id="btnRecT">🎙️ Enregistrer</button>
        <button class="btn" id="btnStopT" disabled>Stop</button>
      </div>

      <audio class="audio" id="audioPlaybackT" controls style="display:none"></audio>

      <div class="hr"></div>

      <div class="btnrow">
        <button class="btn primary" id="btnScoreT" disabled>Analyser / Score</button>
        <button class="btn" id="btnCoachT" disabled>Feedback IA</button>
      </div>

      <div id="resultT" class="small" style="margin-top:10px;"></div>
      <div id="reco" style="margin-top:10px;"></div>
      <div id="coachT" class="p" style="white-space:pre-wrap; margin-top:10px;"></div>

      <div class="hr"></div>
      <p class="small">
        Provider actuel: <span class="kbd">${escapeHtml(settings.provider)}</span> •
        Proxy URL: <span class="kbd">${escapeHtml(settings.proxyUrl || "—")}</span>
      </p>
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
    $("#resultT").textContent = "Audio prêt. Lance “Analyser / Score”.";
  };

  $("#btnScoreT").onclick = async ()=>{
    if (!lastBlob) return;
    $("#resultT").textContent = "Analyse en cours…";
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
      <details style="margin-top:10px;">
        <summary class="small">Voir la réponse brute</summary>
        <pre style="overflow:auto; font-family:var(--mono); font-size:12px; white-space:pre-wrap;">${escapeHtml(JSON.stringify(res.raw || res, null, 2))}</pre>
      </details>
    `;

    // Suggestions (heuristique simple):
    // - si le proxy renvoie un tableau "weakPhonemes" ou similaire, on mappe vers nos sons
    const suggested = suggestSoundsFromDetails(res.details);
    $("#reco").innerHTML = suggested.length ? `
      <div class="h2">Sons suggérés</div>
      <div class="grid">
        ${suggested.map(s=>`
          <div class="item" data-sid="${s.id}">
            <div class="label">${escapeHtml(s.title)}</div>
            <div class="meta">${escapeHtml(s.ipa)} • clique pour pratiquer</div>
          </div>
        `).join("")}
      </div>
    ` : `
      <p class="small">
        Suggestions indisponibles (le provider n’a pas renvoyé de détails phonèmes). Tu peux quand même aller à “Scores” et choisir un son.
      </p>
    `;
    $$("[data-sid]").forEach(el=>{
      el.onclick = ()=> navigate(`#/sound/${el.getAttribute("data-sid")}`);
    });

    $("#btnCoachT").disabled = false;
    lastScoreResult = res;

    showToast(pct===null ? "Analyse terminée" : `Score global: ${pct}%`);
  };

  $("#btnCoachT").onclick = async ()=>{
    $("#coachT").textContent = "Coach IA…";
    const pseudoSound = { // pour le prompt coach
      title:"Test global",
      ipa:"(lecture)",
      articulatory:"Lecture fluide, liaisons naturelles, voyelles nettes, nasalité stable.",
      spellings:[],
      readingText: ta.value
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
  // Heuristique très souple: ton proxy peut renvoyer:
  // details = { weakPhonemes: ["ɑ̃","ɔ̃","ɛ̃","ø","œ"], scoresByPhoneme: { "ɑ̃":42, ... } }
  // ou n'importe quel format: on essaye de détecter des strings IPA
  if (!details) return [];
  let weak = [];

  if (Array.isArray(details.weakPhonemes)) weak = details.weakPhonemes.slice(0,6);
  else if (details.scoresByPhoneme && typeof details.scoresByPhoneme === "object"){
    const arr = Object.entries(details.scoresByPhoneme)
      .map(([k,v])=>({k, v:Number(v)}))
      .filter(x=>Number.isFinite(x.v))
      .sort((a,b)=>a.v-b.v)
      .slice(0,6)
      .map(x=>x.k);
    weak = arr;
  } else {
    // fallback: cherche des tokens IPA simples dans JSON string
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
          <p class="p">Mode sombre par défaut. Clés stockées localement (⚠️ côté client).</p>

          <div class="h2">Apparence</div>
          <div class="field">
            <label>Thème</label>
            <select id="themeSel">
              <option value="dark">Sombre (défaut)</option>
              <option value="light">Clair</option>
            </select>
          </div>

          <div class="h2">TTS (voix navigateur)</div>
          <div class="field">
            <label>Voix française</label>
            <select id="voiceSel"></select>
          </div>

          <div class="hr"></div>
          <div class="h2">Scoring (recommandé via proxy)</div>

          <div class="field">
            <label>Provider</label>
            <select id="providerSel">
              <option value="none">none (sans score)</option>
              <option value="proxy">proxy (recommandé)</option>
            </select>
          </div>

          <div class="field">
            <label>Proxy URL (ex: https://ton-worker.workers.dev)</label>
            <input id="proxyUrl" placeholder="https://..." value="${escapeHtml(s.proxyUrl)}" />
            <div class="small">Le proxy doit exposer <span class="kbd">POST /score</span>.</div>
          </div>

          <div class="btnrow">
            <button class="btn primary" id="saveSettings">Enregistrer</button>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card">
          <div class="h2">Clés API (optionnel)</div>
          <p class="small">
            ⚠️ Sur GitHub Pages, tout est public côté front-end. Pour un usage perso ça peut aller,
            mais le mieux est de mettre les clés uniquement dans ton backend/proxy.
          </p>

          <div class="field">
            <label>OpenRouter API Key</label>
            <input id="openrouterKey" placeholder="sk-or-..." value="${escapeHtml(s.openrouterKey)}" />
          </div>
          <div class="field">
            <label>OpenRouter model</label>
            <input id="openrouterModel" placeholder="${escapeHtml(DEFAULTS.openrouterModel)}" value="${escapeHtml(s.openrouterModel)}" />
            <div class="small">Ex: <span class="kbd">openai/gpt-4o-mini</span> (ou autre dispo sur OpenRouter)</div>
          </div>

          <div class="hr"></div>

          <div class="field">
            <label>Azure Speech Key</label>
            <input id="azureKey" placeholder="Azure key..." value="${escapeHtml(s.azureKey)}" />
          </div>
          <div class="field">
            <label>Azure Region (ex: eastus)</label>
            <input id="azureRegion" placeholder="eastus" value="${escapeHtml(s.azureRegion)}" />
          </div>

          <div class="hr"></div>

          <div class="field">
            <label>Speechace Key</label>
            <input id="speechaceKey" placeholder="Speechace key..." value="${escapeHtml(s.speechaceKey)}" />
          </div>

          <div class="btnrow">
            <button class="btn danger" id="clearKeys">Effacer les clés</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // theme
  $("#themeSel").value = s.theme || "dark";

  // voices
  const voiceSel = $("#voiceSel");
  const addOpt = (value, label)=>{
    const o = document.createElement("option");
    o.value = value; o.textContent = label;
    voiceSel.appendChild(o);
  };
  addOpt("auto", "Auto (fr-CA → fr-FR)");
  const fillVoices = ()=>{
    const voices = listFrenchVoices();
    voices.forEach(v=>{
      addOpt(v.voiceURI, `${v.name} • ${v.lang}`);
    });
    voiceSel.value = s.ttsVoice || "auto";
  };
  // voices may load async
  fillVoices();
  speechSynthesis.onvoiceschanged = ()=> {
    voiceSel.innerHTML = "";
    addOpt("auto", "Auto (fr-CA → fr-FR)");
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

    showToast("Paramètres enregistrés");
  };

  $("#clearKeys").onclick = ()=>{
    if (!confirm("Effacer toutes les clés ?")) return;
    const next = loadSettings();
    next.openrouterKey = "";
    next.azureKey = "";
    next.azureRegion = "";
    next.speechaceKey = "";
    saveSettings(next);
    showToast("Clés effacées");
    renderSettings();
  };
}

function escapeHtml(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

/* -----------------------------
   Boot
------------------------------ */
render();
