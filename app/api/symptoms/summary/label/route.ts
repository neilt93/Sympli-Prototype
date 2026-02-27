import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../../lib/openai';

type LabelSummary = {
  presentingComplaint: string;
  followups: Array<{ label: string; answer: string }>;
  tags: string[];
};

function fallbackSummary(input: any, nowText: string): string {
  const presentingComplaint = String(input?.presentingComplaint || '').trim() || 'Not provided';
  const followups = Array.isArray(input?.followups) ? input.followups : [];
  const lines = followups.map((item: any) => {
    const label = String(item?.question || 'Follow-up').trim();
    const answer = String(item?.answer || 'Not mentioned.').trim();
    return `- ${label}: ${answer}`;
  });

  return [
    'Final Log Format (Structured, Chat-Generated)',
    '',
    'Presenting Complaint:',
    `“${presentingComplaint}”`,
    '',
    '---',
    '',
    'Follow-Up Summary:',
    ...(lines.length ? lines : ['- Not mentioned.']),
    '',
    '---',
    'Tags:',
    '#symptom-log, #new-symptom',
    '',
    '---',
    'Confirmed by User: Yes',
    '✅ Consent Given: Yes',
    `🕒 Timestamp: ${nowText} BST`,
    '',
    '---'
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse || !user) return errorResponse!;

    const body = await request.json();
    const presentingComplaint = String(body?.presentingComplaint || '').trim();
    const followups = Array.isArray(body?.followups) ? body.followups : [];
    const joined = [presentingComplaint, ...followups.map((f: any) => `${f?.question}: ${f?.answer}`)].join('\n');

    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    if (!presentingComplaint) {
      return NextResponse.json({ error: 'presentingComplaint is required' }, { status: 400 });
    }

    const moderation = await moderateInput(joined);
    if (moderation.blocked) {
      return NextResponse.json({ summary: fallbackSummary(body, timestamp) });
    }

    try {
      const parsed = await structuredCompletion<LabelSummary>({
        schemaName: 'label_summary',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            presentingComplaint: { type: 'string' },
            followups: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  label: { type: 'string' },
                  answer: { type: 'string' }
                },
                required: ['label', 'answer']
              }
            },
            tags: {
              type: 'array',
              minItems: 2,
              maxItems: 6,
              items: { type: 'string' }
            }
          },
          required: ['presentingComplaint', 'followups', 'tags']
        },
        system: 'You are Sympli, a UK clinical documentation assistant. Build structured, concise GP-friendly symptom summaries.',
        user: [
          'Produce labels in 1-2 words (for example: Onset, Severity, Functional Impact).',
          'Use only details provided by the patient.',
          'Use lowercase, hyphenated tags.',
          `Presenting complaint: ${presentingComplaint}`,
          `Follow-ups: ${JSON.stringify(followups)}`
        ].join('\n'),
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 800,
      });

      const safeComplaint = String(parsed?.presentingComplaint || presentingComplaint).trim();
      const safeFollowups = Array.isArray(parsed?.followups) ? parsed.followups : [];
      const safeTags = Array.isArray(parsed?.tags)
        ? parsed.tags.map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean)
        : [];

      const summary = [
        'Final Log Format (Structured, Chat-Generated)',
        '',
        'Presenting Complaint:',
        `“${safeComplaint}”`,
        '',
        '---',
        '',
        'Follow-Up Summary:',
        ...(safeFollowups.length
          ? safeFollowups.map((item) => `- ${String(item.label || 'Follow-up').trim()}: ${String(item.answer || 'Not mentioned.').trim()}`)
          : ['- Not mentioned.']),
        '',
        '---',
        'Tags:',
        safeTags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(', '),
        '',
        '---',
        'Confirmed by User: Yes',
        '✅ Consent Given: Yes',
        `🕒 Timestamp: ${timestamp} BST`,
        '',
        '---'
      ].join('\n');

      return NextResponse.json({ summary });
    } catch {
      return NextResponse.json({ summary: fallbackSummary(body, timestamp) });
    }
  } catch (error) {
    console.error('Error in label summary API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

