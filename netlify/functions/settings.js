const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Initialiser Firebase
if (!admin.apps.length) {
  let serviceAccount;
  
  // Essayer de décoder depuis FIREBASE_CREDENTIALS_BASE64
  if (process.env.FIREBASE_CREDENTIALS_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (error) {
      console.error('Erreur décodage Base64:', error);
      throw error;
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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

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
      const verifyResult = verifyAdminToken(token);

      if (!verifyResult.valid) {
        return {
          statusCode: 401,
          headers: cors,
          body: JSON.stringify({ error: verifyResult.error })
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
