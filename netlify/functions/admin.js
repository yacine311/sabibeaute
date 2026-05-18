// Authentification Admin
const jwt = require('jsonwebtoken');

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
