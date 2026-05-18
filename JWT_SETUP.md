# 🔐 Configuration JWT - Guide Complet

JWT (JSON Web Token) remplace les simples tokens Base64 pour une sécurité 10x meilleure.

---

## **Étape 1 : Générer une clé secrète JWT**

Exécutez cette commande en terminal pour générer une clé sécurisée :

```bash
# Macbrew install openssl  # Si vous ne l'avez pas
openssl rand -base64 32
```

Ça vous donnera quelque chose comme :
```
a3F9kL2pQ8mW4nB1xCdE6rT7uV0yZ5sH8jM1nO3pQ6tU9vW2xY5zA
```

**Gardez cette valeur**, vous en aurez besoin.

---

## **Étape 2 : Configuration locale (.env)**

1. Ouvrez `/Users/yacinehoubi/Downloads/sabybeaute/.env`
2. Ajoutez cette ligne :

```env
JWT_SECRET=a3F9kL2pQ8mW4nB1xCdE6rT7uV0yZ5sH8jM1nO3pQ6tU9vW2xY5zA
```

(Remplacez par votre vraie valeur générée plus haut)

---

## **Étape 3 : Configuration sur Netlify**

1. Allez sur [app.netlify.com](https://app.netlify.com)
2. Sélectionnez votre site
3. **Settings** → **Build & deploy** → **Environment**
4. **Edit variables**
5. **Add variable** :
   - **Key** : `JWT_SECRET`
   - **Value** : Votre clé générée (la même que .env)
6. Cliquez **Deploy site**

---

## **Étape 4 : Installation des dépendances**

En local, installez jsonwebtoken :

```bash
cd /Users/yacinehoubi/Downloads/sabybeaute
npm install
# ou si vous avez aussi le backend:
cd backend && npm install
```

---

## **Étape 5 : Test local**

Testez le login JWT localement :

```bash
# Démarrer le dev server
netlify dev

# Dans un autre terminal, testez:
curl -X POST http://localhost:8888/.netlify/functions/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"saby2024"}'
```

**Réponse attendue** (avec le JWT dedans) :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzE1OTk0OTU0LCJleHAiOjE3MTU5OTg1NTR9.p8Xk...",
  "expiresIn": 3600
}
```

---

## **Étape 6 : Tester la suppression avec JWT**

Utilisez le token obtenu pour supprimer une réservation :

```bash
# Remplacez TOKEN par le token reçu plus haut
curl -X DELETE http://localhost:8888/.netlify/functions/bookings/RDV123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## **Avantages de JWT vs Token Simple**

| Aspect | Token Simple | JWT ✅ |
|--------|--------------|--------|
| Peut être forgé ? | **OUI** ❌ | **NON** ✅ Signé cryptographiquement |
| Expiration ? | **NON** ❌ | **OUI** ✅ Expire automatiquement |
| Information visible ? | **OUI** ❌ Facilement | **NON** ✅ Encoded + signé |
| Sécurité | Très faible | Très forte |

---

## **Checklist de déploiement**

- [ ] `JWT_SECRET` ajoutée à `.env` localement
- [ ] `JWT_SECRET` ajoutée sur Netlify
- [ ] `npm install` exécuté (installe jsonwebtoken)
- [ ] Git push des changements
- [ ] Netlify redéployé (attendre 1-2 min)
- [ ] Test login fonctionne
- [ ] Test suppression fonctionne

---

## **Troubleshooting**

### Erreur: "JWT_SECRET non configurée"
→ Ajoutez la variable sur Netlify et redéployez

### Erreur: "Token invalide"
→ Assurez-vous que la `JWT_SECRET` est identique partout

### Erreur: "Token expiré"
→ Normal après 1h, se reconnecter

### Module 'jsonwebtoken' not found
→ Exécutez `npm install`

---

## **Questions ?**

Vous avez besoin d'aide ? Les JWT sont maintenant actifs et **beaucoup plus sécurisés** ! 🔐
