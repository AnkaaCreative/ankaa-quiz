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

    const apiKey = 'fd_key_92c226bc4b8e410d8564529c0e49f58c.XMUXG8tslnUHbC7Lwb5s5CFwbRb9kEUy5B1qQfV1tz8C3hw65cblFjMF0uRyMuCfNVVsFBsVQ2pWXcYKbDSbrzgC3LzgRWc7kQ4XHwpPU91YguKzCs4tPFJSbmc6Ou8jc30OizkfsbrFozSFkaup5gI7WnCpp6L6P3kyXOSMKI34j0qjG7agiyfHlmpfrAkO';
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
