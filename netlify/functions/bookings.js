const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Initialiser Firebase (utilise les variables d'environnement Netlify)
if (!admin.apps.length) {
  let serviceAccount;
  
  console.log('🔍 VARIABLES DISPONIBLES:');
  console.log('- FIREBASE_CREDENTIALS_BASE64:', process.env.FIREBASE_CREDENTIALS_BASE64 ? 'OUI (length: ' + process.env.FIREBASE_CREDENTIALS_BASE64.length + ')' : 'NON');
  console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'OUI' : 'NON');
  console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'OUI' : 'NON');
  console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'OUI' : 'NON');
  
  // Essayer de décoder depuis FIREBASE_CREDENTIALS_BASE64
  if (process.env.FIREBASE_CREDENTIALS_BASE64) {
    try {
      console.log('📝 Décodage Base64...');
      const decoded = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
      console.log('✅ Base64 décodé avec succès');
    } catch (error) {
      console.error('❌ Erreur décodage Base64:', error.message);
      throw new Error('Impossible de décoder FIREBASE_CREDENTIALS_BASE64: ' + error.message);
    }
  } else {
    console.log('⚠️ FIREBASE_CREDENTIALS_BASE64 non trouvée, utilisation des variables individuelles');
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
  
  console.log('🚀 Initialisation Firebase avec projectId:', serviceAccount.project_id);
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error.message);
    throw error;
  }
}

const db = admin.firestore();

// Fonction pour vérifier le JWT
function verifyAdminToken(token) {
  if (!token) {
    return { valid: false, error: 'Token manquant' };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET non configurée');
    return { valid: false, error: 'Erreur serveur: JWT_SECRET manquante' };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    if (decoded.role !== 'admin') {
      return { valid: false, error: 'Accès refusé: pas admin' };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expiré' };
    }
    return { valid: false, error: 'Token invalide' };
  }
}

// Fonction pour valider une réservation
function validateBooking(data) {
  const errors = [];
  
  // Nom
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Nom requis et doit être une chaîne');
  } else if (data.name.trim().length < 2) {
    errors.push('Nom trop court (min 2 caractères)');
  } else if (data.name.length > 100) {
    errors.push('Nom trop long (max 100 caractères)');
  }
  
  // Téléphone
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Téléphone requis et doit être une chaîne');
  } else if (!/^[0-9+\s\-()]{10,}$/.test(data.phone)) {
    errors.push('Téléphone invalide (format: +213 123 456 789)');
  }
  
  // Email
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email requis et doit être une chaîne');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email invalide');
  }
  
  // Service
  const validServices = ['visage', 'corporel', 'manucure', 'epilation', 'maquillage', 'antiage'];
  if (!data.service || !validServices.includes(data.service)) {
    errors.push(`Service invalide. Valides: ${validServices.join(', ')}`);
  }
  
  // Date (format YYYY-MM-DD)
  if (!data.date || typeof data.date !== 'string') {
    errors.push('Date requise et doit être une chaîne');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Date invalide (format: YYYY-MM-DD)');
  } else {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      errors.push('Date invalide');
    } else if (dateObj < new Date()) {
      errors.push('La date ne peut pas être dans le passé');
    }
  }
  
  // Heure (format HH:MM)
  if (!data.time || typeof data.time !== 'string') {
    errors.push('Heure requise et doit être une chaîne');
  } else if (!/^\d{2}:\d{2}$/.test(data.time)) {
    errors.push('Heure invalide (format: HH:MM)');
  }
  
  return errors;
}

// Helper pour CORS
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Handler pour les réservations
exports.handler = async (event, context) => {
  // Répondre aux requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true })
    };
  }

  try {
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // POST : Créer une réservation
    if (method === 'POST') {
      const { name, phone, email, service, date, time, duration, price, message, whatsapp } = body;

      // Validation complète
      const validationErrors = validateBooking({ name, phone, email, service, date, time });
      if (validationErrors.length > 0) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: 'Validation échouée', details: validationErrors })
        };
      }

      // Vérifier que le créneau n'est pas déjà pris
      const existing = await db.collection('bookings')
        .where('date', '==', date)
        .where('time', '==', time)
        .get();

      if (!existing.empty) {
        return {
          statusCode: 409,
          headers: cors,
          body: JSON.stringify({ error: 'Ce créneau est déjà réservé' })
        };
      }

      // Créer la réservation (avec sanitization basique)
      const bookingId = 'RDV' + Date.now().toString(36).toUpperCase();
      const booking = {
        id: bookingId,
        name: name.trim(),  // trim() enlève les espaces
        phone: phone.trim(),
        email: email?.trim() || '',
        service,
        date,
        time,
        duration: parseInt(duration),
        price: parseInt(price),
        message: (message?.trim() || '').substring(0, 500),  // Limiter à 500 chars
        whatsapp: !!whatsapp,
        createdAt: new Date().toISOString(),
        status: 'confirmed'
      };

      await db.collection('bookings').doc(bookingId).set(booking);

      console.log('✅ Réservation créée:', bookingId);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, id: bookingId, booking })
      };
    }

    // GET : Récupérer les réservations
    if (method === 'GET') {
      const snapshot = await db.collection('bookings')
        .orderBy('date')
        .orderBy('time')
        .get();

      const bookings = snapshot.docs.map(doc => doc.data());

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify(bookings)
      };
    }

    // DELETE : Supprimer une réservation (admin)
    if (method === 'DELETE') {
      // Vérifier le token JWT
      const token = event.headers.authorization?.split(' ')[1];
      const verifyResult = verifyAdminToken(token);
      
      if (!verifyResult.valid) {
        return {
          statusCode: 401,
          headers: cors,
          body: JSON.stringify({ error: verifyResult.error })
        };
      }

      const bookingId = event.path.split('/').pop();
      await db.collection('bookings').doc(bookingId).delete();

      console.log('✅ Réservation supprimée:', bookingId);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  } catch (error) {
    console.error('❌ Erreur:', error);

    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Erreur serveur', details: error.message })
    };
  }
};
