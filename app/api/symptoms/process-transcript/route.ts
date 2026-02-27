import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const rawTranscript = String(body?.rawTranscript || '').trim();

    if (!rawTranscript) {
      return NextResponse.json({ error: 'Raw transcript is required' }, { status: 400 });
    }

    const moderation = await moderateInput(rawTranscript);
    if (moderation.blocked) {
      return NextResponse.json(
        { error: 'Transcript contains unsafe content. Please rephrase and try again.' },
        { status: 400 }
      );
    }

    try {
      const parsed = await structuredCompletion<{ processedTranscript: string }>({
        schemaName: 'processed_transcript',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            processedTranscript: { type: 'string' }
          },
          required: ['processedTranscript']
        },
        system: [
          'You are a medical transcription assistant.',
          'Correct grammar and punctuation while preserving exact clinical meaning.',
          'Do not add interpretations, advice, or extra facts.'
        ].join(' '),
        user: rawTranscript,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 450,
      });

      const processedTranscript = String(parsed?.processedTranscript || rawTranscript).trim();
      return NextResponse.json({
        processedTranscript: processedTranscript || rawTranscript,
        originalLength: rawTranscript.length,
        processedLength: (processedTranscript || rawTranscript).length
      });
    } catch {
      return NextResponse.json({
        processedTranscript: rawTranscript,
        originalLength: rawTranscript.length,
        processedLength: rawTranscript.length
      });
    }
  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

