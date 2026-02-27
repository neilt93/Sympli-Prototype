import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

function generateFallbackSummary(combined: string, userId: string): string {
  if (!combined || combined.trim().length < 10) {
    return `The ${userId} has not mentioned any appropriate health-related concerns`;
  }
  return combined
    .replace(/\b(um|ah|uh|er|hmm)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse || !user) return errorResponse!;

    const body = await request.json();
    const combined = String(body?.combined || '').trim();
    if (!combined) {
      return NextResponse.json({ error: 'combined is required' }, { status: 400 });
    }

    const moderation = await moderateInput(combined);
    if (moderation.blocked) {
      return NextResponse.json(
        { summary: `The ${user.id} has not mentioned any appropriate health-related concerns` },
        { status: 200 }
      );
    }

    try {
      const parsed = await structuredCompletion<{ summary: string; medicallyValid: boolean }>({
        schemaName: 'clinical_summary',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            medicallyValid: { type: 'boolean' }
          },
          required: ['summary', 'medicallyValid']
        },
        system: 'You are a UK NHS GP assistant. Generate concise, clinically useful summaries from patient symptom text without adding facts.',
        user: [
          'Create a cleaned-up, near-verbatim summary with correct grammar.',
          'Remove filler words but retain all clinically relevant meaning.',
          'If not medically valid, set medicallyValid to false and set summary to the required fallback phrase.',
          `Input: ${combined}`,
          `Fallback phrase: "The ${user.id} has not mentioned any appropriate health-related concerns"`
        ].join('\n'),
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 350,
      });

      const summary = String(parsed?.summary || '').trim();
      if (!summary) {
        return NextResponse.json({ summary: generateFallbackSummary(combined, user.id) });
      }
      return NextResponse.json({ summary });
    } catch {
      return NextResponse.json({ summary: generateFallbackSummary(combined, user.id) });
    }
  } catch (error) {
    console.error('Error in summary generation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

