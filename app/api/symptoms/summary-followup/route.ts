import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

type FollowupExtraction = {
  onsetTimeline: string;
  mainSymptoms: string;
  associatedSymptoms: string;
  triggers: string;
  recentChanges: string;
  familyHistory: string;
};

function fallback(userId: string): FollowupExtraction {
  const msg = `The ${userId} has not provided enough information about this`;
  return {
    onsetTimeline: msg,
    mainSymptoms: msg,
    associatedSymptoms: msg,
    triggers: msg,
    recentChanges: msg,
    familyHistory: msg,
  };
}

function formatLegacy(extractions: FollowupExtraction): string {
  return [
    `**Onset/timeline**: ${extractions.onsetTimeline}`,
    `**Main symptoms**: ${extractions.mainSymptoms}`,
    `**Associated symptoms**: ${extractions.associatedSymptoms}`,
    `**Triggers**: ${extractions.triggers}`,
    `**Recent changes**: ${extractions.recentChanges}`,
    `**Family history**: ${extractions.familyHistory}`,
  ].join('\n');
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
      const empty = fallback(user.id);
      return NextResponse.json({ extractions: formatLegacy(empty), extractionFields: empty });
    }

    try {
      const parsed = await structuredCompletion<FollowupExtraction>({
        schemaName: 'summary_followup',
        schema: {
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
        },
        system: 'You are a UK NHS GP assistant. Extract structured clinical follow-up fields from patient text.',
        user: [
          'Use concise clinical phrasing.',
          `If information is missing, use: "The ${user.id} has not provided enough information about this".`,
          `Input: ${combined}`
        ].join('\n'),
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 350,
      });

      const extractionFields: FollowupExtraction = {
        onsetTimeline: String(parsed?.onsetTimeline || '').trim() || `The ${user.id} has not provided enough information about this`,
        mainSymptoms: String(parsed?.mainSymptoms || '').trim() || `The ${user.id} has not provided enough information about this`,
        associatedSymptoms: String(parsed?.associatedSymptoms || '').trim() || `The ${user.id} has not provided enough information about this`,
        triggers: String(parsed?.triggers || '').trim() || `The ${user.id} has not provided enough information about this`,
        recentChanges: String(parsed?.recentChanges || '').trim() || `The ${user.id} has not provided enough information about this`,
        familyHistory: String(parsed?.familyHistory || '').trim() || `The ${user.id} has not provided enough information about this`,
      };

      return NextResponse.json({
        extractions: formatLegacy(extractionFields),
        extractionFields,
      });
    } catch {
      const empty = fallback(user.id);
      return NextResponse.json({ extractions: formatLegacy(empty), extractionFields: empty });
    }
  } catch (error) {
    console.error('Error in summary follow-up API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

