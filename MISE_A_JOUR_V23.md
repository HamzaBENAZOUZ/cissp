# Mise à jour : temps restant en voiture (APK 11.6)

- Android Auto : la barre de progression affichait 1 « seconde » par phrase (donc le nombre de phrases). Elle affiche maintenant un **temps estimé** : durée totale de la fiche et position, qui avancent en temps réel.
- Sous le titre : « ⏱ 12 min restantes · » (jusqu’à la fin de l’élément en cours).
- Estimation : nombre de caractères × vitesse de la voix (réglage de vitesse compris) + temps de réflexion des quiz. La vitesse réelle de ta voix est apprise pendant l’écoute, donc l’estimation devient plus juste au fil des phrases.
- Glisser la barre saute toujours à la phrase correspondante.
- Technique : AutoService.java (posOf, unitAt, learnUnit, left ; préférence « mpc »).
