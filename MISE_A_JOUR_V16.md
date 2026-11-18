# Mise à jour : Révision et Livre CISSP fusionnés (APK 10.8)

## Ce qui change
- Les onglets **Révision CISSP** et **Livre CISSP** ne font plus qu'un : **Révision + Livre CISSP**.
- Pour chaque chapitre (CH_01 à CH_21, rangés par domaine), la même carte regroupe :
  - la fiche de révision : Résumé, Préparer l'examen, À mémoriser, Version audio ;
  - le texte du livre : **📘 Livre : Summary** et **📘 Livre : Study Essentials** (en français si la traduction existe) ;
  - **📚 Tout le chapitre** : tout s'affiche à la suite, et « Lire » / « Listen » lit tout le chapitre d'un coup
    (la Version audio n'y est pas reprise, car elle redit le résumé autrement).
- Aucun contenu supprimé. Si l'appli était restée sur l'ancien onglet Livre, elle s'ouvre sur l'onglet fusionné.
- Android Auto et la télé : inchangés (Livre et Révision restent deux listes en voiture).

## Détails techniques
- `js/app.js` : `renderRevision("revision")` ajoute les volets `bsum`, `bess` (table `cissp_book_notes`) et `all` ;
  section `book` masquée et redirigée vers `revision`. `APP_VERSION` 10.8.
- `js/i18n.js` : `rev.tabMerged`, `rev.subMerged`, `rev.pane.all`, `rev.pane.book.*`. `css/style.css` : titres `.rev-part`.
- `sw.js` : cache v76.
