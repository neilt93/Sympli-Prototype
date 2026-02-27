import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/api-auth';
import { moderateInput, structuredCompletion } from '../../../lib/openai';

function generateFallbackQuestions(symptomData: any): string[] {
  const symptom = String(symptomData?.symptom || '').toLowerCase();
  const base = [
    'Where exactly are you feeling this symptom?',
    'When did it start, and has it changed since then?',
    'On a scale of 0-10, how severe is it at its worst?',
    'How is this affecting your daily activities or sleep?'
  ];
  if (symptom.includes('headache')) {
    return [base[1], 'Is it one-sided or all over your head?', base[2], base[3]];
  }
  if (symptom.includes('fatigue')) {
    return ['How long have you felt this fatigue?', 'Is it constant or worse at certain times?', base[2], base[3]];
  }
  return base;
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const symptomData = body?.symptomData || {};
    const conversationHistory = Array.isArray(body?.conversationHistory) ? body.conversationHistory : [];
    const symptomText = String(symptomData?.symptom || '').trim();

    const moderation = await moderateInput(`${symptomText}\n${conversationHistory.map((x: any) => String(x?.content || '')).join('\n')}`);
    if (moderation.blocked) {
      return NextResponse.json({ questions: [] });
    }

    try {
      const parsed = await structuredCompletion<{ questions: string[] }>({
        schemaName: 'socrates_questions',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            questions: {
              type: 'array',
              minItems: 3,
              maxItems: 6,
              items: { type: 'string' }
            }
          },
          required: ['questions']
        },
        system: 'You are an empathetic UK health assistant. Ask 3-6 natural follow-up questions based on SOCRATES and functional impact, avoiding duplicates.',
        user: [
          `Symptom: ${symptomText || 'unspecified'}`,
          `Type: ${String(symptomData?.type || 'unknown')}`,
          'Conversation history:',
          ...conversationHistory.map((entry: any) => `${entry?.role === 'user' ? 'Patient' : 'Assistant'}: ${String(entry?.content || '')}`)
        ].join('\n'),
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 280,
      });

      const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
        .map((question) => String(question || '').trim())
        .filter(Boolean)
        .slice(0, 6);

      return NextResponse.json({
        questions: questions.length ? questions : generateFallbackQuestions(symptomData)
      });
    } catch {
      return NextResponse.json({ questions: generateFallbackQuestions(symptomData) });
    }
  } catch (error) {
    console.error('Error in conversational questions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

