# CISSP Training Terminal

Site de QCM pour préparer le CISSP, avec un thème cybersécurité. Il contient les **420 questions de révision** du *CISSP Official Study Guide, 10e édition* (20 par chapitre, 21 chapitres), classées selon les 8 domaines du CBK, avec la correction et l'explication de chaque réponse.

- **Hébergement** : GitHub Pages (site statique, aucun build).
- **Base de données** : Supabase (questions, comptes, scores, historique).

## Fonctionnalités

| Mode | Description |
|---|---|
| Quiz par chapitre | 20 questions dans l'ordre du livre (ou mélangées), correction immédiate après chaque réponse |
| Quiz par domaine | 30 questions tirées au hasard dans les chapitres d'un domaine |
| Examen blanc | 25 à 150 questions de tous les chapitres, chronométré (72 s par question comme à l'examen), correction à la fin |
| Revoir mes erreurs | Toutes les questions dont votre dernière réponse était fausse, ou seulement celles d'un chapitre |
| Historique | Score par chapitre, meilleur résultat et liste de toutes les sessions |

Les questions à réponses multiples (*Choose all that apply*) passent en cases à cocher. Raccourcis clavier : `A` à `K` pour choisir, `Entrée` pour valider ou passer à la suivante, `←` et `→` pour naviguer.

## Structure

```
cissp-qcm/
├── index.html            page unique du site
├── css/style.css         thème
├── js/
│   ├── config.js         ← vos clés Supabase (à remplir)
│   ├── app.js            logique du quiz
│   ├── store.js          accès aux données (Supabase ou mode local)
│   └── matrix.js         fond animé
├── assets/favicon.svg
├── supabase/schema.sql   tables + sécurité (RLS), à exécuter dans Supabase
├── tools/json_to_sql.py  régénère le fichier d'import SQL
├── private/              ⚠ NON publié (ignoré par .gitignore)
│   ├── questions.json        les 420 questions
│   └── seed_questions.sql    import SQL des questions pour Supabase
├── .gitignore
└── .nojekyll
```

> **Droits d'auteur.** Les questions viennent d'un livre Wiley protégé par le droit d'auteur. C'est pour cela qu'elles se trouvent dans `private/` (exclu de Git) et dans Supabase, où seuls les utilisateurs connectés peuvent les lire. Le dépôt GitHub public ne contient que le code. Gardez cet usage personnel, et désactivez les inscriptions une fois votre compte créé (étape 2.5).

---

## 1. Tester en local (2 minutes)

Si `js/config.js` est vide, le site passe en **mode local** : il lit `private/questions.json` et enregistre la progression dans le navigateur.

```bash
cd cissp-qcm
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

(Ouvrir `index.html` en double-cliquant ne marche pas : le navigateur bloque la lecture du fichier JSON. Il faut passer par un petit serveur, comme ci-dessus.)

---

## 2. Créer la base Supabase

1. Créez un compte sur <https://supabase.com>, puis **New project**. Choisissez une région proche, par exemple *West EU (Paris)*, et notez le mot de passe de la base.
2. Ouvrez **SQL Editor → New query**, collez tout le contenu de `supabase/schema.sql`, puis cliquez sur **Run**.
3. Ouvrez une nouvelle requête, collez le contenu de `private/seed_questions.sql`, puis **Run**. Vérifiez ensuite le chargement :
   ```sql
   select count(*) from questions;   -- doit renvoyer 420
   ```
4. Dans **Authentication → URL Configuration** :
   - **Site URL** : `https://VOTRE-PSEUDO.github.io/NOM-DU-DEPOT/`
   - **Redirect URLs** : ajoutez la même URL, plus `http://localhost:8000/` pour les tests.
5. Créez votre compte, soit depuis le site (bouton « Créer un compte », puis cliquez le lien reçu par email), soit dans **Authentication → Users → Add user** en cochant *Auto Confirm User*.
   Ensuite, dans **Authentication → Sign In / Providers → Email**, **désactivez « Allow new users to sign up »**. Plus personne d'autre ne pourra créer de compte ni lire les questions.
6. Récupérez vos clés dans **Project Settings → API** (ou **Data API**) :
   - *Project URL*, de la forme `https://xxxx.supabase.co`
   - *anon public key* (ou *publishable key*)

   Mettez-les dans `js/config.js` :
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...",
   ```
   La clé *anon* est faite pour être publique : ce sont les règles RLS du schéma qui protègent les données. **Ne mettez jamais la clé `service_role`** dans le site.

---

## 3. Publier sur GitHub Pages

1. Sur GitHub : **New repository**, par exemple `cissp-qcm`, en *Public*. GitHub Pages gratuit demande un dépôt public, et le code ne contient aucune question.
2. Depuis le dossier `cissp-qcm` :
   ```bash
   git init
   git add .
   git status          # vérifiez que private/ n'apparaît PAS
   git commit -m "CISSP QCM"
   git branch -M main
   git remote add origin https://github.com/VOTRE-PSEUDO/cissp-qcm.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment**. Choisissez *Source : Deploy from a branch*, *Branch : `main`*, dossier `/ (root)`, puis **Save**.
4. Une à deux minutes plus tard, le site est en ligne sur `https://VOTRE-PSEUDO.github.io/cissp-qcm/`. Connectez-vous et commencez à vous entraîner.

---

## Sécurité (ce que fait `schema.sql`)

- **RLS activé** sur toutes les tables.
- `chapters` et `questions` : lecture seule, uniquement pour un utilisateur **connecté** (`authenticated`). Le rôle `anon` n'a aucun droit.
- `attempts` et `answers` : chaque utilisateur ne voit, ne crée et ne supprime que **ses propres** lignes (`user_id = auth.uid()`).
- Aucune écriture possible sur les questions depuis le site.

Ces règles ont été testées sur PostgreSQL 16 : un visiteur non connecté se voit refuser l'accès aux questions, un utilisateur ne voit pas les sessions d'un autre, et une insertion au nom d'un autre utilisateur est rejetée.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| « Aucune question trouvée » | `seed_questions.sql` n'a pas été exécuté, ou a été exécuté avant `schema.sql` |
| `permission denied for table questions` | Vous n'êtes pas connecté, ou `schema.sql` n'a pas été exécuté en entier |
| Le lien de confirmation renvoie vers localhost | *Site URL* mal réglée (étape 2.4) |
| « Impossible de lire private/questions.json » sur GitHub Pages | `config.js` est vide : le site reste en mode local. Renseignez vos clés Supabase |
| Le badge en haut affiche « MODE LOCAL » | Même cause : `config.js` n'est pas rempli |

## Modifier ou ajouter des questions

Éditez `private/questions.json`, puis lancez :

```bash
python3 tools/json_to_sql.py
```

Ré-exécutez ensuite `private/seed_questions.sql` dans Supabase. L'import est idempotent : il met à jour les questions existantes sans créer de doublons.
