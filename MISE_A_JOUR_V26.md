# Mise à jour V26 : lecture en mode paysage (APK 12.0 / CCSP 3.27)

Problème : téléphone couché (mode paysage), le texte des chapitres et des fiches dépassait de l'écran.

Cause : l'en-tête (logo, Date d'examen, 🔊, ⚡, FR/EN, thème, adresse, Déconnexion) était plus large que l'écran
entre 561 et environ 850 px de large, c'est-à-dire un téléphone en paysage. La page entière devenait plus large
que l'écran, et le texte sortait sur le côté. En portrait, une fois connecté, le bouton Déconnexion dépassait aussi.

Correctif (css/style.css, js/app.js) :
- l'en-tête ne dépasse plus jamais : nom « CISSP Training » et adresse e-mail masqués sous 1000 px, les boutons
  passent à la ligne s'il le faut ;
- en paysage (écran de moins de 500 px de haut) : en-tête compact, Date d'examen réduit à 📅, plus de place pour le texte ;
- barre de lecture en paysage : une seule ligne, à la hauteur de l'en-tête, elle ne cache plus le haut du texte ;
- en portrait, la barre de lecture se place juste sous l'en-tête, même quand il tient sur deux lignes ;
- les mots très longs sont coupés au lieu de déborder.

Site : rien à faire, poussé sur GitHub Pages. Appli : mise à jour proposée dans l'appli (12.0 / 3.27).
