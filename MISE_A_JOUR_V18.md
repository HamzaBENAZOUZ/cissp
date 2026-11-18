# Mise à jour : date d'examen gardée dans le compte (APK 11.0)

## Ce qui change
- La date d'examen (bouton 📅 / J-x en haut) n'était gardée que dans le navigateur ou l'appli où elle avait été saisie :
  sur un autre appareil (PC, téléphone, tablette, autre navigateur), il fallait la ressaisir.
- Elle est maintenant enregistrée dans le compte Supabase (métadonnées de l'utilisateur, champ `cissp_exam_date`) :
  saisie une fois, elle apparaît partout où l'on est connecté. La copie locale reste, pour le hors ligne.
- Une date déjà saisie sur un appareil est envoyée au compte automatiquement au prochain démarrage.
- Modifiée hors ligne : elle est envoyée au retour de la connexion.

## Détails techniques
- `js/store.js` : `getExamDate(field)` / `setExamDate(field, v)` via `auth.getUser()` / `auth.updateUser({ data })`.
  Aucune table ni migration SQL.
- `js/app.js` : `syncExamDate()` au démarrage, au retour au premier plan (au plus une fois par minute) et au retour
  en ligne ; `pushExamDate()` à l'enregistrement (`cissp-exam-date-pending` tant que l'envoi n'a pas réussi).
  `APP_VERSION` 11.0.
- `sw.js` : cache v80.
