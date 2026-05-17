const admin = require('firebase-admin');

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

      // Validation
      if (!name || !phone || !service || !date || !time) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: 'Données manquantes' })
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

      // Créer la réservation
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
      // Vérifier le token admin
      const token = event.headers.authorization?.split(' ')[1];
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!token || !token.includes('admin')) {
        return {
          statusCode: 403,
          headers: cors,
          body: JSON.stringify({ error: 'Non autorisé' })
        };
      }

      const bookingId = event.path.split('/').pop();
      await db.collection('bookings').doc(bookingId).delete();

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
