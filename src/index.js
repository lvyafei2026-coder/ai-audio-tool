export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.includes('/api/') && request.method === 'POST') {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/$/, '');

  if (path.endsWith('/api/transcribe')) {
    return handleTranscribe(request, env);
  }

  if (path.endsWith('/api/synthesize')) {
    return handleSynthesize(request, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleTranscribe(request, env) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return json({ error: 'No audio file provided.' }, 400);
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return json({ error: 'Audio file must be under 25MB.' }, 400);
    }

    const bytes = await audioFile.arrayBuffer();

    const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio: [...new Uint8Array(bytes)]
    });

    if (!response || !response.text) {
      return json({ error: 'Transcription failed.' }, 500);
    }

    return json({ text: response.text });
  } catch (err) {
    console.error('Transcribe error:', err);
    return json({ error: 'Processing failed. Please try again.' }, 500);
  }
}

async function handleSynthesize(request, env) {
  try {
    const body = await request.json();
    const text = (body.text || '').trim();
    const lang = body.lang || 'en';

    if (!text || text.length < 1) {
      return json({ error: 'Text is required.' }, 400);
    }

    if (text.length > 5000) {
      return json({ error: 'Text must be under 5000 characters.' }, 400);
    }

    const response = await env.AI.run('@cf/myshell-ai/melotts', {
      prompt: text,
      lang: lang
    });

    if (!response || !response.audio) {
      return json({ error: 'Speech synthesis failed.' }, 500);
    }

    return json({ audio: response.audio });
  } catch (err) {
    console.error('Synthesize error:', err);
    return json({ error: 'Processing failed. Please try again.' }, 500);
  }
}
