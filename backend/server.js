const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin (utilise variables d'environnement)
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
});

const db = admin.firestore();

// ============ AUTHENTIFICATION ADMIN ============
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  
  // Générer un token simple (à remplacer par JWT en production)
  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
  res.json({ token, expiresIn: 3600 });
});

// Middleware pour vérifier le token admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !token.startsWith(ADMIN_USER)) {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  next();
};

// ============ RÉSERVATIONS ============

// Créer une réservation
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, phone, email, service, date, time, duration, price, message, whatsapp } = req.body;
    
    // Validation côté serveur
    if (!name || !phone || !service || !date || !time) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Vérifier que le créneau n'est pas déjà pris
    const existing = await db.collection('bookings')
      .where('date', '==', date)
      .where('time', '==', time)
      .get();
    
    if (!existing.empty) {
      return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
    }
    
    const bookingId = 'RDV' + Date.now().toString(36).toUpperCase();
    const booking = {
      id: bookingId,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      service,
      date,
      time,
      duration: parseInt(duration),
      price: parseInt(price),
      message: message?.trim() || '',
      whatsapp: !!whatsapp,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };
    
    await db.collection('bookings').doc(bookingId).set(booking);
    
    // TODO: Envoyer email/WhatsApp
    console.log('Réservation créée:', bookingId);
    
    res.json({ success: true, id: bookingId, booking });
  } catch (error) {
    console.error('Erreur création réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les réservations
app.get('/api/bookings', async (req, res) => {
  try {
    const snapshot = await db.collection('bookings')
      .orderBy('date')
      .orderBy('time')
      .get();
    
    const bookings = snapshot.docs.map(doc => doc.data());
    res.json(bookings);
  } catch (error) {
    console.error('Erreur lecture réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une réservation (admin)
app.delete('/api/bookings/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('bookings').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ PARAMÈTRES (Admin) ============

// Mettre à jour les horaires
app.put('/api/settings/hours', verifyAdmin, async (req, res) => {
  try {
    await db.collection('settings').doc('hours').set(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les horaires
app.get('/api/settings/hours', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('hours').get();
    res.json(doc.data() || {});
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ERREURS & DÉMARRAGE ============

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend démarré sur http://localhost:${PORT}`);
});
