const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialiser Firebase
if (!admin.apps.length) {
  let serviceAccount;
  
  if (process.env.FIREBASE_CREDENTIALS_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (error) {
      console.error('Erreur décodage Base64:', error);
      throw error;
    }
  } else {
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

// Générer un token CSRF
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    // Générer un nouveau token CSRF
    const token = generateCSRFToken();
    const expiresAt = Date.now() + (15 * 60 * 1000); // Expire après 15 minutes

    // Stocker le token dans Firestore
    await db.collection('csrf_tokens').doc(token).set(
      {
        createdAt: new Date(),
        expiresAt: new Date(expiresAt),
        used: false
      },
      { merge: true }
    );

    console.log('✅ Token CSRF généré');

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        token,
        expiresIn: 900 // 15 minutes
      })
    };
  } catch (error) {
    console.error('❌ Erreur génération CSRF:', error);

    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
};
