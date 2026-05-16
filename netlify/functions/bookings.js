const admin = require('firebase-admin');

// Initialiser Firebase (utilise les variables d'environnement Netlify)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  });
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
