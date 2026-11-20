# Mise à jour V25 : écran allumé pendant la lecture (APK 11.9)

Problème : pendant la lecture à voix haute dans l'appli Android, le téléphone se mettait en veille et se verrouillait.

Cause : l'écran n'était gardé allumé que pendant chaque phrase lue. À la moindre pause (fin d'une phrase, passage
à la question suivante, chrono du mode Speed), l'appli relâchait l'écran ; comme personne n'avait touché le
téléphone depuis longtemps, Android l'éteignait immédiatement.

Correctif (MainActivity.java, APK CISSP 11.9 et CCSP 3.26) :
- l'écran reste allumé tant que le lecteur est en lecture (état « play » envoyé par le site), pas seulement pendant une phrase ;
- après l'arrêt ou la pause, il reste allumé encore 60 s, puis la mise en veille normale reprend.

Rien à changer sur le site web (le navigateur garde déjà l'écran allumé avec l'API Screen Wake Lock).
