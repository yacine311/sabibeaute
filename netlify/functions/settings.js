const admin = require('firebase-admin');

// Initialiser Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  });
}

const db = admin.firestore();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Vérifier si c'est un admin
function isAdmin(token) {
  return token && token.includes('admin');
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true })
    };
  }

  try {
    // GET : Récupérer les paramètres (public)
    if (event.httpMethod === 'GET') {
      const doc = await db.collection('settings').doc('hours').get();
      const settings = doc.data() || {};

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify(settings)
      };
    }

    // PUT : Mettre à jour les paramètres (admin seulement)
    if (event.httpMethod === 'PUT') {
      const token = event.headers.authorization?.split(' ')[1];

      if (!isAdmin(token)) {
        return {
          statusCode: 403,
          headers: cors,
          body: JSON.stringify({ error: 'Non autorisé' })
        };
      }

      const settings = JSON.parse(event.body);
      await db.collection('settings').doc('hours').set(settings);

      console.log('✅ Paramètres mis à jour');

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
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
};
