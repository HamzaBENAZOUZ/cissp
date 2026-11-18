# Mise à jour : Révision CISSP par domaine (APK 11.4)

## Site et appli
- Les onglets « Résumé Last Mile » et « Révision + Livre CISSP » sont réunis dans un seul onglet **Révision CISSP**, rangé par les 8 domaines.
- Dans chaque domaine : d'abord la fiche **Last Mile** du domaine, puis ses chapitres à la file, nommés **CH1, CH2…**
  (chaque chapitre : fiche de révision + texte du livre, comme en 10.8).
- **🔊 Lire tout le domaine** (à côté du nom du domaine) ouvre chaque fiche sur « Tout » et lit tout le domaine d'un coup, avec surlignage.
- Chaque fiche s'ouvre et se lit toujours seule. Aucun contenu supprimé. L'appli restée sur un ancien onglet s'ouvre sur le nouveau.

## Android Auto
- Une seule liste **Révision CISSP** (29 éléments) dans l'ordre des domaines : « D1 · nom du domaine » (Last Mile), puis CH1, CH2…
- La voiture enchaîne les éléments : lancer « D1 » lit tout le domaine 1, puis continue sur le domaine 2.
  Les sections de chaque élément restent accessibles une par une.

## Technique
- `renderRevision()` réécrit (cartes `data-rev="L<d>"` pour Last Mile, `data-rev="<chapitre>"` pour les chapitres, `data-domspeak`).
- Sections `lmsum` et `book` masquées et redirigées vers `revision`. `autoGroups()` : clés `lms-*` et `revbook-*` gardées (écoutes conservées).
- i18n : `rev.tabAll`, `rev.subDomains`, `rev.lmsCard`, `rev.readDomain`, `rev.pane.allLms`. Cache sw v84.
