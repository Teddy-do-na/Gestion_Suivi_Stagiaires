# Guide d'Utilisation - Plateforme StageENERCA

Bienvenue sur la plateforme de gestion des stages de l'**ENERCA**. Ce guide détaille les fonctionnalités pour chaque profil utilisateur.

---

## 1. Accès et Connexion
- **Lien** : Utilisez l'URL fournie par l'administrateur.
- **Identification** : Connectez-vous avec votre compte Google professionnel ou personnel autorisé.
- **Rôles** : Votre interface s'adaptera automatiquement selon que vous êtes **Administrateur**, **RH**, **Encadreur** ou **Stagiaire**.

---

## 2. Guide pour les Administrateurs et RH
L'Administrateur et le service RH pilotent la structure globale du système.

### Gestion des Utilisateurs
- Accédez à l'onglet **"Utilisateurs"** pour voir la liste des comptes connectés.
- Assignez les rôles (**RH**, **Encadreur**, **Administrateur**) aux nouveaux utilisateurs.
- Pour les Encadreurs et RH, vous pouvez spécifier leur **Direction** d'appartenance.

### Gestion des Directions
- Créez les différentes directions de l'entreprise (ex: Direction Technique, Finances, etc.) pour organiser les affectations.

### Suivi des Stagiaires
- Créez les fiches stagiaires dans l'onglet **"Stagiaires"**.
- Une fois le dossier créé, allez dans **"Stages"** pour effectuer une **Nouvelle Affectation**.
- **Important** : C'est ici que vous liez un stagiaire à un encadreur, une direction et une période précise.

---

## 3. Guide pour les Encadreurs (Tuteurs)
L'encadreur est responsable du suivi pédagogique et opérationnel.

### Tableau de Bord
- Consultez les statistiques en temps réel sur vos stagiaires actifs.
- **Derniers rapports** : Validez ou refusez les rapports d'activités soumis par vos stagiaires en un clic.

### Suivi des Activités
- Consultez l'historique complet des rapports soumis.
- Filtrez par stagiaire pour voir l'évolution de chacun.

### Assignation des Tâches
- Sous l'onglet **"Assigner des Tâches"**, créez des missions spécifiques pour vos stagiaires.
- Vous pouvez suivre l'état d'avancement (En cours / Terminé) de chaque mission.

### Évaluations & Notes
- À la fin ou durant le stage, remplissez la fiche d'évaluation.
- Attribuez une note sur 20 et rédigez une appréciation globale.

---

## 4. Guide pour les Stagiaires
Le stagiaire utilise la plateforme pour documenter son apprentissage.

### Tableau de Bord
- Visualisez votre progression globale et les messages de votre encadreur.
- Consultez vos **Tâches à accomplir** assignées par votre tuteur.

### Rapports d'Activités
- Soumettez quotidiennement ou hebdomadairement vos activités.
- Indiquez les difficultés rencontrées pour alerter votre tuteur si nécessaire.

### Documents
- Déposez vos fichiers importants (attestations, rapports de stage en PDF) pour archivage.

---

---

## 6. Déploiement et Hébergement

### Déploiement Rapide (AI Studio)
- Cliquez sur le bouton **"Share"** ou **"Deploy"** dans le coin supérieur droit de l'interface Google AI Studio pour obtenir un lien public instantané.

### Exportation vers GitHub
1. Allez dans **Settings** > **Export to GitHub**.
2. Autorisez l'accès à votre compte GitHub si nécessaire.
3. Le code sera automatiquement poussé vers un nouveau dépôt sur votre compte.

### Hébergement Personnel (Firebase Hosting)
Si vous souhaitez héberger l'application sur votre propre domaine Firebase :
1. Installez Firebase CLI : `npm install -g firebase-tools`
2. Connectez-vous : `firebase login`
3. Démarrez le déploiement : `firebase deploy` (votre configuration est déjà prête dans le fichier `firebase.json`).
