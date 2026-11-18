# Mise à jour : Android Auto, Révision et Livre CISSP fusionnés (APK 11.3)

- En voiture, les deux listes « Révision CISSP » et « Livre CISSP » deviennent une seule liste **Révision + Livre CISSP** (21 chapitres).
- Chaque chapitre lit la fiche (version audio si elle existe, sinon Résumé, Préparer l'examen, À mémoriser), puis le texte du livre
  (« Livre : Summary » et « Livre : Study Essentials », en français s'il est traduit). Les sections restent accessibles une par une.
- Un chapitre dont le livre n'existe pas dans la langue choisie reste dans une liste « Livre CISSP » à part (aujourd'hui : aucun).
- Technique : `autoGroups()` dans `js/app.js`, clés `revbook-<chapitre>-<langue>`. Cache sw v83.
