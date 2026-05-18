const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin (utilise variables d'environnement)
let serviceAccount;

// Essayer de décoder depuis FIREBASE_CREDENTIALS_BASE64
if (process.env.FIREBASE_CREDENTIALS_BASE64) {
  try {
    const decoded = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    console.error('Erreur décodage Base64:', error);
    process.exit(1);
  }
} else {
  // Fallback: construire le serviceAccount depuis les variables individuelles
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'unknown',
    private_key: process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      .replace(/\n/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL
  };
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// ============ AUTHENTIFICATION ADMIN ============
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  
  // Générer un JWT signé
  const token = jwt.sign(
    {
      username,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  res.json({ token, expiresIn: 3600 });
});

// Middleware pour vérifier le JWT admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé: pas admin' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
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
