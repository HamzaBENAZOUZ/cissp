# Mise à jour : « Lire tout le domaine » sur la télé (APK 11.8)

- Avec la télé connectée (📺), le bouton **« Lire tout le domaine »** de l’onglet Révision CISSP envoie maintenant tout le domaine à la télé, et **c’est la télé seule qui le lit**. Le téléphone reste muet.
- La télé affiche le domaine en entier : la fiche Résumé Last Mile du domaine, puis chaque chapitre (fiche + livre), avec un titre par partie. La phrase lue est surlignée et la barre de progression avance comme pour une fiche.
- Ouvrir ensuite une seule fiche sur le téléphone remet la télé sur cette fiche, comme avant.
- Sans télé connectée, rien ne change : la lecture se fait sur le téléphone.
- La télé doit aussi avoir l’APK 11.8 (le site est embarqué dans l’appli).
- Technique : js/app.js, tvDomain() + branche « domaine » de tvSync (message sheet avec des lignes « # titre\ttexte annoncé ») ; côté télé, tvRender affiche ces lignes en h3.tv-sheet-sec et tvRead les lit (data-say). css/style.css : style des titres. sw.js v88.
