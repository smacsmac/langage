# PhonoCoach FR (MVP)

Webapp/PWA mobile-first pour pratiquer des sons du français:
- Choix par catégories → choix d’un son
- Page dédiée par son: Pratique / Lecture / Exercices
- Tableau de bord des scores (% par son) cliquable
- Test rapide (lecture) + suggestions si détails phonèmes disponibles
- Mode sombre par défaut + toggle

## Déploiement GitHub Pages
1) Crée un repo (ex: `phonocoach-fr`)
2) Ajoute les fichiers:
   - index.html
   - style.css
   - app.js
   - manifest.webmanifest
   - sw.js
3) Settings → Pages → Source: `Deploy from a branch`
4) Branch: `main` / folder: `/root`
5) Ouvre l’URL GitHub Pages.

## Paramètres
Dans l’app: ⚙️ Paramètres
- Theme: dark/light
- TTS: voix navigateur (SpeechSynthesis)
- Provider scoring: none ou proxy
- Proxy URL (recommandé)
- OpenRouter key + model

## Proxy (recommandé)
Pourquoi?
- Les clés Azure/Speechace ne doivent pas être exposées en front-end public.

Contrat attendu:
- POST {PROXY_URL}/score
- multipart/form-data:
  - mode: practice|reading|test
  - referenceText: string
  - soundId: string
  - providerHint: azure|speechace|auto
  - audio: file
  - (optionnel) azureKey/azureRegion/speechaceKey (pas recommandé)

Réponse JSON conseillée:
{
  "provider": "azure" | "speechace",
  "overallScore": 0-100,
  "details": {
     "weakPhonemes": ["ɑ̃","ɔ̃",...],
     "scoresByPhoneme": {"ɑ̃": 42, ...}
  }
}

## Sécurité
- GitHub Pages = front-end public.
- Pour usage perso: OK si tu acceptes le risque.
- Pour partager: utilise un proxy et garde tes clés côté serveur.
