// Authentification Admin
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

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

// Fonction de rate limiting
async function checkRateLimit(identifier, maxRequests = 3, windowMinutes = 15) {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const cutoffTime = now - windowMs;
  
  const rateLimitRef = db.collection('ratelimit').doc(identifier);
  const doc = await rateLimitRef.get();
  
  let timestamps = doc.exists ? doc.data().timestamps || [] : [];
  
  // Nettoyer les anciens timestamps
  timestamps = timestamps.filter(ts => ts > cutoffTime);
  
  // Vérifier la limite
  if (timestamps.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(Math.max(...timestamps) + windowMs)
    };
  }
  
  // Enregistrer la nouvelle tentative
  timestamps.push(now);
  await rateLimitRef.set({ timestamps }, { merge: true });
  
  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetTime: new Date(now + windowMs)
  };
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'saby2024';
    const jwtSecret = process.env.JWT_SECRET;

    // Vérifier que JWT_SECRET existe
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET non configurée');
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ error: 'Erreur serveur: JWT_SECRET manquante' })
      };
    }

    // Rate limiting sur le login (3 tentatives par 15 minutes)
    const rateLimitResult = await checkRateLimit(`admin:${username}`, 3, 15);
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: cors,
        body: JSON.stringify({ 
          error: 'Trop de tentatives de connexion. Réessayez plus tard.',
          resetTime: rateLimitResult.resetTime
        })
      };
    }

    // Vérifier les identifiants
    if (username !== adminUsername || password !== adminPassword) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Identifiants incorrects' })
      };
    }

    // Générer un JWT signé (au lieu d'un simple Base64)
    const token = jwt.sign(
      {
        username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000)  // Heure de création
      },
      jwtSecret,
      { expiresIn: '1h' }  // Expire après 1 heure
    );

    console.log('✅ Admin connecté:', username);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        token,
        expiresIn: 3600
      })
    };
  } catch (error) {
    console.error('❌ Erreur authentification:', error);

    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
};
