import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

type ClinicalExtract = {
  summary: string;
  tags: string[];
  followup: {
    onsetTimeline: string;
    mainSymptoms: string;
    associatedSymptoms: string;
    triggers: string;
    recentChanges: string;
    familyHistory: string;
  };
};

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
        { error: 'Input blocked by safety checks. Please provide safe symptom text.' },
        { status: 400 }
      );
    }

    const fallback = `The ${user.id} has not provided enough information about this`;
    const parsed = await structuredCompletion<ClinicalExtract>({
      schemaName: 'clinical_extract',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          tags: {
            type: 'array',
            minItems: 0,
            maxItems: 5,
            items: { type: 'string' }
          },
          followup: {
            type: 'object',
            additionalProperties: false,
            properties: {
              onsetTimeline: { type: 'string' },
              mainSymptoms: { type: 'string' },
              associatedSymptoms: { type: 'string' },
              triggers: { type: 'string' },
              recentChanges: { type: 'string' },
              familyHistory: { type: 'string' }
            },
            required: [
              'onsetTimeline',
              'mainSymptoms',
              'associatedSymptoms',
              'triggers',
              'recentChanges',
              'familyHistory'
            ]
          }
        },
        required: ['summary', 'tags', 'followup']
      },
      system: 'You are a UK NHS GP assistant. Return a structured extract with summary, tags, and follow-up fields from patient symptom text.',
      user: [
        'Use concise clinical language and do not invent facts.',
        `If a follow-up field is unknown, use: "${fallback}".`,
        `Input: ${combined}`
      ].join('\n'),
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 700,
    });

    return NextResponse.json({ extract: parsed });
  } catch (error) {
    console.error('Error in clinical extract API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
