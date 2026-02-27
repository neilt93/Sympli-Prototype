import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

export const dynamic = 'force-dynamic';

function fallbackCanonical(input: string): string {
  let t = input
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\b(hurts|sore|tender|aching|ache)\b/gi, 'pain')
    .replace(/\b(pain\s+in|pain\s+at|pain\s+on|pain\s+of)\b/gi, 'pain')
    .replace(/^\s*(my|the|a|an)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
  return t || input.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;

    const { text } = await request.json();
    const input = String(text || '').trim();
    if (!input) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const moderation = await moderateInput(input);
    if (moderation.blocked) {
      return NextResponse.json(
        { error: 'Please provide a safe health-related symptom description.' },
        { status: 400 }
      );
    }

    try {
      const parsed = await structuredCompletion<{ term: string }>({
        schemaName: 'canonical_symptom_term',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            term: { type: 'string' }
          },
          required: ['term']
        },
        system: 'Convert free-text symptoms into a concise UK-English clinical noun phrase suitable for a log title.',
        user: `Input symptom: ${input}\nReturn a short phrase only.`,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 40,
      });

      const term = String(parsed?.term || '').trim();
      return NextResponse.json({ term: term || fallbackCanonical(input) });
    } catch {
      return NextResponse.json({ term: fallbackCanonical(input) });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

