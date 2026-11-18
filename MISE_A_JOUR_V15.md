# Mise à jour : lecture audio en arrière-plan (APK 10.7)

## Ce qui change
- La lecture à voix haute **continue quand on quitte l'appli** (bouton Accueil, autre appli) **et quand on verrouille le téléphone**.
- Une **notification média** (comme Spotify) apparaît pendant la lecture, aussi sur l'écran verrouillé :
  ⏮ phrase précédente · ⏯ lecture / pause · ⏭ phrase suivante · ✕ fermer.
  Le titre est celui de la fiche ou de la question, le texte est la phrase en cours, et la barre de progression
  permet de sauter à une phrase.
- Les boutons d'un casque ou d'écouteurs Bluetooth (lecture / pause / suivant) fonctionnent aussi.
- Appel téléphonique ou autre appli audio : la lecture se met en pause, puis reprend après une interruption courte.
- Toucher la notification rouvre l'appli là où on en était.

## Détails techniques
- `LectureService` (nouveau) : service de premier plan `mediaPlayback` + `MediaSession` + notification `MediaStyle`,
  verrou de veille partiel et verrou Wi-Fi pendant la lecture, focus audio.
- `MainActivity` : la lecture n'est plus coupée dans `onPause` ; pont `AndroidTTS.mediaState(json)`.
- `js/app.js` : `notifyMedia()` (état envoyé à l'appli à chaque phrase) et `window.__media(action)`
  (commandes de la notification, mêmes effets que la barre de lecture).
- Android 13+ : l'autorisation des notifications est demandée une fois, à la première lecture.

## Conseil (Xiaomi / tablette)
Si la lecture s'arrête quand l'écran est éteint : Paramètres > Applis > CISSP Training > Économiseur de batterie
> **Aucune restriction**.
