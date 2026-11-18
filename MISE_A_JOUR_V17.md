# Mise à jour : surlignage jaune réparé au début de la lecture (APK 10.9)

## Ce qui change
- Fiches de révision (dont « Tout le chapitre ») : l'en-tête lu au début (« Chapitre 13. Gestion de l'identité… Tout le chapitre »)
  est maintenant surligné à l'écran : le titre de la carte, puis le bouton du volet. Avant, les premières secondes
  de lecture n'avaient aucun surlignage.
- La phrase lue n'est plus cachée sous la barre de lecture fixée en haut : la page défile pour la garder sous la barre
  (sur PC, la barre descend jusqu'à environ 125 px, alors que le défilement ne se faisait qu'au-dessus de 70 px).
- Les émojis des libellés (« 📚 Tout le chapitre », « 📘 Livre ») ne sont plus lus à voix haute.

## Détails techniques
- `js/app.js` : `revIntro()` (en-tête surligné), `noEmoji()` dans `speakUnits`, `hlShow()` tient compte du bas de `#tts-bar`.
  `APP_VERSION` 10.9.
- `sw.js` : cache v77.
