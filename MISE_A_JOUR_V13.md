# Mise à jour v13 : la phrase lue est surlignée

Pendant la lecture à voix haute, la phrase en cours de lecture est surlignée en jaune, phrase par phrase,
et la page défile pour qu'elle reste visible. Cela marche avec tous les boutons de lecture :

- **🔊 Lire tout / Listen all** et **🔊 Lire la réponse / Listen to answer** (page du quiz et correction) ;
- **🔊 Listen / 🔊 Lire** des fiches de révision et de l'onglet Livre.

Si le site est en français et que vous appuyez sur **Listen** (lecture en anglais) dans une fiche, la fiche
s'affiche en anglais le temps de la lecture, pour pouvoir suivre, puis revient en français.

## Mise à jour

- **Supabase** : rien à faire, pas de SQL.
- **Site** : le code est déjà poussé sur GitHub. Rechargez le site avec `Ctrl+F5`.
- **Application** : installez `cissp-training-v3.7.apk` (par-dessus l'ancienne, même clé).

## Fichiers

| Fichier | Changement |
|---|---|
| `js/app.js` | lecture découpée en phrases + surlignage (API CSS Custom Highlight, sinon le paragraphe entier) |
| `css/style.css` | couleur du surlignage (thèmes clair et sombre) |
| `sw.js` | cache hors ligne v5 |
| appli Android | nouveau pont `AndroidTTS.speakParts` : le téléphone signale le début de chaque phrase |

## v13.1 : écran allumé pendant la lecture

Tant qu'une lecture à voix haute est en cours, l'écran reste allumé et le téléphone ne se verrouille pas.
Dès que la lecture se termine ou que vous l'arrêtez, la mise en veille normale reprend.
Appli Android : `cissp-training-v3.8.apk`. Navigateur : API Screen Wake Lock (Chrome, Edge, Safari récents).
