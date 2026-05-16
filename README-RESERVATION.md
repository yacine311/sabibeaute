# Système de Réservation - Saby Beauté

Système de prise de rendez-vous professionnel pour le salon d'esthétique Saby Beauté à Alger.

## 📋 Table des matières

1. [Fonctionnalités](#fonctionnalités)
2. [Installation](#installation)
3. [Utilisation Client](#utilisation-client)
4. [Utilisation Admin](#utilisation-admin)
5. [Configuration](#configuration)
6. [Sécurité](#sécurité)
7. [Support](#support)

## ✨ Fonctionnalités

### Pour les Clientes

- **Réservation en ligne 24/7**
  - Sélection du service désiré
  - Calendrier interactif avec disponibilités en temps réel
  - Créneaux horaires de 30 minutes
  - Blocage automatique des créneaux réservés
  
- **Processus en 4 étapes simples**
  1. Choix du service
  2. Sélection de la date et l'heure
  3. Informations personnelles
  4. Confirmation du rendez-vous
  
- **Notifications automatiques**
  - Email de confirmation immédiat
  - Option WhatsApp disponible
  - Numéro de réservation unique
  - Possibilité d'ajouter au calendrier

- **Interface moderne**
  - Design élégant aux couleurs du salon
  - Responsive (mobile, tablette, desktop)
  - Navigation intuitive
  - Animations fluides

### Pour l'Administration

- **Tableau de bord complet**
  - Statistiques en temps réel
  - Vue d'ensemble des rendez-vous
  - Gestion des réservations

- **Gestion du calendrier**
  - Ajout/modification/suppression de rendez-vous
  - Blocage de jours (congés, maintenance)
  - Configuration des horaires d'ouverture

- **Export de données**
  - Export CSV des réservations
  - Filtres par date et service

## 🚀 Installation

### Structure des fichiers

```
saby-beaute-reservation/
├── saby-beaute-reservation.html    (Page principale)
├── booking-styles.css               (Styles)
├── booking-script.js                (Logique JavaScript)
└── README-RESERVATION.md            (Ce fichier)
```

### Installation locale

1. **Téléchargez les 3 fichiers** dans le même dossier
2. **Ouvrez** `saby-beaute-reservation.html` dans votre navigateur
3. C'est tout ! Le système fonctionne localement avec LocalStorage

### Installation sur serveur web

1. **Uploadez les 3 fichiers** via FTP sur votre hébergement
2. **Assurez-vous** que les fichiers sont dans le même répertoire
3. **Accédez** à la page via votre URL

## 👤 Utilisation Client

### Étape 1 : Sélection du service

- Cliquez sur le service désiré parmi les 6 options :
  - Soins du Visage (1h - 3 500 DA)
  - Soins Corporels (1h30 - 5 000 DA)
  - Manucure & Pédicure (45min - 2 000 DA)
  - Épilation (30min - 800 DA)
  - Maquillage Professionnel (1h - 4 000 DA)
  - Soins Anti-Âge (1h15 - 6 000 DA)

### Étape 2 : Date et heure

- **Calendrier** : Naviguez entre les mois avec les flèches
- **Sélection** : Cliquez sur une date disponible (non grisée)
- **Créneaux** : Choisissez parmi les heures disponibles
- Les créneaux déjà réservés sont automatiquement désactivés

### Étape 3 : Informations

- Remplissez le formulaire :
  - Nom complet (obligatoire)
  - Téléphone (obligatoire)
  - Email (optionnel mais recommandé)
  - Message (optionnel)
- Cochez les options :
  - Confirmation WhatsApp
  - Acceptation des conditions

### Étape 4 : Confirmation

- Vous recevez :
  - Numéro de réservation unique
  - Récapitulatif complet
  - Email de confirmation
- Vous pouvez :
  - Ajouter au calendrier Google
  - Faire une nouvelle réservation
  - Retourner à l'accueil

## 🔧 Utilisation Admin

### Connexion

1. Cliquez sur **"Admin"** dans le menu
2. Identifiants par défaut :
   - **Nom d'utilisateur** : `admin`
   - **Mot de passe** : `saby2024`

⚠️ **IMPORTANT** : Changez ces identifiants en production !

### Tableau de bord

#### Statistiques
- **Aujourd'hui** : Nombre de rendez-vous du jour
- **Cette semaine** : Rendez-vous de la semaine en cours
- **Ce mois** : Rendez-vous du mois en cours

#### Onglet Calendrier
- Vue mensuelle des rendez-vous
- Cliquez sur une date pour voir les détails
- Navigation entre les mois

#### Onglet Réservations
- Liste complète des réservations
- **Filtres** :
  - Par date
  - Par service
- **Actions** :
  - ✏️ Modifier une réservation
  - 🗑️ Supprimer une réservation
- **Export** : Télécharger les données en CSV

#### Onglet Paramètres

**Horaires d'ouverture** :
- Configurez les heures d'ouverture pour chaque jour
- Cochez "Fermé" pour les jours de fermeture
- Cliquez sur "Enregistrer les horaires"

**Jours de fermeture exceptionnels** :
- Ajoutez des dates de fermeture (vacances, jours fériés)
- Indiquez la raison (optionnel)
- Supprimez quand nécessaire

## ⚙️ Configuration

### Horaires par défaut

```javascript
Dimanche : 09h00 - 19h00
Lundi : 09h00 - 19h00
Mardi : 09h00 - 19h00
Mercredi : 09h00 - 19h00
Jeudi : 09h00 - 19h00
Vendredi : FERMÉ
Samedi : 09h00 - 18h00
```

### Personnalisation des services

Pour modifier les services, éditez le fichier `saby-beaute-reservation.html` :

```html
<div class="service-option" data-service="nom" data-duration="60" data-price="3500">
    <div class="service-icon">✨</div>
    <h3>Nom du Service</h3>
    <p class="duration">Durée : 1h</p>
    <p class="price">À partir de 3 500 DA</p>
</div>
```

- `data-service` : Identifiant unique
- `data-duration` : Durée en minutes
- `data-price` : Prix en DA

### Personnalisation des couleurs

Dans `booking-styles.css`, modifiez les variables CSS :

```css
:root {
    --beige: #F5EFE7;
    --white: #FFFFFF;
    --gold: #D4AF37;
    --rose: #F4E4E0;
    --dark-text: #2C2C2C;
    --light-gold: #E8D4A0;
}
```

## 🔒 Sécurité

### Authentification admin

**⚠️ IMPORTANT pour la production** :

1. **Changez les identifiants** dans `booking-script.js` :
```javascript
if (username === 'VOTRE_USERNAME' && password === 'VOTRE_PASSWORD_FORT') {
```

2. **Utilisez HTTPS** en production
3. **Implémentez une vraie authentification** côté serveur

### Protection des données

- Données stockées localement dans le navigateur (LocalStorage)
- Pas de serveur backend requis pour la version de base
- Pour une version professionnelle :
  - Utilisez une base de données sécurisée
  - Implémentez une API backend
  - Ajoutez un système d'authentification robuste
  - Conformez-vous au RGPD

### Validation des données

- Tous les champs obligatoires sont validés
- Format de téléphone vérifié
- Format d'email vérifié
- Protection contre les dates passées
- Validation des créneaux horaires

## 📊 Stockage des données

### LocalStorage

Les données sont stockées dans le navigateur :

- `bookings` : Liste des réservations
- `closedDays` : Jours de fermeture exceptionnels
- `businessHours` : Horaires d'ouverture

### Format des réservations

```javascript
{
    id: "RDV...",
    service: "visage",
    serviceName: "Soins du Visage",
    date: "2026-03-15",
    time: "14:00",
    duration: 60,
    price: 3500,
    name: "Nom Client",
    phone: "+213...",
    email: "client@email.com",
    message: "...",
    whatsapp: true,
    createdAt: "2026-03-03T10:00:00.000Z",
    status: "confirmed"
}
```

## 🌐 Intégration avec le site principal

Pour intégrer avec le site Saby Beauté existant :

1. **Ajoutez un lien** dans la navigation :
```html
<a href="saby-beaute-reservation.html">Réservation</a>
```

2. **Ou utilisez un bouton** :
```html
<a href="saby-beaute-reservation.html" class="btn-primary">
    Prendre rendez-vous
</a>
```

## 📱 Notifications

### Email (Simulé)

Actuellement, les emails sont simulés dans la console.

Pour l'implémentation réelle :
- Utilisez un service comme SendGrid, Mailgun ou Amazon SES
- Ajoutez un backend pour gérer l'envoi d'emails

### WhatsApp (Simulé)

Pour implémenter WhatsApp :
- Utilisez l'API WhatsApp Business
- Ou intégrez Twilio API

### SMS

Pour ajouter des notifications SMS :
- Intégrez Twilio, Nexmo ou un service local algérien

## 🔄 Améliorations futures

### Version 1.0 (actuelle)
- ✅ Calendrier interactif
- ✅ Gestion des réservations
- ✅ Interface admin
- ✅ Stockage local

### Version 2.0 (à venir)
- ⏳ Backend avec base de données
- ⏳ Vraies notifications email/SMS
- ⏳ Paiement en ligne
- ⏳ Rappels automatiques 24h avant
- ⏳ Historique client
- ⏳ Système de fidélité
- ⏳ Multi-utilisateurs admin

## 🐛 Dépannage

### Le calendrier ne s'affiche pas
- Vérifiez que JavaScript est activé
- Vérifiez la console pour les erreurs
- Assurez-vous que les 3 fichiers sont dans le même dossier

### Les réservations ne se sauvegardent pas
- Vérifiez que LocalStorage n'est pas désactivé
- Videz le cache et réessayez
- Vérifiez les paramètres de confidentialité du navigateur

### Problèmes d'affichage mobile
- Testez sur différents navigateurs
- Vérifiez la balise viewport dans le HTML
- Assurez-vous que le CSS est bien chargé

## 📞 Support

Pour toute question ou personnalisation :

- **Email** : contact@sabybeaute-alger.com
- **Téléphone** : +213 555 12 34 56
- **Adresse** : Centre-ville, Alger

## 📄 Licence

© 2026 Saby Beauté - Tous droits réservés

---

**Développé avec ❤️ pour Saby Beauté**
