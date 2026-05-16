# 🚀 Déploiement sur Netlify

## ✅ Prérequis

1. **Compte Netlify** - [netlify.com](https://netlify.com)
2. **Repository Git** (GitHub/GitLab)
3. **Clés Firebase** - Obtenues de la console Firebase

---

## 📝 Étapes de Configuration

### 1. Obtenir les Clés Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Projet `sabibeaute-db` → **Settings** (⚙️) → **Service Accounts**
3. **Generate New Private Key**
4. Téléchargez le JSON
5. Ouvrez le fichier et copiez :
   - `project_id`
   - `client_email`
   - `private_key` (attention aux `\n`)

### 2. Configurer les Variables d'Environnement sur Netlify

1. Allez sur [Netlify Dashboard](https://app.netlify.com)
2. Sélectionnez votre site
3. **Settings** → **Build & deploy** → **Environment**
4. **Add environment variables** et remplissez :

```
FIREBASE_PROJECT_ID = sabibeaute-db
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@sabibeaute-db.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ADMIN_USERNAME = admin
ADMIN_PASSWORD = votre_mot_de_passe_securise
```

**⚠️ IMPORTANT:** Pour `FIREBASE_PRIVATE_KEY`, remplacez les vraies `\n` par `\\n` (double backslash)

Exemple correct :
```
-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0...\\n-----END PRIVATE KEY-----
```

### 3. Push votre Code

```bash
git add .
git commit -m "Mise à jour pour Netlify Functions"
git push
```

Netlify déploiera automatiquement !

---

## 🔐 Sécurité Firestore

Appliquez ces règles dans Firebase Console :

**Firestore Database** → **Rules** :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny everything by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Public: lire les réservations
    match /bookings/{bookingId} {
      allow read: if true;
      allow create: if request.resource.data.name != null;
      allow update, delete: if request.auth != null;
    }
    
    // Public: lire les paramètres
    match /settings/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 📞 Test en Local

```bash
# Installer les dépendances
npm install

# Démarrer localement
netlify dev
```

Accédez à `http://localhost:8888`

---

## 🐛 Dépannage

### "Clé Firebase invalide"
→ Vérifiez que `FIREBASE_PRIVATE_KEY` a `\\n` (double backslash)

### "Fonction non trouvée"
→ Vérifiez que le dossier `netlify/functions/` existe

### "CORS error"
→ Les en-têtes CORS sont inclus, ça devrait fonctionner

---

## 📊 URLs de l'API

Une fois déployé :

- **API Bookings** : `https://votre-site.netlify.app/api/bookings`
- **API Admin** : `https://votre-site.netlify.app/api/admin`
- **API Settings** : `https://votre-site.netlify.app/api/settings`

---

## ✨ C'est prêt !

Votre système de réservation sécurisé est maintenant hébergé sur Netlify ! 🎉
