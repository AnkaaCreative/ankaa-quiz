const RESULT_NAMES = { a: 'Fase Semilla', b: 'Fase Brote', c: 'Fase Flor' };

exports.handler = async (event) => {
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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const { email, name, quizResult, techSavvy, answers } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Email required' }) };
    }

    const resultLabel = RESULT_NAMES[quizResult] || quizResult || '';

    // 1. Send to Flodesk with quiz result as custom field
    const apiKey = (process.env.FLODESK_API_KEY || '').trim();
    const auth = Buffer.from(apiKey + ':').toString('base64');

    const flodeskBody = {
      email: email,
      first_name: name || '',
      custom_fields: {
        quiz_result: resultLabel,
        quiz_result_key: quizResult || '',
        tech_savvy: techSavvy || ''
      }
    };

    // Add to segment based on quiz result
    const segmentId = process.env['FLODESK_SEGMENT_' + (quizResult || '').toUpperCase()] || '';

    const flodeskResponse = await fetch('https://api.flodesk.com/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(flodeskBody)
    });

    const flodeskData = await flodeskResponse.json().catch(() => ({}));

    if (!flodeskResponse.ok) {
      console.error('Flodesk subscriber error', flodeskResponse.status, flodeskData);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, step: 'subscriber' })
      };
    }

    const subscriberId = flodeskData.id || (flodeskData.data && flodeskData.data.id);

    const debug = {
      subscriberKeys: Object.keys(flodeskData || {}),
      subscriberId: subscriberId || null,
      segmentIdPresent: !!segmentId,
      quizResultKey: quizResult || null,
      envVarName: 'FLODESK_SEGMENT_' + (quizResult || '').toUpperCase(),
      segmentStatus: null,
      segmentBody: null
    };

    if (segmentId && subscriberId) {
      const segmentResponse = await fetch(
        `https://api.flodesk.com/v1/subscribers/${subscriberId}/segments`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ segment_ids: [segmentId] })
        }
      );

      debug.segmentStatus = segmentResponse.status;
      debug.segmentBody = (await segmentResponse.text().catch(() => '')).slice(0, 500);

      if (!segmentResponse.ok) {
        console.error('Flodesk segment error', segmentResponse.status, debug.segmentBody);
      }
    } else if (!subscriberId) {
      console.error('Flodesk returned no subscriber id', flodeskData);
    } else if (!segmentId) {
      console.error('Missing FLODESK_SEGMENT_ env var for quizResult', quizResult);
    }

    // 2. Save to Supabase if configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/quiz_responses`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: name || '',
          email: email,
          quiz_result: resultLabel,
          quiz_result_key: quizResult || '',
          tech_savvy: techSavvy || '',
          answers: answers || [],
          created_at: new Date().toISOString()
        })
      }).catch(() => {});
    }

    return {
      statusCode: flodeskResponse.ok ? 200 : 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: flodeskResponse.ok, debug })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Subscription failed' })
    };
  }
};
