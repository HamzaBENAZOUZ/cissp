# Mise à jour v11 : onglet « CISSP Last Mile »

## Nouveautés

- Un nouvel onglet **CISSP Last Mile**, placé entre CISSP Practice et CCSP.
- Il contient **400 questions originales** (environ 50 par domaine, chapitres LM_D1 à LM_D8), en anglais et en français, avec leurs explications.
- Ces questions ont été rédigées à partir des points clés et des conseils d'examen du livre *CISSP: The Last Mile* (Pete Zerger). Le livre lui-même ne contient pas de QCM.
- Toutes les fonctions habituelles marchent sur cet onglet : quiz par domaine, examen blanc, erreurs à revoir, questions marquées, lecture vocale, sauvegarde et mode hors ligne.

## Étape 1 : importer les questions dans Supabase

1. Ouvrez Supabase, puis **SQL Editor** et **New query**.
2. Collez le contenu de `private/seed_lastmile.sql` et cliquez sur **Run**.
3. La dernière ligne affichée doit être `questions_lastmile_importees = 400`.

Vous pouvez relancer le fichier sans risque : il ne crée pas de doublons.

## Étape 2 : le site

Rien à faire de votre côté : le code est déjà poussé sur GitHub. Il s'agit du commit « Onglet CISSP Last Mile ».

Rechargez le site avec `Ctrl+F5`. Si vous utilisez le mode hors ligne, touchez **Mettre à jour** dans le bloc Hors ligne pour récupérer les nouvelles questions.

## Étape 3 : l'application

Installez `cissp-training-v3.2.apk` par-dessus l'ancienne version. Vos données sont conservées.

## Bon à savoir

Comme les autres banques de questions, le fichier `seed_lastmile.sql` reste dans `private/`. Il ne doit pas être publié sur GitHub.
