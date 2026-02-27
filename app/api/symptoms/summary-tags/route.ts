import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

function generateFallbackTags(combined: string): string[] {
  if (!combined || combined.trim().length < 10) {
    return [];
  }

  const medicalTerms = [
    'pain', 'headache', 'fatigue', 'cough', 'fever', 'nausea', 'dizziness',
    'chest-pain', 'shortness-of-breath', 'abdominal-pain', 'joint-pain',
    'allergy', 'infection', 'inflammation', 'anxiety', 'depression'
  ];

  const text = combined.toLowerCase();
  const tags = medicalTerms.filter((term) => text.includes(term.replace(/-/g, ' '))).slice(0, 5);
  return tags;
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const combined = String(body?.combined || '').trim();
    if (!combined) {
      return NextResponse.json({ error: 'combined is required' }, { status: 400 });
    }

    const moderation = await moderateInput(combined);
    if (moderation.blocked) {
      return NextResponse.json({ tags: [] });
    }

    try {
      const parsed = await structuredCompletion<{ tags: string[] }>({
        schemaName: 'summary_tags',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            tags: {
              type: 'array',
              minItems: 0,
              maxItems: 5,
              items: { type: 'string' }
            }
          },
          required: ['tags']
        },
        system: 'You are a UK NHS GP assistant. Extract 3-5 concise, medically relevant tags from symptom text.',
        user: [
          'Return lowercase tags only, no punctuation.',
          'Tags must be health-related and useful for categorisation.',
          `Input: ${combined}`
        ].join('\n'),
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 120,
      });

      const tags = Array.isArray(parsed?.tags)
        ? parsed.tags.map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean).slice(0, 5)
        : [];

      return NextResponse.json({ tags: tags.length ? tags : generateFallbackTags(combined) });
    } catch {
      return NextResponse.json({ tags: generateFallbackTags(combined) });
    }
  } catch (error) {
    console.error('Error in summary tags API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

