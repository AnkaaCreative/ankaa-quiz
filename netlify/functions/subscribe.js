exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { email, name } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
    }

    const apiKey = (process.env.FLODESK_API_KEY || '').trim();

    // Debug: return key info (temporary)
    if (email === 'debug@test.com') {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          keyLength: apiKey.length,
          keyStart: apiKey.substring(0, 10),
          keyEnd: apiKey.substring(apiKey.length - 6),
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('FLODESK'))
        })
      };
    }

    const auth = Buffer.from(apiKey + ':').toString('base64');

    const response = await fetch('https://api.flodesk.com/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        first_name: name || ''
      })
    });

    const data = await response.json();

    return {
      statusCode: response.ok ? 200 : 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ success: response.ok })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Subscription failed' })
    };
  }
};
