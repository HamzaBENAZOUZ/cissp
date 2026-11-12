# Mise à jour : identifiants des questions + onglet Rechercher (APK 10.6)

## Identifiant de chaque question
Chaque question affiche discrètement son identifiant (petite étiquette grise) : en haut du quiz,
dans la correction, dans « Axes d'amélioration » et dans les résultats de recherche. Dans Android Auto,
il apparaît dans le titre (« Question 3 · BK_0042 »).

- `BK_xxxx` : question issue d'un livre
  - 0001-0420 : CISSP Official Study Guide (CH_01 à CH_21, 20 questions chacun)
  - 1001-2560 : CISSP Official Practice Tests (PT_D1 à PT_D8 puis TEST_1 à TEST_4)
  - 3001-3200 / 4001-5040 : CCSP Study Guide / CCSP Practice Tests (application CCSP)
- `CL_xxxxx` : question rédigée par Claude
  - 10001-10752 : CISSP Last Mile (LM_D1 à LM_D8)
  - 20001-20750 : Examen blanc ISC2 (ISC2_D1 à ISC2_D8)

L'identifiant est calculé à partir du chapitre et du numéro de la question : il ne change jamais,
il est le même sur le site, dans l'APK et hors ligne, et aucune modification de la base n'est nécessaire.

## Onglet « 🔎 Rechercher »
- Recherche par identifiant (`BK_0042`, `bk42`, plusieurs séparés par des virgules),
  par mots (anglais et français : question, propositions, explication, mise en situation ;
  `"risque résiduel"` entre guillemets pour une expression) ou par chapitre (`CH_07`, `PT_D3`, `LM_D2`).
- Filtres : banque (livres BK_, Claude CL_, ou une banque précise), domaine, statut
  (jamais répondues, dernière réponse fausse ou juste, marquées 🔖).
- Cocher une ou plusieurs questions (ou « Tout cocher »), puis « Répondre à la sélection » ;
  le bouton « Répondre » d'une ligne lance cette seule question. Option « Mélanger ».
- Le quiz se fait avec correction immédiate, se sauvegarde et compte dans la progression comme les autres.
