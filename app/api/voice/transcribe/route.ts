import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput } from '../../../lib/openai';

async function transcribeWithModel(audioFile: File, apiKey: string, model: string) {
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const fileName = audioFile.name || 'recording.webm';
  const mimeType = audioFile.type || 'audio/webm';

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), fileName);
  formData.append('model', model);
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Preferred newer transcription model; fallback for compatibility.
    const primaryModel = 'gpt-4o-mini-transcribe';
    let result = await transcribeWithModel(audioFile, openaiApiKey, primaryModel);
    if (!result.ok) {
      result = await transcribeWithModel(audioFile, openaiApiKey, 'whisper-1');
    }

    if (!result.ok) {
      const errorData = result.data || {};
      const message = String(errorData?.error?.message || 'Failed to transcribe audio');
      return NextResponse.json({ error: message }, { status: result.status || 500 });
    }

    const transcribedText = String(result.data?.text || '').trim();
    if (!transcribedText) {
      return NextResponse.json({ error: 'No text was transcribed from the audio' }, { status: 400 });
    }

    const moderation = await moderateInput(transcribedText);
    if (moderation.blocked) {
      return NextResponse.json({ error: 'Transcription blocked by safety checks. Please try again.' }, { status: 400 });
    }

    return NextResponse.json({
      text: transcribedText,
      success: true,
      confirmationRequired: true
    });
  } catch (error) {
    console.error('Error in voice transcription API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

