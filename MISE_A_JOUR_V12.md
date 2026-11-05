# Mise à jour v12 : onglet « Révision CISSP »

## Nouveautés

- Un nouvel onglet **Révision CISSP** (*CISSP Review* en anglais), placé après CISSP Last Mile.
- Il contient **21 fiches**, une par chapitre du Study Guide, classées par domaine. Chaque fiche a trois volets :
  - **Résumé** : un résumé complet du chapitre ;
  - **Préparer l'examen** : les pièges et les réflexes à avoir le jour de l'examen ;
  - **À mémoriser** : les listes, formules et définitions à connaître par cœur.
- Le bouton **Listen** lit le volet affiché en anglais. Quand le site est en français, un bouton **Lire** le lit en français.
- Cliquer une seconde fois sur le bouton arrête la lecture. Les boutons **Tout déplier** et **Tout replier** ouvrent ou ferment toutes les fiches.
- Les fiches ont été rédigées pour ce site : ce ne sont pas des extraits du livre. Elles sont donc dans le code public (`js/revision.js`) et fonctionnent hors ligne.

## Mise à jour

- **Supabase** : rien à faire, pas de SQL.
- **Site** : le code est déjà poussé sur GitHub. Rechargez le site avec `Ctrl+F5`.
- **Application** : installez `cissp-training-v3.3.apk`.

## Fichiers

| Fichier | Changement |
|---|---|
| `js/revision.js` | **nouveau** : le contenu des 21 fiches, en anglais et en français |
| `js/app.js` | l'onglet Révision et les boutons de lecture |
| `js/i18n.js` | les nouveaux textes |
| `css/style.css` | la mise en forme des fiches |
| `sw.js` | ajoute `js/revision.js` au cache hors ligne |
