# Mise à jour : lecture audio plus naturelle (APK 11.1)

## Ce qui change
- La voix ne prononce plus la ponctuation ni les symboles : « TCP/IP » se dit « T C P I P », « lecture/écriture » se dit
  « lecture ou écriture », « → » devient une pause, « ≠ » « différent de », « ~ » « environ », « × » « fois »,
  « i.e. » « c'est-à-dire », « utilisateur(s) » « utilisateurs »… Le texte affiché ne change pas.
- Sigles épelés avec des espaces (« C I A ») au lieu de points (« C.I.A ») : certaines voix disaient « point ».
- Fiches : plus de libellés d'interface lus. L'en-tête est seulement « Chapitre 13. Gestion de l'identité… » ;
  les parties sont annoncées par une phrase simple : « Pour préparer l'examen », « À retenir », « Le résumé du livre »,
  « L'essentiel du livre pour l'examen » (plus de « Tout le chapitre », « Livre : Summary », émojis).
- Même nettoyage pour Android Auto. CCSP 3.22 : mêmes changements.

## Détails techniques
- `js/app.js` : `audioText(x, lang)` (appelé par `spellAcr`), `PANE_SAY` / `paneSay()`, morceaux `{ el, say }` dans `speechUnits`
  (élément surligné, formule dite à la place), `h3.rev-part[data-say]`. `APP_VERSION` 11.1. `sw.js` : cache v81.

## 11.2 / CCSP 3.23
- CCSP : les sigles sont maintenant épelés lettre par lettre comme dans le CISSP (« T C P », pas « tsep »), avec la même
  liste de sigles dits comme des mots (NIST, OWASP, SAML, CASB, SIEM, RAID…), plus STAR, ENISA, FIPS, SAN, NAS, GAAP, CAIQ, STIG.
- CISSP : STAR, FIPS, SAN, NAS, STIG ajoutés à cette liste. Caches sw v82 (CISSP) / v45 (CCSP).
